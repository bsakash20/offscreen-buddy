/**
 * Secure Error Handling System
 * Ensures no sensitive information is exposed in error messages
 * Provides comprehensive error logging without data leakage
 */

const { getSecurityConfig, isSecurityProd } = require('../config/security');

/**
 * Error Classification Manager
 */
class ErrorClassificationManager {
    constructor() {
        this.config = getSecurityConfig();
        this.errorPatterns = this.initializeErrorPatterns();
        this.sensitiveFields = this.initializeSensitiveFields();
    }

    /**
     * Initialize error patterns for classification
     */
    initializeErrorPatterns() {
        return {
            authentication: {
                patterns: [
                    /authentication.*failed/i,
                    /invalid.*credentials/i,
                    /unauthorized/i,
                    /token.*expired/i,
                    /session.*invalid/i
                ],
                publicMessage: 'Authentication failed',
                sensitive: true
            },
            authorization: {
                patterns: [
                    /access.*denied/i,
                    /forbidden/i,
                    /permission.*denied/i,
                    /insufficient.*privileges/i
                ],
                publicMessage: 'Access denied',
                sensitive: true
            },
            validation: {
                patterns: [
                    /validation.*failed/i,
                    /invalid.*input/i,
                    /required.*field/i,
                    /format.*invalid/i
                ],
                publicMessage: 'Invalid input provided',
                sensitive: false
            },
            rateLimit: {
                patterns: [
                    /rate.*limit/i,
                    /too.*many.*requests/i,
                    /quota.*exceeded/i
                ],
                publicMessage: 'Too many requests. Please try again later.',
                sensitive: false
            },
            server: {
                patterns: [
                    /internal.*server.*error/i,
                    /unexpected.*error/i,
                    /system.*error/i
                ],
                publicMessage: 'An unexpected error occurred',
                sensitive: true
            },
            database: {
                patterns: [
                    /database.*error/i,
                    /connection.*failed/i,
                    /query.*failed/i,
                    /sql.*error/i
                ],
                publicMessage: 'Service temporarily unavailable',
                sensitive: true
            },
            network: {
                patterns: [
                    /network.*error/i,
                    /connection.*timeout/i,
                    /service.*unavailable/i
                ],
                publicMessage: 'Network error occurred',
                sensitive: false
            }
        };
    }

    /**
     * Initialize sensitive data fields
     */
    initializeSensitiveFields() {
        return [
            // Authentication data
            'password', 'password_hash', 'token', 'access_token', 'refresh_token',
            'secret', 'key', 'api_key', 'private_key', 'public_key',

            // Personal data
            'ssn', 'social_security', 'credit_card', 'cvv', 'pin',
            'phone_number', 'address', 'date_of_birth',

            // System data
            'database', 'connection_string', 'connection', 'server',
            'stack_trace', 'error_stack', 'source_map',

            // File system
            'file_path', 'directory', 'file_name', 'file_content',

            // Network
            'ip_address', 'user_agent', 'referer', 'host',

            // Session data
            'session_id', 'cookie', 'session_data', 'user_session',

            // Configuration
            'config', 'environment', 'debug', 'log_level'
        ];
    }

    /**
     * Classify error based on message and context
     */
    classifyError(error) {
        const errorMessage = (error.message || error.toString()).toLowerCase();
        const errorType = error.constructor.name.toLowerCase();

        for (const [category, config] of Object.entries(this.errorPatterns)) {
            if (config.patterns.some(pattern => pattern.test(errorMessage))) {
                return {
                    category,
                    isSensitive: config.sensitive,
                    publicMessage: config.publicMessage
                };
            }
        }

        // Default classification
        return {
            category: 'unknown',
            isSensitive: true, // Assume sensitive by default
            publicMessage: 'An error occurred'
        };
    }

    /**
     * Check if field contains sensitive data
     */
    isSensitiveField(fieldName) {
        const lowerFieldName = fieldName.toLowerCase();
        return this.sensitiveFields.some(sensitive =>
            lowerFieldName.includes(sensitive.toLowerCase()) ||
            sensitive.toLowerCase().includes(lowerFieldName)
        );
    }

