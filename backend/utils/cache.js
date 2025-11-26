/**
 * Caching Utilities
 * Multi-level caching system with Redis integration and intelligent cache management
 */

const { getPerformanceConfig, getEnvironment } = require('../config/performance');
const { logger } = require('../config/logger');

/**
 * Multi-Level Cache Manager
 * Manages memory, database, and Redis caches with intelligent layering
 */
class MultiLevelCacheManager {
  constructor() {
    this.config = getPerformanceConfig().caching;
    this.memoryCache = new Map();
    this.redisClient = null;
    this.cacheStats = {
      hits: { memory: 0, redis: 0, total: 0 },
      misses: { memory: 0, redis: 0, total: 0 },
      sets: { memory: 0, redis: 0, total: 0 },
      deletions: { memory: 0, redis: 0, total: 0 }
    };
    
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    if (!this.config.redis.enabled) {
      console.log('ℹ️ Redis caching disabled, using only memory cache');
      return;
    }

    try {
      // Try to require redis
      let redis;
      try {
        redis = require('redis');
      } catch (error) {
        console.warn('⚠️ Redis not available, installing redis package recommended: npm install redis');
        return;
      }

      this.redisClient = redis.createClient({
        host: this.config.redis.host,
        port: this.config.redis.port,
        db: this.config.redis.db,
        password: this.config.redis.password,
        retryDelayOnFailover: this.config.redis.retryDelayOnFailover,
        enableOfflineQueue: this.config.redis.enableOfflineQueue,
        maxRetriesPerRequest: this.config.redis.maxRetriesPerRequest
      });

      this.redisClient.on('connect', () => {
        console.log('🔗 Connected to Redis cache');
      });

      this.redisClient.on('error', (err) => {
        console.error('💥 Redis cache error:', err);
        logger.error('Redis cache connection error', { error: err.message });
      });

      this.redisClient.on('ready', () => {
        console.log('✅ Redis cache ready');
      });

      // Test connection
      await this.redisClient.ping();
      console.log('✅ Redis cache connection test successful');
      
    } catch (error) {
      console.warn('⚠️ Failed to initialize Redis cache:', error.message);
      this.redisClient = null;
    }
  }

  /**
   * Set a value in the cache (multi-level)
   */
  async set(key, value, options = {}) {
    const ttl = options.ttl || this.config.ttl;
    const compressed = options.compression && this.config.compression;
    
    try {
      let dataToStore = value;
      
      // Compress data if enabled and beneficial
      if (compressed && this.shouldCompress(value)) {
        dataToStore = await this.compressData(value);
      }

      // Store in memory cache
      this.memoryCache.set(key, {
        data: dataToStore,
        timestamp: Date.now(),
        ttl: ttl * 1000,
        compressed: compressed
      });
      
      this.cacheStats.sets.memory++;
      this.cacheStats.sets.total++;

      // Store in Redis if available
      if (this.redisClient) {
        const redisKey = `${this.config.redis.keyPrefix}${key}`;
        await this.redisClient.setex(redisKey, ttl, JSON.stringify({
          data: dataToStore,
          timestamp: Date.now(),
          compressed: compressed
        }));
        
        this.cacheStats.sets.redis++;
        this.cacheStats.sets.total++;
      }

      logger.debug(`💾 Cached key: ${key}`, { ttl, compressed, size: JSON.stringify(dataToStore).length });
      
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      throw error;
    }
  }

