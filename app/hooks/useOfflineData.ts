/**
 * Enhanced Offline Data Hook
 * Provides offline-first data fetching with intelligent caching and sync
 */

import { useState, useEffect, useCallback, useRef } from 'react';

import { syncManager } from '../services/offline/SyncManager';
import { offlineStateManager } from '../services/offline/OfflineStateManager';
import { networkConnectivityService } from '../services/offline/NetworkConnectivityService';

/**
 * Hook for offline-first data fetching with enhanced caching
 */
export function useOfflineData<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
        cacheTime?: number;
        revalidateOnMount?: boolean;
        revalidateOnFocus?: boolean;
        fallback?: T;
        transform?: (data: T) => T;
    }
) {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [lastFetch, setLastFetch] = useState<Date | null>(null);

    // Get network state early
    const networkState = networkConnectivityService.getCurrentState();
    const isOnline = networkState?.isConnected || false;
    const isOffline = offlineStateManager.isOffline();

    const isMountedRef = useRef(true);
    const fetcherRef = useRef(fetcher);

    // Update fetcher reference
    fetcherRef.current = fetcher;

    const fetchData = useCallback(async (force = false) => {
        if (!force) {
            // Check if we have valid cached data
            const cached = offlineStateManager.getCachedData<T>(key);
            if (cached) {
                const transformedData = options?.transform ? options.transform(cached) : cached;
                if (isMountedRef.current) {
                    setData(transformedData);
                }
                return transformedData;
            }
        }

        if (isOffline) {
            // Use fallback data if offline and no cache
            if (options?.fallback && isMountedRef.current) {
                setData(options.fallback);
            }
            return options?.fallback || null;
        }

        setLoading(true);
        setError(null);

        try {
            const result = await syncManager.getCachedData(key, fetcherRef.current);
            if (isMountedRef.current && result !== null) {
                const transformedData = options?.transform ? options.transform(result as T) : result as T;
                setData(transformedData);
                setLastFetch(new Date());
            }
            return result;
        } catch (err) {
            if (isMountedRef.current) {
                setError(err as Error);
                // Fall back to cached data on error
                const cached = offlineStateManager.getCachedData<T>(key);
                if (cached) {
                    const transformedData = options?.transform ? options.transform(cached) : cached;
                    setData(transformedData);
                }
            }
            throw err;
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    }, [key, options?.cacheTime, options?.fallback, options?.transform, isOffline]);

    const mutate = useCallback(async (newData?: T) => {
        if (newData !== undefined) {
            setData(newData);
            await offlineStateManager.cacheData(key, newData, options?.cacheTime);

            // Queue for sync if online
            if (!isOffline) {
                await syncManager.queueData('cache', 'update', { key, data: newData });
            }
        } else {
            await fetchData(true);
        }
    }, [key, fetchData, options?.cacheTime, isOffline]);

    const refetch = useCallback(() => fetchData(true), [fetchData]);

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
        if (options?.revalidateOnFocus !== false) {
            const handleFocus = () => {
                // Only revalidate if we haven't fetched recently
                const timeSinceLastFetch = lastFetch ? Date.now() - lastFetch.getTime() : Infinity;
                const shouldRefetch = timeSinceLastFetch > 5 * 60 * 1000; // 5 minutes

                if (shouldRefetch) {
                    fetchData();
                }
            };

            // Use window focus event for web, or app state for native
            if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
                window.addEventListener('focus', handleFocus);
                return () => {
                    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
                        window.removeEventListener('focus', handleFocus);
                    }
                };
            }
        }
    }, [fetchData, isOnline, options?.revalidateOnFocus, lastFetch]);

    const isStale = !loading && data === null;

    return {
        data,
        loading,
        error,
        mutate,
        refetch,
        isStale,
        isOffline,
        isOnline,
        lastFetch,
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
        optimisticUpdate?: (variables: V) => Partial<T>;
        rollbackOnError?: boolean;
    }
) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [data, setData] = useState<T | null>(null);

    const mutate = useCallback(async (variables: V) => {
        const isOffline = offlineStateManager.isOffline();

        if (isOffline && options?.queueWhenOffline) {
            // Queue operation for later execution
            const operationId = await syncManager.queueData(
                'mutation',
                'create',
                { mutationFn: mutationFn.name, variables },
                {
                    priority: 50,
                    requiresAuth: true,
                    metadata: { type: 'offline_mutation' }
                }
            );

            // Optimistic update if provided
            if (options?.optimisticUpdate) {
                const optimisticData = options.optimisticUpdate(variables);
                setData(optimisticData as T);
            }

            return { queued: true, operationId };
        }

        setLoading(true);
        setError(null);

        let optimisticData: T | undefined;

        // Apply optimistic update
        if (options?.optimisticUpdate) {
            optimisticData = options.optimisticUpdate(variables) as T;
            setData(optimisticData);
        }

        try {
            const result = await mutationFn(variables);

            // If we had optimistic data, merge it with the real result
            const finalData = optimisticData
                ? { ...optimisticData, ...result } as T
                : result;

            setData(finalData);
            options?.onSuccess?.(finalData, variables);

            return finalData;
        } catch (err) {
            const error = err as Error;

            // Rollback optimistic update on error
            if (options?.rollbackOnError && optimisticData) {
                setData(null);
            }

            setError(error);
            options?.onError?.(error, variables);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [mutationFn, options]);

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
        isError: error !== null,
    };
}

