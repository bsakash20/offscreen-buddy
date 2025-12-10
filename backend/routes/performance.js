/**
 * Performance Monitoring Routes
 * REST API endpoints for performance monitoring and optimization status
 */

const express = require('express');
const router = express.Router();

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
      memoryOptimization: memoryOptimizer.getMemoryStats()
    };

    // Determine overall health
    const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    if (memoryPercent > 90) {
      health.status = 'unhealthy';
    } else if (memoryPercent > 80) {
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

module.exports = router;