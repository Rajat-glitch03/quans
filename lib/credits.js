'use strict';

const { randomUUID, createHmac } = require('node:crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getAppCheck } = require('firebase-admin/app-check');
const {
  getFirestore,
  FieldValue,
  Timestamp
} = require('firebase-admin/firestore');

const FREE_STARTER_CREDITS = 50;
const RESERVATION_TTL_MS = 10 * 60 * 1000;
const MAX_GENERATION_BODY_BYTES = 200 * 1024;
const MAX_CACHED_RESPONSE_BYTES = 700 * 1024;
const IDEMPOTENCY_RESULT_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_GENERATIONS_PER_MINUTE = 10;
const MAX_GENERATIONS_PER_HOUR = 60;
const TOOL_COSTS = Object.freeze({
  resume: 8,
  proposal: 6,
  repurpose: 4,
  post: 2
});

function httpError(status, code, message, extra = {}) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  Object.assign(error, extra);
  return error;
}

function getFirebaseServices() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) {
    throw httpError(
      503,
      'CREDITS_SERVER_NOT_CONFIGURED',
      'The credit service is not configured yet. Please try again later.'
    );
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(rawServiceAccount);
  } catch (error) {
    console.error('[Credits] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
    throw httpError(
      503,
      'CREDITS_SERVER_NOT_CONFIGURED',
      'The credit service configuration is invalid.'
    );
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || serviceAccount.project_id;
  const clientEmail = serviceAccount.client_email;
  const privateKey = String(serviceAccount.private_key || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw httpError(
      503,
      'CREDITS_SERVER_NOT_CONFIGURED',
      'The Firebase Admin service account is missing required fields.'
    );
  }

  let app;
  if (getApps().length) {
    app = getApps()[0];
  } else {
    app = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId
    });
  }

  return {
    auth: getAuth(app),
    appCheck: getAppCheck(app),
    db: getFirestore(app)
  };
}

async function verifyRequestToken(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization).trim());
  if (!match) {
    throw httpError(401, 'AUTH_REQUIRED', 'Please sign in again to use QUANS.');
  }

  const { auth, appCheck } = getFirebaseServices();
  if (String(process.env.QUANS_REQUIRE_APPCHECK || '').toLowerCase() === 'true') {
    const appCheckToken = req.headers?.['x-firebase-appcheck'] || req.headers?.['X-Firebase-AppCheck'] || '';
    if (!appCheckToken) {
      throw httpError(401, 'APP_CHECK_REQUIRED', 'This request could not be verified. Refresh QUANS and try again.');
    }
    try {
      await appCheck.verifyToken(String(appCheckToken));
    } catch (error) {
      console.warn('[Credits] Firebase App Check verification failed:', error?.code || error?.message);
      throw httpError(401, 'APP_CHECK_INVALID', 'This request could not be verified. Refresh QUANS and try again.');
    }
  }
  try {
    const decoded = await auth.verifyIdToken(match[1], true);
    return { decoded, auth };
  } catch (error) {
    console.warn('[Credits] Firebase ID token verification failed:', error?.code || error?.message);
    throw httpError(401, 'INVALID_AUTH_TOKEN', 'Your session could not be verified. Please sign in again.');
  }
}

async function authenticateRequest(req) {
  const { decoded, auth } = await verifyRequestToken(req);
  const userRecord = await auth.getUser(decoded.uid);
  if (userRecord.emailVerified !== true) {
    throw httpError(
      403,
      'EMAIL_NOT_VERIFIED',
      'Please verify your email address before using QUANS. Check your inbox for the Firebase verification link, then sign in again.'
    );
  }
  return decoded.uid;
}

