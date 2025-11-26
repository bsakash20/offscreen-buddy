/**
 * Advanced Rate Limiting Middleware
 * Provides sophisticated rate limiting with multiple strategies
 * Integrates with security configuration for environment-specific policies
 */

const { getSecurityConfig, isSecurityLocal, isSecurityProd } = require('../config/security');
const { logSecurityEvent } = require('./security');

/**
 * Advanced Rate Limiting Middleware Manager
 * Handles multiple rate limiting strategies and policies
 */
class RateLimiterMiddleware {
  constructor() {
    this.config = getSecurityConfig();
    this.setupRateLimiters();
  }

  /**
   * Setup rate limiters based on environment configuration
   */
  setupRateLimiters() {
    // Initialize in-memory stores
    this.stores = {
      ip: new Map(),
      user: new Map(),
      global: new Map(),
      endpoint: new Map()
    };

    // Setup environment-specific configuration
    if (isSecurityProd()) {
      this.setupProductionLimits();
    } else {
      this.setupLocalLimits();
    }
  }

  /**
   * Setup production-grade rate limits
   */
  setupProductionLimits() {
    this.limits = {
      global: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 1000,
        message: 'Global rate limit exceeded',
        keyGenerator: (req) => 'global'
      },

      ip: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
        message: 'Too many requests from this IP',
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => this.getClientIP(req)
      },

