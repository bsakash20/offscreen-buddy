/**
 * Notification Actions Handler for OffScreen Buddy
 * Handles actions triggered by notification interactions
 */

import { NavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';
import { NotificationAction, ActionResult } from './types';
import { logger } from '../../utils/Logger';
import { hapticManager } from '../../utils/HapticManager';
import { soundManager } from '../../utils/SoundManager';

export class NotificationActions {
    private navigationRef?: NavigationContainerRef;
    private isInitialized = false;

    initialize(navigationRef?: NavigationContainerRef): void {
        this.navigationRef = navigationRef;
        this.isInitialized = true;
        logger.info('NotificationActions initialized');
    }

    async handleAction(action: NotificationAction, data?: Record<string, any>): Promise<ActionResult> {
        try {
            if (!this.isInitialized) {
                throw new Error('NotificationActions not initialized');
            }

            logger.info('Handling notification action', { action, data });

            let result: ActionResult = { success: false, message: 'Unknown action' };

            switch (action) {
                case NotificationAction.VIEW_TIMER:
                    result = await this.handleViewTimer(data);
                    break;
                case NotificationAction.START_SESSION:
                    result = await this.handleStartSession(data);
                    break;
                case NotificationAction.PAUSE_SESSION:
                    result = await this.handlePauseSession(data);
                    break;
                case NotificationAction.STOP_SESSION:
                    result = await this.handleStopSession(data);
                    break;
                case NotificationAction.VIEW_MILESTONES:
                    result = await this.handleViewMilestones(data);
                    break;
                case NotificationAction.VIEW_SETTINGS:
                    result = await this.handleViewSettings(data);
                    break;
                case NotificationAction.DISMISS:
                    result = await this.handleDismiss(data);
                    break;
                case NotificationAction.SNOOZE:
                    result = await this.handleSnooze(data);
                    break;
                case NotificationAction.COMPLETE_TASK:
                    result = await this.handleCompleteTask(data);
                    break;
                default:
                    result = {
                        success: false,
                        message: `Unknown action: ${action}`,
                    };
            }

            return result;
        } catch (error) {
            logger.error('Failed to handle notification action:', error);
            return {
                success: false,
                message: 'Failed to process action',
            };
        }
    }

    private async handleViewTimer(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Navigate to timer screen
            if (this.navigationRef) {
                this.navigationRef.navigate('Timer', { sessionId: data?.sessionId });
            }

            return {
                success: true,
                message: 'Navigated to timer screen',
                redirectTo: 'Timer',
            };
        } catch (error) {
            logger.error('Failed to view timer:', error);
            return {
                success: false,
                message: 'Failed to open timer',
            };
        }
    }

    private async handleStartSession(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Start a new timer session
            if (this.navigationRef) {
                this.navigationRef.navigate('Timer', { action: 'start', duration: data?.duration });
            }

            // Play start sound
            await soundManager.playTimerSound('start');

            return {
                success: true,
                message: 'Starting new session',
                redirectTo: 'Timer',
                additionalData: { action: 'start_session' },
            };
        } catch (error) {
            logger.error('Failed to start session:', error);
            return {
                success: false,
                message: 'Failed to start session',
            };
        }
    }

    private async handlePauseSession(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Pause current timer session
            if (this.navigationRef) {
                this.navigationRef.navigate('Timer', { action: 'pause', sessionId: data?.sessionId });
            }

            await soundManager.playTimerSound('pause');

            return {
                success: true,
                message: 'Paused session',
                redirectTo: 'Timer',
                additionalData: { action: 'pause_session' },
            };
        } catch (error) {
            logger.error('Failed to pause session:', error);
            return {
                success: false,
                message: 'Failed to pause session',
            };
        }
    }

    private async handleStopSession(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Stop current timer session
            if (this.navigationRef) {
                this.navigationRef.navigate('Timer', { action: 'stop', sessionId: data?.sessionId });
            }

            await soundManager.playTimerSound('cancel');

            return {
                success: true,
                message: 'Stopped session',
                redirectTo: 'Timer',
                additionalData: { action: 'stop_session' },
            };
        } catch (error) {
            logger.error('Failed to stop session:', error);
            return {
                success: false,
                message: 'Failed to stop session',
            };
        }
    }

    private async handleViewMilestones(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Navigate to milestones screen
            if (this.navigationRef) {
                this.navigationRef.navigate('Milestones');
            }

            await hapticManager.trigger('mediumTap');

            return {
                success: true,
                message: 'Opened milestones',
                redirectTo: 'Milestones',
            };
        } catch (error) {
            logger.error('Failed to view milestones:', error);
            return {
                success: false,
                message: 'Failed to open milestones',
            };
        }
    }

    private async handleViewSettings(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Navigate to settings screen
            if (this.navigationRef) {
                this.navigationRef.navigate('Settings');
            }

            await hapticManager.trigger('lightTap');

            return {
                success: true,
                message: 'Opened settings',
                redirectTo: 'Settings',
            };
        } catch (error) {
            logger.error('Failed to view settings:', error);
            return {
                success: false,
                message: 'Failed to open settings',
            };
        }
    }

    private async handleDismiss(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Simply acknowledge the dismiss action
            await hapticManager.trigger('lightTap');

            return {
                success: true,
                message: 'Notification dismissed',
                additionalData: { action: 'dismiss', notificationId: data?.notificationId },
            };
        } catch (error) {
            logger.error('Failed to dismiss:', error);
            return {
                success: false,
                message: 'Failed to dismiss',
            };
        }
    }

    private async handleSnooze(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Snooze the notification for a specified time
            const snoozeTime = data?.snoozeTime || 300; // Default 5 minutes
            const snoozeUntil = new Date(Date.now() + snoozeTime * 1000);

            await hapticManager.trigger('mediumTap');

            return {
                success: true,
                message: `Notification snoozed until ${snoozeUntil.toLocaleTimeString()}`,
                additionalData: {
                    action: 'snooze',
                    notificationId: data?.notificationId,
                    snoozeUntil: snoozeUntil.toISOString(),
                },
            };
        } catch (error) {
            logger.error('Failed to snooze:', error);
            return {
                success: false,
                message: 'Failed to snooze notification',
            };
        }
    }

    private async handleCompleteTask(data?: Record<string, any>): Promise<ActionResult> {
        try {
            // Mark a task as complete
            await soundManager.playCompletionFanfare();
            await hapticManager.trigger('success');

            return {
                success: true,
                message: 'Task completed!',
                additionalData: {
                    action: 'complete_task',
                    taskId: data?.taskId,
                    completedAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            logger.error('Failed to complete task:', error);
            return {
                success: false,
                message: 'Failed to complete task',
            };
        }
    }

    // Register custom action handlers
    registerCustomHandler(action: string, handler: (data?: Record<string, any>) => Promise<ActionResult>): void {
        // This would allow custom action handlers to be registered
        logger.info('Custom action handler registered', { action });
    }

    // Get available actions for a notification type
    getAvailableActions(notificationType: string): NotificationAction[] {
        const actionMap: Record<string, NotificationAction[]> = {
            timer_complete: [
                NotificationAction.VIEW_TIMER,
                NotificationAction.START_SESSION,
                NotificationAction.DISMISS,
            ],
            timer_start: [
                NotificationAction.VIEW_TIMER,
                NotificationAction.PAUSE_SESSION,
                NotificationAction.STOP_SESSION,
            ],
            milestone_achievement: [
                NotificationAction.VIEW_MILESTONES,
                NotificationAction.COMPLETE_TASK,
                NotificationAction.DISMISS,
            ],
            break_reminder: [
                NotificationAction.START_SESSION,
                NotificationAction.SNOOZE,
                NotificationAction.DISMISS,
            ],
            urgent_alert: [
                NotificationAction.VIEW_TIMER,
                NotificationAction.VIEW_SETTINGS,
                NotificationAction.DISMISS,
            ],
        };

        return actionMap[notificationType] || [NotificationAction.DISMISS];
    }

    dispose(): void {
        this.navigationRef = undefined;
        this.isInitialized = false;
        logger.info('NotificationActions disposed');
    }
}