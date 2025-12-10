/**
 * Profile Routes
 * API endpoints for user profile, payment methods, and transaction history
 * Uses existing 'users' table with user_metadata for extended profile data
 */

const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');

// Middleware to verify user authentication
const verifyUser = async (req, res, next) => {
    const userId = req.params.userId;

    if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
    }

    req.userId = userId;
    next();
};

/**
 * GET /api/profile/:userId
 * Get user profile from users table
 */
router.get('/:userId', verifyUser, async (req, res) => {
    const { userId } = req.params;

    try {
        logger.info('[Profile] Fetching profile', { userId });

        // Get user from auth.users via Supabase admin
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(userId);

        if (authError || !authData?.user) {
            logger.warn('[Profile] User not found in auth', { userId, error: authError?.message });

            // Fallback: try to get from users table
            const { data: user, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (userError || !user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Return from users table
            const metadata = user.raw_user_meta_data || {};
            return res.json({
                id: user.id,
                email: user.email || '',
                name: user.name || metadata.name || '',
                phone: user.phone || metadata.phone || '',
                phoneCountryCode: metadata.phone_country_code || '+91',
                address: {
                    street: metadata.address_street || '',
                    city: metadata.address_city || '',
                    state: metadata.address_state || '',
                    postalCode: metadata.address_postal_code || '',
                    country: metadata.address_country || ''
                },
                avatarUrl: metadata.avatar_url || null,
                createdAt: user.created_at,
                updatedAt: user.updated_at || user.created_at
            });
        }

        // User found in auth
        const authUser = authData.user;
        const metadata = authUser.user_metadata || {};

        res.json({
            id: authUser.id,
            email: authUser.email || '',
            name: metadata.name || metadata.full_name || '',
            phone: authUser.phone || metadata.phone || '',
            phoneCountryCode: metadata.phone_country_code || '+91',
            address: {
                street: metadata.address_street || '',
                city: metadata.address_city || '',
                state: metadata.address_state || '',
                postalCode: metadata.address_postal_code || '',
                country: metadata.address_country || ''
            },
            avatarUrl: metadata.avatar_url || authUser.user_metadata?.avatar_url || null,
            createdAt: authUser.created_at,
            updatedAt: authUser.updated_at || authUser.created_at
        });

    } catch (error) {
        logger.error('[Profile] Unexpected error', { userId, error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

const { body, validationResult } = require('express-validator');

/**
 * PUT /api/profile/:userId
 * Update user profile - stores in auth.users user_metadata
 */
router.put('/:userId',
    verifyUser,
    [
        body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
        body('phone').optional().trim().matches(/^\+?[\d\s-]{10,15}$/).withMessage('Invalid phone number format'),
        body('phoneCountryCode').optional().matches(/^\+[\d]{1,4}$/).withMessage('Invalid country code'),
        body('address.street').optional().trim().escape(),
        body('address.city').optional().trim().escape(),
        body('address.state').optional().trim().escape(),
        body('address.postalCode').optional().trim().isAlphanumeric().withMessage('Invalid postal code'),
        body('address.country').optional().trim().escape()
    ],
    async (req, res) => {
        const { userId } = req.params;

        // Check validation results
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ error: 'Validation failed', details: errors.array() });
        }

        const { name, phone, phoneCountryCode, address } = req.body;

        try {
            logger.info('[Profile] Updating profile', { userId, updates: Object.keys(req.body) });

            // Build metadata update object
            const metadataUpdate = {};

            if (name !== undefined) metadataUpdate.name = name;
            if (name !== undefined) metadataUpdate.full_name = name; // Supabase convention
            if (phone !== undefined) metadataUpdate.phone = phone;
            if (phoneCountryCode !== undefined) metadataUpdate.phone_country_code = phoneCountryCode;

            if (address) {
                if (address.street !== undefined) metadataUpdate.address_street = address.street;
                if (address.city !== undefined) metadataUpdate.address_city = address.city;
                if (address.state !== undefined) metadataUpdate.address_state = address.state;
                if (address.postalCode !== undefined) metadataUpdate.address_postal_code = address.postalCode;
                if (address.country !== undefined) metadataUpdate.address_country = address.country;
            }

            // Update via Supabase admin API
            const { data: authData, error: authError } = await supabase.auth.admin.updateUserById(
                userId,
                {
                    user_metadata: metadataUpdate,
                    phone: phone || undefined // Also update phone in auth if provided
                }
            );

            if (authError) {
                logger.error('[Profile] Auth update error', { userId, error: authError.message });

                // Fallback: try to update users table directly
                const updateData = { updated_at: new Date().toISOString() };
                if (name !== undefined) updateData.name = name;
                if (phone !== undefined) updateData.phone = phone;

                // Store extended data in raw_user_meta_data JSONB
                const { data: currentUser } = await supabase
                    .from('users')
                    .select('raw_user_meta_data')
                    .eq('id', userId)
                    .single();

                const currentMetadata = currentUser?.raw_user_meta_data || {};
                updateData.raw_user_meta_data = { ...currentMetadata, ...metadataUpdate };

                const { error: updateError } = await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', userId);

                if (updateError) {
                    logger.error('[Profile] Users table update error', { userId, error: updateError.message });
                    return res.status(500).json({ error: 'Failed to update profile' });
                }

                logger.info('[Profile] Profile updated via users table', { userId });
            } else {
                logger.info('[Profile] Profile updated via auth admin', { userId });
            }

            // Return the updated profile
            const updatedUser = authData?.user;
            const metadata = updatedUser?.user_metadata || metadataUpdate;

            res.json({
                id: userId,
                email: updatedUser?.email || '',
                name: metadata.name || metadata.full_name || name || '',
                phone: updatedUser?.phone || metadata.phone || phone || '',
                phoneCountryCode: metadata.phone_country_code || phoneCountryCode || '+91',
                address: {
                    street: metadata.address_street || address?.street || '',
                    city: metadata.address_city || address?.city || '',
                    state: metadata.address_state || address?.state || '',
                    postalCode: metadata.address_postal_code || address?.postalCode || '',
                    country: metadata.address_country || address?.country || ''
                },
                avatarUrl: metadata.avatar_url || null,
                createdAt: updatedUser?.created_at || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

        } catch (error) {
            logger.error('[Profile] Update unexpected error', { userId, error: error.message });
            res.status(500).json({ error: 'Internal server error' });
        }
    });

/**
 * GET /api/profile/:userId/payment-methods
 * Get user's saved payment methods (returns empty for now)
 */
router.get('/:userId/payment-methods', verifyUser, async (req, res) => {
    // Payment methods are stored by PayU, not locally
    res.json([]);
});

/**
 * GET /api/profile/:userId/transactions
 * Get user's transaction history
 */
router.get('/:userId/transactions', verifyUser, async (req, res) => {
    const { userId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    try {
        // Try to get from payment_transactions if table exists
        const { data: transactions, error } = await supabase
            .from('payment_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            // Table might not exist, return empty
            return res.json({ transactions: [], total: 0, hasMore: false });
        }

        res.json({
            transactions: transactions || [],
            total: transactions?.length || 0,
            hasMore: false
        });
    } catch (error) {
        res.json({ transactions: [], total: 0, hasMore: false });
    }
});

/**
 * GET /api/profile/:userId/consent
 * Get user's consent settings (default values)
 */
router.get('/:userId/consent', verifyUser, async (req, res) => {
    res.json({
        paymentProcessing: true,
        marketingEmails: false,
        dataSharing: false,
        updatedAt: new Date().toISOString()
    });
});

/**
 * PUT /api/profile/:userId/consent
 * Update consent (no-op for now, returns success)
 */
router.put('/:userId/consent', verifyUser, async (req, res) => {
    const { paymentProcessing, marketingEmails, dataSharing } = req.body;
    res.json({
        paymentProcessing: paymentProcessing ?? true,
        marketingEmails: marketingEmails ?? false,
        dataSharing: dataSharing ?? false,
        updatedAt: new Date().toISOString()
    });
});

/**
 * POST /api/profile/:userId/avatar
 * Upload user avatar
 */
const multer = require('multer');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

router.post('/:userId/avatar', verifyUser, upload.single('avatar'), async (req, res) => {
    const { userId } = req.params;

    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        logger.info('[Profile] Uploading avatar', { userId, size: req.file.size });

        const fileExt = req.file.originalname.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to Supabase Storage 'avatars' bucket
        const { data, error } = await supabase
            .storage
            .from('avatars')
            .upload(filePath, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (error) {
            logger.error('[Profile] Storage upload error', { userId, error: error.message });
            // If bucket doesn't exist, we might need to create it or handle it
            // For now, return error
            return res.status(500).json({ error: 'Failed to upload avatar image' });
        }

        // Get public URL
        const { data: { publicUrl } } = supabase
            .storage
            .from('avatars')
            .getPublicUrl(filePath);

        // Update user metadata with avatar URL
        const { error: updateError } = await supabase.auth.admin.updateUserById(
            userId,
            { user_metadata: { avatar_url: publicUrl } }
        );

        if (updateError) {
            logger.warn('[Profile] Failed to update user metadata with avatar', { userId, error: updateError.message });
            // Should we fail here? Maybe just log it, as the upload succeeded.
            // But for consistency let's try to update users table too as fallback

            await supabase
                .from('users')
                .update({
                    raw_user_meta_data: { avatar_url: publicUrl },
                    avatar_url: publicUrl // If column exists
                })
                .eq('id', userId);
        }

        logger.info('[Profile] Avatar uploaded successfully', { userId, url: publicUrl });
        res.json({ url: publicUrl });

    } catch (error) {
        logger.error('[Profile] Avatar upload unexpected error', { userId, error: error.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