      user: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 1000,
        message: 'User rate limit exceeded',
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        keyGenerator: (req) => req.user?.id || 'anonymous'
      },

      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5,
        message: 'Too many authentication attempts',
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        keyGenerator: (req) => this.getClientIP(req)
      },

      payment: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10,
        message: 'Payment rate limit exceeded',
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => req.user?.id || this.getClientIP(req)
      },

      sensitive: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 50,
        message: 'Sensitive operation rate limit exceeded',
        skipSuccessfulRequests: false,
        skipFailedRequests: true,
        keyGenerator: (req) => this.getClientIP(req)
      }
    };

    // Endpoint-specific limits
    this.endpointLimits = {
      '/api/auth/login': { windowMs: 15 * 60 * 1000, max: 5 },
      '/api/auth/register': { windowMs: 60 * 60 * 1000, max: 3 },
      '/api/payments': { windowMs: 60 * 60 * 1000, max: 10 },
      '/api/users': { windowMs: 15 * 60 * 1000, max: 100 }
    };
  }

  /**
   * Setup local development rate limits
   */
  setupLocalLimits() {
    this.limits = {
      global: {
        windowMs: 60 * 1000, // 1 minute
        max: 10000,
        message: 'Global rate limit exceeded (LOCAL)',
        keyGenerator: (req) => 'global'
      },

      ip: {
        windowMs: 60 * 1000, // 1 minute
        max: 1000,
        message: 'Too many requests from this IP (LOCAL)',
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => this.getClientIP(req)
      },

      user: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 10000,
        message: 'User rate limit exceeded (LOCAL)',
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => req.user?.id || 'anonymous'
      },

      auth: {
        windowMs: 60 * 1000, // 1 minute
        max: 50,
        message: 'Too many authentication attempts (LOCAL)',
        skipSuccessfulRequests: true,
        skipFailedRequests: false,
        keyGenerator: (req) => this.getClientIP(req)
      },

      payment: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 100,
        message: 'Payment rate limit exceeded (LOCAL)',
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => req.user?.id || this.getClientIP(req)
      },

      sensitive: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 500,
        message: 'Sensitive operation rate limit exceeded (LOCAL)',
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
        keyGenerator: (req) => this.getClientIP(req)
      }
    };

    // Endpoint-specific limits (more permissive for local)
    this.endpointLimits = {
      '/api/auth/login': { windowMs: 60 * 1000, max: 50 },
      '/api/auth/register': { windowMs: 60 * 60 * 1000, max: 30 },
      '/api/payments': { windowMs: 60 * 60 * 1000, max: 100 },
      '/api/users': { windowMs: 60 * 1000, max: 1000 }
    };
  }

  /**
   * Main rate limiting middleware
   */
  createLimiter(limitType = 'ip', customConfig = {}) {
    return (req, res, next) => {
      try {
        const config = { ...this.limits[limitType], ...customConfig };
        
        // Check if rate limiting is disabled
        if (this.config.api.rateLimit.enabled === false) {
          return next();
        }

        // Check if request should be skipped
        if (config.skip && config.skip(req)) {
          return next();
        }

        const result = this.checkRateLimit(req, res, config, limitType);
        
        if (result.blocked) {
          this.logRateLimitViolation(req, res, limitType, result);
          return res.status(429).json({
            error: config.message,
            retryAfter: Math.ceil(config.windowMs / 1000),
            limitType,
            resetTime: new Date(result.resetTime).toISOString()
          });
        }

        // Add rate limit headers
        this.addRateLimitHeaders(res, result, config);
        
        // Track successful/failed requests
        this.trackRequest(req, res, limitType);
        
        next();
      } catch (error) {
        console.error('Rate limiter error:', error);
        next(); // Allow request to continue on error
      }
    };
  }

  /**
   * Check rate limit for a request
   */
  checkRateLimit(req, res, config, limitType) {
    const key = config.keyGenerator(req);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    
    // Get or create store for this limit type
    if (!this.stores[limitType]) {
      this.stores[limitType] = new Map();
    }
    
    const store = this.stores[limitType];
    
    // Clean old entries
    if (!store.has(key)) {
      store.set(key, []);
    }
    
    const requests = store.get(key);
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit is exceeded
    if (validRequests.length >= config.max) {
      return {
        blocked: true,
        limit: config.max,
        current: validRequests.length,
        resetTime: windowStart + config.windowMs,
        windowMs: config.windowMs
      };
    }
    
    // Add current request
    validRequests.push(now);
    store.set(key, validRequests);
    
    return {
      blocked: false,
      limit: config.max,
      current: validRequests.length,
      remaining: Math.max(0, config.max - validRequests.length),
      resetTime: windowStart + config.windowMs
    };
  }

  /**
   * Add rate limit headers to response
   */
  addRateLimitHeaders(res, result, config) {
    if (this.config.api.rateLimit.standardHeaders) {
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Remaining', result.remaining);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    }
    
    if (this.config.api.rateLimit.legacyHeaders) {
      res.setHeader('X-RateLimit-Limit', result.limit);
      res.setHeader('X-RateLimit-Used', result.current);
      res.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));
    }
  }

  /**
   * Track request for skip logic
   */
  trackRequest(req, res, limitType) {
    const config = this.limits[limitType];
    
    // Store original end method
    const originalEnd = res.end;
    
    res.end = (...args) => {
      const isSuccessful = res.statusCode < 400;
      const isFailed = res.statusCode >= 400;
      
      // Update tracking based on configuration
      if (config.skipSuccessfulRequests && isSuccessful) {
        this.removeRequest(req, limitType);
      }
      
      if (config.skipFailedRequests && isFailed) {
        this.removeRequest(req, limitType);
      }
      
      // Call original end method
      originalEnd.apply(res, args);
    };
  }

  /**
   * Remove a request from tracking
   */
  removeRequest(req, limitType) {
    const config = this.limits[limitType];
    const key = config.keyGenerator(req);
    const store = this.stores[limitType];
    
    if (store && store.has(key)) {
      const requests = store.get(key);
      if (requests.length > 0) {
        requests.pop(); // Remove the most recent request
        store.set(key, requests);
      }
    }
  }

  /**
   * Log rate limit violation
   */
  logRateLimitViolation(req, res, limitType, result) {
    const config = this.limits[limitType];
    const key = config.keyGenerator(req);
    
    logSecurityEvent(req, res, 'rate_limit_exceeded', {
      limitType,
      key,
      limit: config.max,
      current: result.current,
      windowMs: config.windowMs,
      resetTime: result.resetTime
    });
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
   * Endpoint-specific rate limiting
   */
  createEndpointLimiter() {
    return (req, res, next) => {
      const endpoint = req.path;
      const endpointConfig = this.endpointLimits[endpoint];
      
      if (!endpointConfig) {
        return next();
      }
      
      return this.createLimiter('endpoint', endpointConfig)(req, res, next);
    };
  }

  /**
   * Burst protection (prevent rapid successive requests)
   */
  createBurstProtection(interval = 1000, maxBurst = 5) {
    return (req, res, next) => {
      const ip = this.getClientIP(req);
      const now = Date.now();
      
      if (!this.stores.burst) {
        this.stores.burst = new Map();
      }
      
      const burstStore = this.stores.burst;
      const key = `burst:${ip}`;
      
      if (!burstStore.has(key)) {
        burstStore.set(key, []);
      }
      
      const bursts = burstStore.get(key);
      const recentBursts = bursts.filter(timestamp => now - timestamp < interval);
      
      if (recentBursts.length >= maxBurst) {
        logSecurityEvent(req, res, 'burst_protection_triggered', {
          ip,
          interval,
          maxBurst,
          recentCount: recentBursts.length
        });
        
        return res.status(429).json({
          error: 'Too many rapid requests',
          retryAfter: Math.ceil(interval / 1000)
        });
      }
      
      recentBursts.push(now);
      burstStore.set(key, recentBursts);
      
      next();
    };
  }

  /**
   * Distributed rate limiting (for production)
   */
  createDistributedLimiter(limitType = 'ip') {
    // This would integrate with Redis or similar in production
    // For now, fallback to local implementation
    return this.createLimiter(limitType);
  }

  /**
   * Dynamic rate limiting based on request patterns
   */
  createDynamicLimiter() {
    return (req, res, next) => {
      const ip = this.getClientIP(req);
      const now = Date.now();
      
      // Analyze request patterns
      const patterns = this.analyzeRequestPatterns(ip, now);
      
      // Adjust limits based on patterns
      let adjustedLimit = this.limits.ip.max;
      let adjustedWindow = this.limits.ip.windowMs;
      
      if (patterns.suspicious) {
        adjustedLimit = Math.floor(adjustedLimit * 0.1); // 90% reduction
        adjustedWindow = Math.floor(adjustedWindow * 0.5); // Half window
      } else if (patterns.trusted) {
        adjustedLimit = Math.floor(adjustedLimit * 2); // Double limit
        adjustedWindow = Math.floor(adjustedWindow * 2); // Double window
      }
      
      const dynamicConfig = {
        ...this.limits.ip,
        max: adjustedLimit,
        windowMs: adjustedWindow
      };
      
      return this.createLimiter('dynamic', dynamicConfig)(req, res, next);
    };
  }

  /**
   * Analyze request patterns for dynamic limiting
   */
  analyzeRequestPatterns(ip, now) {
    const patterns = {
      suspicious: false,
      trusted: false,
      score: 0
    };
    
    // Check recent request frequency
    const recentRequests = this.getRecentRequests(ip, now - 60000); // Last minute
    if (recentRequests > 50) patterns.suspicious = true;
    if (recentRequests < 5) patterns.trusted = true;
    
    // Check for bot-like behavior
    const userAgent = '';
    const hasBotUserAgent = /bot|crawler|spider|crawl/i.test(userAgent);
    if (hasBotUserAgent) patterns.suspicious = true;
    
    // Check request timing (too regular = suspicious)
    const timingPattern = this.analyzeTimingPattern(ip, now - 300000); // Last 5 minutes
    if (timingPattern.regular) patterns.suspicious = true;
    
    return patterns;
  }

  /**
   * Get recent requests for IP
   */
  getRecentRequests(ip, since) {
    const store = this.stores.ip;
    if (!store) return 0;
    
    let count = 0;
    for (const [key, requests] of store.entries()) {
      if (key === ip) {
        count += requests.filter(timestamp => timestamp > since).length;
      }
    }
    
    return count;
  }

  /**
   * Analyze timing patterns
   */
  analyzeTimingPattern(ip, since) {
    const store = this.stores.ip;
    if (!store || !store.has(ip)) {
      return { regular: false };
    }
    
    const requests = store.get(ip).filter(timestamp => timestamp > since);
    if (requests.length < 10) {
      return { regular: false };
    }
    
    // Check for regular intervals
    const intervals = [];
    for (let i = 1; i < requests.length; i++) {
      intervals.push(requests[i] - requests[i - 1]);
    }
    
    // Calculate variance
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((acc, interval) => acc + Math.pow(interval - avg, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // If standard deviation is low, pattern is regular
    return {
      regular: stdDev < 100 // Less than 100ms variance
    };
  }

  /**
   * Reset rate limits (useful for testing)
   */
  resetRateLimits(limitType = null) {
    if (limitType) {
      if (this.stores[limitType]) {
        this.stores[limitType].clear();
      }
    } else {
      Object.keys(this.stores).forEach(type => {
        this.stores[type].clear();
      });
    }
  }

  /**
   * Get rate limit status
   */
  getRateLimitStatus(req, limitType = 'ip') {
    const config = this.limits[limitType];
    const key = config.keyGenerator(req);
    const store = this.stores[limitType];
    
    if (!store || !store.has(key)) {
      return {
        limit: config.max,
        current: 0,
        remaining: config.max,
        resetTime: Date.now() + config.windowMs
      };
    }
    
    const requests = store.get(key);
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const validRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return {
      limit: config.max,
      current: validRequests.length,
      remaining: Math.max(0, config.max - validRequests.length),
      resetTime: windowStart + config.windowMs
    };
  }
}

// Create singleton instance
const rateLimiterMiddleware = new RateLimiterMiddleware();

/**
 * Pre-configured rate limiters
 */
const globalLimiter = rateLimiterMiddleware.createLimiter('global');
const ipLimiter = rateLimiterMiddleware.createLimiter('ip');
const userLimiter = rateLimiterMiddleware.createLimiter('user');
const authLimiter = rateLimiterMiddleware.createLimiter('auth');
const paymentLimiter = rateLimiterMiddleware.createLimiter('payment');
const sensitiveLimiter = rateLimiterMiddleware.createLimiter('sensitive');
const endpointLimiter = rateLimiterMiddleware.createEndpointLimiter();
const burstProtection = rateLimiterMiddleware.createBurstProtection();
const dynamicLimiter = rateLimiterMiddleware.createDynamicLimiter();

/**
 * Custom rate limiter factory
 */
const createCustomLimiter = (config) => {
  return rateLimiterMiddleware.createLimiter('custom', config);
};

/**
 * Utility functions
 */
const getClientIP = (req) => rateLimiterMiddleware.getClientIP(req);
const resetRateLimits = (limitType) => rateLimiterMiddleware.resetRateLimits(limitType);
const getRateLimitStatus = (req, limitType) => rateLimiterMiddleware.getRateLimitStatus(req, limitType);

module.exports = {
  // Pre-configured limiters
  globalLimiter,
  ipLimiter,
  userLimiter,
  authLimiter,
  paymentLimiter,
  sensitiveLimiter,
  endpointLimiter,
  burstProtection,
  dynamicLimiter,
  
  // Custom limiter
  createCustomLimiter,
  
  // Utilities
  getClientIP,
  resetRateLimits,
  getRateLimitStatus,
  
  // Rate limiter middleware instance
  rateLimiterMiddleware
};