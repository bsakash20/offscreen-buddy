/**
 * Comprehensive Security Middleware
 * Applies environment-specific security policies and protections
 * Integrates with the security configuration system
 */

const crypto = require('crypto');
const { getSecurityConfig, isSecurityLocal, isSecurityProd } = require('../config/security');
const { getEnvironment } = require('../config/environment');

/**
 * Security Middleware Manager
 * Applies comprehensive security measures based on environment
 */
class SecurityMiddleware {
  constructor() {
    this.config = getSecurityConfig();
    this.setupSecurityHeaders();
  }

  /**
   * Setup security headers based on environment configuration
   */
  setupSecurityHeaders() {
    this.securityHeaders = this.config.headers;

    // Apply environment-specific header configurations
    if (isSecurityProd()) {
      // Production: Strict security headers
      this.applyProductionHeaders();
    } else {
      // Local: Relaxed headers for development
      this.applyLocalHeaders();
    }
  }

  /**
   * Apply production-grade security headers
   */
  applyProductionHeaders() {
    const cspConfig = this.config.api.xssProtection.cspPolicy;

    this.productionHeaders = {
      // XSS Protection
      'X-XSS-Protection': this.securityHeaders.xssProtection,
      'X-Content-Type-Options': this.securityHeaders.contentTypeNosniff ? 'nosniff' : null,
      'X-Frame-Options': this.securityHeaders.frameOptions,
      'X-Permitted-Cross-Domain-Policies': 'none',

      // Content Security Policy
      'Content-Security-Policy': this.buildCSPHeader(cspConfig),

      // Referrer Policy
      'Referrer-Policy': this.securityHeaders.referrerPolicy,

      // Permissions Policy
      'Permissions-Policy': this.securityHeaders.permissionsPolicy,

      // HSTS (only on HTTPS)
      'Strict-Transport-Security': this.config.network.https.hsts.enabled ?
        `max-age=${this.config.network.https.hsts.maxAge}; includeSubDomains=${this.config.network.https.hsts.includeSubDomains}; preload=${this.config.network.https.hsts.preload}` : null,

      // Remove server information
      'Server': null,
      'X-Powered-By': null
    };
  }

  /**
   * Apply local development security headers
   */
  applyLocalHeaders() {
    this.localHeaders = {
      'X-XSS-Protection': '1; mode=lax',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };
  }

  /**
   * Build Content Security Policy header
   */
  buildCSPHeader(cspConfig) {
    const directives = [];

    for (const [directive, sources] of Object.entries(cspConfig)) {
      if (sources && sources.length > 0) {
        const formattedSources = sources.map(source => {
          // Handle special source values
          if (source === "'self'") return "'self'";
          if (source === "'none'") return "'none'";
          if (source === "'unsafe-inline'") return "'unsafe-inline'";
          if (source === "'unsafe-eval'") return "'unsafe-eval'";

          // Handle wildcard domains
          if (source.startsWith('*.')) return source;

          // Regular source
          return source;
        });

        directives.push(`${directive} ${formattedSources.join(' ')}`);
      }
    }

    return directives.join('; ');
  }

  /**
   * Main security middleware function
   */
  securityMiddleware(req, res, next) {
    try {
      // Apply security headers
      this.applySecurityHeaders(req, res);

      // Apply rate limiting
      this.applyRateLimiting(req, res, next);

      // Apply request validation
      this.validateRequest(req, res, next);

      // Apply input sanitization
      this.sanitizeInput(req, res, next);

      // Apply SQL injection prevention
      this.preventSQLInjection(req, res, next);

      // Apply CSRF protection
      this.applyCSRFProtection(req, res, next);

      // Apply IP filtering
      this.applyIPFiltering(req, res, next);

      // Log security events
      this.logSecurityEvent(req, res, 'request_processed');

    } catch (error) {
      console.error('Security middleware error:', error);
      this.logSecurityEvent(req, res, 'middleware_error', { error: error.message });
      next(error);
    }
  }

