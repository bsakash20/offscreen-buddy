/**
 * TypeScript Interface Definitions for Fake Call Notification System
 * Extends existing notification infrastructure for Pro tier fake call features
 */

import { Platform } from 'react-native';
import {
    NotificationType,
    NotificationCategory,
    NotificationPriority,
    NotificationAction,
    NotificationData,
    PlatformNotificationData
} from '../notifications/types';

// ===========================================
// CORE FAKE CALL TYPES
// ===========================================

// Main fake call types extending notification system
export enum FakeCallType {
    INCOMING = 'incoming',
    OUTGOING = 'outgoing',
    SCHEDULED = 'scheduled',
    EMERGENCY = 'emergency'
}

// Call states for lifecycle management
export enum CallState {
    SCHEDULED = 'scheduled',
    INCOMING = 'incoming',
    ACTIVE = 'active',
    CONNECTED = 'connected',
    PAUSED = 'paused',
    ENDED = 'ended',
    DISMISSED = 'dismissed',
    FAILED = 'failed'
}

// User interaction types during calls
export enum CallAction {
    ANSWER = 'answer',
    DECLINE = 'decline',
    END = 'end',
    MUTE = 'mute',
    UNMUTE = 'unmute',
    SPEAKER = 'speaker',
    PAUSE = 'pause',
    RESUME = 'resume'
}

// Call priorities for scheduling
export enum CallPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent'
}

// ===========================================
// CORE DATA STRUCTURES
// ===========================================

// Caller information with safety validation
export interface CallerInfo {
    id: string;
    name: string;
    phoneNumber: string; // Always safe/generated, never real
    avatarUrl?: string;
    callerType: 'safe' | 'emergency' | 'business' | 'personal';
    location?: string;
    riskLevel: 'low' | 'medium' | 'high';
    isVerified: boolean;
    displayName: string; // What user sees
}

// Voice profile for synthesis
export interface VoiceProfile {
    id: string;
    name: string;
    language: string;
    region: string;
    gender: 'male' | 'female' | 'neutral';
    ageRange: 'young' | 'adult' | 'mature';
    accent: string;
    personality: 'professional' | 'casual' | 'friendly' | 'formal';
    quality: 'premium' | 'standard' | 'basic';
    sampleText: string;
    isAvailable: boolean;
    fileSize: number; // bytes
}

// Call configuration from user
export interface FakeCallConfig {
    callerInfo: CallerInfo;
    voiceProfileId: string;
    callType: FakeCallType;
    priority: CallPriority;
    autoAnswer: boolean;
    callDuration: number; // seconds
    audioMessage?: string; // Text for voice synthesis
    customRingtone?: string;
    vibratePattern?: number[];
    backgroundImage?: string;
    emergencyOverride: boolean; // Allow emergency scenarios
}

// Call scheduling configuration
export interface CallSchedule {
    id: string;
    userId: string;
    config: FakeCallConfig;
    scheduledFor: Date;
    timezone: string;
    recurring?: RecurringPattern;
    smartScheduling: {
        enabled: boolean;
        skipDuringFocus: boolean;
        skipDuringMeetings: boolean;
        respectDoNotDisturb: boolean;
        contextAware: boolean;
    };
    notification: {
        advanceWarning: number; // minutes before call
        reminderEnabled: boolean;
        reminderMessage: string;
    };
}

// Recurring call pattern
export interface RecurringPattern {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    interval: number; // every N units
    daysOfWeek?: number[]; // 0-6 for weekly
    endDate?: Date;
    maxOccurrences?: number;
    skipHolidays: boolean;
}

// ===========================================
// CALL STATE MANAGEMENT
// ===========================================

// Complete call state object
export interface CallStateData {
    callId: string;
    userId: string;
    config: FakeCallConfig;
    state: CallState;
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    interactionHistory: CallInteraction[];
    audioData?: AudioBufferInfo;
    error?: CallError;
    metadata: {
        platform: Platform;
        appVersion: string;
        deviceInfo: DeviceInfo;
        sessionId: string;
    };
}

// User interaction tracking
export interface CallInteraction {
    timestamp: Date;
    action: CallAction;
    userAgent: 'auto' | 'user' | 'system';
    duration?: number; // For pause/resume actions
    details?: Record<string, any>;
}

// Audio buffer information
export interface AudioBufferInfo {
    format: 'mp3' | 'wav' | 'aac';
    sampleRate: number;
    channels: number;
    bitRate: number;
    duration: number;
    size: number; // bytes
    voiceProfileId: string;
    quality: 'low' | 'medium' | 'high';
}

