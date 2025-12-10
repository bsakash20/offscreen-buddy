/**
 * TouchableRipple - Material Design ripple effect component
 * Enhanced with haptic feedback and accessibility features
 */

import React, { useState, useCallback, useRef, forwardRef } from 'react';
import {
    View,
    TouchableWithoutFeedback,
    Animated,
    StyleSheet,
    ViewStyle,
    GestureResponderEvent,
    LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { HapticType, hapticManager } from '../../_utils/HapticManager';

export interface TouchableRippleProps {
    // Content
    children: React.ReactNode;

    // Touch behavior
    onPress?: (event: GestureResponderEvent) => void;
    onPressIn?: (event: GestureResponderEvent) => void;
    onPressOut?: (event: GestureResponderEvent) => void;

    // Visual feedback
    rippleColor?: string;
    rippleAlpha?: number;
    rippleDuration?: number;
    scaleDuration?: number;

    // Haptic feedback
    hapticType?: HapticType;
    hapticEnabled?: boolean;

    // Touch target
    minTouchSize?: number;
    hitSlop?: {
        top?: number;
        bottom?: number;
        left?: number;
        right?: number;
    };

    // Style overrides
    style?: ViewStyle;

    // Accessibility
    accessibilityLabel?: string;
    accessibilityRole?: 'button' | 'link';
    testID?: string;
}

interface RipplePoint {
    x: number;
    y: number;
    size: number;
}

const TouchableRipple = forwardRef<View, TouchableRippleProps>(({
    children,
    onPress,
    onPressIn,
    onPressOut,
    rippleColor,
    rippleAlpha = 0.3,
    rippleDuration = 400,
    scaleDuration = 150,
    hapticType = HapticType.LIGHT_TAP,
    hapticEnabled = true,
    minTouchSize = 44,
    hitSlop,
    style,
    accessibilityLabel,
    accessibilityRole = 'button',
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing, elevation } = theme;

    const scaleAnim = useRef(new Animated.Value(1)).current;
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const [ripplePoints, setRipplePoints] = useState<RipplePoint[]>([]);
    const [layout, setLayout] = useState({ width: 0, height: 0 });

    // Get ripple color from theme if not provided
    const getRippleColor = useCallback(() => {
        if (rippleColor) return rippleColor;
        return colors.system.text.inverse || colors.brand.primary[400];
    }, [rippleColor, colors]);

    // Handle layout changes
    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
    }, []);

    // Start ripple animation
    const startRipple = useCallback((event: GestureResponderEvent) => {
        const { locationX, locationY } = event.nativeEvent;

        // Calculate ripple size (diagonal of the touch area)
        const size = Math.sqrt(layout.width ** 2 + layout.height ** 2);

        const newRipple: RipplePoint = {
            x: locationX,
            y: locationY,
            size,
        };

        setRipplePoints(prev => [...prev, newRipple]);

        // Start ripple animation
        Animated.timing(rippleAnim, {
            toValue: 1,
            duration: rippleDuration,
            useNativeDriver: true,
        }).start(() => {
            // Remove ripple after animation completes
            setRipplePoints(prev => prev.filter(ripple => ripple !== newRipple));
            rippleAnim.setValue(0);
        });
    }, [layout, rippleDuration]);

    // Handle press in
    const handlePressIn = useCallback((event: GestureResponderEvent) => {
        // Trigger haptic feedback
        if (hapticEnabled && hapticManager) {
            hapticManager.trigger(hapticType);
        }

        // Start scale animation
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            tension: 300,
            friction: 20,
            useNativeDriver: true,
        }).start();

        // Start ripple animation
        startRipple(event);

        onPressIn?.(event);
    }, [hapticEnabled, hapticType, onPressIn, startRipple]);

    // Handle press out
    const handlePressOut = useCallback(() => {
        // Reset scale animation
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 300,
            friction: 20,
            useNativeDriver: true,
        }).start();

        onPressOut?.(event as any);
    }, [onPressOut]);

    // Handle press
    const handlePress = useCallback((event: GestureResponderEvent) => {
        onPress?.(event);
    }, [onPress]);

    // Render ripple
    const renderRipple = (ripple: RipplePoint, index: number) => {
        const rippleOpacity = rippleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [rippleAlpha, 0],
        });

        const rippleScale = rippleAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 2],
        });

        return (
            <Animated.View
                key={index}
                style={[
                    styles.ripple,
                    {
                        left: ripple.x - ripple.size / 2,
                        top: ripple.y - ripple.size / 2,
                        width: ripple.size,
                        height: ripple.size,
                        backgroundColor: getRippleColor(),
                        opacity: rippleOpacity,
                        transform: [{ scale: rippleScale }],
                    },
                ]}
            />
        );
    };

    return (
        <TouchableWithoutFeedback
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            hitSlop={hitSlop}
            accessibilityLabel={accessibilityLabel}
            accessibilityRole={accessibilityRole}
            testID={testID}
        >
            <View
                ref={ref}
                style={[
                    styles.container,
                    { minWidth: minTouchSize, minHeight: minTouchSize },
                    style,
                ]}
                onLayout={handleLayout}
            >
                <Animated.View
                    style={[
                        styles.content,
                        {
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    {children}
                </Animated.View>

                {/* Render ripples */}
                {ripplePoints.map((ripple, index) => renderRipple(ripple, index))}
            </View>
        </TouchableWithoutFeedback>
    );
});

TouchableRipple.displayName = 'TouchableRipple';

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
    },
});

export default TouchableRipple;