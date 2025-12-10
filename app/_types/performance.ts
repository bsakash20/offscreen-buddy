// Performance Types for OffScreen Buddy

export interface PerformanceMetrics {
    timestamp: number;
    memory: MemoryStats;
    battery: BatteryInfo;
    resources: ResourceStats;
    render: RenderStats;
    network: NetworkStats;
    startupTime?: number;
}

export interface MemoryStats {
    used: number; // bytes
    total: number; // bytes
    usedPercentage: number;
    gcCount: number;
    lastGCTime?: number;
    heapUsed?: number;
    heapTotal?: number;
    external?: number;
    arrayBuffers?: number;
}

export interface BatteryInfo {
    level: number; // 0-100
    state: 'charging' | 'discharging' | 'full' | 'unknown';
    lowPowerMode: boolean;
    networkType?: 'wifi' | 'cellular' | 'none';
    temperature?: number;
    health?: 'good' | 'poor' | 'unknown';
}

export interface ResourceStats {
    cacheSize: number;
    imageCache: ImageCacheStats;
    fontCache: FontCacheStats;
    networkCache: NetworkCacheStats;
    storageUsed: number;
    storageAvailable: number;
}

export interface ImageCacheStats {
    size: number;
    count: number;
    hitRate: number;
    missRate: number;
}

export interface FontCacheStats {
    loadedFonts: string[];
    cacheSize: number;
    hitRate: number;
}

export interface NetworkCacheStats {
    size: number;
    entries: number;
    hitRate: number;
    compressionRatio: number;
}

export interface RenderStats {
    fps: number;
    frameTime: number; // ms
    droppedFrames: number;
    renderTime: number; // ms
    animationCount: number;
}

export interface NetworkStats {
    latency: number; // ms
    downloadSpeed: number; // bytes/sec
    uploadSpeed: number; // bytes/sec
    requestsCount: number;
    cacheHitRate: number;
    dataUsed: {
        sent: number;
        received: number;
    };
}

export interface DeviceInfo {
    platform: 'ios' | 'android';
    model: string;
    totalMemory: number; // bytes
    isLowEndDevice: boolean;
    supportsLowPowerMode: boolean;
    screenDensity: number;
    isTablet: boolean;
}

export interface PerformanceAlert {
    type: 'memory' | 'battery' | 'startup' | 'network' | 'render';
    level: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: number;
    data?: any;
}

export interface PerformanceThresholds {
    memory: { warning: number; critical: number };
    battery: { warning: number; critical: number };
    cpu: { warning: number; critical: number };
    startup: { warning: number; critical: number };
    fps: { warning: number; critical: number };
}

export interface PerformanceProfile {
    id: string;
    name: string;
    description: string;
    isActive: boolean;
    settings: PerformanceSettings;
}

export interface PerformanceSettings {
    memory: {
        maxUsageMB: number;
        gcThreshold: number;
        leakDetectionEnabled: boolean;
        aggressiveGC: boolean;
    };
    battery: {
        optimizationEnabled: boolean;
        backgroundOptimization: boolean;
        networkOptimization: boolean;
        animationQuality: 'high' | 'medium' | 'low';
        lowPowerMode: boolean;
    };
    monitoring: {
        realTimeMetrics: boolean;
        performanceAlerts: boolean;
        analyticsEnabled: boolean;
        metricsInterval: number;
    };
    startup: {
        lazyLoading: boolean;
        preloadCritical: boolean;
        optimizeBundle: boolean;
    };
    resources: {
        imageOptimization: boolean;
        fontOptimization: boolean;
        cacheStrategy: 'lru' | 'fifo' | 'ttl';
        maxCacheSize: number;
    };
}

export interface StartupMetrics {
    totalTime: number;
    jsLoadTime: number;
    nativeLoadTime: number;
    renderTime: number;
    mountTime: number;
    timeToInteractive: number;
    firstContentfulPaint: number;
    componentsLoaded: string[];
}

export interface MemoryLeak {
    type: 'component' | 'event' | 'timer' | 'network';
    source: string;
    description: string;
    size: number;
    firstDetected: number;
    lastDetected: number;
    frequency: number;
}

export interface BatteryOptimization {
    id: string;
    name: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    isEnabled: boolean;
    conditions: OptimizationCondition[];
    lastApplied?: number; // Timestamp of last application
    unknownLogged?: boolean; // Flag to prevent repeated unknown type logs
}

export interface OptimizationCondition {
    type: 'batteryLevel' | 'networkType' | 'deviceType' | 'timeOfDay';
    operator: 'lt' | 'gt' | 'eq' | 'ne';
    value: any;
}

export interface PerformanceReport {
    id: string;
    timestamp: number;
    duration: number;
    metrics: PerformanceMetrics[];
    alerts: PerformanceAlert[];
    optimizations: OptimizationResult[];
    recommendations: string[];
}

export interface OptimizationResult {
    type: string;
    description: string;
    impact: number; // percentage improvement
    duration: number; // ms
    success: boolean;
    details?: any;
}

// Event types for performance monitoring
export type PerformanceEventType =
    | 'memory_warning'
    | 'memory_critical'
    | 'battery_low'
    | 'battery_critical'
    | 'slow_startup'
    | 'low_fps'
    | 'network_timeout'
    | 'optimization_applied'
    | 'leak_detected';

export interface PerformanceEvent {
    type: PerformanceEventType;
    timestamp: number;
    data: any;
    deviceInfo: DeviceInfo;
}

// Constants
export const PERFORMANCE_CONSTANTS = {
    DEFAULT_MEMORY_THRESHOLD: 100, // MB
    DEFAULT_BATTERY_THRESHOLD: 20, // %
    DEFAULT_FPS_THRESHOLD: 60,
    DEFAULT_STARTUP_TIME: 2000, // ms
    METRICS_HISTORY_SIZE: 100,
    MONITORING_INTERVAL: 5000, // ms
    BATTERY_SAVING_THRESHOLD: 30, // %
    CRITICAL_BATTERY_THRESHOLD: 15, // %
} as const;