async function deleteUserAccountData(uid) {
  const { auth, db } = getFirebaseServices();
  const userRef = db.collection('users').doc(uid);
  const creditRef = db.collection('creditAccounts').doc(uid);

  // The permanent freeCreditClaims record is intentionally retained.
  // Mark deletion first so an interrupted cleanup can be identified and retried by an admin.
  const deletionJobRef = db.collection('accountDeletionJobs').doc(uid);
  const deletedAccountRef = db.collection('deletedAccounts').doc(uid);
  await deletionJobRef.set({
    uid,
    status: 'pending',
    authDeleted: false,
    requestedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  }, { merge: true });

  let authDeleted = false;
  try {
    // Permanent tombstone blocks stale Firebase ID tokens from recreating user
    // history documents after the Auth identity has been deleted.
    await deletedAccountRef.set({
      uid,
      deletedAt: FieldValue.serverTimestamp(),
      reason: 'user_requested_account_deletion'
    }, { merge: true });

    await auth.deleteUser(uid);
    authDeleted = true;
    await deletionJobRef.set({
      status: 'auth_deleted_cleanup_pending',
      authDeleted: true,
      authDeletedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    // Delete all history and wallet subcollections, but deliberately retain the
    // top-level freeCreditClaims/{emailHmac} record so the one-time grant cannot repeat.
    await Promise.all([
      db.recursiveDelete(userRef),
      db.recursiveDelete(creditRef)
    ]);
    await deletionJobRef.delete();
  } catch (error) {
    if (!authDeleted) {
      await deletedAccountRef.delete().catch(tombstoneError => {
        console.error('[Account Delete] Could not remove a tombstone after Auth deletion failed:', tombstoneError?.code || tombstoneError?.message);
      });
    }
    error.authDeleted = authDeleted;
    await deletionJobRef.set({
      status: authDeleted ? 'cleanup_pending' : 'auth_delete_failed',
      authDeleted,
      lastErrorCode: String(error?.code || 'unknown').slice(0, 120),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true }).catch(jobError => {
      console.error('[Account Delete] Could not update deletion recovery job:', jobError?.code || jobError?.message);
    });
    throw error;
  }
}

function getCreditLaunchTime() {
  const raw = process.env.QUANS_CREDITS_LAUNCH_AT;
  const timestamp = raw ? Date.parse(raw) : NaN;
  if (!Number.isFinite(timestamp)) {
    throw httpError(
      503,
      'CREDITS_LAUNCH_TIME_NOT_SET',
      'The credit launch time has not been configured on the server.'
    );
  }
  return timestamp;
}

function normalizeEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw httpError(
      403,
      'EMAIL_REQUIRED_FOR_FREE_CREDITS',
      'A valid email address is required to claim the one-time free-credit allowance.'
    );
  }
  return normalized;
}

function getEmailClaimId(email) {
  const secret = process.env.QUANS_CREDIT_EMAIL_HMAC_KEY;
  if (!secret || String(secret).length < 32) {
    throw httpError(
      503,
      'CREDIT_EMAIL_CLAIM_SECRET_NOT_CONFIGURED',
      'The one-time credit protection is not configured yet. Please try again later.'
    );
  }

  // Store a keyed digest rather than a plaintext email in the permanent claim registry.
  return createHmac('sha256', secret)
    .update(normalizeEmail(email), 'utf8')
    .digest('hex');
}

async function registerExistingGrantClaim(db, auth, uid, accountRef, accountData) {
  if (!accountData.freeGrantIssued) return;

  // Newer account records already retain the exact email digest used at grant time.
  // For accounts created by an earlier version, migrate using their current Auth email.
  let emailClaimId = accountData.freeGrantEmailHash;
  if (!emailClaimId) {
    const userRecord = await auth.getUser(uid);
    emailClaimId = getEmailClaimId(userRecord.email);
  }

  const claimRef = db.collection('freeCreditClaims').doc(emailClaimId);
  await db.runTransaction(async transaction => {
    const [currentAccount, existingClaim] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(claimRef)
    ]);
    if (!currentAccount.exists) return;

    const currentData = currentAccount.data() || {};
    if (!currentData.freeGrantIssued) return;

    if (!existingClaim.exists) {
      transaction.create(claimRef, {
        uid,
        grantType: 'new_account_free_allowance',
        claimedAt: currentData.freeGrantIssuedAt || FieldValue.serverTimestamp(),
        recordedAt: FieldValue.serverTimestamp(),
        migratedFromExistingGrant: true
      });
    }

    if (!currentData.freeGrantEmailHash) {
      transaction.update(accountRef, { freeGrantEmailHash: emailClaimId });
    }
  });
}