// Device information for platform-specific handling
export interface DeviceInfo {
    platform: Platform;
    osVersion: string;
    deviceModel: string;
    hasCallKit: boolean; // iOS
    hasInCallService: boolean; // Android
    audioSessionAvailable: boolean;
    notificationCapabilities: NotificationCapabilities;
}

// Notification capabilities
export interface NotificationCapabilities {
    canSchedule: boolean;
    canBadge: boolean;
    canSound: boolean;
    canVibrate: boolean;
    canCriticalAlerts: boolean; // iOS
    canFullScreenIntent: boolean; // Android
}

// ===========================================
// ERROR HANDLING
// ===========================================

// Call-specific error types
export enum CallErrorType {
    PLATFORM_UNSUPPORTED = 'PLATFORM_UNSUPPORTED',
    CALLKIT_NOT_AVAILABLE = 'CALLKIT_NOT_AVAILABLE',
    AUDIO_SESSION_ERROR = 'AUDIO_SESSION_ERROR',
    VOICE_SYNTHESIS_FAILED = 'VOICE_SYNTHESIS_FAILED',
    AUDIO_PLAYBACK_ERROR = 'AUDIO_PLAYBACK_ERROR',
    VOICE_PROFILE_MISSING = 'VOICE_PROFILE_MISSING',
    PRO_TIER_REQUIRED = 'PRO_TIER_REQUIRED',
    SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
    ACCESS_DENIED = 'ACCESS_DENIED',
    INVALID_CALLER_ID = 'INVALID_CALLER_ID',
    RESOURCE_EXHAUSTED = 'RESOURCE_EXHAUSTED',
    TIMEOUT_ERROR = 'TIMEOUT_ERROR',
    NETWORK_ERROR = 'NETWORK_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Call error with recovery information
export interface CallError {
    type: CallErrorType;
    code: string;
    message: string;
    details?: Record<string, any>;
    recoverable: boolean;
    suggestedAction: string;
    technicalDetails?: Record<string, any>;
    timestamp: Date;
    callId: string;
    userId: string;
}

// ===========================================
// SERVICE INTERFACES
// ===========================================

// Platform call interface
export interface PlatformCallInterface {
    // Initialization
    initialize(): Promise<boolean>;
    isSupported(): boolean;
    getCapabilities(): PlatformCapabilities;

    // Call lifecycle
    displayIncomingCall(callInfo: CallerInfo): Promise<boolean>;
    dismissCallInterface(): Promise<void>;
    updateCallState(state: CallState): Promise<void>;

    // Audio management
    configureAudioSession(config: AudioSessionConfig): Promise<void>;
    startAudioPlayback(audioData: AudioBufferInfo): Promise<void>;
    stopAudioPlayback(): Promise<void>;
    setAudioVolume(volume: number): Promise<void>;

    // Platform-specific features
    getPlatformFeatures(): string[];
    handlePlatformError(error: any): Promise<void>;
}

// Platform capabilities
export interface PlatformCapabilities {
    canUseNativeCallUI: boolean;
    canUseCallKit: boolean; // iOS
    canSimulatePhoneCall: boolean; // Android
    canFullScreenCall: boolean;
    canBackgroundAudio: boolean;
    canHapticFeedback: boolean;
    supportedAudioFormats: string[];
    maxCallDuration: number; // seconds
}

// Audio session configuration
export interface AudioSessionConfig {
    category: 'ambient' | 'solo' | 'playback' | 'record' | 'multiRoute';
    mode: 'default' | 'gameChat' | 'moviePlayback' | 'measurement' | 'spokenAudio';
    options: string[]; // AudioSession options
    sampleRate: number;
    channels: number;
    bufferSize: number;
}

// Voice synthesis service interface
export interface VoiceSynthesisService {
    // Voice management
    getAvailableVoices(): Promise<VoiceProfile[]>;
    loadVoiceProfile(voiceId: string): Promise<boolean>;
    preloadVoices(voiceIds: string[]): Promise<boolean>;

    // Synthesis
    synthesizeSpeech(text: string, voiceId: string): Promise<AudioBufferInfo>;
    synthesizeCallMessage(message: CallMessage): Promise<AudioBufferInfo>;

