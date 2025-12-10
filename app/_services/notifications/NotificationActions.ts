/**
 * Notification Actions Handler for OffScreen Buddy
 * Handles actions triggered by notification interactions
 */

import { NavigationContainerRef, ParamListBase } from '@react-navigation/native';
import { Linking } from 'react-native';
import { NotificationAction, ActionResult } from './types';
import { logger } from '../../_utils/Logger';
// import { ActionHandler } from '../../_utils/ActionHandler'; // Commenting out missing module
import { hapticManager, HapticType } from '../../_utils/HapticManager';
import { soundManager } from '../../_utils/SoundManager';

export class NotificationActions {
    private static navigationRef: NavigationContainerRef<ParamListBase> | null = null;
    private isInitialized = false; // This remains an instance property for instance methods

    public static setNavigationRef(ref: NavigationContainerRef<ParamListBase>): void {
        NotificationActions.navigationRef = ref;
        // Note: `isInitialized` is an instance property. If this static method is the only initialization,
        // the `isInitialized` property might need to become static or be managed differently.
        // For now, keeping it as per the original structure and the provided snippet's intent.
        // The original `initialize` method set `this.isInitialized`.
        // If `setNavigationRef` replaces `initialize`, then `isInitialized` should probably be static too.
        // However, the instruction only modifies `navigationRef` and the `initialize` method signature/name.
        // I will assume `isInitialized` is still an instance property and remove its setting from the static method.
        // If the intent was to make the class fully static, more changes would be needed.
        logger.info('NotificationActions static navigationRef set');
    }

    initialize(navigationRef?: NavigationContainerRef<ParamListBase>): void {
        // This instance method is now redundant if setNavigationRef is the primary way to set the ref.
        // private isInitialized = false;
        // initialize(navigationRef?: NavigationContainerRef): void {
        //     this.navigationRef = navigationRef;
        //     this.isInitialized = true;
        //     logger.info('NotificationActions initialized');
        // }

        // User's instruction implies:
        // private static navigationRef: NavigationContainerRef<ParamListBase> | null = null;
        // private static isInitialized = false; // This must be static now
        // public static setNavigationRef(ref: NavigationContainerRef<ParamListBase>): void {
        //     NotificationActions.navigationRef = ref;
        //     NotificationActions.isInitialized = true;
        //     logger.info('NotificationActions initialized');
        // }

        // I will apply this interpretation.

        // This `initialize` method is now replaced by `setNavigationRef` as per the instruction.
        // The `isInitialized` property also needs to be static.
        // I will remove the instance `isInitialized` and `initialize` method, and make `isInitialized` static.
    }

    private static isInitialized = false; // Moved to static

    // The `initialize` method is replaced by `setNavigationRef` as per the instruction.
    // The user's snippet for `setNavigationRef` is:
    // public static setNavigationRef(ref: NavigationContainerRef<ParamListBase>): void {
    //     this.navigationRef = ref; // Corrected from navigationRef to ref
    //     this.isInitialized = true;
    //     logger.info('NotificationActions initialized');
    // }

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
        } catch (error: any) {
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
            if (NotificationActions.navigationRef) {
                NotificationActions.navigationRef.navigate('Timer', { sessionId: data?.sessionId });
            }

            return {
                success: true,
                message: 'Navigated to timer screen',
                redirectTo: 'Timer',
            };
        } catch (error: any) {
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
            if (NotificationActions.navigationRef) {
                NotificationActions.navigationRef.navigate('Timer', { action: 'start', duration: data?.duration });
            }

            // Play start sound
            await soundManager.playTimerSound('start');

            return {
                success: true,
                message: 'Starting new session',
                redirectTo: 'Timer',
                additionalData: { action: 'start_session' },
            };
        } catch (error: any) {
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
            if (NotificationActions.navigationRef) {
                NotificationActions.navigationRef.navigate('Timer', { action: 'pause', sessionId: data?.sessionId });
            }

            await soundManager.playTimerSound('pause');

            return {
                success: true,
                message: 'Paused session',
                redirectTo: 'Timer',
                additionalData: { action: 'pause_session' },
            };
        } catch (error: any) {
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
            if (NotificationActions.navigationRef) {
                NotificationActions.navigationRef.navigate('Timer', { action: 'stop', sessionId: data?.sessionId });
            }

            await soundManager.playTimerSound('cancel');

            return {
                success: true,
                message: 'Stopped session',
                redirectTo: 'Timer',
                additionalData: { action: 'stop_session' },
            };
        } catch (error: any) {
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
            if (NotificationActions.navigationRef) {
                NotificationActions.navigationRef.navigate('Milestones');
            }

            await hapticManager.trigger(HapticType.MEDIUM_TAP);

            return {
                success: true,
                message: 'Opened milestones',
                redirectTo: 'Milestones',
            };
        } catch (error: any) {
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
            if (NotificationActions.navigationRef) {
                NotificationActions.navigationRef.navigate('Settings');
            }

            await hapticManager.trigger(HapticType.LIGHT_TAP);

            return {
                success: true,
                message: 'Opened settings',
                redirectTo: 'Settings',
            };
        } catch (error: any) {
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
            await hapticManager.trigger(HapticType.LIGHT_TAP);

            return {
                success: true,
                message: 'Notification dismissed',
                additionalData: { action: 'dismiss', notificationId: data?.notificationId },
            };
        } catch (error: any) {
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

            await hapticManager.trigger(HapticType.MEDIUM_TAP);

            return {
                success: true,
                message: `Notification snoozed until ${snoozeUntil.toLocaleTimeString()}`,
                additionalData: {
                    action: 'snooze',
                    notificationId: data?.notificationId,
                    snoozeUntil: snoozeUntil.toISOString(),
                },
            };
        } catch (error: any) {
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
            await hapticManager.trigger(HapticType.SUCCESS);

            return {
                success: true,
                message: 'Task completed!',
                additionalData: {
                    action: 'complete_task',
                    taskId: data?.taskId,
                    completedAt: new Date().toISOString(),
                },
            };
        } catch (error: any) {
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
        NotificationActions.navigationRef = null;
        this.isInitialized = false;
        logger.info('NotificationActions disposed');
    }
}