/**
 * Hook for managing offline sync operations
 */
export function useOfflineSync() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [progress, setProgress] = useState(syncManager.getProgress());
    const [conflicts, setConflicts] = useState(syncManager.getConflicts());
    const [queueSize, setQueueSize] = useState(0);

    useEffect(() => {
        // Listen to sync progress
        const unsubscribeProgress = syncManager.addProgressListener('hook', (newProgress) => {
            setProgress(newProgress);
            setIsSyncing(newProgress.status === 'syncing');
        });

        // Listen to conflicts
        const unsubscribeConflicts = syncManager.addStatusListener('hook', (status) => {
            setConflicts(syncManager.getConflicts());
            setQueueSize(status.sync.queueSize);
        });

        return () => {
            unsubscribeProgress();
            unsubscribeConflicts();
        };
    }, []);

    const triggerSync = useCallback(async () => {
        setIsSyncing(true);
        try {
            const result = await syncManager.triggerSync();
            return result;
        } finally {
            setIsSyncing(false);
        }
    }, []);

    const resolveConflict = useCallback(async (conflictId: string, resolution: any) => {
        await syncManager.resolveConflict(conflictId, resolution);
        setConflicts(syncManager.getConflicts());
    }, []);

    return {
        isSyncing,
        progress,
        conflicts,
        queueSize,
        triggerSync,
        resolveConflict,
        serviceStatus: syncManager.getServiceStatus(),
    };
}

/**
 * Hook for offline storage management
 */
export function useOfflineStorage() {
    const [cacheSize, setCacheSize] = useState(0);
    const [queuedOperations, setQueuedOperations] = useState(0);

    useEffect(() => {
        const updateStorageInfo = () => {
            setCacheSize(offlineStateManager.getCacheSize());
            setQueuedOperations(offlineStateManager.getQueueSize());
        };

        // Update immediately
        updateStorageInfo();

        // Listen for changes
        const unsubscribe = offlineStateManager.addListener('storage_hook', updateStorageInfo);

        return unsubscribe;
    }, []);

    const clearCache = useCallback(async (pattern?: string) => {
        const cleared = await offlineStateManager.clearCache(pattern);
        setCacheSize(offlineStateManager.getCacheSize());
        return cleared;
    }, []);

    const getStorageInfo = useCallback(() => {
        return {
            cacheSize,
            queuedOperations,
            isOffline: offlineStateManager.isOffline(),
            storageLimit: 50 * 1024 * 1024, // 50MB
            usagePercentage: (cacheSize / (50 * 1024 * 1024)) * 100,
        };
    }, [cacheSize, queuedOperations]);

    return {
        cacheSize,
        queuedOperations,
        clearCache,
        getStorageInfo,
        isOffline: offlineStateManager.isOffline(),
    };
}

export default useOfflineData;