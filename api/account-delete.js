'use strict';

const { verifyRequestToken, deleteUserAccountData } = require('../lib/credits');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck, X-Quans-Request-Id');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  try {
    const { decoded } = await verifyRequestToken(req);
    const authTimeSeconds = Number(decoded.auth_time);
    const ageSeconds = Date.now() / 1000 - authTimeSeconds;

    if (!Number.isFinite(authTimeSeconds) || ageSeconds < 0 || ageSeconds > 300) {
      return res.status(401).json({
        code: 'AUTH_RECENT_LOGIN_REQUIRED',
        error: 'For your security, please sign in again before deleting your account.'
      });
    }

    await deleteUserAccountData(decoded.uid);
    return res.status(200).json({ ok: true, message: 'Your account and associated data have been deleted.' });
  } catch (error) {
    console.error('[Account Delete] Request failed:', error?.code || error?.message);
    if (error?.authDeleted === true) {
      // Auth access is already revoked and the permanent tombstone is in place.
      // The admin recovery script can finish deleting remaining Firestore data.
      return res.status(202).json({
        ok: true,
        cleanupPending: true,
        code: 'ACCOUNT_DELETED_CLEANUP_PENDING',
        message: 'Your sign-in has been deleted. Remaining account data cleanup is pending and will be retried by the QUANS administrator.'
      });
    }
    return res.status(Number(error.status) || 500).json({
      code: error.code || 'ACCOUNT_DELETE_FAILED',
      error: error.message || 'Unable to delete your account right now.'
    });
  }
};