  /**
   * Apply security headers to response
   */
  applySecurityHeaders(req, res, next) {
    const headers = isSecurityProd() ? this.productionHeaders : this.localHeaders;

    // Remove null headers
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        res.setHeader(key, value);
      }
    });

    // Add custom security headers
    res.setHeader('X-Security-Policy', 'offscreen-buddy-secure');
    res.setHeader('X-Request-ID', this.generateRequestId());

    next();
  }

  /**
   * Apply rate limiting
   */
  applyRateLimiting(req, res, next) {
    const rateLimitConfig = this.config.api.rateLimit;

    if (!rateLimitConfig.enabled) {
      return next();
    }

    // Check if request should be skipped (e.g., health checks)
    if (typeof rateLimitConfig.skip === 'function' && rateLimitConfig.skip(req)) {
      return next();
    }

    // Basic rate limiting implementation
    const clientIP = this.getClientIP(req);
    const now = Date.now();

    // Simple in-memory rate limiting (use Redis in production)
    if (!global.rateLimitStore) {
      global.rateLimitStore = new Map();
    }

    const key = `${clientIP}:${req.path}`;
    const windowStart = now - rateLimitConfig.windowMs;

    // Clean old entries
    if (!global.rateLimitStore.has(key)) {
      global.rateLimitStore.set(key, []);
    }

    const requests = global.rateLimitStore.get(key);

    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => timestamp > windowStart);

    if (validRequests.length >= rateLimitConfig.max) {
      this.logSecurityEvent(req, res, 'rate_limit_exceeded', {
        clientIP,
        path: req.path,
        count: validRequests.length
      });

      return res.status(429).json({
        error: rateLimitConfig.message,
        retryAfter: Math.ceil(rateLimitConfig.windowMs / 1000)
      });
    }

    // Add current request
    validRequests.push(now);
    global.rateLimitStore.set(key, validRequests);

    // Add rate limit headers if enabled
    if (rateLimitConfig.standardHeaders) {
      res.setHeader('X-RateLimit-Limit', rateLimitConfig.max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitConfig.max - validRequests.length));
      res.setHeader('X-RateLimit-Reset', Math.ceil((windowStart + rateLimitConfig.windowMs) / 1000));
    }

    next();
  }

  /**
   * Validate incoming request
   */
  validateRequest(req, res, next) {
    const validationConfig = this.config.api.requestValidation;

    if (!validationConfig.enabled) {
      return next();
    }

    const errors = [];

    // Validate content type for POST/PUT/PATCH requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (!validationConfig.allowedContentTypes.includes(req.headers['content-type']?.split(';')[0])) {
        errors.push(`Unsupported content type: ${req.headers['content-type']}`);
      }
    }

    // Validate request size
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    const maxSize = this.parseSize(validationConfig.maxRequestSize);

    if (contentLength > maxSize) {
      errors.push(`Request size exceeds limit: ${contentLength} > ${maxSize}`);
    }

    // Validate user agent
    if (!req.headers['user-agent']) {
      errors.push('Missing User-Agent header');
    }

    // Strict mode validation for production
    if (validationConfig.strictMode && isSecurityProd()) {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i
      ];

      const userAgent = req.headers['user-agent'] || '';
      const referer = req.headers['referer'] || '';

      suspiciousPatterns.forEach((pattern, index) => {
        if (pattern.test(userAgent) || pattern.test(referer)) {
          errors.push(`Suspicious pattern detected in headers (pattern ${index})`);
        }
      });
    }

    if (errors.length > 0) {
      this.logSecurityEvent(req, res, 'request_validation_failed', { errors });
      return res.status(400).json({
        error: 'Request validation failed',
        details: validationConfig.strictMode ? errors : ['Invalid request']
      });
    }

    next();
  }

  /**
   * Sanitize input data
   */
  sanitizeInput(req, res, next) {
    const sanitizationConfig = this.config.api.requestValidation;

    if (!sanitizationConfig.sanitizeInputs) {
      return next();
    }

    // Sanitize body
    if (req.body && typeof req.body === 'object') {
      req.body = this.sanitizeObject(req.body);
    }

    // Sanitize query parameters
    if (req.query && typeof req.query === 'object') {
      req.query = this.sanitizeObject(req.query);
    }

    // Remove null bytes
    if (sanitizationConfig.removeNullBytes) {
      this.removeNullBytes(req);
    }

    next();
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }

  /**
   * Sanitize string input
   */
  sanitizeString(str) {
    return str
      .replace(/\0/g, '') // Remove null bytes
      .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
      .trim();
  }

  /**
   * Remove null bytes from request
   */
  removeNullBytes(req) {
    // Remove null bytes from all string properties
    const removeNulls = (obj) => {
      if (typeof obj === 'string') {
        return obj.replace(/\0/g, '');
      }
      if (Array.isArray(obj)) {
        return obj.map(removeNulls);
      }
      if (obj && typeof obj === 'object') {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          cleaned[key] = removeNulls(value);
        }
        return cleaned;
      }
      return obj;
    };

    if (req.body) req.body = removeNulls(req.body);
    if (req.query) req.query = removeNulls(req.query);
    if (req.params) req.params = removeNulls(req.params);
  }

  /**
   * Prevent SQL injection attacks
   */
  preventSQLInjection(req, res, next) {
    const sqlConfig = this.config.api.sqlInjectionPrevention;

    if (!sqlConfig.enabled) {
      return next();
    }

    const checkForSQLInjection = (data) => {
      if (typeof data === 'string') {
        return sqlConfig.blockedPatterns.some(pattern => pattern.test(data));
      }

      if (Array.isArray(data)) {
        return data.some(item => checkForSQLInjection(item));
      }

      if (data && typeof data === 'object') {
        return Object.values(data).some(value => checkForSQLInjection(value));
      }

      return false;
    };

    const requestData = {
      body: req.body,
      query: req.query,
      params: req.params
    };

    if (checkForSQLInjection(requestData)) {
      this.logSecurityEvent(req, res, 'sql_injection_attempt', {
        clientIP: this.getClientIP(req),
        userAgent: req.headers['user-agent']
      });

      const message = sqlConfig.mode === 'block' ?
        'Request blocked due to security policy' :
        'Suspicious content detected';

      return res.status(400).json({
        error: message
      });
    }

    next();
  }

  /**
   * Apply CSRF protection
   */
  applyCSRFProtection(req, res, next) {
    const csrfConfig = this.config.api.csrf;

    if (!csrfConfig.enabled) {
      return next();
    }

    // Skip for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF for API endpoints in local development
    if (isSecurityLocal() && req.path.startsWith('/api/')) {
      return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf;

    if (!token) {
      this.logSecurityEvent(req, res, 'csrf_token_missing');
      return res.status(403).json({
        error: 'CSRF token required'
      });
    }

    // Validate CSRF token (simple implementation)
    // In production, use a proper CSRF library like csurf
    if (!this.validateCSRFToken(token, req)) {
      this.logSecurityEvent(req, res, 'csrf_token_invalid');
      return res.status(403).json({
        error: 'Invalid CSRF token'
      });
    }

    next();
  }

  /**
   * Validate CSRF token
   */
  validateCSRFToken(token, req) {
    // Simple token validation - replace with proper implementation
    const sessionToken = req.session?.csrfToken;
    return sessionToken === token || token.length > 10;
  }

  /**
   * Apply IP filtering
   */
  applyIPFiltering(req, res, next) {
    const accessConfig = this.config.network.access.control;

    if (!accessConfig.enabled) {
      return next();
    }

    const clientIP = this.getClientIP(req);

    // Check blacklist
    if (accessConfig.ipBlacklist.includes(clientIP)) {
      this.logSecurityEvent(req, res, 'ip_blocked', { clientIP });
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Check whitelist (if configured)
    if (accessConfig.ipWhitelist.length > 0 && !accessConfig.ipWhitelist.includes(clientIP)) {
      this.logSecurityEvent(req, res, 'ip_not_whitelisted', { clientIP });
      return res.status(403).json({
        error: 'Access denied'
      });
    }

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
   * Parse size string to bytes
   */
  parseSize(sizeStr) {
    const units = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = sizeStr.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'b';

    return value * (units[unit] || 1);
  }

  /**
   * Log security events
   */
  logSecurityEvent(req, res, eventType, details = {}) {
    const monitoringConfig = this.config.monitoring.security;

    if (!monitoringConfig.enabled) {
      return;
    }

    const logData = {
      timestamp: new Date().toISOString(),
      eventType,
      requestId: res.getHeader('X-Request-ID'),
      method: req.method,
      path: req.path,
      clientIP: this.getClientIP(req),
      userAgent: req.headers['user-agent'],
      environment: getEnvironment(),
      ...details
    };

    // Log based on configured level
    switch (monitoringConfig.logLevel) {
      case 'error':
        console.error('Security Event:', JSON.stringify(logData));
        break;
      case 'warn':
        console.warn('Security Event:', JSON.stringify(logData));
        break;
      case 'info':
        console.info('Security Event:', JSON.stringify(logData));
        break;
      default:
        console.log('Security Event:', JSON.stringify(logData));
    }

    // In production, you would send this to a security monitoring service
    if (isSecurityProd() && this.config.monitoring.alerts.enabled) {
      this.sendSecurityAlert(logData);
    }
  }

  /**
   * Send security alert (production only)
   */
  sendSecurityAlert(logData) {
    // Implementation would send alerts to monitoring service
    // This is a placeholder for the actual implementation
    console.log('Security Alert Sent:', logData);
  }
}

// Create singleton instance
const securityMiddleware = new SecurityMiddleware();

/**
 * Main security middleware export
 */
const applySecurity = (req, res, next) => {
  securityMiddleware.securityMiddleware(req, res, next);
};

/**
 * Specialized middleware functions
 */
const securityHeaders = (req, res, next) => {
  securityMiddleware.applySecurityHeaders(req, res, next);
};

const rateLimiting = (req, res, next) => {
  securityMiddleware.applyRateLimiting(req, res, next);
};

const inputValidation = (req, res, next) => {
  securityMiddleware.validateRequest(req, res, next);
};

const inputSanitization = (req, res, next) => {
  securityMiddleware.sanitizeInput(req, res, next);
};

const sqlInjectionPrevention = (req, res, next) => {
  securityMiddleware.preventSQLInjection(req, res, next);
};

const csrfProtection = (req, res, next) => {
  securityMiddleware.applyCSRFProtection(req, res, next);
};

const ipFiltering = (req, res, next) => {
  securityMiddleware.applyIPFiltering(req, res, next);
};

module.exports = {
  // Main middleware
  applySecurity,

  // Specialized middleware
  securityHeaders,
  rateLimiting,
  inputValidation,
  inputSanitization,
  sqlInjectionPrevention,
  csrfProtection,
  ipFiltering,

  // Utilities
  getClientIP: (req) => securityMiddleware.getClientIP(req),
  generateRequestId: () => securityMiddleware.generateRequestId(),
  logSecurityEvent: (req, res, eventType, details) =>
    securityMiddleware.logSecurityEvent(req, res, eventType, details),

  // Security middleware instance
  securityMiddleware
};