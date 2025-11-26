/**
 * Backend Performance Middleware
 * Handles request performance monitoring, database optimization, and response caching
 */

const { getPerformanceConfig, getEnvironment } = require('../config/performance');
const { logger } = require('../config/logger');

/**
 * Performance Monitoring Middleware
 * Tracks request performance metrics and response times
 */
class PerformanceMonitoringMiddleware {
  constructor() {
    this.config = getPerformanceConfig();
    this.metrics = {
      requestCount: 0,
      averageResponseTime: 0,
      slowestEndpoint: null,
      fastestEndpoint: null,
      errorCount: 0,
      endpoints: new Map()
    };
    this.startTime = Date.now();
  }

  /**
   * Request performance monitoring
   */
  requestMonitor = (req, res, next) => {
    const startTime = Date.now();
    const endpoint = `${req.method} ${req.path}`;
    
    // Initialize endpoint metrics if not exists
    if (!this.metrics.endpoints.has(endpoint)) {
      this.metrics.endpoints.set(endpoint, {
        count: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: Infinity,
        maxTime: 0,
        errors: 0
      });
    }

    const endpointMetrics = this.metrics.endpoints.get(endpoint);
    
    // Add custom headers for performance tracking
    req.startTime = startTime;
    req.performanceId = this.generatePerformanceId();
    
    // Override res.json to capture response time
    const originalJson = res.json;
    res.json = function(body) {
      const responseTime = Date.now() - startTime;
      
      // Update metrics
      endpointMetrics.count++;
      endpointMetrics.totalTime += responseTime;
      endpointMetrics.averageTime = endpointMetrics.totalTime / endpointMetrics.count;
      endpointMetrics.minTime = Math.min(endpointMetrics.minTime, responseTime);
      endpointMetrics.maxTime = Math.max(endpointMetrics.maxTime, responseTime);
      
      // Add performance headers
      res.set('X-Response-Time', `${responseTime}ms`);
      res.set('X-Performance-ID', req.performanceId);
      
      // Log slow requests
      if (responseTime > 1000) {
        logger.warn(`🐌 Slow request: ${endpoint} took ${responseTime}ms`, {
          performanceId: req.performanceId,
          responseTime,
          method: req.method,
          path: req.path
        });
      }
      
      return originalJson.call(this, body);
    };
    
    // Handle response finish
    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      this.updateGlobalMetrics(responseTime, res.statusCode);
    });
    
    next();
  };

  /**
   * Memory usage monitoring
   */
  memoryMonitor = (req, res, next) => {
    if (this.config.monitoring.enabled) {
      const memUsage = process.memoryUsage();
      
      // Check memory thresholds
      const memoryUsagePercent = memUsage.heapUsed / memUsage.heapTotal;
      
      if (memoryUsagePercent > this.config.monitoring.alerts.memoryUsage) {
        logger.warn(`⚠️ High memory usage detected: ${(memoryUsagePercent * 100).toFixed(1)}%`, {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          external: Math.round(memUsage.external / 1024 / 1024)
        });
      }
      
      // Add memory headers in development
      if (getEnvironment() === 'LOCAL') {
        res.set('X-Memory-Usage', `${Math.round(memoryUsagePercent * 100)}%`);
        res.set('X-Heap-Used', `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      }
    }
    
    next();
  };

  /**
   * Error tracking middleware
   */
  errorTracker = (error, req, res, next) => {
    const responseTime = Date.now() - (req.startTime || Date.now());
    
    this.metrics.errorCount++;
    const endpoint = `${req.method} ${req.path}`;
    const endpointMetrics = this.metrics.endpoints.get(endpoint);
    
    if (endpointMetrics) {
      endpointMetrics.errors++;
    }
    
    logger.error('Request error occurred', {
      performanceId: req.performanceId,
      responseTime,
      error: error.message,
      stack: error.stack,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode
    });
    
    next(error);
  };

  /**
   * Get performance metrics endpoint
   */
  getMetrics = (req, res) => {
    if (getEnvironment() === 'LOCAL' || req.user?.isAdmin) {
      const uptime = Date.now() - this.startTime;
      const memoryUsage = process.memoryUsage();
      
      res.json({
        uptime: Math.round(uptime / 1000), // seconds
        requestCount: this.metrics.requestCount,
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        errorRate: this.metrics.requestCount > 0 ? 
          ((this.metrics.errorCount / this.metrics.requestCount) * 100).toFixed(2) + '%' : '0%',
        memoryUsage: {
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
        },
        endpoints: Array.from(this.metrics.endpoints.entries()).map(([endpoint, metrics]) => ({
          endpoint,
          count: metrics.count,
          averageTime: Math.round(metrics.averageTime),
          minTime: Math.round(metrics.minTime),
          maxTime: Math.round(metrics.maxTime),
          errors: metrics.errors,
          errorRate: metrics.count > 0 ? ((metrics.errors / metrics.count) * 100).toFixed(2) + '%' : '0%'
        }))
      });
    } else {
      res.status(403).json({ error: 'Access denied' });
    }
  };

  /**
   * Update global metrics
   */
  updateGlobalMetrics(responseTime, statusCode) {
    this.metrics.requestCount++;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (this.metrics.requestCount - 1)) + responseTime) / 
      this.metrics.requestCount;
    
    if (statusCode >= 400) {
      this.metrics.errorCount++;
    }
  }

  /**
   * Generate unique performance ID for request tracing
   */
  generatePerformanceId() {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Health check endpoint
   */
  healthCheck = (req, res) => {
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
    
    const health = {
      status: 'healthy',
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memory: {
        usage: Math.round(memoryUsagePercent * 100),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024)
      },
      performance: {
        averageResponseTime: Math.round(this.metrics.averageResponseTime),
        totalRequests: this.metrics.requestCount,
        errorRate: this.metrics.requestCount > 0 ? 
          ((this.metrics.errorCount / this.metrics.requestCount) * 100).toFixed(2) : '0'
      }
    };

    // Determine overall health status
    if (memoryUsagePercent > 0.9 || this.metrics.averageResponseTime > 2000) {
      health.status = 'unhealthy';
    } else if (memoryUsagePercent > 0.8 || this.metrics.averageResponseTime > 1000) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(health);
  };
}

/**
 * Database Connection Pool Middleware
 * Manages database connections efficiently
 */
class DatabaseConnectionMiddleware {
  constructor() {
    this.config = getPerformanceConfig().database;
    this.pools = new Map();
  }

  /**
   * Initialize database connection pools
   */
  initializePools() {
    console.log('🗄️ Initializing database connection pools...');
    
    const dbConfig = this.config;
    
    if (!dbConfig.host) {
      console.log('ℹ️ No database configuration found, skipping pool initialization');
      return;
    }

    // Initialize PostgreSQL pool if needed
    if (process.env.DATABASE_URL || process.env.DB_HOST) {
      this.initializePostgresPool();
    }
    
    console.log('✅ Database connection pools initialized');
  }

  /**
   * Initialize PostgreSQL connection pool
   */
  initializePostgresPool() {
    try {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'offscreen_buddy',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'password',
        ...this.config.pool
      });

      // Pool event handlers
      pool.on('connect', (client) => {
        console.log('🔗 New database client connected');
      });

      pool.on('error', (err, client) => {
        console.error('💥 Database pool error:', err);
      });

      pool.on('remove', (client) => {
        console.log('🗑️ Database client removed from pool');
      });

      this.pools.set('postgres', pool);
      
      // Test the pool
      pool.query('SELECT NOW()', (err, res) => {
        if (err) {
          console.error('💥 Database pool test failed:', err);
        } else {
          console.log('✅ Database pool test successful');
        }
      });
      
    } catch (error) {
      console.warn('⚠️ PostgreSQL not available, skipping pool initialization:', error.message);
    }
  }

  /**
   * Get database pool
   */
  getPool(type = 'postgres') {
    return this.pools.get(type);
  }

  /**
   * Execute query with connection pool
   */
  async executeQuery(query, params = [], options = {}) {
    const pool = this.getPool('postgres');
    
    if (!pool) {
      throw new Error('Database pool not available');
    }

    const client = await pool.connect();
    
    try {
      const result = await client.query(query, params);
      
      // Log slow queries
      if (options.slowQueryThreshold && result.duration > options.slowQueryThreshold) {
        logger.warn(`🐌 Slow database query detected: ${result.duration}ms`, {
          query: query.substring(0, 100),
          duration: result.duration,
          rows: result.rowCount
        });
      }
      
      return result;
    } finally {
      client.release();
    }
  }

  /**
   * Close all pools
   */
  async closePools() {
    const closePromises = [];
    
    for (const [type, pool] of this.pools) {
      closePromises.push(pool.end());
    }
    
    await Promise.all(closePromises);
    console.log('🗄️ Database connection pools closed');
  }
}

/**
 * Response Compression Middleware
 * Compresses API responses for better performance
 */
class CompressionMiddleware {
  constructor() {
    this.config = getPerformanceConfig().network.compression;
  }

  /**
   * Apply compression to responses
   */
  apply() {
    const compression = require('compression');
    
    return compression({
      level: this.config.level,
      threshold: this.config.threshold,
      filter: (req, res) => {
        // Don't compress responses for images or already compressed files
        if (req.headers['x-no-compression']) {
          return false;
        }
        
        const contentType = res.getHeader('content-type') || '';
        if (contentType.match(/(image|video|audio|pdf)/)) {
          return false;
        }
        
        return compression.filter(req, res);
      }
    });
  }
}

/**
 * Rate Limiting Middleware
 * Prevents abuse and maintains performance
 */
class RateLimitingMiddleware {
  constructor() {
    this.config = getPerformanceConfig().rateLimit;
  }

  /**
   * Apply rate limiting
   */
  apply() {
    const rateLimit = require('express-rate-limit');
    
    return rateLimit({
      windowMs: this.config.windowMs,
      max: this.config.max,
      message: {
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(this.config.windowMs / 1000)
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req, res) => {
        logger.warn('🚫 Rate limit exceeded', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method
        });
        
        res.status(429).json({
          error: 'Too many requests',
          retryAfter: Math.ceil(this.config.windowMs / 1000)
        });
      }
    });
  }
}

// Export middleware instances
const performanceMonitoring = new PerformanceMonitoringMiddleware();
const databaseConnection = new DatabaseConnectionMiddleware();
const compressionMiddleware = new CompressionMiddleware();
const rateLimitingMiddleware = new RateLimitingMiddleware();

module.exports = {
  // Performance monitoring
  performanceMonitoring,
  requestMonitor: performanceMonitoring.requestMonitor,
  memoryMonitor: performanceMonitoring.memoryMonitor,
  errorTracker: performanceMonitoring.errorTracker,
  getMetrics: performanceMonitoring.getMetrics,
  healthCheck: performanceMonitoring.healthCheck,
  
  // Database connection management
  databaseConnection,
  initializePools: () => databaseConnection.initializePools(),
  executeQuery: (query, params, options) => databaseConnection.executeQuery(query, params, options),
  
  // Middleware factories
  compression: () => compressionMiddleware.apply(),
  rateLimit: () => rateLimitingMiddleware.apply(),
  
  // Utility functions
  PerformanceMonitoringMiddleware,
  DatabaseConnectionMiddleware,
  CompressionMiddleware,
  RateLimitingMiddleware
};