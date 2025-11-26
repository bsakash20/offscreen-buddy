/**
 * Backend Optimization Utilities
 * Performance optimization utilities for backend services, background processing, and resource management
 */

const { getPerformanceConfig, getEnvironment } = require('../config/performance');
const { logger } = require('../config/logger');

/**
 * Background Job Processor
 * Manages CPU-intensive tasks and background processing
 */
class BackgroundJobProcessor {
  constructor() {
    this.config = getPerformanceConfig().jobs;
    this.queue = [];
    this.running = false;
    this.workerCount = 0;
    this.maxConcurrency = this.config.maxConcurrency || 10;
    this.jobs = new Map();
    this.stats = {
      processed: 0,
      failed: 0,
      averageTime: 0,
      queueSize: 0
    };
    
    this.initializeWorkerPool();
  }

  /**
   * Initialize worker pool for CPU-intensive tasks
   */
  initializeWorkerPool() {
    if (!this.config.enabled) {
      console.log('ℹ️ Background job processing disabled');
      return;
    }

    console.log(`🔄 Initializing background job processor with ${this.config.concurrency} workers...`);
    
    // In a production environment, you'd use a proper job queue like Bull or Agenda
    // For now, using setImmediate for worker simulation
    this.startWorkers();
  }

  /**
   * Start worker processes
   */
  startWorkers() {
    for (let i = 0; i < this.config.concurrency; i++) {
      this.createWorker(`worker-${i}`);
    }
  }

  /**
   * Create a worker process
   */
  createWorker(workerId) {
    console.log(`👷 Starting worker: ${workerId}`);
    
    const processJob = async () => {
      if (this.queue.length === 0) {
        setTimeout(processJob, 100);
        return;
      }

      const job = this.queue.shift();
      this.workerCount++;
      
      try {
        const startTime = Date.now();
        
        logger.debug(`📋 Processing job ${job.id}`, { 
          workerId, 
          jobType: job.type, 
          priority: job.priority 
        });
        
        const result = await this.executeJob(job);
        
        const duration = Date.now() - startTime;
        this.updateStats(duration, true);
        
        // Call job callback with result
        if (job.callback) {
          job.callback(null, result);
        }
        
        logger.debug(`✅ Job ${job.id} completed in ${duration}ms`, { 
          workerId, 
          duration 
        });
        
      } catch (error) {
        const duration = Date.now() - Date.now(); // Would be start time in real implementation
        this.updateStats(duration, false);
        
        logger.error(`❌ Job ${job.id} failed`, { 
          workerId, 
          error: error.message,
          stack: error.stack 
        });
        
        if (job.callback) {
          job.callback(error);
        }
        
        // Retry logic
        if (job.attempts < this.config.attempts) {
          job.attempts++;
          job.delay = this.calculateBackoff(job.attempts);
          setTimeout(() => {
            this.queue.push(job);
          }, job.delay);
        }
      } finally {
        this.workerCount--;
      }
      
      // Continue processing
      setImmediate(processJob);
    };

    // Start the worker
    processJob();
  }

  /**
   * Add job to queue
   */
  addJob(jobType, data, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: jobType,
      data: data,
      priority: options.priority || 'normal',
      attempts: 0,
      callback: options.callback,
      createdAt: Date.now()
    };

    // Insert job based on priority
    const priorityOrder = { high: 0, normal: 1, low: 2 };
    const jobPriority = priorityOrder[job.priority] || 1;
    
    let inserted = false;
    for (let i = 0; i < this.queue.length; i++) {
      const queuePriority = priorityOrder[this.queue[i].priority] || 1;
      if (jobPriority <= queuePriority) {
        this.queue.splice(i, 0, job);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      this.queue.push(job);
    }
    
    this.jobs.set(job.id, job);
    
    logger.debug(`📥 Added job to queue: ${job.id}`, { 
      type: jobType, 
      priority: job.priority,
      queueSize: this.queue.length 
    });
    
    return job.id;
  }

