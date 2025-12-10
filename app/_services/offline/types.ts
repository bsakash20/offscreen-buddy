/**
 * Core Types for Enhanced Offline System
 * Defines all interfaces and types for the offline-first architecture
 */

// Network and Connectivity Types
export enum NetworkStatus {
    UNKNOWN = 'unknown',
    CONNECTED = 'connected',
    DISCONNECTED = 'disconnected',
    CONNECTING = 'connecting',
    DISCONNECTING = 'disconnecting',
}

export enum NetworkQuality {
    POOR = 'poor',
    FAIR = 'fair',
    GOOD = 'good',
    EXCELLENT = 'excellent',
}

export interface NetworkState {
    isConnected: boolean;
    isInternetReachable: boolean;
    type: string;
    quality: NetworkQuality;
    status: NetworkStatus;
    downloadSpeed?: number;
    uploadSpeed?: number;
    latency?: number;
    lastChecked: Date;
}

export interface ValidationResult {
    isValid: boolean;
    latency?: number;
    downloadSpeed?: number;
    error?: string;
    timestamp: Date;
}

// Offline State Management Types
export enum OfflineMode {
    AUTO = 'auto',
    FORCE_OFFLINE = 'force_offline',
    FORCE_ONLINE = 'force_online',
}

export interface OfflineState {
    isOffline: boolean;
    mode: OfflineMode;
    queuedOperationsCount: number;
    cachedDataSize: number;
    lastOnlineTime?: Date;
    offlineDuration?: number;
    storageUsed: number;
    storageLimit: number;
}

export interface OfflineOperation {
    id: string;
    type: 'create' | 'update' | 'delete' | 'query';
    table: string;
    data: any;
    timestamp: Date;
    priority: number;
    maxRetries: number;
    retryCount: number;
    requiresAuth: boolean;
    metadata?: Record<string, any>;
    dependencies?: string[]; // Operation IDs this depends on
    conflictResolution?: ConflictResolutionStrategy;
}

// Sync and Data Synchronization Types
export enum SyncStatus {
    IDLE = 'idle',
    SYNCING = 'syncing',
    PAUSED = 'paused',
    FAILED = 'failed',
    CONFLICT = 'conflict',
}

export enum SyncDirection {
    PULL = 'pull',
    PUSH = 'push',
    BIDIRECTIONAL = 'bidirectional',
}

export enum SyncPriority {
    CRITICAL = 1,
    HIGH = 2,
    NORMAL = 3,
    LOW = 4,
}

export interface SyncProgress {
    status: SyncStatus;
    percentage: number;
    currentOperation?: string;
    totalOperations: number;
    completedOperations: number;
    failedOperations: number;
    bytesTransferred: number;
    estimatedTimeRemaining?: number;
    lastSyncTime?: Date;
    nextSyncTime?: Date;
}

export interface SyncConfig {
    batchSize: number;
    maxRetries: number;
    retryDelay: number;
    timeoutMs: number;
    enableCompression: boolean;
    enableEncryption: boolean;
    conflictResolutionStrategy: ConflictResolutionStrategy;
    backgroundSyncEnabled: boolean;
    syncOnConnect: boolean;
    syncOnForeground: boolean;
    priorityWeights: Record<SyncPriority, number>;
}

