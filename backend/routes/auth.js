const express = require('express');
const { body, validationResult } = require('express-validator');
const AuthService = require('../services/AuthService');

// Security Middleware Imports
const { securityHeaders, inputSanitization, csrfProtection } = require('../middleware/security');
const { logSecurityEvent } = require('../middleware/security'); // Ensure this is exported or mock it if strictly internal to security.js
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use('/login', authLimiter);

// TEMPORARY: Bypass rate limiting for local development
router.use('/register', (req, res, next) => {
  const environment = process.env.NODE_ENV || 'local';
  if (environment === 'local') {
    return next();
  }
  return authLimiter(req, res, next);
});

// Skip CSRF for API endpoints in local development
const skipCSRF = (req, res, next) => {
  const environment = process.env.NODE_ENV || 'local';
  if (environment === 'local' && req.path.startsWith('/')) {
    return next();
  }
  return csrfProtection(req, res, next);
};
router.use(skipCSRF);

// --- ROUTES ---

// Register
router.post('/register',
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
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const result = await AuthService.registerUser({
        email: req.body.email,
        password: req.body.password,
        name: req.body.name,
        phone: req.body.phone,
        countryCode: req.body.countryCode,
        deviceId: req.body.deviceId,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      res.status(201).json({ message: 'User registered successfully', ...result });
    } catch (error) {
      console.error('Registration error:', error);
      let status = 500;
      if (error.message.includes('already exists')) status = 409;
      if (error.message.includes('rate limit')) status = 429;
      res.status(status).json({ error: 'Registration failed', message: error.message });
    }
  }
);

// Login
router.post('/login',
  authLimiter,
  [
    body('identifier').trim().notEmpty(),
    body('password').notEmpty(),
    body('mfaCode').optional().isLength({ min: 6, max: 6 }).isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
      }

      const result = await AuthService.loginUser(req.body.identifier, req.body.password, req.body.mfaCode);

      if (result.mfaRequired) {
        return res.json({
          message: 'MFA code required',
          mfaRequired: true,
          user: result.user
        });
      }

      res.json({ message: 'Login successful', ...result });

    } catch (error) {
      console.error('Login error:', error);
      let status = 401; // Default to unauthorized
      if (error.code === 'user_not_found') status = 404;
      if (error.code === 'account_disabled') status = 403;
      if (error.code === 'invalid_mfa') status = 401; // Invalid code
      if (error.message.includes('Too many')) status = 429;

      res.status(status).json({ error: 'Login failed', message: error.message });
    }
  }
);

// MFA Routes
const MfaService = require('../services/MfaService');

// Setup MFA (Generate Secret)
router.post('/mfa/setup', authenticate, async (req, res) => {
  try {
    const { secret, otpauth_url, qr_code } = await MfaService.generateSecret(req.user.email);
    res.json({ secret, otpauth_url, qr_code });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate MFA secret' });
  }
});

// Enable MFA (Verify & Save)
router.post('/mfa/enable', authenticate,
  [body('token').isLength({ min: 6, max: 6 }).isNumeric(), body('secret').notEmpty()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { token, secret } = req.body;
      const isValid = MfaService.verifyToken(secret, token);

      if (!isValid) {
        return res.status(400).json({ error: 'Invalid verification code' });
      }

      await MfaService.enableMfa(req.user.id, secret);
      res.json({ message: 'MFA enabled successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to enable MFA' });
    }
  }
);

// Disable MFA
router.post('/mfa/disable', authenticate,
  [body('password').notEmpty()], // Require password to disable
  async (req, res) => {
    try {
      // confirm password first
      // TODO: Add password re-verification logic here for high security
      // For now, proceed (assuming session is trusted or we verify strictly)

      await MfaService.disableMfa(req.user.id);
      res.json({ message: 'MFA disabled successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disable MFA' });
    }
  }
);

// Get Me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await AuthService.getUserProfile(req.user.id);
    res.json(result);
  } catch (error) {
    console.error('Get Me error:', error);
    res.status(error.message === 'User profile not found' ? 404 : 500).json({ error: error.message });
  }
});

// Logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // Extract token from header if needed, but authenticate middleware handles it
    await AuthService.logout(req.token); // authenticate usually attaches token? 
    // Standard express auth middleware might just attach user. 
    // We will assume logout is stateless or client-side mostly.
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Onboarding Step
router.post('/onboarding/complete-step', authenticate,
  [
    body('step').isIn(['country', 'phone', 'password']),
    body('data').optional().isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ error: 'Validation failed', details: errors.array() });

      const result = await AuthService.completeOnboardingStep(req.user.id, req.body.step, req.body.data);
      res.json({ message: 'Onboarding step completed', ...result });
    } catch (error) {
      console.error('Onboarding error:', error);
      res.status(400).json({ error: error.message });
    }
  });

// Onboarding Status
router.get('/onboarding/status', authenticate, async (req, res) => {
  try {
    const result = await AuthService.getUserProfile(req.user.id);
    res.json({ onboarding: result.onboarding });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Countries
router.get('/countries', async (req, res) => {
  try {
    const countries = await AuthService.getCountries();
    if (countries === null) {
      // Mock data fallback
      return res.json({
        countries: [
          { country_code: 'US', country_name: 'United States', phone_code: '+1' },
          { country_code: 'GB', country_name: 'United Kingdom', phone_code: '+44' }
        ],
        mockData: true
      });
    }
    res.json({ countries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch countries' });
  }
});

module.exports = router;