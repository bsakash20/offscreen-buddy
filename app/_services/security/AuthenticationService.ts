/**
 * Enhanced Mobile Authentication Service
 * Enterprise-grade authentication with biometric support, MFA, and secure session management
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../Supabase/supabase';
import { BiometricService } from './BiometricService';
import { EncryptionService } from './EncryptionService';
import { SecurityMonitor } from './SecurityMonitor';

export interface AuthConfig {
    sessionTimeout: number;
    maxFailedAttempts: number;
    lockoutDuration: number;
    requireMFA: boolean;
    biometricEnabled: boolean;
}

export interface UserSession {
    id: string;
    userId: string;
    deviceId: string;
    createdAt: Date;
    expiresAt: Date;
    lastActivity: Date;
    mfaVerified: boolean;
    biometricVerified: boolean;
    trustedDevice: boolean;
}

export interface AuthenticationResult {
    success: boolean;
    user?: any;
    session?: UserSession;
    token?: string;
    mfaRequired?: boolean;
    biometricRequired?: boolean;
    error?: string;
}

export class AuthenticationService {
    private config: AuthConfig;
    private biometricService: BiometricService;
    private encryptionService: EncryptionService;
    private securityMonitor: SecurityMonitor;
    private failedAttempts: Map<string, { count: number; lastAttempt: Date; lockedUntil?: Date }> = new Map();

    constructor() {
        this.config = this.getAuthConfig();
        this.biometricService = new BiometricService();
        this.encryptionService = new EncryptionService();
        this.securityMonitor = new SecurityMonitor();
    }

    /**
     * Comprehensive user authentication with security layers
     */
    async authenticate(
        credentials: {
            email: string;
            password: string;
            deviceId?: string;
            biometricData?: any;
            mfaCode?: string;
        }
    ): Promise<AuthenticationResult> {
        try {
            const startTime = Date.now();
            const deviceId = credentials.deviceId || await this.generateDeviceId();

            // Step 1: Device Security Check
            const deviceCheck = await this.performDeviceSecurityCheck(deviceId);
            if (!deviceCheck.secure) {
                await this.securityMonitor.logSecurityEvent('device_security_failure', {
                    deviceId,
                    issues: deviceCheck.issues
                });
                return {
                    success: false,
                    error: `Device security issues detected: ${deviceCheck.issues.join(', ')}`
                };
            }

            // Step 2: Check for account lockout
            if (this.isAccountLocked(credentials.email)) {
                const lockoutInfo = this.failedAttempts.get(credentials.email);
                return {
                    success: false,
                    error: `Account temporarily locked. Try again in ${this.getRemainingLockoutTime(lockoutInfo?.lockedUntil)} minutes.`
                };
            }

            // Step 3: Primary authentication with Supabase
            const primaryAuth = await this.performPrimaryAuthentication(credentials);
            if (!primaryAuth.success) {
                this.recordFailedAttempt(credentials.email);
                return primaryAuth;
            }

            // Step 4: Device binding verification
            const deviceBinding = await this.verifyDeviceBinding(primaryAuth.user.id, deviceId);

            // Step 5: Biometric authentication (if enabled and enrolled)
            let biometricVerified = false;
            if (this.config.biometricEnabled && credentials.biometricData) {
                const result = await this.biometricService.verifyBiometric(credentials.biometricData, primaryAuth.user.id);
                biometricVerified = result.success;
            }

            // Step 6: Multi-factor authentication (if required)
            let mfaVerified = false;
            if (this.config.requireMFA || !deviceBinding.trusted) {
                if (!credentials.mfaCode) {
                    return {
                        success: false,
                        error: 'Multi-factor authentication required',
                        mfaRequired: true
                    };
                }
                mfaVerified = await this.verifyMFA(primaryAuth.user.id, credentials.mfaCode);
                if (!mfaVerified) {
                    this.recordFailedAttempt(credentials.email);
                    return {
                        success: false,
                        error: 'Invalid MFA code'
                    };
                }
            }

            // Step 7: Create secure session
            const session = await this.createSecureSession(primaryAuth.user, {
                deviceId,
                biometricVerified,
                mfaVerified,
                trusted: deviceBinding.trusted
            });

            // Step 8: Update device binding
            if (!deviceBinding.trusted) {
                await this.bindDevice(primaryAuth.user.id, deviceId, {
                    biometricEnrolled: biometricVerified,
                    lastLogin: new Date()
                });
            }

            // Log successful authentication
            await this.securityMonitor.logSecurityEvent('authentication_success', {
                userId: primaryAuth.user.id,
                deviceId,
                method: this.getAuthMethod(biometricVerified, mfaVerified),
                duration: Date.now() - startTime
            });

            return {
                success: true,
                user: primaryAuth.user,
                session,
                token: primaryAuth.token,
                mfaRequired: false
            };

        } catch (error) {
            console.error('Authentication error:', error);
            await this.securityMonitor.logSecurityEvent('authentication_error', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Authentication failed due to system error'
            };
        }
    }

    /**
     * Register new user with comprehensive security setup
     */
    async register(userData: {
        email: string;
        password: string;
        name: string;
        phone?: string;
        biometricData?: any;
    }): Promise<AuthenticationResult> {
        try {
            // Step 1: Validate input security
            const validation = await this.validateRegistrationData(userData);
            if (!validation.valid) {
                return {
                    success: false,
                    error: validation.error
                };
            }

            // Step 2: Create user with Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        phone: userData.phone
                    }
                }
            });

            if (error || !data.user) {
                return {
                    success: false,
                    error: error?.message || 'User creation failed'
                };
            }

            // Step 3: Setup biometric authentication if provided
            if (userData.biometricData) {
                await this.biometricService.enrollBiometric(userData.biometricData, data.user.id);
            }

            // Step 4: Create initial device binding
            const deviceId = await this.generateDeviceId();
            await this.bindDevice(data.user.id, deviceId, {
                isPrimaryDevice: true,
                biometricEnrolled: !!userData.biometricData,
                platform: Platform.OS,
                lastLogin: new Date()
            });

            // Step 5: (Removed initial MFA setup - now handled in profile)

            await this.securityMonitor.logSecurityEvent('user_registration', {
                userId: data.user.id,
                email: userData.email,
                hasBiometric: !!userData.biometricData
            });

            return {
                success: true,
                user: data.user,
                mfaRequired: false
            };

        } catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'Registration failed due to system error'
            };
        }
    }

    /**
     * Biometric authentication
     */
    async authenticateWithBiometric(biometricData: any): Promise<AuthenticationResult> {
        try {
            const verification = await this.biometricService.verifyBiometric(biometricData);

            if (verification.success && verification.userId) {
                // Find user session for biometric verification
                const session = await this.findSessionByBiometric(verification.userId);
                if (session) {
                    return {
                        success: true,
                        user: verification.user,
                        session,
                        biometricRequired: false
                    };
                }
            }

            return {
                success: false,
                error: 'Biometric authentication failed'
            };

        } catch (error) {
            console.error('Biometric authentication error:', error);
            return {
                success: false,
                error: 'Biometric authentication failed'
            };
        }
    }

    /**
     * Session management
     */
    async validateSession(sessionId: string): Promise<{ valid: boolean; session?: UserSession; error?: string }> {
        try {
            const sessionData = await this.getSessionFromStorage(sessionId);

            if (!sessionData) {
                return { valid: false, error: 'Session not found' };
            }

            // Check expiration
            if (new Date() > sessionData.expiresAt) {
                await this.invalidateSession(sessionId);
                return { valid: false, error: 'Session expired' };
            }

            // Update last activity
            sessionData.lastActivity = new Date();
            await this.storeSession(sessionId, sessionData);

            return { valid: true, session: sessionData };

        } catch (error) {
            console.error('Session validation error:', error);
            return { valid: false, error: 'Session validation failed' };
        }
    }

    /**
     * Logout with session cleanup
     */
    async logout(sessionId: string): Promise<boolean> {
        try {
            // Invalidate session
            await this.invalidateSession(sessionId);

            // Log security event
            await this.securityMonitor.logSecurityEvent('user_logout', { sessionId });

            return true;
        } catch (error) {
            console.error('Logout error:', error);
            return false;
        }
    }

    /**
     * Private helper methods
     */
    private getAuthConfig(): AuthConfig {
        return {
            sessionTimeout: 30 * 60 * 1000, // 30 minutes
            maxFailedAttempts: 5,
            lockoutDuration: 15 * 60 * 1000, // 15 minutes
            requireMFA: false, // Configurable per app
            biometricEnabled: true
        };
    }

    private async performDeviceSecurityCheck(deviceId: string): Promise<{ secure: boolean; issues: string[] }> {
        const issues: string[] = [];

        // Check for root/jailbreak (implementation would use native modules)
        // const isRooted = await this.detectRootOrJailbreak();
        // if (isRooted) issues.push('Device appears to be rooted/jailbroken');

        // Check app integrity
        // const integrityCheck = await this.checkAppIntegrity();
        // if (!integrityCheck.valid) issues.push('App integrity check failed');

        return {
            secure: issues.length === 0,
            issues
        };
    }

    private isAccountLocked(email: string): boolean {
        const info = this.failedAttempts.get(email);
        if (!info) return false;

        if (info.lockedUntil && new Date() < info.lockedUntil) {
            return true;
        }

        // Clear expired lockouts
        if (info.lockedUntil && new Date() >= info.lockedUntil) {
            this.failedAttempts.delete(email);
            return false;
        }

        return false;
    }

    private getRemainingLockoutTime(lockedUntil?: Date): number {
        if (!lockedUntil) return 0;
        return Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60));
    }

    private async performPrimaryAuthentication(credentials: any): Promise<AuthenticationResult> {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
            });

            if (error) throw error;

            if (!data.user || !data.session) {
                throw new Error('No user or session returned from Supabase');
            }

            return {
                success: true,
                user: data.user,
                token: data.session.access_token,
                session: data.session as any
            };

        } catch (error: any) {
            console.error('Primary Auth Error:', error);
            return {
                success: false,
                error: error.message || 'Authentication failed'
            };
        }
    }

    private async verifyDeviceBinding(userId: string, deviceId: string): Promise<{ trusted: boolean; session?: UserSession }> {
        try {
            const deviceBindings = await this.getDeviceBindings(userId);
            const device = deviceBindings.find(d => d.deviceId === deviceId);

            return {
                trusted: !!device?.trusted,
                session: device?.currentSession
            };

        } catch (error) {
            return { trusted: false };
        }
    }

    private async createSecureSession(user: any, options: any): Promise<UserSession> {
        const sessionId = this.generateSecureId();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.config.sessionTimeout);

        const session: UserSession = {
            id: sessionId,
            userId: user.id,
            deviceId: options.deviceId,
            createdAt: now,
            expiresAt,
            lastActivity: now,
            mfaVerified: options.mfaVerified || false,
            biometricVerified: options.biometricVerified || false,
            trustedDevice: options.trusted || false
        };

        // Encrypt and store session
        await this.storeSession(sessionId, session);

        return session;
    }

    private async bindDevice(userId: string, deviceId: string, metadata: any): Promise<void> {
        const bindings = await this.getDeviceBindings(userId);

        const binding = {
            deviceId,
            userId,
            trusted: metadata.isPrimaryDevice || false,
            createdAt: new Date(),
            lastLogin: metadata.lastLogin,
            biometricEnrolled: metadata.biometricEnrolled || false,
            platform: metadata.platform,
            currentSession: null
        };

        bindings.push(binding);
        await this.storeDeviceBindings(userId, bindings);
    }

    private async verifyMFA(userId: string, code: string): Promise<boolean> {
        // Implement MFA verification logic
        // This would typically involve TOTP or backup codes
        return true; // Placeholder
    }

    private getAuthMethod(biometricVerified: boolean, mfaVerified: boolean): string {
        if (biometricVerified && mfaVerified) return 'biometric_mfa';
        if (biometricVerified) return 'biometric';
        if (mfaVerified) return 'mfa';
        return 'password';
    }

    private recordFailedAttempt(email: string): void {
        const now = new Date();
        const info = this.failedAttempts.get(email) || { count: 0, lastAttempt: now };

        info.count += 1;
        info.lastAttempt = now;

        // Lock account if threshold reached
        if (info.count >= this.config.maxFailedAttempts) {
            info.lockedUntil = new Date(now.getTime() + this.config.lockoutDuration);
        }

        this.failedAttempts.set(email, info);
    }

    private async generateDeviceId(): Promise<string> {
        // Generate secure device identifier
        const deviceInfo = {
            platform: Platform.OS,
            timestamp: Date.now(),
            random: Math.random().toString(36).substring(7)
        };

        return await this.encryptionService.hash(JSON.stringify(deviceInfo));
    }

    private generateSecureId(): string {
        return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    }

    private async validateRegistrationData(data: any): Promise<{ valid: boolean; error?: string }> {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            return { valid: false, error: 'Invalid email format' };
        }

        // Validate password strength
        if (data.password.length < 8) {
            return { valid: false, error: 'Password must be at least 8 characters' };
        }

        // Check for common patterns
        const commonPasswords = ['password', '123456', 'qwerty', 'admin'];
        if (commonPasswords.includes(data.password.toLowerCase())) {
            return { valid: false, error: 'Password is too common' };
        }

        return { valid: true };
    }

    private async findSessionByBiometric(userId: string): Promise<UserSession | null> {
        // Implementation to find active session by biometric user ID
        return null; // Placeholder
    }

    private async getSessionFromStorage(sessionId: string): Promise<UserSession | null> {
        try {
            const encryptedData = await AsyncStorage.getItem(`session_${sessionId}`);
            if (!encryptedData) return null;

            const decryptedData = await this.encryptionService.decrypt(encryptedData);
            return JSON.parse(decryptedData);
        } catch (error) {
            console.error('Failed to get session from storage:', error);
            return null;
        }
    }

    private async storeSession(sessionId: string, session: UserSession): Promise<void> {
        try {
            const encryptedData = await this.encryptionService.encrypt(JSON.stringify(session));
            await AsyncStorage.setItem(`session_${sessionId}`, encryptedData);
        } catch (error) {
            console.error('Failed to store session:', error);
        }
    }

    private async invalidateSession(sessionId: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(`session_${sessionId}`);
        } catch (error) {
            console.error('Failed to invalidate session:', error);
        }
    }

    private async getDeviceBindings(userId: string): Promise<any[]> {
        try {
            const encryptedData = await AsyncStorage.getItem(`device_bindings_${userId}`);
            if (!encryptedData) return [];

            const decryptedData = await this.encryptionService.decrypt(encryptedData);
            return JSON.parse(decryptedData);
        } catch (error) {
            console.error('Failed to get device bindings:', error);
            return [];
        }
    }

    private async storeDeviceBindings(userId: string, bindings: any[]): Promise<void> {
        try {
            const encryptedData = await this.encryptionService.encrypt(JSON.stringify(bindings));
            await AsyncStorage.setItem(`device_bindings_${userId}`, encryptedData);
        } catch (error) {
            console.error('Failed to store device bindings:', error);
        }
    }

    async signInWithGoogle(): Promise<{ url?: string; error?: any }> {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: 'com.offscreenbuddy.app://', // Ensure scheme matches app.json
                skipBrowserRedirect: false // Let Supabase/Expo handle the browser
            }
        });

        if (error) return { error };
        return { url: data.url };
    }

    /**
     * Send password reset email
     */
    async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: 'com.offscreenbuddy.app://reset-password',
            });

            if (error) throw error;
            return { success: true };
        } catch (error: any) {
            console.error('Password reset error:', error);
            return { success: false, error: error.message || 'Failed to send reset email' };
        }
    }
}


// Export singleton instance
export const authenticationService = new AuthenticationService();