  /**
   * Get a value from the cache (multi-level with fallback)
   */
  async get(key, options = {}) {
    try {
      // Try memory cache first (fastest)
      let cachedData = this.memoryCache.get(key);
      if (cachedData) {
        if (this.isCacheValid(cachedData)) {
          this.cacheStats.hits.memory++;
          this.cacheStats.hits.total++;
          
          // Decompress if needed
          if (cachedData.compressed) {
            cachedData.data = await this.decompressData(cachedData.data);
          }
          
          return cachedData.data;
        } else {
          // Remove expired entry
          this.memoryCache.delete(key);
          this.cacheStats.deletions.memory++;
        }
      }

      // Try Redis cache (second level)
      if (this.redisClient) {
        const redisKey = `${this.config.redis.keyPrefix}${key}`;
        const redisData = await this.redisClient.get(redisKey);
        
        if (redisData) {
          try {
            const parsedData = JSON.parse(redisData);
            if (this.isCacheValid(parsedData)) {
              this.cacheStats.hits.redis++;
              this.cacheStats.hits.total++;
              
              // Restore to memory cache for faster future access
              this.memoryCache.set(key, parsedData);
              
              // Decompress if needed
              if (parsedData.compressed) {
                parsedData.data = await this.decompressData(parsedData.data);
              }
              
              return parsedData.data;
            } else {
              // Remove expired entry from Redis
              await this.redisClient.del(redisKey);
              this.cacheStats.deletions.redis++;
            }
          } catch (parseError) {
            logger.warn('Failed to parse Redis cache data', { key, error: parseError.message });
            await this.redisClient.del(redisKey);
          }
        }
      }

      // Cache miss
      this.cacheStats.misses.total++;
      if (!this.redisClient) {
        this.cacheStats.misses.memory++;
      } else {
        this.cacheStats.misses.redis++;
      }
      
      return null;
      
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      this.cacheStats.misses.total++;
      return null;
    }
  }

  /**
   * Delete a key from all cache levels
   */
  async delete(key) {
    try {
      // Remove from memory cache
      if (this.memoryCache.has(key)) {
        this.memoryCache.delete(key);
        this.cacheStats.deletions.memory++;
      }

      // Remove from Redis cache
      if (this.redisClient) {
        const redisKey = `${this.config.redis.keyPrefix}${key}`;
        await this.redisClient.del(redisKey);
        this.cacheStats.deletions.redis++;
      }

      logger.debug(`🗑️ Deleted cache key: ${key}`);
      
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
    }
  }

  /**
   * Check if cache data is still valid
   */
  isCacheValid(cachedData) {
    if (!cachedData || !cachedData.timestamp || !cachedData.ttl) {
      return false;
    }
    
    return (Date.now() - cachedData.timestamp) < cachedData.ttl;
  }

  /**
   * Check if data should be compressed
   */
  shouldCompress(data) {
    const dataString = JSON.stringify(data);
    return dataString.length > 1024; // Compress if larger than 1KB
  }

  /**
   * Compress data (placeholder for real compression)
   */
  async compressData(data) {
    // In a real implementation, you'd use zlib or similar
    return JSON.stringify(data);
  }

  /**
   * Decompress data (placeholder for real decompression)
   */
  async decompressData(compressedData) {
    // In a real implementation, you'd use zlib or similar
    return JSON.parse(compressedData);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const totalRequests = this.cacheStats.hits.total + this.cacheStats.misses.total;
    const hitRate = totalRequests > 0 ? ((this.cacheStats.hits.total / totalRequests) * 100).toFixed(2) : '0';
    
    return {
      stats: this.cacheStats,
      hitRate: `${hitRate}%`,
      memoryCacheSize: this.memoryCache.size,
      redisConnected: this.redisClient ? this.redisClient.connected : false
    };
  }

  /**
   * Clear all caches
   */
  async clear() {
    try {
      this.memoryCache.clear();
      this.cacheStats = {
        hits: { memory: 0, redis: 0, total: 0 },
        misses: { memory: 0, redis: 0, total: 0 },
        sets: { memory: 0, redis: 0, total: 0 },
        deletions: { memory: 0, redis: 0, total: 0 }
      };

      if (this.redisClient) {
        const pattern = `${this.config.redis.keyPrefix}*`;
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          await this.redisClient.del(...keys);
        }
      }

      logger.info('🧹 Cache cleared successfully');
      
    } catch (error) {
      logger.error('Cache clear error', { error: error.message });
    }
  }

  /**
   * Clean expired entries
   */
  async cleanup() {
    const now = Date.now();
    let cleaned = 0;

    // Clean memory cache
    for (const [key, cachedData] of this.memoryCache.entries()) {
      if (!this.isCacheValid(cachedData)) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    // Clean Redis cache (pattern-based deletion)
    if (this.redisClient) {
      const pattern = `${this.config.redis.keyPrefix}*`;
      const keys = await this.redisClient.keys(pattern);
      
      for (const key of keys) {
        const data = await this.redisClient.get(key);
        if (data) {
          try {
            const parsedData = JSON.parse(data);
            if (!this.isCacheValid(parsedData)) {
              await this.redisClient.del(key);
              cleaned++;
            }
          } catch (error) {
            // Invalid JSON, delete the key
            await this.redisClient.del(key);
            cleaned++;
          }
        }
      }
    }

    if (cleaned > 0) {
      logger.info(`🧹 Cleaned ${cleaned} expired cache entries`);
    }

    return cleaned;
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient) {
      await this.redisClient.quit();
      console.log('🔗 Redis cache connection closed');
    }
  }
}

