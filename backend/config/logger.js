/**
 * Comprehensive Logging System for OffScreen Buddy Backend
 * Provides structured logging with environment-specific configurations
 * Supports console, file, and remote logging with JSON formatting
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { environmentDetector } = require('./environment');

class LoggerConfig {
  constructor() {
    this.environment = environmentDetector.getEnvironment();
    this.logDirectory = path.join(__dirname, '../logs');
    this.ensureLogDirectory();
    this.logger = this.createLogger();
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDirectory)) {
      fs.mkdirSync(this.logDirectory, { recursive: true });
    }
  }

  /**
   * Create Winston logger with environment-specific configuration
   */
  createLogger() {
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.prettyPrint()
    );

    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
        let log = `${timestamp} [${level}]: ${message}`;
        if (stack) {
          log += `\n${stack}`;
        }
        if (Object.keys(meta).length > 0) {
          log += `\n${JSON.stringify(meta, null, 2)}`;
        }
        return log;
      })
    );

    const transports = [];

    // Console logging
    if (this.environment === 'LOCAL' || process.env.NODE_ENV === 'development') {
      transports.push(
        new winston.transports.Console({
          format: consoleFormat,
          level: 'debug'
        })
      );
    }

    // File logging for all environments
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'error.log'),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true
      })
    );

    // Combined log file for all levels
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'combined.log'),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 10,
        tailable: true
      })
    );

    // Security events logging
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'security.log'),
        level: 'warn',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 20,
        tailable: true
      })
    );

    // Performance logging
    transports.push(
      new winston.transports.File({
        filename: path.join(this.logDirectory, 'performance.log'),
        level: 'info',
        format: logFormat,
        maxsize: 10485760, // 10MB
        maxFiles: 15,
        tailable: true
      })
    );

    return winston.createLogger({
      level: this.getLogLevel(),
      format: logFormat,
      defaultMeta: {
        service: 'offscreen-buddy-backend',
        environment: this.environment,
        version: process.env.npm_package_version || '1.0.0'
      },
      transports,
      exitOnError: false
    });
  }

  /**
   * Get environment-specific log level
   */
  getLogLevel() {
    if (process.env.LOG_LEVEL) {
      return process.env.LOG_LEVEL.toLowerCase();
    }

    switch (this.environment) {
      case 'LOCAL':
        return 'debug';
      case 'PROD':
        return 'info';
      default:
        return 'info';
    }
  }

  /**
   * Get logger instance
   */
  getLogger() {
    return this.logger;
  }

  /**
   * Log with context
   */
  logWithContext(level, message, context = {}) {
    const sanitizedContext = this.sanitizeContext(context);
    this.logger.log(level, message, sanitizedContext);
  }

  /**
   * Sanitize context to remove sensitive information
   */
  sanitizeContext(context) {
    const sensitiveFields = [
      'password', 'token', 'key', 'secret', 'auth', 'authorization',
      'cardNumber', 'cvv', 'pan', 'accountNumber', 'upi', 'pin'
    ];

    const sanitized = { ...context };

    const sanitizeObject = (obj) => {
      for (const key in obj) {
        if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          sanitizeObject(obj[key]);
        }
      }
    };

    sanitizeObject(sanitized);
    return sanitized;
  }

  /**
   * Create child logger with default metadata
   */
  childLogger(metadata) {
    return this.logger.child(metadata);
  }

  /**
   * Performance logging
   */
  logPerformance(operation, duration, metadata = {}) {
    const perfContext = {
      operation,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      ...metadata
    };

    this.logger.info('Performance metric', perfContext);
  }

  /**
   * Security event logging
   */
  logSecurity(event, severity = 'medium', details = {}) {
    const securityContext = {
      event,
      severity,
      timestamp: new Date().toISOString(),
      ip: this.getClientIP(),
      userAgent: this.getUserAgent(),
      ...details
    };

    this.logger.warn('Security event', securityContext);
  }

  /**
   * API request logging
   */
  logRequest(req, res, duration) {
    const requestContext = {
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      referer: req.get('Referer'),
      requestId: req.id || this.generateRequestId()
    };

    if (res.statusCode >= 400) {
      this.logger.warn('API request completed with error', requestContext);
    } else {
      this.logger.info('API request completed', requestContext);
    }
  }

  /**
   * Database query logging
   */
  logDatabaseQuery(query, duration, success = true) {
    const dbContext = {
      query: this.sanitizeQuery(query),
      duration: `${duration}ms`,
      success,
      timestamp: new Date().toISOString()
    };

    if (success) {
      this.logger.debug('Database query executed', dbContext);
    } else {
      this.logger.error('Database query failed', dbContext);
    }
  }

  /**
   * Payment transaction logging
   */
  logPayment(transactionType, details = {}) {
    const paymentContext = {
      transactionType,
      timestamp: new Date().toISOString(),
      orderId: details.orderId,
      amount: details.amount,
      currency: details.currency || 'INR',
      status: details.status,
      provider: details.provider || 'PayU'
    };

    // Sanitize sensitive payment data
    const sanitizedDetails = this.sanitizeContext(details);
    Object.assign(paymentContext, sanitizedDetails);

    this.logger.info('Payment transaction', paymentContext);
  }

  /**
   * User action tracking
   */
  logUserAction(userId, action, details = {}) {
    const actionContext = {
      userId: this.anonymizeUserId(userId),
      action,
      timestamp: new Date().toISOString(),
      sessionId: details.sessionId,
      ...details
    };

    this.logger.info('User action', actionContext);
  }

  /**
   * Utility methods
   */
  getClientIP(req) {
    return req?.headers?.['x-forwarded-for']?.split(',')[0] || 
           req?.connection?.remoteAddress || 
           req?.socket?.remoteAddress ||
           'unknown';
  }

  getUserAgent(req) {
    return req?.headers?.['user-agent'] || 'unknown';
  }

  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  sanitizeQuery(query) {
    if (typeof query === 'string') {
      return query.replace(/('|")[\s\S]*?\1/g, "'[REDACTED]'")
                  .replace(/\b(pass|token|key|secret)[\s]*[:=][\s]*[\w-]+/gi, '$1=[REDACTED]');
    }
    return '[COMPLEX_QUERY]';
  }

  anonymizeUserId(userId) {
    if (!userId) return 'anonymous';
    return `user_${userId.toString().slice(-6)}`;
  }
}

// Create singleton instance
const loggerConfig = new LoggerConfig();

// Export logger and utility functions
const logger = loggerConfig.getLogger();

// Export utility functions for external use
module.exports = {
  // Main logger instance
  logger,

  // Logger configuration instance
  loggerConfig,

  // Utility logging functions
  logWithContext: (level, message, context) => loggerConfig.logWithContext(level, message, context),
  logPerformance: (operation, duration, metadata) => loggerConfig.logPerformance(operation, duration, metadata),
  logSecurity: (event, severity, details) => loggerConfig.logSecurity(event, severity, details),
  logRequest: (req, res, duration) => loggerConfig.logRequest(req, res, duration),
  logDatabaseQuery: (query, duration, success) => loggerConfig.logDatabaseQuery(query, duration, success),
  logPayment: (transactionType, details) => loggerConfig.logPayment(transactionType, details),
  logUserAction: (userId, action, details) => loggerConfig.logUserAction(userId, action, details),

  // Child logger factory
  createChildLogger: (metadata) => loggerConfig.childLogger(metadata),

  // Log levels for reference
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    HTTP: 'http',
    VERBOSE: 'verbose',
    DEBUG: 'debug',
    SILLY: 'silly'
  }
};

// Initialize logging on module load
logger.info('Logger initialized', {
  environment: loggerConfig.environment,
  logLevel: loggerConfig.getLogLevel(),
  logDirectory: loggerConfig.logDirectory
});