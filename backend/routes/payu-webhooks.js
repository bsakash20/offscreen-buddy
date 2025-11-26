/**
 * PayU Webhook Handler
 * Implements PayU mobile app webhook handling as per official documentation
 */

const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');

const router = express.Router();

// PayU webhook configuration
const PAYU_WEBHOOK_CONFIG = {
    secret: process.env.PAYU_WEBHOOK_SECRET || 'eS2I5u4ic00hxq7bx3PLCySTkuzTGm4i',
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    endpointUrl: '/api/payu/webhook'
};

/**
 * Verify PayU hash for webhook
 */
function verifyPayUWebhookHash(postData, receivedHash) {
    try {
        const expectedHash = crypto
            .createHash('sha512')
            .update(
                [
                    postData.key,
                    postData.status,
                    postData.udf1 || '',
                    postData.udf2 || '',
                    postData.udf3 || '',
                    postData.udf4 || '',
                    postData.udf5 || '',
                    postData.txnid,
                    postData.email,
                    postData.mobile,
                    postData.amount,
                    postData.productinfo,
                    postData.firstname,
                    postData.lastname,
                    postData.city,
                    postData.state,
                    postData.country,
                    postData.zipcode,
                    postData.address1,
                    postData.address2,
                    PAYU_WEBHOOK_CONFIG.secret
                ].join('|')
            )
            .digest('hex');

        return expectedHash === receivedHash;
    } catch (error) {
        console.error('PayU webhook hash verification error:', error);
        return false;
    }
}

/**
 * Process PayU webhook data
 */
async function processPayUWebhook(webhookData) {
    const transactionId = uuidv4();

    try {
        console.log('Processing PayU webhook:', {
            txnid: webhookData.txnid,
            status: webhookData.status,
            amount: webhookData.amount
        });

        // Update or insert PayU transaction
        const { data: existingTransaction, error: fetchError } = await supabase
            .from('payu_transactions')
            .select('*')
            .eq('txnid', webhookData.txnid)
            .single();

        const transactionData = {
            user_id: webhookData.udf1 || null,
            txnid: webhookData.txnid,
            mihpayid: webhookData.mihpayid,
            amount: parseFloat(webhookData.amount),
            currency: webhookData.currency || 'INR',
            status: webhookData.status.toLowerCase(),
            payment_method: webhookData.payment_method,
            bank_ref_num: webhookData.bank_ref_num,
            bankcode: webhookData.bankcode,
            net_amount: webhookData.net_amount_debit ? parseFloat(webhookData.net_amount_debit) : null,
            addedon: webhookData.addedon ? new Date(webhookData.addedon).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            completed_at: webhookData.status === 'success' ? new Date().toISOString() : null
        };

        let result;
        if (existingTransaction) {
            // Update existing transaction
            const { data, error } = await supabase
                .from('payu_transactions')
                .update(transactionData)
                .eq('txnid', webhookData.txnid)
                .select()
                .single();

            if (error) throw error;
            result = { action: 'updated', data };
        } else {
            // Insert new transaction
            const { data, error } = await supabase
                .from('payu_transactions')
                .insert(transactionData)
                .select()
                .single();

            if (error) throw error;
            result = { action: 'created', data };
        }

        // Log webhook processing
        await supabase
            .from('payu_webhooks')
            .insert({
                transaction_id: result.data.id,
                webhook_type: 'payment_confirmation',
                status: 'processed',
                raw_payload: JSON.stringify(webhookData),
                processed_at: new Date().toISOString(),
                retry_count: 0
            });

        // Handle status-specific actions
        if (webhookData.status === 'success') {
            await handleSuccessfulPayment(result.data);
        } else if (webhookData.status === 'failure') {
            await handleFailedPayment(result.data);
        }

        console.log('PayU webhook processed successfully:', {
            action: result.action,
            transactionId: result.data.id,
            status: webhookData.status
        });

        return { success: true, transactionId: result.data.id };
    } catch (error) {
        console.error('PayU webhook processing error:', error);

        // Log failed webhook
        await supabase
            .from('payu_webhooks')
            .insert({
                transaction_id: null,
                webhook_type: 'payment_confirmation',
                status: 'failed',
                raw_payload: JSON.stringify(webhookData),
                retry_count: 0
            });

        throw error;
    }
}

