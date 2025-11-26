/**
 * Performance Logger Middleware
 * Comprehensive performance monitoring and logging for API requests, database queries, and system operations
 */

const { logger, logPerformance } = require('../config/logger');
const { isLocal } = require('../config/environment');

class PerformanceLogger {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      // API response time thresholds (in milliseconds)
      api: {
        fast: 100,
        acceptable: 500,
        slow: 1000,
        critical: 3000
      },
      // Database query thresholds
      database: {
        fast: 50,
        acceptable: 200,
        slow: 1000,
        critical: 5000
      },
      // External service thresholds
      external: {
        fast: 200,
        acceptable: 1000,
        slow: 5000,
        critical: 15000
      }
    };

    this.alerts = {
      slowRequest: 5, // Alert after 5 slow requests in 5 minutes
      highMemory: 80, // Alert when memory usage exceeds 80%
      highCpu: 80 // Alert when CPU usage exceeds 80%
    };

    this.alertCounts = new Map();
    this.startTime = Date.now();
  }

  /**
   * Main performance logging middleware for HTTP requests
   */
  requestLogger = (req, res, next) => {
    const startTime = process.hrtime.bigint();
    const requestId = this.generateRequestId();

    // Attach request metadata
    req.id = requestId;
    req.startTime = startTime;

    // Override res.json to capture response size
    const originalJson = res.json;
    res.json = function (obj) {
      req.responseSize = JSON.stringify(obj).length;
      return originalJson.call(this, obj);
    };

    // Override res.send to capture response size
    const originalSend = res.send;
    res.send = function (data) {
      req.responseSize = Buffer.byteLength(data, 'utf8');
      return originalSend.call(this, data);
    };

    // Log request start
    logger.debug('Request started', {
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
      userAgent: req.get('User-Agent'),
      ip: this.getClientIP(req),
      contentLength: req.get('Content-Length'),
      timestamp: new Date().toISOString()
    });

    // Handle response when finished
    res.on('finish', () => {
      const endTime = process.hrtime.bigint();
      const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

      this.logRequestPerformance(req, res, duration);
    });

    next();
  };

  /**
   * Log database query performance
   */
  logDatabaseQuery(query, duration, success = true, metadata = {}) {
    const category = this.categorizePerformance(duration, 'database');
    const queryInfo = this.sanitizeQuery(query);

    const perfData = {
      operation: 'database_query',
      query: queryInfo,
      duration: `${duration.toFixed(2)}ms`,
      category,
      success,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    if (category === 'critical') {
      logger.error('Critical database performance issue', perfData);
    } else if (category === 'slow') {
      logger.warn('Slow database query detected', perfData);
    } else {
      logger.debug('Database query performance', perfData);
    }

    // Log to performance metrics
    this.recordMetric('database_query', duration, category);
  }

  /**
   * Log external service call performance
   */
  logExternalService(serviceName, endpoint, duration, success = true, metadata = {}) {
    const category = this.categorizePerformance(duration, 'external');

    const perfData = {
      operation: 'external_service_call',
      service: serviceName,
      endpoint,
      duration: `${duration.toFixed(2)}ms`,
      category,
      success,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    if (category === 'critical') {
      logger.error('Critical external service performance issue', perfData);
    } else if (category === 'slow') {
      logger.warn('Slow external service call detected', perfData);
    } else {
      logger.debug('External service call performance', perfData);
    }

    // Log to performance metrics
    this.recordMetric(`external_${serviceName}`, duration, category);
  }

  /**
   * Log business operation performance
   */
  logBusinessOperation(operation, duration, metadata = {}) {
    const category = this.categorizePerformance(duration, 'api');

    const perfData = {
      operation,
      duration: `${duration.toFixed(2)}ms`,
      category,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    if (category === 'critical') {
      logger.error('Critical business operation performance issue', perfData);
    } else if (category === 'slow') {
      logger.warn('Slow business operation detected', perfData);
    } else {
      logger.info('Business operation performance', perfData);
    }

    // Log to performance metrics
    this.recordMetric(operation, duration, category);
  }

  /**
   * Log payment transaction performance
   */
  logPaymentTransaction(transactionType, duration, success = true, metadata = {}) {
    const sanitizedMetadata = this.sanitizePaymentData(metadata);

    const perfData = {
      operation: 'payment_transaction',
      transactionType,
      duration: `${duration.toFixed(2)}ms`,
      success,
      timestamp: new Date().toISOString(),
      ...sanitizedMetadata
    };

    if (!success) {
      logger.error('Payment transaction failed', perfData);
    } else {
      logger.info('Payment transaction completed', perfData);
    }

    // Log to performance metrics
    this.recordMetric('payment_transaction', duration, success ? 'success' : 'failure');
  }

  /**
   * Log memory and CPU usage
   */
  logSystemMetrics() {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const uptime = process.uptime();

    const systemMetrics = {
      operation: 'system_metrics',
      timestamp: new Date().toISOString(),
      memory: {
        rss: `${(memUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
        heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`,
      loadAverage: process.platform !== 'win32' ? (process.loadavg ? process.loadavg() : [0, 0, 0]) : null
    };

    // Calculate memory usage percentage
    const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    systemMetrics.memoryUsagePercent = memoryUsagePercent.toFixed(2);

    // Log based on thresholds
    if (memoryUsagePercent > this.alerts.highMemory) {
      logger.warn('High memory usage detected', systemMetrics);
      this.checkAlertThreshold('highMemory', 1);
    }

    // Log memory metrics in development
    if (isLocal()) {
      logger.debug('System metrics', systemMetrics);
    }

    return systemMetrics;
  }

  /**
   * Log request performance details
   */
  logRequestPerformance(req, res, duration) {
    const category = this.categorizePerformance(duration, 'api');
    const userAgent = req.get('User-Agent');
    const isBot = this.isBot(userAgent);

    const perfData = {
      operation: 'http_request',
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      category,
      responseSize: req.responseSize || 0,
      userAgent,
      isBot,
      timestamp: new Date().toISOString(),
      queryParams: Object.keys(req.query || {}).length,
      headers: this.sanitizeHeaders(req.headers)
    };

    // Add user information if available
    if (req.user) {
      perfData.userId = req.user.id;
    }

    // Log based on performance category
    if (category === 'critical') {
      logger.error('Critical request performance issue', perfData);
      this.checkAlertThreshold('slowRequest', 1);
    } else if (category === 'slow') {
      logger.warn('Slow request detected', perfData);
      this.checkAlertThreshold('slowRequest', 1);
    } else {
      logger.info('Request performance', perfData);
    }

    // Record metrics
    this.recordMetric(`${req.method}_${res.statusCode}`, duration, category);

    // Use centralized performance logging
    logPerformance(`${req.method} ${req.originalUrl || req.url}`, duration, {
      statusCode: res.statusCode,
      responseSize: req.responseSize,
      userAgent,
      category
    });
  }

  /**
   * Start performance timer for custom operations
   */
  startTimer(operation, metadata = {}) {
    const timerId = this.generateTimerId();
    const startTime = process.hrtime.bigint();

    return {
      end: (success = true, additionalMetadata = {}) => {
        const endTime = process.hrtime.bigint();
        const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

        this.logBusinessOperation(operation, duration, {
          timerId,
          success,
          ...metadata,
          ...additionalMetadata
        });

        return duration;
      }
    };
  }

  /**
   * Categorize performance based on thresholds
   */
  categorizePerformance(duration, type) {
    const thresholds = this.thresholds[type] || this.thresholds.api;

    if (duration >= thresholds.critical) return 'critical';
    if (duration >= thresholds.slow) return 'slow';
    if (duration >= thresholds.acceptable) return 'acceptable';
    return 'fast';
  }

  /**
   * Record performance metric
   */
  recordMetric(operation, duration, category) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, {
        count: 0,
        totalDuration: 0,
        minDuration: Infinity,
        maxDuration: 0,
        categories: { fast: 0, acceptable: 0, slow: 0, critical: 0 }
      });
    }

    const metric = this.metrics.get(operation);
    metric.count++;
    metric.totalDuration += duration;
    metric.minDuration = Math.min(metric.minDuration, duration);
    metric.maxDuration = Math.max(metric.maxDuration, duration);
    metric.categories[category]++;

    this.metrics.set(operation, metric);
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      metrics: Object.fromEntries(this.metrics),
      system: this.logSystemMetrics()
    };

    return summary;
  }

  /**
   * Check alert thresholds
   */
  checkAlertThreshold(type, count) {
    const threshold = this.alerts[type];
    if (!threshold) return;

    const now = Date.now();
    if (!this.alertCounts.has(type)) {
      this.alertCounts.set(type, []);
    }

    const times = this.alertCounts.get(type);
    times.push(now);

    // Remove old entries (older than 5 minutes)
    const recentTimes = times.filter(time => now - time <= 5 * 60 * 1000);
    this.alertCounts.set(type, recentTimes);

    if (recentTimes.length >= threshold) {
      this.triggerAlert(type, recentTimes.length);
    }
  }

  /**
   * Trigger performance alert
   */
  triggerAlert(type, count) {
    const alert = {
      type: `performance_${type}`,
      count,
      threshold: this.alerts[type],
      timestamp: new Date().toISOString(),
      metrics: this.getPerformanceSummary()
    };

    logger.error('Performance alert triggered', alert);

    // Here you could integrate with alerting services
  }

  /**
   * Utility methods
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateTimerId() {
    return `timer_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';
  }

  sanitizeQuery(query) {
    if (typeof query === 'string') {
      return query.replace(/('|")[\s\S]*?\1/g, "'[REDACTED]'")
        .replace(/\b(pass|token|key|secret)[\s]*[:=][\s]*[\w-]+/gi, '$1=[REDACTED]');
    }
    return '[COMPLEX_QUERY]';
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];

    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  sanitizePaymentData(data) {
    const sanitized = { ...data };
    const sensitiveFields = ['cardNumber', 'cvv', 'pan', 'salt', 'merchantKey', 'hash'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  isBot(userAgent) {
    if (!userAgent) return false;

    const botPatterns = [
      /bot/i,
      /crawler/i,
      /spider/i,
      /crawl/i,
      /slurp/i,
      /curl/i,
      /wget/i
    ];

    return botPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Middleware factory for timing specific operations
   */
  createTimerMiddleware(operationName) {
    return (req, res, next) => {
      const timer = this.startTimer(operationName, {
        method: req.method,
        url: req.originalUrl || req.url
      });

      res.on('finish', () => {
        timer.end(res.statusCode < 400);
      });

      next();
    };
  }
}

// Create singleton instance
const performanceLogger = new PerformanceLogger();

// Export middleware and utilities
module.exports = {
  // Main middleware
  requestLogger: performanceLogger.requestLogger,

  // Logging methods
  logDatabaseQuery: (query, duration, success, metadata) =>
    performanceLogger.logDatabaseQuery(query, duration, success, metadata),
  logExternalService: (service, endpoint, duration, success, metadata) =>
    performanceLogger.logExternalService(service, endpoint, duration, success, metadata),
  logBusinessOperation: (operation, duration, metadata) =>
    performanceLogger.logBusinessOperation(operation, duration, metadata),
  logPaymentTransaction: (type, duration, success, metadata) =>
    performanceLogger.logPaymentTransaction(type, duration, success, metadata),
  logSystemMetrics: () => performanceLogger.logSystemMetrics(),

  // Timer utilities
  startTimer: (operation, metadata) => performanceLogger.startTimer(operation, metadata),
  createTimerMiddleware: (operationName) => performanceLogger.createTimerMiddleware(operationName),

  // Metrics and reporting
  getPerformanceSummary: () => performanceLogger.getPerformanceSummary(),

  // Configuration
  thresholds: performanceLogger.thresholds
};