const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
// Security Middleware Imports - Enhanced Security
const { applySecurity, securityHeaders, inputValidation, inputSanitization, csrfProtection } = require('../middleware/security');
const { enhancedSecurityMiddleware, enhancedRateLimit, recordFailedLogin, clearLoginAttempts } = require('../middleware/enhancedSecurity');
const { validateUserRegistration, validateUserLogin, validateIdParam } = require('../middleware/validation');
const { authLimiter, paymentLimiter, sensitiveLimiter } = require('../middleware/rateLimiter');
const { authenticate, logout } = require('../middleware/auth');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use('/login', authLimiter);

// TEMPORARY: Bypass rate limiting for local development
router.use('/register', (req, res, next) => {
  const environment = process.env.NODE_ENV || 'local';
  if (environment === 'local') {
    console.log('🚫 BYPASSING: Rate limit temporarily disabled for development registration');
    return next();
  }
  return authLimiter(req, res, next);
});
// Skip CSRF for API endpoints in local development for testing
const skipCSRF = (req, res, next) => {
  const environment = process.env.NODE_ENV || 'local';
  if (environment === 'local' && req.path.startsWith('/')) {
    return next();
  }
  return csrfProtection(req, res, next);
};
router.use(skipCSRF);

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'offscreen_buddy-dev-secret-key',
    { expiresIn: '7d' }
  );
};

// Helper function to calculate onboarding progress
const calculateOnboardingProgress = (user) => {
  let progress = 0;
  if (user.phone_verified) progress += 33;
  if (user.country_code) progress += 33;
  if (user.password_hash || true) progress += 34; // Password handled by Supabase
  return Math.min(progress, 100);
};

// Helper function to determine next onboarding step
const getNextOnboardingStep = (user) => {
  if (!user.phone_verified) return 'verifyPhone';
  if (!user.country_code) return 'selectCountry';
  return null; // Onboarding complete
};

// Helper function to handle development bypass for email failures
const handleDevelopmentBypass = async (req, res, email, name, phone, countryCode, countryInfo, deviceId) => {
  try {
    console.log('🔧 Development bypass: Creating user without Supabase email verification');

    // Generate a development user ID
    const tempUserId = crypto.randomUUID();

    // Create user profile directly in database (bypass Supabase auth email)
    const userProfile = {
      id: tempUserId,
      email: email,
      name: name,
      phone: phone,
      country_code: countryCode,
      country_name: countryInfo?.country_name,
      phone_verified: false,
      onboarding_completed: false,
      device_id: deviceId || null,
      platform: req.get('User-Agent') || 'unknown',
      app_version: '1.0.0',
      created_at: new Date().toISOString()
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(userProfile)
      .select()
      .single();

    if (userError) {
      console.error('Development bypass user creation error:', userError);
      throw new Error(`Failed to create user profile: ${userError.message}`);
    }

    // Create default subscription
    const { data: freePlans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', 'free')
      .eq('is_active', true)
      .limit(1);

    if (freePlans && freePlans.length > 0) {
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: tempUserId,
          plan_id: freePlans[0].id,
          status: 'active',
          starts_at: new Date().toISOString(),
          payment_provider: 'none'
        });

      if (subError) {
        console.error('Subscription creation error:', subError);
      }
    }

    // Create default settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({ user_id: tempUserId });

    if (settingsError) {
      console.error('Settings creation error:', settingsError);
    }

    // Create default analytics
    const { error: analyticsError } = await supabase
      .from('user_analytics')
      .insert({ user_id: tempUserId });

    if (analyticsError) {
      console.error('Analytics creation error:', analyticsError);
    }

    // Generate a simple development token
    const token = `dev_bypass_${tempUserId}_${Date.now()}`;

    // Calculate initial onboarding status
    const initialOnboardingProgress = countryInfo ? 66 : 33;
    const nextOnboardingStep = !countryInfo ? 'selectCountry' : 'verifyPhone';

    // Log the development bypass
    logSecurityEvent(req, res, 'registration_development_bypass', {
      userId: tempUserId,
      email: email,
      name: name,
      reason: 'Email configuration bypass for development'
    });

    res.status(201).json({
      message: 'User registered successfully (Development Mode - Email Bypass)',
      user: {
        id: tempUserId,
        email: email,
        name: name,
        phone: phone,
        countryCode: countryCode,
        countryName: countryInfo?.country_name,
        phoneVerified: false,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        deviceId: deviceId
      },
      token,
      subscription: {
        tier: 'free',
        status: 'active'
      },
      onboarding: {
        steps: {
          phoneVerified: false,
          countrySelected: !!countryInfo,
          passwordSet: true
        },
        nextStep: nextOnboardingStep,
        progress: initialOnboardingProgress,
        totalSteps: 3
      },
      development: true,
      emailBypass: true,
      note: 'Development mode bypass - email verification skipped due to configuration issues'
    });

  } catch (error) {
    console.error('Development bypass error:', error);
    res.status(500).json({
      error: 'Development bypass failed',
      message: 'Unable to create user in development mode'
    });
  }
};

