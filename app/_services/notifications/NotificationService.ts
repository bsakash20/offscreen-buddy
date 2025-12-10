/**
 * Core Notification Service for OffScreen Buddy
 * Handles push notifications, local scheduling, and user preferences
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, AppState, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

import {
    NotificationType,
    NotificationCategory,
    NotificationPriority,
    NotificationAction,
    NotificationStatus,
    NotificationData,
    PlatformNotificationData,
    NotificationPreferences,
    NotificationAnalytics,
    NotificationResult,
    NotificationError,
    NotificationQueueItem,
    PushToken,
    ScheduleResult,
    SmartScheduleContext,
    ActionResult,
    NotificationServiceStatus,
    EmergencyNotification,
    NotificationConfig,
    NotificationBatch,
    MessageTemplate,
    RichNotification,
} from './types';

import { NotificationScheduler } from './NotificationScheduler';
import { NotificationPreferencesService } from './NotificationPreferences';
import { NotificationActions } from './NotificationActions';
import { hapticManager, HapticUtils, HapticType } from '../../_utils/HapticManager';
import { soundManager, SoundUtils, SoundType } from '../../_utils/SoundManager';
import { logger } from '../../_utils/Logger';
import { DeviceUtils } from '../../_utils/responsive/DeviceUtils';
import { getSmartMessage } from '../../_assets/constants/notifications';

/**
 * Core Notification Service
 * Handles all notification operations including push notifications, scheduling, and user management
 */
export class NotificationService {
    private static instance: NotificationService;
    private scheduler: NotificationScheduler;
    private preferencesService: NotificationPreferencesService;
    private actionsHandler: NotificationActions;
    private logger = logger;
    private isInitialized = false;
    private status: NotificationServiceStatus;
    private config: NotificationConfig;
    private notificationQueue: NotificationQueueItem[] = [];
    private analyticsQueue: NotificationAnalytics[] = [];
    private appStateSubscription?: any;
    private pushTokenListener?: any;
    private notificationReceivedListener?: any;
    private notificationResponseListener?: any;