async function ensureCreditAccount(uid) {
  const { auth, db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(uid);
  let accountSnapshot = await accountRef.get();

  if (accountSnapshot.exists) {
    const existingData = accountSnapshot.data() || {};
    await registerExistingGrantClaim(db, auth, uid, accountRef, existingData);
    return { eligible: true, accountRef, data: existingData };
  }

  // The launch cutoff prevents older accounts from claiming the new-account grant.
  const launchTime = getCreditLaunchTime();
  const userRecord = await auth.getUser(uid);
  if (userRecord.emailVerified !== true) {
    return {
      eligible: false,
      reason: 'email_not_verified',
      message: 'Please verify your email address before claiming the 50 free credits. Check your inbox for the Firebase verification link.',
      accountRef,
      data: null
    };
  }
  const createdAt = Date.parse(userRecord.metadata?.creationTime || '');

  if (!Number.isFinite(createdAt) || createdAt < launchTime) {
    return {
      eligible: false,
      reason: 'before_launch',
      message: 'The one-time free-credit grant is for accounts created after the credit programme launch.',
      accountRef,
      data: null
    };
  }

  const emailClaimId = getEmailClaimId(userRecord.email);
  const claimRef = db.collection('freeCreditClaims').doc(emailClaimId);
  const grantRef = accountRef.collection('transactions').doc('welcome-free-50');
  let transactionOutcome = 'not_processed';

  // Claim registry + balance + ledger are created atomically. A second UID using
  // the same normalized email cannot win the claim after an account deletion.
  await db.runTransaction(async transaction => {
    const [currentAccount, existingClaim] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(claimRef)
    ]);

    if (currentAccount.exists) {
      transactionOutcome = 'account_exists';
      return;
    }

    if (existingClaim.exists) {
      transactionOutcome = 'email_already_claimed';
      return;
    }

    const now = FieldValue.serverTimestamp();
    transaction.create(accountRef, {
      uid,
      balance: FREE_STARTER_CREDITS,
      plan: 'free',
      freeGrantIssued: true,
      freeGrantEmailHash: emailClaimId,
      freeGrantIssuedAt: now,
      createdAt: now,
      updatedAt: now
    });
    transaction.create(grantRef, {
      type: 'grant',
      reason: 'new_account_free_allowance',
      amount: FREE_STARTER_CREDITS,
      tool: null,
      createdAt: now
    });
    transaction.create(claimRef, {
      uid,
      grantType: 'new_account_free_allowance',
      claimedAt: now,
      recordedAt: now
    });
    transactionOutcome = 'granted';
  });

  accountSnapshot = await accountRef.get();
  if (accountSnapshot.exists) {
    return { eligible: true, accountRef, data: accountSnapshot.data() || {} };
  }

  if (transactionOutcome === 'email_already_claimed') {
    return {
      eligible: false,
      reason: 'email_already_claimed',
      message: 'This email address has already received its one-time 50-credit welcome allowance. Deleting or recreating the account does not make it eligible again.',
      accountRef,
      data: null
    };
  }

  return {
    eligible: false,
    reason: 'grant_not_created',
    message: 'The free-credit allowance could not be created. Please refresh your balance or contact support.',
    accountRef,
    data: null
  };
}

async function releaseReservation(uid, reservationId, reason = 'generation_failed') {
  const { db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(uid);
  const reservationRef = accountRef.collection('reservations').doc(reservationId);
  const ledgerRef = accountRef.collection('transactions').doc(`refund-${reservationId}`);

  await db.runTransaction(async transaction => {
    const reservationSnapshot = await transaction.get(reservationRef);
    const reservationData = reservationSnapshot.exists ? (reservationSnapshot.data() || {}) : {};
    const requestRef = reservationData.requestId
      ? accountRef.collection('requests').doc(reservationData.requestId)
      : null;
    const [accountSnapshot, ledgerSnapshot, requestSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(ledgerRef),
      requestRef ? transaction.get(requestRef) : Promise.resolve(null)
    ]);

    if (!reservationSnapshot.exists || !accountSnapshot.exists) return;
    const reservation = reservationSnapshot.data() || {};
    if (reservation.status !== 'reserved') return;

    const amount = Number(reservation.amount) || 0;
    const balance = Number(accountSnapshot.data()?.balance) || 0;
    const now = FieldValue.serverTimestamp();

    transaction.update(accountRef, {
      balance: balance + amount,
      updatedAt: now
    });
    transaction.update(reservationRef, {
      status: 'released',
      releaseReason: reason,
      releasedAt: now
    });

    if (!ledgerSnapshot.exists) {
      transaction.create(ledgerRef, {
        type: 'release',
        reason,
        amount,
        tool: reservation.tool || null,
        reservationId,
        createdAt: now,
        balanceAfter: balance + amount
      });
    }

    if (requestRef && requestSnapshot?.exists) {
      const requestData = requestSnapshot.data() || {};
      if (requestData.status === 'processing' && requestData.reservationId === reservationId) {
        transaction.update(requestRef, {
          status: 'failed',
          failureReason: String(reason || 'generation_failed').slice(0, 120),
          failedAt: now,
          updatedAt: now,
          expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_RESULT_TTL_MS)
        });
      }
    }
  });
}

