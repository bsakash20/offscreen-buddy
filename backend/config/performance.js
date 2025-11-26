/**
 * Backend Performance Configuration Management
 * Environment-aware performance optimization settings for production environments
 */

const { getEnvironment } = require('./environment');

/**
 * Performance Configuration Manager
 * Handles all performance-related settings based on environment
 */
class PerformanceConfigManager {
  constructor() {
    this.environment = getEnvironment();
    this.config = this.loadPerformanceConfig();
  }

  /**
   * Load performance configuration based on environment
   */
  loadPerformanceConfig() {
    console.log(`⚡ Loading performance configuration for ${this.environment}...`);

    if (this.environment === 'LOCAL') {
      return this.getLocalPerformanceConfig();
    } else {
      return this.getProductionPerformanceConfig();
    }
  }

  /**
   * Local/Development Performance Configuration
   */
  getLocalPerformanceConfig() {
    return {
      environment: 'LOCAL',
      
      // Database Connection Pool Configuration
      database: {
        pool: {
          min: 2,
          max: 10,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200
        },
        // Connection settings
        connectionLimit: 10,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      },

      // API Response Caching Configuration
      caching: {
        enabled: false, // Disabled in local for easier debugging
        ttl: 300, // 5 minutes
        maxSize: 1000,
        compression: true,
        redis: {
          enabled: false,
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          db: 0,
          keyPrefix: 'offscreen_buddy:'
        }
      },

      // Memory Management Configuration
      memory: {
        maxHeapSize: '512MB',
        garbageCollection: {
          enabled: true,
          interval: 30000, // 30 seconds
          aggressive: false
        },
        monitoring: {
          enabled: true,
          alertThreshold: 0.8, // 80% memory usage
          checkInterval: 10000 // 10 seconds
        }
      },

      // CPU Optimization Configuration
      cpu: {
        optimization: {
          enabled: true,
          workerThreads: 2, // Half of available cores for local
          loadBalancing: true
        },
        intensiveTasks: {
          enabled: true,
          timeout: 30000, // 30 seconds
          retries: 2
        }
      },

      // Network Optimization Configuration
      network: {
        http2: {
          enabled: false // Disabled in local for simplicity
        },
        compression: {
          enabled: true,
          level: 3,
          threshold: 1024
        },
        timeout: {
          request: 30000,
          response: 30000,
          keepAlive: 5000
        }
      },

      // Background Job Processing Configuration
      jobs: {
        enabled: true,
        concurrency: 2,
        delay: 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        maxConcurrency: 10
      },

      // Static Asset Optimization
      static: {
        optimization: {
          gzip: false,
          brotli: false,
          caching: false
        },
        maxAge: 3600 // 1 hour
      },

      // Performance Monitoring Configuration
      monitoring: {
        enabled: true,
        metrics: {
          collectionInterval: 5000, // 5 seconds
          retention: 3600000, // 1 hour
          detailed: true
        },
        alerts: {
          enabled: false, // Disabled in local
          responseTime: 5000, // 5 seconds
          errorRate: 0.1, // 10%
          memoryUsage: 0.8 // 80%
        },
        profiling: {
          enabled: true,
          interval: 10000 // 10 seconds
        }
      },

      // API Rate Limiting and Throttling
      rateLimit: {
        windowMs: 900000, // 15 minutes
        max: 1000, // 1000 requests per window
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },

      // Bundle Size Optimization
      bundle: {
        treeShaking: true,
        minification: false, // Disabled in local for debugging
        sourcemaps: true,
        chunkSplitting: true
      }
    };
  }

