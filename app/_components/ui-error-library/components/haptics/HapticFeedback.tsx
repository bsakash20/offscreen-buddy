/**
 * Haptic Feedback Component for iOS Error UI Library
 * Provides iOS-specific haptic feedback for error components with vibration patterns
 */

import { Platform } from 'react-native';

// React Hook for haptic feedback
import { useCallback } from 'react';

// React Component for automatic haptic feedback
import React, { createContext, useContext } from 'react';

// iOS Haptic Feedback Types
export enum HapticFeedbackType {
    // Light Impact - for minor notifications
    LIGHT_IMPACT = 'light_impact',

    // Medium Impact - for standard notifications
    MEDIUM_IMPACT = 'medium_impact',

    // Heavy Impact - for critical errors
    HEAVY_IMPACT = 'heavy_impact',

    // Selection Changed - for form validation
    SELECTION_CHANGED = 'selection_changed',

    // Notification Success - for successful operations
    NOTIFICATION_SUCCESS = 'notification_success',

    // Notification Warning - for warnings
    NOTIFICATION_WARNING = 'notification_warning',

    // Notification Error - for errors
    NOTIFICATION_ERROR = 'notification_error',

    // Impact Occurred - for button presses
    IMPACT_OCCURRED = 'impact_occurred',
}

// Vibration Patterns for Android fallback
export interface VibrationPattern {
    duration: number; // milliseconds
    delay: number; // milliseconds before vibration starts
    intensity?: number; // 0-255 (Android only)
}

// Custom vibration patterns for different error types
export const VIBRATION_PATTERNS = {
    ERROR: [0, 200, 100, 200] as number[], // Double vibrate for errors
    WARNING: [0, 150] as number[], // Single vibrate for warnings
    SUCCESS: [0, 100, 50, 100, 50, 100] as number[], // Triple short vibrate for success
    INFO: [0, 50] as number[], // Short vibrate for info
    VALIDATION: [0, 75] as number[], // Medium vibrate for validation
    BUTTON_PRESS: [0, 30] as number[], // Very short vibrate for button presses
} as const;

// Haptic feedback configuration
export interface HapticConfig {
    type: HapticFeedbackType;
    enabled?: boolean;
    intensity?: 'low' | 'medium' | 'high';
    pattern?: number[];
    androidVibrationPattern?: VibrationPattern;
}

// Default configurations for different error scenarios
export const DEFAULT_HAPTIC_CONFIGS: Record<string, HapticConfig> = {
    // Error types
    CRITICAL_ERROR: {
        type: HapticFeedbackType.HEAVY_IMPACT,
        intensity: 'high',
    },

    HIGH_ERROR: {
        type: HapticFeedbackType.MEDIUM_IMPACT,
        intensity: 'medium',
    },

    MEDIUM_ERROR: {
        type: HapticFeedbackType.MEDIUM_IMPACT,
        intensity: 'medium',
    },

    LOW_ERROR: {
        type: HapticFeedbackType.SELECTION_CHANGED,
        intensity: 'low',
    },

    // Form validation
    VALIDATION_ERROR: {
        type: HapticFeedbackType.SELECTION_CHANGED,
        intensity: 'medium',
    },

    FORM_FIELD_FOCUS: {
        type: HapticFeedbackType.SELECTION_CHANGED,
        intensity: 'low',
    },

    // Toast notifications
    TOAST_INFO: {
        type: HapticFeedbackType.LIGHT_IMPACT,
        intensity: 'low',
    },

    TOAST_WARNING: {
        type: HapticFeedbackType.NOTIFICATION_WARNING,
        intensity: 'medium',
    },

    TOAST_ERROR: {
        type: HapticFeedbackType.NOTIFICATION_ERROR,
        intensity: 'high',
    },

    TOAST_SUCCESS: {
        type: HapticFeedbackType.NOTIFICATION_SUCCESS,
        intensity: 'medium',
    },

    // Alert dialogs
    ALERT_SHOW: {
        type: HapticFeedbackType.MEDIUM_IMPACT,
        intensity: 'medium',
    },

    ALERT_BUTTON_PRESS: {
        type: HapticFeedbackType.IMPACT_OCCURRED,
        intensity: 'low',
    },

    // Error screens
    ERROR_SCREEN_SHOW: {
        type: HapticFeedbackType.HEAVY_IMPACT,
        intensity: 'high',
    },

    ERROR_SCREEN_RETRY: {
        type: HapticFeedbackType.MEDIUM_IMPACT,
        intensity: 'medium',
    },

    // Network errors
    NETWORK_ERROR: {
        type: HapticFeedbackType.NOTIFICATION_ERROR,
        intensity: 'high',
    },

    NETWORK_RECONNECTED: {
        type: HapticFeedbackType.NOTIFICATION_SUCCESS,
        intensity: 'medium',
    },

    // Payment errors
    PAYMENT_ERROR: {
        type: HapticFeedbackType.HEAVY_IMPACT,
        intensity: 'high',
    },

    PAYMENT_SUCCESS: {
        type: HapticFeedbackType.NOTIFICATION_SUCCESS,
        intensity: 'high',
    },

    // Authentication errors
    AUTH_ERROR: {
        type: HapticFeedbackType.NOTIFICATION_ERROR,
        intensity: 'high',
    },

    AUTH_SUCCESS: {
        type: HapticFeedbackType.NOTIFICATION_SUCCESS,
        intensity: 'medium',
    },
};