async function releaseReservationWithRetry(uid, reservationId, reason) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await releaseReservation(uid, reservationId, reason);
      return true;
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
  }
  console.error('[Credits] Reservation release failed after retries; TTL recovery remains active:', lastError?.code || lastError?.message);
  return false;
}

async function releaseExpiredReservations(uid) {
  const { db } = getFirebaseServices();
  const reservationsRef = db.collection('creditAccounts').doc(uid).collection('reservations');
  const pendingSnapshot = await reservationsRef
    .where('status', '==', 'reserved')
    .limit(100)
    .get();

  const nowMs = Date.now();
  for (const reservationDocument of pendingSnapshot.docs) {
    const expiresAt = reservationDocument.get('expiresAt');
    const expiryMs = expiresAt && typeof expiresAt.toMillis === 'function'
      ? expiresAt.toMillis()
      : 0;

    if (expiryMs > 0 && expiryMs <= nowMs) {
      await releaseReservationWithRetry(uid, reservationDocument.id, 'expired_reservation_recovered');
    }
  }
}

async function reserveCredits(uid, tool, requestId) {
  const cost = TOOL_COSTS[tool];
  if (!Number.isInteger(cost) || cost <= 0) {
    throw httpError(500, 'UNKNOWN_CREDIT_TOOL', 'This tool is not configured for credit usage.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(requestId || ''))) {
    throw httpError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'This request needs a valid request ID. Refresh the page and try again.');
  }

  await releaseExpiredReservations(uid);
  const { db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(uid);
  const requestRef = accountRef.collection('requests').doc(requestId);
  const reservationId = randomUUID();
  const reservationRef = accountRef.collection('reservations').doc(reservationId);
  const rateLimitRef = accountRef.collection('security').doc('generationRateLimit');
  const nowMs = Date.now();
  const expiresAt = Timestamp.fromMillis(nowMs + RESERVATION_TTL_MS);
  let replayResponse = null;

  await db.runTransaction(async transaction => {
    const [accountSnapshot, rateLimitSnapshot, requestSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(rateLimitRef),
      transaction.get(requestRef)
    ]);

    if (requestSnapshot.exists) {
      const previous = requestSnapshot.data() || {};
      if (previous.status === 'completed' && previous.responsePayload !== undefined) {
        replayResponse = {
          statusCode: Number(previous.responseStatus) || 200,
          payload: previous.responsePayload
        };
        return;
      }
      if (previous.status === 'processing') {
        const previousExpiry = previous.expiresAt && typeof previous.expiresAt.toMillis === 'function'
          ? previous.expiresAt.toMillis()
          : 0;
        if (previousExpiry > nowMs) {
          throw httpError(409, 'GENERATION_ALREADY_PROCESSING', 'This generation is already being processed. Please wait a moment before retrying.');
        }
        // The cleanup path normally marks expired reservations failed first.
        // If an orphan processing marker remains, do not silently create a second reservation.
        throw httpError(409, 'GENERATION_RECOVERY_PENDING', 'This generation is being recovered. Refresh your balance and retry in a moment.');
      }
    }

    if (!accountSnapshot.exists) {
      throw httpError(
        402,
        'FREE_CREDITS_NOT_AVAILABLE',
        'This account does not have an active credit allowance. Free credits are reserved for newly created accounts.'
      );
    }

    const rateData = rateLimitSnapshot.exists ? (rateLimitSnapshot.data() || {}) : {};
    const minuteWindow = Math.floor(nowMs / 60_000);
    const hourWindow = Math.floor(nowMs / 3_600_000);
    const minuteCount = rateData.minuteWindow === minuteWindow ? Number(rateData.minuteCount) || 0 : 0;
    const hourCount = rateData.hourWindow === hourWindow ? Number(rateData.hourCount) || 0 : 0;

    if (minuteCount >= MAX_GENERATIONS_PER_MINUTE || hourCount >= MAX_GENERATIONS_PER_HOUR) {
      throw httpError(
        429,
        'GENERATION_RATE_LIMITED',
        'You have reached the short-term generation limit. Please wait a little before creating more content.'
      );
    }

    const account = accountSnapshot.data() || {};
    const available = Number(account.balance) || 0;
    if (available < cost) {
      throw httpError(
        402,
        'INSUFFICIENT_CREDITS',
        `This generation needs ${cost} credits, but your current balance is ${available}. Visit Pricing to review your options.`,
        { required: cost, available }
      );
    }

    const now = FieldValue.serverTimestamp();
    transaction.update(accountRef, {
      balance: available - cost,
      updatedAt: now
    });
    transaction.set(rateLimitRef, {
      minuteWindow,
      minuteCount: minuteCount + 1,
      hourWindow,
      hourCount: hourCount + 1,
      updatedAt: now
    }, { merge: true });
    transaction.create(reservationRef, {
      reservationId,
      requestId,
      uid,
      tool,
      amount: cost,
      status: 'reserved',
      createdAt: now,
      expiresAt
    });
    transaction.set(requestRef, {
      requestId,
      reservationId,
      tool,
      status: 'processing',
      createdAt: now,
      updatedAt: now,
      expiresAt
    });
  });

  if (replayResponse) return { replay: true, ...replayResponse };
  return { uid, reservationId, requestId, tool, cost, replay: false };
}

