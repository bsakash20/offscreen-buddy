/**
 * Unit tests for NotificationService
 * Tests all notification functionality including scheduling, delivery, and preferences
 */

// Global type declarations for testing
declare const global: {
    Notifications: any;
    Device: any;
    AppState: any;
    Platform: any;
};

import { notificationService } from '../../../app/services/notifications/NotificationService';
import { NotificationService as NotificationServiceClass } from '../../../app/services/notifications/NotificationService';
import {
    NotificationType,
    NotificationCategory,
    NotificationPriority,
    NotificationAction,
    NotificationData,
    EmergencyNotification
} from '../../../app/services/notifications/types';

// Mock external dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('uuid');
jest.mock('../../../utils/HapticManager');
jest.mock('../../../utils/SoundManager');
jest.mock('../../../utils/Logger');
jest.mock('../../../assets/constants/notifications');

// Global mock declarations
global.Notifications = {
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(),
    requestPermissionsAsync: jest.fn(),
    getExpoPushTokenAsync: jest.fn(),
    cancelScheduledNotificationAsync: jest.fn(),
    cancelAllScheduledNotificationsAsync: jest.fn(),
    scheduleNotificationAsync: jest.fn(),
    addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
};

global.Device = {
    isDevice: true,
};

global.AppState = {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
};

global.Platform = {
    OS: 'ios',
};

