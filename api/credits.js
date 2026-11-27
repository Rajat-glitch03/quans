'use strict';

const { authenticateRequest, getCreditBalance } = require('../lib/credits');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Firebase-AppCheck, X-Quans-Request-Id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const uid = await authenticateRequest(req);
    const account = await getCreditBalance(uid);
    return res.status(200).json(account);
  } catch (error) {
    console.error('[Credits] Balance request failed:', error?.code || error?.message);
    return res.status(Number(error.status) || 503).json({
      error: error.message || 'Unable to load your credit balance.',
      code: error.code || 'CREDIT_BALANCE_ERROR'
    });
  }
};