/**
 * API Response Cache Manager
 * Specialized cache for API responses with intelligent caching strategies
 */
class APIResponseCacheManager {
  constructor() {
    this.config = getPerformanceConfig().caching;
    this.cache = new MultiLevelCacheManager();
    this.endpointConfigs = new Map();
    this.initializeEndpointConfigs();
  }

  /**
   * Initialize endpoint-specific cache configurations
   */
  initializeEndpointConfigs() {
    // Configure cache settings for different endpoints
    const configs = {
      // User data - cache for 5 minutes
      '/api/users/*': { ttl: 300, compress: true },
      
      // Analytics data - cache for 1 hour
      '/api/analytics/*': { ttl: 3600, compress: true },
      
      // Payment data - short cache
      '/api/payments/*': { ttl: 60, compress: false },
      
      // Settings - cache for 30 minutes
      '/api/settings/*': { ttl: 1800, compress: true },
      
      // Auth endpoints - minimal caching
      '/api/auth/*': { ttl: 30, compress: false },
      
      // Static data - cache for 24 hours
      '/api/static/*': { ttl: 86400, compress: true }
    };

    for (const [pattern, config] of Object.entries(configs)) {
      this.endpointConfigs.set(pattern, config);
    }
  }

  /**
   * Get cache configuration for an endpoint
   */
  getEndpointConfig(endpoint) {
    for (const [pattern, config] of this.endpointConfigs.entries()) {
      if (this.matchesPattern(endpoint, pattern)) {
        return config;
      }
    }
    
    // Default configuration
    return { ttl: this.config.ttl, compress: this.config.compression };
  }

  /**
   * Check if endpoint matches pattern
   */
  matchesPattern(endpoint, pattern) {
    // Simple pattern matching - in production, use proper pattern library
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(endpoint);
    }
    
