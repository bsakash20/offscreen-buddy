/**
 * Notification Integration Guide for OffScreen Buddy
 * Complete integration examples and best practices
 */

import { notificationService } from './NotificationService';
import { NotificationType, NotificationCategory, NotificationPriority, NotificationAction } from './types';
import { AnalyticsService } from '../Premium/AnalyticsService';
import { crashReportingService } from '../CrashReportingService';
import { hapticManager } from '../../_utils/HapticManager';
import { soundManager } from '../../_utils/SoundManager';
import { logger } from '../../_utils/Logger';

// Timer integration examples
export class TimerNotificationIntegration {
    /**
     * Setup timer completion notifications
     */
    static async setupTimerNotifications(timerId: string, duration: number): Promise<void> {
        try {
            const completionTime = new Date(Date.now() + duration * 1000);

            // Schedule completion notification
            await notificationService.scheduleNotification({
                type: NotificationType.TIMER_COMPLETE,
                category: NotificationCategory.TIMERS,
                title: 'Focus Session Complete! 🎉',
                message: 'Great job! Your focus session has ended. Time for a well-deserved break.',
                priority: NotificationPriority.HIGH,
                userId: 'current-user', // Replace with actual user ID
                sessionId: timerId,
                scheduledFor: completionTime,
                actions: [NotificationAction.VIEW_TIMER, NotificationAction.STOP_SESSION]
            });

            // Schedule milestone notifications (every 25 minutes)
            const milestones = [25, 50, 75]; // 25% intervals
            milestones.forEach((milestone) => {
                const milestoneTime = new Date(completionTime.getTime() - (milestone * 60 * 1000));
                if (milestoneTime > new Date()) {
                    notificationService.scheduleNotification({
                        type: NotificationType.QUICK_REMINDER,
                        category: NotificationCategory.MOTIVATIONAL,
                        title: `${milestone}% Complete! 💪`,
                        message: `You're ${milestone}% through your focus session. Keep it up!`,
                        priority: NotificationPriority.NORMAL,
                        userId: 'current-user',
                        sessionId: timerId,
                        scheduledFor: milestoneTime,
                    });
                }
            });

            console.log(`Timer notifications scheduled for ${timerId}`);
        } catch (error) {
            console.error('Failed to setup timer notifications:', error);
        }
    }

    /**
     * Handle timer pause with smart feedback
     */
    static async handleTimerPause(sessionId: string): Promise<void> {
        try {
            await hapticManager.triggerTimerAction('pause');
            await soundManager.playTimerSound('pause');

            // Send low-priority pause confirmation
            await notificationService.sendImmediateNotification({
                type: NotificationType.TIMER_PAUSE,
                category: NotificationCategory.TIMERS,
                title: 'Session Paused',
                message: 'Focus session is paused. Take your time!',
                priority: NotificationPriority.LOW,
                userId: 'current-user',
                sessionId,
                silent: true, // No sound to avoid distraction
            });
        } catch (error) {
            console.error('Failed to handle timer pause:', error);
        }
    }

    /**
     * Handle timer resume
     */
    static async handleTimerResume(sessionId: string): Promise<void> {
        try {
            await hapticManager.triggerTimerAction('resume');
            await soundManager.playTimerSound('resume');

            await notificationService.sendImmediateNotification({
                type: NotificationType.TIMER_RESUME,
                category: NotificationCategory.TIMERS,
                title: 'Back to Focus! 🚀',
                message: 'Session resumed. Let\'s get back to it!',
                priority: NotificationPriority.NORMAL,
                userId: 'current-user',
                sessionId,
            });
        } catch (error) {
            console.error('Failed to handle timer resume:', error);
        }
    }
}

// Milestone integration examples
export class MilestoneNotificationIntegration {
    /**
     * Send achievement notification
     */
    static async sendAchievementNotification(
        milestoneId: string,
        milestoneType: string,
        achievementData: any
    ): Promise<void> {
        try {
            // Trigger celebration feedback
            await soundManager.playCompletionFanfare();
            await hapticManager.triggerTimerAction('complete');

            // Send achievement notification
            await notificationService.sendImmediateNotification({
                type: NotificationType.MILESTONE_ACHIEVEMENT,
                category: NotificationCategory.ACHIEVEMENTS,
                title: `🏆 ${milestoneType} Achievement Unlocked!`,
                message: `Incredible work! You've just achieved a major ${milestoneType} milestone.`,
                priority: NotificationPriority.HIGH,
                userId: 'current-user',
                data: { milestoneId, achievementData },
                actions: [NotificationAction.VIEW_MILESTONES, NotificationAction.COMPLETE_TASK],
                badge: 1, // Update app badge
            });

            // Schedule streak celebration if applicable
            if (achievementData.streak) {
                setTimeout(() => {
                    this.sendStreakCelebration(achievementData.streak);
                }, 2000); // Delay to avoid overwhelming user
            }
        } catch (error) {
            console.error('Failed to send achievement notification:', error);
        }
    }