// Enhanced Registration Security Event Logger
const logSecurityEvent = (req, res, eventType, details = {}) => {
  const { logSecurityEvent: securityLogger } = require('../middleware/security');
  const clientIP = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'unknown';

  const logData = {
    timestamp: new Date().toISOString(),
    eventType,
    clientIP,
    userAgent: req.headers['user-agent'],
    method: req.method,
    path: req.path,
    ...details
  };

  if (securityLogger) {
    securityLogger(req, res, eventType, details);
  }

  // Also log to dedicated security log
  console.error('SECURITY EVENT:', JSON.stringify(logData));
};

// Comprehensive input validation and sanitization
const validateRegistrationData = (req, res, next) => {
  const { email, password, name, phone, countryCode } = req.body;
  const errors = [];

  // Full name validation (2-100 chars, letters, spaces, hyphens, apostrophes)
  if (!name || typeof name !== 'string') {
    errors.push('Full name is required');
  } else {
    const namePattern = /^[a-zA-ZÀ-ž\s\-']{2,100}$/;
    if (!namePattern.test(name.trim())) {
      errors.push('Full name must contain only letters, spaces, hyphens, and apostrophes (2-100 characters)');
    }
  }

  // Email validation
  if (!email || typeof email !== 'string') {
    errors.push('Email is required');
  } else {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
      errors.push('Please provide a valid email address');
    }
    if (email.length > 255) {
      errors.push('Email address is too long');
    }
  }

  // Password validation (min 8 chars, complexity requirements)
  if (!password || typeof password !== 'string') {
    errors.push('Password is required');
  } else {
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (password.length > 128) {
      errors.push('Password is too long');
    }
    // Check for complexity: at least 1 uppercase, 1 lowercase, 1 digit
    const complexityPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!complexityPattern.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }
  }

  // Country validation
  if (countryCode) {
    if (typeof countryCode !== 'string' || countryCode.length !== 2 || !/^[A-Z]{2}$/.test(countryCode)) {
      errors.push('Country code must be a valid 2-letter ISO code');
    }
  }

  // Phone validation with international format
  if (phone) {
    if (typeof phone !== 'string') {
      errors.push('Phone number must be a string');
    } else {
      // Clean phone number for validation
      const cleanPhone = phone.replace(/[^\d+]/g, '');
      const phonePattern = /^\+?[\d\s\-()]{10,20}$/;

      if (!phonePattern.test(phone)) {
        errors.push('Please provide a valid phone number in international format');
      }

      // If country code is provided, validate phone matches country
      if (countryCode) {
        // This will be validated against the database in the main handler
      }
    }
  }

  if (errors.length > 0) {
    logSecurityEvent(req, res, 'registration_validation_failed', {
      errors,
      email: email ? 'present' : 'missing',
      hasName: !!name,
      hasPhone: !!phone,
      hasCountry: !!countryCode
    });

    return res.status(400).json({
      error: 'Validation failed',
      message: 'Please check your input data',
      details: errors
    });
  }

  next();
};