// Haptic Feedback Manager
export class HapticFeedbackManager {
    private static instance: HapticFeedbackManager;
    private hapticEnabled: boolean = true;
    private vibrationEnabled: boolean = true;
    private customPatterns: Map<string, VibrationPattern[]> = new Map();

    private constructor() {
        // Check initial haptic settings
        this.initializeSettings();
    }

    public static getInstance(): HapticFeedbackManager {
        if (!HapticFeedbackManager.instance) {
            HapticFeedbackManager.instance = new HapticFeedbackManager();
        }
        return HapticFeedbackManager.instance;
    }

    private initializeSettings(): void {
        // In a real app, you'd check user preferences here
        // For now, we'll use defaults
        this.hapticEnabled = true;
        this.vibrationEnabled = true;
    }

    /**
     * Main method to trigger haptic feedback
     */
    public trigger(config: HapticConfig): void {
        if (!this.isEnabled()) {
            return;
        }

        if (Platform.OS === 'ios') {
            this.triggerIOSHaptic(config);
        } else if (Platform.OS === 'android') {
            this.triggerAndroidVibration(config);
        }
    }

    /**
     * Trigger haptic feedback for specific error scenarios
     */
    public triggerError(errorType: string): void {
        const config = DEFAULT_HAPTIC_CONFIGS[errorType];
        if (config) {
            this.trigger(config);
        }
    }

    /**
     * Trigger haptic feedback using predefined pattern
     */
    public triggerPattern(patternName: keyof typeof VIBRATION_PATTERNS): void {
        if (!this.isEnabled()) {
            return;
        }

        const pattern = VIBRATION_PATTERNS[patternName];
        if (pattern && Platform.OS === 'android') {
            // For Android, use Vibration API
            this.triggerAndroidPattern(pattern);
        } else {
            // For iOS, map to appropriate haptic type
            this.triggerIOSFallback(patternName);
        }
    }

    /**
     * Check if haptic feedback is enabled
     */
    public isEnabled(): boolean {
        return this.hapticEnabled || this.vibrationEnabled;
    }

    /**
     * Enable or disable haptic feedback
     */
    public setEnabled(enabled: boolean): void {
        this.hapticEnabled = enabled;
        this.vibrationEnabled = enabled;
    }

    /**
     * Enable or disable haptic feedback only
     */
    public setHapticEnabled(enabled: boolean): void {
        this.hapticEnabled = enabled;
    }

