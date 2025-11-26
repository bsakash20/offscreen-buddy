/**
 * Enhanced Security Middleware
 * Additional security protections and advanced rate limiting
 * Builds upon the existing security middleware system
 */

const crypto = require('crypto');
const { getSecurityConfig } = require('../config/security');
const { getEnvironment, isLocal, isProd } = require('../config/environment');

/**
 * Advanced Rate Limiting with IP Blocking
 */
class EnhancedRateLimiter {
    constructor() {
        this.config = getSecurityConfig();
        this.suspiciousIPs = new Map();
        this.blockedIPs = new Set();
        this.registrationAttempts = new Map();
        this.loginAttempts = new Map();
    }

    /**
     * Enhanced registration rate limiting with IP tracking
     */
    checkRegistrationLimit(req, res, next) {
        const clientIP = this.getClientIP(req);
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxAttempts = 5; // Max 5 registration attempts per 15 minutes
        const maxPerIP = 3; // Max 3 per IP address

        // Check if IP is blocked
        if (this.isIPBlocked(clientIP)) {
            return res.status(429).json({
                error: 'IP address temporarily blocked due to suspicious activity',
                retryAfter: this.getBlockDuration(clientIP)
            });
        }

        // Clean old entries
        this.cleanOldEntries(this.registrationAttempts, windowMs);

        if (!this.registrationAttempts.has(clientIP)) {
            this.registrationAttempts.set(clientIP, []);
        }

        const attempts = this.registrationAttempts.get(clientIP);
        const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);

