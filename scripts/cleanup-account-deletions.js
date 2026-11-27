'use strict';

// Admin-only recovery utility for account deletions interrupted after the
// Firebase Auth identity was removed but before Firestore recursive cleanup.

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldPath, FieldValue } = require('firebase-admin/firestore');

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

async function main() {
  const { auth, db } = getServices();
  const jobs = db.collection('accountDeletionJobs');
  let lastDoc = null;
  let cleaned = 0;
  let waiting = 0;
  let failed = 0;

  while (true) {
    let query = jobs.orderBy(FieldPath.documentId()).limit(100);
    if (lastDoc) query = query.startAfter(lastDoc);
    const page = await query.get();
    if (page.empty) break;

    for (const job of page.docs) {
      const uid = job.id;
      const userRef = db.collection('users').doc(uid);
      const creditRef = db.collection('creditAccounts').doc(uid);
      let authDeleted = job.get('authDeleted') === true;

      if (!authDeleted) {
        try {
          await auth.getUser(uid);
          await job.ref.set({
            status: 'auth_user_still_exists_review',
            authDeleted: false,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
          waiting += 1;
          continue;
        } catch (error) {
          if (error?.code !== 'auth/user-not-found') throw error;
          authDeleted = true;
          await job.ref.set({
            status: 'auth_deleted_cleanup_pending',
            authDeleted: true,
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }
      }

      try {
        await Promise.all([
          db.recursiveDelete(userRef),
          db.recursiveDelete(creditRef)
        ]);
        await job.ref.delete();
        cleaned += 1;
      } catch (error) {
        failed += 1;
        await job.ref.set({
          status: 'cleanup_pending',
          authDeleted: true,
          lastErrorCode: String(error?.code || 'unknown').slice(0, 120),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true }).catch(() => {});
        console.error(`[account-cleanup] Could not fully clean UID ${uid}:`, error?.code || error?.message);
      }
    }

    lastDoc = page.docs[page.docs.length - 1];
    if (page.size < 100) break;
  }

  console.log(JSON.stringify({ cleaned, waiting, failed }, null, 2));
}

main().catch(error => {
  console.error('[account-cleanup] Failed:', error?.message || error);
  process.exitCode = 1;
});
