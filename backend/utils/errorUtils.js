/**
 * Error Utility Functions
 * Standardized error creation and response formatting utilities
 */

const { ERROR_SEVERITY } = require('../middleware/errorHandler');

/**
 * Create standardized error response object
 */
function createErrorResponse(errorAnalysis, recoveryAttempt = null) {
  const response = {
    success: false,
    error: {
      code: errorAnalysis.errorCode,
      category: errorAnalysis.category,
      severity: errorAnalysis.severity,
      message: errorAnalysis.userMessage,
      timestamp: new Date().toISOString()
    },
    meta: {
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0'
    }
  };

  // Add recovery information if available
  if (recoveryAttempt) {
    response.recovery = recoveryAttempt;
  }

  // Add detailed error information in development
  if (process.env.NODE_ENV === 'development') {
    response.error.details = errorAnalysis.metadata;
    response.error.stack = errorAnalysis.metadata.originalError?.stack;
  }

  // Add request correlation ID if available
  if (errorAnalysis.requestId) {
    response.meta.requestId = errorAnalysis.requestId;
  }

  return response;
}

/**
 * Create custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500, category = 'system', severity = 'medium') {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.category = category;
    this.severity = severity;
    this.isOperational = true;
    this.timestamp = new Date().toISOString();
    
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'validation', 'low');
    this.code = 'VALIDATION_ERROR';
    if (details) {
      this.details = details;
    }
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required', code = 'AUTH_REQUIRED') {
    super(message, 401, 'authentication', 'medium');
    this.code = code;
    this.isOperational = true;
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403, 'authorization', 'medium');
    this.code = 'ACCESS_DENIED';
    this.isOperational = true;
  }
}

class PaymentError extends AppError {
  constructor(message, details = {}, retryable = false) {
    super(message, 402, 'payment', 'high');
    this.code = 'PAYMENT_ERROR';
    this.paymentDetails = details;
    this.retryable = retryable;
    this.isOperational = true;
  }
}

class DatabaseError extends AppError {
  constructor(message, code = null, retryable = false) {
    super(message, 500, 'database', retryable ? 'high' : 'medium');
    this.code = code || 'DATABASE_ERROR';
    this.retryable = retryable;
    this.isOperational = !retryable;
  }
}

class ExternalServiceError extends AppError {
  constructor(message, serviceName = 'external', retryable = true) {
    super(message, 503, 'external_service', 'medium');
    this.code = 'SERVICE_UNAVAILABLE';
    this.serviceName = serviceName;
    this.retryable = retryable;
    this.isOperational = false;
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 429, 'rate_limit', 'low');
    this.code = 'RATE_LIMIT_EXCEEDED';
    this.retryAfter = retryAfter;
    this.retryable = true;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'validation', 'low');
    this.code = 'NOT_FOUND';
    this.isOperational = true;
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'validation', 'low');
    this.code = 'CONFLICT';
    this.isOperational = true;
  }
}

/**
 * Create structured error for payment failures
 */
function createPaymentError(message, paymentDetails = {}, context = {}) {
  const error = new PaymentError(message, paymentDetails, false);
  
  // Add payment-specific context
  error.paymentDetails = {
    ...paymentDetails,
    orderId: paymentDetails.orderId,
    amount: paymentDetails.amount,
    currency: paymentDetails.currency || 'INR',
    provider: paymentDetails.provider || 'PayU',
    transactionId: paymentDetails.transactionId,
    ...context
  };
  
  // Sanitize sensitive payment data
  const sensitiveFields = ['salt', 'merchantKey', 'hash', 'cvv', 'cardNumber'];
  sensitiveFields.forEach(field => {
    if (error.paymentDetails[field]) {
      error.paymentDetails[field] = '[REDACTED]';
    }
  });
  
  return error;
}

/**
 * Create structured error for validation failures
 */
function createValidationError(message, field = null, value = null, constraints = null) {
  const error = new ValidationError(message);
  
  error.field = field;
  error.value = value;
  error.constraints = constraints;
  
  error.details = {
    field,
    value: field ? '[REDACTED]' : value,
    constraints
  };
  
  return error;
}

/**
 * Create structured error for database operations
 */
function createDatabaseError(message, operation = null, table = null, code = null, retryable = false) {
  const error = new DatabaseError(message, code, retryable);
  
  error.operation = operation;
  error.table = table;
  
  error.metadata = {
    operation,
    table,
    code,
    retryable
  };
  
  return error;
}

/**
 * Create structured error for external service failures
 */
function createExternalServiceError(message, serviceName, endpoint = null, statusCode = null, retryable = true) {
  const error = new ExternalServiceError(message, serviceName, retryable);
  
  error.endpoint = endpoint;
  error.statusCode = statusCode;
  
  error.metadata = {
    serviceName,
    endpoint,
    statusCode,
    retryable
  };
  
  return error;
}

/**
 * Create structured error for authentication failures
 */
function createAuthError(type = 'required', details = {}) {
  const messages = {
    required: 'Authentication required',
    invalid: 'Invalid authentication credentials',
    expired: 'Authentication token has expired',
    insufficient: 'Insufficient privileges',
    token: 'Invalid or malformed token'
  };
  
  const codes = {
    required: 'AUTH_REQUIRED',
    invalid: 'INVALID_CREDENTIALS',
    expired: 'TOKEN_EXPIRED',
    insufficient: 'INSUFFICIENT_PRIVILEGES',
    token: 'INVALID_TOKEN'
  };
  
  const error = new AuthenticationError(messages[type] || messages.required, codes[type]);
  error.details = details;
  
  return error;
}

