/**
 * React Hooks for Offline State Management
 *
 * Provides easy-to-use hooks for managing offline state,
 * network connectivity, and sync operations in React components.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ValidationResult } from '../_services/offline/types';
import {
    networkConnectivityService
} from '../_services/offline/NetworkConnectivityService';
import {
    NetworkState,
    NetworkStatus,
    NetworkQuality
} from '../_services/offline/types';
import {
    offlineStateManager
} from '../_services/offline/OfflineStateManager';
import {
    OfflineState,
    OfflineMode
} from '../_services/offline/types';
import {
    offlineSyncEngine
} from '../_services/offline/OfflineSyncEngine';
import {
    SyncProgress,
    SyncStatus,
    SyncConflict
} from '../_services/offline/types';

/**
 * Hook for network connectivity state
 */
export function useNetworkState() {
    const [networkState, setNetworkState] = useState<NetworkState | null>(
        networkConnectivityService.getCurrentState()
    );

    useEffect(() => {
        const listenerId = 'use_network_state_' + Math.random().toString(36).substr(2, 9);

        networkConnectivityService.addListener(listenerId, (state) => {
            setNetworkState(state);
        });

        return () => {
            networkConnectivityService.removeListener(listenerId);
        };
    }, []);

    const refreshState = useCallback(async () => {
        const newState = await networkConnectivityService.refreshNetworkState();
        setNetworkState(newState);
        return newState;
    }, []);

    const validateConnection = useCallback(async (): Promise<ValidationResult> => {
        return await networkConnectivityService.validateConnection();
    }, []);

    return {
        networkState,
        isOnline: networkState?.isConnected ?? false,
        isInternetReachable: networkState?.isInternetReachable ?? false,
        networkType: networkState?.type,
        networkQuality: networkState?.quality,
        networkStatus: networkState?.status,
        refreshState,
        validateConnection
    };
}

/**
 * Hook for offline state management
 */
export function useOfflineState() {
    const [offlineState, setOfflineState] = useState<OfflineState>(
        offlineStateManager.getState()
    );

    useEffect(() => {
        const listenerId = 'use_offline_state_' + Math.random().toString(36).substr(2, 9);

        offlineStateManager.addListener(listenerId, (state) => {
            setOfflineState(state);
        });

        return () => {
            offlineStateManager.removeListener(listenerId);
        };
    }, []);

    const setMode = useCallback(async (mode: OfflineMode) => {
        await offlineStateManager.setMode(mode);
    }, []);

    const activateOfflineMode = useCallback(async () => {
        await offlineStateManager.activateOfflineMode();
    }, []);

    const deactivateOfflineMode = useCallback(async () => {
        await offlineStateManager.deactivateOfflineMode();
    }, []);

    const queueOperation = useCallback(async (operation: any) => {
        return await offlineStateManager.queueOperation(operation);
    }, []);

    const getQueuedOperations = useCallback((filter?: any) => {
        return offlineStateManager.getQueuedOperations(filter);
    }, []);

    const cacheData = useCallback(async (key: string, data: any, expiresIn?: number) => {
        await offlineStateManager.cacheData(key, data, expiresIn);
    }, []);

    const getCachedData = useCallback(<T = any>(key: string): T | null => {
        return offlineStateManager.getCachedData<T>(key);
    }, []);

    const clearCache = useCallback(async (keyPattern?: string) => {
        return await offlineStateManager.clearCache(keyPattern);
    }, []);

    return {
        offlineState,
        isOffline: offlineState.isOffline,
        mode: offlineState.mode,
        queuedOperationsCount: offlineState.queuedOperationsCount,
        cachedDataSize: offlineState.cachedDataSize,
        lastOnlineTime: offlineState.lastOnlineTime,
        offlineDuration: offlineState.offlineDuration,
        setMode,
        activateOfflineMode,
        deactivateOfflineMode,
        queueOperation,
        getQueuedOperations,
        cacheData,
        getCachedData,
        clearCache
    };
}

/**
 * Hook for sync operations
 */