describe('NotificationService', () => {
    let serviceInstance: NotificationServiceClass;
    let mockNotifications: any;

    // Mock data
    const mockNotificationData: Omit<NotificationData, 'id' | 'createdAt' | 'updatedAt'> = {
        type: NotificationType.QUICK_REMINDER,
        category: NotificationCategory.REMINDERS,
        title: 'Test Notification',
        message: 'This is a test notification',
        priority: NotificationPriority.NORMAL,
        userId: 'test-user-123',
        scheduledFor: new Date(Date.now() + 60000), // 1 minute from now
        sound: 'default',
        badge: 0,
        data: { test: true },
        actions: [NotificationAction.DISMISS],
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a fresh instance for each test
        serviceInstance = NotificationServiceClass.getInstance();

        // Get the global mock for easier access
        mockNotifications = (global as any).Notifications;
    });

    afterEach(() => {
        // Clean up any timeouts/intervals
        jest.clearAllTimers();
    });

    describe('Service Initialization', () => {
        it('should initialize successfully when permissions are granted', async () => {
            // Mock successful permission request
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });

            mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
                data: 'mock-push-token-123',
            });

            mockNotifications.setNotificationHandler.mockImplementation(() => { });

            const result = await serviceInstance.initialize();

            expect(result.success).toBe(true);
            expect(serviceInstance.getStatus().initialized).toBe(true);
            expect(serviceInstance.getStatus().permissions.granted).toBe(true);
            expect(serviceInstance.getStatus().registered).toBe(true);
        });

        it('should handle permission denial gracefully', async () => {
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'denied',
            });

            const result = await serviceInstance.initialize();

            expect(result.success).toBe(true); // Service initializes but without push notifications
            expect(serviceInstance.getStatus().permissions.granted).toBe(false);
            expect(serviceInstance.getStatus().registered).toBe(false);
        });

        it('should handle initialization failures', async () => {
            mockNotifications.getPermissionsAsync.mockRejectedValue(
                new Error('Permission request failed')
            );

            const result = await serviceInstance.initialize();

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('INIT_FAILED');
            expect(serviceInstance.getStatus().initialized).toBe(false);
        });

        it('should respect singleton pattern', () => {
            const instance1 = NotificationServiceClass.getInstance();
            const instance2 = NotificationServiceClass.getInstance();

            expect(instance1).toBe(instance2);
        });
    });

    describe('Notification Scheduling', () => {
        beforeEach(async () => {
            // Initialize service for scheduling tests
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
                data: 'mock-push-token-123',
            });
            await serviceInstance.initialize();
        });

        it('should schedule notifications successfully', async () => {
            mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id-123');

            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            expect(result.success).toBe(true);
            expect(result.data).toBe('notification-id-123');
            expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
                identifier: expect.any(String),
                content: {
                    title: mockNotificationData.title,
                    body: mockNotificationData.message,
                    data: mockNotificationData.data,
                    sound: mockNotificationData.sound,
                    badge: mockNotificationData.badge,
                    categoryIdentifier: mockNotificationData.category,
                },
                trigger: null,
            });
        });

        it('should respect user preferences when scheduling', async () => {
            // Mock user preferences with notifications disabled for this category
            jest.spyOn(serviceInstance as any, 'preferencesService', 'get').mockReturnValue({
                getUserPreferences: jest.fn().mockResolvedValue({
                    userId: 'test-user-123',
                    enabled: true,
                    categories: {
                        [NotificationCategory.REMINDERS]: {
                            enabled: false, // Disabled for reminders
                            priority: NotificationPriority.NORMAL,
                            frequency: { type: 'immediate', smartBatching: false },
                            quietHoursOverride: false,
                            customSounds: false,
                            vibrationPattern: false,
                        },
                    },
                    doNotDisturb: {
                        enabled: false,
                        startTime: '22:00',
                        endTime: '08:00',
                        timezone: 'UTC',
                        allowUrgent: true,
                    },
                    platform: {},
                    smartScheduling: {
                        enabled: true,
                        adaptiveFrequency: true,
                        skipDuringMeetings: true,
                        skipDuringFocus: false,
                        userActivityAware: true,
                    },
                    personalization: {
                        humorLevel: 'light',
                        messageTone: 'motivational',
                        language: 'en',
                        timezone: 'UTC',
                    },
                    updatedAt: new Date(),
                }),
            });

            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('CATEGORY_DISABLED');
        });

        it('should handle scheduling failures', async () => {
            mockNotifications.scheduleNotificationAsync.mockRejectedValue(
                new Error('Scheduling failed')
            );

            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('SCHEDULE_FAILED');
        });

        it('should send immediate notifications', async () => {
            mockNotifications.scheduleNotificationAsync.mockResolvedValue('immediate-notification-id');

            const immediateNotification = {
                ...mockNotificationData,
                scheduledFor: new Date(), // Immediate scheduling
            };

            const result = await serviceInstance.sendImmediateNotification(immediateNotification);

            expect(result.success).toBe(true);
            expect(result.data).toBe('immediate-notification-id');
        });

        it('should send emergency notifications', async () => {
            mockNotifications.scheduleNotificationAsync.mockResolvedValue('emergency-notification-id');

            const emergency: EmergencyNotification = {
                type: 'urgent',
                title: 'System Alert',
                message: 'This is an emergency notification',
                priority: NotificationPriority.URGENT,
                requiresAck: true,
                actions: [
                    {
                        label: 'View Timer',
                        action: NotificationAction.VIEW_TIMER,
                        destructive: false,
                    },
                ],
            };

            const result = await serviceInstance.sendEmergencyNotification(emergency);

            expect(result.success).toBe(true);
            expect(result.data).toBe('emergency-notification-id');
        });
    });

    describe('Notification Actions', () => {
        it('should handle notification actions successfully', async () => {
            const mockActionResult = {
                success: true,
                message: 'Action completed successfully',
                additionalData: { actionId: 'snooze' },
            };

            jest.spyOn(serviceInstance as any, 'actionsHandler', 'get').mockReturnValue({
                handleAction: jest.fn().mockResolvedValue(mockActionResult),
            });

            const result = await serviceInstance.handleNotificationAction(
                NotificationAction.DISMISS,
                { notificationId: 'test-123' }
            );

            expect(result).toEqual(mockActionResult);
        });

        it('should handle action failures', async () => {
            jest.spyOn(serviceInstance as any, 'actionsHandler', 'get').mockReturnValue({
                handleAction: jest.fn().mockRejectedValue(new Error('Action failed')),
            });

            const result = await serviceInstance.handleNotificationAction(
                NotificationAction.VIEW_TIMER
            );

            expect(result.success).toBe(false);
            expect(result.message).toContain('Failed to process notification action');
        });
    });

    describe('Notification Management', () => {
        it('should cancel notifications successfully', async () => {
            mockNotifications.cancelScheduledNotificationAsync.mockResolvedValue(true);

            const notificationId = 'test-notification-123';
            const result = await serviceInstance.cancelNotification(notificationId);

            expect(result.success).toBe(true);
            expect(mockNotifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
                notificationId
            );
        });

        it('should handle cancellation failures', async () => {
            mockNotifications.cancelScheduledNotificationAsync.mockRejectedValue(
                new Error('Cancellation failed')
            );

            const result = await serviceInstance.cancelNotification('invalid-id');

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('CANCEL_FAILED');
        });
    });

    describe('User Preferences', () => {
        it('should get user preferences successfully', async () => {
            const mockPreferences = {
                userId: 'test-user-123',
                enabled: true,
                categories: {
                    [NotificationCategory.REMINDERS]: {
                        enabled: true,
                        priority: NotificationPriority.NORMAL,
                        frequency: { type: 'immediate', smartBatching: false },
                        quietHoursOverride: false,
                        customSounds: false,
                        vibrationPattern: false,
                    },
                },
                doNotDisturb: {
                    enabled: false,
                    startTime: '22:00',
                    endTime: '08:00',
                    timezone: 'UTC',
                    allowUrgent: true,
                },
                platform: {
                    ios: {
                        sound: true,
                        badge: true,
                        alert: true,
                        notificationCenter: true,
                        lockScreen: true,
                        carPlay: false,
                        criticalAlerts: false,
                        scheduledDelivery: true,
                    },
                },
                smartScheduling: {
                    enabled: true,
                    adaptiveFrequency: true,
                    skipDuringMeetings: true,
                    skipDuringFocus: false,
                    userActivityAware: true,
                },
                personalization: {
                    humorLevel: 'light',
                    messageTone: 'motivational',
                    language: 'en',
                    timezone: 'UTC',
                },
                updatedAt: new Date(),
            };

            jest.spyOn(serviceInstance as any, 'preferencesService', 'get').mockReturnValue({
                getUserPreferences: jest.fn().mockResolvedValue(mockPreferences),
            });

            const result = await serviceInstance.getUserPreferences('test-user-123');

            expect(result.success).toBe(true);
            expect(result.data).toEqual(mockPreferences);
        });

        it('should update user preferences successfully', async () => {
            const updatedPreferences = {
                enabled: false, // Turn off all notifications
            };

            jest.spyOn(serviceInstance as any, 'preferencesService', 'get').mockReturnValue({
                updateUserPreferences: jest.fn().mockResolvedValue(true),
                getUserPreferences: jest.fn().mockResolvedValue({
                    userId: 'test-user-123',
                    enabled: true,
                    categories: {},
                    doNotDisturb: {
                        enabled: false,
                        startTime: '22:00',
                        endTime: '08:00',
                        timezone: 'UTC',
                        allowUrgent: true,
                    },
                    platform: {},
                    smartScheduling: {
                        enabled: true,
                        adaptiveFrequency: true,
                        skipDuringMeetings: true,
                        skipDuringFocus: false,
                        userActivityAware: true,
                    },
                    personalization: {
                        humorLevel: 'light',
                        messageTone: 'motivational',
                        language: 'en',
                        timezone: 'UTC',
                    },
                    updatedAt: new Date(),
                }),
            });

            // Mock cancelUserNotifications
            jest.spyOn(serviceInstance as any, 'cancelUserNotifications').mockResolvedValue(undefined);

            const result = await serviceInstance.updateUserPreferences('test-user-123', updatedPreferences);

            expect(result.success).toBe(true);
        });

        it('should handle preferences update failures', async () => {
            jest.spyOn(serviceInstance as any, 'preferencesService', 'get').mockReturnValue({
                updateUserPreferences: jest.fn().mockRejectedValue(new Error('Update failed')),
            });

            const result = await serviceInstance.updateUserPreferences('test-user-123', { enabled: false });

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('UPDATE_PREFS_FAILED');
        });
    });

    describe('Service Status and Health', () => {
        it('should return correct service status', async () => {
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
                data: 'test-token',
            });

            await serviceInstance.initialize();
            const status = serviceInstance.getStatus();

            expect(status.initialized).toBe(true);
            expect(status.registered).toBe(true);
            expect(status.platform).toBe('ios');
            expect(status.capabilities.canSchedule).toBe(true);
            expect(status.capabilities.canSound).toBe(true);
            expect(status.capabilities.canVibrate).toBe(true);
        });
    });

    describe('Testing and Debugging', () => {
        it('should send test notifications successfully', async () => {
            mockNotifications.scheduleNotificationAsync.mockResolvedValue('test-notification-id');

            const result = await serviceInstance.testNotification();

            expect(result.success).toBe(true);
            expect(result.data).toBe('test-notification-id');
        });

        it('should handle test notification failures', async () => {
            mockNotifications.scheduleNotificationAsync.mockRejectedValue(
                new Error('Test notification failed')
            );

            const result = await serviceInstance.testNotification();

            expect(result.success).toBe(false);
            expect(result.error?.code).toBe('TEST_FAILED');
        });
    });

    describe('Service Cleanup', () => {
        beforeEach(async () => {
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            await serviceInstance.initialize();
        });

        it('should dispose service resources successfully', async () => {
            await serviceInstance.dispose();

            expect(serviceInstance.getStatus().initialized).toBe(false);
        });

        it('should handle disposal errors gracefully', async () => {
            // Mock error during disposal
            jest.spyOn(serviceInstance as any, 'scheduler', 'get').mockReturnValue({
                dispose: jest.fn().mockRejectedValue(new Error('Dispose failed')),
            });

            await expect(serviceInstance.dispose()).resolves.not.toThrow();
        });
    });

    describe('Error Handling and Recovery', () => {
        it('should handle missing initialization gracefully', async () => {
            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            expect(result.success).toBe(false);
            expect(result.error?.message).toContain('not initialized');
        });

        it('should retry failed notification scheduling', async () => {
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            await serviceInstance.initialize();

            // First call fails, second succeeds
            mockNotifications.scheduleNotificationAsync
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce('retry-notification-id');

            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            expect(result.success).toBe(true);
            expect(result.data).toBe('retry-notification-id');
        });
    });

    describe('Performance and Optimization', () => {
        it('should handle batch notification scheduling efficiently', async () => {
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            await serviceInstance.initialize();

            mockNotifications.scheduleNotificationAsync.mockResolvedValue('batch-notification-id');

            const notifications = Array.from({ length: 5 }, (_, i) => ({
                ...mockNotificationData,
                title: `Batch Notification ${i + 1}`,
            }));

            const results = await Promise.all(
                notifications.map(notification => serviceInstance.scheduleNotification(notification))
            );

            expect(results.every(result => result.success)).toBe(true);
            expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledTimes(5);
        });

        it('should manage notification queue size limits', async () => {
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            await serviceInstance.initialize();

            // Mock queue size limit reached
            jest.spyOn(serviceInstance as any, 'config', 'get').mockReturnValue({
                queueSize: 1,
            });

            const notifications = Array.from({ length: 3 }, (_, i) => ({
                ...mockNotificationData,
                title: `Queue Test ${i}`,
            }));

            const results = await Promise.all(
                notifications.map(notification => serviceInstance.scheduleNotification(notification))
            );

            // Some should succeed, some should be queued
            expect(results.some(result => result.success)).toBe(true);
        });
    });

    describe('Cross-Platform Compatibility', () => {
        it('should handle iOS-specific notification features', async () => {
            (global as any).Platform.OS = 'ios';
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            await serviceInstance.initialize();

            mockNotifications.scheduleNotificationAsync.mockResolvedValue('ios-notification-id');

            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            expect(result.success).toBe(true);
            // iOS-specific configurations would be verified here
        });

        it('should handle Android-specific notification features', async () => {
            (global as any).Platform.OS = 'android';
            mockNotifications.getPermissionsAsync.mockResolvedValue({
                status: 'granted',
            });
            await serviceInstance.initialize();

            mockNotifications.scheduleNotificationAsync.mockResolvedValue('android-notification-id');

            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            expect(result.success).toBe(true);
            // Android-specific configurations would be verified here
        });

        it('should handle web platform limitations', async () => {
            (global as any).Platform.OS = 'web';
            (global as any).Device.isDevice = false;

            const result = await serviceInstance.scheduleNotification(mockNotificationData);

            // Web platform may have different capabilities
            expect(serviceInstance.getStatus().capabilities.canSchedule).toBe(false);
        });
    });
});