    /**
     * Enable or disable vibration only
     */
    public setVibrationEnabled(enabled: boolean): void {
        this.vibrationEnabled = enabled;
    }

    /**
     * Add custom vibration pattern
     */
    public addCustomPattern(name: string, pattern: VibrationPattern[]): void {
        this.customPatterns.set(name, pattern);
    }

    /**
     * Remove custom vibration pattern
     */
    public removeCustomPattern(name: string): void {
        this.customPatterns.delete(name);
    }

    /**
     * iOS haptic feedback implementation
     */
    private triggerIOSHaptic(config: HapticConfig): void {
        // Note: This is a mock implementation
        // In a real app, you'd use react-native-haptic-feedback package:
        // import { impactLight, impactMedium, impactHeavy, notificationSuccess, notificationWarning, notificationError, selectionChanged } from 'react-native-haptic-feedback';

        const hapticMap = {
            [HapticFeedbackType.LIGHT_IMPACT]: () => console.log('iOS: Light impact haptic'),
            [HapticFeedbackType.MEDIUM_IMPACT]: () => console.log('iOS: Medium impact haptic'),
            [HapticFeedbackType.HEAVY_IMPACT]: () => console.log('iOS: Heavy impact haptic'),
            [HapticFeedbackType.SELECTION_CHANGED]: () => console.log('iOS: Selection changed haptic'),
            [HapticFeedbackType.NOTIFICATION_SUCCESS]: () => console.log('iOS: Success notification haptic'),
            [HapticFeedbackType.NOTIFICATION_WARNING]: () => console.log('iOS: Warning notification haptic'),
            [HapticFeedbackType.NOTIFICATION_ERROR]: () => console.log('iOS: Error notification haptic'),
            [HapticFeedbackType.IMPACT_OCCURRED]: () => console.log('iOS: Impact occurred haptic'),
        };

        const hapticAction = hapticMap[config.type];
        if (hapticAction) {
            hapticAction();
        }
    }

    /**
     * Android vibration implementation
     */
    private triggerAndroidVibration(config: HapticConfig): void {
        if (!this.vibrationEnabled) {
            return;
        }

        // Note: This is a mock implementation
        // In a real app, you'd use:
        // import { Vibrate } from 'react-native-vibrate';
        // Vibrate.vibrate(config.androidVibrationPattern || 100);

        console.log(`Android: Vibrating with intensity: ${config.intensity || 'medium'}`);
    }

    /**
     * Android pattern-based vibration
     */
    private triggerAndroidPattern(pattern: readonly number[]): void {
        if (!this.vibrationEnabled) {
            return;
        }

        console.log(`Android: Vibrating with pattern: [${Array.from(pattern).join(', ')}]ms`);
    }

    /**
     * iOS fallback for patterns
     */
    private triggerIOSFallback(patternName: keyof typeof VIBRATION_PATTERNS): void {
        // Map patterns to appropriate iOS haptic feedback
        switch (patternName) {
            case 'ERROR':
                this.trigger({ type: HapticFeedbackType.HEAVY_IMPACT, intensity: 'high' });
                break;
            case 'WARNING':
                this.trigger({ type: HapticFeedbackType.NOTIFICATION_WARNING, intensity: 'medium' });
                break;
            case 'SUCCESS':
                this.trigger({ type: HapticFeedbackType.NOTIFICATION_SUCCESS, intensity: 'medium' });
                break;
            case 'INFO':
                this.trigger({ type: HapticFeedbackType.LIGHT_IMPACT, intensity: 'low' });
                break;
            case 'VALIDATION':
                this.trigger({ type: HapticFeedbackType.SELECTION_CHANGED, intensity: 'medium' });
                break;
            case 'BUTTON_PRESS':
                this.trigger({ type: HapticFeedbackType.IMPACT_OCCURRED, intensity: 'low' });
                break;
            default:
                this.trigger({ type: HapticFeedbackType.SELECTION_CHANGED, intensity: 'low' });
        }
    }
}

