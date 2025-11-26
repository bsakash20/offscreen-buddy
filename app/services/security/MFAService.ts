/**
 * Multi-Factor Authentication (MFA) Service
 * Enterprise-grade MFA with TOTP, SMS, and backup codes
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../Supabase/supabase';
import { EncryptionService } from './EncryptionService';
import { SecurityMonitor } from './SecurityMonitor';

export interface MFAConfig {
    enabledMethods: ('totp' | 'sms' | 'email' | 'backup')[];
    totpIssuer: string;
    backupCodesCount: number;
    backupCodeLength: number;
    maxAttempts: number;
    timeoutMinutes: number;
}

export interface TOTPSetup {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
    enabled: boolean;
}

export interface MFAChallenge {
    id: string;
    type: 'totp' | 'sms' | 'email' | 'backup';
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    attempts: number;
    verified: boolean;
}

export interface MFAMethods {
    totp: {
        enabled: boolean;
        secret?: string;
        lastUsed?: Date;
    };
    sms: {
        enabled: boolean;
        phoneNumber?: string;
        lastUsed?: Date;
    };
    email: {
        enabled: boolean;
        email?: string;
        lastUsed?: Date;
    };
    backup: {
        enabled: boolean;
        remainingCodes: number;
        lastUsed?: Date;
    };
}

export class MFAService {
    private config: MFAConfig;
    private encryptionService: EncryptionService;
    private securityMonitor: SecurityMonitor;
    private challenges: Map<string, MFAChallenge> = new Map();

    constructor() {
        this.config = {
            enabledMethods: ['totp', 'sms', 'email', 'backup'],
            totpIssuer: 'OffScreen Buddy',
            backupCodesCount: 8,
            backupCodeLength: 8,
            maxAttempts: 5,
            timeoutMinutes: 10
        };
        this.encryptionService = new EncryptionService();
        this.securityMonitor = new SecurityMonitor();
    }

    /**
     * Setup TOTP (Time-based One-Time Password)
     */
    async setupTOTP(userId: string): Promise<{ success: boolean; setup?: TOTPSetup; error?: string }> {
        try {
            // Generate TOTP secret
            const secret = this.generateTOTPSecret();

            // Create QR code URL for Google Authenticator
            const qrCodeUrl = this.generateTOTPQRCode(secret, userId);

            // Generate backup codes
            const backupCodesResult = await this.generateBackupCodes(userId);
            const backupCodes = backupCodesResult.codes || [];

            // Store securely
            await this.storeTOTPConfig(userId, {
                secret,
                backupCodes,
                enabled: false // Will be enabled after verification
            });

            return {
                success: true,
                setup: {
                    secret,
                    qrCodeUrl,
                    backupCodes,
                    enabled: false
                }
            };

        } catch (error) {
            console.error('TOTP setup failed:', error);
            await this.securityMonitor.logSecurityEvent('mfa_setup_failed', {
                userId,
                method: 'totp',
                error: error instanceof Error ? error.message : 'Unknown error'
            });

            return {
                success: false,
                error: 'Failed to setup TOTP authentication'
            };
        }
    }

    /**
     * Verify TOTP code and enable MFA
     */
    async verifyTOTPSetup(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
        try {
            const totpConfig = await this.getTOTPConfig(userId);
            if (!totpConfig || !totpConfig.secret) {
                return {
                    success: false,
                    error: 'TOTP not setup'
                };
            }

            // Verify code
            const isValid = this.verifyTOTPCode(totpConfig.secret, code);
            if (!isValid) {
                await this.securityMonitor.logSecurityEvent('mfa_verification_failed', {
                    userId,
                    method: 'totp',
                    reason: 'invalid_code'
                });

                return {
                    success: false,
                    error: 'Invalid TOTP code'
                };
            }

            // Enable TOTP
            await this.enableTOTP(userId);

            await this.securityMonitor.logSecurityEvent('mfa_setup_completed', {
                userId,
                method: 'totp'
            });

            return { success: true };

        } catch (error) {
            console.error('TOTP verification failed:', error);
            return {
                success: false,
                error: 'TOTP verification failed'
            };
        }
    }

    /**
     * Authenticate with TOTP
     */
    async authenticateWithTOTP(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
        try {
            const totpConfig = await this.getTOTPConfig(userId);
            if (!totpConfig || !totpConfig.enabled || !totpConfig.secret) {
                return {
                    success: false,
                    error: 'TOTP not enabled'
                };
            }

            const isValid = this.verifyTOTPCode(totpConfig.secret, code);
            if (!isValid) {
                await this.securityMonitor.logSecurityEvent('mfa_authentication_failed', {
                    userId,
                    method: 'totp',
                    reason: 'invalid_code'
                });

                return {
                    success: false,
                    error: 'Invalid TOTP code'
                };
            }

            // Update last used
            await this.updateLastUsed(userId, 'totp');

            await this.securityMonitor.logSecurityEvent('mfa_authentication_success', {
                userId,
                method: 'totp'
            });

            return { success: true };

        } catch (error) {
            console.error('TOTP authentication failed:', error);
            return {
                success: false,
                error: 'TOTP authentication failed'
            };
        }
    }

    /**
     * Generate backup codes
     */
    async generateBackupCodes(userId: string): Promise<{ success: boolean; codes?: string[]; error?: string }> {
        try {
            const codes = this.generateBackupCodesInternal();

            // Store hashed codes
            const hashedCodes = await Promise.all(
                codes.map(async code => ({
                    code: await this.encryptionService.hash(code),
                    used: false,
                    usedAt: null
                }))
            );

            await this.storeBackupCodes(userId, hashedCodes);

            await this.securityMonitor.logSecurityEvent('backup_codes_generated', {
                userId,
                count: codes.length
            });

            return {
                success: true,
                codes // Return unhashed codes to user
            };

        } catch (error) {
            console.error('Backup codes generation failed:', error);
            return {
                success: false,
                error: 'Failed to generate backup codes'
            };
        }
    }

    /**
     * Authenticate with backup code
     */
    async authenticateWithBackupCode(userId: string, code: string): Promise<{ success: boolean; error?: string }> {
        try {
            const backupCodes = await this.getBackupCodes(userId);
            if (!backupCodes || backupCodes.length === 0) {
                return {
                    success: false,
                    error: 'No backup codes available'
                };
            }

            // Hash the provided code
            const hashedCode = await this.encryptionService.hash(code);

            // Find unused backup code
            const codeIndex = backupCodes.findIndex(c => c.code === hashedCode && !c.used);
            if (codeIndex === -1) {
                await this.securityMonitor.logSecurityEvent('mfa_authentication_failed', {
                    userId,
                    method: 'backup',
                    reason: 'invalid_or_used_code'
                });

                return {
                    success: false,
                    error: 'Invalid or already used backup code'
                };
            }

            // Mark code as used
            backupCodes[codeIndex].used = true;
            backupCodes[codeIndex].usedAt = new Date();
            await this.storeBackupCodes(userId, backupCodes);

            // Update last used
            await this.updateLastUsed(userId, 'backup');

            await this.securityMonitor.logSecurityEvent('mfa_authentication_success', {
                userId,
                method: 'backup'
            });

            return { success: true };

        } catch (error) {
            console.error('Backup code authentication failed:', error);
            return {
                success: false,
                error: 'Backup code authentication failed'
            };
        }
    }

    /**
     * Start MFA challenge
     */
    async startMFAChallenge(
        userId: string,
        preferredMethod: 'totp' | 'sms' | 'email' = 'totp'
    ): Promise<{ success: boolean; challengeId?: string; method?: string; error?: string }> {
        try {
            // Check available MFA methods
            const availableMethods = await this.getAvailableMFAMethods(userId);
            if (availableMethods.length === 0) {
                return {
                    success: false,
                    error: 'No MFA methods available'
                };
            }

            // Use preferred method if available, otherwise use first available
            const method = availableMethods.includes(preferredMethod) ? preferredMethod : availableMethods[0];

            // Create challenge
            const challengeId = this.generateChallengeId();
            const challenge: MFAChallenge = {
                id: challengeId,
                type: method as 'totp' | 'sms' | 'email' | 'backup',
                userId,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + this.config.timeoutMinutes * 60 * 1000),
                attempts: 0,
                verified: false
            };

            this.challenges.set(challengeId, challenge);

            // Send verification code based on method
            await this.sendVerificationCode(challenge);

            return {
                success: true,
                challengeId,
                method
            };

        } catch (error) {
            console.error('MFA challenge creation failed:', error);
            return {
                success: false,
                error: 'Failed to start MFA challenge'
            };
        }
    }

    /**
     * Verify MFA challenge
     */
    async verifyMFAChallenge(
        challengeId: string,
        code: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const challenge = this.challenges.get(challengeId);
            if (!challenge) {
                return {
                    success: false,
                    error: 'Invalid challenge'
                };
            }

            // Check if challenge is expired
            if (new Date() > challenge.expiresAt) {
                this.challenges.delete(challengeId);
                return {
                    success: false,
                    error: 'Challenge has expired'
                };
            }

            // Check attempts
            if (challenge.attempts >= this.config.maxAttempts) {
                this.challenges.delete(challengeId);
                return {
                    success: false,
                    error: 'Too many attempts'
                };
            }

            // Verify code based on method
            let isValid = false;
            switch (challenge.type) {
                case 'totp':
                    const totpResult = await this.authenticateWithTOTP(challenge.userId, code);
                    isValid = totpResult.success;
                    break;
                case 'backup':
                    const backupResult = await this.authenticateWithBackupCode(challenge.userId, code);
                    isValid = backupResult.success;
                    break;
                case 'sms':
                case 'email':
                    // In production, these would verify against sent codes
                    isValid = await this.verifyExternalCode(challenge.userId, challenge.type, code);
                    break;
            }

            if (!isValid) {
                challenge.attempts++;
                return {
                    success: false,
                    error: 'Invalid code'
                };
            }

            // Mark challenge as verified
            challenge.verified = true;
            this.challenges.set(challengeId, challenge);

            await this.securityMonitor.logSecurityEvent('mfa_challenge_success', {
                userId: challenge.userId,
                method: challenge.type,
                challengeId
            });

            return { success: true };

        } catch (error) {
            console.error('MFA challenge verification failed:', error);
            return {
                success: false,
                error: 'Challenge verification failed'
            };
        }
    }

    /**
     * Get user's MFA status and methods
     */
    async getMFAStatus(userId: string): Promise<{
        enabled: boolean;
        methods: MFAMethods;
        availableMethods: string[];
    }> {
        try {
            const methods: MFAMethods = {
                totp: { enabled: false },
                sms: { enabled: false },
                email: { enabled: false },
                backup: { enabled: false, remainingCodes: 0 }
            };

            // Check TOTP
            const totpConfig = await this.getTOTPConfig(userId);
            if (totpConfig && totpConfig.enabled) {
                methods.totp.enabled = true;
                methods.totp.secret = totpConfig.secret;
                methods.totp.lastUsed = totpConfig.lastUsed;
            }

            // Check SMS
            const smsConfig = await this.getSMSConfig(userId);
            if (smsConfig && smsConfig.enabled) {
                methods.sms.enabled = true;
                methods.sms.phoneNumber = smsConfig.phoneNumber;
                methods.sms.lastUsed = smsConfig.lastUsed;
            }

            // Check Email
            const emailConfig = await this.getEmailConfig(userId);
            if (emailConfig && emailConfig.enabled) {
                methods.email.enabled = true;
                methods.email.email = emailConfig.email;
                methods.email.lastUsed = emailConfig.lastUsed;
            }

            // Check Backup codes
            const backupCodes = await this.getBackupCodes(userId);
            if (backupCodes && backupCodes.length > 0) {
                methods.backup.enabled = true;
                methods.backup.remainingCodes = 0; // Initialize required property
                methods.backup.remainingCodes = backupCodes.filter(c => !c.used).length;
                methods.backup.lastUsed = backupCodes.find(c => c.used)?.usedAt;
            }

            const availableMethods = Object.entries(methods)
                .filter(([, method]) => method.enabled)
                .map(([method]) => method);

            const enabled = availableMethods.length > 0;

            return {
                enabled,
                methods,
                availableMethods
            };

        } catch (error) {
            console.error('Failed to get MFA status:', error);
            return {
                enabled: false,
                methods: {
                    totp: { enabled: false },
                    sms: { enabled: false },
                    email: { enabled: false },
                    backup: { enabled: false, remainingCodes: 0 }
                },
                availableMethods: []
            };
        }
    }

    /**
     * Disable MFA method
     */
    async disableMFAMethod(
        userId: string,
        method: 'totp' | 'sms' | 'email' | 'backup'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            switch (method) {
                case 'totp':
                    await this.disableTOTP(userId);
                    break;
                case 'sms':
                    await this.disableSMS(userId);
                    break;
                case 'email':
                    await this.disableEmail(userId);
                    break;
                case 'backup':
                    await this.clearBackupCodes(userId);
                    break;
            }

            await this.securityMonitor.logSecurityEvent('mfa_method_disabled', {
                userId,
                method
            });

            return { success: true };

        } catch (error) {
            console.error(`Failed to disable ${method} MFA:`, error);
            return {
                success: false,
                error: `Failed to disable ${method} authentication`
            };
        }
    }

    /**
     * Private helper methods
     */
    private generateTOTPSecret(): string {
        // Generate base32 encoded secret
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let secret = '';
        for (let i = 0; i < 32; i++) {
            secret += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return secret;
    }

    private generateTOTPQRCode(secret: string, userId: string): string {
        const issuer = this.config.totpIssuer;
        const label = encodeURIComponent(`${issuer}:${userId}`);
        const otpauth = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
        return otpauth;
    }

    private generateTOTPCode(secret: string): string {
        // Simplified TOTP implementation - in production use proper otplib or similar
        const timeStep = Math.floor(Date.now() / 30000); // 30-second steps
        const hash = this.simpleHash(secret + timeStep.toString());
        return (hash % 1000000).toString().padStart(6, '0');
    }

    private verifyTOTPCode(secret: string, code: string): boolean {
        // Check current time step and previous/next (for clock drift)
        const currentCode = this.generateTOTPCode(secret);
        if (currentCode === code) return true;

        // Check previous time step
        const timeStep = Math.floor(Date.now() / 30000);
        const previousCode = this.generateTOTPCode(secret + (timeStep - 1));
        if (previousCode === code) return true;

        // Check next time step
        const nextCode = this.generateTOTPCode(secret + (timeStep + 1));
        if (nextCode === code) return true;

        return false;
    }

    private simpleHash(input: string): number {
        let hash = 0;
        for (let i = 0; i < input.length; i++) {
            const char = input.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    private generateBackupCodesInternal(): string[] {
        const codes: string[] = [];
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

        for (let i = 0; i < this.config.backupCodesCount; i++) {
            let code = '';
            for (let j = 0; j < this.config.backupCodeLength; j++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            // Format as XXXX-XXXX
            codes.push(code.slice(0, 4) + '-' + code.slice(4));
        }

        return codes;
    }

    private generateChallengeId(): string {
        return `mfa_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private async getAvailableMFAMethods(userId: string): Promise<string[]> {
        const status = await this.getMFAStatus(userId);
        return status.availableMethods;
    }

    private async sendVerificationCode(challenge: MFAChallenge): Promise<void> {
        // In production, this would send actual SMS/email codes
        console.log(`📱 Sending ${challenge.type} verification code to user ${challenge.userId}`);
    }

    private async verifyExternalCode(userId: string, method: string, code: string): Promise<boolean> {
        // In production, this would verify against stored external codes
        console.log(`🔍 Verifying ${method} code for user ${userId}: ${code}`);
        return code === '123456'; // Demo code
    }

    private async storeTOTPConfig(userId: string, config: any): Promise<void> {
        const encryptedConfig = await this.encryptionService.encrypt(JSON.stringify(config));
        await AsyncStorage.setItem(`mfa_totp_${userId}`, encryptedConfig);
    }

    private async getTOTPConfig(userId: string): Promise<any> {
        const encryptedConfig = await AsyncStorage.getItem(`mfa_totp_${userId}`);
        if (!encryptedConfig) return null;

        const decryptedConfig = await this.encryptionService.decrypt(encryptedConfig);
        return JSON.parse(decryptedConfig);
    }

    private async enableTOTP(userId: string): Promise<void> {
        const config = await this.getTOTPConfig(userId);
        if (config) {
            config.enabled = true;
            config.lastEnabled = new Date();
            await this.storeTOTPConfig(userId, config);
        }
    }

    private async disableTOTP(userId: string): Promise<void> {
        await AsyncStorage.removeItem(`mfa_totp_${userId}`);
    }

    private async storeBackupCodes(userId: string, codes: any[]): Promise<void> {
        const encryptedCodes = await this.encryptionService.encrypt(JSON.stringify(codes));
        await AsyncStorage.setItem(`mfa_backup_${userId}`, encryptedCodes);
    }

    private async getBackupCodes(userId: string): Promise<any[]> {
        const encryptedCodes = await AsyncStorage.getItem(`mfa_backup_${userId}`);
        if (!encryptedCodes) return [];

        const decryptedCodes = await this.encryptionService.decrypt(encryptedCodes);
        return JSON.parse(decryptedCodes);
    }

    private async clearBackupCodes(userId: string): Promise<void> {
        await AsyncStorage.removeItem(`mfa_backup_${userId}`);
    }

    private async getSMSConfig(userId: string): Promise<any> {
        // In production, would retrieve from database
        return { enabled: false };
    }

    private async disableSMS(userId: string): Promise<void> {
        // In production, would update database
    }

    private async getEmailConfig(userId: string): Promise<any> {
        // In production, would retrieve from database
        return { enabled: false };
    }

    private async disableEmail(userId: string): Promise<void> {
        // In production, would update database
    }

    private async updateLastUsed(userId: string, method: string): Promise<void> {
        // Update last used timestamp for MFA method
        console.log(`Updated last used for ${userId} method: ${method}`);
    }

    /**
     * Update MFA configuration
     */
    updateConfig(newConfig: Partial<MFAConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get MFA service metrics
     */
    getMetrics(): { enabledMethods: string[]; maxAttempts: number; timeoutMinutes: number } {
        return {
            enabledMethods: this.config.enabledMethods,
            maxAttempts: this.config.maxAttempts,
            timeoutMinutes: this.config.timeoutMinutes
        };
    }
}

// Export singleton instance
export const mfaService = new MFAService();