    /**
     * Send streak celebration
     */
    static async sendStreakCelebration(streakData: { days: number; type: string }): Promise<void> {
        try {
            const { days, type } = streakData;

            let message = '';
            let title = '';

            if (days >= 30) {
                title = '🔥 Incredible! 30-Day Streak!';
                message = `You've maintained a ${type} streak for 30 consecutive days! You're a legend!`;
            } else if (days >= 7) {
                title = '🔥 Week Warrior!';
                message = `7 days strong! Your ${type} streak is building real momentum!`;
            } else {
                title = '🔥 Streak Building!';
                message = `${days} days in a row! Your ${type} consistency is improving!`;
            }

            await notificationService.sendImmediateNotification({
                type: NotificationType.STREAK_CELEBRATION,
                category: NotificationCategory.ACHIEVEMENTS,
                title,
                message,
                priority: NotificationPriority.HIGH,
                userId: 'current-user',
                data: streakData,
                actions: [NotificationAction.VIEW_MILESTONES],
            });
        } catch (error) {
            console.error('Failed to send streak celebration:', error);
        }
    }
}

// Habit reminder integration
export class HabitNotificationIntegration {
    /**
     * Setup smart habit reminders
     */
    static async setupHabitReminders(habitId: string, habitName: string, schedule: any): Promise<void> {
        try {
            const currentTime = new Date();
            const reminders = this.generateSmartReminders(habitName, schedule);

            for (const reminder of reminders) {
                await notificationService.scheduleNotification({
                    type: NotificationType.HABIT_REMINDER,
                    category: NotificationCategory.REMINDERS,
                    title: `Time for ${habitName}! 💪`,
                    message: reminder.message,
                    priority: this.getReminderPriority(reminder.timeUntil, schedule.frequency),
                    userId: 'current-user',
                    data: { habitId, habitName, reminderType: reminder.type },
                    scheduledFor: reminder.time,
                    actions: [NotificationAction.COMPLETE_TASK, NotificationAction.SNOOZE]
                });
            }
        } catch (error) {
            console.error('Failed to setup habit reminders:', error);
        }
    }

    /**
     * Generate smart reminder times based on user's pattern
     */
    private static generateSmartReminders(habitName: string, schedule: any): any[] {
        const reminders = [];
        const now = new Date();
        const baseTime = new Date();

        // Morning reminder (if habit scheduled for morning)
        if (schedule.morning) {
            const morningTime = new Date();
            morningTime.setHours(8, 0, 0, 0); // 8 AM

            reminders.push({
                time: morningTime,
                type: 'morning',
                message: `Start your day right with ${habitName}!`,
            });
        }

        // Afternoon reminder
        const afternoonTime = new Date();
        afternoonTime.setHours(14, 0, 0, 0); // 2 PM

        reminders.push({
            time: afternoonTime,
            type: 'afternoon',
            message: `Perfect time for ${habitName}. How about now?`,
        });

        // Evening reminder
        const eveningTime = new Date();
        eveningTime.setHours(19, 0, 0, 0); // 7 PM

        reminders.push({
            time: eveningTime,
            type: 'evening',
            message: `Wind down with ${habitName}. You got this!`,
        });

        return reminders;
    }

    /**
     * Determine reminder priority based on time and frequency
     */
    private static getReminderPriority(timeUntil: number, frequency: string): NotificationPriority {
        const minutesUntil = timeUntil / (1000 * 60);

        if (frequency === 'daily' && minutesUntil <= 60) {
            return NotificationPriority.HIGH;
        }

        return NotificationPriority.NORMAL;
    }
}

