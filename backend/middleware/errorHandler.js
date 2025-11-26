/**
 * Enhanced Global Error Handling Middleware
 * Comprehensive error handling with logging, categorization, and recovery strategies
 */

const { logger, logSecurity, logUserAction } = require('../config/logger');
const { isProd } = require('../config/environment');
const { createErrorResponse } = require('../utils/errorUtils');

// Error categories for better organization
const ERROR_CATEGORIES = {
  VALIDATION: 'validation',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  DATABASE: 'database',
  EXTERNAL_SERVICE: 'external_service',
  PAYMENT: 'payment',
  BUSINESS_LOGIC: 'business_logic',
  SYSTEM: 'system',
  NETWORK: 'network',
  RATE_LIMIT: 'rate_limit'
};

// Severity levels for error response and logging
const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.alertThresholds = {
      high: 10, // Alert after 10 high severity errors in 5 minutes
      critical: 3 // Alert after 3 critical errors in 5 minutes
    };
  }

  /**
   * Main error handling middleware
   */
  errorHandler = (err, req, res, next) => {
    const startTime = req.startTime || Date.now();
    const requestId = req.id || this.generateRequestId();
    
    try {
      // Categorize and analyze the error
      const errorAnalysis = this.analyzeError(err);
      
      // Log the error with comprehensive context
      this.logError(err, req, errorAnalysis, startTime);
      
      // Check for alerting conditions
      this.checkAlertConditions(errorAnalysis);
      
      // Track user actions for security
      this.trackUserAction(req, errorAnalysis);
      
      // Attempt recovery if possible
      const recoveryAttempt = this.attemptRecovery(err, req, errorAnalysis);
      
      // Create standardized error response
      const errorResponse = createErrorResponse(errorAnalysis, recoveryAttempt);
      
      // Send error response
      res.status(errorAnalysis.statusCode).json(errorResponse);
      
    } catch (loggingError) {
      // Fallback logging if main logging fails
      console.error('Error in error handler logging:', loggingError);
      console.error('Original error:', err);
      console.error('Request:', req.method, req.originalUrl);
      
      // Send basic error response
      res.status(500).json({
        error: 'Internal Server Error',
        requestId,
        timestamp: new Date().toISOString()
      });
    }
  };

  /**
   * Async error wrapper for route handlers
   */
  asyncHandler = (fn) => {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  };

  /**
   * Analyze and categorize error
   */
  analyzeError(error) {
    const analysis = {
      category: ERROR_CATEGORIES.SYSTEM,
      severity: ERROR_SEVERITY.MEDIUM,
      statusCode: 500,
      isOperational: false,
      userMessage: 'An unexpected error occurred',
      errorCode: this.generateErrorCode(),
      retryable: false,
      metadata: {}
    };

    // Handle specific error types
    if (error.name === 'ValidationError' || error.name === 'ValidatorError') {
      analysis.category = ERROR_CATEGORIES.VALIDATION;
      analysis.severity = ERROR_SEVERITY.LOW;
      analysis.statusCode = 400;
      analysis.isOperational = true;
      analysis.userMessage = 'Invalid input data';
      analysis.metadata.details = error.details || error.message;
      analysis.errorCode = 'VALIDATION_ERROR';
    }

    if (error.name === 'JsonWebTokenError') {
      analysis.category = ERROR_CATEGORIES.AUTHENTICATION;
      analysis.severity = ERROR_SEVERITY.MEDIUM;
      analysis.statusCode = 401;
      analysis.isOperational = true;
      analysis.userMessage = 'Invalid authentication token';
      analysis.metadata.tokenType = 'JWT';
      analysis.errorCode = 'INVALID_TOKEN';
      analysis.retryable = false;
    }

    if (error.name === 'TokenExpiredError') {
      analysis.category = ERROR_CATEGORIES.AUTHENTICATION;
      analysis.severity = ERROR_SEVERITY.LOW;
      analysis.statusCode = 401;
      analysis.isOperational = true;
      analysis.userMessage = 'Authentication token has expired';
      analysis.metadata.expiredAt = error.expiredAt;
      analysis.errorCode = 'TOKEN_EXPIRED';
      analysis.retryable = true;
    }

    if (error.name === 'UnauthorizedError') {
      analysis.category = ERROR_CATEGORIES.AUTHORIZATION;
      analysis.severity = ERROR_SEVERITY.MEDIUM;
      analysis.statusCode = 403;
      analysis.isOperational = true;
      analysis.userMessage = 'Access denied';
      analysis.errorCode = 'ACCESS_DENIED';
    }

    // Database errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique constraint violation
          analysis.category = ERROR_CATEGORIES.DATABASE;
          analysis.severity = ERROR_SEVERITY.LOW;
          analysis.statusCode = 409;
          analysis.isOperational = true;
          analysis.userMessage = 'Resource already exists';
          analysis.errorCode = 'DUPLICATE_RESOURCE';
          break;
        
        case '23503': // Foreign key constraint violation
          analysis.category = ERROR_CATEGORIES.DATABASE;
          analysis.severity = ERROR_SEVERITY.MEDIUM;
          analysis.statusCode = 400;
          analysis.isOperational = true;
          analysis.userMessage = 'Referenced resource not found';
          analysis.errorCode = 'FOREIGN_KEY_VIOLATION';
          break;
        
        case '23502': // Not null constraint violation
          analysis.category = ERROR_CATEGORIES.DATABASE;
          analysis.severity = ERROR_SEVERITY.LOW;
          analysis.statusCode = 400;
          analysis.isOperational = true;
          analysis.userMessage = 'Required field missing';
          analysis.errorCode = 'REQUIRED_FIELD_MISSING';
          break;
        
        case '08003': // Connection does not exist
        case '08006': // Connection failure
          analysis.category = ERROR_CATEGORIES.DATABASE;
          analysis.severity = ERROR_SEVERITY.HIGH;
          analysis.statusCode = 503;
          analysis.isOperational = false;
          analysis.userMessage = 'Database temporarily unavailable';
          analysis.errorCode = 'DATABASE_CONNECTION_ERROR';
          analysis.retryable = true;
          break;
      }
    }

    // Payment-specific errors
    if (error.type === 'PaymentError' || error.paymentRelated) {
      analysis.category = ERROR_CATEGORIES.PAYMENT;
      analysis.severity = ERROR_SEVERITY.HIGH;
      analysis.statusCode = 402;
      analysis.isOperational = true;
      analysis.userMessage = error.message || 'Payment processing failed';
      analysis.metadata.paymentDetails = error.paymentDetails;
      analysis.errorCode = error.code || 'PAYMENT_ERROR';
      analysis.retryable = error.retryable || false;
    }

    // External service errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      analysis.category = ERROR_CATEGORIES.EXTERNAL_SERVICE;
      analysis.severity = ERROR_SEVERITY.MEDIUM;
      analysis.statusCode = 503;
      analysis.isOperational = false;
      analysis.userMessage = 'External service temporarily unavailable';
      analysis.errorCode = 'SERVICE_UNAVAILABLE';
      analysis.retryable = true;
      analysis.metadata.service = error.service || 'external';
    }

    // Rate limiting errors
    if (error.statusCode === 429 || error.type === 'RateLimitError') {
      analysis.category = ERROR_CATEGORIES.RATE_LIMIT;
      analysis.severity = ERROR_SEVERITY.LOW;
      analysis.statusCode = 429;
      analysis.isOperational = true;
      analysis.userMessage = 'Too many requests, please try again later';
      analysis.errorCode = 'RATE_LIMIT_EXCEEDED';
      analysis.metadata.retryAfter = error.retryAfter;
      analysis.retryable = true;
    }

    // System errors (uncaught exceptions, etc.)
    if (!analysis.isOperational) {
      analysis.severity = ERROR_SEVERITY.CRITICAL;
      analysis.metadata.originalError = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    return analysis;
  }

  /**
   * Log error with comprehensive context
   */
  logError(error, req, analysis, startTime) {
    const context = {
      requestId: req.id || this.generateRequestId(),
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: this.getClientIP(req),
      userId: req.user?.id,
      category: analysis.category,
      severity: analysis.severity,
      statusCode: analysis.statusCode,
      errorCode: analysis.errorCode,
      duration: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString(),
      isOperational: analysis.isOperational,
      retryable: analysis.retryable,
      ...analysis.metadata
    };

    // Log based on severity
    switch (analysis.severity) {
      case ERROR_SEVERITY.CRITICAL:
        logger.error('Critical error occurred', context, error);
        break;
      case ERROR_SEVERITY.HIGH:
        logger.error('High severity error occurred', context, error);
        break;
      case ERROR_SEVERITY.MEDIUM:
        logger.warn('Medium severity error occurred', context, error);
        break;
      case ERROR_SEVERITY.LOW:
        logger.info('Low severity error occurred', context, error);
        break;
    }

    // Special logging for security events
    if (analysis.category === ERROR_CATEGORIES.AUTHENTICATION || 
        analysis.category === ERROR_CATEGORIES.AUTHORIZATION) {
      logSecurity('authentication_error', analysis.severity, {
        ...context,
        event: 'security_violation'
      });
    }
  }

  /**
   * Check for alerting conditions
   */
  checkAlertConditions(analysis) {
    const now = Date.now();
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    
    if (!this.errorCounts.has(analysis.severity)) {
      this.errorCounts.set(analysis.severity, []);
    }
    
    const severityList = this.errorCounts.get(analysis.severity);
    
    // Add current error
    severityList.push(now);
    
    // Clean old entries
    const recentErrors = severityList.filter(time => now - time <= timeWindow);
    this.errorCounts.set(analysis.severity, recentErrors);
    
    // Check threshold
    const threshold = this.alertThresholds[analysis.severity];
    if (recentErrors.length >= threshold) {
      this.triggerAlert(analysis, recentErrors.length);
    }
  }

  /**
   * Trigger alert for high error rates
   */
  triggerAlert(analysis, count) {
    const alert = {
      type: 'high_error_rate',
      severity: analysis.severity,
      category: analysis.category,
      count,
      threshold: this.alertThresholds[analysis.severity],
      timeWindow: '5 minutes',
      timestamp: new Date().toISOString()
    };

    logger.error('High error rate detected', alert);
    
    // Here you could integrate with alerting services like:
    // - SendGrid for email alerts
    // - Slack/Discord webhooks
    // - PagerDuty for critical alerts
    // - Prometheus alerting rules
  }

  /**
   * Track user actions for security monitoring
   */
  trackUserAction(req, analysis) {
    if (analysis.category === ERROR_CATEGORIES.AUTHENTICATION || 
        analysis.category === ERROR_CATEGORIES.AUTHORIZATION) {
      logUserAction(req.user?.id || 'anonymous', 'authentication_error', {
        ip: this.getClientIP(req),
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method
      });
    }
  }

  /**
   * Attempt error recovery
   */
  attemptRecovery(error, req, analysis) {
    // Return recovery suggestions based on error type
    if (analysis.retryable) {
      return {
        canRetry: true,
        suggestedDelay: this.getSuggestedDelay(analysis.category),
        recoveryMessage: 'Please try again after a brief delay'
      };
    }

    if (analysis.category === ERROR_CATEGORIES.AUTHENTICATION && analysis.errorCode === 'TOKEN_EXPIRED') {
      return {
        canRetry: true,
        suggestedAction: 'refresh_token',
        recoveryMessage: 'Please refresh your authentication token'
      };
    }

    if (analysis.category === ERROR_CATEGORIES.VALIDATION) {
      return {
        canRetry: true,
        suggestedAction: 'correct_input',
        recoveryMessage: 'Please check your input and try again'
      };
    }

    return {
      canRetry: false,
      recoveryMessage: 'Please contact support if the problem persists'
    };
  }

  /**
   * Get suggested delay for retryable errors
   */
  getSuggestedDelay(category) {
    const delays = {
      [ERROR_CATEGORIES.EXTERNAL_SERVICE]: 5000, // 5 seconds
      [ERROR_CATEGORIES.DATABASE]: 2000, // 2 seconds
      [ERROR_CATEGORIES.RATE_LIMIT]: 60000, // 1 minute
      [ERROR_CATEGORIES.PAYMENT]: 10000 // 10 seconds
    };
    return delays[category] || 3000; // Default 3 seconds
  }

  /**
   * Generate unique error code
   */
  generateErrorCode() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }

  /**
   * Generate request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get client IP address
   */
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           'unknown';
  }
}

// Create singleton instance
const errorHandler = new ErrorHandler();

// 404 handler
const notFound = (req, res) => {
  const requestId = req.id || errorHandler.generateRequestId();
  
  logger.warn('Route not found', {
    requestId,
    method: req.method,
    url: req.originalUrl || req.url,
    userAgent: req.get('User-Agent'),
    ip: errorHandler.getClientIP(req)
  });

  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.originalUrl || req.url} not found`,
    requestId,
    timestamp: new Date().toISOString()
  });
};

module.exports = { 
  errorHandler: errorHandler.errorHandler,
  asyncHandler: errorHandler.asyncHandler,
  notFound,
  ERROR_CATEGORIES,
  ERROR_SEVERITY
};