  /**
   * Production Performance Configuration
   */
  getProductionPerformanceConfig() {
    return {
      environment: 'PROD',
      
      // Database Connection Pool Configuration
      database: {
        pool: {
          min: parseInt(process.env.DB_POOL_MIN) || 5,
          max: parseInt(process.env.DB_POOL_MAX) || 50,
          acquireTimeoutMillis: 30000,
          createTimeoutMillis: 30000,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: 30000,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200
        },
        connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 100,
        acquireTimeout: 60000,
        timeout: 60000,
        reconnect: true
      },

      // API Response Caching Configuration
      caching: {
        enabled: true,
        ttl: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
        maxSize: parseInt(process.env.CACHE_MAX_SIZE) || 10000,
        compression: true,
        redis: {
          enabled: process.env.REDIS_ENABLED === 'true',
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT) || 6379,
          db: parseInt(process.env.REDIS_DB) || 0,
          keyPrefix: process.env.REDIS_PREFIX || 'offscreen_buddy:',
          password: process.env.REDIS_PASSWORD,
          retryDelayOnFailover: 100,
          enableOfflineQueue: false,
          maxRetriesPerRequest: 3
        }
      },

      // Memory Management Configuration
      memory: {
        maxHeapSize: process.env.NODE_MAX_HEAP_SIZE || '1GB',
        garbageCollection: {
          enabled: true,
          interval: 15000, // 15 seconds
          aggressive: true
        },
        monitoring: {
          enabled: true,
          alertThreshold: 0.85, // 85% memory usage
          checkInterval: 5000 // 5 seconds
        }
      },

      // CPU Optimization Configuration
      cpu: {
        optimization: {
          enabled: true,
          workerThreads: Math.max(2, Math.floor(require('os').cpus().length / 2)),
          loadBalancing: true
        },
        intensiveTasks: {
          enabled: true,
          timeout: 60000, // 1 minute
          retries: 5
        }
      },

      // Network Optimization Configuration
      network: {
        http2: {
          enabled: process.env.HTTP2_ENABLED === 'true'
        },
        compression: {
          enabled: true,
          level: 6,
          threshold: 512
        },
        timeout: {
          request: parseInt(process.env.REQUEST_TIMEOUT) || 10000,
          response: parseInt(process.env.RESPONSE_TIMEOUT) || 30000,
          keepAlive: 30000
        }
      },

      // Background Job Processing Configuration
      jobs: {
        enabled: true,
        concurrency: parseInt(process.env.JOB_CONCURRENCY) || 10,
        delay: 0,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        maxConcurrency: parseInt(process.env.JOB_MAX_CONCURRENCY) || 50
      },

      // Static Asset Optimization
      static: {
        optimization: {
          gzip: true,
          brotli: true,
          caching: true
        },
        maxAge: 86400 // 24 hours
      },

      // Performance Monitoring Configuration
      monitoring: {
        enabled: true,
        metrics: {
          collectionInterval: 1000, // 1 second
          retention: 86400000, // 24 hours
          detailed: false
        },
        alerts: {
          enabled: process.env.PERFORMANCE_ALERTS_ENABLED === 'true',
          responseTime: parseInt(process.env.ALERT_RESPONSE_TIME) || 2000,
          errorRate: parseFloat(process.env.ALERT_ERROR_RATE) || 0.05,
          memoryUsage: parseFloat(process.env.ALERT_MEMORY_USAGE) || 0.9
        },
        profiling: {
          enabled: process.env.PERFORMANCE_PROFILING === 'true',
          interval: 30000 // 30 seconds
        }
      },

      // API Rate Limiting and Throttling
      rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
        max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },

      // Bundle Size Optimization
      bundle: {
        treeShaking: true,
        minification: true,
        sourcemaps: false,
        chunkSplitting: true
      }
    };
  }

  /**
   * Get specific performance configuration section
   */
  getPerformanceConfig(section) {
    if (!section) {
      return this.config;
    }
    
    return this.config[section] || null;
  }

  /**
   * Check if performance optimization is enabled
   */
  isOptimizationEnabled(optimizationType) {
    const config = this.getPerformanceConfig(optimizationType);
    return config && config.enabled === true;
  }

  /**
   * Get database connection pool configuration
   */
  getDatabaseConfig() {
    return this.config.database;
  }

  /**
   * Get caching configuration
   */
  getCachingConfig() {
    return this.config.caching;
  }

  /**
   * Get memory management configuration
   */
  getMemoryConfig() {
    return this.config.memory;
  }

  /**
   * Get monitoring configuration
   */
  getMonitoringConfig() {
    return this.config.monitoring;
  }

  /**
   * Get network optimization configuration
   */
  getNetworkConfig() {
    return this.config.network;
  }

  /**
   * Get job processing configuration
   */
  getJobsConfig() {
    return this.config.jobs;
  }

  /**
   * Reload configuration (useful for environment changes)
   */
  reload() {
    this.environment = getEnvironment();
    this.config = this.loadPerformanceConfig();
    return this.config;
  }
}

// Export singleton instance
const performanceConfig = new PerformanceConfigManager();

module.exports = {
  // Main configuration getter
  getPerformanceConfig: (section) => performanceConfig.getPerformanceConfig(section),
  
  // Specific configuration getters
  getDatabaseConfig: () => performanceConfig.getDatabaseConfig(),
  getCachingConfig: () => performanceConfig.getCachingConfig(),
  getMemoryConfig: () => performanceConfig.getMemoryConfig(),
  getMonitoringConfig: () => performanceConfig.getMonitoringConfig(),
  getNetworkConfig: () => performanceConfig.getNetworkConfig(),
  getJobsConfig: () => performanceConfig.getJobsConfig(),
  
  // Utility methods
  isOptimizationEnabled: (optimizationType) => performanceConfig.isOptimizationEnabled(optimizationType),
  reloadPerformanceConfig: () => performanceConfig.reload(),
  
  // Environment info
  getEnvironment: () => performanceConfig.environment,
  isLocal: () => performanceConfig.environment === 'LOCAL',
  isProduction: () => performanceConfig.environment === 'PROD',
  
  // Performance manager instance for direct access
  performanceConfigManager: performanceConfig,
  
  // Performance constants
  PERFORMANCE_TARGETS: {
    API_RESPONSE_TIME: 200, // 200ms
    DB_QUERY_TIME: 100, // 100ms
    MEMORY_USAGE: 512, // 512MB
    BUNDLE_SIZE: 5 * 1024 * 1024, // 5MB
    COLD_START_TIME: 3000, // 3 seconds
    CONNECTION_POOL_SIZE: {
      LOCAL: { min: 2, max: 10 },
      PROD: { min: 5, max: 50 }
    }
  }
};