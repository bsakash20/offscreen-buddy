/**
 * Offline State Manager
 * Manages offline/online state transitions and operation queuing
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus } from 'react-native';
import { v4 as uuidv4 } from 'uuid';

import {
    OfflineState,
    OfflineMode,
    OfflineOperation,
    OfflineError,
    StorageServiceStatus,
    Listener,
} from './types';

import { networkConnectivityService } from './NetworkConnectivityService';
import { localDatabase } from './LocalDatabase';

export class OfflineStateManager {
    private static instance: OfflineStateManager;
    private state: OfflineState;
    private mode: OfflineMode = OfflineMode.AUTO;
    private operationQueue: OfflineOperation[] = [];
    private cachedData = new Map<string, any>();
    private listeners = new Map<string, Listener<OfflineState>>();
    private isInitialized = false;
    private appStateSubscription?: any;
    private lastOnlineTime?: Date;

    private constructor() {
        this.state = this.getDefaultState();
    }

    public static getInstance(): OfflineStateManager {
        if (!OfflineStateManager.instance) {
            OfflineStateManager.instance = new OfflineStateManager();
        }
        return OfflineStateManager.instance;
    }

    /**
     * Initialize the offline state manager
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Subscribe to app state changes
            this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
                this.handleAppStateChange(nextAppState);
            });

            // Subscribe to network connectivity changes
            const unsubscribeNetwork = networkConnectivityService.addListener('offline_manager', (networkState) => {
                this.handleNetworkStateChange(networkState.isConnected);
            });

            // Load cached data
            await this.loadCachedData();

            // Calculate offline duration if applicable
            this.updateOfflineDuration();

            this.isInitialized = true;
            console.log('✅ OfflineStateManager initialized');
        } catch (error) {
            console.error('❌ Failed to initialize OfflineStateManager:', error);
            throw error;
        }
    }

    /**
     * Get current offline state
     */
    public getState(): OfflineState {
        return { ...this.state };
    }

    /**
     * Set offline mode
     */
    public async setMode(mode: OfflineMode): Promise<void> {
        this.mode = mode;
        await this.updateState();
        console.log(`📱 Offline mode set to: ${mode}`);
    }

    /**
     * Activate offline mode manually
     */
    public async activateOfflineMode(): Promise<void> {
        await this.setMode(OfflineMode.FORCE_OFFLINE);
        console.log('📱 Offline mode activated');
    }

    /**
     * Deactivate offline mode manually
     */
    public async deactivateOfflineMode(): Promise<void> {
        await this.setMode(OfflineMode.FORCE_ONLINE);
        console.log('📱 Offline mode deactivated');
    }

    /**
     * Queue an operation for later execution
     */
    public async queueOperation(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<string> {
        const offlineOperation: OfflineOperation = {
            ...operation,
            id: uuidv4(),
            timestamp: new Date(),
            retryCount: 0,
        };

        this.operationQueue.push(offlineOperation);
        await this.saveOperationQueue();

        // Update state
        this.state.queuedOperationsCount = this.operationQueue.length;
        await this.updateState();

        console.log(`📤 Operation queued: ${operation.type} on ${operation.table}`);
        return offlineOperation.id;
    }

    /**
     * Get queued operations with optional filtering
     */
    public getQueuedOperations(filter?: Partial<OfflineOperation>): OfflineOperation[] {
        if (!filter) return [...this.operationQueue];

        return this.operationQueue.filter(operation => {
            return Object.entries(filter).every(([key, value]) => {
                return operation[key as keyof OfflineOperation] === value;
            });
        });
    }

    /**
     * Remove operation from queue
     */
    public async removeFromQueue(operationId: string): Promise<void> {
        const index = this.operationQueue.findIndex(op => op.id === operationId);
        if (index > -1) {
            this.operationQueue.splice(index, 1);
            await this.saveOperationQueue();

            this.state.queuedOperationsCount = this.operationQueue.length;
            await this.updateState();
        }
    }

    /**
     * Cache data for offline access
     */
    public async cacheData(key: string, data: any, expiresIn?: number): Promise<void> {
        const cacheItem = {
            value: data,
            expiresAt: expiresIn ? Date.now() + expiresIn : undefined,
            timestamp: Date.now(),
        };

        this.cachedData.set(key, cacheItem);

        // Persist to AsyncStorage
        try {
            await AsyncStorage.setItem(`cache_${key}`, JSON.stringify(cacheItem));
        } catch (error) {
            console.warn('Failed to persist cache data:', error);
        }

        // Update cache size in state
        this.state.cachedDataSize = this.calculateCacheSize();
        await this.updateState();
    }

    /**
     * Get cached data
     */
    public getCachedData<T = any>(key: string): T | null {
        const cacheItem = this.cachedData.get(key);

        if (!cacheItem) return null;

        // Check expiration
        if (cacheItem.expiresAt && Date.now() > cacheItem.expiresAt) {
            this.cachedData.delete(key);
            return null;
        }

        return cacheItem.value as T;
    }

    /**
     * Clear cache with optional pattern matching
     */
    public async clearCache(keyPattern?: string): Promise<number> {
        let cleared = 0;

        if (keyPattern) {
            // Clear matching keys
            for (const key of this.cachedData.keys()) {
                if (key.includes(keyPattern)) {
                    this.cachedData.delete(key);
                    cleared++;
                    await AsyncStorage.removeItem(`cache_${key}`).catch(console.warn);
                }
            }
        } else {
            // Clear all cache
            this.cachedData.clear();
            cleared = 1;

            // Clear all AsyncStorage cache
            try {
                const keys = await AsyncStorage.getAllKeys();
                const cacheKeys = keys.filter(key => key.startsWith('cache_'));
                await AsyncStorage.multiRemove(cacheKeys);
            } catch (error) {
                console.warn('Failed to clear AsyncStorage cache:', error);
            }
        }

        this.state.cachedDataSize = this.calculateCacheSize();
        await this.updateState();

        return cleared;
    }

    /**
     * Get storage service status
     */
    public getStatus(): StorageServiceStatus {
        return {
            initialized: this.isInitialized,
            used: this.state.storageUsed,
            limit: this.state.storageLimit,
            cacheSize: this.state.cachedDataSize,
        };
    }

    /**
     * Add state change listener
     */
    public addListener(id: string, listener: Listener<OfflineState>): () => void {
        this.listeners.set(id, listener);

        // Immediately call with current state
        setTimeout(() => listener(this.getState()), 0);

        return () => this.listeners.delete(id);
    }

    /**
     * Remove state change listener
     */
    public removeListener(id: string): void {
        this.listeners.delete(id);
    }

    /**
     * Check if currently offline
     */
    public isOffline(): boolean {
        switch (this.mode) {
            case OfflineMode.FORCE_OFFLINE:
                return true;
            case OfflineMode.FORCE_ONLINE:
                return false;
            case OfflineMode.AUTO:
            default:
                return !networkConnectivityService.getCurrentState()?.isConnected;
        }
    }

    /**
     * Get operation queue size
     */
    public getQueueSize(): number {
        return this.operationQueue.length;
    }

    /**
     * Get cache size in bytes
     */
    public getCacheSize(): number {
        return this.state.cachedDataSize;
    }

    /**
     * Check if operation queue is full
     */
    public isQueueFull(): boolean {
        return this.operationQueue.length >= 1000; // Max queue size
    }

    /**
     * Clean up expired cache and process queue on cleanup
     */
    public async performMaintenance(): Promise<{ cleaned: number; processed: number }> {
        const cleaned = await this.cleanExpiredCache();
        const processed = await this.processPendingQueue();

        return { cleaned, processed };
    }

    /**
     * Dispose of resources
     */
    public async dispose(): Promise<void> {
        if (this.appStateSubscription) {
            this.appStateSubscription.remove();
        }

        this.listeners.clear();
        this.cachedData.clear();
        this.isInitialized = false;

        console.log('OfflineStateManager disposed');
    }

    // Private methods

    private async loadCachedData(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith('cache_'));

            for (const key of cacheKeys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    const cacheItem = JSON.parse(value);

                    // Check expiration
                    if (!cacheItem.expiresAt || Date.now() < cacheItem.expiresAt) {
                        const dataKey = key.replace('cache_', '');
                        this.cachedData.set(dataKey, cacheItem);
                    } else {
                        // Remove expired
                        await AsyncStorage.removeItem(key);
                    }
                }
            }

            this.state.cachedDataSize = this.calculateCacheSize();
        } catch (error) {
            console.warn('Failed to load cached data:', error);
        }
    }

    private async saveOperationQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem('operation_queue', JSON.stringify(this.operationQueue));
        } catch (error) {
            console.warn('Failed to save operation queue:', error);
        }
    }

    private async loadOperationQueue(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('operation_queue');
            if (stored) {
                this.operationQueue = JSON.parse(stored).map((op: any) => ({
                    ...op,
                    timestamp: new Date(op.timestamp),
                }));
            }
        } catch (error) {
            console.warn('Failed to load operation queue:', error);
            this.operationQueue = [];
        }
    }

    private async updateState(): Promise<void> {
        this.state.isOffline = this.isOffline();
        this.state.mode = this.mode;
        this.state.queuedOperationsCount = this.operationQueue.length;
        this.state.cachedDataSize = this.calculateCacheSize();
        this.state.storageUsed = this.calculateStorageUsage();

        // Update online time
        if (!this.state.isOffline && !this.lastOnlineTime) {
            this.lastOnlineTime = new Date();
            this.state.lastOnlineTime = this.lastOnlineTime;
        } else if (this.state.isOffline && this.lastOnlineTime) {
            this.state.offlineDuration = Date.now() - this.lastOnlineTime.getTime();
        }

        // Emit to listeners
        this.listeners.forEach(listener => {
            try {
                listener(this.getState());
            } catch (error) {
                console.warn('Error in offline state listener:', error);
            }
        });
    }

    private handleAppStateChange(nextAppState: AppStateStatus): void {
        console.log('📱 App state changed:', nextAppState);

        if (nextAppState === 'active') {
            // App came to foreground - check network connectivity
            this.checkNetworkConnectivity();
        } else if (nextAppState === 'background') {
            // App went to background - flush operation queue if online
            if (!this.isOffline()) {
                this.flushOperationQueue();
            }
        }
    }

    private handleNetworkStateChange(isConnected: boolean): void {
        console.log('🌐 Network connectivity changed:', isConnected);

        if (isConnected && this.isOffline()) {
            // Just came online - flush queued operations
            this.onConnectivityGained();
        } else if (!isConnected && !this.isOffline()) {
            // Just went offline
            this.onConnectivityLost();
        }

        this.updateState();
    }

    private async onConnectivityGained(): Promise<void> {
        console.log('🔌 Connectivity gained - flushing operation queue');
        this.lastOnlineTime = new Date();

        // Process queued operations
        await this.flushOperationQueue();
    }

    private async onConnectivityLost(): Promise<void> {
        console.log('📴 Connectivity lost - entering offline mode');
    }

    private async checkNetworkConnectivity(): Promise<void> {
        try {
            await networkConnectivityService.refreshNetworkState();
        } catch (error) {
            console.warn('Failed to check network connectivity:', error);
        }
    }

    private async flushOperationQueue(): Promise<void> {
        if (this.operationQueue.length === 0) return;

        console.log(`🔄 Flushing ${this.operationQueue.length} queued operations`);

        // This would integrate with the SyncEngine in a real implementation
        // For now, we'll simulate processing
        let processed = 0;

        for (const operation of [...this.operationQueue]) {
            try {
                // Simulate processing
                await this.simulateOperationProcessing(operation);
                processed++;
            } catch (error) {
                console.error('Failed to process operation:', operation.id, error);
            }
        }

        // Clear processed operations
        this.operationQueue = [];
        await this.saveOperationQueue();

        console.log(`✅ Processed ${processed} operations`);
        this.state.queuedOperationsCount = 0;
        await this.updateState();
    }

    private async simulateOperationProcessing(operation: OfflineOperation): Promise<void> {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));

        // In a real implementation, this would:
        // 1. Use the SyncEngine to sync the operation
        // 2. Update local database
        // 3. Notify user of success/failure
    }

    private async processPendingQueue(): Promise<number> {
        if (this.isOffline()) return 0;

        await this.flushOperationQueue();
        return this.operationQueue.length === 0 ? 1 : 0;
    }

    private async cleanExpiredCache(): Promise<number> {
        let cleaned = 0;
        const now = Date.now();

        // Clean memory cache
        for (const [key, cacheItem] of this.cachedData.entries()) {
            if (cacheItem.expiresAt && now > cacheItem.expiresAt) {
                this.cachedData.delete(key);
                cleaned++;
                await AsyncStorage.removeItem(`cache_${key}`).catch(console.warn);
            }
        }

        this.state.cachedDataSize = this.calculateCacheSize();
        await this.updateState();

        return cleaned;
    }

    private calculateCacheSize(): number {
        let size = 0;
        for (const cacheItem of this.cachedData.values()) {
            size += JSON.stringify(cacheItem).length;
        }
        return size;
    }

    private calculateStorageUsage(): number {
        // Simplified calculation - in production would query actual storage usage
        return this.state.cachedDataSize + (this.operationQueue.length * 1000); // Rough estimate
    }

    private updateOfflineDuration(): void {
        if (this.isOffline()) {
            const now = Date.now();
            if (this.lastOnlineTime) {
                this.state.offlineDuration = now - this.lastOnlineTime.getTime();
            }
        }
    }

    private getDefaultState(): OfflineState {
        return {
            isOffline: false,
            mode: OfflineMode.AUTO,
            queuedOperationsCount: 0,
            cachedDataSize: 0,
            storageUsed: 0,
            storageLimit: 50 * 1024 * 1024, // 50MB
        };
    }
}

// Export singleton instance
export const offlineStateManager = OfflineStateManager.getInstance();
export default OfflineStateManager;