// Register new user with enhanced security and validation
router.post('/register',
  // Input sanitization
  inputSanitization,

  // Basic express-validator rules
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8, max: 128 }),
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('phone').optional().trim(),
    body('countryCode').optional().isLength({ min: 2, max: 2 }).isAlpha()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logSecurityEvent(req, res, 'registration_validation_failed', {
          errors: errors.array(),
          email: req.body.email
        });

        return res.status(400).json({
          error: 'Validation failed',
          message: 'Please check your input data',
          details: errors.array()
        });
      }

      const { email, password, deviceId, countryCode, phone, name } = req.body;

      // Sanitize inputs
      const sanitizedName = name.trim();
      const sanitizedEmail = email.trim().toLowerCase();
      const sanitizedPhone = phone ? phone.replace(/[^\d+]/g, '') : null;
      const sanitizedCountryCode = countryCode ? countryCode.toUpperCase() : null;

      // Enhanced validation
      const validationErrors = [];

      // Full name validation (2-100 chars, letters, spaces, hyphens, apostrophes)
      const namePattern = /^[a-zA-ZÀ-ž\s\-']{2,100}$/;
      if (!namePattern.test(sanitizedName)) {
        validationErrors.push('Full name must contain only letters, spaces, hyphens, and apostrophes (2-100 characters)');
      }

      // Password complexity check
      const complexityPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
      if (!complexityPattern.test(password)) {
        validationErrors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
      }

      if (validationErrors.length > 0) {
        logSecurityEvent(req, res, 'registration_enhanced_validation_failed', {
          errors: validationErrors,
          email: sanitizedEmail
        });

        return res.status(400).json({
          error: 'Validation failed',
          message: 'Please check your input data',
          details: validationErrors
        });
      }

      // Check for existing email/phone duplicates before proceeding
      const duplicateChecks = [];

      // Check existing email
      const { data: existingEmailUser } = await supabase
        .from('users')
        .select('id, email, created_at')
        .eq('email', sanitizedEmail)
        .single();

      if (existingEmailUser) {
        logSecurityEvent(req, res, 'registration_duplicate_email_attempt', {
          email: sanitizedEmail,
          existingUserId: existingEmailUser.id,
          registrationTime: existingEmailUser.created_at
        });

        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email address already exists'
        });
      }

      // Check existing phone if provided
      if (sanitizedPhone) {
        const { data: existingPhoneUser } = await supabase
          .from('users')
          .select('id, phone, created_at')
          .eq('phone', sanitizedPhone)
          .single();

        if (existingPhoneUser) {
          logSecurityEvent(req, res, 'registration_duplicate_phone_attempt', {
            phone: sanitizedPhone,
            existingUserId: existingPhoneUser.id,
            registrationTime: existingPhoneUser.created_at
          });

          return res.status(409).json({
            error: 'Phone already registered',
            message: 'This phone number is already associated with an account'
          });
        }
      }

      // Validate country code against database if provided
      let countryInfo = null;
      if (sanitizedCountryCode) {
        const { data: countryData } = await supabase
          .from('countries')
          .select('country_code, country_name, phone_code')
          .eq('country_code', sanitizedCountryCode)
          .eq('is_active', true)
          .single();

        if (!countryData) {
          logSecurityEvent(req, res, 'registration_invalid_country_code', {
            countryCode: sanitizedCountryCode,
            providedPhone: sanitizedPhone
          });

          return res.status(400).json({
            error: 'Invalid country',
            message: 'Please select a valid country from the supported list'
          });
        }

        // Validate phone format against country if both are provided
        if (sanitizedPhone && countryData.phone_code) {
          const expectedPrefix = countryData.phone_code;
          if (!sanitizedPhone.startsWith(expectedPrefix) && !sanitizedPhone.startsWith('+')) {
            logSecurityEvent(req, res, 'registration_phone_country_mismatch', {
              phone: sanitizedPhone,
              countryCode: sanitizedCountryCode,
              expectedPrefix
            });

            return res.status(400).json({
              error: 'Invalid phone format',
              message: `Phone number should start with ${expectedPrefix} for ${countryData.country_name}`
            });
          }
        }

        countryInfo = countryData;
      }

      // Skip email verification for local development to bypass Supabase rate limits
      const isLocalDevelopment = (process.env.NODE_ENV || 'local') === 'local';

      const { data: authUser, error: authError } = await supabase.auth.signUp({
        email: sanitizedEmail,
        password: password,
        options: {
          emailRedirectTo: undefined,
          emailConfirm: !isLocalDevelopment, // Skip confirmation in local development
          data: {
            name: sanitizedName,
            phone: sanitizedPhone,
            country_code: sanitizedCountryCode,
            country_name: countryInfo?.country_name,
            platform: req.get('User-Agent') || 'unknown',
            app_version: '1.0.0'
          }
        }
      });

      if (isLocalDevelopment && authUser && authUser.user && !authUser.user.email_confirmed_at) {
        // For local development, manually confirm the email to bypass rate limits
        console.log('🚀 LOCAL DEV: Manually confirming email for development');

        const { error: confirmError } = await supabase.auth.admin.updateUserById(
          authUser.user.id,
          {
            email_confirm: true,
            user_metadata: {
              ...authUser.user.user_metadata,
              email_manually_confirmed: true,
              local_development: true
            }
          }
        );

        if (!confirmError) {
          // Refresh the user data
          const { data: updatedUser } = await supabase.auth.admin.getUserById(authUser.user.id);
          authUser.user = { ...authUser.user, ...updatedUser.user };
        } else {
          console.log('⚠️ Local development email confirmation failed:', confirmError.message);
        }
      }

      if (authError) {
        console.error('Supabase auth user creation error:', authError);

        // Handle specific Supabase auth errors
        let errorMessage = 'Registration failed. Please try again.';
        let statusCode = 500;

        if (authError.message) {
          const msg = authError.message.toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists')) {
            errorMessage = 'An account with this email already exists';
            statusCode = 409;
            logSecurityEvent(req, res, 'registration_supabase_duplicate_email', {
              email: sanitizedEmail,
              supabaseError: authError.message
            });
          } else if (msg.includes('weak password')) {
            errorMessage = 'Password is too weak. Please choose a stronger password.';
            statusCode = 400;
          } else if (msg.includes('invalid email')) {
            errorMessage = 'Invalid email address format';
            statusCode = 400;
          } else if (msg.includes('rate limit')) {
            // Special handling for local development to bypass email rate limits
            if (isLocalDevelopment) {
              console.log('🚀 LOCAL DEV: Bypassing Supabase email rate limit for development');
              return await handleDevelopmentBypass(req, res, sanitizedEmail, sanitizedName, sanitizedPhone, sanitizedCountryCode, countryInfo, deviceId);
            } else {
              errorMessage = 'Too many registration attempts. Please wait before trying again.';
              statusCode = 429;
              logSecurityEvent(req, res, 'registration_rate_limited_supabase', {
                email: sanitizedEmail,
                supabaseError: authError.message
              });

              return res.status(statusCode).json({
                error: 'Rate limit exceeded',
                message: errorMessage,
                details: {
                  retryAfter: '1 hour',
                  suggestion: 'Try registering again in about 1 hour, or contact support if you need immediate assistance.',
                  rateLimitReason: 'Supabase email rate limit reached for security purposes'
                }
              });
            }
          } else if (msg.includes('email') && (msg.includes('confirmation') || msg.includes('sending'))) {
            // Handle email configuration issues
            if (isLocalDevelopment) {
              console.log('🚀 LOCAL DEV: Email confirmation failed, using development bypass');
              return await handleDevelopmentBypass(req, res, sanitizedEmail, sanitizedName, sanitizedPhone, sanitizedCountryCode, countryInfo, deviceId);
            } else {
              errorMessage = 'Email service temporarily unavailable. Please try again in a few moments.';
              statusCode = 503;
              logSecurityEvent(req, res, 'registration_email_service_unavailable', {
                email: sanitizedEmail,
                supabaseError: authError.message,
                suggestion: 'Configure custom SMTP in Supabase Dashboard'
              });

              return res.status(statusCode).json({
                error: 'Email service unavailable',
                message: errorMessage,
                details: {
                  suggestion: 'Email configuration issue detected. Please contact support or try again later.',
                  troubleshooting: [
                    'Check SMTP configuration in Supabase Dashboard',
                    'Verify custom SMTP server settings',
                    'Ensure SMTP credentials are valid',
                    'Contact support if the issue persists'
                  ]
                }
              });
            }
          }
        }

        return res.status(statusCode).json({
          error: 'Registration failed',
          message: errorMessage
        });
      }

      if (!authUser.user) {
        logSecurityEvent(req, res, 'registration_no_user_returned', {
          email: sanitizedEmail
        });

        return res.status(500).json({
          error: 'Registration failed',
          message: 'Unable to create user account. Please try again.'
        });
      }

      const userId = authUser.user.id;

      // Create user profile in users table
      const userProfile = {
        id: userId,
        email: sanitizedEmail,
        name: sanitizedName,
        phone: sanitizedPhone,
        country_code: sanitizedCountryCode,
        country_name: countryInfo?.country_name,
        phone_verified: false,
        onboarding_completed: false,
        device_id: deviceId || null,
        platform: req.get('User-Agent') || 'unknown',
        app_version: '1.0.0',
        created_at: new Date().toISOString()
      };

      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert(userProfile)
        .select()
        .single();

      if (userError) {
        console.error('User profile creation error:', userError);

        logSecurityEvent(req, res, 'registration_profile_creation_failed', {
          userId,
          email: sanitizedEmail,
          error: userError.message
        });

        return res.status(500).json({
          error: 'Profile creation failed',
          message: 'Could not create user profile. Please try again.'
        });
      }

      // Log successful user registration
      logSecurityEvent(req, res, 'registration_successful', {
        userId,
        email: sanitizedEmail,
        name: sanitizedName,
        phone: sanitizedPhone,
        countryCode: sanitizedCountryCode,
        deviceId: deviceId,
        platform: req.get('User-Agent'),
        hasPhone: !!sanitizedPhone,
        hasCountry: !!sanitizedCountryCode
      });

      // Log onboarding event
      await supabase
        .from('user_onboarding_events')
        .insert({
          user_id: userId,
          event_type: 'user_registered',
          event_data: {
            countryCode: sanitizedCountryCode,
            countryName: countryInfo?.country_name,
            hasPhone: !!sanitizedPhone,
            registrationMethod: 'enhanced_api',
            phoneFormatted: sanitizedPhone,
            nameLength: sanitizedName.length,
            ip: req.headers['x-forwarded-for']?.split(',')[0] || 'unknown'
          }
        });

      // Get free plan for default subscription
      const { data: freePlans } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('tier', 'free')
        .eq('is_active', true)
        .limit(1);

      if (freePlans && freePlans.length > 0) {
        // Create default subscription
        const { error: subError } = await supabase
          .from('user_subscriptions')
          .insert({
            user_id: userId,
            plan_id: freePlans[0].id,
            status: 'active',
            starts_at: new Date().toISOString(),
            payment_provider: 'none'
          });

        if (subError) {
          console.error('Subscription creation error:', subError);
        }
      }

      // Create default settings
      const { error: settingsError } = await supabase
        .from('user_settings')
        .insert({
          user_id: userId
        });

      if (settingsError) {
        console.error('Settings creation error:', settingsError);
      }

      // Create default analytics
      const { error: analyticsError } = await supabase
        .from('user_analytics')
        .insert({
          user_id: userId
        });

      if (analyticsError) {
        console.error('Analytics creation error:', analyticsError);
      }

      // Generate token using Supabase session token
      const token = authUser.session.access_token;

      // Calculate initial onboarding status
      const initialOnboardingProgress = countryInfo ? 66 : 33;
      const nextOnboardingStep = !countryInfo ? 'selectCountry' : 'verifyPhone';

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: userId,
          email: sanitizedEmail,
          name: sanitizedName,
          phone: sanitizedPhone,
          countryCode: sanitizedCountryCode,
          countryName: countryInfo?.country_name,
          phoneVerified: false,
          onboardingCompleted: false,
          createdAt: new Date().toISOString(),
          deviceId: deviceId
        },
        token,
        subscription: {
          tier: 'free',
          status: 'active'
        },
        onboarding: {
          steps: {
            phoneVerified: false,
            countrySelected: !!countryInfo,
            passwordSet: true
          },
          nextStep: nextOnboardingStep,
          progress: initialOnboardingProgress,
          totalSteps: 3
        },
        security: {
          sessionExpires: authUser.session.expires_at,
          tokenType: authUser.session.token_type
        }
      });

    } catch (error) {
      console.error('Registration error:', error);

      logSecurityEvent(req, res, 'registration_unexpected_error', {
        error: error.message,
        stack: error.stack,
        email: req.body.email
      });

      res.status(500).json({
        error: 'Registration failed',
        message: 'An unexpected error occurred during registration. Please try again.'
      });
    }
  }
);

