/**
 * Enhanced Authentication Middleware
 * Integrates with security configuration for environment-specific auth policies
 * Provides comprehensive authentication and session management
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { getSecurityConfig, isSecurityLocal, isSecurityProd } = require('../config/security');
const { getEnvironment } = require('../config/environment');
const { logSecurityEvent } = require('./security');
const { authLimiter } = require('./rateLimiter');

/**
 * Enhanced Authentication Middleware Manager
 * Handles authentication with security enhancements
 */
class AuthMiddleware {
  constructor() {
    this.config = getSecurityConfig();
    this.setupAuthPolicies();
  }

  /**
   * Setup authentication policies based on environment
   */
  setupAuthPolicies() {
    this.authConfig = this.config.authentication;
    this.sessionConfig = this.authConfig.session;
    this.jwtConfig = this.authConfig.jwt;
    this.passwordConfig = this.authConfig.password;
    this.tokenConfig = this.authConfig.tokens;

    // Initialize security tracking
    this.failedAttempts = new Map();
    this.lockedAccounts = new Map();
    this.activeSessions = new Map();
  }

  /**
   * Enhanced authentication middleware
   */
  authenticate(req, res, next) {
    return this.authMiddleware(req, res, next);
  }

  /**
   * Main authentication middleware implementation
   */
  async authMiddleware(req, res, next) {
    try {
      // Apply rate limiting for auth endpoints
      if (this.isAuthEndpoint(req.path)) {
        await this.applyAuthRateLimiting(req, res);
      }

      // Check for account lockout
      if (this.isAccountLocked(req)) {
        this.logSecurityEvent(req, res, 'account_locked', {
          identifier: this.getAccountIdentifier(req)
        });
        return res.status(423).json({
          error: 'Account temporarily locked',
          retryAfter: this.getLockoutDuration(req)
        });
      }

      // Extract and validate token
      const tokenValidation = await this.extractAndValidateToken(req, res);
      if (!tokenValidation.valid) {
        this.recordFailedAttempt(req);
        return res.status(401).json({
          error: tokenValidation.error
        });
      }

      // Verify user session
      const sessionResult = await this.verifyUserSession(tokenValidation.user, req, res);
      if (!sessionResult.valid) {
        this.recordFailedAttempt(req);
        return res.status(401).json({
          error: sessionResult.error
        });
      }

      // Apply session security
      await this.applySessionSecurity(req, res, sessionResult.user);

      // Update last activity
      await this.updateLastActivity(sessionResult.user.id);

      // Add user info to request
      req.user = sessionResult.user;
      req.session = sessionResult.session;

      // Clear failed attempts on successful auth
      this.clearFailedAttempts(req);

      this.logSecurityEvent(req, res, 'authentication_success', {
        userId: sessionResult.user.id,
        method: this.getAuthMethod(req)
      });

      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      this.logSecurityEvent(req, res, 'authentication_error', {
        error: error.message
      });
      
      res.status(500).json({
        error: 'Authentication failed',
        message: 'An unexpected error occurred'
      });
    }
  }

