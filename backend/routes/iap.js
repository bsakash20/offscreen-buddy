/**
 * In-App Purchase (IAP) Routes
 * Handles receipt verification, subscription management, and webhooks
 * for Apple App Store and Google Play Store purchases
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');

// Security Middleware Imports
const { securityHeaders, inputSanitization } = require('../middleware/security');
const { paymentLimiter } = require('../middleware/rateLimiter');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { logger } = require('../config/logger');

const router = express.Router();

// Security Middleware Stack
router.use(securityHeaders);
router.use(inputSanitization);
router.use(paymentLimiter);

// ============================================================================
// HEALTH CHECK
// ============================================================================

router.get('/health', asyncHandler(async (req, res) => {
    res.json({
        status: 'healthy',
        service: 'iap',
        timestamp: new Date().toISOString(),
    });
}));

// ============================================================================
// iOS RECEIPT VERIFICATION
// ============================================================================

/**
 * Verify iOS App Store receipt
 * POST /api/iap/verify-ios
 */
router.post('/verify-ios',
    authenticate,
    [
        body('userId').notEmpty().isString().withMessage('User ID is required'),
        body('productId').notEmpty().isString().withMessage('Product ID is required'),
        body('receipt').notEmpty().isString().withMessage('Receipt data is required'),
        body('transactionId').optional().isString(),
    ],
    asyncHandler(async (req, res) => {
        const requestId = req.id || uuidv4();
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            logger.warn('iOS receipt verification validation failed', {
                requestId,
                errors: errors.array(),
            });
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, productId, receipt, transactionId, originalTransactionId } = req.body;

        logger.info('iOS receipt verification requested', {
            requestId,
            userId,
            productId,
            transactionId,
        });

        try {
            // In production, you would verify the receipt with Apple's servers
            // For now, we'll trust the client and record the purchase
            // TODO: Implement Apple receipt verification API call

            const verificationResult = await verifyAppleReceipt(receipt, productId);

            if (!verificationResult.valid) {
                return res.status(400).json({
                    verified: false,
                    error: verificationResult.error || 'Invalid receipt',
                });
            }

            // Update user subscription in database
            const subscription = await updateUserSubscription(userId, {
                productId,
                transactionId,
                originalTransactionId,
                platform: 'ios',
                receipt,
                expiresAt: verificationResult.expiresAt,
            });

            logger.info('iOS receipt verified successfully', {
                requestId,
                userId,
                productId,
                subscriptionId: subscription?.id,
            });

            res.json({
                verified: true,
                subscription: {
                    active: true,
                    tier: getSubscriptionTier(productId),
                    expiresAt: subscription?.expires_at,
                    platform: 'ios',
                },
            });

        } catch (error) {
            logger.error('iOS receipt verification failed', {
                requestId,
                error: error.message,
                stack: error.stack,
            });

            res.status(500).json({
                verified: false,
                error: 'Verification failed',
            });
        }
    })
);

// ============================================================================
// ANDROID PURCHASE VERIFICATION
// ============================================================================

/**
 * Verify Android Google Play purchase
 * POST /api/iap/verify-android
 */
router.post('/verify-android',
    authenticate,
    [
        body('userId').notEmpty().isString().withMessage('User ID is required'),
        body('productId').notEmpty().isString().withMessage('Product ID is required'),
        body('purchaseToken').notEmpty().isString().withMessage('Purchase token is required'),
        body('transactionId').optional().isString(),
    ],
    asyncHandler(async (req, res) => {
        const requestId = req.id || uuidv4();
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            logger.warn('Android purchase verification validation failed', {
                requestId,
                errors: errors.array(),
            });
            return res.status(400).json({ errors: errors.array() });
        }

        const { userId, productId, purchaseToken, transactionId } = req.body;

        logger.info('Android purchase verification requested', {
            requestId,
            userId,
            productId,
            transactionId,
        });

        try {
            // In production, you would verify with Google Play Developer API
            // For now, we'll trust the client and record the purchase
            // TODO: Implement Google Play verification API call

            const verificationResult = await verifyGooglePlayPurchase(purchaseToken, productId);

            if (!verificationResult.valid) {
                return res.status(400).json({
                    verified: false,
                    error: verificationResult.error || 'Invalid purchase',
                });
            }

            // Update user subscription in database
            const subscription = await updateUserSubscription(userId, {
                productId,
                transactionId,
                purchaseToken,
                platform: 'android',
                expiresAt: verificationResult.expiresAt,
            });

            logger.info('Android purchase verified successfully', {
                requestId,
                userId,
                productId,
                subscriptionId: subscription?.id,
            });

            res.json({
                verified: true,
                subscription: {
                    active: true,
                    tier: getSubscriptionTier(productId),
                    expiresAt: subscription?.expires_at,
                    platform: 'android',
                },
            });

        } catch (error) {
            logger.error('Android purchase verification failed', {
                requestId,
                error: error.message,
                stack: error.stack,
            });

            res.status(500).json({
                verified: false,
                error: 'Verification failed',
            });
        }
    })
);

