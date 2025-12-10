/**
 * Notification Scheduler for OffScreen Buddy
 * Handles intelligent notification timing and smart scheduling
 */

import { NotificationData, SmartScheduleContext, ScheduleResult, NotificationPriority } from './types';
import { NotificationService } from './NotificationService';
import { logger } from '../../_utils/Logger';

export class NotificationScheduler {
    private notificationService: NotificationService;
    private scheduledNotifications = new Map<string, NodeJS.Timeout>();
    private isInitialized = false;

    constructor(notificationService: NotificationService) {
        this.notificationService = notificationService;
    }

    async initialize(): Promise<void> {
        try {
            this.isInitialized = true;
            logger.info('NotificationScheduler initialized');
        } catch (error: any) {
            logger.error('Failed to initialize NotificationScheduler:', error);
            throw error;
        }
    }

    async getSmartSchedule(
        notification: NotificationData,
        context: SmartScheduleContext
    ): Promise<ScheduleResult> {
        try {
            const now = new Date();

            // Check if notification is urgent - send immediately
            if (notification.priority === NotificationPriority.URGENT) {
                return {
                    scheduledTime: now,
                    priority: notification.priority,
                    reason: 'Urgent notification - immediate delivery',
                    shouldSend: true,
                };
            }

            // Check do not disturb hours
            if (this.isInDoNotDisturb(context.preferences.doNotDisturb, now)) {
                if (notification.priority === NotificationPriority.HIGH) {
                    // Send at end of do not disturb period
                    const endTime = this.getDoNotDisturbEndTime(context.preferences.doNotDisturb, now);
                    return {
                        scheduledTime: endTime,
                        priority: notification.priority,
                        reason: 'Scheduled for after do-not-disturb hours',
                        shouldSend: true,
                    };
                } else {
                    return {
                        scheduledTime: now,
                        priority: notification.priority,
                        reason: 'Skipped due to do-not-disturb',
                        shouldSend: false,
                    };
                }
            }

            // Check user's focus state
            if (context.userActivity.isFocused && context.preferences.smartScheduling.skipDuringFocus) {
                if (notification.priority === NotificationPriority.HIGH) {
                    const endFocusTime = new Date(context.userActivity.lastActivity.getTime() + 60000); // 1 minute after last activity
                    return {
                        scheduledTime: endFocusTime,
                        priority: notification.priority,
                        reason: 'Scheduled for after focus period',
                        shouldSend: true,
                    };
                } else {
                    return {
                        scheduledTime: now,
                        priority: notification.priority,
                        reason: 'Skipped during focus session',
                        shouldSend: false,
                    };
                }
            }

            // Check meeting status
            if (context.userActivity.isInMeeting && context.preferences.smartScheduling.skipDuringMeetings) {
                if (notification.priority === NotificationPriority.HIGH) {
                    const afterMeetingTime = new Date(now.getTime() + 300000); // 5 minutes from now
                    return {
                        scheduledTime: afterMeetingTime,
                        priority: notification.priority,
                        reason: 'Scheduled for after meeting',
                        shouldSend: true,
                    };
                } else {
                    return {
                        scheduledTime: now,
                        priority: notification.priority,
                        reason: 'Skipped during meeting',
                        shouldSend: false,
                    };
                }
            }

            // Check notification frequency limits
            const recentNotifications = context.notificationHistory.filter(
                notification =>
                    notification.timestamp.getTime() > now.getTime() - 300000 // Last 5 minutes
            );

            const categoryPrefs = context.preferences.categories[notification.category];
            if (categoryPrefs?.frequency.maxPerDay) {
                const todayNotifications = context.notificationHistory.filter(
                    notification => notification.timestamp.toDateString() === now.toDateString()
                );

                if (todayNotifications.length >= categoryPrefs.frequency.maxPerDay) {
                    return {
                        scheduledTime: now,
                        priority: notification.priority,
                        reason: 'Daily limit reached for this category',
                        shouldSend: false,
                    };
                }
            }

            // Default to immediate scheduling
            return {
                scheduledTime: notification.scheduledFor || now,
                priority: notification.priority,
                reason: 'Default scheduling - no restrictions',
                shouldSend: true,
            };
        } catch (error: any) {
            logger.error('Failed to get smart schedule:', error);
            // Fallback to immediate scheduling
            return {
                scheduledTime: notification.scheduledFor || new Date(),
                priority: notification.priority,
                reason: 'Fallback to immediate scheduling due to error',
                shouldSend: true,
            };
        }
    }

