/**
 * Sync Manager - Central Orchestrator for Offline System
 * Coordinates all offline services and manages the complete sync lifecycle
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import {
    SyncConfig,
    OfflinePreferences,
    BackgroundSyncConfig,
    SyncProgress,
    SyncConflict,
    OfflineServiceStatus,
    BackgroundTaskStatus,
    Listener,
} from './types';

import { localDatabase } from './LocalDatabase';
import { offlineSyncEngine } from './SyncEngine';
import { networkConnectivityService } from './NetworkConnectivityService';
import { offlineStateManager } from './OfflineStateManager';

export class SyncManager {
    private static instance: SyncManager;
    private config: SyncConfig;
    private preferences: OfflinePreferences;
    private backgroundConfig: BackgroundSyncConfig;
    private isInitialized = false;
    private isRunning = false;
    private syncInterval: number | null = null;
    private backgroundInterval: number | null = null;
    private listeners = new Map<string, Listener<SyncProgress>>();
    private statusListeners = new Map<string, Listener<OfflineServiceStatus>>();
    private lastSyncAttempt = 0;
    private consecutiveFailures = 0;
    private readonly MAX_CONSECUTIVE_FAILURES = 3;
    private readonly MIN_SYNC_INTERVAL = 60000; // 1 minute

    private constructor() {
        this.config = this.getDefaultConfig();
        this.preferences = this.getDefaultPreferences();
        this.backgroundConfig = this.getDefaultBackgroundConfig();
    }

    public static getInstance(): SyncManager {
        if (!SyncManager.instance) {
            SyncManager.instance = new SyncManager();
        }
        return SyncManager.instance;
    }

    /**
     * Initialize the sync manager and all dependent services
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('🚀 Initializing Offline Sync System...');

            // Initialize all services in order
            await localDatabase.initialize();
            await offlineSyncEngine.initialize();
            await networkConnectivityService.initialize();
            await offlineStateManager.initialize();

            // Load configuration
            await this.loadConfiguration();

            // Setup event listeners
            this.setupEventListeners();

            // Start background processes
            this.startBackgroundProcessing();

            this.isInitialized = true;
            this.isRunning = true;

            console.log('✅ SyncManager and offline system initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize SyncManager:', error);
            throw new Error(`SyncManager initialization failed: ${error}`);
        }
    }

    /**
     * Trigger a manual sync operation
     */
    public async triggerSync(): Promise<SyncProgress> {
        if (!this.isInitialized) {
            throw new Error('SyncManager not initialized');
        }

        // Check if we should sync based on rate limiting
        const now = Date.now();
        if (now - this.lastSyncAttempt < this.MIN_SYNC_INTERVAL) {
            console.log('⏳ Sync rate limited - too soon since last attempt');
            return offlineSyncEngine.getProgress();
        }

        this.lastSyncAttempt = now;

        try {
            console.log('🔄 Triggering manual sync...');
            const progress = await offlineSyncEngine.triggerSync();

            // Reset failure counter on success
            this.consecutiveFailures = 0;

            return progress;
        } catch (error) {
            this.consecutiveFailures++;
            console.error('❌ Manual sync failed:', error);

            if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
                console.warn('🚨 Max consecutive failures reached - pausing auto-sync');
                this.pauseAutoSync();
            }

            throw error;
        }
    }

    /**
     * Add data to sync queue
     */
    public async queueData(
        table: string,
        operation: 'create' | 'update' | 'delete',
        data: any,
        options?: {
            priority?: number;
            requiresAuth?: boolean;
            metadata?: Record<string, any>;
        }
    ): Promise<string> {
        const operationData = {
            type: operation,
            table,
            data,
            priority: options?.priority || 50,
            maxRetries: 3,
            retryCount: 0,
            requiresAuth: options?.requiresAuth || true,
            metadata: options?.metadata,
        };

        const operationId = await offlineStateManager.queueOperation(operationData);
        await offlineSyncEngine.addToSyncQueue(operationData);

        console.log(`📤 Data queued for sync: ${operation} on ${table}`);

        // Trigger immediate sync if we're online and preferences allow
        if (!offlineStateManager.isOffline() && this.preferences.backgroundSync) {
            this.scheduleImmediateSync();
        }

        return operationId;
    }

    /**
     * Check if auto-sync is enabled and should run
     */
    public shouldRunAutoSync(): boolean {
        if (!this.preferences.backgroundSync) return false;
        if (offlineStateManager.isOffline()) return false;
        if (this.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) return false;

        // Check network quality
        return networkConnectivityService.isQualityGoodForSync();
    }

    /**
     * Start automatic sync scheduling
     */
    public startAutoSync(): void {
        if (this.syncInterval) return;

        console.log('🔄 Starting auto-sync');

        const interval = networkConnectivityService.getRecommendedSyncInterval();

        this.syncInterval = setInterval(async () => {
            if (this.shouldRunAutoSync()) {
                try {
                    await this.triggerSync();
                } catch (error) {
                    console.warn('Auto-sync failed:', error);
                }
            }
        }, interval);
    }

    /**
     * Stop automatic sync scheduling
     */
    public pauseAutoSync(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
            console.log('⏸️ Auto-sync paused');
        }
    }

    /**
     * Schedule sync when connectivity is restored
     */
    public scheduleSyncOnConnect(): void {
        if (!this.config.syncOnConnect) return;

        const networkState = networkConnectivityService.getCurrentState();
        if (networkState?.isConnected) {
            setTimeout(() => this.triggerSync(), 2000); // Wait 2 seconds for stability
        }
    }

    /**
     * Get comprehensive service status
     */
    public getServiceStatus(): OfflineServiceStatus {
        return {
            database: localDatabase.getStatus(),
            sync: {
                initialized: offlineSyncEngine.getStatus() !== null,
                active: this.isRunning,
                queueSize: offlineStateManager.getQueueSize(),
                conflictsCount: offlineSyncEngine.getConflicts().length,
                lastSync: offlineSyncEngine.getLastSyncTime(),
            },
            network: networkConnectivityService.getStatus(),
            storage: offlineStateManager.getStatus(),
            background: {
                enabled: this.preferences.backgroundSync,
                scheduled: this.syncInterval !== null,
                running: this.isRunning,
                lastRun: offlineSyncEngine.getLastSyncTime(),
            },
        };
    }

    /**
     * Get active conflicts
     */
    public getConflicts(): SyncConflict[] {
        return offlineSyncEngine.getConflicts();
    }

    /**
     * Resolve a sync conflict
     */
    public async resolveConflict(conflictId: string, resolution: any): Promise<void> {
        await offlineSyncEngine.resolveConflictManually(conflictId, resolution);
    }

    /**
     * Update sync configuration
     */
    public async updateConfig(config: Partial<SyncConfig>): Promise<void> {
        this.config = { ...this.config, ...config };
        await offlineSyncEngine.updateConfig(this.config);
        await this.saveConfiguration();

        console.log('⚙️ SyncManager configuration updated');
    }

    /**
     * Update user preferences
     */
    public async updatePreferences(preferences: Partial<OfflinePreferences>): Promise<void> {
        this.preferences = { ...this.preferences, ...preferences };
        await this.saveConfiguration();

        // Apply preference changes
        if (this.preferences.backgroundSync) {
            this.startAutoSync();
        } else {
            this.pauseAutoSync();
        }

        console.log('⚙️ SyncManager preferences updated');
    }

    /**
     * Update background sync configuration
     */
    public async updateBackgroundConfig(config: Partial<BackgroundSyncConfig>): Promise<void> {
        this.backgroundConfig = { ...this.backgroundConfig, ...config };
        await this.saveConfiguration();
        console.log('⚙️ Background sync configuration updated');
    }

    /**
     * Get sync progress
     */
    public getProgress(): SyncProgress {
        return offlineSyncEngine.getProgress();
    }

    /**
     * Check if manager is running
     */
    public isManagerRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Add progress listener
     */
    public addProgressListener(id: string, listener: Listener<SyncProgress>): () => void {
        this.listeners.set(id, listener);
        return () => this.listeners.delete(id);
    }

    /**
     * Add status listener
     */
    public addStatusListener(id: string, listener: Listener<OfflineServiceStatus>): () => void {
        this.statusListeners.set(id, listener);
        return () => this.statusListeners.delete(id);
    }

    /**
     * Get cached data with offline support
     */
    public async getCachedData<T>(key: string, fetcher?: () => Promise<T>): Promise<T | null> {
        // Try cache first
        const cached = offlineStateManager.getCachedData<T>(key);
        if (cached) return cached;

        // If no cache and we have a fetcher, fetch and cache
        if (fetcher && !offlineStateManager.isOffline()) {
            try {
                const data = await fetcher();
                await offlineStateManager.cacheData(key, data);
                return data;
            } catch (error) {
                console.warn(`Failed to fetch data for key ${key}:`, error);
                return null;
            }
        }

        return null;
    }

    /**
     * Clear all offline data (for logout/reset)
     */
    public async clearAllOfflineData(): Promise<void> {
        console.log('🗑️ Clearing all offline data...');

        try {
            // Clear operation queue
            await offlineStateManager.clearCache();

            // Clear sync conflicts and queue
            await AsyncStorage.removeItem('sync_conflicts');
            await AsyncStorage.removeItem('sync_queue');

            // Clear analytics
            await AsyncStorage.removeItem('sync_analytics');

            // Reset failure counter
            this.consecutiveFailures = 0;

            console.log('✅ All offline data cleared');
        } catch (error) {
            console.error('❌ Failed to clear offline data:', error);
            throw error;
        }
    }

    /**
     * Perform system maintenance
     */
    public async performMaintenance(): Promise<{
        database: number;
        cache: number;
        operations: number;
    }> {
        console.log('🔧 Performing offline system maintenance...');

        const results = {
            database: 0,
            cache: 0,
            operations: 0,
        };

        try {
            // Database maintenance
            if (this.isInitialized && localDatabase) {
                await localDatabase.cleanupCache();
                await localDatabase.vacuum();
                results.database = 1;
            }

            // Cache maintenance
            const cacheResult = await offlineStateManager.performMaintenance();
            results.cache = cacheResult.cleaned;
            results.operations = cacheResult.processed;

            console.log('✅ System maintenance completed:', results);
            return results;
        } catch (error) {
            console.error('❌ System maintenance failed:', error);
            throw error;
        }
    }

    /**
     * Dispose of all resources
     */
    public async dispose(): Promise<void> {
        console.log('🧹 Disposing SyncManager...');

        // Stop intervals
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }

        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = null;
        }

        // Dispose services
        await offlineSyncEngine.dispose();
        await networkConnectivityService.dispose();
        await offlineStateManager.dispose();

        // Clear listeners
        this.listeners.clear();
        this.statusListeners.clear();

        this.isInitialized = false;
        this.isRunning = false;

        console.log('✅ SyncManager disposed');
    }

    // Private methods

    private setupEventListeners(): void {
        // Sync progress listener
        offlineSyncEngine.addProgressListener('sync_manager', (progress) => {
            this.listeners.forEach(listener => listener(progress));
        });

        // Network connectivity listener
        networkConnectivityService.addListener('sync_manager', (networkState) => {
            if (networkState.isConnected) {
                this.onConnectivityGained();
            } else {
                this.onConnectivityLost();
            }
        });

        // App state listener
        AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'active') {
                this.onAppForeground();
            } else if (nextAppState === 'background') {
                this.onAppBackground();
            }
        });
    }

    private startBackgroundProcessing(): void {
        // Start auto-sync if enabled
        if (this.preferences.backgroundSync) {
            this.startAutoSync();
        }

        // Periodic maintenance
        this.backgroundInterval = setInterval(async () => {
            if (this.isInitialized) {
                try {
                    await this.performMaintenance();
                } catch (error) {
                    console.warn('Background maintenance failed:', error);
                }
            }
        }, 30 * 60 * 1000); // Every 30 minutes
    }

    private async loadConfiguration(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('sync_manager_config');
            if (stored) {
                const config = JSON.parse(stored);
                this.config = { ...this.config, ...config.config };
                this.preferences = { ...this.preferences, ...config.preferences };
                this.backgroundConfig = { ...this.backgroundConfig, ...config.backgroundConfig };
            }
        } catch (error) {
            console.warn('Failed to load sync manager configuration:', error);
        }
    }

    private async saveConfiguration(): Promise<void> {
        try {
            const config = {
                config: this.config,
                preferences: this.preferences,
                backgroundConfig: this.backgroundConfig,
            };
            await AsyncStorage.setItem('sync_manager_config', JSON.stringify(config));
        } catch (error) {
            console.warn('Failed to save sync manager configuration:', error);
        }
    }

    private onConnectivityGained(): void {
        console.log('🔌 Connectivity gained');

        // Resume auto-sync if it was paused due to failures
        if (this.consecutiveFailures < this.MAX_CONSECUTIVE_FAILURES) {
            this.startAutoSync();
        }

        // Schedule sync if enabled
        this.scheduleSyncOnConnect();
    }

    private onConnectivityLost(): void {
        console.log('📴 Connectivity lost');

        // Pause auto-sync
        this.pauseAutoSync();
    }

    private onAppForeground(): void {
        console.log('📱 App came to foreground');

        // Trigger sync if enabled and conditions are met
        if (this.shouldRunAutoSync()) {
            this.scheduleImmediateSync(5000); // Wait 5 seconds for stability
        }
    }

    private onAppBackground(): void {
        console.log('📱 App went to background');

        // Optional: trigger final sync
        if (this.config.syncOnForeground && !offlineStateManager.isOffline()) {
            setTimeout(() => this.triggerSync(), 1000);
        }
    }

    private scheduleImmediateSync(delay: number = 1000): void {
        setTimeout(async () => {
            if (this.shouldRunAutoSync()) {
                try {
                    await this.triggerSync();
                } catch (error) {
                    console.warn('Immediate sync failed:', error);
                }
            }
        }, delay);
    }

    private getDefaultConfig(): SyncConfig {
        return {
            batchSize: 50,
            maxRetries: 3,
            retryDelay: 1000,
            timeoutMs: 30000,
            enableCompression: true,
            enableEncryption: false,
            conflictResolutionStrategy: {
                type: 'last_write_wins',
                mergeRules: {},
            },
            backgroundSyncEnabled: true,
            syncOnConnect: true,
            syncOnForeground: false,
            priorityWeights: {
                1: 4, // CRITICAL
                2: 3, // HIGH
                3: 2, // NORMAL
                4: 1, // LOW
            },
        };
    }

    private getDefaultPreferences(): OfflinePreferences {
        return {
            enableOfflineMode: true,
            backgroundSync: true,
            syncOnWifiOnly: false,
            dataCompression: true,
            storageLimit: 50, // MB
            conflictResolution: {
                type: 'last_write_wins',
                mergeRules: {},
            },
            notificationSettings: {
                syncStatus: true,
                conflicts: true,
                storageWarning: true,
                completion: false,
                errors: true,
            },
        };
    }

    private getDefaultBackgroundConfig(): BackgroundSyncConfig {
        return {
            enabled: true,
            interval: 300, // 5 minutes
            batteryLevelThreshold: 0.2, // 20%
            requireCharging: false,
            requireWifi: false,
            maxSyncTime: 60, // 1 minute
            retryAttempts: 3,
            exponentialBackoff: true,
        };
    }
}

// Export singleton instance
export const syncManager = SyncManager.getInstance();
export default SyncManager;