// ============================================================================
// SUBSCRIPTION STATUS
// ============================================================================

/**
 * Get user subscription status
 * GET /api/iap/subscription/:userId
 */
router.get('/subscription/:userId',
    authenticate,
    asyncHandler(async (req, res) => {
        const requestId = req.id || uuidv4();
        const { userId } = req.params;

        // Verify requesting user matches (or is admin)
        if (req.user.id !== userId && !req.user.isAdmin) {
            return res.status(403).json({
                error: 'Unauthorized to view this subscription',
            });
        }

        logger.info('Subscription status requested', {
            requestId,
            userId,
        });

        try {
            const { data: subscription, error } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            if (!subscription) {
                return res.json({
                    active: false,
                    plan: 'free',
                    tier: 'free',
                    status: 'inactive',
                    features: [],
                });
            }

            // Check if subscription is expired
            const now = new Date();
            const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;
            const isExpired = expiresAt && expiresAt < now;

            if (isExpired) {
                // Update subscription status
                await supabase
                    .from('user_subscriptions')
                    .update({ is_active: false, status: 'expired' })
                    .eq('id', subscription.id);

                return res.json({
                    active: false,
                    plan: subscription.product_id || 'free',
                    tier: 'free',
                    status: 'expired',
                    expiresDate: subscription.expires_at,
                    features: [],
                });
            }

            res.json({
                active: true,
                plan: subscription.product_id,
                tier: getSubscriptionTier(subscription.product_id),
                status: 'active',
                expiresDate: subscription.expires_at,
                features: getSubscriptionFeatures(subscription.product_id),
                autoRenew: subscription.auto_renew !== false,
                platform: subscription.platform || 'iap',
            });

        } catch (error) {
            logger.error('Subscription status fetch failed', {
                requestId,
                error: error.message,
            });

            res.status(500).json({
                error: 'Failed to fetch subscription status',
            });
        }
    })
);

// ============================================================================
// APPLE WEBHOOK
// ============================================================================

/**
 * Apple Server-to-Server Notifications (App Store Server Notifications)
 * POST /api/iap/webhook/apple
 */
router.post('/webhook/apple',
    express.raw({ type: 'application/json' }),
    asyncHandler(async (req, res) => {
        const requestId = uuidv4();

        logger.info('Apple webhook received', { requestId });

        try {
            // Parse the signed payload
            const signedPayload = req.body.signedPayload || req.body.toString();

            // TODO: Verify JWT signature
            // In production, verify the JWT signature using Apple's certificate

            // Parse notification (simplified - actual implementation needs JWT decoding)
            let notification;
            try {
                // For v2 notifications, the payload is a signed JWT
                // You would decode and verify it here
                notification = JSON.parse(signedPayload);
            } catch {
                notification = { notificationType: 'UNKNOWN' };
            }

            const { notificationType, data } = notification;

            logger.info('Apple notification received', {
                requestId,
                type: notificationType,
            });

            switch (notificationType) {
                case 'SUBSCRIBED':
                case 'DID_RENEW':
                    await handleAppleSubscriptionRenewal(data);
                    break;

                case 'DID_CHANGE_RENEWAL_STATUS':
                    await handleAppleRenewalStatusChange(data);
                    break;

                case 'EXPIRED':
                case 'DID_FAIL_TO_RENEW':
                    await handleAppleSubscriptionExpired(data);
                    break;

                case 'REFUND':
                case 'REVOKE':
                    await handleAppleRefund(data);
                    break;

                default:
                    logger.info('Unhandled Apple notification type', {
                        requestId,
                        type: notificationType,
                    });
            }

            res.status(200).send();

        } catch (error) {
            logger.error('Apple webhook processing failed', {
                requestId,
                error: error.message,
            });

            // Return 200 to prevent Apple from retrying
            res.status(200).send();
        }
    })
);