// Singleton instance
export const hapticFeedback = HapticFeedbackManager.getInstance();

export const useHapticFeedback = () => {
    const manager = HapticFeedbackManager.getInstance();

    const trigger = useCallback((config: HapticConfig) => {
        manager.trigger(config);
    }, [manager]);

    const triggerError = useCallback((errorType: string) => {
        manager.triggerError(errorType);
    }, [manager]);

    const triggerPattern = useCallback((patternName: keyof typeof VIBRATION_PATTERNS) => {
        manager.triggerPattern(patternName);
    }, [manager]);

    return {
        trigger,
        triggerError,
        triggerPattern,
        isEnabled: () => manager.isEnabled(),
        setEnabled: (enabled: boolean) => manager.setEnabled(enabled),
        setHapticEnabled: (enabled: boolean) => manager.setHapticEnabled(enabled),
        setVibrationEnabled: (enabled: boolean) => manager.setVibrationEnabled(enabled),
    };
};

interface HapticContextType {
    trigger: (config: HapticConfig) => void;
    triggerError: (errorType: string) => void;
    triggerPattern: (patternName: keyof typeof VIBRATION_PATTERNS) => void;
}

const HapticContext = createContext<HapticContextType | undefined>(undefined);

export const HapticProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = {
        trigger: (config: HapticConfig) => hapticFeedback.trigger(config),
        triggerError: (errorType: string) => hapticFeedback.triggerError(errorType),
        triggerPattern: (patternName: keyof typeof VIBRATION_PATTERNS) => hapticFeedback.triggerPattern(patternName),
    };

    return (
        <HapticContext.Provider value={value}>
            {children}
        </HapticContext.Provider>
    );
};

export const useHaptic = (): HapticContextType => {
    const context = useContext(HapticContext);
    if (!context) {
        throw new Error('useHaptic must be used within a HapticProvider');
    }
    return context;
};

// Utility functions for common error scenarios
export const HapticUtils = {
    // Error occurred
    onError: (severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
        const type = severity === 'critical' ? 'CRITICAL_ERROR' :
            severity === 'high' ? 'HIGH_ERROR' :
                severity === 'medium' ? 'MEDIUM_ERROR' : 'LOW_ERROR';
        hapticFeedback.triggerError(type);
    },

    // Form validation error
    onValidationError: () => {
        hapticFeedback.triggerError('VALIDATION_ERROR');
    },

    // Network status change
    onNetworkChange: (isConnected: boolean) => {
        if (isConnected) {
            hapticFeedback.triggerError('NETWORK_RECONNECTED');
        } else {
            hapticFeedback.triggerError('NETWORK_ERROR');
        }
    },

    // Payment result
    onPaymentResult: (success: boolean) => {
        if (success) {
            hapticFeedback.triggerError('PAYMENT_SUCCESS');
        } else {
            hapticFeedback.triggerError('PAYMENT_ERROR');
        }
    },

    // Authentication result
    onAuthResult: (success: boolean) => {
        if (success) {
            hapticFeedback.triggerError('AUTH_SUCCESS');
        } else {
            hapticFeedback.triggerError('AUTH_ERROR');
        }
    },

    // Button press feedback
    onButtonPress: () => {
        hapticFeedback.triggerError('BUTTON_PRESS');
    },

    // User interaction feedback
    onUserInteraction: (type: 'select' | 'success' | 'error' | 'warning' | 'info') => {
        switch (type) {
            case 'select':
                hapticFeedback.triggerPattern('VALIDATION');
                break;
            case 'success':
                hapticFeedback.triggerPattern('SUCCESS');
                break;
            case 'error':
                hapticFeedback.triggerPattern('ERROR');
                break;
            case 'warning':
                hapticFeedback.triggerPattern('WARNING');
                break;
            case 'info':
                hapticFeedback.triggerPattern('INFO');
                break;
        }
    },
};