    // Voice quality
    getVoiceQuality(voiceId: string): Promise<VoiceQuality>;
    setSynthesisRate(rate: number): Promise<void>;
    setSynthesisPitch(pitch: number): Promise<void>;
}

// Voice quality metrics
export interface VoiceQuality {
    latency: number; // ms
    quality: 'low' | 'medium' | 'high';
    naturalness: number; // 0-1 scale
    intelligibility: number; // 0-1 scale
    fileSize: number;
}

// Call message for synthesis
export interface CallMessage {
    type: 'greeting' | 'script' | 'custom';
    text: string;
    language: string;
    voiceId: string;
    emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | 'excited';
    speed: 'slow' | 'normal' | 'fast';
    emphasis?: {
        word: string;
        level: 'low' | 'medium' | 'high';
    }[];
}

// ===========================================
// SECURITY AND PRO TIER
// ===========================================

// Pro tier validation
export interface ProTierSecurity {
    validateProTierAccess(userId: string): Promise<boolean>;
    getSubscriptionStatus(userId: string): Promise<SubscriptionStatus>;
    logFeatureUsage(userId: string, feature: string, metadata?: Record<string, any>): Promise<void>;
    checkFeatureLimit(userId: string, feature: string): Promise<FeatureLimitStatus>;
}

// Subscription status
export interface SubscriptionStatus {
    isActive: boolean;
    tier: 'free' | 'pro' | 'enterprise';
    expiresAt?: Date;
    autoRenew: boolean;
    paymentMethod: string;
    trialUsed: boolean;
    gracePeriod?: Date;
}

// Feature limit status
export interface FeatureLimitStatus {
    allowed: boolean;
    currentUsage: number;
    limit: number;
    resetAt: Date;
    overageAllowed: boolean;
}

// Caller ID safety validation
export interface CallerIDSafety {
    validateCallerID(callerInfo: CallerInfo): SafetyValidation;
    generateSafeCallerID(): Promise<CallerInfo>;
    getSafeNameDatabase(): SafeNameDatabase;
    validatePhoneNumber(number: string): PhoneNumberValidation;
}

// Safety validation result
export interface SafetyValidation {
    isSafe: boolean;
    riskLevel: 'low' | 'medium' | 'high';
    reasons: string[];
    suggestions: string[];
    needsReview: boolean;
}

// Safe name database
export interface SafeNameDatabase {
    firstNames: {
        male: string[];
        female: string[];
        neutral: string[];
    };
    lastNames: string[];
    businessNames: string[];
    emergencyContacts: {
        service: string;
        number: string;
        description: string;
    }[];
    blockedPatterns: string[];
    suspiciousPatterns: string[];
}

// Phone number validation
export interface PhoneNumberValidation {
    isValid: boolean;
    isSafe: boolean;
    format: 'international' | 'national' | 'local';
    region: string;
    isEmergency: boolean;
    isTollFree: boolean;
    riskFlags: string[];
}

// ===========================================
// USER PREFERENCES AND SETTINGS
// ===========================================

// Fake call user preferences
export interface FakeCallPreferences {
    userId: string;

    // General settings
    enabled: boolean;
    autoAnswer: boolean;
    defaultCallDuration: number;
    priority: CallPriority;

    // Voice settings
    defaultVoiceProfile?: string;
    voiceSpeed: 'slow' | 'normal' | 'fast';
    voiceVolume: number;
    audioQuality: 'low' | 'medium' | 'high';

    // Caller ID settings
    preferredCallerTypes: CallerType[];
    allowBusinessCalls: boolean;
    allowEmergencyCalls: boolean;
    useRealisticNumbers: boolean;

    // Schedule settings
    smartScheduling: {
        enabled: boolean;
        respectFocusMode: boolean;
        respectMeetings: boolean;
        respectDoNotDisturb: boolean;
    };

    // Notification preferences
    advanceWarning: number; // minutes
    reminderEnabled: boolean;
    soundEnabled: boolean;
    hapticEnabled: boolean;

    // Accessibility
    accessibility: {
        screenReaderEnabled: boolean;
        highContrast: boolean;
        largeText: boolean;
        voiceControl: boolean;
        simplifiedInterface: boolean;
    };

    // Privacy
    privacy: {
        logCallHistory: boolean;
        shareAnalytics: boolean;
        enableEmergencyOverride: boolean;
    };