// ============================================================================
// GOOGLE WEBHOOK
// ============================================================================

/**
 * Google Real-time Developer Notifications
 * POST /api/iap/webhook/google
 */
router.post('/webhook/google',
    express.json(),
    asyncHandler(async (req, res) => {
        const requestId = uuidv4();

        logger.info('Google webhook received', { requestId });

        try {
            // Parse Pub/Sub message
            const { message } = req.body;

            if (!message || !message.data) {
                return res.status(400).json({ error: 'Invalid message format' });
            }

            // Decode base64 message data
            const decodedData = Buffer.from(message.data, 'base64').toString('utf-8');
            const notification = JSON.parse(decodedData);

            const { subscriptionNotification, oneTimeProductNotification } = notification;

            if (subscriptionNotification) {
                await handleGoogleSubscriptionNotification(subscriptionNotification);
            }

            if (oneTimeProductNotification) {
                await handleGoogleOneTimeNotification(oneTimeProductNotification);
            }

            res.status(200).json({ success: true });

        } catch (error) {
            logger.error('Google webhook processing failed', {
                requestId,
                error: error.message,
            });

            res.status(200).json({ success: false });
        }
    })
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify Apple receipt with Apple's servers
 */
const { google } = require('googleapis');
const fetch = require('node-fetch');
const { getIAPConfig } = require('../config/environment');

/**
 * Verify Apple receipt with Apple's servers
 */
async function verifyAppleReceipt(receipt, productId) {
    const config = getIAPConfig().apple;
    const { sharedSecret, verifyEndpoint } = config;

    if (!sharedSecret && process.env.NODE_ENV !== 'production') {
        logger.warn('Mocking Apple verification: No shared secret configured');
        return { valid: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
    }

    try {
        const response = await fetch(verifyEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                'receipt-data': receipt,
                'password': sharedSecret,
                'exclude-old-transactions': true
            })
        });

        const data = await response.json();

        // Status 0 means valid. 21007 means sandbox receipt sent to prod URL (should retry with sandbox URL).
        if (data.status === 0) {
            const latest = data.latest_receipt_info && data.latest_receipt_info.length > 0
                ? data.latest_receipt_info[0]
                : null;

            // Provide a fallback expiration if not subscription or missing
            const expiresAt = latest && latest.expires_date_ms
                ? new Date(parseInt(latest.expires_date_ms)).toISOString()
                : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

            return { valid: true, expiresAt };
        } else {
            return { valid: false, error: `Apple verification failed with status: ${data.status}` };
        }
    } catch (error) {
        logger.error('Apple verification error', { error: error.message });
        return { valid: false, error: error.message };
    }
}

/**
 * Verify Google Play purchase
 */
async function verifyGooglePlayPurchase(purchaseToken, productId) {
    const config = getIAPConfig().google;
    const { clientEmail, privateKey } = config;

    // Mock if no credentials in non-prod
    if ((!clientEmail || !privateKey) && process.env.NODE_ENV !== 'production') {
        logger.warn('Mocking Google verification: No credentials configured');
        return { valid: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() };
    }

    try {
        const auth = new google.auth.JWT(
            clientEmail,
            null,
            privateKey,
            ['https://www.googleapis.com/auth/androidpublisher']
        );

        const androidPublisher = google.androidpublisher({
            version: 'v3',
            auth
        });

        // We need package name, assume it's in env or config, defaulting for now
        const packageName = process.env.ANDROID_PACKAGE_NAME || 'com.offscreenbuddy';

        const result = await androidPublisher.purchases.subscriptions.get({
            packageName,
            subscriptionId: productId,
            token: purchaseToken,
        });

        // Check if expiryTimeMillis is in the future
        const expiryTimeMillis = result.data.expiryTimeMillis;
        const valid = expiryTimeMillis && parseInt(expiryTimeMillis) > Date.now();

        return {
            valid,
            expiresAt: new Date(parseInt(expiryTimeMillis)).toISOString()
        };

    } catch (error) {
        logger.error('Google verification error', { error: error.message });
        // Return valid=false instead of throwing to handle properly in route
        return { valid: false, error: error.message };
    }
}

