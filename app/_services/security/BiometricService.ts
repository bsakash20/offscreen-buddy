/**
 * Biometric Authentication Service
 * Platform-specific biometric authentication for iOS and Android
 */

import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

export interface BiometricConfig {
    allowDeviceCredential: boolean;
    fallbackLabel: string;
    promptMessage: string;
}

export interface BiometricResult {
    success: boolean;
    error?: string;
    biometricType?: LocalAuthentication.AuthenticationType;
    userId?: string;
    user?: any;
}

export interface BiometricEnrollment {
    userId: string;
    biometricType: LocalAuthentication.AuthenticationType;
    enrolledAt: Date;
    lastUsed: Date;
    attempts: number;
    maxAttempts: number;
}

export class BiometricService {
    private config: BiometricConfig;
    private enrollments: Map<string, BiometricEnrollment> = new Map();

    constructor() {
        this.config = {
            allowDeviceCredential: true,
            fallbackLabel: 'Use Passcode',
            promptMessage: 'Authenticate to access OffScreen Buddy'
        };
    }

    /**
     * Check if biometric authentication is available on device
     */
    async isBiometricAvailable(): Promise<{
        available: boolean;
        supportedTypes: LocalAuthentication.AuthenticationType[];
        enrolled: boolean;
    }> {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();

            return {
                available: hasHardware && supportedTypes.length > 0,
                supportedTypes,
                enrolled
            };
        } catch (error) {
            console.error('Biometric availability check failed:', error);
            return {
                available: false,
                supportedTypes: [],
                enrolled: false
            };
        }
    }

    /**
     * Enroll biometric data for user
     */
    async enrollBiometric(
        biometricData: any,
        userId: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Step 1: Check availability
            const availability = await this.isBiometricAvailable();
            if (!availability.available) {
                return {
                    success: false,
                    error: 'Biometric authentication is not available on this device'
                };
            }

            if (!availability.enrolled) {
                return {
                    success: false,
                    error: 'No biometric data is enrolled on this device. Please enroll biometric data in device settings first.'
                };
            }

            // Step 2: Perform biometric authentication to verify enrollment
            const authResult = await this.performBiometricAuth();
            if (!authResult.success) {
                return {
                    success: false,
                    error: authResult.error || 'Biometric enrollment verification failed'
                };
            }

            // Step 3: Store enrollment record
            const enrollment: BiometricEnrollment = {
                userId,
                biometricType: authResult.biometricType || LocalAuthentication.AuthenticationType.FINGERPRINT,
                enrolledAt: new Date(),
                lastUsed: new Date(),
                attempts: 0,
                maxAttempts: 5
            };

            this.enrollments.set(userId, enrollment);
            await this.storeEnrollmentLocally(userId, enrollment);

            return { success: true };

        } catch (error) {
            console.error('Biometric enrollment error:', error);
            return {
                success: false,
                error: 'Failed to enroll biometric authentication'
            };
        }
    }

    /**
     * Verify biometric authentication
     */
    async verifyBiometric(
        biometricData?: any,
        userId?: string
    ): Promise<BiometricResult> {
        try {
            // Step 1: Check availability
            const availability = await this.isBiometricAvailable();
            if (!availability.available) {
                return {
                    success: false,
                    error: 'Biometric authentication is not available'
                };
            }

            if (!availability.enrolled) {
                return {
                    success: false,
                    error: 'No biometric data is enrolled'
                };
            }

            // Step 2: Perform biometric authentication
            const authResult = await this.performBiometricAuth();
            if (!authResult.success) {
                return authResult;
            }

            // Step 3: If userId provided, verify enrollment
            if (userId) {
                const enrollment = this.enrollments.get(userId) || await this.getEnrollmentLocally(userId);
                if (!enrollment) {
                    return {
                        success: false,
                        error: 'Biometric enrollment not found for user'
                    };
                }

                // Check attempts
                if (enrollment.attempts >= enrollment.maxAttempts) {
                    return {
                        success: false,
                        error: 'Too many failed biometric attempts. Please use alternative authentication.'
                    };
                }

                // Update enrollment
                enrollment.lastUsed = new Date();
                enrollment.attempts = 0;
                this.enrollments.set(userId, enrollment);
                await this.storeEnrollmentLocally(userId, enrollment);

                return {
                    success: true,
                    biometricType: authResult.biometricType,
                    userId,
                    user: { id: userId }
                };
            }

            return {
                success: true,
                biometricType: authResult.biometricType
            };

        } catch (error) {
            console.error('Biometric verification error:', error);
            return {
                success: false,
                error: 'Biometric verification failed'
            };
        }
    }

    /**
     * Remove biometric enrollment for user
     */
    async removeBiometricEnrollment(userId: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Remove from memory
            this.enrollments.delete(userId);

            // Remove from local storage
            await this.removeEnrollmentLocally(userId);

            return { success: true };
        } catch (error) {
            console.error('Failed to remove biometric enrollment:', error);
            return {
                success: false,
                error: 'Failed to remove biometric enrollment'
            };
        }
    }

    /**
     * Get biometric enrollment status for user
     */
    async getBiometricStatus(userId: string): Promise<{
        enrolled: boolean;
        lastUsed?: Date;
        attempts: number;
        maxAttempts: number;
    }> {
        const enrollment = this.enrollments.get(userId) || await this.getEnrollmentLocally(userId);

        if (!enrollment) {
            return {
                enrolled: false,
                attempts: 0,
                maxAttempts: 5
            };
        }

        return {
            enrolled: true,
            lastUsed: enrollment.lastUsed,
            attempts: enrollment.attempts,
            maxAttempts: enrollment.maxAttempts
        };
    }

    /**
     * Perform the actual biometric authentication
     */
    private async performBiometricAuth(): Promise<{
        success: boolean;
        error?: string;
        biometricType?: LocalAuthentication.AuthenticationType;
    }> {
        try {
            const options: LocalAuthentication.LocalAuthenticationOptions = {
                promptMessage: this.config.promptMessage,
                fallbackLabel: this.config.fallbackLabel,
                disableDeviceFallback: false,
                cancelLabel: 'Cancel'
            };

            if (Platform.OS === 'android') {
                // options.subtitle = 'Use your biometric to unlock';
                // options.description = 'Confirm your identity';
            }

            const result = await LocalAuthentication.authenticateAsync(options);

            if (result.success) {
                const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
                const biometricType = supportedTypes[0] || LocalAuthentication.AuthenticationType.FINGERPRINT;

                return {
                    success: true,
                    biometricType
                };
            } else {
                return {
                    success: false,
                    error: result.error || 'Authentication failed'
                    // biometricType: result.biometryType
                };
            }
        } catch (error) {
            console.error('Biometric auth error:', error);
            return {
                success: false,
                error: 'Biometric authentication error'
            };
        }
    }

    /**
     * Store enrollment locally (simplified - in production would use secure storage)
     */
    private async storeEnrollmentLocally(userId: string, enrollment: BiometricEnrollment): Promise<void> {
        // In production, this would use SecureStore or similar for Android/iOS
        // For now, using AsyncStorage for demo purposes
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(
            `biometric_enrollment_${userId}`,
            JSON.stringify({
                ...enrollment,
                enrolledAt: enrollment.enrolledAt.toISOString(),
                lastUsed: enrollment.lastUsed.toISOString()
            })
        );
    }

    /**
     * Get enrollment from local storage
     */
    private async getEnrollmentLocally(userId: string): Promise<BiometricEnrollment | null> {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const data = await AsyncStorage.getItem(`biometric_enrollment_${userId}`);

            if (data) {
                const enrollment = JSON.parse(data);
                return {
                    ...enrollment,
                    enrolledAt: new Date(enrollment.enrolledAt),
                    lastUsed: new Date(enrollment.lastUsed)
                };
            }

            return null;
        } catch (error) {
            console.error('Failed to get enrollment from local storage:', error);
            return null;
        }
    }

    /**
     * Remove enrollment from local storage
     */
    private async removeEnrollmentLocally(userId: string): Promise<void> {
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.removeItem(`biometric_enrollment_${userId}`);
        } catch (error) {
            console.error('Failed to remove enrollment from local storage:', error);
        }
    }

    /**
     * Get supported biometric types for current device
     */
    getSupportedBiometricTypes(): LocalAuthentication.AuthenticationType[] {
        // This would be determined by the device capabilities
        // For now, returning common types
        return [
            LocalAuthentication.AuthenticationType.FINGERPRINT,
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
            LocalAuthentication.AuthenticationType.IRIS
        ];
    }

    /**
     * Update biometric configuration
     */
    updateConfig(newConfig: Partial<BiometricConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }
}

// Export singleton instance
export const biometricService = new BiometricService();