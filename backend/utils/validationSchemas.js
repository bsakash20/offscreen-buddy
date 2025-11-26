/**
 * Comprehensive Input Validation Schemas
 * Provides strict validation patterns for all authentication and user data
 * Implements whitelist-based validation and comprehensive sanitization
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation Schema Manager
 */
class ValidationSchemaManager {
    constructor() {
        this.schemas = this.initializeSchemas();
        this.whitelistPatterns = this.initializeWhitelistPatterns();
        this.blockedPatterns = this.initializeBlockedPatterns();
    }

    /**
     * Initialize all validation schemas
     */
    initializeSchemas() {
        return {
            // User Registration Validation
            userRegistration: [
                body('email')
                    .isEmail()
                    .normalizeEmail()
                    .isLength({ max: 255 })
                    .withMessage('Valid email is required (max 255 characters)'),

                body('password')
                    .isLength({ min: 8, max: 128 })
                    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                    .withMessage('Password must be 8-128 characters with uppercase, lowercase, and number'),

                body('name')
                    .trim()
                    .isLength({ min: 2, max: 100 })
                    .matches(/^[a-zA-ZÀ-ž\s\-']+$/)
                    .withMessage('Name must be 2-100 characters, letters only with spaces, hyphens, apostrophes'),

                body('phone')
                    .optional()
                    .trim()
                    .matches(/^\+?[\d\s\-()]{10,20}$/)
                    .withMessage('Phone must be in international format (10-20 digits)'),

                body('countryCode')
                    .optional()
                    .isLength({ min: 2, max: 2 })
                    .isAlpha()
                    .toUpperCase()
                    .withMessage('Country code must be 2-letter ISO code'),

                body('deviceId')
                    .optional()
                    .trim()
                    .isLength({ min: 1, max: 255 })
                    .matches(/^[a-zA-Z0-9\-_]+$/)
                    .withMessage('Device ID must be alphanumeric with hyphens/underscores only')
            ],

            // User Login Validation
            userLogin: [
                body('identifier')
                    .trim()
                    .isLength({ min: 1, max: 255 })
                    .isEmail()
                    .normalizeEmail()
                    .withMessage('Valid email is required'),

                body('password')
                    .isLength({ min: 1, max: 128 })
                    .withMessage('Password is required')
            ],

            // Onboarding Step Validation
            onboardingStep: [
                body('step')
                    .isIn(['country', 'phone', 'password'])
                    .withMessage('Invalid onboarding step'),

                body('data')
                    .optional()
                    .isObject()
                    .withMessage('Data must be an object')
            ],

            // Country Selection Validation
            countrySelection: [
                body('data.countryCode')
                    .isLength({ min: 2, max: 2 })
                    .isAlpha()
                    .toUpperCase()
                    .withMessage('Valid country code is required')
            ],

            // Phone Verification Validation
            phoneVerification: [
                body('data.phone')
                    .trim()
                    .matches(/^\+?[\d\s\-()]{10,20}$/)
                    .withMessage('Valid phone number in international format is required')
            ],

            // Password Update Validation
            passwordUpdate: [
                body('data.password')
                    .isLength({ min: 8, max: 128 })
                    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
                    .withMessage('Password must be 8-128 characters with uppercase, lowercase, and number')
            ],

            // Generic ID Parameter Validation
            idParam: [
                param('id')
                    .isUUID()
                    .withMessage('Valid UUID is required')
            ],

            // Query Parameter Validation
            paginationQuery: [
                query('page')
                    .optional()
                    .isInt({ min: 1 })
                    .withMessage('Page must be a positive integer'),

                query('limit')
                    .optional()
                    .isInt({ min: 1, max: 100 })
                    .withMessage('Limit must be between 1 and 100'),

                query('sort')
                    .optional()
                    .isIn(['asc', 'desc', 'ASC', 'DESC'])
                    .withMessage('Sort must be asc or desc')
            ],

            // Search Query Validation
            searchQuery: [
                query('q')
                    .optional()
                    .trim()
                    .isLength({ min: 1, max: 100 })
                    .matches(/^[a-zA-Z0-9\s\-_.@]+$/)
                    .withMessage('Search query must be alphanumeric with spaces, hyphens, dots, underscores, @ only')
            ],

            // Settings Update Validation
            settingsUpdate: [
                body('notifications')
                    .optional()
                    .isBoolean()
                    .withMessage('Notifications must be boolean'),

                body('theme')
                    .optional()
                    .isIn(['light', 'dark', 'auto'])
                    .withMessage('Theme must be light, dark, or auto'),

                body('language')
                    .optional()
                    .isLength({ min: 2, max: 5 })
                    .matches(/^[a-z]{2}(-[A-Z]{2})?$/)
                    .withMessage('Language must be valid locale code (e.g., en, en-US)')
            ],

            // Profile Update Validation
            profileUpdate: [
                body('name')
                    .optional()
                    .trim()
                    .isLength({ min: 2, max: 100 })
                    .matches(/^[a-zA-ZÀ-ž\s\-']+$/)
                    .withMessage('Name must be 2-100 characters, letters only with spaces, hyphens, apostrophes'),

                body('phone')
                    .optional()
                    .trim()
                    .matches(/^\+?[\d\s\-()]{10,20}$/)
                    .withMessage('Phone must be in international format'),

                body('countryCode')
                    .optional()
                    .isLength({ min: 2, max: 2 })
                    .isAlpha()
                    .toUpperCase()
                    .withMessage('Country code must be 2-letter ISO code')
            ],

            // Payment Validation
            paymentData: [
                body('amount')
                    .isFloat({ min: 1, max: 100000 })
                    .withMessage('Amount must be between 1 and 100000'),

                body('currency')
                    .optional()
                    .isIn(['INR', 'USD'])
                    .withMessage('Currency must be INR or USD'),

                body('description')
                    .optional()
                    .trim()
                    .isLength({ min: 1, max: 255 })
                    .withMessage('Description must be 1-255 characters')
            ],

            // Device Registration Validation
            deviceRegistration: [
                body('deviceId')
                    .trim()
                    .isLength({ min: 1, max: 255 })
                    .matches(/^[a-zA-Z0-9\-_]+$/)
                    .withMessage('Device ID must be alphanumeric with hyphens/underscores only'),

                body('platform')
                    .optional()
                    .isIn(['ios', 'android', 'web'])
                    .withMessage('Platform must be ios, android, or web'),

                body('appVersion')
                    .optional()
                    .trim()
                    .isLength({ min: 1, max: 50 })
                    .matches(/^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/)
                    .withMessage('App version must be semantic version format')
            ]
        };
    }

    /**
     * Initialize whitelist patterns for different data types
     */
    initializeWhitelistPatterns() {
        return {
            email: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
            name: /^[a-zA-ZÀ-ž\s\-']{2,100}$/,
            phone: /^\+?[\d\s\-()]{10,20}$/,
            countryCode: /^[A-Z]{2}$/,
            alphanumeric: /^[a-zA-Z0-9\-_]+$/,
            uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            url: /^https?:\/\/[^\s$.?#].[^\s]*$/i,
            json: /^[\[\{][\s\S]*[\]\}]$/,
            date: /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/,
            semver: /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9]+)?$/
        };
    }

    /**
     * Initialize blocked patterns for security
     */
    initializeBlockedPatterns() {
        return {
            xss: [
                /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
                /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
                /javascript:/gi,
                /vbscript:/gi,
                /data:/gi,
                /onload\s*=/gi,
                /onerror\s*=/gi,
                /onclick\s*=/gi
            ],
            sqlInjection: [
                /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
                /('|(\\x27)|(\\x2D)|(\\x2D))/i,
                /(union.*select|or\s+1=1|and\s+1=1)/i,
                /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?\b)/i
            ],
            pathTraversal: [
                /\.\.[\/\\]/,
                /[\/\\]\.\.[\/\\]/,
                /\.\.%2f/i,
                /%2e%2e%2f/gi
            ],
            commandInjection: [
                /[;&|`$()]/,
                /\b(curl|wget|nc|netcat|telnet|ssh|ftp)\b/i
            ],
            genericInjection: [
                /<[^>]*>/g,
                /javascript:/gi,
                /vbscript:/gi,
                /data:/gi,
                /file:/gi
            ]
        };
    }

    /**
     * Get validation schema by name
     */
    getSchema(schemaName) {
        return this.schemas[schemaName] || [];
    }

    /**
     * Validate input against whitelist patterns
     */
    validateWhitelist(input, patternType) {
        const pattern = this.whitelistPatterns[patternType];
        if (!pattern) return false;
        return pattern.test(input);
    }

    /**
     * Check input against blocked patterns
     */
    checkBlockedPatterns(input, patternType = 'genericInjection') {
        const patterns = this.blockedPatterns[patternType] || this.blockedPatterns.genericInjection;
        return patterns.some(pattern => pattern.test(input));
    }

    /**
     * Comprehensive input sanitization
     */
    sanitizeInput(input, type) {
        if (typeof input !== 'string') return input;

        let sanitized = input;

        // Remove null bytes and control characters
        sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, '');

        // Type-specific sanitization
        switch (type) {
            case 'email':
                sanitized = sanitized.toLowerCase().trim();
                break;
            case 'name':
                sanitized = sanitized.trim();
                break;
            case 'phone':
                sanitized = sanitized.replace(/[^\d+]/g, '');
                break;
            case 'countryCode':
                sanitized = sanitized.toUpperCase().trim();
                break;
            default:
                sanitized = sanitized.trim();
        }

        return sanitized;
    }

    /**
     * Validate and sanitize batch inputs
     */
    validateBatch(data, rules) {
        const results = {
            isValid: true,
            sanitized: {},
            errors: {},
            warnings: []
        };

        Object.entries(rules).forEach(([field, rule]) => {
            const value = data[field];
            const fieldErrors = [];

            // Required field validation
            if (rule.required && (value === undefined || value === null || value === '')) {
                fieldErrors.push(`${field} is required`);
                results.isValid = false;
                return;
            }

            if (value === undefined || value === null) {
                results.sanitized[field] = value;
                return;
            }

            // Type validation
            if (rule.type && typeof value !== rule.type) {
                fieldErrors.push(`${field} must be of type ${rule.type}`);
                results.isValid = false;
                return;
            }

            // Length validation
            if (rule.minLength && String(value).length < rule.minLength) {
                fieldErrors.push(`${field} must be at least ${rule.minLength} characters`);
                results.isValid = false;
            }

            if (rule.maxLength && String(value).length > rule.maxLength) {
                fieldErrors.push(`${field} must be at most ${rule.maxLength} characters`);
                results.isValid = false;
            }

            // Pattern validation
            if (rule.pattern && !rule.pattern.test(String(value))) {
                fieldErrors.push(`${field} format is invalid`);
                results.isValid = false;
            }

            // Whitelist validation
            if (rule.whitelist && !this.validateWhitelist(String(value), rule.whitelist)) {
                fieldErrors.push(`${field} contains invalid characters`);
                results.isValid = false;
            }

            // Blocked pattern check
            if (rule.checkBlocked !== false && this.checkBlockedPatterns(String(value))) {
                fieldErrors.push(`${field} contains potentially dangerous content`);
                results.isValid = false;
            }

            // Sanitize input
            const sanitizedValue = rule.sanitize !== false ? this.sanitizeInput(String(value), rule.type || 'string') : value;
            results.sanitized[field] = sanitizedValue;

            if (fieldErrors.length > 0) {
                results.errors[field] = fieldErrors;
            }
        });

        return results;
    }

    /**
     * Express middleware wrapper for validation schemas
     */
    validate(schemaName) {
        const schema = this.getSchema(schemaName);
        return [...schema, this.handleValidationErrors];
    }

    /**
     * Handle validation errors
     */
    handleValidationErrors(req, res, next) {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                message: 'Please check your input data',
                details: errors.array(),
                validationErrors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg,
                    value: err.value
                }))
            });
        }
        next();
    }

    /**
     * Get validation statistics
     */
    getValidationStats() {
        return {
            totalSchemas: Object.keys(this.schemas).length,
            whitelistPatterns: Object.keys(this.whitelistPatterns).length,
            blockedPatternTypes: Object.keys(this.blockedPatterns).length,
            schemas: Object.keys(this.schemas)
        };
    }
}

// Create singleton instance
const validationSchemaManager = new ValidationSchemaManager();

// Express middleware exports
const validateUserRegistration = validationSchemaManager.validate('userRegistration');
const validateUserLogin = validationSchemaManager.validate('userLogin');
const validateOnboardingStep = validationSchemaManager.validate('onboardingStep');
const validateCountrySelection = validationSchemaManager.validate('countrySelection');
const validatePhoneVerification = validationSchemaManager.validate('phoneVerification');
const validatePasswordUpdate = validationSchemaManager.validate('passwordUpdate');
const validateIdParam = validationSchemaManager.validate('idParam');
const validatePaginationQuery = validationSchemaManager.validate('paginationQuery');
const validateSearchQuery = validationSchemaManager.validate('searchQuery');
const validateSettingsUpdate = validationSchemaManager.validate('settingsUpdate');
const validateProfileUpdate = validationSchemaManager.validate('profileUpdate');
const validatePaymentData = validationSchemaManager.validate('paymentData');
const validateDeviceRegistration = validationSchemaManager.validate('deviceRegistration');

module.exports = {
    // Main manager class
    ValidationSchemaManager,
    validationSchemaManager,

    // Express middleware validators
    validateUserRegistration,
    validateUserLogin,
    validateOnboardingStep,
    validateCountrySelection,
    validatePhoneVerification,
    validatePasswordUpdate,
    validateIdParam,
    validatePaginationQuery,
    validateSearchQuery,
    validateSettingsUpdate,
    validateProfileUpdate,
    validatePaymentData,
    validateDeviceRegistration,

    // Utility functions
    validateBatch: (data, rules) => validationSchemaManager.validateBatch(data, rules),
    sanitizeInput: (input, type) => validationSchemaManager.sanitizeInput(input, type),
    validateWhitelist: (input, patternType) => validationSchemaManager.validateWhitelist(input, patternType),
    checkBlockedPatterns: (input, patternType) => validationSchemaManager.checkBlockedPatterns(input, patternType),
    getValidationStats: () => validationSchemaManager.getValidationStats()
};