        // Check total attempts limit
        if (recentAttempts.length >= maxAttempts) {
            this.markSuspiciousIP(clientIP, 'registration_rate_limit_exceeded');
            return res.status(429).json({
                error: 'Too many registration attempts. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        // Check per-IP limit
        const ipKey = `ip_${clientIP}`;
        if (!this.registrationAttempts.has(ipKey)) {
            this.registrationAttempts.set(ipKey, []);
        }

        const ipAttempts = this.registrationAttempts.get(ipKey);
        const recentIPAttempts = ipAttempts.filter(timestamp => now - timestamp < windowMs);

        if (recentIPAttempts.length >= maxPerIP) {
            this.blockIP(clientIP, 30 * 60 * 1000); // Block for 30 minutes
            return res.status(429).json({
                error: 'IP address blocked due to multiple registration attempts',
                retryAfter: 1800
            });
        }

        // Record this attempt
        attempts.push(now);
        ipAttempts.push(now);

        next();
    }

    /**
     * Enhanced login rate limiting with failed attempt tracking
     */
    checkLoginLimit(req, res, next) {
        const clientIP = this.getClientIP(req);
        const identifier = req.body.identifier || 'unknown';
        const now = Date.now();
        const windowMs = 15 * 60 * 1000; // 15 minutes
        const maxAttempts = 10;
        const maxFailedPerIP = 5;

        // Clean old entries
        this.cleanOldEntries(this.loginAttempts, windowMs);

        // Check per-identifier limit
        if (!this.loginAttempts.has(identifier)) {
            this.loginAttempts.set(identifier, []);
        }

        const attempts = this.loginAttempts.get(identifier);
        const recentAttempts = attempts.filter(timestamp => now - timestamp < windowMs);

        if (recentAttempts.length >= maxAttempts) {
            this.markSuspiciousIP(clientIP, 'login_rate_limit_exceeded');
            return res.status(429).json({
                error: 'Too many login attempts. Please try again later.',
                retryAfter: Math.ceil(windowMs / 1000)
            });
        }

        // Check per-IP failed attempts
        const failedAttemptsKey = `failed_${clientIP}`;
        if (!this.loginAttempts.has(failedAttemptsKey)) {
            this.loginAttempts.set(failedAttemptsKey, []);
        }

        const failedAttempts = this.loginAttempts.get(failedAttemptsKey);
        const recentFailedAttempts = failedAttempts.filter(timestamp => now - timestamp < windowMs);

        if (recentFailedAttempts.length >= maxFailedPerIP) {
            this.blockIP(clientIP, 60 * 60 * 1000); // Block for 1 hour
            return res.status(429).json({
                error: 'IP address temporarily blocked due to multiple failed login attempts',
                retryAfter: 3600
            });
        }

        // Record this attempt
        attempts.push(now);

        next();
    }

    /**
     * Record failed login attempt
     */
    recordFailedLogin(req) {
        const clientIP = this.getClientIP(req);
        const failedAttemptsKey = `failed_${clientIP}`;

        if (!this.loginAttempts.has(failedAttemptsKey)) {
            this.loginAttempts.set(failedAttemptsKey, []);
        }

        this.loginAttempts.get(failedAttemptsKey).push(Date.now());
    }

    /**
     * Clear login attempts on successful login
     */
    clearLoginAttempts(identifier) {
        this.loginAttempts.delete(identifier);
    }

    /**
     * Mark IP as suspicious
     */
    markSuspiciousIP(ip, reason) {
        const suspiciousData = this.suspiciousIPs.get(ip) || {
            count: 0,
            reasons: [],
            firstSeen: Date.now(),
            lastSeen: Date.now()
        };

        suspiciousData.count++;
        suspiciousData.reasons.push(reason);
        suspiciousData.lastSeen = Date.now();

        this.suspiciousIPs.set(ip, suspiciousData);

        // Auto-block if too many suspicious activities
        if (suspiciousData.count >= 10) {
            this.blockIP(ip, 2 * 60 * 60 * 1000); // Block for 2 hours
        }
    }

    /**
     * Block IP address
     */
    blockIP(ip, durationMs) {
        const blockUntil = Date.now() + durationMs;
        this.blockedIPs.add(ip);

        // Auto-unblock after duration
        setTimeout(() => {
            this.blockedIPs.delete(ip);
        }, durationMs);

        console.warn(`🚫 IP ${ip} blocked for ${durationMs / 1000 / 60} minutes`);
    }

    /**
     * Check if IP is blocked
     */
    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    /**
     * Get block duration for IP
     */
    getBlockDuration(ip) {
        // This would typically be stored with the block info
        // For now, return a default duration
        return 3600; // 1 hour
    }

    /**
     * Clean old entries from rate limiting stores
     */
    cleanOldEntries(store, windowMs) {
        const now = Date.now();
        for (const [key, attempts] of store.entries()) {
            if (Array.isArray(attempts)) {
                const validAttempts = attempts.filter(timestamp => now - timestamp < windowMs);
                if (validAttempts.length === 0) {
                    store.delete(key);
                } else {
                    store.set(key, validAttempts);
                }
            }
        }
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
     * Get suspicious IPs report (for monitoring)
     */
    getSuspiciousIPsReport() {
        const report = [];
        for (const [ip, data] of this.suspiciousIPs.entries()) {
            report.push({
                ip,
                count: data.count,
                reasons: data.reasons,
                firstSeen: data.firstSeen,
                lastSeen: data.lastSeen,
                isBlocked: this.blockedIPs.has(ip)
            });
        }
        return report.sort((a, b) => b.count - a.count);
    }
}

/**
 * Request Size and Timeout Protection
 */
class RequestProtection {
    constructor() {
        this.config = getSecurityConfig();
        this.maxRequestSize = isProd() ? 1024 * 1024 : 10 * 1024 * 1024; // 1MB prod, 10MB local
        this.timeoutDuration = isProd() ? 30000 : 60000; // 30s prod, 60s local
        this.activeRequests = new Map();
    }

    /**
     * Validate request size
     */
    validateRequestSize(req, res, next) {
        const contentLength = parseInt(req.headers['content-length'] || '0', 10);

        if (contentLength > this.maxRequestSize) {
            return res.status(413).json({
                error: 'Request entity too large',
                maxSize: this.maxRequestSize,
                receivedSize: contentLength
            });
        }

        // Set timeout for request
        req.setTimeout(this.timeoutDuration, () => {
            if (!res.headersSent) {
                res.status(408).json({
                    error: 'Request timeout',
                    timeoutMs: this.timeoutDuration
                });
            }
        });

        // Track active requests (for monitoring)
        const requestId = crypto.randomUUID();
        this.activeRequests.set(requestId, {
            ip: this.getClientIP(req),
            path: req.path,
            method: req.method,
            startTime: Date.now()
        });

        // Clean up when response finishes
        res.on('finish', () => {
            this.activeRequests.delete(requestId);
        });

        next();
    }

    /**
     * Get active requests (for monitoring)
     */
    getActiveRequests() {
        const now = Date.now();
        const requests = [];

        for (const [id, data] of this.activeRequests.entries()) {
            requests.push({
                id,
                ...data,
                duration: now - data.startTime,
                isLongRunning: (now - data.startTime) > 10000 // 10 seconds
            });
        }

        return requests.sort((a, b) => b.duration - a.duration);
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
}

/**
 * Advanced Security Headers
 */
class AdvancedSecurityHeaders {
    constructor() {
        this.config = getSecurityConfig();
    }

    /**
     * Generate comprehensive security headers
     */
    generateSecurityHeaders() {
        const headers = {
            // XSS Protection
            'X-XSS-Protection': '1; mode=block',
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': isProd() ? 'DENY' : 'SAMEORIGIN',
            'X-Permitted-Cross-Domain-Policies': 'none',

            // Content Security Policy
            ...this.generateCSPHeaders(),

            // Referrer Policy
            'Referrer-Policy': isProd() ? 'strict-origin' : 'strict-origin-when-cross-origin',

            // Permissions Policy
            'Permissions-Policy': [
                'accelerometer=()',
                'camera=()',
                'geolocation=()',
                'gyroscope=()',
                'magnetometer=()',
                'microphone=()',
                'payment=()',
                'usb=()'
            ].join(', '),

            // Additional Security Headers
            'Cross-Origin-Opener-Policy': isProd() ? 'same-origin' : 'same-origin-allow-popups',
            'Cross-Origin-Embedder-Policy': isProd() ? 'require-corp' : 'unsafe-none',
            'Cross-Origin-Resource-Policy': isProd() ? 'same-origin' : 'cross-origin',

            // HSTS (only on HTTPS in production)
            ...(isProd() && this.config.network.https?.hsts?.enabled ? {
                'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
            } : {})
        };

        // Remove server information
        delete headers['Server'];
        delete headers['X-Powered-By'];

        return headers;
    }

    /**
     * Generate Content Security Policy headers
     */
    generateCSPHeaders() {
        if (isLocal() && !this.config.api.xssProtection?.contentSecurityPolicy) {
            return {};
        }

        const cspConfig = this.config.api.xssProtection?.cspPolicy || {};

        // Build CSP directive
        const directives = [];

        // Default source
        directives.push("default-src 'self'");

        // Script source
        if (cspConfig.scriptSrc) {
            directives.push(`script-src ${cspConfig.scriptSrc.join(' ')}`);
        } else {
            directives.push("script-src 'self' 'unsafe-inline'");
        }

        // Style source
        if (cspConfig.styleSrc) {
            directives.push(`style-src ${cspConfig.styleSrc.join(' ')}`);
        } else {
            directives.push("style-src 'self' 'unsafe-inline'");
        }

        // Image source
        if (cspConfig.imgSrc) {
            directives.push(`img-src ${cspConfig.imgSrc.join(' ')}`);
        } else {
            directives.push("img-src 'self' data: https:");
        }

        // Font source
        if (cspConfig.fontSrc) {
            directives.push(`font-src ${cspConfig.fontSrc.join(' ')}`);
        } else {
            directives.push("font-src 'self'");
        }

        // Connect source
        if (cspConfig.connectSrc) {
            directives.push(`connect-src ${cspConfig.connectSrc.join(' ')}`);
        } else {
            directives.push("connect-src 'self' https://*.supabase.co");
        }

        // Frame source
        if (cspConfig.frameSrc) {
            directives.push(`frame-src ${cspConfig.frameSrc.join(' ')}`);
        } else {
            directives.push("frame-src 'none'");
        }

        // Object source
        if (cspConfig.objectSrc) {
            directives.push(`object-src ${cspConfig.objectSrc.join(' ')}`);
        } else {
            directives.push("object-src 'none'");
        }

        // Media source
        if (cspConfig.mediaSrc) {
            directives.push(`media-src ${cspConfig.mediaSrc.join(' ')}`);
        } else {
            directives.push("media-src 'self'");
        }

        // Additional directives for enhanced security
        directives.push("base-uri 'self'");
        directives.push("form-action 'self'");
        directives.push("upgrade-insecure-requests");

        return {
            'Content-Security-Policy': directives.join('; ')
        };
    }

    /**
     * Apply security headers to response
     */
    applyHeaders(req, res, next) {
        const headers = this.generateSecurityHeaders();

        // Apply headers
        Object.entries(headers).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                res.setHeader(key, value);
            }
        });

        // Add custom security headers
        res.setHeader('X-Security-Policy', 'offscreen-buddy-enhanced');
        res.setHeader('X-Request-ID', crypto.randomUUID());

        next();
    }
}

/**
 * Main Enhanced Security Middleware
 */
class EnhancedSecurityMiddleware {
    constructor() {
        this.rateLimiter = new EnhancedRateLimiter();
        this.requestProtection = new RequestProtection();
        this.securityHeaders = new AdvancedSecurityHeaders();
        this.config = getSecurityConfig();
    }

