/**
 * Integration tests for NotificationService + OfflineSyncService
 * Tests end-to-end functionality across notification and offline systems
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import { notificationService } from '../../../app/services/notifications/NotificationService';
import { offlineSyncService } from '../../../app/services/offline/SyncManager';
import { OfflineStateManager } from '../../../app/services/offline/OfflineStateManager';
import { NetworkConnectivityService } from '../../../app/services/offline/NetworkConnectivityService';
import { mockUsers } from '../../utilities/mock-data/user';
import { ThemeProvider } from '../../../app/design-system/providers/ThemeProvider';

// Mock all external dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-haptics');
jest.mock('expo-router');

describe('Notification + Offline Integration', () => {
    let mockUser: any;
    let networkService: NetworkConnectivityService;
    let offlineManager: OfflineStateManager;
    let syncService: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock user
        mockUser = mockUsers.standard;

        // Initialize services
        networkService = new NetworkConnectivityService();
        offlineManager = new OfflineStateManager();
        syncService = offlineSyncService;

        // Mock network connectivity
        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({}),
        });

        // Mock AsyncStorage
        require('@react-native-async-storage/async-storage').__setValue({
            [`notification_queue_${mockUser.id}`]: JSON.stringify([]),
            [`offline_preferences_${mockUser.id}`]: JSON.stringify({
                syncNotifications: true,
                syncInterval: 300000, // 5 minutes
            }),
        });
    });

    afterEach(async () => {
        // Clean up
        await notificationService.dispose();
        await syncService.dispose();
    });

    describe('Offline Notification Scheduling', () => {
        it('should schedule notifications when offline and sync when online', async () => {
            // Start offline
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            // Schedule notification while offline
            const notificationData = {
                type: 'timer_complete' as const,
                category: 'timers' as const,
                title: 'Focus Session Complete',
                message: 'Great work! Your focus session has ended.',
                priority: 'normal' as const,
                userId: mockUser.id,
                scheduledFor: new Date(Date.now() + 60000), // 1 minute from now
                sound: 'default',
                badge: 0,
                data: { sessionId: 'session-123' },
                actions: ['view_session' as const],
            };

            const scheduleResult = await notificationService.scheduleNotification(notificationData);
            expect(scheduleResult.success).toBe(true);
            expect(scheduleResult.data).toBeDefined();

            // Verify notification is queued for offline sync
            const queuedNotifications = await offlineManager.getQueuedNotifications(mockUser.id);
            expect(queuedNotifications).toHaveLength(1);
            expect(queuedNotifications[0].notificationData).toEqual(notificationData);

            // Simulate going online
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            // Trigger sync
            await syncService.syncPendingNotifications(mockUser.id);

            // Verify sync completed
            const syncedNotifications = await offlineManager.getSyncedNotifications(mockUser.id);
            expect(syncedNotifications).toHaveLength(1);

            // Verify notification was processed (would normally be sent to device)
            expect(scheduleResult.success).toBe(true);
        });

        it('should handle notification sync failures gracefully', async () => {
            // Setup offline scenario
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            const notificationData = {
                type: 'break_reminder' as const,
                category: 'reminders' as const,
                title: 'Break Time',
                message: 'Take a break to rest your eyes.',
                priority: 'normal' as const,
                userId: mockUser.id,
                scheduledFor: new Date(Date.now() + 300000), // 5 minutes from now
                sound: 'gentle',
                badge: 0,
                data: {},
                actions: ['dismiss' as const],
            };

            // Schedule while offline
            const scheduleResult = await notificationService.scheduleNotification(notificationData);
            expect(scheduleResult.success).toBe(true);

            // Simulate going online but with network failure
            networkService.simulateOnline();
            global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

            // Attempt sync - should handle failure gracefully
            await syncService.syncPendingNotifications(mockUser.id);

            // Verify notification is re-queued for retry
            const queuedNotifications = await offlineManager.getQueuedNotifications(mockUser.id);
            expect(queuedNotifications).toHaveLength(1);
            expect(queuedNotifications[0].retryCount).toBe(1);
        });

        it('should sync batch notifications efficiently', async () => {
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            // Schedule multiple notifications while offline
            const notifications = Array.from({ length: 5 }, (_, i) => ({
                type: 'milestone_achievement' as const,
                category: 'achievements' as const,
                title: `Achievement Unlocked!`,
                message: `You've reached milestone ${i + 1}`,
                priority: 'high' as const,
                userId: mockUser.id,
                scheduledFor: new Date(Date.now() + (i + 1) * 60000),
                sound: 'celebration',
                badge: 1,
                data: { milestoneId: `milestone-${i + 1}` },
                actions: ['view_achievement' as const],
            }));

            // Schedule all notifications
            const schedulePromises = notifications.map(notification =>
                notificationService.scheduleNotification(notification)
            );
            const scheduleResults = await Promise.all(schedulePromises);
            expect(scheduleResults.every(result => result.success)).toBe(true);

            // Verify all are queued
            let queuedNotifications = await offlineManager.getQueuedNotifications(mockUser.id);
            expect(queuedNotifications).toHaveLength(5);

            // Go online and sync
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            // Batch sync
            const syncResult = await syncService.syncPendingNotifications(mockUser.id);
            expect(syncResult.success).toBe(true);
            expect(syncResult.syncedCount).toBe(5);

            // Verify all synced
            queuedNotifications = await offlineManager.getQueuedNotifications(mockUser.id);
            expect(queuedNotifications).toHaveLength(0);

            const syncedNotifications = await offlineManager.getSyncedNotifications(mockUser.id);
            expect(syncedNotifications).toHaveLength(5);
        });
    });

    describe('Notification Conflict Resolution', () => {
        it('should handle conflicting notification schedules', async () => {
            const baseTime = new Date(Date.now() + 60000); // 1 minute from now

            // Schedule two notifications for the same time
            const notifications = [
                {
                    type: 'timer_complete' as const,
                    category: 'timers' as const,
                    title: 'Session 1 Complete',
                    message: 'First session ended',
                    priority: 'normal' as const,
                    userId: mockUser.id,
                    scheduledFor: baseTime,
                    sound: 'default',
                    badge: 0,
                    data: { sessionId: 'session-1' },
                    actions: ['view_session' as const],
                },
                {
                    type: 'timer_complete' as const,
                    category: 'timers' as const,
                    title: 'Session 2 Complete',
                    message: 'Second session ended',
                    priority: 'normal' as const,
                    userId: mockUser.id,
                    scheduledFor: baseTime,
                    sound: 'default',
                    badge: 0,
                    data: { sessionId: 'session-2' },
                    actions: ['view_session' as const],
                },
            ];

            // Schedule while offline
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            const results = await Promise.all(
                notifications.map(notification => notificationService.scheduleNotification(notification))
            );

            expect(results.every(result => result.success)).toBe(true);

            // Sync when online
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            // Should resolve conflicts (notifications should be staggered)
            const syncResult = await syncService.syncPendingNotifications(mockUser.id);
            expect(syncResult.success).toBe(true);

            const syncedNotifications = await offlineManager.getSyncedNotifications(mockUser.id);
            expect(syncedNotifications).toHaveLength(2);

            // Verify they were scheduled at different times
            const scheduledTimes = syncedNotifications.map(n => new Date(n.notificationData.scheduledFor!));
            expect(scheduledTimes[0].getTime()).not.toBe(scheduledTimes[1].getTime());
        });
    });

    describe('Network State Transitions', () => {
        it('should handle offline to online transition gracefully', async () => {
            // Start offline
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            // Schedule notification
            const notificationData = {
                type: 'smart_break' as const,
                category: 'reminders' as const,
                title: 'Smart Break Suggestion',
                message: 'Based on your focus patterns, consider taking a break.',
                priority: 'normal' as const,
                userId: mockUser.id,
                scheduledFor: new Date(Date.now() + 300000),
                sound: 'gentle',
                badge: 0,
                data: { reason: 'smart_break' },
                actions: ['take_break' as const, 'dismiss' as const],
            };

            const offlineResult = await notificationService.scheduleNotification(notificationData);
            expect(offlineResult.success).toBe(true);

            // Transition to online
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            // Should automatically trigger sync on state change
            await waitFor(() => {
                expect(offlineManager.getQueuedNotifications(mockUser.id)).resolves.toHaveLength(0);
            });

            // Verify notification was synced
            const syncedNotifications = await offlineManager.getSyncedNotifications(mockUser.id);
            expect(syncedNotifications).toHaveLength(1);
            expect(syncedNotifications[0].notificationData).toEqual(notificationData);
        });

        it('should handle online to offline transition during sync', async () => {
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            // Schedule notification online
            const notificationData = {
                type: 'daily_goal' as const,
                category: 'motivational' as const,
                title: 'Daily Goal Reminder',
                message: 'You\'re 80% through your daily focus goal!',
                priority: 'normal' as const,
                userId: mockUser.id,
                scheduledFor: new Date(Date.now() + 120000),
                sound: 'motivational',
                badge: 0,
                data: { progress: 80 },
                actions: ['view_progress' as const, 'dismiss' as const],
            };

            const onlineResult = await notificationService.scheduleNotification(notificationData);
            expect(onlineResult.success).toBe(true);

            // Go offline during processing
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            // Should queue for retry when back online
            const queuedNotifications = await offlineManager.getQueuedNotifications(mockUser.id);
            expect(queuedNotifications.some(n =>
                n.notificationData.type === 'daily_goal'
            )).toBe(true);
        });
    });

    describe('Data Consistency', () => {
        it('should maintain notification data integrity across offline/online cycles', async () => {
            const originalNotification = {
                type: 'streak_celebration' as const,
                category: 'achievements' as const,
                title: '7-Day Focus Streak!',
                message: 'Amazing! You\'ve maintained focus for 7 consecutive days.',
                priority: 'high' as const,
                userId: mockUser.id,
                scheduledFor: new Date(Date.now() + 1800000), // 30 minutes
                sound: 'celebration',
                badge: 1,
                data: {
                    streakCount: 7,
                    previousStreak: 5,
                    achievementId: 'seven_day_streak'
                },
                actions: ['view_streak' as const, 'share_achievement' as const],
            };

            // Schedule offline
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            const scheduleResult = await notificationService.scheduleNotification(originalNotification);
            expect(scheduleResult.success).toBe(true);

            // Sync online
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            await syncService.syncPendingNotifications(mockUser.id);

            // Verify data integrity
            const syncedNotifications = await offlineManager.getSyncedNotifications(mockUser.id);
            const synced = syncedNotifications[0];

            expect(synced.notificationData).toEqual(originalNotification);
            expect(synced.notificationData.data.streakCount).toBe(7);
            expect(synced.notificationData.data.achievementId).toBe('seven_day_streak');
            expect(synced.notificationData.priority).toBe('high');
        });
    });

    describe('Performance Under Load', () => {
        it('should handle large numbers of offline notifications', async () => {
            networkService.simulateOffline();
            offlineManager.setOfflineMode(true);

            // Schedule 100 notifications offline
            const notifications = Array.from({ length: 100 }, (_, i) => ({
                type: 'quick_reminder' as const,
                category: 'reminders' as const,
                title: `Reminder ${i + 1}`,
                message: `This is reminder number ${i + 1}`,
                priority: 'low' as const,
                userId: mockUser.id,
                scheduledFor: new Date(Date.now() + (i + 1) * 60000),
                sound: 'gentle',
                badge: 0,
                data: { reminderId: `reminder-${i + 1}` },
                actions: ['dismiss' as const],
            }));

            const startTime = Date.now();
            const scheduleResults = await Promise.all(
                notifications.map(notification => notificationService.scheduleNotification(notification))
            );
            const endTime = Date.now();

            // All should succeed
            expect(scheduleResults.every(result => result.success)).toBe(true);

            // Should complete within reasonable time (under 5 seconds for 100 notifications)
            expect(endTime - startTime).toBeLessThan(5000);

            // All should be queued
            const queuedNotifications = await offlineManager.getQueuedNotifications(mockUser.id);
            expect(queuedNotifications).toHaveLength(100);

            // Sync should also be efficient
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            const syncStartTime = Date.now();
            await syncService.syncPendingNotifications(mockUser.id);
            const syncEndTime = Date.now();

            // Sync should complete within reasonable time
            expect(syncEndTime - syncStartTime).toBeLessThan(10000);

            // All should be synced
            const syncedNotifications = await offlineManager.getSyncedNotifications(mockUser.id);
            expect(syncedNotifications).toHaveLength(100);
        });
    });

    describe('Error Recovery', () => {
        it('should recover from corrupted notification queue', async () => {
            // Set up corrupted queue data
            const corruptedQueue = [
                {
                    id: 'corrupted-1',
                    notificationData: null, // Corrupted data
                    priority: 'normal',
                    scheduledTime: new Date(),
                    retryCount: 3,
                    maxRetries: 3,
                    createdAt: new Date(),
                },
                {
                    id: 'valid-1',
                    notificationData: {
                        type: 'timer_complete' as const,
                        category: 'timers' as const,
                        title: 'Valid Notification',
                        message: 'This notification is valid',
                        priority: 'normal' as const,
                        userId: mockUser.id,
                        scheduledFor: new Date(),
                        sound: 'default',
                        badge: 0,
                        data: {},
                        actions: ['dismiss' as const],
                    },
                    priority: 'normal',
                    scheduledTime: new Date(),
                    retryCount: 0,
                    maxRetries: 3,
                    createdAt: new Date(),
                },
            ];

            await offlineManager.setQueuedNotifications(mockUser.id, corruptedQueue);

            // Attempt to sync
            networkService.simulateOnline();
            offlineManager.setOfflineMode(false);

            const syncResult = await syncService.syncPendingNotifications(mockUser.id);

            // Should handle corrupted data gracefully
            expect(syncResult.success).toBe(true);
            expect(syncResult.syncedCount).toBe(1); // Only valid notification synced
            expect(syncResult.errorCount).toBe(1); // Corrupted notification handled as error

            // Valid notification should be synced
            const syncedNotifications = await offlineManager.getSyncedNotifications(mockUser.id);
            expect(syncedNotifications).toHaveLength(1);
            expect(syncedNotifications[0].notificationData.title).toBe('Valid Notification');
        });
    });
});