/**
 * Update user subscription in database
 */
async function updateUserSubscription(userId, data) {
    const {
        productId,
        transactionId,
        originalTransactionId,
        purchaseToken,
        platform,
        receipt,
        expiresAt,
    } = data;

    // Deactivate any existing active subscriptions
    await supabase
        .from('user_subscriptions')
        .update({ is_active: false })
        .eq('user_id', userId)
        .eq('is_active', true);

    // Create new subscription record
    const { data: subscription, error } = await supabase
        .from('user_subscriptions')
        .insert({
            user_id: userId,
            product_id: productId,
            platform,
            status: 'active',
            is_active: true,
            iap_transaction_id: transactionId,
            iap_original_transaction_id: originalTransactionId,
            iap_purchase_token: purchaseToken,
            iap_receipt: receipt,
            expires_at: expiresAt,
            auto_renew: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (error) {
        logger.error('Failed to create subscription', { error: error.message, userId });
        throw error;
    }

    // Update user profile with subscription tier
    await supabase
        .from('profiles')
        .update({
            subscription_tier: getSubscriptionTier(productId),
            subscription_status: 'active',
            updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

    return subscription;
}

/**
 * Get subscription tier from product ID
 */
function getSubscriptionTier(productId) {
    if (!productId) return 'free';

    if (productId.includes('enterprise')) return 'enterprise';
    if (productId.includes('premium')) return 'premium';
    if (productId.includes('pro')) return 'pro';

    return 'free';
}

/**
 * Get features for subscription tier
 */
function getSubscriptionFeatures(productId) {
    const tier = getSubscriptionTier(productId);

    const features = {
        free: ['basic_timer', 'dark_theme'],
        pro: ['extended_timer', 'custom_presets', 'smart_notifications', 'detailed_analytics'],
        premium: ['everything_in_pro', 'priority_support', 'early_access'],
        enterprise: ['everything_in_premium', 'dedicated_support', 'api_access'],
    };

    return features[tier] || features.free;
}

/**
 * Handle Apple subscription renewal
 */
async function handleAppleSubscriptionRenewal(data) {
    // TODO: Implement renewal handling
    logger.info('Apple subscription renewed', { data });
}

/**
 * Handle Apple renewal status change
 */
async function handleAppleRenewalStatusChange(data) {
    // TODO: Implement renewal status change handling
    logger.info('Apple renewal status changed', { data });
}

/**
 * Handle Apple subscription expiration
 */
async function handleAppleSubscriptionExpired(data) {
    // TODO: Implement expiration handling
    logger.info('Apple subscription expired', { data });
}

/**
 * Handle Apple refund
 */
async function handleAppleRefund(data) {
    // TODO: Implement refund handling
    logger.info('Apple refund processed', { data });
}

/**
 * Handle Google subscription notification
 */
async function handleGoogleSubscriptionNotification(notification) {
    const {
        notificationType,
        purchaseToken,
        subscriptionId,
    } = notification;

    logger.info('Google subscription notification', {
        type: notificationType,
        subscriptionId,
    });

    // Notification types:
    // 1 - RECOVERED
    // 2 - RENEWED
    // 3 - CANCELED
    // 4 - PURCHASED
    // 5 - ON_HOLD
    // 6 - IN_GRACE_PERIOD
    // 7 - RESTARTED
    // 8 - PRICE_CHANGE_CONFIRMED
    // 9 - DEFERRED
    // 10 - PAUSED
    // 11 - PAUSE_SCHEDULE_CHANGED
    // 12 - REVOKED
    // 13 - EXPIRED
}

/**
 * Handle Google one-time purchase notification
 */
async function handleGoogleOneTimeNotification(notification) {
    logger.info('Google one-time notification', { notification });
}

module.exports = router;
