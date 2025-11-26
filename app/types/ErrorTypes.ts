/**
 * Cross-Platform Error Handling Type Definitions
 * Provides comprehensive type definitions for error logging and crash reporting
 * across iOS, Android, and web platforms
 */

// Unified Error Categories across all platforms
export enum CrossPlatformErrorCategory {
    NETWORK = 'network',
    AUTHENTICATION = 'authentication',
    VALIDATION = 'validation',
    SYSTEM = 'system',
    PAYMENT = 'payment',
    STORAGE = 'storage',
    NAVIGATION = 'navigation',
    BUSINESS_LOGIC = 'business_logic',
    CRASH = 'crash',
    PERFORMANCE = 'performance',
    UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
    CRITICAL = 'critical',
    HIGH = 'high',
    MEDIUM = 'medium',
    LOW = 'low'
}

// User impact levels
export enum UserImpactLevel {
    BLOCKING = 'blocking',
    DISRUPTIVE = 'disruptive',
    MINOR = 'minor',
    NONE = 'none'
}

// Platform-specific error data
export interface ReactNativeError {
    componentStack?: string;
    jsEngine?: string;
    isFatal?: boolean;
    errorBoundary?: string;
    viewHierarchy?: any;
}

export interface iOSError {
    name: string;
    reason: string;
    domain: string;
    code: number;
    userInfo?: Record<string, any>;
    callStackSymbols?: string[];
}

export interface AndroidError {
    className: string;
    localizedMessage?: string;
    cause?: string;
    stackTrace: string[];
    suppressedExceptions?: string[];
}

export interface WebError {
    name: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    error?: any;
}

// PayU-specific error data
export interface PayUError {
    provider: 'PayU';
    originalError: any;
    retryable: boolean;
    transactionId?: string;
    errorCode?: string;
    responseData?: any;
}

// Platform Context Information
export interface PlatformErrorContext {
    platform: 'ios' | 'android' | 'web';
    nativeError?: iOSError | AndroidError | WebError;
    reactNativeError?: ReactNativeError;
    appState: 'active' | 'inactive' | 'background' | 'terminated';
    deviceInfo: PlatformDeviceInfo;
    userId?: string;
    sessionId: string;
    additionalContext: Record<string, any>;
    networkStatus?: NetworkStatus;
    memoryInfo?: MemoryInfo;
    batteryInfo?: BatteryInfo;
}

// Device Information
export interface PlatformDeviceInfo {
    platform: string;
    osVersion: string;
    appVersion: string;
    buildNumber: string;
    deviceModel: string;
    screenSize: string;
    isTablet: boolean;
    memoryPressure: 'normal' | 'warning' | 'critical';
    isJailbroken?: boolean;
    isEmulator?: boolean;
}

// Network Status
export interface NetworkStatus {
    type: 'wifi' | 'cellular' | 'offline' | 'unknown';
    effectiveType?: '2g' | '3g' | '4g' | '5g';
    downlink?: number;
    rtt?: number;
    isConnected: boolean;
}

// Memory Information
export interface MemoryInfo {
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
    jsHeapSizeLimit?: number;
    totalPhysical?: number;
    availablePhysical?: number;
    usagePercentage?: number;
}

// Battery Information
export interface BatteryInfo {
    level?: number;
    state?: 'charging' | 'discharging' | 'full' | 'unknown';
    isLowPowerMode?: boolean;
    lowPowerModeEnabled?: boolean;
}

// Platform-agnostic error interface
export interface CrossPlatformAppError {
    id: string;
    category: CrossPlatformErrorCategory;
    subcategory: string;
    severity: ErrorSeverity;
    userImpact: UserImpactLevel;
    timestamp: Date;
    message: string;
    userFriendlyMessage: string;
    platformContext: PlatformErrorContext;
    recoverable: boolean;
    retryable: boolean;
    code: string;
    // Platform-specific error data
    nativeError?: iOSError | AndroidError | WebError;
    reactNativeError?: ReactNativeError;
    paymentError?: PayUError;
    // Additional error metadata
    metadata?: ErrorMetadata;
    tags?: string[];
    fingerprint?: string;
}

// Error metadata for enhanced tracking
export interface ErrorMetadata {
    userAgent?: string;
    locale?: string;
    timezone?: string;
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    customContext?: Record<string, any>;
    breadcrumbs?: Breadcrumb[];
    environment: 'development' | 'staging' | 'production';
    release?: string;
    buildType?: 'debug' | 'release';
}

// Breadcrumb for error tracking
export interface Breadcrumb {
    message: string;
    category: string;
    level: 'debug' | 'info' | 'warning' | 'error';
    timestamp: Date;
    data?: Record<string, any>;
}

