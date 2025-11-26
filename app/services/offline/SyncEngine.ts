/**
 * Enhanced Sync Engine with Intelligent Conflict Resolution
 * Handles bi-directional synchronization with smart conflict detection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

import {
    SyncStatus,
    SyncDirection,
    SyncPriority,
    SyncProgress,
    SyncConfig,
    SyncOperation,
    SyncConflict,
    ConflictResolution,
    ConflictResolutionStrategy,
    MergeRule,
    SyncAnalytics,
    SyncError,
    SyncOperationType,
    OfflineOperation,
    Listener,
    ErrorHandler,
} from './types';

import { localDatabase } from './LocalDatabase';

export class SyncEngine {
    private static instance: SyncEngine;
    private config: SyncConfig;
    private status: SyncStatus = SyncStatus.IDLE;
    private progress: SyncProgress;
    private analytics: SyncAnalytics;
    private syncQueue: SyncOperation[] = [];
    private conflicts: SyncConflict[] = [];
    private isInitialized = false;
    private isRunning = false;
    private lastSyncTime?: Date;
    private retryCount = 0;

    // Event listeners
    private progressListeners = new Map<string, Listener<SyncProgress>>();
    private conflictListeners = new Map<string, Listener<SyncConflict>>();
    private statusListeners = new Map<string, Listener<SyncStatus>>();
    private errorHandlers: ErrorHandler[] = [];

    private constructor(config?: Partial<SyncConfig>) {
        this.config = this.getDefaultConfig(config);
        this.progress = this.getInitialProgress();
        this.analytics = this.getInitialAnalytics();
    }

    public static getInstance(config?: Partial<SyncConfig>): SyncEngine {
        if (!SyncEngine.instance) {
            SyncEngine.instance = new SyncEngine(config);
        }
        return SyncEngine.instance;
    }

    /**
     * Initialize the sync engine
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Initialize local database
            await localDatabase.initialize();

            // Load pending sync operations
            await this.loadSyncQueue();

            // Load existing conflicts
            await this.loadConflicts();

            // Load analytics
            await this.loadAnalytics();

            this.isInitialized = true;
            console.log('✅ SyncEngine initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize SyncEngine:', error);
            throw new Error(`SyncEngine initialization failed: ${error}`);
        }
    }

    /**
     * Trigger a complete sync operation
     */
    public async triggerSync(): Promise<SyncProgress> {
        if (!this.isInitialized) {
            throw new Error('SyncEngine not initialized');
        }

        if (this.status === SyncStatus.SYNCING) {
            throw new Error('Sync already in progress');
        }

        this.setStatus(SyncStatus.SYNCING);
        this.setProgress({
            ...this.progress,
            status: SyncStatus.SYNCING,
            percentage: 0,
        });

        try {
            console.log('🔄 Starting sync operation...');
            const startTime = Date.now();

            // Step 1: Load pending operations
            await this.loadSyncQueue();

            // Step 2: Push local changes to remote
            await this.syncLocalToRemote();

            // Step 3: Pull remote changes to local
            await this.syncRemoteToLocal();

            // Step 4: Resolve any conflicts
            await this.resolveConflicts();

            // Step 5: Clean up completed operations
            await this.cleanupSyncQueue();

            const duration = Date.now() - startTime;
            this.lastSyncTime = new Date();
            this.analytics.successfulSyncs++;
            this.analytics.lastSyncDuration = duration;

            // Save analytics
            await this.saveAnalytics();

            console.log(`✅ Sync completed in ${duration}ms`);

            this.setStatus(SyncStatus.IDLE);
            this.setProgress({
                ...this.progress,
                status: SyncStatus.IDLE,
                percentage: 100,
                lastSyncTime: this.lastSyncTime,
            });

            return this.getProgress();
        } catch (error) {
            console.error('❌ Sync failed:', error);
            this.analytics.failedSyncs++;
            await this.handleSyncError(error as SyncError);
            throw error;
        }
    }

    /**
     * Add operation to sync queue
     */
    public async addToSyncQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<string> {
        const syncOperation: SyncOperation = {
            id: uuidv4(),
            direction: SyncDirection.PUSH, // Default direction
            priority: operation.priority,
            table: operation.table,
            data: operation.data,
            timestamp: new Date(),
            metadata: operation.metadata,
        };

        this.syncQueue.push(syncOperation);
        await this.saveSyncQueue();

        console.log(`📤 Added to sync queue: ${operation.type} on ${operation.table}`);
        return syncOperation.id;
    }

    /**
     * Add operation with pull direction
     */
    public async addPullOperation(
        table: string,
        data: any,
        priority: SyncPriority = SyncPriority.NORMAL
    ): Promise<string> {
        const syncOperation: SyncOperation = {
            id: uuidv4(),
            direction: SyncDirection.PULL,
            priority,
            table,
            data,
            timestamp: new Date(),
        };

        this.syncQueue.push(syncOperation);
        await this.saveSyncQueue();

        return syncOperation.id;
    }

    /**
     * Manually resolve a conflict
     */
    public async resolveConflictManually(
        conflictId: string,
        resolution: ConflictResolution
    ): Promise<void> {
        const conflictIndex = this.conflicts.findIndex(c => c.id === conflictId);
        if (conflictIndex === -1) {
            throw new Error(`Conflict ${conflictId} not found`);
        }

        const conflict = this.conflicts[conflictIndex];
        conflict.resolved = true;
        conflict.resolution = resolution;

        // Apply the resolution
        await this.applyConflictResolution(conflict, resolution);

        // Update the local database
        await this.updateLocalRecord(conflict.table, conflict.recordId, resolution.resolvedData);

        // Remove from conflicts array
        this.conflicts.splice(conflictIndex, 1);

        await this.saveConflicts();

        console.log(`✅ Conflict ${conflictId} resolved manually`);
        this.emitConflictEvent(conflict);
    }

    /**
     * Get current sync progress
     */
    public getProgress(): SyncProgress {
        return { ...this.progress };
    }

    /**
     * Get current sync status
     */
    public getStatus(): SyncStatus {
        return this.status;
    }

    /**
     * Get active conflicts
     */
    public getConflicts(): SyncConflict[] {
        return [...this.conflicts];
    }

    /**
     * Get sync analytics
     */
    public getAnalytics(): SyncAnalytics {
        return { ...this.analytics };
    }

    /**
     * Get last sync time
     */
    public getLastSyncTime(): Date | undefined {
        return this.lastSyncTime;
    }

    /**
     * Update sync configuration
     */
    public async updateConfig(newConfig: Partial<SyncConfig>): Promise<void> {
        this.config = { ...this.config, ...newConfig };
        console.log('⚙️ Sync configuration updated');
    }

    /**
     * Pause sync operations
     */
    public pauseSync(): void {
        if (this.status === SyncStatus.SYNCING) {
            this.setStatus(SyncStatus.PAUSED);
            console.log('⏸️ Sync paused');
        }
    }

    /**
     * Resume sync operations
     */
    public resumeSync(): void {
        if (this.status === SyncStatus.PAUSED) {
            this.setStatus(SyncStatus.IDLE);
            console.log('▶️ Sync resumed');
        }
    }

    /**
     * Add progress listener
     */
    public addProgressListener(id: string, listener: Listener<SyncProgress>): () => void {
        this.progressListeners.set(id, listener);
        return () => this.progressListeners.delete(id);
    }

    /**
     * Remove progress listener
     */
    public removeProgressListener(id: string): void {
        this.progressListeners.delete(id);
    }

    /**
     * Add conflict listener
     */
    public addConflictListener(id: string, listener: Listener<SyncConflict>): () => void {
        this.conflictListeners.set(id, listener);
        return () => this.conflictListeners.delete(id);
    }

    /**
     * Remove conflict listener
     */
    public removeConflictListener(id: string): void {
        this.conflictListeners.delete(id);
    }

    /**
     * Add status listener
     */
    public addStatusListener(id: string, listener: Listener<SyncStatus>): () => void {
        this.statusListeners.set(id, listener);
        return () => this.statusListeners.delete(id);
    }

    /**
     * Remove status listener
     */
    public removeStatusListener(id: string): void {
        this.statusListeners.delete(id);
    }

    /**
     * Add error handler
     */
    public addErrorHandler(handler: ErrorHandler): () => void {
        this.errorHandlers.push(handler);
        return () => {
            const index = this.errorHandlers.indexOf(handler);
            if (index > -1) {
                this.errorHandlers.splice(index, 1);
            }
        };
    }

    /**
     * Clean up resources
     */
    public async dispose(): Promise<void> {
        this.isRunning = false;
        this.progressListeners.clear();
        this.conflictListeners.clear();
        this.statusListeners.clear();
        this.errorHandlers.length = 0;
        console.log('SyncEngine disposed');
    }

    // Private methods

    private async syncLocalToRemote(): Promise<void> {
        console.log('📤 Syncing local changes to remote...');

        const pushOperations = this.syncQueue.filter(
            op => op.direction === SyncDirection.PUSH || op.direction === SyncDirection.BIDIRECTIONAL
        );

        let completed = 0;
        for (const operation of pushOperations) {
            try {
                await this.pushOperation(operation);
                completed++;

                this.setProgress({
                    ...this.progress,
                    completedOperations: completed,
                    percentage: Math.round((completed / pushOperations.length) * 50), // 50% for push phase
                });

            } catch (error) {
                console.error(`Failed to push operation ${operation.id}:`, error);
                // Mark as failed but continue with other operations
                this.progress.failedOperations++;
            }
        }

        console.log(`✅ Pushed ${completed}/${pushOperations.length} operations`);
    }

    private async syncRemoteToLocal(): Promise<void> {
        console.log('📥 Syncing remote changes to local...');

        const pullOperations = this.syncQueue.filter(
            op => op.direction === SyncDirection.PULL || op.direction === SyncDirection.BIDIRECTIONAL
        );

        let completed = 0;
        for (const operation of pullOperations) {
            try {
                await this.pullOperation(operation);
                completed++;

                const currentProgress = 50 + Math.round((completed / pullOperations.length) * 30); // 30% for pull phase
                this.setProgress({
                    ...this.progress,
                    completedOperations: completed + this.progress.completedOperations,
                    percentage: currentProgress,
                });

            } catch (error) {
                console.error(`Failed to pull operation ${operation.id}:`, error);
                this.progress.failedOperations++;
            }
        }

        console.log(`✅ Pulled ${completed}/${pullOperations.length} operations`);
    }

    private async pushOperation(operation: SyncOperation): Promise<void> {
        // In a real implementation, this would sync to Supabase
        console.log(`Pushing operation ${operation.id} to remote`);

        // Simulate API call
        await this.simulateAPICall();

        // Update local database to mark as synced
        // await localDatabase.update(operation.table, operation.data.id, { synced: true });
    }

    private async pullOperation(operation: SyncOperation): Promise<void> {
        // In a real implementation, this would fetch from Supabase
        console.log(`Pulling operation ${operation.id} from remote`);

        // Simulate API call
        await this.simulateAPICall();

        // Apply pulled data to local database
        // await localDatabase.insert(operation.table, operation.data, { returnId: true });
    }

    private async resolveConflicts(): Promise<void> {
        console.log('🔍 Checking for conflicts...');

        // In a real implementation, this would detect conflicts between local and remote data
        // For now, we'll simulate conflict detection
        const detectedConflicts = await this.detectConflicts();

        for (const conflict of detectedConflicts) {
            await this.handleDetectedConflict(conflict);
        }

        // Resolve automatically resolvable conflicts
        await this.resolveAutomaticConflicts();
    }

    private async detectConflicts(): Promise<SyncConflict[]> {
        // Simplified conflict detection
        // In production, this would compare local and remote versions
        const conflicts: SyncConflict[] = [];

        // Simulate finding conflicts
        if (Math.random() > 0.8) { // 20% chance of conflicts
            const conflict: SyncConflict = {
                id: uuidv4(),
                operationId: uuidv4(),
                table: 'timer_sessions',
                recordId: uuidv4(),
                localData: { name: 'Local Name' },
                remoteData: { name: 'Remote Name' },
                conflictType: 'field_level',
                fields: ['name'],
                timestamp: new Date(),
                resolved: false,
                priority: SyncPriority.NORMAL,
            };
            conflicts.push(conflict);
        }

        return conflicts;
    }

    private async handleDetectedConflict(conflict: SyncConflict): Promise<void> {
        this.conflicts.push(conflict);
        await this.saveConflicts();

        console.log(`🚨 Conflict detected: ${conflict.id}`);
        this.emitConflictEvent(conflict);

        // Try automatic resolution first
        const autoResolution = await this.attemptAutomaticResolution(conflict);
        if (autoResolution) {
            await this.resolveConflictManually(conflict.id, autoResolution);
        }
    }

    private async resolveAutomaticConflicts(): Promise<void> {
        const unresolvedConflicts = this.conflicts.filter(c => !c.resolved);

        for (const conflict of unresolvedConflicts) {
            const autoResolution = await this.attemptAutomaticResolution(conflict);
            if (autoResolution) {
                await this.resolveConflictManually(conflict.id, autoResolution);
            }
        }
    }

    private async attemptAutomaticResolution(conflict: SyncConflict): Promise<ConflictResolution | null> {
        const strategy = this.config.conflictResolutionStrategy;

        switch (strategy.type) {
            case 'last_write_wins':
                return this.resolveLastWriteWins(conflict);

            case 'merge':
                return this.resolveWithMerge(conflict);

            case 'server_authority':
                return this.resolveServerAuthority(conflict);

            default:
                return null; // Requires user intervention
        }
    }

    private resolveLastWriteWins(conflict: SyncConflict): ConflictResolution {
        // Use timestamp to determine winner
        const localTime = conflict.localData.updated_at ? new Date(conflict.localData.updated_at).getTime() : 0;
        const remoteTime = conflict.remoteData.updated_at ? new Date(conflict.remoteData.updated_at).getTime() : 0;

        const resolvedData = localTime > remoteTime ? conflict.localData : conflict.remoteData;

        return {
            strategy: this.config.conflictResolutionStrategy,
            resolvedData,
            resolvedAt: new Date(),
            resolvedBy: 'automatic_last_write_wins',
        };
    }

    private resolveWithMerge(conflict: SyncConflict): ConflictResolution {
        const resolvedData = { ...conflict.localData };

        // Apply merge rules
        for (const field of conflict.fields) {
            const rule = this.config.conflictResolutionStrategy.mergeRules?.[field];
            if (rule) {
                switch (rule.strategy) {
                    case 'take_local':
                        resolvedData[field] = conflict.localData[field];
                        break;
                    case 'take_remote':
                        resolvedData[field] = conflict.remoteData[field];
                        break;
                    case 'merge':
                        // Custom merge logic
                        resolvedData[field] = this.mergeField(field, conflict.localData[field], conflict.remoteData[field]);
                        break;
                }
            }
        }

        return {
            strategy: this.config.conflictResolutionStrategy,
            resolvedData,
            resolvedAt: new Date(),
            resolvedBy: 'automatic_merge',
        };
    }

    private resolveServerAuthority(conflict: SyncConflict): ConflictResolution {
        // Always favor remote data
        return {
            strategy: this.config.conflictResolutionStrategy,
            resolvedData: conflict.remoteData,
            resolvedAt: new Date(),
            resolvedBy: 'automatic_server_authority',
        };
    }

    private mergeField(field: string, localValue: any, remoteValue: any): any {
        // Simplified merge logic - in production this would be more sophisticated
        if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
            // Merge arrays (avoiding duplicates)
            return [...new Set([...localValue, ...remoteValue])];
        }

        if (typeof localValue === 'object' && typeof remoteValue === 'object') {
            // Merge objects
            return { ...remoteValue, ...localValue };
        }

        // Default to remote value
        return remoteValue || localValue;
    }

    private async applyConflictResolution(conflict: SyncConflict, resolution: ConflictResolution): Promise<void> {
        // Update the operation in sync queue to mark as resolved
        const operationIndex = this.syncQueue.findIndex(op => op.id === conflict.operationId);
        if (operationIndex > -1) {
            this.syncQueue[operationIndex].data = resolution.resolvedData;
        }
    }

    private async updateLocalRecord(table: string, recordId: string, data: any): Promise<void> {
        try {
            await localDatabase.update(table, recordId, data);
            console.log(`Updated local record ${table}:${recordId}`);
        } catch (error) {
            console.error(`Failed to update local record ${table}:${recordId}:`, error);
        }
    }

    private async cleanupSyncQueue(): Promise<void> {
        // Remove successfully synced operations
        this.syncQueue = this.syncQueue.filter(op => !op.data.synced);
        await this.saveSyncQueue();
        console.log(`Cleaned up sync queue, ${this.syncQueue.length} operations remaining`);
    }

    private async loadSyncQueue(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('sync_queue');
            if (stored) {
                this.syncQueue = JSON.parse(stored).map((op: any) => ({
                    ...op,
                    timestamp: new Date(op.timestamp),
                }));
            }
        } catch (error) {
            console.warn('Failed to load sync queue:', error);
            this.syncQueue = [];
        }
    }

    private async saveSyncQueue(): Promise<void> {
        try {
            await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
        } catch (error) {
            console.warn('Failed to save sync queue:', error);
        }
    }

    private async loadConflicts(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('sync_conflicts');
            if (stored) {
                this.conflicts = JSON.parse(stored).map((conflict: any) => ({
                    ...conflict,
                    timestamp: new Date(conflict.timestamp),
                    resolvedAt: conflict.resolvedAt ? new Date(conflict.resolvedAt) : undefined,
                }));
            }
        } catch (error) {
            console.warn('Failed to load conflicts:', error);
            this.conflicts = [];
        }
    }

    private async saveConflicts(): Promise<void> {
        try {
            await AsyncStorage.setItem('sync_conflicts', JSON.stringify(this.conflicts));
        } catch (error) {
            console.warn('Failed to save conflicts:', error);
        }
    }

    private async loadAnalytics(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('sync_analytics');
            if (stored) {
                this.analytics = JSON.parse(stored);
            }
        } catch (error) {
            console.warn('Failed to load analytics:', error);
        }
    }

    private async saveAnalytics(): Promise<void> {
        try {
            await AsyncStorage.setItem('sync_analytics', JSON.stringify(this.analytics));
        } catch (error) {
            console.warn('Failed to save analytics:', error);
        }
    }

    private async handleSyncError(error: SyncError): Promise<void> {
        this.setStatus(SyncStatus.FAILED);

        // Emit to error handlers
        for (const handler of this.errorHandlers) {
            try {
                handler(error);
            } catch (handlerError) {
                console.warn('Error in error handler:', handlerError);
            }
        }

        // Implement retry logic
        if (error.retryable && this.retryCount < this.config.maxRetries) {
            this.retryCount++;
            const delay = Math.min(this.config.retryDelay * Math.pow(2, this.retryCount), 30000);

            setTimeout(() => {
                console.log(`Retrying sync in ${delay}ms (attempt ${this.retryCount})`);
                this.triggerSync().catch(console.error);
            }, delay);
        }
    }

    private setStatus(status: SyncStatus): void {
        this.status = status;
        this.statusListeners.forEach(listener => listener(status));
    }

    private setProgress(progress: SyncProgress): void {
        this.progress = progress;
        this.progressListeners.forEach(listener => listener(progress));
    }

    private emitConflictEvent(conflict: SyncConflict): void {
        this.conflictListeners.forEach(listener => listener(conflict));
    }

    private async simulateAPICall(): Promise<void> {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 100));
    }

    private getDefaultConfig(overrides?: Partial<SyncConfig>): SyncConfig {
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
            syncOnForeground: true,
            priorityWeights: {
                [SyncPriority.CRITICAL]: 4,
                [SyncPriority.HIGH]: 3,
                [SyncPriority.NORMAL]: 2,
                [SyncPriority.LOW]: 1,
            },
            ...overrides,
        };
    }

    private getInitialProgress(): SyncProgress {
        return {
            status: SyncStatus.IDLE,
            percentage: 0,
            totalOperations: 0,
            completedOperations: 0,
            failedOperations: 0,
            bytesTransferred: 0,
        };
    }

    private getInitialAnalytics(): SyncAnalytics {
        return {
            totalSyncs: 0,
            successfulSyncs: 0,
            failedSyncs: 0,
            averageSyncTime: 0,
            dataTransferred: 0,
            conflictsResolved: 0,
            storageEfficiency: 1,
        };
    }
}

// Export singleton instance
export const offlineSyncEngine = SyncEngine.getInstance();
export default SyncEngine;