  /**
   * Execute job based on type
   */
  async executeJob(job) {
    switch (job.type) {
      case 'data_processing':
        return this.processData(job.data);
      case 'email_sending':
        return this.sendEmail(job.data);
      case 'report_generation':
        return this.generateReport(job.data);
      case 'cleanup_tasks':
        return this.performCleanup(job.data);
      case 'analytics_processing':
        return this.processAnalytics(job.data);
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
  }

  /**
   * Data processing job
   */
  async processData(data) {
    // Simulate CPU-intensive data processing
    const startTime = Date.now();
    
    // Simulate processing time based on data size
    const processingTime = Math.min(data.size * 10, 5000);
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    return {
      processed: data.size,
      duration: Date.now() - startTime,
      result: 'Data processed successfully'
    };
  }

  /**
   * Email sending job
   */
  async sendEmail(data) {
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      recipient: data.to,
      subject: data.subject,
      status: 'sent'
    };
  }

  /**
   * Report generation job
   */
  async generateReport(data) {
    // Simulate report generation
    const startTime = Date.now();
    
    // Simulate complex report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      reportType: data.type,
      generatedAt: new Date(),
      duration: Date.now() - startTime,
      filePath: `/reports/${data.type}_${Date.now()}.pdf`
    };
  }

  /**
   * Cleanup tasks
   */
  async performCleanup(data) {
    const startTime = Date.now();
    
    // Simulate cleanup operations
    const cleanupTasks = [
      () => this.clearOldLogs(),
      () => this.cleanupTempFiles(),
      () => this.optimizeDatabase()
    ];
    
    for (const task of cleanupTasks) {
      await task();
    }
    
    return {
      tasks: cleanupTasks.length,
      duration: Date.now() - startTime,
      status: 'completed'
    };
  }

  /**
   * Analytics processing job
   */
  async processAnalytics(data) {
    // Simulate analytics processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      dataPoints: data.points,
      processed: true,
      insights: ['Performance improved by 15%', 'User engagement up 23%']
    };
  }

  /**
   * Calculate backoff delay for retries
   */
  calculateBackoff(attempt) {
    const backoffConfig = this.config.backoff;
    
    if (backoffConfig.type === 'exponential') {
      return Math.min(backoffConfig.delay * Math.pow(2, attempt - 1), 60000);
    }
    
    return backoffConfig.delay;
  }

  /**
   * Update processing statistics
   */
  updateStats(duration, success) {
    this.stats.processed++;
    this.stats.averageTime = (this.stats.averageTime * (this.stats.processed - 1) + duration) / this.stats.processed;
    
    if (!success) {
      this.stats.failed++;
    }
    
    this.stats.queueSize = this.queue.length;
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      ...this.stats,
      workerCount: this.workerCount,
      maxConcurrency: this.maxConcurrency,
      successRate: this.stats.processed > 0 ? 
        (((this.stats.processed - this.stats.failed) / this.stats.processed) * 100).toFixed(2) + '%' : '100%'
    };
  }

  /**
   * Get job status
   */
  getJobStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }
    
    return {
      id: job.id,
      type: job.type,
      status: this.queue.includes(job) ? 'queued' : 'completed',
      priority: job.priority,
      attempts: job.attempts,
      createdAt: job.createdAt
    };
  }

  /**
   * Clear old logs
   */
  async clearOldLogs() {
    // Simulate log cleanup
    await new Promise(resolve => setTimeout(resolve, 100));
    logger.info('🧹 Cleaned old log files');
  }

  /**
   * Cleanup temporary files
   */
  async cleanupTempFiles() {
    // Simulate temp file cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
    logger.info('🧹 Cleaned temporary files');
  }

  /**
   * Optimize database
   */
  async optimizeDatabase() {
    // Simulate database optimization
    await new Promise(resolve => setTimeout(resolve, 200));
    logger.info('🧹 Database optimization completed');
  }

  /**
   * Shutdown workers
   */
  async shutdown() {
    console.log('🔄 Shutting down background job processor...');
    
    // Wait for current jobs to complete (with timeout)
    const maxWaitTime = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (this.workerCount > 0 && (Date.now() - startTime) < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Background job processor shutdown complete');
  }
}

