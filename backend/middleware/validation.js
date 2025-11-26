/**
 * Enhanced Validation Middleware
 * Provides comprehensive input validation and sanitization
 * Integrates with security configuration for environment-specific rules
 */

const { getSecurityConfig, isSecurityLocal, isSecurityProd } = require('../config/security');
const { logSecurityEvent } = require('./security');

/**
 * Validation Middleware Manager
 * Handles comprehensive input validation and sanitization
 */
class ValidationMiddleware {
  constructor() {
    this.config = getSecurityConfig();
    this.setupValidationRules();
  }

  /**
   * Setup validation rules based on environment
   */
  setupValidationRules() {
    // Common validation patterns
    this.patterns = {
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      phone: /^\+?[\d\s\-\(\)]{10,15}$/,
      url: /^https?:\/\/[^\s$.?#].[^\s]*$/i,
      alphanumeric: /^[a-zA-Z0-9]+$/,
      alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
      numeric: /^\d+$/,
      decimal: /^\d*\.?\d+$/,
      uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      isoDate: /^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)?$/,
      creditCard: /^\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}$/,
      // Security patterns
      script: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      sqlInjection: /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION|SCRIPT)\b/i,
      xss: /<script|javascript:|vbscript:|onload=|onerror=|data:/gi
    };

    // Environment-specific rules
    if (isSecurityProd()) {
      this.applyProductionRules();
    } else {
      this.applyLocalRules();
    }
  }

  /**
   * Apply production-grade validation rules
   */
  applyProductionRules() {
    this.rules = {
      strictMode: true,
      maxDepth: 5,
      maxArraySize: 100,
      maxObjectKeys: 50,
      stringLength: {
        min: 1,
        max: 1000
      },
      arrayLength: {
        min: 0,
        max: 100
      },
      objectKeys: {
        min: 0,
        max: 50
      },
      numericRange: {
        min: -999999999,
        max: 999999999
      }
    };
  }

  /**
   * Apply local development validation rules
   */
  applyLocalRules() {
    this.rules = {
      strictMode: false,
      maxDepth: 10,
      maxArraySize: 1000,
      maxObjectKeys: 200,
      stringLength: {
        min: 0,
        max: 10000
      },
      arrayLength: {
        min: 0,
        max: 1000
      },
      objectKeys: {
        min: 0,
        max: 200
      },
      numericRange: {
        min: -9999999999,
        max: 9999999999
      }
    };
  }

  /**
   * Main validation middleware
   */
  validate(schema, options = {}) {
    return (req, res, next) => {
      try {
        const validationResult = this.validateRequest(req, schema, options);
        
        if (!validationResult.isValid) {
          logSecurityEvent(req, res, 'validation_failed', {
            errors: validationResult.errors,
            schema: schema.constructor.name
          });
          
          return res.status(400).json({
            error: 'Validation failed',
            details: validationResult.errors
          });
        }

        // Apply sanitization if enabled
        if (options.sanitize !== false) {
          this.sanitizeValidatedData(req, validationResult.data);
        }

        next();
      } catch (error) {
        console.error('Validation middleware error:', error);
        logSecurityEvent(req, res, 'validation_error', { error: error.message });
        
        return res.status(500).json({
          error: 'Validation error'
        });
      }
    };
  }

  /**
   * Validate request data against schema
   */
  validateRequest(req, schema, options) {
    const errors = [];
    const data = {};

    // Validate body
    if (schema.body) {
      const bodyResult = this.validateData(req.body, schema.body, 'body', errors);
      if (bodyResult) data.body = bodyResult;
    }

    // Validate query
    if (schema.query) {
      const queryResult = this.validateData(req.query, schema.query, 'query', errors);
      if (queryResult) data.query = queryResult;
    }

    // Validate params
    if (schema.params) {
      const paramsResult = this.validateData(req.params, schema.params, 'params', errors);
      if (paramsResult) data.params = paramsResult;
    }

    // Validate headers
    if (schema.headers) {
      const headersResult = this.validateData(req.headers, schema.headers, 'headers', errors);
      if (headersResult) data.headers = headersResult;
    }

    // Custom validation
    if (schema.custom && typeof schema.custom === 'function') {
      try {
        const customResult = schema.custom(req, data);
        if (!customResult.isValid) {
          errors.push(...customResult.errors);
        }
      } catch (error) {
        errors.push(`Custom validation error: ${error.message}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      data: errors.length === 0 ? data : null
    };
  }

  /**
   * Validate data against field schema
   */
  validateData(data, schema, path, errors) {
    if (!data && schema.required) {
      errors.push(`${path}: Required field missing`);
      return null;
    }

    if (!data) return null;

    const result = {};
    const dataObj = typeof data === 'string' ? { value: data } : data;

    for (const [field, fieldSchema] of Object.entries(schema)) {
      const fieldPath = `${path}.${field}`;
      const value = dataObj[field];

      const fieldResult = this.validateField(value, fieldSchema, fieldPath, errors);
      if (fieldResult !== undefined) {
        result[field] = fieldResult;
      }
    }

    return result;
  }

  /**
   * Validate individual field
   */
  validateField(value, schema, path, errors) {
    // Type validation
    if (schema.type) {
      if (!this.validateType(value, schema.type)) {
        errors.push(`${path}: Expected ${schema.type}, got ${typeof value}`);
        return null;
      }
    }

    // Handle null/undefined
    if (value === null || value === undefined) {
      if (schema.required) {
        errors.push(`${path}: Required field missing`);
      }
      return schema.default !== undefined ? schema.default : null;
    }

    // Type-specific validation
    switch (schema.type) {
      case 'string':
        return this.validateString(value, schema, path, errors);
      case 'number':
        return this.validateNumber(value, schema, path, errors);
      case 'boolean':
        return this.validateBoolean(value, schema, path, errors);
      case 'array':
        return this.validateArray(value, schema, path, errors);
      case 'object':
        return this.validateObject(value, schema, path, errors);
      case 'email':
        return this.validateEmail(value, schema, path, errors);
      case 'url':
        return this.validateUrl(value, schema, path, errors);
      case 'date':
        return this.validateDate(value, schema, path, errors);
      case 'uuid':
        return this.validateUUID(value, schema, path, errors);
      default:
        return value;
    }
  }

  /**
   * Validate string field
   */
  validateString(value, schema, path, errors) {
    if (typeof value !== 'string') {
      errors.push(`${path}: Expected string, got ${typeof value}`);
      return null;
    }

    // Length validation
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: Minimum length is ${schema.minLength}`);
    }

    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${path}: Maximum length is ${schema.maxLength}`);
    }

    // Pattern validation
    if (schema.pattern) {
      const regex = schema.pattern instanceof RegExp ? schema.pattern : new RegExp(schema.pattern);
      if (!regex.test(value)) {
        errors.push(`${path}: Does not match required pattern`);
      }
    }

    // Custom validation
    if (schema.validate && typeof schema.validate === 'function') {
      try {
        const isValid = schema.validate(value);
        if (!isValid) {
          errors.push(`${path}: Custom validation failed`);
        }
      } catch (error) {
        errors.push(`${path}: Validation error - ${error.message}`);
      }
    }

    // Security checks
    if (this.rules.strictMode) {
      // Check for dangerous patterns
      if (this.patterns.script.test(value)) {
        errors.push(`${path}: Script tags not allowed`);
      }

      if (this.patterns.sqlInjection.test(value)) {
        errors.push(`${path}: Potential SQL injection detected`);
      }

      if (this.patterns.xss.test(value)) {
        errors.push(`${path}: XSS patterns detected`);
      }
    }

    return value;
  }

  /**
   * Validate number field
   */
  validateNumber(value, schema, path, errors) {
    const num = Number(value);
    
    if (isNaN(num)) {
      errors.push(`${path}: Expected number, got ${value}`);
      return null;
    }

    // Range validation
    if (schema.min !== undefined && num < schema.min) {
      errors.push(`${path}: Minimum value is ${schema.min}`);
    }

    if (schema.max !== undefined && num > schema.max) {
      errors.push(`${path}: Maximum value is ${schema.max}`);
    }

    // Integer validation
    if (schema.integer && !Number.isInteger(num)) {
      errors.push(`${path}: Expected integer value`);
    }

    // Positive validation
    if (schema.positive && num <= 0) {
      errors.push(`${path}: Expected positive value`);
    }

    return num;
  }

  /**
   * Validate boolean field
   */
  validateBoolean(value, schema, path, errors) {
    if (typeof value !== 'boolean') {
      errors.push(`${path}: Expected boolean, got ${typeof value}`);
      return null;
    }

    return value;
  }

  /**
   * Validate array field
   */
  validateArray(value, schema, path, errors) {
    if (!Array.isArray(value)) {
      errors.push(`${path}: Expected array, got ${typeof value}`);
      return null;
    }

    // Length validation
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: Minimum array length is ${schema.minItems}`);
    }

    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: Maximum array length is ${schema.maxItems}`);
    }

    // Max array size check
    if (value.length > this.rules.maxArraySize) {
      errors.push(`${path}: Array size exceeds limit`);
      return null;
    }

    // Validate items if schema is provided
    if (schema.items) {
      return value.map((item, index) => {
        const itemPath = `${path}[${index}]`;
        const errorsCopy = [];
        const result = this.validateField(item, schema.items, itemPath, errorsCopy);
        
        if (errorsCopy.length > 0) {
          errors.push(...errorsCopy);
        }
        
        return result;
      });
    }

    return value;
  }

  /**
   * Validate object field
   */
  validateObject(value, schema, path, errors) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      errors.push(`${path}: Expected object, got ${typeof value}`);
      return null;
    }

    // Key count validation
    const keys = Object.keys(value);
    if (keys.length > this.rules.maxObjectKeys) {
      errors.push(`${path}: Object has too many keys`);
    }

    if (schema.properties) {
      const result = {};
      
      // Validate defined properties
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (value.hasOwnProperty(key)) {
          const propPath = `${path}.${key}`;
          const propResult = this.validateField(value[key], propSchema, propPath, errors);
          if (propResult !== undefined) {
            result[key] = propResult;
          }
        } else if (propSchema.required) {
          errors.push(`${path}.${key}: Required property missing`);
        }
      }

      // Check for additional properties if not allowed
      if (schema.additionalProperties === false) {
        for (const key of keys) {
          if (!schema.properties[key]) {
            errors.push(`${path}.${key}: Additional properties not allowed`);
          }
        }
      }

      return result;
    }

    return value;
  }

  /**
   * Validate email field
   */
  validateEmail(value, schema, path, errors) {
    if (!this.patterns.email.test(value)) {
      errors.push(`${path}: Invalid email format`);
      return null;
    }

    return value.toLowerCase();
  }

  /**
   * Validate URL field
   */
  validateUrl(value, schema, path, errors) {
    try {
      const url = new URL(value);
      
      // Protocol validation
      if (schema.allowedProtocols && !schema.allowedProtocols.includes(url.protocol)) {
        errors.push(`${path}: Protocol ${url.protocol} not allowed`);
        return null;
      }

      // Domain validation
      if (schema.allowedDomains) {
        const hostname = url.hostname.toLowerCase();
        const isAllowed = schema.allowedDomains.some(domain => {
          if (domain.startsWith('*.')) {
            return hostname.endsWith(domain.substring(1));
          }
          return hostname === domain;
        });

        if (!isAllowed) {
          errors.push(`${path}: Domain not allowed`);
          return null;
        }
      }

      return value;
    } catch (error) {
      errors.push(`${path}: Invalid URL format`);
      return null;
    }
  }

  /**
   * Validate date field
   */
  validateDate(value, schema, path, errors) {
    const date = new Date(value);
    
    if (isNaN(date.getTime())) {
      errors.push(`${path}: Invalid date format`);
      return null;
    }

    // Range validation
    if (schema.minDate) {
      const minDate = new Date(schema.minDate);
      if (date < minDate) {
        errors.push(`${path}: Date must be after ${schema.minDate}`);
      }
    }

    if (schema.maxDate) {
      const maxDate = new Date(schema.maxDate);
      if (date > maxDate) {
        errors.push(`${path}: Date must be before ${schema.maxDate}`);
      }
    }

    return date.toISOString();
  }

  /**
   * Validate UUID field
   */
  validateUUID(value, schema, path, errors) {
    if (!this.patterns.uuid.test(value)) {
      errors.push(`${path}: Invalid UUID format`);
      return null;
    }

    return value.toLowerCase();
  }

  /**
   * Validate data type
   */
  validateType(value, expectedType) {
    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value);
      case 'email':
      case 'url':
      case 'date':
      case 'uuid':
        return typeof value === 'string';
      default:
        return true;
    }
  }

  /**
   * Sanitize validated data
   */
  sanitizeValidatedData(req, validationResult) {
    if (!validationResult.data) return;

    // Sanitize each data section
    ['body', 'query', 'params', 'headers'].forEach(section => {
      if (validationResult.data[section]) {
        req[section] = this.sanitizeObject(validationResult.data[section]);
      }
    });
  }

  /**
   * Sanitize object recursively
   */
  sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return obj
        .replace(/\0/g, '') // Remove null bytes
        .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
        .trim();
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = key.replace(/[^\w.-]/g, '');
        sanitized[sanitizedKey] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}

// Create singleton instance
const validationMiddleware = new ValidationMiddleware();

/**
 * Validation middleware factory
 */
const validate = (schema, options = {}) => {
  return validationMiddleware.validate(schema, options);
};

/**
 * Predefined validation schemas
 */
const schemas = {
  // User registration
  userRegistration: {
    body: {
      email: { type: 'email', required: true, maxLength: 255 },
      password: { type: 'string', required: true, minLength: 6, maxLength: 128 },
      name: { type: 'string', required: true, maxLength: 100 }
    }
  },

  // User login
  userLogin: {
    body: {
      email: { type: 'email', required: true },
      password: { type: 'string', required: true }
    }
  },

  // Payment data
  paymentData: {
    body: {
      amount: { type: 'number', required: true, min: 1, max: 100000 },
      currency: { type: 'string', required: true, pattern: /^[A-Z]{3}$/ },
      description: { type: 'string', maxLength: 255 }
    }
  },

  // Generic ID parameter
  idParam: {
    params: {
      id: { type: 'uuid', required: true }
    }
  },

  // Pagination query
  paginationQuery: {
    query: {
      page: { type: 'number', min: 1, default: 1 },
      limit: { type: 'number', min: 1, max: 100, default: 20 },
      sort: { type: 'string', maxLength: 50 },
      order: { type: 'string', pattern: /^(asc|desc)$/i }
    }
  }
};

/**
 * Common validation middleware
 */
const validateUserRegistration = validate(schemas.userRegistration);
const validateUserLogin = validate(schemas.userLogin);
const validatePaymentData = validate(schemas.paymentData);
const validateIdParam = validate(schemas.idParam);
const validatePagination = validate(schemas.paginationQuery);

/**
 * Sanitization middleware
 */
const sanitize = (req, res, next) => {
  if (req.body) req.body = validationMiddleware.sanitizeObject(req.body);
  if (req.query) req.query = validationMiddleware.sanitizeObject(req.query);
  if (req.params) req.params = validationMiddleware.sanitizeObject(req.params);
  next();
};

module.exports = {
  // Main validation function
  validate,
  
  // Predefined validation schemas
  schemas,
  
  // Common validation middleware
  validateUserRegistration,
  validateUserLogin,
  validatePaymentData,
  validateIdParam,
  validatePagination,
  
  // Sanitization
  sanitize,
  
  // Validation middleware instance
  validationMiddleware
};