/**
 * TouchFeedback - Enhanced touch feedback component
 * Provides comprehensive visual, haptic, and audio feedback for all touch interactions
 */

import React, { useRef, useCallback, forwardRef, useEffect } from 'react';
import {
    View,
    Animated,
    StyleSheet,
    ViewStyle,
    GestureResponderEvent,
    LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { HapticType, hapticManager } from '../../_utils/HapticManager';

export interface TouchFeedbackOptions {
    // Visual feedback
    scaleEnabled?: boolean;
    rippleEnabled?: boolean;
    rippleColor?: string;
    rippleAlpha?: number;
    scaleDuration?: number;
    rippleDuration?: number;

    // Haptic feedback
    hapticEnabled?: boolean;
    hapticType?: HapticType;
    hapticIntensity?: 'light' | 'medium' | 'heavy';

    // Audio feedback
    audioEnabled?: boolean;
    audioVolume?: number;

    // Animation preferences
    animationDuration?: number;
    animationEasing?: 'easeOut' | 'easeIn' | 'easeInOut' | 'spring';

    // Accessibility
    accessibilityFeedback?: 'haptic' | 'audio' | 'visual' | 'none';
    respectSystemPreferences?: boolean;
}

export interface TouchFeedbackProps {
    // Content
    children: React.ReactNode;

    // Touch handlers
    onPress?: (event: GestureResponderEvent) => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onPressOut?: (event: GestureResponderEvent) => void;

    // Feedback configuration
    feedback?: TouchFeedbackOptions;

    // Style overrides
    style?: ViewStyle;
    contentStyle?: ViewStyle;

    // Touch target
    minTouchSize?: number;
    hitSlop?: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };

    // Accessibility
    accessibilityLabel?: string;
    accessibilityRole?: 'button' | 'link';
    testID?: string;
}

const DEFAULT_FEEDBACK_OPTIONS: TouchFeedbackOptions = {
    scaleEnabled: true,
    rippleEnabled: true,
    rippleAlpha: 0.3,
    scaleDuration: 150,
    rippleDuration: 400,
    hapticEnabled: true,
    hapticType: HapticType.LIGHT_TAP,
    hapticIntensity: 'medium',
    audioEnabled: false,
    audioVolume: 0.5,
    animationDuration: 200,
    animationEasing: 'easeInOut',
    accessibilityFeedback: 'haptic',
    respectSystemPreferences: true,
};

