# Offline State Handling and Network Condition Management Guide

## Overview

This comprehensive guide covers the offline state handling and network condition management system for iOS simulator applications. The system provides robust offline support, intelligent sync mechanisms, and seamless user experience across all network conditions.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Components](#core-components)
3. [Quick Start](#quick-start)
4. [Network Connectivity](#network-connectivity)
5. [Offline State Management](#offline-state-management)
6. [Data Synchronization](#data-synchronization)
7. [UI Components](#ui-components)
8. [React Hooks](#react-hooks)
9. [Testing](#testing)
10. [Best Practices](#best-practices)
11. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ React Hooks  │  │ UI Components│  │  App Logic   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Offline Services                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Network     │  │   Offline    │  │     Sync     │  │
│  │ Connectivity │  │    State     │  │    Engine    │  │
│  │   Service    │  │   Manager    │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Storage Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ AsyncStorage │  │    Cache     │  │    Queue     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Key Features

- ✅ Real-time network connectivity monitoring
- ✅ Automatic offline detection and handling
- ✅ Intelligent data caching and queue management
- ✅ Background sync with conflict resolution
- ✅ Network quality adaptation
- ✅ Offline-first data fetching
- ✅ User-friendly UI components
- ✅ Comprehensive testing utilities

---

## Core Components

### 1. Network Connectivity Service

Monitors network state and provides real-time updates.

**Location:** [`app/services/offline/NetworkConnectivityService.ts`](../services/offline/NetworkConnectivityService.ts)

**Key Features:**
- Real-time connectivity detection
- Network quality assessment
- Connection validation
- State history tracking

### 2. Offline State Manager

Manages offline mode, data caching, and operation queuing.

**Location:** [`app/services/offline/OfflineStateManager.ts`](../services/offline/OfflineStateManager.ts)

**Key Features:**
- Offline mode activation/deactivation
- Operation queue management
- Data caching with expiration
- State persistence

### 3. Offline Sync Engine

Handles data synchronization and conflict resolution.

**Location:** [`app/services/offline/OfflineSyncEngine.ts`](../services/offline/OfflineSyncEngine.ts)

**Key Features:**
- Background synchronization
- Conflict detection and resolution
- Sync progress tracking
- Automatic retry mechanisms

---

## Quick Start

### Installation

The offline system is already integrated into your project. No additional installation required.

### Basic Usage

```typescript
import { useOffline } from '@/hooks/useOffline';

function MyComponent() {
  const {
    isOffline,
    isOnline,
    networkQuality,
    queueOperation,
    cacheData,
    getCachedData
  } = useOffline();

  // Check if offline
  if (isOffline) {
    return <Text>You're offline</Text>;
  }

  // Use cached data
  const cachedData = getCachedData('my_data');

  return <Text>Online with {networkQuality} connection</Text>;
}
```

### With UI Components

```typescript
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { SyncStatusIndicator } from '@/components/offline/SyncStatusIndicator';

function App() {
  return (
    <View>
      <OfflineBanner showOnPoorConnection onRetry={() => console.log('Retry')} />
      <SyncStatusIndicator showProgress />
      {/* Your app content */}
    </View>
  );
}
```

---

## Network Connectivity

### Monitoring Network State

```typescript
import { useNetworkState } from '@/hooks/useOffline';

function NetworkMonitor() {
  const {
    networkState,
    isOnline,
    networkType,
    networkQuality,
    refreshState,
    validateConnection
  } = useNetworkState();

  const handleRefresh = async () => {
    const newState = await refreshState();
    console.log('Network state:', newState);
  };

  const handleValidate = async () => {
    const validation = await validateConnection();
    console.log('Connection valid:', validation.isValid);
    console.log('Latency:', validation.latency);
  };

  return (
    <View>
      <Text>Status: {networkState?.status}</Text>
      <Text>Type: {networkType}</Text>
      <Text>Quality: {networkQuality}</Text>
      <Button title="Refresh" onPress={handleRefresh} />
      <Button title="Validate" onPress={handleValidate} />
    </View>
  );
}
```

### Network Quality Levels

- **EXCELLENT**: >10 Mbps, ideal for all operations
- **GOOD**: 5-10 Mbps, suitable for most operations
- **FAIR**: 1-5 Mbps, may experience delays
- **POOR**: <1 Mbps, limited functionality
- **OFFLINE**: No connection

### Listening to Network Changes

```typescript
import { networkConnectivityService } from '@/services/offline/NetworkConnectivityService';

// Add listener
const listenerId = 'my_listener';
networkConnectivityService.addListener(
  listenerId,
  (state) => {
    console.log('Network changed:', state);
  },
  100 // Priority (higher = called first)
);

// Remove listener when done
networkConnectivityService.removeListener(listenerId);
```

---

## Offline State Management

### Activating Offline Mode

```typescript
import { useOfflineState } from '@/hooks/useOffline';

function OfflineControls() {
  const {
    isOffline,
    mode,
    setMode,
    activateOfflineMode,
    deactivateOfflineMode
  } = useOfflineState();

  return (
    <View>
      <Text>Offline: {isOffline ? 'Yes' : 'No'}</Text>
      <Text>Mode: {mode}</Text>
      
      <Button
        title="Go Offline"
        onPress={activateOfflineMode}
      />
      
      <Button
        title="Go Online"
        onPress={deactivateOfflineMode}
      />
      
      <Button
        title="Auto Mode"
        onPress={() => setMode(OfflineMode.AUTO)}
      />
    </View>
  );
}
```

### Queuing Operations

```typescript
import { useOfflineState } from '@/hooks/useOffline';

function DataForm() {
  const { queueOperation, isOffline } = useOfflineState();

  const handleSubmit = async (data: any) => {
    if (isOffline) {
      // Queue for later execution
      const operationId = await queueOperation({
        type: 'create_record',
        payload: data,
        priority: 80,
        maxRetries: 3,
        requiresAuth: true,
        metadata: { source: 'form' }
      });
      
      console.log('Operation queued:', operationId);
    } else {
      // Execute immediately
      await submitData(data);
    }
  };

  return <Form onSubmit={handleSubmit} />;
}
```

### Caching Data

```typescript
import { useOfflineState } from '@/hooks/useOffline';

function DataManager() {
  const { cacheData, getCachedData, clearCache } = useOfflineState();

  const saveToCache = async (key: string, data: any) => {
    await cacheData(
      key,
      data,
      3600000 // Expires in 1 hour
    );
  };

  const loadFromCache = (key: string) => {
    const data = getCachedData(key);
    return data;
  };

  const clearAllCache = async () => {
    const cleared = await clearCache();
    console.log(`Cleared ${cleared} cache entries`);
  };

  return (
    <View>
      <Button title="Save" onPress={() => saveToCache('key', { data: 'value' })} />
      <Button title="Load" onPress={() => console.log(loadFromCache('key'))} />
      <Button title="Clear" onPress={clearAllCache} />
    </View>
  );
}
```

---

## Data Synchronization

### Basic Sync Operations

```typescript
import { useSync } from '@/hooks/useOffline';

function SyncManager() {
  const {
    syncProgress,
    syncStatus,
    conflicts,
    isSyncing,
    triggerSync,
    addToSyncQueue
  } = useSync();

  const handleSync = async () => {
    try {
      const progress = await triggerSync();
      console.log('Sync completed:', progress);
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const queueDataSync = async (data: any) => {
    const operationId = await addToSyncQueue({
      type: 'update',
      resource: 'users',
      localData: data,
      priority: 70,
      conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS,
      metadata: {}
    });
    
    return operationId;
  };

  return (
    <View>
      <Text>Status: {syncStatus}</Text>
      <Text>Progress: {syncProgress.percentage}%</Text>
      <Text>Conflicts: {conflicts.length}</Text>
      
      <Button
        title="Sync Now"
        onPress={handleSync}
        disabled={isSyncing}
      />
    </View>
  );
}
```

### Conflict Resolution

```typescript
import { useSync } from '@/hooks/useOffline';
import { ConflictResolutionStrategy } from '@/services/offline/OfflineSyncEngine';

function ConflictResolver() {
  const { conflicts, resolveConflict } = useSync();

  const handleResolve = async (conflictId: string, useLocal: boolean) => {
    const conflict = conflicts.find(c => c.id === conflictId);
    if (!conflict) return;

    const resolution = useLocal 
      ? conflict.localVersion 
      : conflict.serverVersion;

    const success = await resolveConflict(conflictId, resolution);
    console.log('Conflict resolved:', success);
  };

  return (
    <View>
      {conflicts.map(conflict => (
        <View key={conflict.id}>
          <Text>Conflict in: {conflict.resource}</Text>
          <Button
            title="Use Local"
            onPress={() => handleResolve(conflict.id, true)}
          />
          <Button
            title="Use Server"
            onPress={() => handleResolve(conflict.id, false)}
          />
        </View>
      ))}
    </View>
  );
}
```

### Automatic Sync Configuration

```typescript
import { offlineSyncEngine } from '@/services/offline/OfflineSyncEngine';

// Configure sync behavior
await offlineSyncEngine.updateConfig({
  enabled: true,
  autoSync: true,
  syncInterval: 60000, // Sync every minute
  batchSize: 10,
  retryAttempts: 3,
  conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS
});
```

---

## UI Components

### Offline Banner

Displays a banner when offline or on poor connection.

```typescript
import { OfflineBanner } from '@/components/offline/OfflineBanner';

<OfflineBanner
  showOnPoorConnection={true}
  onRetry={() => console.log('Retrying')}
  customMessage="Custom offline message"
  style={{ marginTop: 20 }}
/>
```

**Props:**
- `showOnPoorConnection?: boolean` - Show banner on poor connection
- `onRetry?: () => void` - Callback for retry button
- `customMessage?: string` - Custom message to display
- `style?: any` - Custom styles

### Sync Status Indicator

Shows sync status and progress.

```typescript
import { SyncStatusIndicator } from '@/components/offline/SyncStatusIndicator';

<SyncStatusIndicator
  onSync={() => console.log('Synced')}
  showProgress={true}
  compact={false}
  style={{ margin: 16 }}
/>
```

**Props:**
- `onSync?: () => void` - Callback after sync completes
- `showProgress?: boolean` - Show progress bar
- `compact?: boolean` - Compact mode (icon only)
- `style?: any` - Custom styles

---

## React Hooks

### useOffline

Combined hook for complete offline functionality.

```typescript
const {
  // Network state
  isOnline,
  isInternetReachable,
  networkType,
  networkQuality,
  networkStatus,
  
  // Offline state
  isOffline,
  mode,
  queuedOperationsCount,
  
  // Sync state
  syncProgress,
  syncStatus,
  conflicts,
  
  // Actions
  refreshState,
  validateConnection,
  queueOperation,
  cacheData,
  getCachedData,
  triggerSync,
  
  // Helpers
  canSync,
  shouldShowOfflineBanner,
  networkQualityGood
} = useOffline();
```

### useOfflineData

Offline-first data fetching with automatic caching.

```typescript
const {
  data,
  loading,
  error,
  mutate,
  refetch,
  isStale
} = useOfflineData(
  'user_data',
  async () => {
    const response = await fetch('/api/user');
    return response.json();
  },
  {
    cacheTime: 3600000, // 1 hour
    revalidateOnMount: true,
    revalidateOnFocus: true
  }
);
```

### useOfflineMutation

Offline-aware mutations with automatic queuing.

```typescript
const {
  mutate,
  data,
  loading,
  error,
  reset,
  isSuccess,
  isError
} = useOfflineMutation(
  async (variables) => {
    const response = await fetch('/api/update', {
      method: 'POST',
      body: JSON.stringify(variables)
    });
    return response.json();
  },
  {
    onSuccess: (data, variables) => {
      console.log('Success:', data);
    },
    onError: (error, variables) => {
      console.error('Error:', error);
    },
    queueWhenOffline: true
  }
);

// Use the mutation
await mutate({ id: 1, name: 'Updated' });
```

---

## Testing

### Using Test Utilities

```typescript
import { OfflineTestUtils } from '@/services/offline/__tests__/OfflineTestUtils';

// Simulate network conditions
const simulator = new OfflineTestUtils.NetworkSimulator();
await simulator.simulateOffline();
await simulator.simulateOnline();
await simulator.simulateIntermittent();

// Run test scenarios
const result = await OfflineTestUtils.OfflineTestScenarios.testOfflineFirstFlow();
console.log('Test result:', result);

// Measure performance
const perf = await OfflineTestUtils.OfflinePerformanceTest.measureCachePerformance(100);
console.log('Cache performance:', perf);
```

### Test Scenarios

```typescript
// Test offline-first flow
const offlineTest = await OfflineTestUtils.OfflineTestScenarios.testOfflineFirstFlow();

// Test conflict resolution
const conflictTest = await OfflineTestUtils.OfflineTestScenarios.testConflictResolution();

// Test network recovery
const recoveryTest = await OfflineTestUtils.OfflineTestScenarios.testNetworkRecovery();
```

---

## Best Practices

### 1. Always Use Hooks

```typescript
// ✅ Good
const { isOffline, cacheData } = useOffline();

// ❌ Bad
import { offlineStateManager } from '@/services/offline/OfflineStateManager';
offlineStateManager.isOffline(); // Direct service access
```

### 2. Handle Offline States Gracefully

```typescript
// ✅ Good
if (isOffline) {
  await queueOperation(data);
  showMessage('Saved. Will sync when online.');
} else {
  await submitData(data);
}

// ❌ Bad
await submitData(data); // Will fail when offline
```

### 3. Cache Strategically

```typescript
// ✅ Good - Cache with expiration
await cacheData('user', userData, 3600000); // 1 hour

// ❌ Bad - Cache without expiration
await cacheData('user', userData); // Never expires
```

### 4. Prioritize Operations

```typescript
// ✅ Good - Use priorities
await queueOperation({
  type: 'payment',
  payload: data,
  priority: 100, // High priority
  maxRetries: 5
});

// ❌ Bad - No priority
await queueOperation({
  type: 'payment',
  payload: data,
  priority: 50 // Default priority
});
```

### 5. Handle Conflicts Appropriately

```typescript
// ✅ Good - Choose appropriate strategy
conflictStrategy: ConflictResolutionStrategy.LAST_WRITE_WINS

// Consider these strategies:
// - CLIENT_WINS: Trust local data
// - SERVER_WINS: Trust server data
// - LAST_WRITE_WINS: Use timestamp
// - MERGE: Combine both
// - MANUAL: Let user decide
```

---

## Troubleshooting

### Common Issues

#### 1. Sync Not Triggering

**Problem:** Operations not syncing when back online.

**Solution:**
```typescript
// Check auto-sync is enabled
await offlineSyncEngine.updateConfig({
  autoSync: true,
  syncInterval: 60000
});

// Manually trigger sync
await triggerSync();
```

#### 2. Cache Not Working

**Problem:** Cached data not being retrieved.

**Solution:**
```typescript
// Check cache expiration
const data = getCachedData('key');
if (!data) {
  // Cache expired or doesn't exist
  await cacheData('key', newData, 3600000);
}
```

#### 3. High Memory Usage

**Problem:** Too much cached data.

**Solution:**
```typescript
// Clear old cache
await clearCache('old_*');

// Configure cache limits
await offlineStateManager.updateConfig({
  maxCacheSize: 50 * 1024 * 1024 // 50MB
});
```

#### 4. Conflicts Not Resolving

**Problem:** Conflicts remain unresolved.

**Solution:**
```typescript
// Check conflict strategy
const conflicts = getConflicts();
for (const conflict of conflicts) {
  if (conflict.strategy === ConflictResolutionStrategy.MANUAL) {
    // Resolve manually
    await resolveConflict(conflict.id, resolution);
  }
}
```

### Debug Mode

Enable detailed logging:

```typescript
import { crossPlatformErrorLogger } from '@/services/CrossPlatformErrorLogger';

// Add breadcrumbs for tracking
crossPlatformErrorLogger.addBreadcrumb(
  'Offline operation',
  'offline',
  'info',
  { operationId, data }
);
```

---

## Integration with Existing Systems

### Error Handling Integration

The offline system integrates seamlessly with the existing error handling:

```typescript
import { crossPlatformErrorLogger } from '@/services/CrossPlatformErrorLogger';

// Errors are automatically logged
try {
  await triggerSync();
} catch (error) {
  // Error is logged by the offline system
  crossPlatformErrorLogger.logError(error);
}
```

### Retry System Integration

Works with the existing retry mechanisms:

```typescript
import { retryRecoveryService } from '@/services/retry/RetryRecoveryService';

// Offline operations use retry system
const result = await retryRecoveryService.executeWithRetryAndRecovery(
  operation,
  context
);
```

---

## Performance Optimization

### Cache Management

```typescript
// Limit cache size
maxCacheSize: 50 * 1024 * 1024, // 50MB

// Set appropriate expiration
cacheTime: 24 * 60 * 60 * 1000, // 24 hours

// Clear old cache periodically
setInterval(() => {
  clearCache('old_*');
}, 3600000); // Every hour
```

### Sync Optimization

```typescript
// Batch operations
batchSize: 10,

// Limit retries
retryAttempts: 3,

// Adjust sync interval based on network
syncInterval: networkQuality === 'poor' ? 300000 : 60000
```

---

## Conclusion

This offline state handling system provides a robust, user-friendly solution for managing offline scenarios in your iOS simulator application. By following this guide and best practices, you can ensure excellent user experience across all network conditions.

For additional support or questions, refer to the source code documentation and TypeScript interfaces for detailed method signatures and options.

---

**Last Updated:** 2025-11-21  
**Version:** 1.0.0