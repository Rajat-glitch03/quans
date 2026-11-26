'use strict';

const { randomUUID } = require('node:crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const {
  getFirestore,
  FieldValue,
  Timestamp
} = require('firebase-admin/firestore');

const FREE_STARTER_CREDITS = 50;
const RESERVATION_TTL_MS = 5 * 60 * 1000;
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
    db: getFirestore(app)
  };
}

async function authenticateRequest(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || '';
  const match = /^Bearer\s+(.+)$/i.exec(String(authorization).trim());
  if (!match) {
    throw httpError(401, 'AUTH_REQUIRED', 'Please sign in again to use QUANS credits.');
  }

  const { auth } = getFirebaseServices();
  try {
    const decoded = await auth.verifyIdToken(match[1], true);
    return decoded.uid;
  } catch (error) {
    console.warn('[Credits] Firebase ID token verification failed:', error?.code || error?.message);
    throw httpError(401, 'INVALID_AUTH_TOKEN', 'Your session could not be verified. Please sign in again.');
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

async function ensureCreditAccount(uid) {
  const { auth, db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(uid);
  let accountSnapshot = await accountRef.get();

  if (accountSnapshot.exists) {
    return { eligible: true, accountRef, data: accountSnapshot.data() || {} };
  }

  // The launch cutoff prevents older accounts from claiming the new-account grant.
  const launchTime = getCreditLaunchTime();
  const userRecord = await auth.getUser(uid);
  const createdAt = Date.parse(userRecord.metadata?.creationTime || '');

  if (!Number.isFinite(createdAt) || createdAt < launchTime) {
    return { eligible: false, accountRef, data: null };
  }

  const grantRef = accountRef.collection('transactions').doc('welcome-free-50');
  await db.runTransaction(async transaction => {
    const currentSnapshot = await transaction.get(accountRef);
    if (currentSnapshot.exists) return;

    const now = FieldValue.serverTimestamp();
    transaction.create(accountRef, {
      uid,
      balance: FREE_STARTER_CREDITS,
      plan: 'free',
      freeGrantIssued: true,
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
  });

  accountSnapshot = await accountRef.get();
  return {
    eligible: accountSnapshot.exists,
    accountRef,
    data: accountSnapshot.data() || {}
  };
}

async function releaseReservation(uid, reservationId, reason = 'generation_failed') {
  const { db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(uid);
  const reservationRef = accountRef.collection('reservations').doc(reservationId);
  const ledgerRef = accountRef.collection('transactions').doc(`refund-${reservationId}`);

  await db.runTransaction(async transaction => {
    const [reservationSnapshot, accountSnapshot, ledgerSnapshot] = await Promise.all([
      transaction.get(reservationRef),
      transaction.get(accountRef),
      transaction.get(ledgerRef)
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
  });
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
      await releaseReservation(uid, reservationDocument.id, 'expired_reservation_recovered');
    }
  }
}

async function reserveCredits(uid, tool) {
  const cost = TOOL_COSTS[tool];
  if (!Number.isInteger(cost) || cost <= 0) {
    throw httpError(500, 'UNKNOWN_CREDIT_TOOL', 'This tool is not configured for credit usage.');
  }

  await releaseExpiredReservations(uid);
  const { db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(uid);
  const reservationId = randomUUID();
  const reservationRef = accountRef.collection('reservations').doc(reservationId);
  const expiresAt = Timestamp.fromMillis(Date.now() + RESERVATION_TTL_MS);

  await db.runTransaction(async transaction => {
    const accountSnapshot = await transaction.get(accountRef);
    if (!accountSnapshot.exists) {
      throw httpError(
        402,
        'FREE_CREDITS_NOT_AVAILABLE',
        'This account does not have an active credit allowance. Free credits are reserved for newly created accounts.'
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
    transaction.create(reservationRef, {
      reservationId,
      uid,
      tool,
      amount: cost,
      status: 'reserved',
      createdAt: now,
      expiresAt
    });
  });

  return { uid, reservationId, tool, cost };
}

async function commitReservation(reservation) {
  const { db } = getFirebaseServices();
  const accountRef = db.collection('creditAccounts').doc(reservation.uid);
  const reservationRef = accountRef.collection('reservations').doc(reservation.reservationId);
  const ledgerRef = accountRef.collection('transactions').doc(`usage-${reservation.reservationId}`);

  await db.runTransaction(async transaction => {
    const [reservationSnapshot, accountSnapshot, ledgerSnapshot] = await Promise.all([
      transaction.get(reservationRef),
      transaction.get(accountRef),
      transaction.get(ledgerRef)
    ]);

    if (!reservationSnapshot.exists || !accountSnapshot.exists) {
      throw new Error('Credit reservation could not be found while committing.');
    }

    const current = reservationSnapshot.data() || {};
    if (current.status === 'committed') return;
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
      message: 'The one-time free-credit grant is for accounts created after the credit programme launch.'
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
      const uid = await authenticateRequest(req);
      const account = await ensureCreditAccount(uid);
      if (!account.eligible) {
        throw httpError(
          402,
          'FREE_CREDITS_NOT_AVAILABLE',
          'This account was created before the free-credit launch and has no active credit allowance.'
        );
      }
      reservation = await reserveCredits(uid, tool);
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
            await commitReservation(reservation);
          } catch (commitError) {
            console.error('[Credits] Failed to commit generation usage:', commitError);
            try {
              await releaseReservation(reservation.uid, reservation.reservationId, 'credit_commit_failed');
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
            await releaseReservation(reservation.uid, reservation.reservationId, 'generation_failed');
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
        await releaseReservation(reservation.uid, reservation.reservationId, 'generation_ended_without_json');
      }
      return result;
    } catch (error) {
      if (!settlementPromise) {
        try {
          await releaseReservation(reservation.uid, reservation.reservationId, 'generation_exception');
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
  getCreditBalance,
  withCredits
};
