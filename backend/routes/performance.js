/**
 * Performance Monitoring Routes
 * REST API endpoints for performance monitoring and optimization status
 */

const express = require('express');
const router = express.Router();

// Import performance monitoring components
const {
  performanceMonitoring,
  getMetrics,
  healthCheck
} = require('../middleware/performance');

const {
  multiLevelCache,
  apiResponseCache,
  queryResultCache
} = require('../utils/cache');

const {
  backgroundJobProcessor,
  memoryOptimizer,
  bundleOptimizer
} = require('../utils/optimizer');

const { getPerformanceConfig, getEnvironment } = require('../config/performance');
const { logger } = require('../config/logger');

/**
 * GET /api/performance/health
 * Comprehensive health check with performance metrics
 */
router.get('/health', async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: getEnvironment(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.round(process.uptime()),
      services: {},
      performance: {}
    };

    // Check system resources
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    health.services = {
      server: {
        status: 'healthy',
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      },
      
      cache: {
        status: 'healthy',
        memory: multiLevelCache.getStats(),
        api: apiResponseCache.getCacheStats(),
        query: queryResultCache.getQueryStats()
      },
      
      backgroundJobs: {
        status: 'healthy',
        stats: backgroundJobProcessor.getStats()
      },
      
      database: {
        status: 'unknown',
        message: 'Database health check not implemented'
      }
    };

    // Performance metrics
    health.performance = {
      averageResponseTime: performanceMonitoring.metrics.averageResponseTime,
      totalRequests: performanceMonitoring.metrics.requestCount,
      errorRate: performanceMonitoring.metrics.requestCount > 0 ? 
        ((performanceMonitoring.metrics.errorCount / performanceMonitoring.metrics.requestCount) * 100).toFixed(2) : '0',
      memoryOptimization: memoryOptimizer.getMemoryStats()
    };

    // Determine overall health
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
    const errorRate = parseFloat(health.performance.errorRate);
    const avgResponseTime = health.performance.averageResponseTime;

    if (memoryPercent > 90 || errorRate > 10 || avgResponseTime > 5000) {
      health.status = 'unhealthy';
    } else if (memoryPercent > 80 || errorRate > 5 || avgResponseTime > 2000) {
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(health);

  } catch (error) {
    logger.error('Health check failed', { error: error.message, stack: error.stack });
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/performance/metrics
 * Detailed performance metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const authorized = getEnvironment() === 'LOCAL' || req.user?.isAdmin;
    
    if (!authorized) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const metrics = {
      timestamp: new Date().toISOString(),
      server: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        platform: process.platform,
        nodeVersion: process.version
      },
      
      performance: {
        ...performanceMonitoring.metrics,
        endpoints: Array.from(performanceMonitoring.metrics.endpoints.entries())
      },
      
      cache: {
        memory: multiLevelCache.getStats(),
        api: apiResponseCache.getCacheStats(),
        query: queryResultCache.getQueryStats()
      },
      
      backgroundJobs: backgroundJobProcessor.getStats(),
      
      memoryOptimization: memoryOptimizer.getMemoryStats(),
      
      bundle: {
        optimizations: bundleOptimizer.optimizeBundle(),
        recommendations: bundleOptimizer.getBundleRecommendations()
      },
      
      environment: {
        type: getEnvironment(),
        config: getPerformanceConfig()
      }
    };

    res.json(metrics);

  } catch (error) {
    logger.error('Metrics collection failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to collect metrics',
      message: error.message
    });
  }
});

/**
 * GET /api/performance/cache
 * Cache performance statistics
 */
router.get('/cache', async (req, res) => {
  try {
    const cacheStats = {
      timestamp: new Date().toISOString(),
      multiLevelCache: multiLevelCache.getStats(),
      apiCache: apiResponseCache.getCacheStats(),
      queryCache: queryResultCache.getQueryStats(),
      configuration: getPerformanceConfig().caching
    };

    res.json(cacheStats);

  } catch (error) {
    logger.error('Cache stats retrieval failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve cache statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/performance/memory
 * Memory usage and optimization stats
 */
router.get('/memory', async (req, res) => {
  try {
    const memoryStats = {
      timestamp: new Date().toISOString(),
      current: memoryOptimizer.getMemoryStats(),
      process: process.memoryUsage(),
      system: {
        totalMemory: require('os').totalmem(),
        freeMemory: require('os').freemem(),
        loadAverage: require('os').loadavg()
      }
    };

    res.json(memoryStats);

  } catch (error) {
    logger.error('Memory stats retrieval failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve memory statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/performance/jobs
 * Background job processing status
 */
router.get('/jobs', async (req, res) => {
  try {
    const jobStats = backgroundJobProcessor.getStats();
    
    res.json({
      timestamp: new Date().toISOString(),
      stats: jobStats,
      configuration: getPerformanceConfig().jobs
    });

  } catch (error) {
    logger.error('Job stats retrieval failed', { error: error.message });
    res.status(500).json({
      error: 'Failed to retrieve job statistics',
      message: error.message
    });
  }
});

module.exports = router;