    /**
     * Complete enhanced security middleware stack
     */
    enhancedSecurity(req, res, next) {
        try {
            // 1. Apply enhanced security headers
            this.securityHeaders.applyHeaders(req, res, () => {

                // 2. Validate request size and apply timeout protection
                this.requestProtection.validateRequestSize(req, res, () => {

                    // 3. Apply rate limiting based on endpoint
                    if (req.path.includes('/register') || req.path.includes('/signup')) {
                        this.rateLimiter.checkRegistrationLimit(req, res, () => {
                            this.logSecurityEvent(req, res, 'registration_attempt_allowed');
                            next();
                        });
                    } else if (req.path.includes('/login')) {
                        this.rateLimiter.checkLoginLimit(req, res, () => {
                            this.logSecurityEvent(req, res, 'login_attempt_allowed');
                            next();
                        });
                    } else {
                        // Default rate limiting for other endpoints
                        this.logSecurityEvent(req, res, 'request_allowed');
                        next();
                    }
                });
            });

        } catch (error) {
            console.error('Enhanced security middleware error:', error);
            this.logSecurityEvent(req, res, 'enhanced_security_error', { error: error.message });
            next(error);
        }
    }

    /**
     * Record failed login attempt
     */
    recordFailedLogin(req) {
        this.rateLimiter.recordFailedLogin(req);
    }