    return endpoint === pattern;
  }

  /**
   * Generate cache key for API response
   */
  generateCacheKey(req) {
    const { method, path, query, user } = req;
    const userId = user?.id || 'anonymous';
    const queryString = JSON.stringify(query || {});
    
    return `api:${method}:${path}:${userId}:${this.hashString(queryString)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Check if response should be cached
   */
  shouldCache(req, res, data) {
    const endpoint = `${req.method} ${req.path}`;
    
    // Don't cache error responses
    if (res.statusCode >= 400) {
      return false;
    }
    
    // Don't cache responses with no-cache header
    if (req.headers['cache-control'] === 'no-cache') {
      return false;
    }
    
    // Don't cache large responses in local environment
    if (getEnvironment() === 'LOCAL' && JSON.stringify(data).length > 1024 * 1024) {
      return false;
    }
    
    return true;
  }

  /**
   * Get cached response
   */
  async getCachedResponse(req) {
    const cacheKey = this.generateCacheKey(req);
    return await this.cache.get(cacheKey);
  }

  /**
   * Cache API response
   */
  async cacheResponse(req, res, data) {
    if (!this.shouldCache(req, res, data)) {
      return false;
    }

    const cacheKey = this.generateCacheKey(req);
    const endpointConfig = this.getEndpointConfig(req.path);
    
    try {
      await this.cache.set(cacheKey, {
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type'),
          'cache-control': `max-age=${endpointConfig.ttl}`
        },
        data: data
      }, {
        ttl: endpointConfig.ttl,
        compression: endpointConfig.compress
      });

      // Add cache headers to response
      res.set('X-Cache', 'MISS');
      res.set('Cache-Control', `max-age=${endpointConfig.ttl}`);
      res.set('X-Cache-TTL', endpointConfig.ttl.toString());
      
      logger.debug(`💾 Cached API response: ${cacheKey}`, { ttl: endpointConfig.ttl });
      return true;
      
    } catch (error) {
      logger.error('API response caching error', { cacheKey, error: error.message });
      return false;
    }
  }

  /**
   * Invalidate cache for endpoint patterns
   */
  async invalidatePattern(pattern) {
    // For now, clear all cache - in production, implement pattern-based invalidation
    await this.cache.clear();
    logger.info(`🗑️ Invalidated cache for pattern: ${pattern}`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Close cache connections
   */
  async close() {
    await this.cache.close();
  }
}

/**
 * Query Result Cache Manager
 * Caches database query results for performance optimization
 */
class QueryResultCacheManager {
  constructor() {
    this.config = getPerformanceConfig().caching;
    this.cache = new MultiLevelCacheManager();
    this.queryStats = new Map();
  }

  /**
   * Cache query result
   */
  async cacheQuery(query, params, result, options = {}) {
    const queryKey = this.generateQueryKey(query, params);
    const ttl = options.ttl || 300; // Default 5 minutes
    
    try {
      await this.cache.set(queryKey, {
        result: result,
        query: query,
        params: params,
        rowCount: result?.rowCount || 0
      }, { ttl });

      logger.debug(`💾 Cached query result: ${queryKey.substring(0, 50)}...`, { ttl, rowCount: result?.rowCount || 0 });
      
    } catch (error) {
      logger.error('Query result caching error', { query: query.substring(0, 100), error: error.message });
    }
  }

  /**
   * Get cached query result
   */
  async getCachedQuery(query, params) {
    const queryKey = this.generateQueryKey(query, params);
    const cachedResult = await this.cache.get(queryKey);
    
    if (cachedResult) {
      // Update query statistics
      this.updateQueryStats(query, true);
      return cachedResult.result;
    }
    
    // Update query statistics
    this.updateQueryStats(query, false);
    return null;
  }

  /**
   * Generate cache key for query
   */
  generateQueryKey(query, params) {
    const queryHash = this.hashString(query.trim().toLowerCase());
    const paramsHash = this.hashString(JSON.stringify(params));
    return `query:${queryHash}:${paramsHash}`;
  }

  /**
   * Simple hash function
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Update query statistics
   */
  updateQueryStats(query, cacheHit) {
    const querySignature = query.trim().toLowerCase().substring(0, 50);
    
    if (!this.queryStats.has(querySignature)) {
      this.queryStats.set(querySignature, { hits: 0, misses: 0, totalTime: 0 });
    }
    
    const stats = this.queryStats.get(querySignature);
    if (cacheHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    const stats = {};
    for (const [query, data] of this.queryStats.entries()) {
      const total = data.hits + data.misses;
      stats[query] = {
        ...data,
        hitRate: total > 0 ? ((data.hits / total) * 100).toFixed(2) : '0'
      };
    }
    return stats;
  }

  /**
   * Close cache connections
   */
  async close() {
    await this.cache.close();
  }
}

// Export singleton instances
const multiLevelCache = new MultiLevelCacheManager();
const apiResponseCache = new APIResponseCacheManager();
const queryResultCache = new QueryResultCacheManager();

module.exports = {
  // Multi-level cache manager
  multiLevelCache,
  
  // API response cache manager
  apiResponseCache,
  getCachedResponse: (req) => apiResponseCache.getCachedResponse(req),
  cacheResponse: (req, res, data) => apiResponseCache.cacheResponse(req, res, data),
  invalidatePattern: (pattern) => apiResponseCache.invalidatePattern(pattern),
  
  // Query result cache manager
  queryResultCache,
  cacheQuery: (query, params, result, options) => queryResultCache.cacheQuery(query, params, result, options),
  getCachedQuery: (query, params) => queryResultCache.getCachedQuery(query, params),
  
  // Utility functions
  MultiLevelCacheManager,
  APIResponseCacheManager,
  QueryResultCacheManager
};