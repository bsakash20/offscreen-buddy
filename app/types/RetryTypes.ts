/**
 * Comprehensive Retry and Recovery Types
 * Defines all type definitions for retry mechanisms and recovery workflows
 */

import { CrossPlatformAppError, CrossPlatformErrorCategory, ErrorSeverity } from './ErrorTypes';

// =============================================================================
// CORE RETRY TYPES
// =============================================================================

export enum RetryStrategy {
    EXPONENTIAL_BACKOFF = 'exponential_backoff',
    LINEAR_BACKOFF = 'linear_backoff',
    FIXED_DELAY = 'fixed_delay',
    IMMEDIATE = 'immediate',
    CUSTOM = 'custom'
}

export enum RetryCondition {
    ALWAYS = 'always',
    ON_ERROR = 'on_error',
    ON_TIMEOUT = 'on_timeout',
    ON_SPECIFIC_ERROR = 'on_specific_error',
    NEVER = 'never'
}

export enum RetryOutcome {
    SUCCESS = 'success',
    FAILURE = 'failure',
    TIMEOUT = 'timeout',
    CANCELLED = 'cancelled',
    MAX_ATTEMPTS_EXCEEDED = 'max_attempts_exceeded'
}

export interface RetryPolicy {
    id: string;
    name: string;
    strategy: RetryStrategy;
    maxAttempts: number;
    initialDelay: number; // milliseconds
    maxDelay: number; // milliseconds
    backoffMultiplier: number; // for exponential backoff
    jitter: boolean; // add randomness to delays
    timeoutPerAttempt: number; // timeout for each attempt
    condition: RetryCondition;
    specificErrors?: string[]; // error codes to retry on
    excludeErrors?: string[]; // error codes to exclude from retry
    circuitBreakerConfig?: CircuitBreakerConfig;
}

// =============================================================================
// CIRCUIT BREAKER TYPES
// =============================================================================

export interface CircuitBreakerConfig {
    enabled: boolean;
    failureThreshold: number; // number of failures to open circuit
    successThreshold: number; // number of successes to close circuit
    timeout: number; // milliseconds to wait before trying half-open state
    monitoringWindow: number; // time window for failure rate calculation
}

export enum CircuitBreakerState {
    CLOSED = 'closed', // normal operation
    OPEN = 'open', // blocking requests
    HALF_OPEN = 'half_open' // testing if service recovered
}

export interface CircuitBreakerStats {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    nextAttemptTime?: Date;
}

// =============================================================================
// RETRY ATTEMPT TYPES
// =============================================================================

export interface RetryAttempt {
    id: string;
    retryId: string;
    attemptNumber: number;
    startTime: Date;
    endTime?: Date;
    duration?: number;
    outcome: RetryOutcome;
    error?: CrossPlatformAppError;
    response?: any;
    metadata?: AttemptMetadata;
}

export interface AttemptMetadata {
    networkType?: string;
    deviceInfo?: any;
    userAgent?: string;
    requestSize?: number;
    responseSize?: number;
    serverResponseTime?: number;
    retryDelay?: number;
    additionalContext?: Record<string, any>;
}

// =============================================================================
// RETRY OPERATION TYPES
// =============================================================================

export interface RetryOperation {
    id: string;
    name: string;
    category: CrossPlatformErrorCategory;
    operation: () => Promise<any>;
    policy: RetryPolicy;
    context?: OperationContext;
    onSuccess?: (result: any, attempt: RetryAttempt) => void;
    onFailure?: (error: CrossPlatformAppError, attempt: RetryAttempt) => void;
    onRetry?: (error: CrossPlatformAppError, attempt: RetryAttempt) => void;
    abortSignal?: AbortSignal;
}

export interface OperationContext {
    userId?: string;
    sessionId: string;
    operationType: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    maxDuration?: number; // maximum total duration
    criticality: 'non_critical' | 'important' | 'critical';
    rollbackAction?: () => Promise<void>;
    backupData?: any;
    metadata?: Record<string, any>;
}

// =============================================================================
// RETRY QUEUE TYPES
// =============================================================================