// TEMPORARY: Development-only registration endpoint that bypasses Supabase email limits
router.post('/register-dev', async (req, res) => {
  if ((process.env.NODE_ENV || 'local') !== 'local') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'This endpoint is only available in local development'
    });
  }

  try {
    console.log('🚀 LOCAL DEV: Using development registration endpoint');

    const { email, password, name, phone, countryCode, deviceId } = req.body;

    // Sanitize inputs
    const sanitizedName = name?.trim();
    const sanitizedEmail = email?.trim().toLowerCase();
    const sanitizedPhone = phone ? phone.replace(/[^\d+]/g, '') : null;
    const sanitizedCountryCode = countryCode ? countryCode.toUpperCase() : null;

    // Basic validation
    if (!sanitizedEmail || !password || !sanitizedName) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Email, password, and name are required'
      });
    }

    // Generate a development user ID
    const userId = crypto.randomUUID();

    // Create user profile directly in database (bypass Supabase auth)
    const userProfile = {
      id: userId,
      email: sanitizedEmail,
      name: sanitizedName,
      phone: sanitizedPhone,
      country_code: sanitizedCountryCode,
      phone_verified: false,
      onboarding_completed: false,
      device_id: deviceId || null,
      platform: req.get('User-Agent') || 'unknown',
      app_version: '1.0.0',
      created_at: new Date().toISOString()
    };

    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert(userProfile)
      .select()
      .single();

    if (userError) {
      console.error('User profile creation error:', userError);

      if (userError.message.includes('duplicate key')) {
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email already exists'
        });
      }

      return res.status(500).json({
        error: 'Profile creation failed',
        message: 'Could not create user profile. Please try again.'
      });
    }

    // Create default subscription
    const { data: freePlans } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('tier', 'free')
      .eq('is_active', true)
      .limit(1);

    if (freePlans && freePlans.length > 0) {
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: userId,
          plan_id: freePlans[0].id,
          status: 'active',
          starts_at: new Date().toISOString(),
          payment_provider: 'none'
        });

      if (subError) {
        console.error('Subscription creation error:', subError);
      }
    }

    // Create default settings
    const { error: settingsError } = await supabase
      .from('user_settings')
      .insert({ user_id: userId });

    if (settingsError) {
      console.error('Settings creation error:', settingsError);
    }

    // Create default analytics
    const { error: analyticsError } = await supabase
      .from('user_analytics')
      .insert({ user_id: userId });

    if (analyticsError) {
      console.error('Analytics creation error:', analyticsError);
    }

    // Generate a simple development token
    const token = `dev_token_${userId}_${Date.now()}`;

    res.status(201).json({
      message: 'User registered successfully (Development Mode)',
      user: {
        id: userId,
        email: sanitizedEmail,
        name: sanitizedName,
        phone: sanitizedPhone,
        countryCode: sanitizedCountryCode,
        phoneVerified: false,
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        deviceId: deviceId
      },
      token,
      subscription: {
        tier: 'free',
        status: 'active'
      },
      onboarding: {
        steps: {
          phoneVerified: false,
          countrySelected: !!sanitizedCountryCode,
          passwordSet: true
        },
        nextStep: !sanitizedCountryCode ? 'selectCountry' : 'verifyPhone',
        progress: sanitizedCountryCode ? 66 : 33,
        totalSteps: 3
      },
      development: true,
      note: 'This is a development-only endpoint that bypasses email verification'
    });

  } catch (error) {
    console.error('Development registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: 'An unexpected error occurred during development registration.'
    });
  }
});

