const express = require('express');
// Security Middleware Imports
const { securityHeaders, inputSanitization } = require('../middleware/security');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use(paymentLimiter);
router.use(authenticate);



// DEPRECATED: All subscription management has been moved to PayU
// This file is kept for backward compatibility but all routes now redirect to PayU endpoints

// Apply auth middleware to all subscription routes that require authentication
router.use((req, res, next) => {
  // Log deprecation warning
  console.warn(`[DEPRECATED] Legacy subscription route accessed: ${req.method} ${req.path}`);
  console.warn('[DEPRECATED] Please use PayU endpoints instead: /api/payment/payu/*');

  // Skip auth for deprecated routes that redirect anyway
  next();
});

// Get available subscription plans - redirect to PayU
router.get('/plans', async (req, res) => {
  try {
    // Redirect to PayU plans endpoint
    const fetch = require('node-fetch');
    const payuResponse = await fetch(`${req.protocol}://${req.get('host')}/api/payment/payu/plans`);
    const plans = await payuResponse.json();
    res.json(plans);
  } catch (error) {
    console.error('Error redirecting to PayU plans:', error);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Payment service has migrated to PayU. Please use /api/payment/payu/plans instead.'
    });
  }
});

// Get current user subscription - redirect to PayU
router.get('/current', async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Redirect to PayU subscription endpoint
    const fetch = require('node-fetch');
    const payuResponse = await fetch(`${req.protocol}://${req.get('host')}/api/payment/payu/subscription/${req.user.id}`);
    const subscription = await payuResponse.json();
    res.json(subscription);
  } catch (error) {
    console.error('Error redirecting to PayU subscription:', error);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Payment service has migrated to PayU. Please use /api/payment/payu/subscription/{userId} instead.'
    });
  }
});

// Create checkout session - redirect to PayU
router.post('/create-checkout', async (req, res) => {
  try {
    const { planId, userId } = req.body;

    // Redirect to PayU transaction creation
    const fetch = require('node-fetch');
    const payuResponse = await fetch(`${req.protocol}://${req.get('host')}/api/payment/payu/create-transaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        planId,
        userId,
        currency: 'INR'
      })
    });

    const transactionData = await payuResponse.json();

    if (!payuResponse.ok) {
      return res.status(payuResponse.status).json(transactionData);
    }

    // Return redirect URL for PayU
    res.json({
      url: `${transactionData.paymentUrl}?${new URLSearchParams(transactionData.payuParams).toString()}`,
      transactionId: transactionData.txnid
    });
  } catch (error) {
    console.error('Error redirecting to PayU checkout:', error);
    res.status(503).json({
      error: 'Service Unavailable',
      message: 'Payment service has migrated to PayU. Please use /api/payment/payu/create-transaction instead.'
    });
  }
});

// All other subscription endpoints redirect with deprecation notice
router.post('*', (req, res) => {
  res.status(410).json({
    error: 'Service Unavailable',
    message: 'Stripe and RevenueCat integrations have been removed. Please use PayU endpoints: /api/payment/payu/*',
    migrationGuide: 'https://docs.offscreenbuddy.com/migration/payu'
  });
});

router.get('*', (req, res) => {
  res.status(410).json({
    error: 'Service Unavailable',
    message: 'Stripe and RevenueCat integrations have been removed. Please use PayU endpoints: /api/payment/payu/*',
    migrationGuide: 'https://docs.offscreenbuddy.com/migration/payu'
  });
});

router.put('*', (req, res) => {
  res.status(410).json({
    error: 'Service Unavailable',
    message: 'Stripe and RevenueCat integrations have been removed. Please use PayU endpoints: /api/payment/payu/*',
    migrationGuide: 'https://docs.offscreenbuddy.com/migration/payu'
  });
});

router.delete('*', (req, res) => {
  res.status(410).json({
    error: 'Service Unavailable',
    message: 'Stripe and RevenueCat integrations have been removed. Please use PayU endpoints: /api/payment/payu/*',
    migrationGuide: 'https://docs.offscreenbuddy.com/migration/payu'
  });
});

module.exports = router;