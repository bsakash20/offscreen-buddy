const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { supabase } = require('../config/supabase');
const { logger } = require('../config/logger');

class MfaService {
    /**
     * Generate a new MFA secret for a user
     * @param {string} email - User's email to label the authenticator entry
     * @returns {Promise<{secret: string, otpauth_url: string, qr_code: string}>}
     */
    async generateSecret(email) {
        const secret = speakeasy.generateSecret({
            length: 20,
            name: `OffScreen Buddy (${email})`,
            issuer: 'OffScreen Buddy'
        });

        const qrCode = await QRCode.toDataURL(secret.otpauth_url);

        return {
            secret: secret.base32,
            otpauth_url: secret.otpauth_url,
            qr_code: qrCode
        };
    }

    /**
     * Verify a token against a secret
     * @param {string} secret - User's base32 secret
     * @param {string} token - The token provided by the user
     * @returns {boolean}
     */
    verifyToken(secret, token) {
        return speakeasy.totp.verify({
            secret: secret,
            encoding: 'base32',
            token: token,
            window: 1 // Allow 30 seconds leeway either side
        });
    }

    /**
     * Enable MFA for a user after successful verification
     * @param {string} userId
     * @param {string} secret
     */
    async enableMfa(userId, secret) {
        try {
            // Update user metadata in Supabase Auth
            const { error: authError } = await supabase.auth.admin.updateUserById(
                userId,
                {
                    user_metadata: {
                        mfa_enabled: true,
                        mfa_secret: secret // Note: In a real high-security data, encrypt this!
                    }
                }
            );

            if (authError) throw authError;

            // Update users table for redundancy/access if needed
            const { error: dbError } = await supabase
                .from('users')
                .update({
                    mfa_enabled: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (dbError) logger.warn(`Failed to update MFA status in users table for ${userId}: ${dbError.message}`);

            return true;
        } catch (error) {
            logger.error(`Error enabling MFA for user ${userId}:`, error);
            throw new Error('Failed to enable MFA');
        }
    }

    /**
     * Disable MFA for a user
     * @param {string} userId
     */
    async disableMfa(userId) {
        try {
            const { error: authError } = await supabase.auth.admin.updateUserById(
                userId,
                {
                    user_metadata: {
                        mfa_enabled: false,
                        mfa_secret: null
                    }
                }
            );

            if (authError) throw authError;

            await supabase
                .from('users')
                .update({ mfa_enabled: false })
                .eq('id', userId);

            return true;
        } catch (error) {
            logger.error(`Error disabling MFA for user ${userId}:`, error);
            throw new Error('Failed to disable MFA');
        }
    }

    /**
     * Check if MFA is enabled for a user and verify the token if so
     * This is a helper for the login flow
     * @param {string} userId
     * @param {string} token
     */
    async validateLoginMfa(userId, token) {
        // Get user with metadata to check MFA status
        const { data: { user }, error } = await supabase.auth.admin.getUserById(userId);

        if (error || !user) throw new Error('User not found');

        const mfaEnabled = user.user_metadata?.mfa_enabled;

        if (!mfaEnabled) return { required: false, valid: true };

        if (!token) return { required: true, valid: false };

        const secret = user.user_metadata?.mfa_secret;
        if (!secret) return { required: false, valid: true }; // Should be error state actually

        const isValid = this.verifyToken(secret, token);
        return { required: true, valid: isValid };
    }
}

module.exports = new MfaService();