// Complete onboarding step
router.post('/onboarding/complete-step', authenticate, [
  body('step').isIn(['country', 'phone', 'password']).withMessage('Invalid onboarding step'),
  body('data').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { step, data } = req.body;
    const userId = req.user.id;

    let updateFields = {};
    let eventType = '';

    switch (step) {
      case 'country':
        if (!data.countryCode) {
          return res.status(400).json({ error: 'Country code required' });
        }

        const { data: countryData, error: countryError } = await supabase
          .from('countries')
          .select('country_code, country_name')
          .eq('country_code', data.countryCode.toUpperCase())
          .single();

        if (countryError || !countryData) {
          return res.status(400).json({ error: 'Invalid country code' });
        }

        updateFields = {
          country_code: countryData.country_code,
          country_name: countryData.country_name
        };
        eventType = 'country_selected';
        break;

      case 'phone':
        if (!data.phone) {
          return res.status(400).json({ error: 'Phone number required' });
        }

        // Format phone number
        const formattedPhone = data.phone.replace(/[^\d+]/g, '');
        updateFields = {
          phone: formattedPhone,
          phone_verified: true
        };
        eventType = 'phone_verified';
        break;

      case 'password':
        if (!data.password) {
          return res.status(400).json({ error: 'Password required' });
        }

        if (data.password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        // Hash password (if using local auth instead of Supabase)
        const passwordHash = await bcrypt.hash(data.password, 12);
        updateFields = {
          password_hash: passwordHash
        };
        eventType = 'password_set';
        break;
    }

    // Update user profile
    updateFields.updated_at = new Date().toISOString();

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateFields)
      .eq('id', userId)
      .select('*')
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return res.status(500).json({
        error: 'Update failed',
        message: 'Could not update user profile'
      });
    }

    // Log onboarding event
    await supabase
      .from('user_onboarding_events')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: data || {}
      });

    // Check if onboarding is now complete
    const onboardingComplete = updatedUser.phone_verified &&
      updatedUser.country_code &&
      (updatedUser.password_hash || true); // Password handled by Supabase

    if (onboardingComplete && !updatedUser.onboarding_completed) {
      await supabase
        .from('users')
        .update({ onboarding_completed: true })
        .eq('id', userId);

      // Log completion event
      await supabase
        .from('user_onboarding_events')
        .insert({
          user_id: userId,
          event_type: 'onboarding_completed',
          event_data: { completedAt: new Date().toISOString() }
        });
    }

    // Get updated onboarding status
    const onboardingStatus = {
      completed: onboardingComplete,
      steps: {
        phoneVerified: updatedUser.phone_verified,
        countrySelected: !!updatedUser.country_code,
        passwordSet: true // Always true since using Supabase Auth
      },
      progress: calculateOnboardingProgress(updatedUser),
      nextStep: getNextOnboardingStep(updatedUser)
    };

    res.json({
      message: 'Onboarding step completed successfully',
      step: step,
      onboarding: onboardingStatus
    });

  } catch (error) {
    console.error('Onboarding completion error:', error);
    res.status(500).json({
      error: 'Onboarding update failed',
      message: 'An unexpected error occurred'
    });
  }
});