export interface RetryQueueItem {
    id: string;
    operation: RetryOperation;
    priority: number;
    queuedAt: Date;
    scheduledAt?: Date;
    maxWaitTime?: number;
    dependencies?: string[]; // other operation IDs
    userInitiated: boolean;
    uiCallback?: (attempt: RetryAttempt) => void;
}

export interface RetryQueue {
    id: string;
    name: string;
    maxConcurrency: number;
    maxQueueSize: number;
    defaultPolicy: RetryPolicy;
    items: RetryQueueItem[];
    activeCount: number;
    paused: boolean;
    autoProcess: boolean;
}

// =============================================================================
// USER-INITIATED RETRY TYPES
// =============================================================================

export interface UserRetryAction {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    style: 'primary' | 'secondary' | 'destructive';
    requiresConfirmation?: boolean;
    confirmationMessage?: string;
    retryPolicy?: RetryPolicy;
    operationContext?: Partial<OperationContext>;
}

export interface UserRetryOptions {
    availableActions: UserRetryAction[];
    defaultAction?: string;
    autoRetryEnabled: boolean;
    showProgress: boolean;
    allowCancellation: boolean;
    maxUserRetries: number;
    contextPreservationEnabled: boolean;
}

// =============================================================================
// RECOVERY WORKFLOW TYPES
// =============================================================================

export enum RecoveryStepType {
    VALIDATION = 'validation',
    ACTION = 'action',
    CONDITION = 'condition',
    ROLLBACK = 'rollback',
    NOTIFICATION = 'notification',
    STATE_RESTORE = 'state_restore'
}

export enum RecoveryStepStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    SKIPPED = 'skipped',
    ROLLED_BACK = 'rolled_back'
}

export interface RecoveryStep {
    id: string;
    type: RecoveryStepType;
    name: string;
    description?: string;
    action: RecoveryAction;
    condition?: RecoveryCondition;
    rollbackAction?: RecoveryAction;
    timeout?: number;
    retryPolicy?: RetryPolicy;
    critical: boolean;
    parallel?: boolean; // can run in parallel with other steps
}

export interface RecoveryAction {
    id: string;
    name: string;
    description?: string;
    execute: () => Promise<RecoveryResult>;
    rollback?: () => Promise<void>;
    validate?: () => Promise<boolean>;
    timeout?: number;
}

export interface RecoveryResult {
    success: boolean;
    stepId: string;
    data?: any;
    error?: CrossPlatformAppError;
    executionTime: number;
    timestamp: Date;
}

export interface RecoveryCondition {
    type: 'error_category' | 'error_code' | 'custom_function' | 'time_based';
    value: any;
    operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than';
    customFunction?: (error: CrossPlatformAppError) => boolean;
}

// =============================================================================
// RECOVERY WORKFLOW TYPES
// =============================================================================

export interface RecoveryWorkflow {
    id: string;
    name: string;
    description?: string;
    triggerCondition: RecoveryCondition;
    steps: RecoveryStep[];
    parallelExecution: boolean;
    rollbackOnFailure: boolean;
    maxExecutionTime: number;
    enabled: boolean;
    priority: number;
    metadata?: Record<string, any>;
}

export interface RecoveryWorkflowExecution {
    id: string;
    workflowId: string;
    triggerError: CrossPlatformAppError;
    startTime: Date;
    endTime?: Date;
    status: 'running' | 'completed' | 'failed' | 'cancelled';
    currentStepIndex: number;
    stepResults: Map<string, RecoveryResult>;
    rollbackPerformed: boolean;
    finalResult?: RecoveryResult;
}

// =============================================================================
// CONTEXT PRESERVATION TYPES
// =============================================================================

export interface ContextBackup {
    id: string;
    operationId: string;
    timestamp: Date;
    data: BackupData;
    version: string;
    checksum: string;
}

export interface BackupData {
    formData?: Record<string, any>;
    navigationState?: NavigationState;
    authenticationState?: AuthenticationState;
    applicationState?: ApplicationState;
    transactionState?: TransactionState;
    userSession?: UserSessionState;
    customData?: Record<string, any>;
}