    async scheduleTimerNotifications(timerId: string, duration: number): Promise<void> {
        try {
            // Schedule completion notification
            const completionTime = new Date(Date.now() + duration * 1000);

            // Create completion notification
            const completionNotification: NotificationData = {
                id: `timer_complete_${timerId}`,
                type: 'timer_complete' as any,
                category: 'timers' as any,
                title: 'Focus Session Complete',
                message: 'Great job! Your focus session has ended.',
                priority: NotificationPriority.HIGH,
                userId: 'current_user', // Would be actual user ID
                sessionId: timerId,
                scheduledFor: completionTime,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await this.notificationService.scheduleNotification(completionNotification);

            logger.info('Timer notifications scheduled', { timerId, duration, completionTime });
        } catch (error: any) {
            logger.error('Failed to schedule timer notifications:', error);
        }
    }

    async scheduleMilestoneNotification(milestoneId: string, milestoneType: string): Promise<void> {
        try {
            const milestoneNotification: NotificationData = {
                id: `milestone_${milestoneId}`,
                type: 'milestone_achievement' as any,
                category: 'achievements' as any,
                title: 'Milestone Achieved!',
                message: `Congratulations! You've achieved a new ${milestoneType} milestone.`,
                priority: NotificationPriority.HIGH,
                userId: 'current_user',
                data: { milestoneId, milestoneType },
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await this.notificationService.sendImmediateNotification(milestoneNotification);

            logger.info('Milestone notification sent', { milestoneId, milestoneType });
        } catch (error: any) {
            logger.error('Failed to schedule milestone notification:', error);
        }
    }

    async scheduleBreakReminder(
        sessionId: string,
        breakDuration: number,
        breakTime: Date
    ): Promise<void> {
        try {
            const breakNotification: NotificationData = {
                id: `break_${sessionId}`,
                type: 'break_reminder' as any,
                category: 'reminders' as any,
                title: 'Break Time!',
                message: `Time to take a ${breakDuration}-minute break. You've earned it!`,
                priority: NotificationPriority.NORMAL,
                userId: 'current_user',
                sessionId,
                scheduledFor: breakTime,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            await this.notificationService.scheduleNotification(breakNotification);

            logger.info('Break reminder scheduled', { sessionId, breakDuration, breakTime });
        } catch (error: any) {
            logger.error('Failed to schedule break reminder:', error);
        }
    }

    async cancelScheduledNotification(notificationId: string): Promise<void> {
        try {
            const timeout = this.scheduledNotifications.get(notificationId);
            if (timeout) {
                clearTimeout(timeout);
                this.scheduledNotifications.delete(notificationId);
                logger.info('Scheduled notification cancelled', { notificationId });
            }
        } catch (error: any) {
            logger.error('Failed to cancel scheduled notification:', error);
        }
    }

    async getScheduledNotifications(): Promise<string[]> {
        return Array.from(this.scheduledNotifications.keys());
    }

    async dispose(): Promise<void> {
        try {
            // Clear all timeouts
            this.scheduledNotifications.forEach((timeout) => {
                clearTimeout(timeout);
            });
            this.scheduledNotifications.clear();
            this.isInitialized = false;
            logger.info('NotificationScheduler disposed');
        } catch (error: any) {
            logger.error('Error disposing NotificationScheduler:', error);
        }
    }

    private isInDoNotDisturb(dnd: any, currentTime: Date): boolean {
        if (!dnd.enabled) return false;

        const now = currentTime;
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        const [startHour, startMinute] = dnd.startTime.split(':').map(Number);
        const [endHour, endMinute] = dnd.endTime.split(':').map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        // Handle overnight DND (e.g., 22:00 to 07:00)
        if (startMinutes > endMinutes) {
            return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
        }

        return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    }

    private getDoNotDisturbEndTime(dnd: any, currentTime: Date): Date {
        const [endHour, endMinute] = dnd.endTime.split(':').map(Number);
        const endTime = new Date(currentTime);
        endTime.setHours(endHour, endMinute, 0, 0);

        // If end time is earlier than current time, schedule for next day
        if (endTime <= currentTime) {
            endTime.setDate(endTime.getDate() + 1);
        }

        return endTime;
    }
}