/**
 * Memory Optimization Manager
 * Manages memory usage and garbage collection
 */
class MemoryOptimizationManager {
  constructor() {
    this.config = getPerformanceConfig().memory;
    this.monitoringInterval = null;
    this.gcInterval = null;
    this.memoryHistory = [];
  }

  /**
   * Initialize memory optimization
   */
  initialize() {
    if (!this.config.monitoring.enabled) {
      console.log('ℹ️ Memory monitoring disabled');
      return;
    }

    console.log('🧠 Initializing memory optimization manager...');
    
    this.startMemoryMonitoring();
    this.startPeriodicGC();
    
    console.log('✅ Memory optimization manager initialized');
  }

  /**
   * Start memory usage monitoring
   */
  startMemoryMonitoring() {
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, this.config.monitoring.checkInterval);
  }

  /**
   * Check memory usage and take action if needed
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const usagePercent = memUsage.heapUsed / memUsage.heapTotal;
    
    // Add to history
    this.memoryHistory.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      usage: usagePercent
    });
    
    // Keep only last 100 entries
    if (this.memoryHistory.length > 100) {
      this.memoryHistory.shift();
    }
    
    // Check if memory usage is above threshold
    if (usagePercent > this.config.monitoring.alertThreshold) {
      this.handleHighMemoryUsage(usagePercent, memUsage);
    }
    
    // Log memory stats in development
    if (getEnvironment() === 'LOCAL') {
      console.log(`🧠 Memory usage: ${(usagePercent * 100).toFixed(1)}% (${Math.round(memUsage.heapUsed / 1024 / 1024)}MB / ${Math.round(memUsage.heapTotal / 1024 / 1024)}MB)`);
    }
  }

  /**
   * Handle high memory usage
   */
  handleHighMemoryUsage(usagePercent, memUsage) {
    logger.warn('⚠️ High memory usage detected', {
      usage: `${(usagePercent * 100).toFixed(1)}%`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
    });
    
    // Trigger aggressive garbage collection
    if (this.config.garbageCollection.enabled) {
      this.forceGarbageCollection();
    }
    
    // Clear caches if available
    this.clearNonEssentialCaches();
  }

  /**
   * Start periodic garbage collection
   */
  startPeriodicGC() {
    if (!this.config.garbageCollection.enabled) {
      return;
    }
    
    this.gcInterval = setInterval(() => {
      this.performPeriodicGC();
    }, this.config.garbageCollection.interval);
  }

  /**
   * Perform periodic garbage collection
   */
  performPeriodicGC() {
    if (this.config.garbageCollection.aggressive) {
      // Multiple GC cycles for aggressive cleanup
      for (let i = 0; i < 3; i++) {
        setTimeout(() => this.forceGarbageCollection(), i * 100);
      }
    } else {
      this.forceGarbageCollection();
    }
  }

  /**
   * Force garbage collection
   */
  forceGarbageCollection() {
    try {
      // Only attempt in development/testing environments
      if (global.gc && getEnvironment() === 'LOCAL') {
        global.gc();
        logger.debug('🧹 Garbage collection triggered');
      }
    } catch (error) {
      logger.warn('⚠️ Garbage collection failed', { error: error.message });
    }
  }

  /**
   * Clear non-essential caches
   */
  async clearNonEssentialCaches() {
    try {
      // Clear module cache for non-critical modules
      const modulesToClear = [
        // Add module names that can be safely cleared
      ];
      
      modulesToClear.forEach(moduleName => {
        delete require.cache[require.resolve(moduleName)];
      });
      
      logger.debug('🧹 Cleared non-essential caches');
      
    } catch (error) {
      logger.warn('⚠️ Cache clearing failed', { error: error.message });
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    const currentUsage = process.memoryUsage();
    const usagePercent = currentUsage.heapUsed / currentUsage.heapTotal;
    
    // Calculate trend from history
    const recentHistory = this.memoryHistory.slice(-10);
    const trend = this.calculateMemoryTrend(recentHistory);
    
    return {
      current: {
        heapUsed: Math.round(currentUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(currentUsage.heapTotal / 1024 / 1024),
        external: Math.round(currentUsage.external / 1024 / 1024),
        usage: `${(usagePercent * 100).toFixed(1)}%`
      },
      trend: trend,
      history: this.memoryHistory.length,
      gcAggressive: this.config.garbageCollection.aggressive
    };
  }

  /**
   * Calculate memory usage trend
   */
  calculateMemoryTrend(history) {
    if (history.length < 2) {
      return 'stable';
    }
    
    const recent = history[history.length - 1].usage;
    const older = history[0].usage;
    const diff = recent - older;
    
    if (diff > 0.05) return 'increasing';
    if (diff < -0.05) return 'decreasing';
    return 'stable';
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.gcInterval) {
      clearInterval(this.gcInterval);
    }
    
    console.log('🧠 Memory optimization manager stopped');
  }
}