export interface NavigationState {
    currentRoute?: string;
    previousRoutes?: string[];
    routeParams?: Record<string, any>;
    navigationHistory?: any[];
    screenState?: Record<string, any>;
}

export interface AuthenticationState {
    user?: any;
    tokens?: Record<string, string>;
    sessionExpiry?: Date;
    permissions?: string[];
    mfaState?: any;
}

export interface ApplicationState {
    appVersion?: string;
    deviceInfo?: any;
    preferences?: Record<string, any>;
    cache?: Record<string, any>;
    temporaryData?: Record<string, any>;
}

export interface TransactionState {
    transactionId?: string;
    transactionData?: any;
    paymentMethod?: any;
    amount?: number;
    currency?: string;
    status?: string;
    metadata?: Record<string, any>;
}

export interface UserSessionState {
    sessionId: string;
    startTime: Date;
    lastActivity: Date;
    context: Record<string, any>;
}

// =============================================================================
// ERROR-SPECIFIC RECOVERY TYPES
// =============================================================================

export interface NetworkRecoveryStrategy {
    type: 'reconnect' | 'switch_network' | 'offline_mode' | 'queue_operations';
    maxRetries: number;
    retryDelays: number[];
    fallbackAction?: string;
    connectionCheck?: () => Promise<boolean>;
}

export interface AuthenticationRecoveryStrategy {
    type: 'token_refresh' | 're_authenticate' | 'bypass_mfa' | 'fallback_auth';
    maxRetries: number;
    tokenRefreshEndpoint?: string;
    fallbackCredentials?: any;
    sessionTimeoutHandling: 'refresh' | 'logout' | 'prompt';
}

export interface PaymentRecoveryStrategy {
    type: 'retry_transaction' | 'alternate_method' | 'defer_payment' | 'manual_review';
    maxRetries: number;
    retryDelays: number[];
    alternatePaymentMethods?: string[];
    transactionQueueing: boolean;
    idempotencyKey?: string;
}

export interface StorageRecoveryStrategy {
    type: 'cleanup' | 'compress' | 'migrate' | 'fallback_storage';
    maxRetries: number;
    cleanupActions?: string[];
    compressionRatio?: number;
    fallbackStorage?: string;
}

// =============================================================================
// INTEGRATION TYPES
// =============================================================================

export interface RetryAnalytics {
    operationId: string;
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    averageRetryDelay: number;
    totalTimeSpent: number;
    errorCategories: Record<string, number>;
    recoveryWorkflowsTriggered: number;
    userInitiatedRetries: number;
    contextPreservations: number;
}

export interface RetryMetrics {
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    averageAttempts: number;
    circuitBreakerStats: Record<string, CircuitBreakerStats>;
    queueStats: {
        averageWaitTime: number;
        maxQueueSize: number;
        currentQueueSize: number;
    };
    recoverySuccessRate: number;
    userSatisfactionScore: number;
}

// =============================================================================
// CONFIGURATION TYPES
// =============================================================================

export interface RetryConfiguration {
    enabled: boolean;
    globalMaxAttempts: number;
    globalTimeout: number;
    defaultPolicy: RetryPolicy;
    circuitBreaker: CircuitBreakerConfig;
    queueConfiguration: {
        maxConcurrency: number;
        maxQueueSize: number;
        processingInterval: number;
    };
    contextPreservation: {
        enabled: boolean;
        maxBackupSize: number;
        retentionPeriod: number;
        compressionEnabled: boolean;
    };
    analytics: {
        enabled: boolean;
        sampleRate: number;
        metricsInterval: number;
    };
    ui: {
        showRetryProgress: boolean;
        allowUserControl: boolean;
        maxUserRetries: number;
        contextPreservationUI: boolean;
    };
}

// Export convenience types
export type RetryableOperation = () => Promise<any>;
export type RecoveryOperation = () => Promise<RecoveryResult>;
export type RetryCallback = (attempt: RetryAttempt) => void;
export type RetryConditionFunction = (error: CrossPlatformAppError, context: OperationContext) => boolean;

export default {
    RetryStrategy,
    RetryCondition,
    RetryOutcome,
    CircuitBreakerState,
    RecoveryStepType,
    RecoveryStepStatus
};