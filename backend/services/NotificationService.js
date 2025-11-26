/**
 * Backend Notification Service for OffScreen Buddy
 * Handles server-side notification processing, push token management, and scheduling
 */

const express = require('express');
const { Expo } = require('expo-server-sdk');
const cron = require('node-cron');
const { v4: uuidv4 } = require('uuid');

class NotificationService {
    constructor() {
        this.expo = new Expo();
        this.pushTokens = new Map(); // userId -> pushToken
        this.scheduledNotifications = new Map(); // notificationId -> scheduled job
        this.notificationHistory = new Map(); // userId -> notification[]
        this.isInitialized = false;
    }

    /**
     * Initialize the notification service
     */
    async initialize() {
        try {
            console.log('Initializing Notification Service...');

            // Setup periodic cleanup for expired tokens
            this.setupTokenCleanup();

            // Setup notification analytics processor
            this.setupAnalyticsProcessor();

            this.isInitialized = true;
            console.log('Notification Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Notification Service:', error);
            throw error;
        }
    }

    /**
     * Register user's push token
     */
    async registerPushToken(userId, pushToken) {
        try {
            if (!pushToken) {
                throw new Error('Push token is required');
            }

            // Validate Expo push token format
            if (!Expo.isExpoPushToken(pushToken)) {
                throw new Error('Invalid Expo push token format');
            }

            this.pushTokens.set(userId, pushToken);
            console.log(`Push token registered for user: ${userId}`);

            return {
                success: true,
                message: 'Push token registered successfully'
            };
        } catch (error) {
            console.error('Failed to register push token:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send push notification
     */
    async sendPushNotification(userId, notification) {
        try {
            if (!this.isInitialized) {
                throw new Error('Notification service not initialized');
            }

            const pushToken = this.pushTokens.get(userId);
            if (!pushToken) {
                throw new Error(`No push token found for user: ${userId}`);
            }

            const message = {
                to: pushToken,
                sound: notification.sound || 'default',
                title: notification.title,
                body: notification.message,
                data: {
                    notificationId: notification.id,
                    type: notification.type,
                    category: notification.category,
                    priority: notification.priority,
                    timestamp: Date.now(),
                    ...notification.data
                },
                // Platform-specific settings
                android: {
                    channelId: notification.channelId || 'default',
                    icon: notification.icon,
                    color: notification.color,
                    priority: notification.priority === 'urgent' ? 'high' : 'normal'
                },
                ios: {
                    badge: notification.badge || 0,
                    categoryIdentifier: notification.categoryIdentifier,
                    interruptionLevel: notification.interruptionLevel || 'passive'
                }
            };

            // Send the push notification
            const tickets = await this.expo.sendPushNotificationsAsync([message]);
            const ticket = tickets[0];

            // Store notification in history
            this.storeNotification(userId, notification, ticket);

            // Log for analytics
            this.logNotificationEvent('sent', {
                userId,
                notificationId: notification.id,
                type: notification.type,
                ticketId: ticket.id
            });

            console.log(`Notification sent to user ${userId}:`, notification.title);

            return {
                success: true,
                ticketId: ticket.id,
                message: 'Notification sent successfully'
            };
        } catch (error) {
            console.error('Failed to send push notification:', error);

            // Log failed notification
            this.logNotificationEvent('failed', {
                userId,
                notificationId: notification.id,
                type: notification.type,
                error: error.message
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Schedule a notification for future delivery
     */
    async scheduleNotification(userId, notification, scheduledTime) {
        try {
            const notificationId = notification.id || uuidv4();

            // Calculate delay in milliseconds
            const delay = new Date(scheduledTime).getTime() - Date.now();

            if (delay <= 0) {
                // Send immediately if scheduled time is past
                return await this.sendPushNotification(userId, notification);
            }

            // Schedule with setTimeout (for production, use Redis/Bull queue)
            const timeout = setTimeout(async () => {
                await this.sendPushNotification(userId, notification);

                // Clean up scheduled notification
                this.scheduledNotifications.delete(notificationId);
            }, Math.min(delay, 24 * 60 * 60 * 1000)); // Cap at 24 hours

            this.scheduledNotifications.set(notificationId, timeout);

            console.log(`Notification scheduled for user ${userId} at ${scheduledTime}`);

            return {
                success: true,
                notificationId,
                scheduledFor: scheduledTime,
                message: 'Notification scheduled successfully'
            };
        } catch (error) {
            console.error('Failed to schedule notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Cancel scheduled notification
     */
    async cancelScheduledNotification(notificationId) {
        try {
            const timeout = this.scheduledNotifications.get(notificationId);
            if (timeout) {
                clearTimeout(timeout);
                this.scheduledNotifications.delete(notificationId);

                console.log(`Cancelled scheduled notification: ${notificationId}`);

                return {
                    success: true,
                    message: 'Notification cancelled successfully'
                };
            } else {
                throw new Error('Scheduled notification not found');
            }
        } catch (error) {
            console.error('Failed to cancel notification:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Send batch notifications
     */
    async sendBatchNotifications(notifications) {
        try {
            const results = [];

            for (const { userId, notification } of notifications) {
                const result = await this.sendPushNotification(userId, notification);
                results.push({
                    userId,
                    ...result
                });

                // Add small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            return {
                success: true,
                results,
                totalSent: results.filter(r => r.success).length,
                totalFailed: results.filter(r => !r.success).length
            };
        } catch (error) {
            console.error('Failed to send batch notifications:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get user's notification history
     */
    getNotificationHistory(userId, limit = 50) {
        try {
            const history = this.notificationHistory.get(userId) || [];
            return {
                success: true,
                notifications: history.slice(-limit),
                total: history.length
            };
        } catch (error) {
            console.error('Failed to get notification history:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean up expired/invalid push tokens
     */
    async cleanupExpiredTokens() {
        try {
            console.log('Cleaning up expired push tokens...');

            let cleanedCount = 0;
            const validTokens = new Map();

            for (const [userId, pushToken] of this.pushTokens.entries()) {
                try {
                    // Test token validity by sending a test notification
                    await this.expo.sendPushNotificationsAsync([{
                        to: pushToken,
                        title: 'Token Validation',
                        body: 'Testing token validity',
                        data: { test: true }
                    }]);

                    // If successful, keep the token
                    validTokens.set(userId, pushToken);
                } catch (error) {
                    // If failed, remove the token
                    console.log(`Removing invalid token for user ${userId}:`, error.message);
                    cleanedCount++;
                }
            }

            // Update tokens map
            this.pushTokens.clear();
            validTokens.forEach((token, userId) => {
                this.pushTokens.set(userId, token);
            });

            console.log(`Cleaned up ${cleanedCount} expired tokens. ${validTokens.size} tokens remaining.`);

            return {
                success: true,
                cleanedCount,
                remainingTokens: validTokens.size
            };
        } catch (error) {
            console.error('Failed to cleanup expired tokens:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get service statistics
     */
    getStats() {
        return {
            initialized: this.isInitialized,
            registeredTokens: this.pushTokens.size,
            scheduledNotifications: this.scheduledNotifications.size,
            notificationHistory: Array.from(this.notificationHistory.keys()).length
        };
    }

    // Private methods

    storeNotification(userId, notification, ticket) {
        const history = this.notificationHistory.get(userId) || [];
        const notificationRecord = {
            id: notification.id || uuidv4(),
            ticketId: ticket.id,
            notification,
            timestamp: new Date(),
            status: 'sent'
        };

        history.push(notificationRecord);

        // Keep only last 100 notifications per user
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }

        this.notificationHistory.set(userId, history);
    }

    logNotificationEvent(event, data) {
        console.log(`[Notification Analytics] ${event}:`, data);
        // In production, this would send to analytics service
    }

    setupTokenCleanup() {
        // Run token cleanup every 6 hours
        setInterval(async () => {
            await this.cleanupExpiredTokens();
        }, 6 * 60 * 60 * 1000);
    }

    setupAnalyticsProcessor() {
        // Process analytics every hour
        setInterval(() => {
            this.processAnalytics();
        }, 60 * 60 * 1000);
    }

    processAnalytics() {
        // Process notification analytics
        const analytics = {
            timestamp: new Date(),
            totalUsers: this.pushTokens.size,
            totalNotifications: Array.from(this.notificationHistory.values())
                .reduce((sum, history) => sum + history.length, 0),
            activeNotifications: this.scheduledNotifications.size
        };

        console.log('[Notification Analytics] Processing:', analytics);
        // In production, send to analytics service
    }

    /**
     * Graceful shutdown
     */
    async shutdown() {
        try {
            console.log('Shutting down Notification Service...');

            // Cancel all scheduled notifications
            for (const [notificationId, timeout] of this.scheduledNotifications.entries()) {
                clearTimeout(timeout);
            }
            this.scheduledNotifications.clear();

            this.isInitialized = false;
            console.log('Notification Service shut down successfully');
        } catch (error) {
            console.error('Error during Notification Service shutdown:', error);
        }
    }
}

// Export singleton instance
const notificationService = new NotificationService();
module.exports = notificationService;