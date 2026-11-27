'use strict';

// One-time migration for accounts that received free credits before permanent
// email-HMAC claim records were consistently written. This script never grants
// or removes credits; it only backfills freeCreditClaims and freeGrantEmailHash.

const { createHmac } = require('node:crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

function getServices() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is required.');
  const account = JSON.parse(raw);
  const projectId = process.env.FIREBASE_PROJECT_ID || account.project_id;
  const privateKey = String(account.private_key || '').replace(/\\n/g, '\n');
  if (!projectId || !account.client_email || !privateKey) {
    throw new Error('The Firebase service-account JSON is missing required fields.');
  }
  const app = getApps()[0] || initializeApp({
    credential: cert({ projectId, clientEmail: account.client_email, privateKey }),
    projectId
  });
  return { auth: getAuth(app), db: getFirestore(app) };
}

function emailDigest(email, secret) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return null;
  return createHmac('sha256', secret).update(normalized, 'utf8').digest('hex');
}

async function main() {
  const secret = process.env.QUANS_CREDIT_EMAIL_HMAC_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('QUANS_CREDIT_EMAIL_HMAC_KEY must be the existing 32+ character HMAC secret.');
  }

  const { auth, db } = getServices();
  const snapshot = await db.collection('creditAccounts')
    .where('freeGrantIssued', '==', true)
    .get();

  let scanned = 0;
  let backfilled = 0;
  let alreadyPresent = 0;
  let skipped = 0;
  let conflicts = 0;

  for (const doc of snapshot.docs) {
    scanned += 1;
    const uid = doc.id;
    const accountData = doc.data() || {};
    let digest = accountData.freeGrantEmailHash;

    if (!digest) {
      let email = '';
      try {
        const user = await auth.getUser(uid);
        email = user.email || '';
      } catch (error) {
        // A deleted Auth user may still have a Firestore wallet. Try the legacy
        // profile document without printing any email address to the console.
        try {
          const legacyProfile = await db.collection('users').doc(uid).get();
          const profile = legacyProfile.exists ? legacyProfile.data() || {} : {};
          email = profile.email || profile.emailAddress || '';
        } catch (_) {
          email = '';
        }
      }
      digest = emailDigest(email, secret);
    }

    if (!digest || !/^[a-f0-9]{64}$/.test(digest)) {
      skipped += 1;
      console.warn(`[claim-migration] Skipped UID ${uid}: no recoverable verified email digest.`);
      continue;
    }

    const accountRef = doc.ref;
    const claimRef = db.collection('freeCreditClaims').doc(digest);
    let result = 'backfilled';

    await db.runTransaction(async transaction => {
      const [freshAccount, existingClaim] = await Promise.all([
        transaction.get(accountRef),
        transaction.get(claimRef)
      ]);
      if (!freshAccount.exists || freshAccount.get('freeGrantIssued') !== true) {
        result = 'skipped';
        return;
      }

      if (!existingClaim.exists) {
        transaction.create(claimRef, {
          uid,
          grantType: 'new_account_free_allowance',
          claimedAt: freshAccount.get('freeGrantIssuedAt') || FieldValue.serverTimestamp(),
          recordedAt: FieldValue.serverTimestamp(),
          migratedFromExistingGrant: true
        });
      } else {
        const currentClaimUid = existingClaim.get('uid');
        if (currentClaimUid && currentClaimUid !== uid) result = 'conflict';
        else result = 'already_present';
      }

      if (!freshAccount.get('freeGrantEmailHash')) {
        transaction.update(accountRef, { freeGrantEmailHash: digest });
      }
    });

    if (result === 'backfilled') backfilled += 1;
    else if (result === 'already_present') alreadyPresent += 1;
    else if (result === 'conflict') conflicts += 1;
    else skipped += 1;
  }

  console.log(JSON.stringify({ scanned, backfilled, alreadyPresent, conflicts, skipped }, null, 2));
  if (skipped || conflicts) {
    console.warn('Review skipped/conflicting UIDs in the secure admin console before public launch. No balances were modified.');
  }
}

main().catch(error => {
  console.error('[claim-migration] Failed:', error?.message || error);
  process.exitCode = 1;
});