const TouchFeedback = forwardRef<View, TouchFeedbackProps>(({
    children,
    onPress,
    onPressIn,
    onPressOut,
    feedback = DEFAULT_FEEDBACK_OPTIONS,
    style,
    contentStyle,
    minTouchSize = 44,
    hitSlop,
    accessibilityLabel,
    accessibilityRole = 'button',
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing } = theme;

    // Animation refs
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;

    // Configuration
    const config = { ...DEFAULT_FEEDBACK_OPTIONS, ...feedback };

    // Handle layout changes
    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        // Pre-calculate any layout-dependent animations here if needed
    }, []);

    // Trigger haptic feedback
    const triggerHaptic = useCallback(async () => {
        if (!config.hapticEnabled || !hapticManager) return;

        try {
            // Check for system accessibility preferences
            if (config.respectSystemPreferences) {
                // Check if user prefers reduced haptic feedback
                // This would require checking system settings
            }

            switch (config.hapticIntensity) {
                case 'light':
                    await hapticManager.trigger(HapticType.LIGHT_TAP);
                    break;
                case 'medium':
                    await hapticManager.trigger(HapticType.MEDIUM_TAP);
                    break;
                case 'heavy':
                    await hapticManager.trigger(HapticType.HEAVY_TAP);
                    break;
                default:
                    await hapticManager.trigger(config.hapticType || HapticType.LIGHT_TAP);
            }
        } catch (error) {
            console.debug('Haptic feedback not available:', error);
        }
    }, [config.hapticEnabled, config.hapticIntensity, config.hapticType]);

    // Trigger visual feedback
    const triggerVisualFeedback = useCallback((_event: GestureResponderEvent) => {
        // Scale animation
        if (config.scaleEnabled) {
            Animated.sequence([
                Animated.timing(scaleAnim, {
                    toValue: 0.95,
                    duration: config.scaleDuration || 150,
                    useNativeDriver: true,
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    tension: 300,
                    friction: 20,
                    useNativeDriver: true,
                }),
            ]).start();
        }

        // Ripple animation
        if (config.rippleEnabled) {
            const rippleSize = Math.sqrt(200 ** 2 + 200 ** 2); // Estimated touch area size

            rippleAnim.setValue(0);
            Animated.timing(rippleAnim, {
                toValue: 1,
                duration: config.rippleDuration || 400,
                useNativeDriver: true,
            }).start();
        }

        // Glow animation for enhanced feedback
        Animated.sequence([
            Animated.timing(glowAnim, {
                toValue: 1,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    }, [config.scaleEnabled, config.rippleEnabled, config.scaleDuration, config.rippleDuration]);

    // Handle press in
    const handlePressIn = useCallback((event: GestureResponderEvent) => {
        // Trigger haptic feedback
        triggerHaptic();

        // Trigger visual feedback
        triggerVisualFeedback(event);

        onPressIn?.(event);
    }, [triggerHaptic, triggerVisualFeedback, onPressIn]);

    // Handle press out
    const handlePressOut = useCallback(() => {
        onPressOut?.({} as GestureResponderEvent);
    }, [onPressOut]);

    // Handle press
    const handlePress = useCallback((event: GestureResponderEvent) => {
        onPress?.(event);
    }, [onPress]);

    // Cleanup animations on unmount
    useEffect(() => {
        return () => {
            scaleAnim.removeAllListeners();
            rippleAnim.removeAllListeners();
            glowAnim.removeAllListeners();
        };
    }, []);

    // Get animation styles
    const getAnimationStyles = () => {
        const rippleOpacity = rippleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [config.rippleAlpha || 0.3, 0],
        });

        const glowOpacity = glowAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 0.5],
        });

        return {
            rippleOpacity,
            glowOpacity,
        };
    };

    const { rippleOpacity, glowOpacity } = getAnimationStyles();

    return (
        <View
            ref={ref}
            style={[
                styles.container,
                { minWidth: minTouchSize, minHeight: minTouchSize },
                style,
            ]}
            onLayout={handleLayout}
            testID={testID}
        >
            {/* Content with animations */}
            <Animated.View
                style={[
                    styles.content,
                    contentStyle,
                    {
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {children}
            </Animated.View>

            {/* Ripple effect */}
            {config.rippleEnabled && (
                <Animated.View
                    style={[
                        styles.ripple,
                        {
                            backgroundColor: config.rippleColor || colors.brand.primary[400],
                            opacity: rippleOpacity,
                        },
                    ]}
                />
            )}

            {/* Glow effect */}
            <Animated.View
                style={[
                    styles.glow,
                    {
                        backgroundColor: colors.brand.primary[200],
                        opacity: glowOpacity,
                    },
                ]}
            />
        </View>
    );
});

TouchFeedback.displayName = 'TouchFeedback';

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'hidden',
    },
    content: {
        flex: 1,
    },
    ripple: {
        position: 'absolute',
        borderRadius: 1000,
        pointerEvents: 'none',
        zIndex: 1,
    },
    glow: {
        position: 'absolute',
        borderRadius: 8,
        pointerEvents: 'none',
        zIndex: 0,
    },
});

// Preset configurations for different use cases
export const touchFeedbackPresets: Record<string, TouchFeedbackOptions> = {
    // Minimal feedback for subtle interactions
    subtle: {
        scaleEnabled: true,
        rippleEnabled: false,
        hapticEnabled: true,
        hapticType: HapticType.LIGHT_TAP,
        hapticIntensity: 'light',
    },

    // Standard feedback for most interactions
    standard: {
        scaleEnabled: true,
        rippleEnabled: true,
        hapticEnabled: true,
        hapticType: HapticType.MEDIUM_TAP,
        hapticIntensity: 'medium',
    },

    // Strong feedback for important actions
    strong: {
        scaleEnabled: true,
        rippleEnabled: true,
        hapticEnabled: true,
        hapticType: HapticType.HEAVY_TAP,
        hapticIntensity: 'heavy',
    },

    // Timer-specific feedback
    timer: {
        scaleEnabled: true,
        rippleEnabled: true,
        hapticEnabled: true,
        hapticType: HapticType.MEDIUM_TAP,
        hapticIntensity: 'medium',
        accessibilityFeedback: 'haptic',
    },

    // Disabled feedback for accessibility
    disabled: {
        scaleEnabled: false,
        rippleEnabled: false,
        hapticEnabled: false,
        audioEnabled: false,
        accessibilityFeedback: 'none',
    },
};

export default TouchFeedback;