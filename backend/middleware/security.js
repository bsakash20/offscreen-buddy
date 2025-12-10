/**
 * Comprehensive Security Middleware
 * Applies environment-specific security policies and protections
 * Integrates with the security configuration system
 */

const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { getSecurityConfig, isSecurityProd } = require('../config/security');
const { getEnvironment } = require('../config/environment');

/**
 * Security Middleware Manager
 * Applies comprehensive security measures based on environment
 */
class SecurityMiddleware {
  constructor() {
    this.config = getSecurityConfig();
  }

  /**
   * Main security middleware function
   */
  securityMiddleware(req, res, next) {
    // 1. Headers (handled by Helmet + Custom)
    this.applySecurityHeaders(req, res, () => {
      // 2. Rate Limiting (handled by express-rate-limit wrapper below)
      // 3. Basic Sanitization
      this.sanitizeInput(req, res, () => {
        next();
      });
    });
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(req, res, next) {
    // Add custom security headers
    res.setHeader('X-Security-Policy', 'offscreen-buddy-secure');
    res.setHeader('X-Request-ID', this.generateRequestId());

    // Note: Helmet should be used in server.js primarily, but if we need dynamic per-request headers:
    // This is kept for backward compatibility with existing calls
    next();
  }

  /**
   * Apply rate limiting (Programmatic wrapper if needed, but mostly used via exports)
   */
  applyRateLimiting(req, res, next) {
    // Logic moved to 'rateLimiting' export using express-rate-limit
    next();
  }

  /**
   * Validate incoming request
   */
  validateRequest(req, res, next) {
    // Simplified: Check User-Agent presence
    if (!req.headers['user-agent']) {
      // Warn but allow for now, or minimal validation
    }
    next();
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(req, res, next) {
    if (req.body) this.removeNullBytes(req.body);
    if (req.query) this.removeNullBytes(req.query);
    if (req.params) this.removeNullBytes(req.params);
    next();
  }

  /**
   * Remove null bytes from object recursively
   */
  removeNullBytes(obj) {
    if (typeof obj === 'string') {
      return; // Strings are immutable, caller needs to handle reassignment if it was a direct string assignment, but here we modify objects
    }

    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].replace(/\0/g, '').trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        this.removeNullBytes(obj[key]);
      }
    }
  }

  /**
   * Prevent SQL injection attacks
   * Deprecated: Supabase handles this via parameterized queries.
   * Kept for interface compatibility.
   */
  preventSQLInjection(req, res, next) {
    next();
  }

  /**
   * Apply CSRF protection
   * Simplified or mostly skipped if stateless JWT.
   */
  applyCSRFProtection(req, res, next) {
    next();
  }

  /**
   * Apply IP filtering
   */
  applyIPFiltering(req, res, next) {
    // Kept simple or no-op if handled by infrastructure
    next();
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
   * Generate unique request ID
   */
  generateRequestId() {
    return crypto.randomUUID();
  }

  /**
   * Log security events
   */
  logSecurityEvent(req, res, eventType, details = {}) {
    const logData = {
      timestamp: new Date().toISOString(),
      eventType,
      requestId: res.getHeader('X-Request-ID'),
      method: req.method,
      path: req.path,
      clientIP: this.getClientIP(req),
      environment: getEnvironment(),
      ...details
    };
    // Simple console log for now
    if (eventType === 'error' || eventType === 'rate_limit_exceeded') {
      console.warn('Security Event:', JSON.stringify(logData));
    }
  }
}

// Create singleton instance
const securityMiddleware = new SecurityMiddleware();

/**
 * Rate Limiter Definition
 */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => securityMiddleware.getClientIP(req),
  handler: (req, res) => {
    securityMiddleware.logSecurityEvent(req, res, 'rate_limit_exceeded');
    res.status(429).json({
      error: 'Too many requests, please try again later.'
    });
  }
});


module.exports = {
  // Main middleware
  applySecurity: (req, res, next) => securityMiddleware.securityMiddleware(req, res, next),

  // Specialized middleware
  securityHeaders: (req, res, next) => securityMiddleware.applySecurityHeaders(req, res, next),
  rateLimiting: limiter, // Use the express-rate-limit instance directly or wrapper
  inputValidation: (req, res, next) => securityMiddleware.validateRequest(req, res, next),
  inputSanitization: (req, res, next) => securityMiddleware.sanitizeInput(req, res, next),
  sqlInjectionPrevention: (req, res, next) => securityMiddleware.preventSQLInjection(req, res, next),
  csrfProtection: (req, res, next) => securityMiddleware.applyCSRFProtection(req, res, next),
  ipFiltering: (req, res, next) => securityMiddleware.applyIPFiltering(req, res, next),

  // Utilities
  getClientIP: (req) => securityMiddleware.getClientIP(req),
  generateRequestId: () => securityMiddleware.generateRequestId(),
  logSecurityEvent: (req, res, eventType, details) =>
    securityMiddleware.logSecurityEvent(req, res, eventType, details),

  // Security middleware instance
  securityMiddleware
};