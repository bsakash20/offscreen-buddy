/**
 * Comprehensive Notification System Types for OffScreen Buddy
 * Defines all notification-related interfaces and enums
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Type alias for push token
export type PushToken = string;

// Core notification types
export enum NotificationType {
    TIMER_START = 'timer_start',
    TIMER_COMPLETE = 'timer_complete',
    TIMER_PAUSE = 'timer_pause',
    TIMER_RESUME = 'timer_resume',
    FOCUS_REMINDER = 'focus_reminder',
    BREAK_REMINDER = 'break_reminder',
    MILESTONE_ACHIEVEMENT = 'milestone_achievement',
    STREAK_CELEBRATION = 'streak_celebration',
    DAILY_GOAL = 'daily_goal',
    USER_ROAST = 'user_roast',
    HABIT_REMINDER = 'habit_reminder',
    ACHIEVEMENT_UNLOCK = 'achievement_unlock',
    SMART_BREAK = 'smart_break',
    QUICK_REMINDER = 'quick_reminder',
    URGENT_ALERT = 'urgent_alert',
}

// Notification categories for user preferences
export enum NotificationCategory {
    TIMERS = 'timers',
    ACHIEVEMENTS = 'achievements',
    REMINDERS = 'reminders',
    MOTIVATIONAL = 'motivational',
    URGENT = 'urgent',
    CUSTOM = 'custom',
}

// Notification priority levels
export enum NotificationPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

// Notification action types
export enum NotificationAction {
    VIEW_TIMER = 'view_timer',
    START_SESSION = 'start_session',
    PAUSE_SESSION = 'pause_session',
    STOP_SESSION = 'stop_session',
    VIEW_MILESTONES = 'view_milestones',
    VIEW_SETTINGS = 'view_settings',
    DISMISS = 'dismiss',
    SNOOZE = 'snooze',
    COMPLETE_TASK = 'complete_task',
}

// Notification status
export enum NotificationStatus {
    SCHEDULED = 'scheduled',
    SENT = 'sent',
    DELIVERED = 'delivered',
    CLICKED = 'clicked',
    DISMISSED = 'dismissed',
    FAILED = 'failed',
}

// Core notification data structure
export interface NotificationData {
    id: string;
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    subtitle?: string;
    body?: string;
    data?: Record<string, any>;
    priority: NotificationPriority;
    scheduledFor?: Date;
    expiresAt?: Date;
    sound?: string;
    badge?: number;
    categoryIdentifier?: string;
    threadIdentifier?: string;
    targetScreen?: string;
    deepLink?: string;
    imageUrl?: string;
    actions?: NotificationAction[];
    silent?: boolean;
    vibrate?: boolean | number[];
    lights?: boolean;
    icon?: string;
    color?: string;
    timestamp?: number;
    userId: string;
    sessionId?: string;
    metadata?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

// Extended notification data with platform-specific content
export interface PlatformNotificationData extends NotificationData {
    // iOS specific
    ios?: {
        sound?: string;
        badge?: number;
        categoryIdentifier?: string;
        threadIdentifier?: string;
        interruptionLevel?: 'active' | 'time-sensitive' | 'passive';
    };

    // Android specific
    android?: {
        channelId?: string;
        smallIcon?: string;
        largeIcon?: string;
        priority?: number;
        visibility?: 'public' | 'private' | 'secret';
        ongoing?: boolean;
        autoCancel?: boolean;
    };

    // Web specific
    web?: {
        icon?: string;
        badge?: string;
        vibrate?: number[];
        requireInteraction?: boolean;
    };
}

// Notification preferences and user settings
export interface NotificationPreferences {
    userId: string;
    enabled: boolean;

    // Global settings
    doNotDisturb: {
        enabled: boolean;
        startTime: string; // HH:mm format
        endTime: string; // HH:mm format
        timezone: string;
        allowUrgent: boolean;
    };

    // Category-specific settings
    categories: {
        [key in NotificationCategory]?: CategoryPreferences;
    };

    // Platform-specific settings
    platform: {
        ios?: IOSNotificationSettings;
        android?: AndroidNotificationSettings;
        web?: WebNotificationSettings;
    };

    // Smart scheduling preferences
    smartScheduling: {
        enabled: boolean;
        adaptiveFrequency: boolean;
        skipDuringMeetings: boolean;
        skipDuringFocus: boolean;
        userActivityAware: boolean;
    };

    // Personalization
    personalization: {
        humorLevel: 'none' | 'light' | 'moderate' | 'heavy';
        messageTone: 'serious' | 'motivational' | 'humorous' | 'mixed';
        language: string;
        timezone: string;
    };

    updatedAt: Date;
}

// Category-specific preferences
export interface CategoryPreferences {
    enabled: boolean;
    priority: NotificationPriority;
    frequency: NotificationFrequency;
    quietHoursOverride: boolean;
    customSounds: boolean;
    vibrationPattern: boolean | number[];
}

// Notification frequency settings
export interface NotificationFrequency {
    type: 'immediate' | 'scheduled' | 'adaptive' | 'batch';
    interval?: number; // seconds between notifications
    maxPerDay?: number;
    cooldownPeriod?: number; // seconds
    smartBatching: boolean;
    batchSize?: number;
    batchInterval?: number; // seconds
}

// Platform-specific notification settings
export interface IOSNotificationSettings {
    sound: boolean;
    badge: boolean;
    alert: boolean;
    notificationCenter: boolean;
    lockScreen: boolean;
    carPlay: boolean;
    criticalAlerts: boolean;
    scheduledDelivery: boolean;
}

export interface AndroidNotificationSettings {
    sound: boolean;
    vibrate: boolean;
    lights: boolean;
    vibrationPattern: number[];
    importance: 'min' | 'low' | 'default' | 'high' | 'max';
    category: string;
    visibility: 'public' | 'private' | 'secret';
}

export interface WebNotificationSettings {
    sound: boolean;
    persistent: boolean;
    requireInteraction: boolean;
    silent: boolean;
}

// Smart notification scheduling
export interface SmartScheduleContext {
    userId: string;
    currentTime: Date;
    userActivity: {
        isFocused: boolean;
        isInMeeting: boolean;
        lastActivity: Date;
        sessionType?: string;
    };
    deviceState: {
        batteryLevel: number;
        isCharging: boolean;
        isLowPowerMode: boolean;
    };
    preferences: NotificationPreferences;
    notificationHistory: NotificationHistory[];
}

// Smart scheduling result
export interface ScheduleResult {
    scheduledTime: Date;
    priority: NotificationPriority;
    reason: string;
    shouldSend: boolean;
    alternativeTimes?: Date[];
}

// Notification analytics and tracking
export interface NotificationAnalytics {
    notificationId: string;
    userId: string;
    type: NotificationType;
    category: NotificationCategory;

    // Delivery tracking
    sentAt?: Date;
    deliveredAt?: Date;
    clickedAt?: Date;
    dismissedAt?: Date;
    failedAt?: Date;

    // Engagement metrics
    timeToClick?: number; // milliseconds
    timeToDismiss?: number; // milliseconds
    viewDuration?: number; // milliseconds
    actionsTaken?: NotificationAction[];

    // Context data
    context?: {
        sessionId?: string;
        timerId?: string;
        milestoneId?: string;
        screenSource?: string;
    };

    // Device and platform info
    platform: string;
    deviceInfo?: {
        osVersion: string;
        appVersion: string;
        pushToken: PushToken;
    };
}

// Notification history for user and analytics
export interface NotificationHistory {
    id: string;
    userId: string;
    notification: NotificationData;
    status: NotificationStatus;
    timestamp: Date;
    analytics?: NotificationAnalytics;
}

// Notification queue item
export interface NotificationQueueItem {
    id: string;
    priority: NotificationPriority;
    scheduledTime: Date;
    notification: PlatformNotificationData;
    retryCount: number;
    maxRetries: number;
    createdAt: Date;
    dependencies?: string[]; // other notification IDs
}

// Notification action handler result
export interface ActionResult {
    success: boolean;
    message?: string;
    redirectTo?: string;
    additionalData?: Record<string, any>;
}

// Notification service status
export interface NotificationServiceStatus {
    initialized: boolean;
    permissions: {
        granted: boolean;
        status: 'granted' | 'denied' | 'undetermined';
        shouldExplain?: boolean;
    };
    pushToken?: PushToken;
    registered: boolean;
    platform: string;
    capabilities: {
        canSchedule: boolean;
        canBadge: boolean;
        canSound: boolean;
        canVibrate: boolean;
        canDeepLink: boolean;
    };
    lastHealthCheck: Date;
}

// Emergency notification (critical user safety)
export interface EmergencyNotification {
    type: 'safety' | 'urgent' | 'medical' | 'location';
    title: string;
    message: string;
    priority: NotificationPriority;
    requiresAck: boolean;
    timeout?: number; // seconds
    actions: {
        label: string;
        action: NotificationAction;
        destructive?: boolean;
    }[];
}

// Notification batch for grouping
export interface NotificationBatch {
    id: string;
    userId: string;
    notifications: NotificationData[];
    batchType: 'daily_summary' | 'milestone_group' | 'progress_update' | 'emergency';
    scheduledFor: Date;
    expiresAt?: Date;
    createdAt: Date;
}

// Message templates for dynamic content
export interface MessageTemplate {
    id: string;
    category: NotificationCategory;
    type: NotificationType;
    templates: {
        title: string[];
        message: string[];
        subtitle?: string[];
    };
    variables: string[];
    conditions?: {
        userLevel?: string;
        achievementType?: string;
        timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
        notificationCount?: number;
    };
}

// Rich notification with images and action buttons
export interface RichNotification extends NotificationData {
    image?: {
        url: string;
        alt: string;
        width?: number;
        height?: number;
    };
    buttons?: {
        id: string;
        title: string;
        action: NotificationAction;
        destructive?: boolean;
        requiresAuth?: boolean;
    }[];
    input?: {
        id: string;
        placeholder: string;
        submitAction: NotificationAction;
    };
}

// Notification service configuration
export interface NotificationConfig {
    // General settings
    debug: boolean;
    maxRetries: number;
    batchSize: number;
    batchInterval: number; // seconds

    // Performance settings
    queueSize: number;
    processingInterval: number; // seconds
    healthCheckInterval: number; // seconds

    // Smart scheduling
    aiEnabled: boolean;
    contextWindow: number; // minutes of user activity to consider

    // Platform specific
    platforms: {
        ios: {
            criticalAlertsEnabled: boolean;
            notificationGroups: boolean;
            scheduledDelivery: boolean;
        };
        android: {
            channelImportance: number;
            vibrationPattern: number[];
            lockScreenVisibility: 'public' | 'private' | 'secret';
        };
        web: {
            serviceWorkerPath: string;
            manifestPath: string;
            iconSizes: number[];
        };
    };

    // Integration settings
    integrations: {
        analytics: boolean;
        crashReporting: boolean;
        userFeedback: boolean;
    };
}

// Utility types
export type NotificationCategoryKey = keyof typeof NotificationCategory;
export type NotificationTypeKey = keyof typeof NotificationType;
export type NotificationActionKey = keyof typeof NotificationAction;
export type NotificationPriorityKey = keyof typeof NotificationPriority;
export type NotificationStatusKey = keyof typeof NotificationStatus;

// Common notification result interface
export interface NotificationResult<T = any> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
    metadata?: {
        timestamp: Date;
        requestId: string;
        duration?: number;
    };
}

// Extended error types for notifications
export interface NotificationError {
    type: 'permission_denied' | 'token_invalid' | 'schedule_failed' | 'delivery_failed' | 'configuration_error';
    message: string;
    code: string;
    recoverable: boolean;
    suggestedAction?: string;
    technicalDetails?: Record<string, any>;
}

export default {};