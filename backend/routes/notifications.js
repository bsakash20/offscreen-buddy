/**
 * Notification Routes for OffScreen Buddy Backend
 * Handles all notification-related API endpoints
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/NotificationService');
const { body, validationResult } = require('express-validator');

// Middleware to validate request body
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
};

/**
 * POST /api/notifications/register-token
 * Register user's push notification token
 */
router.post('/register-token', [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('pushToken').isString().notEmpty().withMessage('Push token is required'),
    body('deviceInfo').optional().isObject().withMessage('Device info must be an object'),
], validateRequest, async (req, res) => {
    try {
        const { userId, pushToken, deviceInfo } = req.body;

        console.log(`Registering push token for user: ${userId}`);

        const result = await notificationService.registerPushToken(userId, pushToken);

        if (result.success) {
            // Store additional device info if provided
            if (deviceInfo) {
                console.log(`Device info received for user ${userId}:`, deviceInfo);
            }

            res.json({
                success: true,
                message: result.message,
                userId
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error in register-token route:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/notifications/send
 * Send a push notification to a user
 */
router.post('/send', [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('notification').isObject().withMessage('Notification object is required'),
    body('notification.title').isString().notEmpty().withMessage('Notification title is required'),
    body('notification.message').isString().notEmpty().withMessage('Notification message is required'),
    body('notification.type').isString().optional().withMessage('Notification type must be a string'),
    body('notification.priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('Invalid priority'),
], validateRequest, async (req, res) => {
    try {
        const { userId, notification } = req.body;

        // Add server-generated metadata
        notification.id = notification.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        notification.timestamp = Date.now();
        notification.serverTimestamp = new Date().toISOString();

        console.log(`Sending notification to user ${userId}:`, notification.title);

        const result = await notificationService.sendPushNotification(userId, notification);

        res.json({
            success: result.success,
            message: result.message,
            ticketId: result.ticketId,
            notificationId: notification.id
        });
    } catch (error) {
        console.error('Error in send notification route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send notification'
        });
    }
});

/**
 * POST /api/notifications/schedule
 * Schedule a notification for future delivery
 */
router.post('/schedule', [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('notification').isObject().withMessage('Notification object is required'),
    body('scheduledTime').isISO8601().withMessage('Valid scheduled time is required'),
], validateRequest, async (req, res) => {
    try {
        const { userId, notification, scheduledTime } = req.body;

        // Validate scheduled time is in the future
        const scheduleDate = new Date(scheduledTime);
        if (scheduleDate <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'Scheduled time must be in the future'
            });
        }

        notification.id = notification.id || `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log(`Scheduling notification for user ${userId} at ${scheduledTime}`);

        const result = await notificationService.scheduleNotification(userId, notification, scheduledTime);

        res.json(result);
    } catch (error) {
        console.error('Error in schedule notification route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to schedule notification'
        });
    }
});

/**
 * DELETE /api/notifications/cancel/:notificationId
 * Cancel a scheduled notification
 */
router.delete('/cancel/:notificationId', async (req, res) => {
    try {
        const { notificationId } = req.params;

        console.log(`Cancelling notification: ${notificationId}`);

        const result = await notificationService.cancelScheduledNotification(notificationId);

        res.json(result);
    } catch (error) {
        console.error('Error in cancel notification route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel notification'
        });
    }
});

/**
 * POST /api/notifications/batch-send
 * Send notifications to multiple users
 */
router.post('/batch-send', [
    body('notifications').isArray({ min: 1 }).withMessage('Notifications array is required'),
    body('notifications.*.userId').isString().notEmpty().withMessage('User ID is required for each notification'),
    body('notifications.*.notification').isObject().withMessage('Valid notification object is required'),
], validateRequest, async (req, res) => {
    try {
        const { notifications } = req.body;

        console.log(`Batch sending ${notifications.length} notifications`);

        // Add server metadata to each notification
        const enrichedNotifications = notifications.map(item => ({
            ...item,
            notification: {
                ...item.notification,
                id: item.notification.id || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: Date.now(),
                serverTimestamp: new Date().toISOString()
            }
        }));

        const result = await notificationService.sendBatchNotifications(enrichedNotifications);

        res.json(result);
    } catch (error) {
        console.error('Error in batch send route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send batch notifications'
        });
    }
});

/**
 * GET /api/notifications/history/:userId
 * Get user's notification history
 */
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 50;

        console.log(`Getting notification history for user: ${userId}`);

        const result = notificationService.getNotificationHistory(userId, limit);

        res.json(result);
    } catch (error) {
        console.error('Error in get history route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get notification history'
        });
    }
});

/**
 * POST /api/notifications/smart-send
 * Send notification with smart scheduling based on user behavior
 */
router.post('/smart-send', [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('notification').isObject().withMessage('Notification object is required'),
    body('context').optional().isObject().withMessage('Context must be an object'),
], validateRequest, async (req, res) => {
    try {
        const { userId, notification, context } = req.body;

        // Implement smart scheduling logic
        let scheduledTime = new Date();

        // Check if user is in focus mode (from context)
        if (context?.isFocused && context?.skipDuringFocus) {
            // Delay by 5 minutes if user is focused
            scheduledTime = new Date(Date.now() + 5 * 60 * 1000);
        }

        // Check do-not-disturb hours
        if (context?.doNotDisturbEnabled) {
            const currentHour = scheduledTime.getHours();
            const dndStart = parseInt(context.dndStart?.split(':')[0] || '22');
            const dndEnd = parseInt(context.dndEnd?.split(':')[0] || '7');

            if (currentHour >= dndStart || currentHour < dndEnd) {
                // Schedule for after DND period
                scheduledTime.setDate(scheduledTime.getDate() + 1);
                scheduledTime.setHours(dndEnd, 0, 0, 0);
            }
        }

        notification.id = notification.id || `smart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log(`Smart scheduling notification for user ${userId} at ${scheduledTime}`);

        const result = await notificationService.scheduleNotification(userId, notification, scheduledTime);

        res.json({
            ...result,
            scheduledTime: scheduledTime.toISOString(),
            reasoning: 'Smart scheduling applied based on user context'
        });
    } catch (error) {
        console.error('Error in smart-send route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to smart schedule notification'
        });
    }
});

/**
 * GET /api/notifications/stats
 * Get notification service statistics (admin only)
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = notificationService.getStats();

        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error in stats route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get notification stats'
        });
    }
});

/**
 * POST /api/notifications/cleanup-tokens
 * Clean up expired push tokens (admin only)
 */
router.post('/cleanup-tokens', async (req, res) => {
    try {
        console.log('Starting token cleanup...');

        const result = await notificationService.cleanupExpiredTokens();

        res.json(result);
    } catch (error) {
        console.error('Error in cleanup-tokens route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cleanup tokens'
        });
    }
});

/**
 * POST /api/notifications/test
 * Send a test notification (development only)
 */
router.post('/test', [
    body('userId').isString().notEmpty().withMessage('User ID is required'),
    body('type').optional().isIn(['success', 'warning', 'error', 'info']).withMessage('Invalid test type'),
], validateRequest, async (req, res) => {
    try {
        if (process.env.NODE_ENV === 'production') {
            return res.status(403).json({
                success: false,
                error: 'Test endpoint not available in production'
            });
        }

        const { userId, type = 'info' } = req.body;

        const testNotifications = {
            success: {
                title: 'Test Success Notification 🎉',
                message: 'Everything is working perfectly! Your notifications are flowing smoothly.',
                type: 'milestone_achievement',
                priority: 'normal'
            },
            warning: {
                title: 'Test Warning Notification ⚠️',
                message: 'This is a test warning. Check your notification preferences.',
                type: 'break_reminder',
                priority: 'normal'
            },
            error: {
                title: 'Test Error Notification ❌',
                message: 'Something went wrong. Please check your notification settings.',
                type: 'urgent_alert',
                priority: 'high'
            },
            info: {
                title: 'Test Info Notification ℹ️',
                message: 'This is a test notification to verify your setup is working correctly.',
                type: 'quick_reminder',
                priority: 'low'
            }
        };

        const testNotification = {
            ...testNotifications[type],
            id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: Date.now()
        };

        console.log(`Sending test notification to user ${userId}:`, testNotification.title);

        const result = await notificationService.sendPushNotification(userId, testNotification);

        res.json({
            ...result,
            testType: type,
            notification: testNotification
        });
    } catch (error) {
        console.error('Error in test notification route:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send test notification'
        });
    }
});

module.exports = router;