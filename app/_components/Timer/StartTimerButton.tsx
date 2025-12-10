import React, { useRef, useState } from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    View,
    Animated,
    Platform,
    LayoutChangeEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../_design-system/providers/ThemeProvider';

interface StartTimerButtonProps {
    onPress: () => void;
    disabled?: boolean;
}

export const StartTimerButton: React.FC<StartTimerButtonProps> = ({
    onPress,
    disabled = false,
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;

    // Animation values
    const scale = useRef(new Animated.Value(1)).current;
    const rippleScale = useRef(new Animated.Value(0)).current;
    const rippleOpacity = useRef(new Animated.Value(0)).current;

    // Layout for ripple centering
    const [layout, setLayout] = useState({ width: 0, height: 0 });

    const handlePressIn = () => {
        if (disabled) return;

        Animated.spring(scale, {
            toValue: 0.95,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
        }).start();
    };

    const handlePressOut = () => {
        if (disabled) return;

        Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 100,
            friction: 5,
        }).start();
    };

    const handlePress = () => {
        if (disabled) return;

        // Haptics
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Ripple Animation
        rippleScale.setValue(0);
        rippleOpacity.setValue(0.5);

        Animated.parallel([
            Animated.timing(rippleScale, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(rippleOpacity, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start(() => {
            // Optional: Reset if needed, but setValue(0) on next press handles it
        });

        onPress();
    };

    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
    };

    // Gradient colors
    const gradientColors = disabled
        ? [colors.system.background.surface, colors.system.background.surface]
        : colors.premium?.gold.main
            ? [colors.premium.gold.main, colors.premium.gold.dark || '#A16207']
            : [colors.brand.primary[500], colors.brand.primary[600]];

    return (
        <View style={styles.container}>
            <Animated.View
                style={[
                    styles.buttonContainer,
                    { transform: [{ scale }] },
                ]}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={handlePress}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                    disabled={disabled}
                    onLayout={onLayout}
                    style={styles.touchable}
                >
                    <LinearGradient
                        colors={gradientColors as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.gradient}
                    >
                        {/* Ripple Effect */}
                        {!disabled && (
                            <Animated.View
                                style={[
                                    styles.ripple,
                                    {
                                        width: layout.width * 2,
                                        height: layout.width * 2,
                                        borderRadius: layout.width,
                                        transform: [{ scale: rippleScale }],
                                        opacity: rippleOpacity,
                                        backgroundColor: 'rgba(255, 255, 255, 0.4)',
                                        // Center ripple
                                        left: -layout.width / 2,
                                        top: -layout.width + (layout.height / 2),
                                    },
                                ]}
                            />
                        )}

                        <View style={styles.content}>
                            <Text style={[styles.text, {
                                color: disabled ? colors.system.text.secondary : colors.system.text.inverse
                            }]}>
                                START FOCUS
                            </Text>
                            {!disabled && (
                                <Ionicons
                                    name="play"
                                    size={20}
                                    color={colors.system.text.inverse}
                                    style={{ marginLeft: 8 }}
                                />
                            )}
                        </View>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    buttonContainer: {
        borderRadius: 30,
        overflow: 'hidden', // Clip ripple
    },
    touchable: {
        borderRadius: 30,
    },
    gradient: {
        paddingVertical: 18,
        paddingHorizontal: 48,
        minWidth: 220,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 30,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 2,
    },
    text: {
        fontSize: 20,
        fontWeight: '700',
        letterSpacing: 1,
    },
    ripple: {
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 1,
    },
});