    /**
     * Clear login attempts on successful login
     */
    clearLoginAttempts(identifier) {
        this.rateLimiter.clearLoginAttempts(identifier);
    }

    /**
     * Log security events
     */
    logSecurityEvent(req, res, eventType, details = {}) {
        if (!this.config.monitoring.security.enabled) {
            return;
        }

        const logData = {
            timestamp: new Date().toISOString(),
            eventType,
            requestId: res.getHeader('X-Request-ID'),
            method: req.method,
            path: req.path,
            clientIP: this.rateLimiter.getClientIP(req),
            userAgent: req.headers['user-agent'],
            environment: getEnvironment(),
            ...details
        };

        const logLevel = this.getLogLevel(eventType);

        switch (logLevel) {
            case 'error':
                console.error('SECURITY EVENT:', JSON.stringify(logData));
                break;
            case 'warn':
                console.warn('SECURITY EVENT:', JSON.stringify(logData));
                break;
            case 'info':
                console.info('SECURITY EVENT:', JSON.stringify(logData));
                break;
            default:
                console.log('SECURITY EVENT:', JSON.stringify(logData));
        }

        // Send alerts for critical events in production
        if (isProd() && this.config.monitoring.alerts.enabled) {
            if (['ip_blocked', 'registration_rate_limit_exceeded', 'login_rate_limit_exceeded'].includes(eventType)) {
                this.sendSecurityAlert(logData);
            }
        }
    }

    /**
     * Get log level for event type
     */
    getLogLevel(eventType) {
        const levelMap = {
            'ip_blocked': 'warn',
            'registration_rate_limit_exceeded': 'warn',
            'login_rate_limit_exceeded': 'warn',
            'enhanced_security_error': 'error',
            'suspicious_activity': 'error',
            'registration_attempt_allowed': 'info',
            'login_attempt_allowed': 'info',
            'request_allowed': 'debug'
        };

        return levelMap[eventType] || 'info';
    }

    /**
     * Send security alert (production only)
     */
    sendSecurityAlert(logData) {
        // Implementation would integrate with monitoring service
        console.log('🚨 SECURITY ALERT:', JSON.stringify(logData));
    }

    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        return {
            suspiciousIPs: this.rateLimiter.getSuspiciousIPsReport(),
            activeRequests: this.requestProtection.getActiveRequests(),
            blockedIPs: Array.from(this.rateLimiter.blockedIPs),
            registrationAttempts: this.rateLimiter.registrationAttempts.size,
            loginAttempts: this.rateLimiter.loginAttempts.size
        };
    }
}

// Create singleton instance
const enhancedSecurity = new EnhancedSecurityMiddleware();

/**
 * Express middleware exports
 */
const enhancedSecurityMiddleware = (req, res, next) => {
    enhancedSecurity.enhancedSecurity(req, res, next);
};

/**
 * Specialized middleware functions
 */
const enhancedRateLimit = {
    registration: (req, res, next) => {
        enhancedSecurity.rateLimiter.checkRegistrationLimit(req, res, next);
    },
    login: (req, res, next) => {
        enhancedSecurity.rateLimiter.checkLoginLimit(req, res, next);
    }
};

const requestProtection = (req, res, next) => {
    enhancedSecurity.requestProtection.validateRequestSize(req, res, next);
};

const securityHeadersAdvanced = (req, res, next) => {
    enhancedSecurity.securityHeaders.applyHeaders(req, res, next);
};

/**
 * Helper functions for routes
 */
const recordFailedLogin = (req) => {
    enhancedSecurity.recordFailedLogin(req);
};

const clearLoginAttempts = (identifier) => {
    enhancedSecurity.clearLoginAttempts(identifier);
};

const getSecurityMetrics = () => {
    return enhancedSecurity.getSecurityMetrics();
};

module.exports = {
    // Main middleware
    enhancedSecurityMiddleware,

    // Specialized middleware
    enhancedRateLimit,
    requestProtection,
    securityHeadersAdvanced,

    // Helper functions
    recordFailedLogin,
    clearLoginAttempts,
    getSecurityMetrics,

    // Classes for testing
    EnhancedRateLimiter,
    RequestProtection,
    AdvancedSecurityHeaders,

    // Main instance
    enhancedSecurity
};