// Smart break integration
export class BreakNotificationIntegration {
    /**
     * Setup smart break reminders during long sessions
     */
    static async scheduleSmartBreak(sessionId: string, focusDuration: number): Promise<void> {
        try {
            // Schedule break after 45 minutes of focus
            const breakTime = new Date(Date.now() + 45 * 60 * 1000);
            const breakDuration = 5; // 5 minutes

            await notificationService.scheduleNotification({
                type: NotificationType.BREAK_REMINDER,
                category: NotificationCategory.REMINDERS,
                title: 'Time for a Break! ☕',
                message: `You've been focused for a while. Take ${breakDuration} minutes to recharge.`,
                priority: NotificationPriority.NORMAL,
                userId: 'current-user',
                sessionId,
                data: { breakDuration, focusDuration },
                scheduledFor: breakTime,
                actions: [NotificationAction.STOP_SESSION, NotificationAction.SNOOZE]
            });

            // Schedule post-break reminder
            const postBreakTime = new Date(breakTime.getTime() + breakDuration * 60 * 1000);
            await notificationService.scheduleNotification({
                type: NotificationType.FOCUS_REMINDER,
                category: NotificationCategory.MOTIVATIONAL,
                title: 'Break Over - Ready to Continue? 🚀',
                message: 'Your break is complete. Ready to get back to it?',
                priority: NotificationPriority.LOW,
                userId: 'current-user',
                sessionId,
                scheduledFor: postBreakTime,
                actions: [NotificationAction.START_SESSION],
            });
        } catch (error) {
            console.error('Failed to schedule smart break:', error);
        }
    }
}

// Integration hooks for app initialization
export class NotificationIntegrationHooks {
    /**
     * Initialize notification system in app startup
     */
    static async initializeNotificationSystem(): Promise<void> {
        try {
            // Initialize the notification service
            const result = await notificationService.initialize();

            if (!result.success) {
                console.error('Failed to initialize notification service:', result.error);
                return;
            }

            console.log('Notification system initialized successfully');

            // Register for push token updates
            const status = notificationService.getStatus();
            if (status.pushToken) {
                await this.registerPushToken(status.pushToken);
            }
        } catch (error) {
            console.error('Failed to initialize notification system:', error);
        }
    }

    /**
     * Register push token with backend
     */
    private static async registerPushToken(pushToken: string): Promise<void> {
        try {
            // This would call your backend API to register the token
            const response = await fetch('http://localhost:3001/api/notifications/register-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add authentication headers here
                },
                body: JSON.stringify({
                    userId: 'current-user', // Replace with actual user ID from auth
                    pushToken,
                    deviceInfo: {
                        platform: 'mobile',
                        appVersion: '1.0.0',
                        timestamp: new Date().toISOString(),
                    },
                }),
            });

            const result = await response.json();

            if (result.success) {
                console.log('Push token registered successfully');
            } else {
                console.error('Failed to register push token:', result.error);
            }
        } catch (error) {
            console.error('Error registering push token:', error);
        }
    }

    /**
     * Setup notification action handlers
     */
    static setupNotificationActions(): void {
        // This would integrate with your navigation system
        // Example with React Navigation:
        /*
        const actions = notificationService.getActionsHandler();
        actions.registerCustomHandler('view_timer', async (data) => {
          navigation.navigate('Timer', { sessionId: data.sessionId });
        });
        */
    }

    /**
     * Handle app foreground/background transitions
     */
    static setupAppStateHandlers(): void {
        // This would handle app state changes
        // Example integration with AppState:
        /*
        import { AppState } from 'react-native';
        
        AppState.addEventListener('change', (nextAppState) => {
          if (nextAppState === 'active') {
            // App came to foreground - process any pending notifications
            notificationService.processQueue();
          } else if (nextAppState === 'background') {
            // App went to background - enable smart scheduling
            notificationService.enableSmartScheduling();
          }
        });
        */
    }
}

// Example usage in app components
export const NotificationUsageExamples = {
    /**
     * Example: Timer component integration
     */
    TimerComponent: {
        onTimerStart: async (duration: number) => {
            await TimerNotificationIntegration.setupTimerNotifications('session-123', duration);
            await hapticManager.triggerTimerAction('start');
        },

        onTimerComplete: async () => {
            await soundManager.playCompletionFanfare();
            // Achievement notification will be sent by the notification service
        },
    },

    /**
     * Example: Milestone component integration
     */
    MilestoneComponent: {
        onMilestoneAchieved: async (milestone: any) => {
            await MilestoneNotificationIntegration.sendAchievementNotification(
                milestone.id,
                milestone.type,
                milestone
            );
        },
    },

    /**
     * Example: Settings component integration
     */
    SettingsComponent: {
        onNotificationToggle: async (enabled: boolean) => {
            const result = await notificationService.updateUserPreferences('current-user', {
                enabled,
            });

            if (result.success) {
                console.log('Notification preferences updated');
            }
        },
    },
};

export default {
    TimerNotificationIntegration,
    MilestoneNotificationIntegration,
    HabitNotificationIntegration,
    BreakNotificationIntegration,
    NotificationIntegrationHooks,
    NotificationUsageExamples,
};