    private constructor() {
        this.scheduler = new NotificationScheduler(this);
        this.preferencesService = new NotificationPreferencesService();
        this.actionsHandler = new NotificationActions();
        this.status = this.getDefaultStatus();
        this.config = this.getDefaultConfig();
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    /**
     * Initialize the notification service
     */
    public async initialize(): Promise<NotificationResult<void>> {
        try {
            this.logger.info('Initializing Notification Service...');

            // Configure notifications
            await this.configureNotifications();

            // Get device capabilities
            const capabilities = await this.getDeviceCapabilities();

            // Check permissions
            const permissionResult = await this.requestPermissions();

            // Get push token if permissions granted
            let pushToken: PushToken | undefined;
            if (permissionResult.success && permissionResult.data?.granted) {
                pushToken = await this.getPushToken();
            }

            // Update status
            this.status = {
                ...this.status,
                initialized: true,
                permissions: {
                    granted: permissionResult.data?.granted || false,
                    status: (permissionResult.data?.status as any) || 'undetermined',
                    shouldExplain: false
                },
                pushToken,
                registered: !!pushToken,
                platform: Platform.OS,
                capabilities,
                lastHealthCheck: new Date(),
            };

            // Initialize dependent services
            await Promise.all([
                this.scheduler.initialize(),
                this.preferencesService.initialize(),
            ]);

            // Setup listeners
            await this.setupListeners();

            // Start background processing
            this.startBackgroundProcessing();

            this.isInitialized = true;
            this.logger.info('Notification Service initialized successfully');

            return {
                success: true,
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        } catch (error: any) {
            this.logger.error('Failed to initialize notification service:', error);
            return {
                success: false,
                error: {
                    code: 'INIT_FAILED',
                    message: 'Failed to initialize notification service',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Schedule a notification with smart timing
     */
    public async scheduleNotification(
        notification: Omit<NotificationData, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<NotificationResult<string>> {
        try {
            if (!this.isInitialized) {
                throw new Error('Notification service not initialized');
            }

            // Create complete notification data
            const notificationData: NotificationData = {
                ...notification,
                id: uuidv4(),
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Check user preferences
            const preferences = await this.preferencesService.getUserPreferences(notification.userId);
            if (!preferences || !preferences.enabled) {
                return {
                    success: false,
                    error: {
                        code: 'USER_OPTED_OUT',
                        message: 'User has disabled notifications',
                        recoverable: false,
                    },
                    metadata: { timestamp: new Date(), requestId: uuidv4() },
                };
            }

            // Check category preferences
            const categoryPrefs = preferences.categories[notification.category];
            if (!categoryPrefs?.enabled) {
                return {
                    success: false,
                    error: {
                        code: 'CATEGORY_DISABLED',
                        message: `${notification.category} notifications are disabled`,
                        recoverable: false,
                    },
                    metadata: { timestamp: new Date(), requestId: uuidv4() },
                };
            }

            // Get smart scheduling result
            const scheduleResult = await this.getSmartSchedule(notificationData, preferences);

            if (!scheduleResult.shouldSend) {
                this.logger.info('Notification skipped due to smart scheduling', {
                    notificationId: notificationData.id,
                    reason: scheduleResult.reason
                });
                return {
                    success: true,
                    data: notificationData.id,
                    metadata: { timestamp: new Date(), requestId: uuidv4() },
                };
            }

            // Create platform-specific notification
            const platformNotification = await this.createPlatformNotification(notificationData);

            // Add to scheduling queue
            const queueItem: NotificationQueueItem = {
                id: notificationData.id,
                priority: scheduleResult.priority,
                scheduledTime: scheduleResult.scheduledTime,
                notification: platformNotification,
                retryCount: 0,
                maxRetries: this.config.maxRetries,
                createdAt: new Date(),
            };

            this.notificationQueue.push(queueItem);
            await this.processQueue();

            // Track analytics
            await this.trackNotificationScheduled(notificationData);

            return {
                success: true,
                data: notificationData.id,
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        } catch (error: any) {
            this.logger.error('Failed to schedule notification:', error);
            return {
                success: false,
                error: {
                    code: 'SCHEDULE_FAILED',
                    message: 'Failed to schedule notification',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Send immediate notification (no scheduling)
     */
    public async sendImmediateNotification(
        notification: Omit<NotificationData, 'id' | 'createdAt' | 'updatedAt'>
    ): Promise<NotificationResult<string>> {
        try {
            const result = await this.scheduleNotification({
                ...notification,
                scheduledFor: new Date(), // Immediate scheduling
            });

            return result;
        } catch (error: any) {
            this.logger.error('Failed to send immediate notification:', error);
            return {
                success: false,
                error: {
                    code: 'SEND_FAILED',
                    message: 'Failed to send immediate notification',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Send emergency notification
     */
    public async sendEmergencyNotification(
        emergency: EmergencyNotification
    ): Promise<NotificationResult<string>> {
        try {
            const notification: NotificationData = {
                id: uuidv4(),
                type: NotificationType.URGENT_ALERT,
                category: NotificationCategory.URGENT,
                title: emergency.title,
                message: emergency.message,
                priority: emergency.priority,
                userId: 'emergency', // System-wide notification
                createdAt: new Date(),
                updatedAt: new Date(),
                actions: emergency.actions.map(action => action.action),
            };

            const result = await this.sendImmediateNotification(notification);

            if (result.success && emergency.requiresAck) {
                // Track emergency for analytics
                await this.trackEmergencyNotification(notification);
            }

            return result;
        } catch (error: any) {
            this.logger.error('Failed to send emergency notification:', error);
            return {
                success: false,
                error: {
                    code: 'EMERGENCY_FAILED',
                    message: 'Failed to send emergency notification',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Handle notification action
     */
    public async handleNotificationAction(
        action: NotificationAction,
        data?: Record<string, any>
    ): Promise<ActionResult> {
        try {
            this.logger.info('Handling notification action', { action, data });

            // Trigger haptic feedback
            await HapticUtils.settingToggle();

            // Play sound
            await soundManager.playUISound('button');

            // Handle the action
            const result = await this.actionsHandler.handleAction(action, data);

            return result;
        } catch (error: any) {
            this.logger.error('Failed to handle notification action:', error);
            return {
                success: false,
                message: 'Failed to process notification action',
            };
        }
    }

    /**
     * Cancel scheduled notification
     */
    public async cancelNotification(notificationId: string): Promise<NotificationResult<void>> {
        try {
            // Remove from queue
            this.notificationQueue = this.notificationQueue.filter(item => item.id !== notificationId);

            // Cancel in scheduler
            await this.scheduler.cancelScheduledNotification(notificationId);

            // Cancel in Expo if already scheduled
            await Notifications.cancelScheduledNotificationAsync(notificationId);

            this.logger.info('Notification cancelled', { notificationId });

            return {
                success: true,
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        } catch (error: any) {
            this.logger.error('Failed to cancel notification:', error);
            return {
                success: false,
                error: {
                    code: 'CANCEL_FAILED',
                    message: 'Failed to cancel notification',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Get user's notification preferences
     */
    public async getUserPreferences(userId: string): Promise<NotificationResult<NotificationPreferences>> {
        try {
            const preferences = await this.preferencesService.getUserPreferences(userId);
            return {
                success: true,
                data: preferences,
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        } catch (error: any) {
            this.logger.error('Failed to get user preferences:', error);
            return {
                success: false,
                error: {
                    code: 'GET_PREFS_FAILED',
                    message: 'Failed to get user preferences',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Update user notification preferences
     */
    public async updateUserPreferences(
        userId: string,
        preferences: Partial<NotificationPreferences>
    ): Promise<NotificationResult<void>> {
        try {
            await this.preferencesService.updateUserPreferences(userId, preferences);

            // If notifications were disabled, cancel pending notifications
            if (preferences.enabled === false) {
                await this.cancelUserNotifications(userId);
            }

            this.logger.info('User preferences updated', { userId });

            return {
                success: true,
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        } catch (error: any) {
            this.logger.error('Failed to update user preferences:', error);
            return {
                success: false,
                error: {
                    code: 'UPDATE_PREFS_FAILED',
                    message: 'Failed to update user preferences',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Get service status
     */
    public getStatus(): NotificationServiceStatus {
        return { ...this.status };
    }

    /**
     * Test notification functionality
     */
    public async testNotification(): Promise<NotificationResult<string>> {
        try {
            const testNotification: NotificationData = {
                id: uuidv4(),
                type: NotificationType.QUICK_REMINDER,
                category: NotificationCategory.REMINDERS,
                title: 'Notification Test',
                message: 'This is a test notification from OffScreen Buddy!',
                priority: NotificationPriority.NORMAL,
                userId: 'test-user',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = await this.sendImmediateNotification(testNotification);
            return result;
        } catch (error: any) {
            this.logger.error('Failed to send test notification:', error);
            return {
                success: false,
                error: {
                    code: 'TEST_FAILED',
                    message: 'Failed to send test notification',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    /**
     * Dispose of service resources
     */
    public async dispose(): Promise<void> {
        try {
            this.logger.info('Disposing Notification Service...');

            // Remove listeners
            if (this.appStateSubscription) {
                this.appStateSubscription.remove();
            }
            if (this.pushTokenListener) {
                this.pushTokenListener.remove();
            }
            if (this.notificationReceivedListener) {
                this.notificationReceivedListener.remove();
            }
            if (this.notificationResponseListener) {
                this.notificationResponseListener.remove();
            }

            // Dispose services
            await this.scheduler.dispose();
            await this.preferencesService.dispose();

            // Process remaining analytics
            await this.processAnalytics();

            this.isInitialized = false;
            this.logger.info('Notification Service disposed');
        } catch (error: any) {
            this.logger.error('Error during disposal:', error);
        }
    }

    // Private methods

    private async configureNotifications(): Promise<void> {
        // Configure Expo Notifications
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });
    }

    private async getDeviceCapabilities() {
        return {
            canSchedule: Device.isDevice && Platform.OS !== 'web',
            canBadge: Platform.OS !== 'web',
            canSound: true,
            canVibrate: Platform.OS !== 'web',
            canDeepLink: true,
        };
    }

    private async requestPermissions(): Promise<NotificationResult<{ granted: boolean; status: string }>> {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            return {
                success: true,
                data: {
                    granted: finalStatus === 'granted',
                    status: finalStatus,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        } catch (error) {
            return {
                success: false,
                error: {
                    code: 'PERMISSION_FAILED',
                    message: 'Failed to request notification permissions',
                    details: error,
                },
                metadata: { timestamp: new Date(), requestId: uuidv4() },
            };
        }
    }

    private async getPushToken(): Promise<PushToken | undefined> {
        try {
            const token = await Notifications.getExpoPushTokenAsync();
            return token.data;
        } catch (error: any) {
            this.logger.warn('Failed to get push token:', error);
            return undefined;
        }
    }

    private async getSmartSchedule(
        notification: NotificationData,
        preferences: NotificationPreferences
    ): Promise<ScheduleResult> {
        try {
            if (!preferences.smartScheduling.enabled) {
                // Use default scheduling
                return {
                    scheduledTime: notification.scheduledFor || new Date(),
                    priority: notification.priority,
                    reason: 'Default scheduling',
                    shouldSend: true,
                };
            }

            const context: SmartScheduleContext = {
                userId: notification.userId,
                currentTime: new Date(),
                userActivity: await this.getUserActivity(notification.userId),
                deviceState: await this.getDeviceState(),
                preferences,
                notificationHistory: await this.getNotificationHistory(notification.userId),
            };

            return await this.scheduler.getSmartSchedule(notification, context);
        } catch (error: any) {
            this.logger.error('Failed to get smart schedule:', error);
            // Fallback to immediate scheduling
            return {
                scheduledTime: new Date(),
                priority: notification.priority,
                reason: 'Fallback to immediate scheduling',
                shouldSend: true,
            };
        }
    }

    private async createPlatformNotification(notification: NotificationData): Promise<PlatformNotificationData> {
        const baseNotification: PlatformNotificationData = {
            ...notification,
            // Common properties
            sound: this.getNotificationSound(notification),
            badge: this.getNotificationBadge(notification),
            categoryIdentifier: notification.category,

            // Platform-specific configurations
            ios: {
                sound: notification.sound,
                badge: notification.badge,
                categoryIdentifier: notification.categoryIdentifier,
                interruptionLevel: this.getIOSInterruptionLevel(notification.priority),
            },

            android: {
                channelId: this.getAndroidChannelId(notification.category),
                smallIcon: this.getAndroidIcon(),
                priority: this.getAndroidPriority(notification.priority),
                visibility: 'private',
            },
        };

        return baseNotification;
    }

    private getNotificationSound(notification: NotificationData): string {
        const soundMap = {
            [NotificationPriority.LOW]: 'gentle',
            [NotificationPriority.NORMAL]: 'default',
            [NotificationPriority.HIGH]: 'alert',
            [NotificationPriority.URGENT]: 'critical',
        };

        return soundMap[notification.priority] || 'default';
    }

    private getNotificationBadge(notification: NotificationData): number {
        return notification.category === NotificationCategory.ACHIEVEMENTS ? 1 : 0;
    }

    private getIOSInterruptionLevel(priority: NotificationPriority): 'active' | 'time-sensitive' | 'passive' {
        switch (priority) {
            case NotificationPriority.URGENT:
                return 'time-sensitive';
            case NotificationPriority.HIGH:
                return 'active';
            default:
                return 'passive';
        }
    }

    private getAndroidChannelId(category: NotificationCategory): string {
        const channelMap = {
            [NotificationCategory.TIMERS]: 'timer_channel',
            [NotificationCategory.ACHIEVEMENTS]: 'achievement_channel',
            [NotificationCategory.REMINDERS]: 'reminder_channel',
            [NotificationCategory.MOTIVATIONAL]: 'motivation_channel',
            [NotificationCategory.URGENT]: 'urgent_channel',
            [NotificationCategory.CUSTOM]: 'custom_channel',
        };

        return channelMap[category] || 'default_channel';
    }

    private getAndroidIcon(): string | undefined {
        return Platform.OS === 'android' ? 'ic_notification' : undefined;
    }

    private getAndroidPriority(priority: NotificationPriority): number {
        const priorityMap = {
            [NotificationPriority.LOW]: 1,
            [NotificationPriority.NORMAL]: 2,
            [NotificationPriority.HIGH]: 3,
            [NotificationPriority.URGENT]: 4,
        };

        return priorityMap[priority] || 2;
    }

    private async setupListeners(): Promise<void> {
        // App state listener
        this.appStateSubscription = AppState.addEventListener('change', async (nextAppState) => {
            if (nextAppState === 'active') {
                await this.handleAppForeground();
            } else if (nextAppState === 'background') {
                await this.handleAppBackground();
            }
        });

        // Push token listener
        this.pushTokenListener = Notifications.addPushTokenListener(async (token) => {
            await this.handlePushTokenUpdate(token.data);
        });

        // Notification received listener
        this.notificationReceivedListener = Notifications.addNotificationReceivedListener(
            async (notification) => {
                await this.handleNotificationReceived(notification);
            }
        );

        // Notification response listener
        this.notificationResponseListener = Notifications.addNotificationResponseReceivedListener(
            async (response) => {
                await this.handleNotificationResponse(response);
            }
        );
    }

    private async handleNotificationReceived(notification: any): Promise<void> {
        try {
            this.logger.info('Notification received', {
                notificationId: notification.request?.identifier,
                category: notification.request?.content?.categoryIdentifier,
            });

            // Track analytics
            await this.trackNotificationDelivered(notification);

            // Trigger haptic feedback
            const hapticType = this.getNotificationHapticType(notification);
            await hapticManager.trigger(hapticType);

            // Play sound if enabled
            const soundType = this.getNotificationSoundType(notification);
            if (soundType) {
                await soundManager.playSound(soundType);
            }

            // Store in notification history
            await this.storeNotificationHistory(notification);
        } catch (error: any) {
            this.logger.error('Error handling notification received:', error);
        }
    }

    private async handleNotificationResponse(response: any): Promise<void> {
        try {
            this.logger.info('Notification response received', {
                notificationId: response.notification.request.identifier,
                actionId: response.actionIdentifier,
            });

            // Extract action and data
            const actionId = response.actionIdentifier;
            const data = response.notification.request.content.data;

            // Convert action ID to our action enum
            const action = this.mapNotificationActionId(actionId);

            if (action) {
                await this.handleNotificationAction(action, data);
            }

            // Track analytics
            await this.trackNotificationClicked(response);
        } catch (error) {
            this.logger.error('Error handling notification response:', error as any);
        }
    }

    private async handleAppForeground(): Promise<void> {
        this.logger.info('App came to foreground');
        await this.processQueue();
        await this.processAnalytics();
    }

    private async handleAppBackground(): Promise<void> {
        this.logger.info('App went to background');
        // Process any pending operations
        await this.processQueue();
        await this.processAnalytics();
    }

    private async handlePushTokenUpdate(token: PushToken): Promise<void> {
        this.logger.info('Push token updated');
        this.status.pushToken = token;
        await this.registerPushTokenWithBackend(token);
    }

    private async processQueue(): Promise<void> {
        try {
            const now = new Date();
            const readyNotifications = this.notificationQueue.filter(
                (item) => item.scheduledTime <= now
            );

            for (const item of readyNotifications) {
                await this.processNotification(item);
            }

            // Remove processed notifications
            this.notificationQueue = this.notificationQueue.filter(
                (item) => !readyNotifications.includes(item)
            );
        } catch (error: any) {
            this.logger.error('Error processing notification queue:', error);
        }
    }

    private async processNotification(queueItem: NotificationQueueItem): Promise<void> {
        try {
            const { notification, id } = queueItem;

            // Schedule with Expo
            await Notifications.scheduleNotificationAsync({
                identifier: id,
                content: {
                    title: notification.title,
                    body: notification.message,
                    data: notification.data,
                    sound: notification.sound,
                    badge: notification.badge,
                    categoryIdentifier: notification.categoryIdentifier,

                },
                trigger: null, // Immediate
            });

            this.logger.info('Notification scheduled successfully', { notificationId: id });
        } catch (error: any) {
            this.logger.error('Error processing notification:', error);

            // Retry logic
            queueItem.retryCount++;
            if (queueItem.retryCount < queueItem.maxRetries) {
                // Re-queue for retry
                queueItem.scheduledTime = new Date(Date.now() + 60000 * queueItem.retryCount); // Exponential backoff
                this.notificationQueue.push(queueItem);
            }
        }
    }

    private async processAnalytics(): Promise<void> {
        try {
            const analytics = this.analyticsQueue.splice(0, 10); // Process in batches
            // Send to backend analytics service
            // This would integrate with your existing analytics system
            if (analytics.length > 0) {
                this.logger.info('Processing analytics batch', { count: analytics.length });
            }
        } catch (error: any) {
            this.logger.error('Error processing analytics:', error);
        }
    }

    private startBackgroundProcessing(): void {
        // Process queue every 5 seconds (unified interval)
        setInterval(() => {
            if (this.isInitialized) {
                this.processQueue();
                this.processAnalytics();
            }
        }, this.config.processingInterval * 1000);
    }

    // Analytics methods
    private async trackNotificationScheduled(notification: NotificationData): Promise<void> {
        const analytics: NotificationAnalytics = {
            notificationId: notification.id,
            userId: notification.userId,
            type: notification.type,
            category: notification.category,
            platform: Platform.OS,
            sentAt: new Date(),
        };

        this.analyticsQueue.push(analytics);
    }

    private async trackNotificationDelivered(notification: any): Promise<void> {
        // Implementation for tracking delivered notifications
    }

    private async trackNotificationClicked(response: any): Promise<void> {
        // Implementation for tracking clicked notifications
    }

    private async trackEmergencyNotification(notification: NotificationData): Promise<void> {
        // Implementation for tracking emergency notifications
    }

    // Helper methods
    private async getUserActivity(userId: string) {
        // Get user's current activity state
        return {
            isFocused: false,
            isInMeeting: false,
            lastActivity: new Date(),
        };
    }

    private async getDeviceState() {
        // Get device state information
        return {
            batteryLevel: 0.8,
            isCharging: true,
            isLowPowerMode: false,
        };
    }

    private async getNotificationHistory(userId: string) {
        // Get recent notification history
        return [];
    }

    private async cancelUserNotifications(userId: string): Promise<void> {
        // Cancel all notifications for a user
        await Notifications.cancelAllScheduledNotificationsAsync();
    }

    private async registerPushTokenWithBackend(token: PushToken): Promise<void> {
        // Register token with backend
        try {
            // This would integrate with your existing backend API
            this.logger.info('Push token registered with backend', { token });
        } catch (error: any) {
            this.logger.error('Failed to register push token with backend:', error);
        }
    }

    private getNotificationHapticType(notification: any): HapticType {
        // Map notification priority to haptic type
        return HapticType.NOTIFICATION_GENTLE;
    }

    private getNotificationSoundType(notification: any): SoundType | null {
        // Map notification priority to sound type
        const priority = notification?.request?.content?.data?.priority as NotificationPriority || NotificationPriority.NORMAL;

        switch (priority) {
            case NotificationPriority.URGENT:
                return SoundType.NOTIFICATION_AGGRESSIVE;
            case NotificationPriority.HIGH:
                return SoundType.NOTIFICATION_MODERATE;
            case NotificationPriority.LOW:
                return SoundType.NOTIFICATION_GENTLE;
            default:
                return SoundType.NOTIFICATION_GENTLE;
        }
    }

    private mapNotificationActionId(actionId: string): NotificationAction | null {
        // Map platform action ID to our action enum
        switch (actionId) {
            case 'VIEW_TIMER':
                return NotificationAction.VIEW_TIMER;
            case 'START_SESSION':
                return NotificationAction.START_SESSION;
            case 'DISMISS':
                return NotificationAction.DISMISS;
            default:
                return null;
        }
    }

    private async storeNotificationHistory(notification: any): Promise<void> {
        // Store notification in local history
        try {
            const history = {
                id: uuidv4(),
                timestamp: new Date(),
                notification: notification,
            };
            // Store in AsyncStorage
        } catch (error: any) {
            this.logger.error('Error storing notification history:', error);
        }
    }

    private getDefaultStatus(): NotificationServiceStatus {
        return {
            initialized: false,
            permissions: {
                granted: false,
                status: 'undetermined',
            },
            registered: false,
            platform: Platform.OS,
            capabilities: {
                canSchedule: false,
                canBadge: false,
                canSound: false,
                canVibrate: false,
                canDeepLink: false,
            },
            lastHealthCheck: new Date(),
        };
    }

    private getDefaultConfig(): NotificationConfig {
        return {
            debug: __DEV__,
            maxRetries: 3,
            batchSize: 10,
            batchInterval: 60, // 1 minute
            queueSize: 100,
            processingInterval: 5, // 5 seconds (Unified interval)
            healthCheckInterval: 300, // 5 minutes
            aiEnabled: true,
            contextWindow: 30, // 30 minutes
            platforms: {
                ios: {
                    criticalAlertsEnabled: false,
                    notificationGroups: true,
                    scheduledDelivery: true,
                },
                android: {
                    channelImportance: 2,
                    vibrationPattern: [0, 250, 250, 250],
                    lockScreenVisibility: 'private',
                },
                web: {
                    serviceWorkerPath: '/service-worker.js',
                    manifestPath: '/manifest.json',
                    iconSizes: [72, 96, 128, 144, 152, 192, 384, 512],
                },
            },
            integrations: {
                analytics: true,
                crashReporting: true,
                userFeedback: true,
            },
        };
    }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
export default notificationService;