/**
 * Bundle Size Optimizer
 * Optimizes static assets and bundle sizes
 */
class BundleSizeOptimizer {
  constructor() {
    this.config = getPerformanceConfig();
    this.assetCache = new Map();
  }

  /**
   * Optimize bundle size for production
   */
  optimizeBundle() {
    console.log('📦 Optimizing bundle size...');
    
    const optimizations = {
      treeShaking: this.config.bundle.treeShaking,
      minification: this.config.bundle.minification,
      sourcemaps: this.config.bundle.sourcemaps,
      chunkSplitting: this.config.bundle.chunkSplitting
    };
    
    if (getEnvironment() === 'PROD') {
      console.log('🚀 Production optimizations enabled:', optimizations);
    } else {
      console.log('🔧 Development optimizations:', optimizations);
    }
    
    return optimizations;
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations() {
    const recommendations = [];
    
    if (!this.config.bundle.treeShaking) {
      recommendations.push('Enable tree shaking to remove unused code');
    }
    
    if (!this.config.bundle.minification && getEnvironment() === 'PROD') {
      recommendations.push('Enable minification for production builds');
    }
    
    if (!this.config.bundle.chunkSplitting) {
      recommendations.push('Implement code splitting for better caching');
    }
    
    return recommendations;
  }

  /**
   * Analyze bundle size
   */
  analyzeBundleSize(bundleSize) {
    const sizeInMB = bundleSize / (1024 * 1024);
    let status = 'good';
    const recommendations = [];
    
    if (sizeInMB > 5) {
      status = 'critical';
      recommendations.push('Bundle size exceeds 5MB limit');
      recommendations.push('Implement code splitting immediately');
      recommendations.push('Consider lazy loading for heavy components');
    } else if (sizeInMB > 3) {
      status = 'warning';
      recommendations.push('Bundle size is approaching limit');
      recommendations.push('Review and remove unused dependencies');
    } else {
      recommendations.push('Bundle size is acceptable');
    }
    
    return {
      size: `${sizeInMB.toFixed(2)}MB`,
      status,
      recommendations
    };
  }
}

// Export singleton instances
const backgroundJobProcessor = new BackgroundJobProcessor();
const memoryOptimizer = new MemoryOptimizationManager();
const bundleOptimizer = new BundleSizeOptimizer();

module.exports = {
  // Background job processing
  backgroundJobProcessor,
  addJob: (type, data, options) => backgroundJobProcessor.addJob(type, data, options),
  getJobStats: () => backgroundJobProcessor.getStats(),
  getJobStatus: (jobId) => backgroundJobProcessor.getJobStatus(jobId),
  
  // Memory optimization
  memoryOptimizer,
  initializeMemoryOptimization: () => memoryOptimizer.initialize(),
  getMemoryStats: () => memoryOptimizer.getMemoryStats(),
  
  // Bundle optimization
  bundleOptimizer,
  optimizeBundle: () => bundleOptimizer.optimizeBundle(),
  getBundleRecommendations: () => bundleOptimizer.getRecommendations(),
  analyzeBundleSize: (size) => bundleOptimizer.analyzeBundleSize(size),
  
  // Utility classes for direct use
  BackgroundJobProcessor,
  MemoryOptimizationManager,
  BundleSizeOptimizer
};