export interface SyncOperation {
    id: string;
    direction: SyncDirection;
    priority: SyncPriority;
    table: string;
    data: any;
    localVersion?: number;
    remoteVersion?: number;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface ConflictResolutionStrategy {
    type: 'last_write_wins' | 'merge' | 'user_intervention' | 'server_authority';
    mergeRules?: Record<string, MergeRule>;
    customResolver?: string;
}

export interface MergeRule {
    field: string;
    strategy: 'take_local' | 'take_remote' | 'merge' | 'custom';
    customMerge?: string;
}

// Database and Storage Types
export interface DatabaseConfig {
    name: string;
    version: number;
    size: number;
    encryptionKey?: string;
    enableWAL: boolean;
    enableForeignKeys: boolean;
    tempStore: 'memory' | 'file';
    cacheSize: number;
    pageSize: number;
}

export interface DatabaseStats {
    totalSize: number;
    usedSize: number;
    freeSize: number;
    tableCount: number;
    indexCount: number;
    lastVacuum: Date;
    fragmentationPercentage: number;
}

export interface StorageItem {
    key: string;
    value: any;
    size: number;
    createdAt: Date;
    expiresAt?: Date;
    tags: string[];
    compressionRatio?: number;
}

export interface CacheConfig {
    maxSize: number;
    ttl: number;
    compressionEnabled: boolean;
    evictionPolicy: 'lru' | 'lfu' | 'ttl';
    backgroundCleanup: boolean;
}

// Conflict Management Types
export interface SyncConflict {
    id: string;
    operationId: string;
    table: string;
    recordId: string;
    localData: any;
    remoteData: any;
    conflictType: 'field_level' | 'record_level' | 'concurrent_delete';
    fields: string[];
    timestamp: Date;
    resolved: boolean;
    resolution?: ConflictResolution;
    priority: SyncPriority;
}

export interface ConflictResolution {
    strategy: ConflictResolutionStrategy;
    userChoice?: Record<string, any>;
    resolvedData: any;
    resolvedAt: Date;
    resolvedBy: string;
}

// Background Sync Types
export interface BackgroundSyncConfig {
    enabled: boolean;
    interval: number; // seconds
    batteryLevelThreshold: number; // 0-1
    requireCharging: boolean;
    requireWifi: boolean;
    maxSyncTime: number; // seconds
    retryAttempts: number;
    exponentialBackoff: boolean;
}

export interface BackgroundTaskStatus {
    isRunning: boolean;
    isScheduled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    error?: string;
    progress: SyncProgress;
}

// User Preferences and Settings Types
export interface OfflinePreferences {
    enableOfflineMode: boolean;
    backgroundSync: boolean;
    syncOnWifiOnly: boolean;
    dataCompression: boolean;
    storageLimit: number; // MB
    conflictResolution: ConflictResolutionStrategy;
    notificationSettings: OfflineNotificationSettings;
}

export interface OfflineNotificationSettings {
    syncStatus: boolean;
    conflicts: boolean;
    storageWarning: boolean;
    completion: boolean;
    errors: boolean;
}

// Analytics and Monitoring Types
export interface SyncAnalytics {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncTime: number;
    dataTransferred: number;
    conflictsResolved: number;
    lastSyncDuration?: number;
    storageEfficiency: number;
}

export interface OfflineMetrics {
    timeSpentOffline: number;
    operationsQueued: number;
    operationsExecuted: number;
    cacheHitRate: number;
    storageUtilization: number;
    syncEfficiency: number;
}

// Service Status Types
export interface OfflineServiceStatus {
    database: DatabaseStatus;
    sync: SyncServiceStatus;
    network: NetworkServiceStatus;
    storage: StorageServiceStatus;
    background: BackgroundServiceStatus;
}

export interface DatabaseStatus {
    initialized: boolean;
    connected: boolean;
    encrypted: boolean;
    stats: DatabaseStats;
    lastBackup?: Date;
}

export interface SyncServiceStatus {
    initialized: boolean;
    active: boolean;
    queueSize: number;
    conflictsCount: number;
    lastSync?: Date;
}

export interface NetworkServiceStatus {
    initialized: boolean;
    connected: boolean;
    quality: NetworkQuality;
    lastCheck: Date;
}

export interface StorageServiceStatus {
    initialized: boolean;
    used: number;
    limit: number;
    cacheSize: number;
}

export interface BackgroundServiceStatus {
    enabled: boolean;
    scheduled: boolean;
    running: boolean;
    lastRun?: Date;
}

// Error Types
export interface OfflineError {
    code: string;
    message: string;
    details?: any;
    timestamp: Date;
    operationId?: string;
    recoverable: boolean;
    suggestedAction?: string;
}

export interface SyncError extends OfflineError {
    operationType: SyncOperationType;
    retryable: boolean;
    nextRetryAt?: Date;
}

export enum SyncOperationType {
    CONNECTIVITY_CHECK = 'connectivity_check',
    DATA_PULL = 'data_pull',
    DATA_PUSH = 'data_push',
    CONFLICT_RESOLUTION = 'conflict_resolution',
    CLEANUP = 'cleanup',
    BACKUP = 'backup',
}

// Utility Types
export type Listener<T> = (data: T) => void;
export type ErrorHandler = (error: OfflineError) => void;

export interface EventEmitter {
    on<T = any>(event: string, listener: Listener<T>): () => void;
    emit<T = any>(event: string, data: T): void;
    off(event: string, listener: Listener<any>): void;
}

// Enhanced Timer Integration Types
export interface OfflineTimerSession {
    id: string;
    timerId: string;
    startTime: Date;
    endTime?: Date;
    duration: number; // in seconds
    type: 'focus' | 'break' | 'long_break';
    paused: boolean;
    pauseDuration: number;
    completed: boolean;
    milestones: string[];
    synced: boolean;
}

export interface OfflineMilestoneProgress {
    id: string;
    milestoneId: string;
    userId: string;
    progress: number;
    completed: boolean;
    lastUpdated: Date;
    unlockedAt?: Date;
    synced: boolean;
}

// Configuration and Environment Types
export interface OfflineEnvironmentConfig {
    databaseUrl?: string;
    encryptionKey: string;
    debugMode: boolean;
    logLevel: 'error' | 'warn' | 'info' | 'debug';
    featureFlags: Record<string, boolean>;
    limits: {
        maxStorageSize: number;
        maxCacheSize: number;
        maxSyncRetries: number;
        maxBackgroundTime: number;
    };
}

export default {};