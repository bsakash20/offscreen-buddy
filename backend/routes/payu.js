const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');

// Security Middleware Imports
const { applySecurity, securityHeaders, inputValidation, inputSanitization, csrfProtection } = require('../middleware/security');
const { validateUserRegistration, validateUserLogin, validateIdParam } = require('../middleware/validation');
const { authLimiter, paymentLimiter, sensitiveLimiter } = require('../middleware/rateLimiter');
const { authenticate, logout } = require('../middleware/auth');

// Logging and Performance Middleware
const { logger, logPayment, logSecurity, logRequest, logDatabaseQuery } = require('../config/logger');
const { asyncHandler } = require('../middleware/errorHandler');
const { logDatabaseQuery: logPerfDatabaseQuery, startTimer } = require('../middleware/performanceLogger');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use(paymentLimiter);

// PayU Configuration
const PAYU_CONFIG = {
  merchantKey: process.env.PAYU_MERCHANT_KEY,
  salt: process.env.PAYU_SALT,
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://secure.payu.in/_payment'
    : 'https://test.payu.in/_payment',
  successUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success`,
  failureUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-failure`
};

// Health check endpoint for PayU service
router.get('/health', asyncHandler(async (req, res) => {
  const startTime = Date.now();

  try {
    logger.info('PayU health check requested', {
      requestId: req.id,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Check database connection with timing
    const dbStartTime = Date.now();
    const { data: dbTest, error: dbError } = await supabase
      .from('subscription_plans')
      .select('id')
      .limit(1);
    const dbLatency = Date.now() - dbStartTime;

    const dbHealthy = !dbError;
    logPerfDatabaseQuery('health_check', dbLatency, !dbError, {
      table: 'subscription_plans',
      operation: 'select'
    });

    // Check PayU configuration
    const configHealthy = !!(PAYU_CONFIG.merchantKey && PAYU_CONFIG.salt);

    // Overall health status
    const overallHealthy = dbHealthy && configHealthy;

    const healthResult = {
      database: {
        status: dbHealthy ? 'ok' : 'error',
        latency: dbLatency,
        error: dbError ? dbError.message : null
      },
      payuConfig: {
        status: configHealthy ? 'ok' : 'error',
        hasMerchantKey: !!PAYU_CONFIG.merchantKey,
        hasSalt: !!PAYU_CONFIG.salt
      }
    };

    logger.info('PayU health check completed', {
      requestId: req.id,
      responseTime: Date.now() - startTime,
      overall: overallHealthy ? 'HEALTHY' : 'UNHEALTHY',
      services: healthResult
    });

    res.status(overallHealthy ? 200 : 503).json({
      status: overallHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: healthResult,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('PayU health check failed', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });

    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      services: {
        database: {
          status: 'error',
          error: 'Health check failed'
        },
        payuConfig: {
          status: 'unknown'
        }
      }
    });
  }
}));

// Get available subscription plans for PayU
router.get('/plans', asyncHandler(async (req, res) => {
  const timer = startTimer('fetch_subscription_plans', {
    source: 'payu_service',
    endpoint: '/plans'
  });

  try {
    logger.info('Fetching subscription plans', {
      requestId: req.id,
      ip: req.ip
    });

    // Query Supabase for subscription plans with performance logging
    const dbStartTime = Date.now();
    const { data: plansData, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });
    const dbLatency = Date.now() - dbStartTime;

    logPerfDatabaseQuery('fetch_plans', dbLatency, !error, {
      table: 'subscription_plans',
      operation: 'select',
      recordCount: plansData?.length || 0
    });

    if (error) {
      logger.error('Error fetching plans from Supabase', {
        requestId: req.id,
        error: error.message,
        code: error.code
      });

      timer.end(false, { error: error.message });
      return res.json(getFallbackPlans());
    }

    // Map to PayU plans (prices in paise)
    const plans = plansData.map((plan, index) => ({
      id: plan.id,
      name: plan.tier === 'pro' ? 'Pro Monthly' : plan.name,
      price: Math.round(plan.price_monthly * 100),
      priceId: plan.tier === 'pro' ? 'plan_pro_monthly' : null,
      interval: 'month',
      features: plan.features,
      trialDays: plan.tier === 'free' ? undefined : 7
    }));

    // Add yearly plan
    const yearlyPlan = plansData.find(plan => plan.tier === 'pro');
    if (yearlyPlan) {
      plans.push({
        id: 'yearly_' + yearlyPlan.id,
        name: 'Pro Yearly',
        price: Math.round(yearlyPlan.price_yearly * 100),
        priceId: 'plan_pro_yearly',
        interval: 'year',
        features: yearlyPlan.features,
        trialDays: 7
      });
    }

    logger.info('Subscription plans fetched successfully', {
      requestId: req.id,
      planCount: plans.length,
      hasYearlyPlan: !!yearlyPlan
    });

    timer.end(true, { planCount: plans.length });
    res.json(plans);
  } catch (error) {
    logger.error('Get PayU plans error', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });

    timer.end(false, { error: error.message });
    res.json(getFallbackPlans());
  }
}));