    updatedAt: Date;
}

// Caller type preferences
export type CallerType = 'safe' | 'emergency' | 'business' | 'personal';

// ===========================================
// NOTIFICATION INTEGRATION
// ===========================================

// Extended notification types for fake calls
export enum FakeCallNotificationType {
    CALL_SCHEDULED = 'call_scheduled',
    CALL_INCOMING = 'call_incoming',
    CALL_ANSWERED = 'call_answered',
    CALL_ENDED = 'call_ended',
    CALL_MISSED = 'call_missed',
    CALL_REMINDER = 'call_reminder',
    CALL_ERROR = 'call_error',
    PRO_TIER_REQUIRED = 'pro_tier_required'
}

// Enhanced notification data for fake calls
export interface FakeCallNotificationData extends NotificationData {
    type: FakeCallNotificationType;
    callId: string;
    callerInfo: CallerInfo;
    callConfig: FakeCallConfig;
    scheduledTime?: Date;
    estimatedDuration?: number;
    priority: CallPriority;
    actions: FakeCallNotificationAction[];
    category: NotificationCategory.CUSTOM; // Always custom for fake calls
}

// Enhanced notification actions for fake calls
export enum FakeCallNotificationAction {
    ANSWER_CALL = 'answer_call',
    DECLINE_CALL = 'decline_call',
    SCHEDULE_CALL = 'schedule_call',
    EDIT_CALL_CONFIG = 'edit_call_config',
    VIEW_CALL_HISTORY = 'view_call_history',
    UPGRADE_TO_PRO = 'upgrade_to_pro',
    TEST_CALL_FEATURE = 'test_call_feature'
}

// ===========================================
// ANALYTICS AND TRACKING
// ===========================================

// Call analytics for Pro tier insights
export interface CallAnalytics {
    callId: string;
    userId: string;

    // Call metrics
    callType: FakeCallType;
    state: CallState;
    duration: number;
    interactions: CallInteraction[];

    // User engagement
    answerRate: number;
    averageCallDuration: number;
    mostUsedActions: CallAction[];

    // Voice synthesis
    voiceProfileId: string;
    synthesisLatency: number;
    audioQuality: 'low' | 'medium' | 'high';

    // Platform performance
    platform: Platform;
    callKitUsed: boolean;
    backgroundAudioUsed: boolean;
    hapticFeedbackUsed: boolean;

    // Timing
    scheduledAt: Date;
    startedAt?: Date;
    endedAt: Date;
    createdAt: Date;
}

// Call usage analytics for Pro tier
export interface CallUsageAnalytics {
    userId: string;
    period: 'daily' | 'weekly' | 'monthly';
    startDate: Date;
    endDate: Date;

    // Usage metrics
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;

    // Popular features
    mostUsedVoiceProfiles: string[];
    mostCommonCallerTypes: CallerType[];
    preferredCallTimes: string[];

    // Engagement
    answerRate: number;
    completionRate: number;
    userSatisfactionScore: number; // 1-5

    // Pro tier metrics
    featureAdoptionRate: number;
    subscriptionValue: number;
    churnRiskScore: number;
}

// ===========================================
// RESULT TYPES
// ===========================================

// Generic result type for fake call operations
export interface FakeCallResult<T = any> {
    success: boolean;
    data?: T;
    error?: CallError;
    metadata: {
        timestamp: Date;
        requestId: string;
        duration: number;
        platform: Platform;
    };
}

// Call scheduling result
export interface CallSchedulingResult extends FakeCallResult<string> {
    data?: {
        callId: string;
        scheduledTime: Date;
        notificationId?: string;
    };
}

// Call initialization result
export interface CallInitializationResult extends FakeCallResult<CallStateData> {
    data?: {
        call: CallStateData;
        platformSupport: PlatformCapabilities;
        audioConfig: AudioSessionConfig;
    };
}

// ===========================================
// UTILITY TYPES
// ===========================================

// API request/response types
export interface ApiRequest<T = any> {
    data: T;
    metadata: {
        userId: string;
        sessionId: string;
        timestamp: Date;
        source: 'app' | 'widget' | 'extension';
    };
}

export interface ApiResponse<T = any> extends FakeCallResult<T> {
    pagination?: {
        page: number;
        limit: number;
        total: number;
    };
}

// Configuration types
export interface FakeCallConfigFile {
    version: string;
    supportedPlatforms: Platform[];
    defaultSettings: FakeCallPreferences;
    voiceProfiles: VoiceProfile[];
    callerIDDatabase: SafeNameDatabase;
    safetyRules: {
        blockedPatterns: string[];
        emergencyNumbers: string[];
        maxCallDuration: number;
        maxDailyCalls: number;
    };
}

// Event types for reactive programming
export enum FakeCallEventType {
    CALL_STARTED = 'call_started',
    CALL_ANSWERED = 'call_answered',
    CALL_ENDED = 'call_ended',
    CALL_ERROR = 'call_error',
    VOICE_SYNTHESIS_COMPLETE = 'voice_synthesis_complete',
    PLATFORM_ERROR = 'platform_error',
    PRO_TIER_STATUS_CHANGED = 'pro_tier_status_changed'
}

export interface FakeCallEvent {
    type: FakeCallEventType;
    data: any;
    timestamp: Date;
    userId: string;
    callId?: string;
}