// Get user's onboarding status
router.get('/onboarding/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('country_code, country_name, phone, phone_verified, onboarding_completed')
      .eq('id', userId)
      .single();

    if (profileError) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const onboardingStatus = {
      completed: userProfile.onboarding_completed,
      steps: {
        phoneVerified: userProfile.phone_verified,
        countrySelected: !!userProfile.country_code,
        passwordSet: true // Always true since using Supabase Auth
      },
      progress: calculateOnboardingProgress(userProfile),
      nextStep: getNextOnboardingStep(userProfile),
      country: userProfile.country_code ? {
        code: userProfile.country_code,
        name: userProfile.country_name
      } : null,
      phone: userProfile.phone
    };

    res.json({
      onboarding: onboardingStatus
    });

  } catch (error) {
    console.error('Get onboarding status error:', error);
    res.status(500).json({
      error: 'Failed to get onboarding status'
    });
  }
});

// Get available countries for onboarding
router.get('/countries', async (req, res) => {
  try {
    const { data: countries, error } = await supabase
      .from('countries')
      .select('country_code, country_name, phone_code, currency_code, currency_symbol')
      .eq('is_active', true)
      .order('country_name');

    // If countries table doesn't exist, return mock data for testing
    if (error && error.code === 'PGRST205') {
      console.log('Countries table not found, returning mock data for testing');
      const mockCountries = [
        { country_code: 'US', country_name: 'United States', phone_code: '+1', currency_code: 'USD', currency_symbol: '$' },
        { country_code: 'GB', country_name: 'United Kingdom', phone_code: '+44', currency_code: 'GBP', currency_symbol: '£' },
        { country_code: 'IN', country_name: 'India', phone_code: '+91', currency_code: 'INR', currency_symbol: '₹' },
        { country_code: 'DE', country_name: 'Germany', phone_code: '+49', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'FR', country_name: 'France', phone_code: '+33', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'CA', country_name: 'Canada', phone_code: '+1', currency_code: 'CAD', currency_symbol: 'C$' },
        { country_code: 'AU', country_name: 'Australia', phone_code: '+61', currency_code: 'AUD', currency_symbol: 'A$' },
        { country_code: 'JP', country_name: 'Japan', phone_code: '+81', currency_code: 'JPY', currency_symbol: '¥' },
        { country_code: 'SG', country_name: 'Singapore', phone_code: '+65', currency_code: 'SGD', currency_symbol: 'S$' },
        { country_code: 'AE', country_name: 'United Arab Emirates', phone_code: '+971', currency_code: 'AED', currency_symbol: 'د.إ' }
      ];

      return res.json({
        countries: mockCountries,
        mockData: true,
        note: 'Using mock data - countries table needs to be created in production'
      });
    }

    if (error) {
      console.error('Countries fetch error:', error);
      return res.status(500).json({
        error: 'Failed to fetch countries'
      });
    }

    res.json({
      countries: countries || []
    });

  } catch (error) {
    console.error('Get countries error:', error);
    res.status(500).json({
      error: 'Failed to get countries'
    });
  }
});