  /**
   * Optional authentication middleware
   */
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next(); // Continue without authentication
      }

      try {
        const token = authHeader.substring(7);
        const tokenValidation = await this.validateToken(token);
        
        if (tokenValidation.valid) {
          const sessionResult = await this.verifyUserSession(tokenValidation.user, req, res);
          if (sessionResult.valid) {
            req.user = sessionResult.user;
            req.session = sessionResult.session;
          }
        }
      } catch (authError) {
        // Continue without authentication if validation fails
        console.log('Optional auth: Token validation failed, continuing without auth');
      }

      next();
    } catch (error) {
      // Continue without authentication if token is invalid
      next();
    }
  }

  /**
   * Apply rate limiting for authentication endpoints
   */
  async applyAuthRateLimiting(req, res) {
    return new Promise((resolve, reject) => {
      authLimiter(req, res, (err) => {
        if (err) {
          this.logSecurityEvent(req, res, 'auth_rate_limit_exceeded');
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Extract and validate token from request
   */
  async extractAndValidateToken(req, res) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        valid: false,
        error: 'No token provided'
      };
    }

    const token = authHeader.substring(7);
    return await this.validateToken(token);
  }

  /**
   * Validate JWT token
   */
  async validateToken(token) {
    try {
      // Verify token with Supabase
      const { data: userData, error: userError } = await supabase.auth.getUser(token);

      if (userError || !userData.user) {
        return {
          valid: false,
          error: 'Invalid or expired token'
        };
      }

      return {
        valid: true,
        user: userData.user,
        token: token
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return {
        valid: false,
        error: 'Token validation failed'
      };
    }
  }

  /**
   * Verify user session and apply security checks
   */
  async verifyUserSession(user, req, res) {
    try {
      // Get user profile from database
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, email, last_active, is_active, subscription_tier')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        return {
          valid: false,
          error: 'User profile not found'
        };
      }

      // Check if user account is active
      if (!userProfile.is_active && isSecurityProd()) {
        return {
          valid: false,
          error: 'Account is disabled'
        };
      }

      // Check session timeout
      if (this.isSessionExpired(userProfile.last_active)) {
        return {
          valid: false,
          error: 'Session expired'
        };
      }

      // Verify session security (environment-specific)
      const sessionSecurity = await this.verifySessionSecurity(user.id, req);
      if (!sessionSecurity.valid) {
        return {
          valid: false,
          error: sessionSecurity.error
        };
      }

      // Create session object
      const session = {
        id: this.generateSessionId(),
        userId: user.id,
        createdAt: new Date(),
        lastActivity: new Date(),
        ipAddress: this.getClientIP(req),
        userAgent: req.headers['user-agent'],
        environment: getEnvironment()
      };

      return {
        valid: true,
        user: {
          id: userProfile.id,
          email: userProfile.email,
          subscriptionTier: userProfile.subscription_tier,
          isActive: userProfile.is_active
        },
        session: session
      };

    } catch (error) {
      console.error('Session verification error:', error);
      return {
        valid: false,
        error: 'Session verification failed'
      };
    }
  }

  /**
   * Apply session security policies
   */
  async applySessionSecurity(req, res, user) {
    const sessionId = this.generateSessionId();
    
    // Set secure session cookie (production only)
    if (isSecurityProd()) {
      res.cookie('session_id', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: this.sessionConfig.cookie.maxAge
      });
    }

    // Add session to active sessions
    this.activeSessions.set(sessionId, {
      userId: user.id,
      createdAt: new Date(),
      lastActivity: new Date(),
      ipAddress: this.getClientIP(req),
      userAgent: req.headers['user-agent']
    });

    // Set security headers
    res.setHeader('X-Authenticated', 'true');
    res.setHeader('X-Session-ID', sessionId);
  }

  /**
   * Verify session security policies
   */
  async verifySessionSecurity(userId, req) {
    // Check for suspicious session activity
    const suspiciousActivity = await this.detectSuspiciousActivity(userId, req);
    if (suspiciousActivity.blocked) {
      return {
        valid: false,
        error: 'Suspicious activity detected'
      };
    }

    // Verify IP consistency (if enabled)
    if (this.config.network.access.control.enabled) {
      const ipConsistent = this.verifyIPConsistency(userId, req);
      if (!ipConsistent) {
        return {
          valid: false,
          error: 'IP address inconsistency detected'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(userId, req) {
    const currentIP = this.getClientIP(req);
    const currentTime = new Date();
    const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);

    // Check for rapid location changes
    const recentSessions = Array.from(this.activeSessions.values())
      .filter(session => 
        session.userId === userId && 
        session.lastActivity > oneHourAgo
      );

    const uniqueIPs = new Set(recentSessions.map(s => s.ipAddress));
    if (uniqueIPs.size > 3 && isSecurityProd()) {
      return { blocked: true, reason: 'Multiple IP addresses detected' };
    }

    return { blocked: false };
  }

  /**
   * Verify IP address consistency
   */
  verifyIPConsistency(userId, req) {
    const currentIP = this.getClientIP(req);
    
    // Check recent sessions for IP consistency
    const recentSessions = Array.from(this.activeSessions.values())
      .filter(session => 
        session.userId === userId && 
        session.lastActivity > new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
      );

    if (recentSessions.length > 0) {
      const hasConsistentIP = recentSessions.some(session => session.ipAddress === currentIP);
      return hasConsistentIP || isSecurityLocal(); // Allow different IPs in local
    }

    return true; // First session from this IP
  }

  /**
   * Check if account is locked
   */
  isAccountLocked(req) {
    const identifier = this.getAccountIdentifier(req);
    const lockoutInfo = this.lockedAccounts.get(identifier);
    
    if (!lockoutInfo) return false;

    const now = new Date();
    const lockoutExpiry = new Date(lockoutInfo.lockedUntil);

    if (now > lockoutExpiry) {
      // Lockout period has expired
      this.lockedAccounts.delete(identifier);
      return false;
    }

    return true;
  }

  /**
   * Get account lockout duration
   */
  getLockoutDuration(req) {
    const identifier = this.getAccountIdentifier(req);
    const lockoutInfo = this.lockedAccounts.get(identifier);
    
    if (!lockoutInfo) return 0;

    const now = new Date();
    const lockoutExpiry = new Date(lockoutInfo.lockedUntil);
    return Math.ceil((lockoutExpiry.getTime() - now.getTime()) / 1000);
  }

  /**
   * Record failed authentication attempt
   */
  recordFailedAttempt(req) {
    const identifier = this.getAccountIdentifier(req);
    const now = new Date();
    
    if (!this.failedAttempts.has(identifier)) {
      this.failedAttempts.set(identifier, {
        attempts: 0,
        firstAttempt: now,
        lastAttempt: now
      });
    }

    const attemptInfo = this.failedAttempts.get(identifier);
    attemptInfo.attempts += 1;
    attemptInfo.lastAttempt = now;

    // Check if account should be locked
    const shouldLock = this.shouldLockAccount(attemptInfo);
    if (shouldLock.lock) {
      this.lockAccount(identifier, shouldLock.duration);
    }

    this.logSecurityEvent(req, null, 'authentication_failed', {
      identifier,
      attempts: attemptInfo.attempts,
      locked: shouldLock.lock
    });
  }

  /**
   * Clear failed attempts on successful authentication
   */
  clearFailedAttempts(req) {
    const identifier = this.getAccountIdentifier(req);
    this.failedAttempts.delete(identifier);
    this.lockedAccounts.delete(identifier);
  }

  /**
   * Determine if account should be locked
   */
  shouldLockAccount(attemptInfo) {
    const now = new Date();
    const timeWindow = 15 * 60 * 1000; // 15 minutes
    const isWithinWindow = now - attemptInfo.firstAttempt < timeWindow;
    
    if (isWithinWindow && attemptInfo.attempts >= this.passwordConfig.lockoutThreshold) {
      return {
        lock: true,
        duration: this.passwordConfig.lockoutDuration
      };
    }

    return { lock: false, duration: 0 };
  }

  /**
   * Lock account
   */
  lockAccount(identifier, duration) {
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + duration);
    
    this.lockedAccounts.set(identifier, {
      lockedAt: now,
      lockedUntil: lockedUntil,
      attempts: this.failedAttempts.get(identifier)?.attempts || 0
    });
  }

  /**
   * Check if session is expired
   */
  isSessionExpired(lastActivity) {
    const now = new Date();
    const sessionExpiry = new Date(now.getTime() - this.sessionConfig.timeout * 60 * 1000);
    return new Date(lastActivity) < sessionExpiry;
  }

  /**
   * Update user last activity
   */
  async updateLastActivity(userId) {
    try {
      await supabase
        .from('users')
        .update({ last_active: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  /**
   * Check if path is authentication endpoint
   */
  isAuthEndpoint(path) {
    const authEndpoints = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
    return authEndpoints.some(endpoint => path.startsWith(endpoint));
  }

  /**
   * Get account identifier (IP or user ID)
   */
  getAccountIdentifier(req) {
    // Use IP for rate limiting, could also use email/username for login attempts
    return this.getClientIP(req);
  }

  /**
   * Get authentication method
   */
  getAuthMethod(req) {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return 'jwt';
    if (req.headers['x-auth-token']) return 'token';
    return 'unknown';
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
           req.headers['x-real-ip'] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           'unknown';
  }

  /**
   * Generate session ID
   */
  generateSessionId() {
    return crypto.randomUUID();
  }

  /**
   * Log security events
   */
  logSecurityEvent(req, res, eventType, details = {}) {
    logSecurityEvent(req, res, `auth_${eventType}`, {
      ...details,
      environment: getEnvironment(),
      authConfig: this.config.environment
    });
  }

  /**
   * Session validation middleware
   */
  validateSession(req, res, next) {
    const sessionCookie = req.cookies?.session_id;
    
    if (!sessionCookie) {
      return res.status(401).json({
        error: 'Session validation failed'
      });
    }

    const session = this.activeSessions.get(sessionCookie);
    if (!session) {
      return res.status(401).json({
        error: 'Invalid session'
      });
    }

    // Check session expiry
    const now = new Date();
    const sessionExpiry = new Date(session.lastActivity.getTime() + this.sessionConfig.timeout * 60 * 1000);
    
    if (now > sessionExpiry) {
      this.activeSessions.delete(sessionCookie);
      return res.status(401).json({
        error: 'Session expired'
      });
    }

    // Update session activity
    session.lastActivity = now;
    next();
  }

  /**
   * Logout middleware
   */
  async logout(req, res, next) {
    try {
      // Invalidate session
      const sessionCookie = req.cookies?.session_id;
      if (sessionCookie) {
        this.activeSessions.delete(sessionCookie);
      }

      // Sign out from Supabase if token provided
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await supabase.auth.signOut();
      }

      // Clear session cookie
      res.clearCookie('session_id');

      this.logSecurityEvent(req, res, 'logout_success');

      next();
    } catch (error) {
      console.error('Logout error:', error);
      this.logSecurityEvent(req, res, 'logout_error', { error: error.message });
      next();
    }
  }
}

// Create singleton instance
const authMiddlewareManager = new AuthMiddleware();

// Export middleware functions
const authenticate = (req, res, next) => {
  return authMiddlewareManager.authenticate(req, res, next);
};

const optionalAuth = (req, res, next) => {
  return authMiddlewareManager.optionalAuth(req, res, next);
};

const validateSession = (req, res, next) => {
  return authMiddlewareManager.validateSession(req, res, next);
};

const logout = (req, res, next) => {
  return authMiddlewareManager.logout(req, res, next);
};

module.exports = {
  // Main middleware
  authenticate,
  optionalAuth,
  validateSession,
  logout,
  
  // Auth middleware instance
  authMiddlewareManager,
  
  // Utility functions
  isAuthenticated: (req) => !!req.user,
  getCurrentUser: (req) => req.user,
  getCurrentSession: (req) => req.session
};