/**
 * Handle successful payment
 */
async function handleSuccessfulPayment(transaction) {
    try {
        console.log('Handling successful payment:', transaction.txnid);

        // Update payment transactions table
        await supabase
            .from('payment_transactions')
            .update({
                status: 'completed',
                payu_txnid: transaction.txnid,
                payu_mihpayid: transaction.mihpayid,
                provider_transaction_id: transaction.mihpayid,
                updated_at: new Date().toISOString()
            })
            .eq('payu_txnid', transaction.txnid);

        // Update user subscription if applicable
        if (transaction.user_id) {
            await updateUserSubscription(transaction.user_id, transaction);
        }

        console.log('Successful payment handled for transaction:', transaction.txnid);
    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
}

/**
 * Handle failed payment
 */
async function handleFailedPayment(transaction) {
    try {
        console.log('Handling failed payment:', transaction.txnid);

        // Update payment transactions table
        await supabase
            .from('payment_transactions')
            .update({
                status: 'failed',
                payu_txnid: transaction.txnid,
                payu_mihpayid: transaction.mihpayid,
                updated_at: new Date().toISOString()
            })
            .eq('payu_txnid', transaction.txnid);

        console.log('Failed payment handled for transaction:', transaction.txnid);
    } catch (error) {
        console.error('Error handling failed payment:', error);
    }
}

/**
 * Update user subscription after successful payment
 */
async function updateUserSubscription(userId, transaction) {
    try {
        // Get user's current subscription
        const { data: currentSubscription } = await supabase
            .from('user_subscriptions')
            .select(`
        *,
        subscription_plans(*)
      `)
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (currentSubscription) {
            // Extend existing subscription
            const newExpiryDate = new Date();
            if (currentSubscription.subscription_plans?.tier === 'pro' &&
                currentSubscription.subscription_plans?.price_yearly > currentSubscription.subscription_plans?.price_monthly) {
                // Yearly plan
                newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
            } else {
                // Monthly plan
                newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
            }

            await supabase
                .from('user_subscriptions')
                .update({
                    expires_at: newExpiryDate.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentSubscription.id);
        } else {
            // Create new subscription
            const { data: proPlan } = await supabase
                .from('subscription_plans')
                .select('*')
                .eq('tier', 'pro')
                .single();

            if (proPlan) {
                const newExpiryDate = new Date();
                if (proPlan.price_yearly > proPlan.price_monthly) {
                    // Yearly plan
                    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);
                } else {
                    // Monthly plan
                    newExpiryDate.setMonth(newExpiryDate.getMonth() + 1);
                }

                await supabase
                    .from('user_subscriptions')
                    .insert({
                        user_id: userId,
                        plan_id: proPlan.id,
                        status: 'active',
                        starts_at: new Date().toISOString(),
                        expires_at: newExpiryDate.toISOString(),
                        auto_renew: true,
                        payment_provider: 'payu',
                        provider_subscription_id: transaction.txnid
                    });
            }
        }

        console.log('User subscription updated for user:', userId);
    } catch (error) {
        console.error('Error updating user subscription:', error);
    }
}

/**
 * PayU Webhook Endpoint
 */
router.post('/webhook', express.raw({ type: 'application/x-www-form-urlencoded' }), async (req, res) => {
    try {
        const requestId = req.id || uuidv4();
        const startTime = Date.now();

        console.log('PayU webhook received:', {
            requestId,
            contentType: req.headers['content-type'],
            bodyLength: req.body.length
        });

        // Parse POST data
        const postData = {};
        const body = req.body.toString('utf8');

        // Parse form data
        const params = new URLSearchParams(body);
        for (const [key, value] of params.entries()) {
            postData[key] = value;
        }

        console.log('Parsed webhook data:', Object.keys(postData));

        // Verify webhook authenticity
        if (!postData.hash) {
            console.warn('PayU webhook missing hash:', { requestId });
            return res.status(400).json({ error: 'Missing hash in webhook' });
        }

        if (!verifyPayUWebhookHash(postData, postData.hash)) {
            console.warn('PayU webhook hash verification failed:', { requestId });
            return res.status(401).json({ error: 'Invalid hash in webhook' });
        }

        console.log('PayU webhook verified successfully:', { requestId });

        // Process webhook
        const result = await processPayUWebhook(postData);

        const processingTime = Date.now() - startTime;
        console.log('PayU webhook processed:', {
            requestId,
            processingTime,
            success: result.success
        });

        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
            transactionId: result.transactionId,
            processingTime
        });

    } catch (error) {
        console.error('PayU webhook processing failed:', {
            error: error.message,
            stack: error.stack,
            body: req.body.toString()
        });

        res.status(500).json({
            success: false,
            error: 'Webhook processing failed',
            message: error.message
        });
    }
});