    /**
     * Sanitize data by removing sensitive fields
     */
    sanitizeData(data, level = 'basic') {
        if (!data || typeof data !== 'object') {
            return data;
        }

        const sanitized = Array.isArray(data) ? [] : {};

        for (const [key, value] of Object.entries(data)) {
            if (this.isSensitiveField(key)) {
                // Replace sensitive data with placeholder
                sanitized[key] = this.getSensitivePlaceholder(key, level);
            } else if (typeof value === 'object' && value !== null) {
                // Recursively sanitize nested objects
                sanitized[key] = this.sanitizeData(value, level);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Get placeholder for sensitive data
     */
    getSensitivePlaceholder(fieldName, level) {
        const lowerFieldName = fieldName.toLowerCase();

        if (level === 'strict') {
            return '[REDACTED]';
        }

        // Provide contextual placeholders
        if (lowerFieldName.includes('password')) {
            return '[PASSWORD]';
        }
        if (lowerFieldName.includes('token')) {
            return '[TOKEN]';
        }
        if (lowerFieldName.includes('email')) {
            return '[EMAIL]';
        }
        if (lowerFieldName.includes('phone')) {
            return '[PHONE]';
        }
        if (lowerFieldName.includes('ip')) {
            return '[IP_ADDRESS]';
        }
        if (lowerFieldName.includes('stack') || lowerFieldName.includes('trace')) {
            return '[STACK_TRACE]';
        }

        return '[REDACTED]';
    }
}

/**
 * Secure Error Logger
 */
class SecureErrorLogger {
    constructor() {
        this.config = getSecurityConfig();
        this.classificationManager = new ErrorClassificationManager();
        this.logLevels = ['error', 'warn', 'info', 'debug'];
    }

    /**
     * Log error securely
     */
    logError(error, context = {}, options = {}) {
        const {
            level = 'error',
            sanitize = true,
            includeStack = false,
            request = null,
            user = null
        } = options;

        if (!this.logLevels.includes(level)) {
            level = 'error';
        }

        const classification = this.classificationManager.classifyError(error);

        // Create secure log entry
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            category: classification.category,
            errorType: error.constructor.name,
            message: classification.publicMessage,
            isSensitive: classification.isSensitive,

            // Context (sanitized if needed)
            context: sanitize ? this.sanitizeContext(context) : context,

            // Request information (sanitized)
            request: request ? this.sanitizeRequest(request) : null,

            // User information (sanitized)
            user: user ? this.sanitizeUser(user) : null,

            // Environment information
            environment: isSecurityProd() ? 'production' : 'development',

            // Stack trace (only if explicitly requested and not sensitive)
            stackTrace: includeStack && !classification.isSensitive ? error.stack : null
        };

        // Write to appropriate log level
        switch (level) {
            case 'error':
                console.error(JSON.stringify(logEntry));
                break;
            case 'warn':
                console.warn(JSON.stringify(logEntry));
                break;
            case 'info':
                console.info(JSON.stringify(logEntry));
                break;
            case 'debug':
                console.debug(JSON.stringify(logEntry));
                break;
        }

        // In production, also send to external logging service
        if (isSecurityProd() && this.config.monitoring.alerts.enabled) {
            this.sendToExternalLogger(logEntry);
        }

        return logEntry;
    }

    /**
     * Sanitize context object
     */
    sanitizeContext(context) {
        const sanitized = {};

        for (const [key, value] of Object.entries(context)) {
            if (this.classificationManager.isSensitiveField(key)) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeData(value);
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Sanitize request object
     */
    sanitizeRequest(req) {
        if (!req) return null;

        return {
            method: req.method,
            url: req.url || req.originalUrl,
            ip: this.maskIP(req.ip || req.connection?.remoteAddress),
            userAgent: req.get('User-Agent') ? '[USER_AGENT]' : null,
            contentLength: req.get('Content-Length'),
            contentType: req.get('Content-Type'),

            // Remove sensitive headers
            headers: this.sanitizeHeaders(req.headers),

            // Sanitize query parameters
            query: this.sanitizeData(req.query),

            // Don't log request body for security (too risky)
            body: '[BODY_NOT_LOGGED]'
        };
    }

    /**
     * Sanitize user object
     */
    sanitizeUser(user) {
        if (!user) return null;

        return {
            id: user.id || user.userId,
            email: user.email ? this.maskEmail(user.email) : '[EMAIL]',
            // Remove other sensitive fields
            authenticated: !!user.id
        };
    }

    /**
     * Sanitize headers object
     */
    sanitizeHeaders(headers) {
        const sanitized = {};
        const sensitiveHeaders = [
            'authorization', 'cookie', 'x-api-key', 'x-auth-token',
            'x-secret', 'x-password', 'x-token'
        ];

        for (const [key, value] of Object.entries(headers)) {
            if (sensitiveHeaders.includes(key.toLowerCase())) {
                sanitized[key] = '[REDACTED]';
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }

    /**
     * Mask IP address
     */
    maskIP(ip) {
        if (!ip) return '[IP]';

        // Handle IPv4
        if (ip.includes('.')) {
            const parts = ip.split('.');
            return `${parts[0]}.${parts[1]}.***.***`;
        }

        // Handle IPv6
        if (ip.includes(':')) {
            return ip.substring(0, 19) + ':****';
        }

        return '[IP]';
    }

    /**
     * Mask email address
     */
    maskEmail(email) {
        if (!email || !email.includes('@')) return '[EMAIL]';

        const [local, domain] = email.split('@');
        const maskedLocal = local.length <= 2 ? '*'.repeat(local.length) : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];

        return `${maskedLocal}@${domain}`;
    }

    /**
     * Sanitize data recursively
     */
    sanitizeData(data) {
        if (typeof data === 'string') {
            return data;
        }

        if (Array.isArray(data)) {
            return data.map(item => this.sanitizeData(item));
        }

        if (data && typeof data === 'object') {
            const sanitized = {};
            for (const [key, value] of Object.entries(data)) {
                if (this.classificationManager.isSensitiveField(key)) {
                    sanitized[key] = '[REDACTED]';
                } else {
                    sanitized[key] = this.sanitizeData(value);
                }
            }
            return sanitized;
        }

        return data;
    }

    /**
     * Send log to external service (production only)
     */
    async sendToExternalLogger(logEntry) {
        // Implementation would send to services like DataDog, New Relic, etc.
        // This is a placeholder for the actual implementation
        console.log('External logger:', JSON.stringify(logEntry));
    }
}

/**
 * Secure Error Response Generator
 */
class SecureErrorResponse {
    constructor() {
        this.classificationManager = new ErrorClassificationManager();
        this.logger = new SecureErrorLogger();
    }

    /**
     * Generate secure error response
     */
    generateErrorResponse(error, options = {}) {
        const {
            statusCode = 500,
            includeDetails = false,
            includeRequestId = false,
            environment = 'development'
        } = options;

        const classification = this.classificationManager.classifyError(error);

        // Base response structure
        const response = {
            error: true,
            message: classification.publicMessage,
            timestamp: new Date().toISOString()
        };

        // Add request ID if requested
        if (includeRequestId) {
            response.requestId = this.generateRequestId();
        }

        // Add environment-specific details
        if (environment === 'development' && !classification.isSensitive && includeDetails) {
            response.details = {
                errorType: error.constructor.name,
                category: classification.category
            };

            // Only include stack trace in development and if not sensitive
            if (!classification.isSensitive) {
                response.details.stackTrace = error.stack;
            }
        }

        return {
            statusCode,
            response,
            shouldLog: true,
            classification
        };
    }

    /**
     * Generate request ID
     */
    generateRequestId() {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    /**
     * Handle different error types
     */
    handleError(error, req, res, options = {}) {
        const environment = isSecurityProd() ? 'production' : 'development';
        const errorResponse = this.generateErrorResponse(error, {
            ...options,
            environment
        });

        // Log the error securely
        this.logger.logError(error, {
            requestId: errorResponse.response.requestId,
            path: req?.path,
            method: req?.method
        }, {
            request: req,
            user: req?.user
        });

        // Send appropriate response
        res.status(errorResponse.statusCode).json(errorResponse.response);
    }

    /**
     * Handle validation errors
     */
    handleValidationError(error, req, res) {
        const response = {
            error: true,
            message: 'Validation failed',
            details: error.array ? error.array() : 'Invalid input provided',
            timestamp: new Date().toISOString()
        };

        // Log validation errors (usually not sensitive)
        this.logger.logError(new Error('Validation failed'), {
            validationErrors: response.details,
            path: req.path,
            method: req.method
        }, {
            request: req,
            level: 'warn'
        });

        res.status(400).json(response);
    }

    /**
     * Handle authentication errors
     */
    handleAuthError(error, req, res) {
        const response = {
            error: true,
            message: 'Authentication failed',
            timestamp: new Date().toISOString()
        };

        this.logger.logError(error, {
            path: req.path,
            method: req.method,
            ip: req.ip
        }, {
            request: req,
            level: 'warn'
        });

        res.status(401).json(response);
    }

    /**
     * Handle authorization errors
     */
    handleAuthzError(error, req, res) {
        const response = {
            error: true,
            message: 'Access denied',
            timestamp: new Date().toISOString()
        };

        this.logger.logError(error, {
            path: req.path,
            method: req.method,
            userId: req.user?.id
        }, {
            request: req,
            level: 'warn'
        });

        res.status(403).json(response);
    }

    /**
     * Handle rate limit errors
     */
    handleRateLimitError(req, res) {
        const response = {
            error: true,
            message: 'Too many requests. Please try again later.',
            retryAfter: 60, // seconds
            timestamp: new Date().toISOString()
        };

        this.logger.logError(new Error('Rate limit exceeded'), {
            path: req.path,
            method: req.method,
            ip: req.ip
        }, {
            request: req,
            level: 'warn'
        });

        res.status(429).json(response);
    }

    /**
     * Handle not found errors
     */
    handleNotFound(req, res) {
        const response = {
            error: true,
            message: 'Resource not found',
            timestamp: new Date().toISOString()
        };

        this.logger.logError(new Error('Not found'), {
            path: req.path,
            method: req.method,
            ip: req.ip
        }, {
            request: req,
            level: 'info'
        });

        res.status(404).json(response);
    }
}

/**
 * Express Error Handling Middleware
 */
class ExpressErrorHandler {
    constructor() {
        this.errorResponse = new SecureErrorResponse();
    }

    /**
     * Main error handling middleware
     */
    errorHandler() {
        return (error, req, res, next) => {
            // Handle different error types
            if (error.name === 'ValidationError') {
                this.errorResponse.handleValidationError(error, req, res);
            } else if (error.name === 'UnauthorizedError' || error.status === 401) {
                this.errorResponse.handleAuthError(error, req, res);
            } else if (error.status === 403) {
                this.errorResponse.handleAuthzError(error, req, res);
            } else if (error.status === 429) {
                this.errorResponse.handleRateLimitError(req, res);
            } else if (error.status === 404) {
                this.errorResponse.handleNotFound(req, res);
            } else {
                // Generic error handling
                this.errorResponse.handleError(error, req, res);
            }
        };
    }

    /**
     * 404 handler
     */
    notFoundHandler() {
        return (req, res) => {
            this.errorResponse.handleNotFound(req, res);
        };
    }

    /**
     * Async error wrapper
     */
    asyncWrapper(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }
}

// Create singleton instances
const classificationManager = new ErrorClassificationManager();
const secureErrorLogger = new SecureErrorLogger();
const secureErrorResponse = new SecureErrorResponse();
const expressErrorHandler = new ExpressErrorHandler();

module.exports = {
    // Main classes
    ErrorClassificationManager,
    SecureErrorLogger,
    SecureErrorResponse,
    ExpressErrorHandler,

    // Singleton instances
    classificationManager,
    secureErrorLogger,
    secureErrorResponse,
    expressErrorHandler,

    // Utility functions
    createClassificationManager: () => new ErrorClassificationManager(),
    createSecureErrorLogger: () => new SecureErrorLogger(),
    createSecureErrorResponse: () => new SecureErrorResponse(),
    createExpressErrorHandler: () => new ExpressErrorHandler(),

    // Helper functions
    maskSensitiveData: (data) => classificationManager.sanitizeData(data),
    classifyError: (error) => classificationManager.classifyError(error),
    isSensitiveField: (fieldName) => classificationManager.isSensitiveField(fieldName),

    // Express middleware
    errorHandler: expressErrorHandler.errorHandler(),
    notFoundHandler: expressErrorHandler.notFoundHandler(),
    asyncWrapper: expressErrorHandler.asyncWrapper
};