async function commitReservation(reservation, responseStatus, responsePayload) {
  const { db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(reservation.uid);
  const reservationRef = accountRef.collection('reservations').doc(reservation.reservationId);
  const ledgerRef = accountRef.collection('transactions').doc(`usage-${reservation.reservationId}`);
  const requestRef = reservation.requestId
    ? accountRef.collection('requests').doc(reservation.requestId)
    : null;

  await db.runTransaction(async transaction => {
    const [reservationSnapshot, accountSnapshot, ledgerSnapshot, requestSnapshot] = await Promise.all([
      transaction.get(reservationRef),
      transaction.get(accountRef),
      transaction.get(ledgerRef),
      requestRef ? transaction.get(requestRef) : Promise.resolve(null)
    ]);

    if (!reservationSnapshot.exists || !accountSnapshot.exists) {
      throw new Error('Credit reservation could not be found while committing.');
    }

    const current = reservationSnapshot.data() || {};
    if (current.status === 'committed') return;
    if (requestRef && !requestSnapshot?.exists) {
      throw new Error('Idempotent generation request record could not be found while committing.');
    }
    if (current.status !== 'reserved') {
      throw new Error(`Credit reservation is not active (${current.status || 'unknown'}).`);
    }

    const now = FieldValue.serverTimestamp();
    const balanceAfter = Number(accountSnapshot.data()?.balance) || 0;
    transaction.update(reservationRef, {
      status: 'committed',
      committedAt: now
    });

    if (!ledgerSnapshot.exists) {
      transaction.create(ledgerRef, {
        type: 'usage',
        reason: 'successful_generation',
        amount: -reservation.cost,
        tool: reservation.tool,
        reservationId: reservation.reservationId,
        createdAt: now,
        balanceAfter
      });
    }

    if (requestRef && requestSnapshot?.exists) {
      const requestData = requestSnapshot.data() || {};
      if (requestData.status !== 'processing' || requestData.reservationId !== reservation.reservationId) {
        throw new Error('Generation request record is not active for this reservation.');
      }
      transaction.update(requestRef, {
        status: 'completed',
        responseStatus: Number(responseStatus) || 200,
        responsePayload,
        completedAt: now,
        updatedAt: now,
        expiresAt: Timestamp.fromMillis(Date.now() + IDEMPOTENCY_RESULT_TTL_MS)
      });
    }
  });
}

async function getCreditBalance(uid) {
  const { db } = getFirebaseServices();
  const account = await ensureCreditAccount(uid);
  if (!account.eligible) {
    return {
      balance: 0,
      plan: 'free',
      eligible: false,
      reason: account.reason || 'not_eligible',
      message: account.message || 'This account is not eligible for the one-time free-credit allowance.'
    };
  }

  await releaseExpiredReservations(uid);
  const snapshot = await db.collection('creditAccounts').doc(uid).get();
  const data = snapshot.data() || {};
  return {
    balance: Math.max(0, Number(data.balance) || 0),
    plan: data.plan || 'free',
    eligible: true,
    freeGrantIssued: Boolean(data.freeGrantIssued)
  };
}

function withCredits(tool, handler) {
  return async function creditProtectedHandler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    // Keep existing OPTIONS and method handling inside the original endpoint.
    if (req.method !== 'POST') {
      return handler(req, res);
    }

    let reservation;
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        throw httpError(400, 'INVALID_REQUEST_BODY', 'The generation request body must be a JSON object.');
      }
      const bodyBytes = Buffer.byteLength(JSON.stringify(req.body), 'utf8');
      if (bodyBytes > MAX_GENERATION_BODY_BYTES) {
        throw httpError(413, 'REQUEST_TOO_LARGE', 'This request is too large. Please shorten the content and try again.');
      }

      const uid = await authenticateRequest(req);
      const account = await ensureCreditAccount(uid);
      if (!account.eligible) {
        const claimWasAlreadyUsed = account.reason === 'email_already_claimed';
        throw httpError(
          402,
          claimWasAlreadyUsed ? 'FREE_CREDITS_ALREADY_CLAIMED' : 'FREE_CREDITS_NOT_AVAILABLE',
          account.message || 'This account does not have an active credit allowance.'
        );
      }
      const requestId = req.headers?.['x-quans-request-id'] || req.headers?.['X-Quans-Request-Id'] || '';
      reservation = await reserveCredits(uid, tool, String(requestId));
      if (reservation.replay) {
        return res.status(reservation.statusCode).json(reservation.payload);
      }
    } catch (error) {
      const status = Number(error.status) || 503;
      return res.status(status).json({
        error: error.message || 'Unable to start this generation.',
        code: error.code || 'CREDIT_SERVICE_ERROR',
        ...(Number.isFinite(error.required) ? { required: error.required } : {}),
        ...(Number.isFinite(error.available) ? { available: error.available } : {})
      });
    }

    const originalJson = res.json.bind(res);
    let settlementPromise = null;

    // Settle the reservation before sending any JSON response. Successful
    // endpoint responses commit the usage; all error responses release it.
    res.json = function settleThenSend(payload) {
      if (settlementPromise) return settlementPromise;

      const statusCode = Number(res.statusCode) || 200;
      settlementPromise = (async () => {
        if (statusCode >= 200 && statusCode < 300) {
          try {
            const serializedPayload = JSON.stringify(payload);
            if (!serializedPayload || Buffer.byteLength(serializedPayload, 'utf8') > MAX_CACHED_RESPONSE_BYTES) {
              await releaseReservationWithRetry(reservation.uid, reservation.reservationId, 'response_too_large_to_recover');
              res.statusCode = 502;
              return originalJson({
                error: 'The generated result was too large to safely save for recovery. No credits were charged. Please shorten the request and try again.',
                code: 'GENERATION_RESULT_TOO_LARGE'
              });
            }
            await commitReservation(reservation, statusCode, payload);
          } catch (commitError) {
            console.error('[Credits] Failed to commit generation usage:', commitError);
            try {
              await releaseReservationWithRetry(reservation.uid, reservation.reservationId, 'credit_commit_failed');
            } catch (releaseError) {
              console.error('[Credits] Could not immediately release failed commit:', releaseError);
            }
            res.statusCode = 503;
            return originalJson({
              error: 'The generation completed, but its credit transaction could not be finalized. Refresh your balance before trying again.',
              code: 'CREDIT_SETTLEMENT_FAILED'
            });
          }
        } else {
          try {
            await releaseReservationWithRetry(reservation.uid, reservation.reservationId, 'generation_failed');
          } catch (releaseError) {
            console.error('[Credits] Could not immediately release failed generation:', releaseError);
            // The reservation expires and is recovered on the next balance or generation request.
          }
        }

        return originalJson(payload);
      })();

      return settlementPromise;
    };

    try {
      const result = await handler(req, res);
      if (settlementPromise) {
        await settlementPromise;
      } else if (!res.writableEnded) {
        await releaseReservationWithRetry(reservation.uid, reservation.reservationId, 'generation_ended_without_json');
      }
      return result;
    } catch (error) {
      if (!settlementPromise) {
        try {
          await releaseReservationWithRetry(reservation.uid, reservation.reservationId, 'generation_exception');
        } catch (releaseError) {
          console.error('[Credits] Failed to release reservation after exception:', releaseError);
        }
      }
      throw error;
    }
  };
}

module.exports = {
  FREE_STARTER_CREDITS,
  TOOL_COSTS,
  authenticateRequest,
  verifyRequestToken,
  deleteUserAccountData,
  getCreditBalance,
  withCredits
};