/**
 * PayU Payment Verification Endpoint
 */
router.post('/verify-payment', async (req, res) => {
    try {
        const requestId = req.id || uuidv4();
        const { txnid, mihpayid } = req.body;

        console.log('PayU payment verification requested:', { requestId, txnid, mihpayid });

        if (!txnid && !mihpayid) {
            return res.status(400).json({
                error: 'Either txnid or mihpayid is required'
            });
        }

        // Query transaction
        let query = supabase
            .from('payu_transactions')
            .select('*');

        if (txnid) {
            query = query.eq('txnid', txnid);
        } else if (mihpayid) {
            query = query.eq('mihpayid', mihpayid);
        }

        const { data: transaction, error } = await query.single();

        if (error || !transaction) {
            console.warn('Transaction not found for verification:', { requestId, txnid, mihpayid });
            return res.status(404).json({
                error: 'Transaction not found',
                verified: false
            });
        }

        // Check if payment is successful
        const isVerified = transaction.status === 'success';

        console.log('Payment verification result:', {
            requestId,
            txnid,
            status: transaction.status,
            verified: isVerified
        });

        res.json({
            verified: isVerified,
            transaction: {
                txnid: transaction.txnid,
                mihpayid: transaction.mihpayid,
                amount: transaction.amount,
                status: transaction.status,
                payment_method: transaction.payment_method,
                completed_at: transaction.completed_at
            },
            verified_at: new Date().toISOString()
        });

    } catch (error) {
        console.error('Payment verification error:', error);
        res.status(500).json({
            error: 'Payment verification failed',
            verified: false
        });
    }
});

/**
 * Get PayU Transaction Status
 */
router.get('/transaction/:txnid', async (req, res) => {
    try {
        const requestId = req.id || uuidv4();
        const { txnid } = req.params;

        console.log('PayU transaction status requested:', { requestId, txnid });

        const { data: transaction, error } = await supabase
            .from('payu_transactions')
            .select('*')
            .eq('txnid', txnid)
            .single();

        if (error || !transaction) {
            return res.status(404).json({
                error: 'Transaction not found'
            });
        }

        console.log('Transaction status retrieved:', {
            requestId,
            txnid,
            status: transaction.status
        });

        res.json({
            transaction: {
                txnid: transaction.txnid,
                mihpayid: transaction.mihpayid,
                amount: transaction.amount,
                currency: transaction.currency,
                status: transaction.status,
                payment_method: transaction.payment_method,
                bank_ref_num: transaction.bank_ref_num,
                bankcode: transaction.bankcode,
                net_amount: transaction.net_amount,
                created_at: transaction.created_at,
                completed_at: transaction.completed_at
            }
        });

    } catch (error) {
        console.error('Transaction status error:', error);
        res.status(500).json({
            error: 'Failed to get transaction status'
        });
    }
});

module.exports = router;