// Create PayU transaction
router.post('/create-transaction',
  paymentLimiter,
  [
    body('planId').notEmpty().withMessage('Plan ID is required'),
    body('userId').notEmpty().isString().withMessage('User ID is required'),
    body('currency').optional().isString().isLength({ min: 3, max: 3 }).withMessage('Currency must be 3 letters'),
  ],
  asyncHandler(async (req, res) => {
    const timer = startTimer('create_payu_transaction', {
      source: 'payu_service',
      endpoint: '/create-transaction'
    });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Payment transaction validation failed', {
          requestId: req.id,
          errors: errors.array(),
          body: req.body
        });

        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { planId, userId, currency = 'INR' } = req.body;
      const requestId = req.id;

      logger.info('Creating PayU transaction', {
        requestId,
        userId,
        planId,
        currency,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Log security event for payment initiation
      logSecurity('payment_initiated', 'medium', {
        requestId,
        userId,
        planId,
        currency,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      // Get the plan from database with performance logging
      let plan = null;
      const dbStartTime = Date.now();

      // Strategy 1: Try exact ID match (for numeric IDs)
      if (!isNaN(planId)) {
        console.log(`[PayU Debug] Strategy 1: Trying exact numeric ID match for ${planId}`);
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', parseInt(planId))
          .eq('is_active', true)
          .single();

        if (data && !error) {
          console.log(`[PayU Debug] Strategy 1 SUCCESS: Found plan by numeric ID`);
          plan = data;
        }
      }

      // Strategy 2: Handle frontend plan ID format (pro_monthly, pro_yearly)
      if (!plan && (planId.includes('pro_monthly') || planId.includes('pro_yearly'))) {
        console.log(`[PayU Debug] Strategy 2: Handling frontend plan ID format: ${planId}`);

        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('tier', 'pro')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          console.log(`[PayU Debug] Strategy 2 SUCCESS: Found pro plan for ${planId}`);
          plan = data;
        }
      }

      // Strategy 3: Handle yearly plan formats (yearly_2, yearly_plan_id)
      if (!plan && planId.startsWith('yearly_')) {
        console.log(`[PayU Debug] Strategy 3: Handling yearly plan format: ${planId}`);

        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('tier', 'pro')
          .eq('is_active', true)
          .single();

        if (data && !error) {
          console.log(`[PayU Debug] Strategy 3 SUCCESS: Found pro plan for yearly_${planId}`);
          plan = data;
        }
      }

      // Strategy 4: Try tier match (generic fallback)
      if (!plan) {
        console.log(`[PayU Debug] Strategy 4: Trying tier match for ${planId}`);
        let tier = planId.replace(/_(monthly|yearly)$/, ''); // Remove _monthly or _yearly

        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('tier', tier)
          .eq('is_active', true)
          .single();

        if (data && !error) {
          console.log(`[PayU Debug] Strategy 4 SUCCESS: Found plan by tier ${tier}`);
          plan = data;
        }
      }

      const dbLatency = Date.now() - dbStartTime;
      logPerfDatabaseQuery('fetch_plan_details', dbLatency, !!plan, {
        table: 'subscription_plans',
        operation: 'select',
        planId,
        found: !!plan
      });

      if (!plan) {
        logger.warn('Subscription plan not found', {
          requestId,
          planId,
          userId
        });

        timer.end(false, { error: 'Plan not found' });
        return res.status(404).json({
          error: 'Plan not found',
          message: 'Subscription plan does not exist'
        });
      }

      let amount = plan.price_monthly * 100;
      let planType = 'monthly';

      // Log plan detection for debugging
      console.log(`[PayU Debug] Plan detection for planId: ${planId} (type: ${typeof planId})`);
      console.log(`[PayU Debug] Plan tier: ${plan.tier}`);
      console.log(`[PayU Debug] Monthly price: ${plan.price_monthly}, Yearly price: ${plan.price_yearly}`);

      // Adjust price for yearly plan - check multiple indicators
      // Convert planId to string for safe string operations
      const planIdStr = String(planId);

      const isYearlyPlan = planIdStr.includes('yearly') ||
        planIdStr.includes('_yearly') ||
        planIdStr.startsWith('yearly_') ||
        planIdStr === 'pro_yearly' ||
        (plan.tier === 'pro' && (planIdStr.includes('yearly') || planIdStr.includes('pro_yearly')));

      if (isYearlyPlan) {
        console.log(`[PayU Debug] Detected yearly plan - using yearly price`);
        amount = plan.price_yearly * 100;
        planType = 'yearly';
      } else {
        console.log(`[PayU Debug] Detected monthly plan - using monthly price`);
      }

      // Get user details - First try to get from Supabase
      logger.debug('Looking up user details', {
        requestId,
        userId
      });

      let user = null;

      try {
        // Try to get actual user details from Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email, name, phone')
          .eq('id', userId)
          .single();

        if (!userError && userData) {
          user = {
            email: userData.email || '',
            name: userData.name || '',
            phone: userData.phone || ''
          };
          logger.info('User details found in database', {
            requestId,
            userId,
            hasEmail: !!user.email,
            hasName: !!user.name,
            hasPhone: !!user.phone
          });
        }
      } catch (dbError) {
        logger.warn('Could not fetch user details from database', {
          requestId,
          userId,
          error: dbError.message
        });
      }

      // Fallback to default user details if database lookup fails
      if (!user) {
        logger.warn('Using fallback user details', {
          requestId,
          userId
        });

        user = {
          email: 'user' + userId.substring(0, 8) + '@example.com',
          name: 'User ' + userId.substring(0, 8),
          phone: '+91-9876543210'
        };
      }

      const txnid = 'txn_' + userId + '_' + Date.now() + '_' + uuidv4().substr(0, 8);
      const phone = user.phone || '';

      // PayU parameters
      const payuParams = {
        key: PAYU_CONFIG.merchantKey,
        txnid: txnid,
        amount: (amount / 100).toFixed(2),
        productinfo: plan.name + ' - ' + plan.tier + ' subscription',
        firstname: user.name || 'User',
        email: user.email || '',
        phone: phone,
        surl: PAYU_CONFIG.successUrl,
        furl: PAYU_CONFIG.failureUrl,
        udf1: userId,
        udf2: planId,
        udf3: plan.tier,
        udf4: plan.id.toString(),
        udf5: 'subscription'
      };

      // Validate mandatory PayU parameters before transaction creation
      const mandatoryParams = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl'];
      const missingParams = mandatoryParams.filter(param => !payuParams[param] || payuParams[param].toString().trim() === '');

      if (missingParams.length > 0) {
        logger.error('Missing mandatory PayU parameters', {
          requestId,
          txnid,
          missingParams,
          payuParams: {
            key: payuParams.key ? 'SET' : 'MISSING',
            txnid: payuParams.txnid ? 'SET' : 'MISSING',
            amount: payuParams.amount ? 'SET' : 'MISSING',
            productinfo: payuParams.productinfo ? 'SET' : 'MISSING',
            firstname: payuParams.firstname ? 'SET' : 'MISSING',
            email: payuParams.email ? 'SET' : 'MISSING',
            phone: payuParams.phone ? 'SET' : 'MISSING',
            surl: payuParams.surl ? 'SET' : 'MISSING',
            furl: payuParams.furl ? 'SET' : 'MISSING'
          }
        });

        timer.end(false, {
          error: 'Missing mandatory parameters',
          missingParams: missingParams.join(', ')
        });
        return res.status(400).json({
          error: 'Missing mandatory PayU parameters',
          message: `The following mandatory parameters are missing or empty: ${missingParams.join(', ')}`,
          missingParams
        });
      }

      // Validate PayU configuration
      if (!PAYU_CONFIG.merchantKey) {
        logger.error('PayU merchant key not configured', {
          requestId,
          txnid
        });

        timer.end(false, { error: 'PayU merchant key not configured' });
        return res.status(500).json({
          error: 'Payment gateway not properly configured',
          message: 'Merchant key is missing. Please contact support.'
        });
      }

      if (!PAYU_CONFIG.salt) {
        logger.error('PayU salt not configured', {
          requestId,
          txnid
        });

        timer.end(false, { error: 'PayU salt not configured' });
        return res.status(500).json({
          error: 'Payment gateway security not configured',
          message: 'Salt key is missing. Please contact support.'
        });
      }

      // Generate SHA512 hash for PayU
      const hashStartTime = Date.now();
      const hashString = generatePayUHash(payuParams);

      if (!hashString) {
        logger.error('Failed to generate PayU hash', {
          requestId,
          txnid,
          hashParams: Object.keys(payuParams)
        });

        timer.end(false, { error: 'Hash generation failed' });
        return res.status(500).json({
          error: 'Payment security validation failed',
          message: 'Unable to generate secure payment signature. Please try again.'
        });
      }

      payuParams.hash = hashString;
      const hashGenerationTime = Date.now() - hashStartTime;

      // Log payment transaction creation
      logPayment('transaction_created', {
        requestId,
        txnid,
        userId,
        planId,
        planTier: plan.tier,
        amount: amount / 100, // Convert back to rupees for logging
        currency,
        hashGenerationTime,
        transactionType: 'subscription'
      });

      logger.info('PayU transaction created successfully', {
        requestId,
        txnid,
        userId,
        planId,
        amount: amount / 100,
        currency,
        hashGenerationTime
      });

      timer.end(true, {
        txnid,
        amount: amount / 100,
        planTier: plan.tier
      });

      res.json({
        txnid: payuParams.txnid,
        amount: payuParams.amount,
        currency: currency,
        payuParams: payuParams,
        paymentUrl: PAYU_CONFIG.baseUrl
      });
    } catch (error) {
      logger.error('Create PayU transaction failed', {
        requestId: req.id,
        error: error.message,
        stack: error.stack,
        body: req.body
      });

      timer.end(false, { error: error.message });
      res.status(500).json({
        error: 'Failed to create transaction',
        message: error.message || 'An unexpected error occurred'
      });
    }
  })
);

