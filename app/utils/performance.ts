/**
 * Frontend Performance Utilities
 * React Native performance optimization utilities and helpers
 */

import { Platform, Dimensions, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

declare const global: any;

// Performance constants
export const PERFORMANCE_CONSTANTS = {
  BUNDLE_SIZE_LIMIT: 5 * 1024 * 1024, // 5MB
  MEMORY_THRESHOLD: 0.8, // 80%
  FRAME_TIME_TARGET: 16, // 60fps = 16ms per frame
  LIST_ITEM_HEIGHT: 80,
  MAX_VISIBLE_ITEMS: 20,
  IMAGE_CACHE_SIZE: 50 * 1024 * 1024, // 50MB
  LAZY_LOAD_THRESHOLD: 10
};

export interface PerformanceMetrics {
  memoryUsage: number;
  frameRate: number;
  renderTime: number;
  bundleSize: number;
  loadTime: number;
  batteryLevel?: number;
  networkType?: string;
}

export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum cache size in bytes
  compression: boolean;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Frontend Performance Monitor
 * Tracks and reports performance metrics for the React Native app
 */
class FrontendPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    memoryUsage: 0,
    frameRate: 60,
    renderTime: 0,
    bundleSize: 0,
    loadTime: Date.now()
  };

  private startTime = Date.now();
  private frameCount = 0;
  private lastFrameTime = Date.now();
  private isMonitoring = false;
  private observers: Set<(metrics: PerformanceMetrics) => void> = new Set();

  /**
   * Initialize performance monitoring
   */
  async initialize(): Promise<void> {
    console.log('📊 Initializing frontend performance monitoring...');

    await this.collectInitialMetrics();
    this.startFrameRateMonitoring();
    this.startMemoryMonitoring();
    this.isMonitoring = true;

    console.log('✅ Frontend performance monitoring initialized');
  }

  /**
   * Collect initial performance metrics
   */
  private async collectInitialMetrics(): Promise<void> {
    try {
      // Get bundle size (approximate)
      this.metrics.bundleSize = await this.estimateBundleSize();

      // Get memory usage if available
      if (Platform.OS === 'android') {
        // Android specific memory monitoring would go here
        this.metrics.memoryUsage = this.getApproximateMemoryUsage();
      }

      // Store metrics in AsyncStorage for persistence
      await this.persistMetrics();

    } catch (error) {
      console.warn('⚠️ Could not collect initial metrics:', error);
    }
  }

  /**
   * Start frame rate monitoring
   */
  private startFrameRateMonitoring(): void {
    if (Platform.OS === 'web') {
      // Use requestAnimationFrame for web
      const measureFrame = () => {
        const now = Date.now();
        const deltaTime = now - this.lastFrameTime;

        if (deltaTime > 0) {
          this.frameCount++;

          // Calculate FPS every second
          if (now - this.startTime >= 1000) {
            this.metrics.frameRate = Math.round(this.frameCount);
            this.frameCount = 0;
            this.startTime = now;
            this.notifyObservers();
          }
        }

        this.lastFrameTime = now;
        requestAnimationFrame(measureFrame);
      };

      requestAnimationFrame(measureFrame);
    }
  }

  /**
   * Start memory usage monitoring
   */
  private startMemoryMonitoring(): void {
    const checkMemory = () => {
      const memoryUsage = this.getApproximateMemoryUsage();
      this.metrics.memoryUsage = memoryUsage;

      // Alert if memory usage is high
      if (memoryUsage > PERFORMANCE_CONSTANTS.MEMORY_THRESHOLD) {
        this.handleHighMemoryUsage(memoryUsage);
      }

      this.notifyObservers();
      setTimeout(checkMemory, 5000); // Check every 5 seconds
    };

    setTimeout(checkMemory, 5000);
  }

  /**
   * Get approximate memory usage
   */
  private getApproximateMemoryUsage(): number {
    try {
      // This is a simplified approach - in a real app you'd use platform-specific APIs
      if (Platform.OS === 'ios') {
        return Math.random() * 0.6; // Simulated for iOS
      } else if (Platform.OS === 'android') {
        return Math.random() * 0.7; // Simulated for Android
      }
      return 0.3; // Default
    } catch {
      return 0.3;
    }
  }

  /**
   * Handle high memory usage
   */
  private handleHighMemoryUsage(usage: number): void {
    console.warn(`⚠️ High memory usage detected: ${(usage * 100).toFixed(1)}%`);

    // Trigger garbage collection if available (only in development/testing environments)
    if (Platform.OS === 'android' && __DEV__) {
      try {
        // Attempt to trigger garbage collection in dev mode
        const globalObj = (global as any);
        if (globalObj && globalObj.gc) {
          globalObj.gc();
        }
      } catch (error) {
        console.warn('⚠️ Could not trigger garbage collection:', error);
      }
    }

    // Clear some caches
    this.clearNonEssentialCaches();

    // Notify observers
    this.notifyObservers();
  }

  /**
   * Clear non-essential caches to free memory
   */
  private async clearNonEssentialCaches(): Promise<void> {
    try {
      // Clear image cache (lowest priority)
      try {
        const globalObj = (global as any);
        if (globalObj && globalObj.ImageCache && globalObj.ImageCache.clearExpired && __DEV__) {
          await globalObj.ImageCache.clearExpired();
        }
      } catch (error) {
        console.warn('⚠️ Could not clear image cache:', error);
      }

      // Clear storage cache for non-critical data
      const keys = await AsyncStorage.getAllKeys();
      const nonCriticalKeys = keys.filter(key =>
        key.startsWith('temp_') ||
        key.startsWith('cache_') && !key.includes('critical')
      );

      if (nonCriticalKeys.length > 0) {
        await AsyncStorage.multiRemove(nonCriticalKeys);
        console.log('🧹 Cleared non-essential cache data');
      }
    } catch (error) {
      console.warn('⚠️ Error clearing caches:', error);
    }
  }

  /**
   * Record render time for a component
   */
  recordRenderTime(componentName: string, renderTime: number): void {
    if (renderTime > PERFORMANCE_CONSTANTS.FRAME_TIME_TARGET) {
      console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime}ms`);
    }

    this.metrics.renderTime = Math.max(this.metrics.renderTime, renderTime);
  }

  /**
   * Subscribe to performance updates
   */
  subscribe(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.observers.add(callback);

    // Immediately call with current metrics
    callback(this.metrics);

    // Return unsubscribe function
    return () => {
      this.observers.delete(callback);
    };
  }

  /**
   * Notify all observers of performance changes
   */
  private notifyObservers(): void {
    this.observers.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.warn('⚠️ Error in performance observer:', error);
      }
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Estimate bundle size (approximate)
   */
  private async estimateBundleSize(): Promise<number> {
    try {
      // This is a simplified approach - in a real app you'd calculate actual bundle size
      return 2 * 1024 * 1024; // 2MB estimate
    } catch {
      return 0;
    }
  }

  /**
   * Persist metrics to storage
   */
  private async persistMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem('performance_metrics', JSON.stringify({
        ...this.metrics,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('⚠️ Could not persist performance metrics:', error);
    }
  }

  /**
   * Check if performance is within acceptable limits
   */
  checkPerformanceHealth(): { healthy: boolean; issues: string[] } {
    const issues: string[] = [];

    if (this.metrics.memoryUsage > PERFORMANCE_CONSTANTS.MEMORY_THRESHOLD) {
      issues.push(`High memory usage: ${(this.metrics.memoryUsage * 100).toFixed(1)}%`);
    }

    if (this.metrics.frameRate < 30) {
      issues.push(`Low frame rate: ${this.metrics.frameRate}fps`);
    }

    if (this.metrics.renderTime > PERFORMANCE_CONSTANTS.FRAME_TIME_TARGET) {
      issues.push(`Slow renders: ${this.metrics.renderTime}ms`);
    }

    if (this.metrics.bundleSize > PERFORMANCE_CONSTANTS.BUNDLE_SIZE_LIMIT) {
      issues.push(`Large bundle size: ${(this.metrics.bundleSize / 1024 / 1024).toFixed(1)}MB`);
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}

/**
 * Image Cache Manager
 * Optimizes image loading and caching for better performance
 */
class ImageCacheManager {
  private cache = new Map<string, { uri: string; size: number; timestamp: number }>();
  private readonly maxCacheSize: number;
  private readonly maxAge: number;

  constructor(maxCacheSize: number = PERFORMANCE_CONSTANTS.IMAGE_CACHE_SIZE, maxAge: number = 24 * 60 * 60 * 1000) {
    this.maxCacheSize = maxCacheSize;
    this.maxAge = maxAge;
  }

  /**
   * Preload images for better performance
   */
  async preloadImages(uris: string[]): Promise<void> {
    console.log(`🖼️ Preloading ${uris.length} images...`);

    for (const uri of uris) {
      await this.cacheImage(uri);
    }
  }

  /**
   * Cache an image
   */
  private async cacheImage(uri: string): Promise<void> {
    try {
      // Simulate image caching (in a real app, you'd use a proper image caching library)
      this.cache.set(uri, {
        uri,
        size: Math.random() * 100000, // Random size for simulation
        timestamp: Date.now()
      });

      this.cleanup();
    } catch (error) {
      console.warn(`⚠️ Failed to cache image: ${uri}`, error);
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.maxAge) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // If still over limit, remove oldest entries
    if (this.cache.size > 20) { // Simplified limit
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, entries.length - 20);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Get cached image
   */
  getCachedImage(uri: string): string | null {
    const cached = this.cache.get(uri);
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.uri;
    }
    return null;
  }

  /**
   * Clear all cached images
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * List Virtualization Helper
 * Optimizes rendering of large lists
 */
export class ListVirtualizationHelper {
  /**
   * Calculate visible items for virtual scrolling
   */
  static getVisibleItems(
    totalItems: number,
    scrollOffset: number,
    containerHeight: number,
    itemHeight: number = PERFORMANCE_CONSTANTS.LIST_ITEM_HEIGHT
  ): { start: number; end: number } {
    const overscan = 5; // Render extra items for smooth scrolling
    const visibleCount = Math.ceil(containerHeight / itemHeight);

    const start = Math.max(0, Math.floor(scrollOffset / itemHeight) - overscan);
    const end = Math.min(totalItems, start + visibleCount + overscan * 2);

    return { start, end };
  }

  /**
   * Get optimal item height for dynamic lists
   */
  static getOptimalItemHeight(itemCount: number): number {
    if (itemCount > 1000) {
      return 60; // Smaller items for very large lists
    } else if (itemCount > 500) {
      return 70;
    } else {
      return PERFORMANCE_CONSTANTS.LIST_ITEM_HEIGHT;
    }
  }
}

/**
 * Memory Management Utilities
 */
export class MemoryManager {
  /**
   * Force garbage collection (if available)
   */
  static forceGarbageCollection(): void {
    try {
      // Only attempt in development environment for safety
      if (__DEV__) {
        const globalObj = (global as any);
        if (globalObj && globalObj.gc) {
          globalObj.gc();
          console.log('🧹 Garbage collection triggered');
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not trigger garbage collection:', error);
    }
  }

  /**
   * Clear all non-critical AsyncStorage data
   */
  static async clearNonCriticalStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const nonCriticalKeys = keys.filter(key =>
        !key.startsWith('auth_') &&
        !key.startsWith('user_') &&
        !key.startsWith('config_')
      );

      if (nonCriticalKeys.length > 0) {
        await AsyncStorage.multiRemove(nonCriticalKeys);
        console.log(`🧹 Cleared ${nonCriticalKeys.length} non-critical storage items`);
      }
    } catch (error) {
      console.warn('⚠️ Error clearing storage:', error);
    }
  }

  /**
   * Get memory usage estimate
   */
  static getMemoryUsage(): number {
    try {
      // Simplified memory usage estimation
      return Math.random() * 0.6; // 0-60% usage
    } catch {
      return 0.3;
    }
  }
}

/**
 * Bundle Size Analyzer
 */
export class BundleAnalyzer {
  /**
   * Analyze bundle size and suggest optimizations
   */
  static analyzeBundleSize(sizeInBytes: number): {
    size: string;
    status: 'good' | 'warning' | 'critical';
    recommendations: string[];
  } {
    const sizeInMB = sizeInBytes / 1024 / 1024;
    const recommendations: string[] = [];
    let status: 'good' | 'warning' | 'critical' = 'good';

    if (sizeInMB > 10) {
      status = 'critical';
      recommendations.push('Bundle size is too large. Consider code splitting.');
      recommendations.push('Remove unused dependencies.');
      recommendations.push('Implement lazy loading for heavy components.');
    } else if (sizeInMB > 5) {
      status = 'warning';
      recommendations.push('Bundle size is approaching limit. Consider optimizations.');
      recommendations.push('Implement tree shaking.');
    } else {
      recommendations.push('Bundle size is good.');
    }

    return {
      size: `${sizeInMB.toFixed(1)}MB`,
      status,
      recommendations
    };
  }

  /**
   * Get code splitting recommendations
   */
  static getCodeSplittingRecommendations(): string[] {
    return [
      'Lazy load heavy components (charts, editors)',
      'Dynamic import for route-based splitting',
      'Separate vendor bundle from app bundle',
      'Implement on-demand feature loading',
      'Use React.lazy for component-level splitting'
    ];
  }
}

/**
 * Animation Performance Optimizer
 */
export class AnimationOptimizer {
  /**
   * Optimize animations for 60fps
   */
  static shouldUseNativeDriver(properties: string[]): boolean {
    // Use native driver for transform and opacity animations
    const nativeProperties = ['transform', 'opacity', 'translateX', 'translateY', 'scale'];
    return properties.every(prop => nativeProperties.includes(prop));
  }

  /**
   * Get optimal animation duration
   */
  static getOptimalDuration(complexity: 'simple' | 'moderate' | 'complex'): number {
    switch (complexity) {
      case 'simple':
        return 200;
      case 'moderate':
        return 300;
      case 'complex':
        return 500;
      default:
        return 300;
    }
  }
}

// Export singleton instances
export const performanceMonitor = new FrontendPerformanceMonitor();
export const imageCache = new ImageCacheManager();

// Initialize performance monitoring
if (typeof window !== 'undefined') {
  // Web initialization
  performanceMonitor.initialize();
}

export default {
  performanceMonitor,
  imageCache,
  MemoryManager,
  BundleAnalyzer,
  AnimationOptimizer,
  ListVirtualizationHelper,
  PERFORMANCE_CONSTANTS
};