export function useSync() {
    const [syncProgress, setSyncProgress] = useState<SyncProgress>(
        offlineSyncEngine.getProgress()
    );
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(
        offlineSyncEngine.getStatus()
    );
    const [conflicts, setConflicts] = useState<SyncConflict[]>(
        offlineSyncEngine.getConflicts()
    );
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        const progressListenerId = 'use_sync_progress_' + Math.random().toString(36).substr(2, 9);
        const conflictListenerId = 'use_sync_conflict_' + Math.random().toString(36).substr(2, 9);

        offlineSyncEngine.addProgressListener(progressListenerId, (progress) => {
            setSyncProgress(progress);
            setSyncStatus(offlineSyncEngine.getStatus());
        });

        offlineSyncEngine.addConflictListener(conflictListenerId, (conflict) => {
            setConflicts(offlineSyncEngine.getConflicts());
        });

        return () => {
            offlineSyncEngine.removeProgressListener(progressListenerId);
            offlineSyncEngine.removeConflictListener(conflictListenerId);
        };
    }, []);

    const triggerSync = useCallback(async () => {
        setIsSyncing(true);
        try {
            const progress = await offlineSyncEngine.triggerSync();
            return progress;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const addToSyncQueue = useCallback(async (operation: any) => {
        return await offlineSyncEngine.addToSyncQueue(operation);
    }, []);

    const resolveConflict = useCallback(async (conflictId: string, resolution: any) => {
        return await offlineSyncEngine.resolveConflictManually(conflictId, resolution);
    }, []);

    const updateConfig = useCallback(async (config: any) => {
        await offlineSyncEngine.updateConfig(config);
    }, []);

    return {
        syncProgress,
        syncStatus,
        conflicts,
        isSyncing,
        lastSyncTime: offlineSyncEngine.getLastSyncTime(),
        triggerSync,
        addToSyncQueue,
        resolveConflict,
        updateConfig
    };
}

/**
 * Combined hook for complete offline functionality
 */
export function useOffline() {
    const network = useNetworkState();
    const offline = useOfflineState();
    const sync = useSync();

    return {
        ...network,
        ...offline,
        ...sync,
        // Combined helpers
        canSync: network.isOnline && !offline.isOffline,
        shouldShowOfflineBanner: offline.isOffline || !network.isOnline,
        networkQualityGood: network.networkQuality === NetworkQuality.GOOD ||
            network.networkQuality === NetworkQuality.EXCELLENT
    };
}

/**
 * Hook for offline-first data fetching
 */
export function useOfflineData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
        cacheTime?: number;
        revalidateOnMount?: boolean;
        revalidateOnFocus?: boolean;
    }
) {
    const { getCachedData, cacheData, isOffline } = useOfflineState();
    const { isOnline } = useNetworkState();
    const [data, setData] = useState<T | null>(getCachedData<T>(key));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const isMountedRef = useRef(true);

    const fetchData = useCallback(async (force = false) => {
        if (isOffline && !force) {
            // Use cached data when offline
            const cached = getCachedData<T>(key);
            if (cached) {
                setData(cached);
                return cached;
            }
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await fetcher();
            if (isMountedRef.current) {
                setData(result);
                // Cache the result
                await cacheData(key, result, options?.cacheTime);
            }
            return result;
        } catch (err) {
            if (isMountedRef.current) {
                setError(err as Error);
                // Fall back to cached data on error
                const cached = getCachedData<T>(key);
                if (cached) {
                    setData(cached);
                    return cached;
                }
            }
            throw err;
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [key, fetcher, isOffline, getCachedData, cacheData, options?.cacheTime]);

    const mutate = useCallback(async (newData?: T) => {
        if (newData !== undefined) {
            setData(newData);
            await cacheData(key, newData, options?.cacheTime);
        } else {
            await fetchData(true);
        }
    }, [key, cacheData, fetchData, options?.cacheTime]);

    useEffect(() => {
        isMountedRef.current = true;

        // Initial fetch
        if (options?.revalidateOnMount !== false) {
            fetchData();
        }

        return () => {
            isMountedRef.current = false;
        };
    }, [fetchData, options?.revalidateOnMount]);

    useEffect(() => {
        if (options?.revalidateOnFocus !== false && isOnline) {
            const handleFocus = () => {
                fetchData();
            };

            // Platform guard for React Native compatibility
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('focus', handleFocus);
                return () => {
                    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                        window.removeEventListener('focus', handleFocus);
                    }
                };
            }

            // For React Native, use AppState focus events instead
            return () => {
                // Cleanup function for React Native
            };
        }
    }, [fetchData, isOnline, options?.revalidateOnFocus]);

    return {
        data,
        loading,
        error,
        mutate,
        refetch: () => fetchData(true),
        isStale: !loading && data === null
    };
}

/**
 * Hook for offline-aware mutations
 */
export function useOfflineMutation<T, V = any>(
    mutationFn: (variables: V) => Promise<T>,
    options?: {
        onSuccess?: (data: T, variables: V) => void;
        onError?: (error: Error, variables: V) => void;
        queueWhenOffline?: boolean;
    }
) {
    const { isOffline, queueOperation } = useOfflineState();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const mutate = useCallback(async (variables: V) => {
        if (isOffline && options?.queueWhenOffline) {
            // Queue operation for later execution
            await queueOperation({
                type: 'mutation',
                payload: variables,
                priority: 50,
                maxRetries: 3,
                requiresAuth: true,
                metadata: {}
            });
            return null;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await mutationFn(variables);
            setData(result);
            options?.onSuccess?.(result, variables);
            return result;
        } catch (err) {
            const error = err as Error;
            setError(error);
            options?.onError?.(error, variables);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [isOffline, mutationFn, queueOperation, options]);

    const reset = useCallback(() => {
        setData(null);
        setError(null);
        setLoading(false);
    }, []);

    return {
        mutate,
        data,
        loading,
        error,
        reset,
        isSuccess: data !== null && error === null,
        isError: error !== null
    };
}