// Enhanced Login Endpoint with Comprehensive Security
router.post('/login',
  // Rate limiting for login attempts
  authLimiter,

  // Input sanitization
  inputSanitization,

  // Basic express-validator rules
  [
    body('identifier').trim().notEmpty().withMessage('Email or username is required'),
    body('password').isString().notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const startTime = Date.now();

    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logSecurityEvent(req, res, 'login_validation_failed', {
          errors: errors.array(),
          identifier: req.body.identifier ? 'present' : 'missing'
        });

        return res.status(400).json({
          error: 'Validation failed',
          message: 'Please provide valid email and password',
          details: errors.array()
        });
      }

      const { identifier, password } = req.body;

      // Sanitize and normalize identifier (email)
      const sanitizedIdentifier = identifier.trim().toLowerCase();

      // Validate email format
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailPattern.test(sanitizedIdentifier)) {
        logSecurityEvent(req, res, 'login_invalid_email_format', {
          identifier: sanitizedIdentifier
        });

        return res.status(400).json({
          error: 'Invalid email format',
          message: 'Please provide a valid email address'
        });
      }

      // Check if user exists in database first
      const { data: existingUser, error: userCheckError } = await supabase
        .from('users')
        .select('id, email, name, phone, country_code, country_name, phone_verified, onboarding_completed, is_active, created_at')
        .eq('email', sanitizedIdentifier)
        .single();

      // If no user found, return specific error
      if (userCheckError || !existingUser) {
        logSecurityEvent(req, res, 'login_user_not_found', {
          identifier: sanitizedIdentifier,
          error: userCheckError?.message
        });

        return res.status(404).json({
          error: 'User not found',
          message: 'No account exists with this email. Please register first.',
          action: 'register'
        });
      }

      // Check if account is active
      if (existingUser.is_active === false) {
        logSecurityEvent(req, res, 'login_inactive_account', {
          userId: existingUser.id,
          email: sanitizedIdentifier
        });

        return res.status(403).json({
          error: 'Account disabled',
          message: 'Your account has been disabled. Please contact support.'
        });
      }

      // Attempt authentication with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: sanitizedIdentifier,
        password: password
      });

      // Handle authentication errors
      if (authError || !authData.user) {
        // Log failed login attempt
        logSecurityEvent(req, res, 'login_failed_authentication', {
          userId: existingUser.id,
          email: sanitizedIdentifier,
          errorCode: authError?.code,
          errorMessage: authError?.message,
          attemptDuration: Date.now() - startTime
        });

        // Determine specific error message
        let errorMessage = 'Invalid password. Please try again.';
        let errorCode = 'invalid_password';

        if (authError) {
          const errorMsg = authError.message.toLowerCase();

          if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid password')) {
            errorMessage = 'Invalid password. Please try again.';
            errorCode = 'invalid_password';
          } else if (errorMsg.includes('email not confirmed')) {
            errorMessage = 'Email not verified. Please check your inbox.';
            errorCode = 'email_not_verified';
          } else if (errorMsg.includes('too many requests')) {
            errorMessage = 'Too many login attempts. Please try again later.';
            errorCode = 'rate_limited';

            return res.status(429).json({
              error: 'Too many attempts',
              message: errorMessage,
              retryAfter: 300 // 5 minutes
            });
          } else if (errorMsg.includes('user not found')) {
            errorMessage = 'No account exists with this email. Please register first.';
            errorCode = 'user_not_found';

            return res.status(404).json({
              error: 'User not found',
              message: errorMessage,
              action: 'register'
            });
          }
        }

        return res.status(401).json({
          error: errorCode,
          message: errorMessage
        });
      }

      const userId = authData.user.id;

      // Get comprehensive user profile with subscriptions
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select(`
          *,
          user_subscriptions (
            *,
            subscription_plans (
              tier,
              features,
              price_monthly,
              price_yearly
            )
          )
        `)
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('User profile fetch error:', profileError);

        logSecurityEvent(req, res, 'login_profile_fetch_failed', {
          userId,
          email: sanitizedIdentifier,
          error: profileError.message
        });

        // Return basic user info if profile lookup fails
        return res.json({
          message: 'Login successful',
          user: {
            id: userId,
            email: sanitizedIdentifier,
            name: existingUser.name
          },
          token: authData.session.access_token,
          subscription: {
            tier: 'free',
            status: 'active',
            features: []
          },
          onboarding: {
            completed: existingUser.onboarding_completed || false,
            steps: {
              phoneVerified: existingUser.phone_verified || false,
              countrySelected: !!existingUser.country_code,
              passwordSet: true
            },
            progress: calculateOnboardingProgress(existingUser),
            nextStep: getNextOnboardingStep(existingUser)
          }
        });
      }

      // Update last active timestamp
      await supabase
        .from('users')
        .update({
          last_active: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // Log successful login event
      await supabase
        .from('user_onboarding_events')
        .insert({
          user_id: userId,
          event_type: 'user_login',
          event_data: {
            loginMethod: 'password',
            ip: req.headers['x-forwarded-for']?.split(',')[0] || 'unknown',
            userAgent: req.headers['user-agent'],
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime
          }
        });

      // Extract subscription information
      const activeSubscription = userProfile.user_subscriptions?.find(sub => sub.status === 'active');
      const subscription = activeSubscription ? {
        tier: activeSubscription.subscription_plans?.tier || 'free',
        status: activeSubscription.status,
        features: activeSubscription.subscription_plans?.features || [],
        priceMonthly: activeSubscription.subscription_plans?.price_monthly,
        priceYearly: activeSubscription.subscription_plans?.price_yearly,
        expiresAt: activeSubscription.expires_at,
        autoRenew: activeSubscription.auto_renew
      } : {
        tier: 'free',
        status: 'active',
        features: []
      };

      // Calculate onboarding status
      const onboardingStatus = {
        completed: userProfile.onboarding_completed,
        steps: {
          phoneVerified: userProfile.phone_verified,
          countrySelected: !!userProfile.country_code,
          passwordSet: true // Always true for Supabase Auth users
        },
        progress: calculateOnboardingProgress(userProfile),
        nextStep: getNextOnboardingStep(userProfile)
      };

      // Log successful authentication
      logSecurityEvent(req, res, 'login_successful', {
        userId,
        email: sanitizedIdentifier,
        name: userProfile.name,
        subscriptionTier: subscription.tier,
        onboardingCompleted: userProfile.onboarding_completed,
        duration: Date.now() - startTime
      });

      // Return comprehensive login response
      res.json({
        message: 'Login successful',
        user: {
          id: userId,
          email: sanitizedIdentifier,
          name: userProfile.name,
          phone: userProfile.phone,
          countryCode: userProfile.country_code,
          countryName: userProfile.country_name,
          phoneVerified: userProfile.phone_verified,
          onboardingCompleted: userProfile.onboarding_completed,
          lastActive: new Date().toISOString(),
          createdAt: userProfile.created_at
        },
        token: authData.session.access_token,
        subscription,
        onboarding: onboardingStatus,
        security: {
          sessionExpires: authData.session.expires_at,
          tokenType: authData.session.token_type,
          refreshToken: authData.session.refresh_token
        }
      });

    } catch (error) {
      console.error('Login error:', error);

      logSecurityEvent(req, res, 'login_unexpected_error', {
        error: error.message,
        stack: error.stack,
        identifier: req.body.identifier,
        duration: Date.now() - startTime
      });

      res.status(500).json({
        error: 'Login failed',
        message: 'An unexpected error occurred during login. Please try again.'
      });
    }
  }
);