/**
 * Sanitize error message for production
 */
function sanitizeErrorMessage(error, environment = 'production') {
  if (environment !== 'production') {
    return error;
  }
  
  // Remove sensitive information from error messages
  const sanitized = { ...error };
  
  const sensitivePatterns = [
    /password[\s]*[:=][\s]*[\w\S]+/gi,
    /token[\s]*[:=][\s]*[\w\S]+/gi,
    /key[\s]*[:=][\s]*[\w\S]+/gi,
    /secret[\s]*[:=][\s]*[\w\S]+/gi,
    /cvv[\s]*[:=][\s]*[\w\S]+/gi,
    /card[\s]*[:=][\s]*[\w\S]+/gi
  ];
  
  sensitivePatterns.forEach(pattern => {
    sanitized.message = sanitized.message.replace(pattern, '$1=[REDACTED]');
  });
  
  return sanitized;
}

/**
 * Format error for logging
 */
function formatErrorForLogging(error, context = {}) {
  return {
    name: error.name,
    message: error.message,
    statusCode: error.statusCode,
    category: error.category,
    severity: error.severity,
    code: error.code,
    isOperational: error.isOperational,
    retryable: error.retryable,
    timestamp: error.timestamp || new Date().toISOString(),
    stack: error.stack,
    ...error.metadata,
    ...context
  };
}

/**
 * Check if error should trigger alerting
 */
function shouldTriggerAlert(error, thresholds = {}) {
  const defaultThresholds = {
    critical: 1,
    high: 5,
    medium: 20
  };
  
  const alertThresholds = { ...defaultThresholds, ...thresholds };
  return alertThresholds[error.severity] <= 1; // Simplified - would need sliding window in real implementation
}

/**
 * Extract error correlation ID for tracking
 */
function getErrorCorrelationId(error) {
  return error.correlationId || 
         error.requestId || 
         `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert different error types to standardized format
 */
function normalizeError(error, defaultCategory = 'system') {
  // If it's already an AppError, return as is
  if (error instanceof AppError) {
    return error;
  }
  
  // Convert common error types
  if (error.name === 'ValidationError') {
    return new ValidationError(error.message);
  }
  
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return new AuthenticationError(error.message, error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN');
  }
  
  if (error.name === 'UnauthorizedError') {
    return new AuthorizationError(error.message);
  }
  
  // Database errors
  if (error.code && typeof error.code === 'string') {
    switch (error.code) {
      case '23505':
        return new ConflictError('Resource already exists');
      case '23503':
        return new ValidationError('Referenced resource not found');
      case '23502':
        return new ValidationError('Required field missing');
      case '08003':
      case '08006':
        return new DatabaseError('Database connection failed', error.code, true);
    }
  }
  
  // Network/connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
    return new ExternalServiceError('External service unavailable', 'unknown', true);
  }
  
  // Generic error wrapper
  return new AppError(
    error.message || 'An unexpected error occurred',
    error.statusCode || 500,
    error.category || defaultCategory,
    error.severity || 'medium'
  );
}

/**
 * Create recovery strategy for different error types
 */
function createRecoveryStrategy(error) {
  const strategies = {
    validation: {
      canRetry: true,
      suggestedAction: 'correct_input',
      message: 'Please check your input and try again'
    },
    authentication: {
      canRetry: error.code === 'TOKEN_EXPIRED',
      suggestedAction: error.code === 'TOKEN_EXPIRED' ? 'refresh_token' : 'reauthenticate',
      message: error.code === 'TOKEN_EXPIRED' ? 'Please refresh your authentication token' : 'Please authenticate again'
    },
    authorization: {
      canRetry: false,
      suggestedAction: 'contact_support',
      message: 'Please contact support for access permissions'
    },
    database: {
      canRetry: error.retryable,
      suggestedAction: 'retry_after_delay',
      message: error.retryable ? 'Database temporarily unavailable, please try again' : 'Please contact support'
    },
    external_service: {
      canRetry: true,
      suggestedAction: 'retry_with_backoff',
      message: 'External service temporarily unavailable, please try again later'
    },
    payment: {
      canRetry: error.retryable,
      suggestedAction: error.retryable ? 'retry_payment' : 'contact_support',
      message: error.retryable ? 'Payment service temporarily unavailable' : 'Please contact support for payment issues'
    },
    rate_limit: {
      canRetry: true,
      suggestedAction: 'wait_and_retry',
      message: 'Too many requests, please wait before trying again'
    }
  };
  
  return strategies[error.category] || {
    canRetry: false,
    suggestedAction: 'contact_support',
    message: 'Please contact support if the problem persists'
  };
}

module.exports = {
  // Error creation utilities
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  PaymentError,
  DatabaseError,
  ExternalServiceError,
  RateLimitError,
  NotFoundError,
  ConflictError,
  
  // Specialized error creators
  createPaymentError,
  createValidationError,
  createDatabaseError,
  createExternalServiceError,
  createAuthError,
  
  // Error formatting utilities
  createErrorResponse,
  formatErrorForLogging,
  sanitizeErrorMessage,
  normalizeError,
  
  // Alerting and monitoring
  shouldTriggerAlert,
  getErrorCorrelationId,
  createRecoveryStrategy,
  
  // Error analysis
  ERROR_SEVERITY
};