// Error aggregation for analytics
export interface ErrorAggregation {
    errorType: string;
    platform: string;
    version: string;
    count: number;
    firstOccurrence: Date;
    lastOccurrence: Date;
    affectedUsers: number;
    resolved: boolean;
    resolutionNotes?: string;
}

// Performance impact assessment
export interface PerformanceImpact {
    operation: string;
    errorId: string;
    durationBefore: number;
    durationAfter: number;
    performanceDegradation: number;
    userExperienceScore: number;
    impactedUsers: number;
    recoveryTime?: number;
}

// Crash report structure
export interface CrashReport {
    crashId: string;
    timestamp: Date;
    platform: 'ios' | 'android' | 'web';
    appVersion: string;
    osVersion: string;
    deviceModel: string;
    crashReason: string;
    stackTrace: string[];
    registers?: Record<string, string>;
    binaryImages?: any[];
    threads?: CrashThread[];
    appState: string;
    userSessionId: string;
    breadcrumbs: Breadcrumb[];
    customData?: Record<string, any>;
}

export interface CrashThread {
    threadNumber: number;
    crashed: boolean;
    priority: number;
    stack: string[];
}

// Error analytics data
export interface ErrorAnalytics {
    timestamp: Date;
    errorId: string;
    errorType: string;
    platform: string;
    userId?: string;
    sessionId: string;
    duration: number;
    resolution: 'auto' | 'manual' | 'crash' | 'unknown';
    frequency: number;
    userImpact: UserImpactLevel;
    deviceInfo: PlatformDeviceInfo;
    networkInfo: NetworkStatus;
    customMetrics?: Record<string, number>;
}

// Error storage configuration
export interface ErrorStorageConfig {
    maxEntries: number;
    maxAgeDays: number;
    compressionEnabled: boolean;
    encryptionEnabled: boolean;
    syncIntervalMinutes: number;
    autoCleanup: boolean;
    batchSize: number;
    retryAttempts: number;
    retryDelayMs: number;
}

// Error reporting configuration
export interface ErrorReportingConfig {
    environment: 'development' | 'staging' | 'production';
    autoReporting: boolean;
    userConsent: boolean;
    privacyLevel: 'full' | 'minimal' | 'anonymous';
    excludedFields: string[];
    includedEnvironments: string[];
    sampleRate: number; // 0.0 to 1.0
    enableBreadcrumbs: boolean;
    enablePerformanceTracking: boolean;
    integrationServices: {
        sentry?: SentryConfig;
        crashlytics?: CrashlyticsConfig;
        custom?: CustomReportingConfig;
    };
}

// Sentry integration configuration
export interface SentryConfig {
    dsn: string;
    environment: string;
    release?: string;
    tracesSampleRate?: number;
    profilesSampleRate?: number;
    enableAutoSessionTracking?: boolean;
    enableOutOfMemoryTracking?: boolean;
    maxBreadcrumbs?: number;
    maxCacheItems?: number;
}

// Crashlytics integration configuration
export interface CrashlyticsConfig {
    organizationId?: string;
    projectId?: string;
    apiKey?: string;
    endpoint?: string;
    disabled?: boolean;
    enableDebug?: boolean;
    maxCustomKeys?: number;
    maxCustomAttributes?: number;
}

// Custom reporting configuration
export interface CustomReportingConfig {
    endpoint: string;
    apiKey: string;
    headers?: Record<string, string>;
    timeout: number;
    retryAttempts: number;
    batchSize: number;
}

// Performance monitoring configuration
export interface PerformanceMonitoringConfig {
    enabled: boolean;
    sampleRate: number;
    maxOperations: number;
    operationsToTrack: string[];
    enableLongTaskTracking: boolean;
    enableMemoryTracking: boolean;
    enableCpuTracking: boolean;
    thresholds: {
        renderTime: number;
        apiResponse: number;
        scrollJank: number;
        longTaskThreshold: number;
    };
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
    errorType: string;
    platform: string;
    strategy: 'retry' | 'fallback' | 'graceful_degradation' | 'restart' | 'ignore';
    maxRetries?: number;
    retryDelay?: number;
    fallbackComponent?: string;
    restartDelay?: number;
    conditions?: Record<string, any>;
}

// Export convenience types
export type PlatformError = iOSError | AndroidError | WebError | ReactNativeError;
export type PlatformDeviceContext = {
    deviceInfo: PlatformDeviceInfo;
    platform: 'ios' | 'android' | 'web';
    userSessionId: string;
};

export default CrossPlatformAppError;