// Get subscription status for PayU
router.get('/subscription/:userId',
  sensitiveLimiter,
  asyncHandler(async (req, res) => {
    const timer = startTimer('get_subscription_status', {
      source: 'payu_service',
      endpoint: '/subscription/:userId'
    });

    try {
      const { userId } = req.params;

      logger.info('Getting subscription status', {
        requestId: req.id,
        userId,
        ip: req.ip
      });

      if (!userId) {
        logger.warn('User ID missing in subscription status request', {
          requestId: req.id
        });

        timer.end(false, { error: 'User ID required' });
        return res.status(400).json({
          error: 'Bad Request',
          message: 'User ID is required'
        });
      }

      // Query user's subscription from database
      const { data: subscription, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          *,
          subscription_plans(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
        logger.error('Error fetching subscription', {
          requestId: req.id,
          userId,
          error: subError.message
        });
      }

      // Build status response
      const status = subscription ? {
        active: true,
        plan: subscription.subscription_plans?.tier || 'pro',
        tier: subscription.subscription_plans?.tier || 'pro',
        expiresDate: subscription.expires_at,
        trialEndDate: null,
        subscriptionId: subscription.id,
        status: subscription.status,
        planName: subscription.subscription_plans?.name || 'Premium',
        features: subscription.subscription_plans?.features || []
      } : {
        active: false,
        plan: 'free',
        tier: 'free',
        expiresDate: null,
        trialEndDate: null,
        subscriptionId: '',
        status: 'none'
      };

      logger.info('Subscription status retrieved', {
        requestId: req.id,
        userId,
        status: status.status,
        plan: status.plan
      });

      timer.end(true, { status: status.status });
      res.json(status);
    } catch (error) {
      logger.error('Get PayU subscription status failed', {
        requestId: req.id,
        userId: req.params.userId,
        error: error.message,
        stack: error.stack
      });

      timer.end(false, { error: error.message });
      res.status(500).json({
        error: 'Failed to get subscription status',
        message: error.message || 'An unexpected error occurred'
      });
    }
  })
);

// Generate PayU form HTML for mobile (serves HTML directly)
router.post('/generate-form', asyncHandler(async (req, res) => {
  const timer = startTimer('generate_payu_form', {
    source: 'payu_service',
    endpoint: '/generate-form'
  });

  try {
    const { payuParams, paymentUrl, txnid } = req.body;
    const requestId = req.id;

    logger.info('Generating PayU form HTML for mobile', {
      requestId,
      txnid,
      paramCount: Object.keys(payuParams).length
    });

    if (!payuParams || !paymentUrl || !txnid) {
      logger.warn('Missing required parameters for form generation', {
        requestId,
        txnid,
        hasPayuParams: !!payuParams,
        hasPaymentUrl: !!paymentUrl
      });

      timer.end(false, { error: 'Missing required parameters' });
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'payuParams, paymentUrl, and txnid are required'
      });
    }

    // Validate mandatory parameters
    const mandatoryParams = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'hash'];
    const missingParams = mandatoryParams.filter(param => !payuParams[param]);

    if (missingParams.length > 0) {
      logger.error('Missing mandatory parameters in form generation', {
        requestId,
        txnid,
        missingParams
      });

      timer.end(false, { error: 'Missing mandatory parameters', missingParams });
      return res.status(400).json({
        error: 'Missing mandatory PayU parameters',
        message: `Missing parameters: ${missingParams.join(', ')}`,
        missingParams
      });
    }

    // Generate the form HTML
    const formHtml = generatePayUFormHtml(payuParams, paymentUrl);

    // Return the HTML directly for the mobile app to use
    logger.info('PayU form HTML generated successfully', {
      requestId,
      txnid,
      htmlLength: formHtml.length,
      paramCount: Object.keys(payuParams).length
    });

    timer.end(true, {
      txnid,
      htmlLength: formHtml.length
    });

    res.json({
      html: formHtml,
      txnid,
      paramCount: Object.keys(payuParams).length
    });
  } catch (error) {
    logger.error('Generate PayU form failed', {
      requestId: req.id,
      error: error.message,
      stack: error.stack
    });

    timer.end(false, { error: error.message });
    res.status(500).json({
      error: 'Failed to generate PayU form',
      message: error.message || 'An unexpected error occurred'
    });
  }
}));