// Get current user info
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);

    // Verify token with Supabase
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Token is invalid or expired'
      });
    }

    const userId = userData.user.id;

    // Get user profile with enhanced onboarding info
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select(`
        *,
        user_subscriptions (
          *,
          subscription_plans (
            tier,
            features,
            price_monthly,
            price_yearly
          )
        )
      `)
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('User profile error:', profileError);
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile does not exist'
      });
    }

    // Extract subscription info
    const activeSubscription = userProfile.user_subscriptions?.find(sub => sub.status === 'active');
    const subscription = activeSubscription ? {
      tier: activeSubscription.subscription_plans?.tier || 'free',
      status: activeSubscription.status,
      features: activeSubscription.subscription_plans?.features || [],
      priceMonthly: activeSubscription.subscription_plans?.price_monthly,
      priceYearly: activeSubscription.subscription_plans?.price_yearly,
      expiresAt: activeSubscription.expires_at,
      autoRenew: activeSubscription.auto_renew
    } : {
      tier: 'free',
      status: 'active',
      features: []
    };

    res.json({
      user: {
        id: userId,
        email: userProfile.email,
        name: userProfile.name,
        phone: userProfile.phone,
        countryCode: userProfile.country_code,
        countryName: userProfile.country_name,
        phoneVerified: userProfile.phone_verified,
        onboardingCompleted: userProfile.onboarding_completed,
        createdAt: userProfile.created_at,
        lastActive: userProfile.last_active
      },
      subscription,
      onboarding: {
        completed: userProfile.onboarding_completed,
        steps: {
          phoneVerified: userProfile.phone_verified,
          countrySelected: !!userProfile.country_code,
          passwordSet: true
        },
        progress: calculateOnboardingProgress(userProfile),
        nextStep: getNextOnboardingStep(userProfile)
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      message: 'An unexpected error occurred'
    });
  }
});

// Logout endpoint with security
router.post('/logout', authenticate, logout, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;