// Helper Functions

function generatePayUFormHtml(payuParams, paymentUrl) {
  console.log('🔄 Generating PayU form HTML with params:', {
    actionUrl: paymentUrl,
    paramCount: Object.keys(payuParams).length
  });

  const inputsHtml = Object.keys(payuParams)
    .map(key => `<input type="hidden" name="${key}" value="${String(payuParams[key]).replace(/"/g, '"')}">`)
    .join('');

  const formHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>PayU Payment</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #3498db; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .info { margin: 20px 0; color: #666; }
        .params-info { margin: 20px 0; padding: 10px; background: #f0f0f0; border-radius: 5px; }
      </style>
      <script>
        // Auto-submit the form when page loads
        window.onload = function() {
          console.log('🚀 Auto-submitting PayU form with ${Object.keys(payuParams).length} parameters');
          console.log('📋 Parameters:', ${JSON.stringify(Object.keys(payuParams))});
          document.getElementById('payuForm').submit();
        };
      </script>
    </head>
    <body>
      <h2>Redirecting to PayU Payment...</h2>
      <div class="spinner"></div>
      <div class="info">Please wait while we redirect you to PayU for secure payment.</div>
      <div class="params-info">
        <p>Payment Parameters: ${Object.keys(payuParams).length} fields</p>
        <p>Transaction ID: ${payuParams.txnid || 'N/A'}</p>
        <p>Amount: ${payuParams.amount || 'N/A'}</p>
      </div>
      <form id="payuForm" method="POST" action="${paymentUrl}">
        ${inputsHtml}
        <noscript>
          <button type="submit">Continue to Payment</button>
        </noscript>
      </form>
    </body>
    </html>
  `;

  console.log('✅ Generated PayU form HTML:', formHtml.length, 'characters');
  return formHtml;
}

function generatePayUHash(params) {
  // PayU Hash Formula: key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
  // Note: surl and furl are NOT included in the hash
  const hashSequence = [
    params.key,
    params.txnid,
    params.amount,
    params.productinfo,
    params.firstname,
    params.email,
    params.udf1 || '',
    params.udf2 || '',
    params.udf3 || '',
    params.udf4 || '',
    params.udf5 || '',
    '', // udf6
    '', // udf7
    '', // udf8
    '', // udf9
    '', // udf10
    PAYU_CONFIG.salt
  ].join('|');

  console.log('🔐 Generating PayU hash with sequence:', hashSequence);
  const hash = crypto.createHash('sha512').update(hashSequence).digest('hex');
  console.log('🔐 Generated hash:', hash);

  return hash;
}

function verifyPayUHash(params) {
  const { hash, ...paramsWithoutHash } = params;

  const hashSequence = [
    paramsWithoutHash.key,
    paramsWithoutHash.txnid,
    paramsWithoutHash.amount,
    paramsWithoutHash.productinfo,
    paramsWithoutHash.firstname,
    paramsWithoutHash.email,
    paramsWithoutHash.udf1 || '',
    paramsWithoutHash.udf2 || '',
    paramsWithoutHash.udf3 || '',
    paramsWithoutHash.udf4 || '',
    paramsWithoutHash.udf5 || '',
    paramsWithoutHash.surl,
    paramsWithoutHash.furl,
    PAYU_CONFIG.salt
  ].join('|');

  return crypto.createHash('sha512').update(hashSequence).digest('hex');
}

function getFallbackPlans() {
  return [
    {
      id: 'pro_monthly',
      name: 'Pro Monthly',
      price: 49900,
      priceId: 'plan_pro_monthly',
      interval: 'month',
      features: [
        'Timer Lock Mode',
        'Smart Notifications',
        'Analytics Dashboard',
        'Smart Automation',
        'Security Features',
        'Team Management',
        'White Label Options'
      ],
      trialDays: 7
    },
    {
      id: 'pro_yearly',
      name: 'Pro Yearly',
      price: 499900,
      priceId: 'plan_pro_yearly',
      interval: 'year',
      features: [
        'Timer Lock Mode',
        'Smart Notifications',
        'Analytics Dashboard',
        'Smart Automation',
        'Security Features',
        'Team Management',
        'White Label Options'
      ],
      trialDays: 7
    },
    {
      id: 'free_plan',
      name: 'Free Plan',
      price: 0,
      priceId: 'plan_free',
      interval: 'month',
      features: ['Basic Timer'],
      trialDays: undefined
    }
  ];
}

module.exports = router;