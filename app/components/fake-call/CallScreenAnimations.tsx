/**
 * Call Screen Animations Component
 * Animated visual effects for call screens with platform-specific animations
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';

export interface CallScreenAnimationsProps {
    isActive: boolean;
    animationType?: 'pulse' | 'ring' | 'wave' | 'dots' | 'minimal';
    color?: string;
    size?: number;
    style?: any;
    intensity?: 'low' | 'medium' | 'high';
}

export const CallScreenAnimations: React.FC<CallScreenAnimationsProps> = ({
    isActive,
    animationType = 'pulse',
    color,
    size = 40,
    style,
    intensity = 'medium',
}) => {
    const { theme } = useTheme();

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.8)).current;
    const opacityAnim = useRef(new Animated.Value(0.6)).current;
    const rotationAnim = useRef(new Animated.Value(0)).current;

    // Ring animation values
    const ring1Anim = useRef(new Animated.Value(0)).current;
    const ring2Anim = useRef(new Animated.Value(0)).current;
    const ring3Anim = useRef(new Animated.Value(0)).current;

    // Wave animation values
    const wave1Anim = useRef(new Animated.Value(1)).current;
    const wave2Anim = useRef(new Animated.Value(1)).current;
    const wave3Anim = useRef(new Animated.Value(1)).current;

    // Dots animation values
    const dotsAnim = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;

    const accentColor = color || theme.colors.brand.primary[600];

    // Get intensity settings
    const getIntensitySettings = () => {
        switch (intensity) {
            case 'low':
                return { scale: 0.1, opacity: 0.3, duration: 2000 };
            case 'medium':
                return { scale: 0.15, opacity: 0.5, duration: 1500 };
            case 'high':
                return { scale: 0.2, opacity: 0.7, duration: 1000 };
            default:
                return { scale: 0.15, opacity: 0.5, duration: 1500 };
        }
    };

    const intensitySettings = getIntensitySettings();

    // Pulse Animation
    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 1 + intensitySettings.scale,
                        duration: intensitySettings.duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: intensitySettings.opacity,
                        duration: intensitySettings.duration,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: intensitySettings.duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacityAnim, {
                        toValue: 0.6,
                        duration: intensitySettings.duration,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        ).start();
    };

    // Ring Animation
    const startRingAnimation = () => {
        const createRingAnimation = (animValue: Animated.Value, delay: number = 0) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animValue, {
                        toValue: 1,
                        duration: intensitySettings.duration,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animValue, {
                        toValue: 0,
                        duration: intensitySettings.duration,
                        useNativeDriver: true,
                    }),
                ])
            );
        };

        createRingAnimation(ring1Anim, 0).start();
        createRingAnimation(ring2Anim, intensitySettings.duration / 3).start();
        createRingAnimation(ring3Anim, (intensitySettings.duration / 3) * 2).start();
    };

    // Wave Animation
    const startWaveAnimation = () => {
        const createWaveAnimation = (animValue: Animated.Value, delay: number = 0) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(animValue, {
                            toValue: 1.5,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(animValue, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            );
        };

        createWaveAnimation(wave1Anim, 0).start();
        createWaveAnimation(wave2Anim, 333).start();
        createWaveAnimation(wave3Anim, 666).start();
    };

    // Dots Animation
    const startDotsAnimation = () => {
        const animateDot = (animValue: Animated.Value, index: number) => {
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(index * 200),
                    Animated.parallel([
                        Animated.timing(animValue, {
                            toValue: 1,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                        Animated.timing(animValue, {
                            toValue: 0,
                            duration: 400,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            );
        };

        dotsAnim.forEach((anim, index) => {
            animateDot(anim, index).start();
        });
    };

    // Start appropriate animation
    useEffect(() => {
        if (isActive) {
            switch (animationType) {
                case 'pulse':
                    startPulseAnimation();
                    break;
                case 'ring':
                    startRingAnimation();
                    break;
                case 'wave':
                    startWaveAnimation();
                    break;
                case 'dots':
                    startDotsAnimation();
                    break;
                case 'minimal':
                    startPulseAnimation();
                    break;
            }
        } else {
            // Reset animations
            scaleAnim.setValue(0.8);
            opacityAnim.setValue(0.6);
            ring1Anim.setValue(0);
            ring2Anim.setValue(0);
            ring3Anim.setValue(0);
            wave1Anim.setValue(1);
            wave2Anim.setValue(1);
            wave3Anim.setValue(1);
            dotsAnim.forEach(anim => anim.setValue(0));
        }

        return () => {
            // Cleanup would be handled by Animated.loop return values
        };
    }, [isActive, animationType, intensity]);

    // Render different animation types
    const renderAnimation = () => {
        switch (animationType) {
            case 'pulse':
                return (
                    <Animated.View
                        style={[
                            styles.pulseContainer,
                            {
                                width: size,
                                height: size,
                                backgroundColor: accentColor,
                                transform: [{ scale: scaleAnim }],
                                opacity: opacityAnim,
                            },
                            style,
                        ]}
                    />
                );

            case 'ring':
                return (
                    <View style={[styles.ringContainer, style]}>
                        <Animated.View
                            style={[
                                styles.ring,
                                {
                                    width: size,
                                    height: size,
                                    borderColor: accentColor,
                                    transform: [{ scale: ring1Anim }],
                                    opacity: Animated.subtract(1, ring1Anim),
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.ring,
                                {
                                    width: size * 1.5,
                                    height: size * 1.5,
                                    borderColor: accentColor,
                                    transform: [{ scale: ring2Anim }],
                                    opacity: Animated.subtract(1, ring2Anim),
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.ring,
                                {
                                    width: size * 2,
                                    height: size * 2,
                                    borderColor: accentColor,
                                    transform: [{ scale: ring3Anim }],
                                    opacity: Animated.subtract(1, ring3Anim),
                                },
                            ]}
                        />
                    </View>
                );

            case 'wave':
                return (
                    <View style={[styles.waveContainer, style]}>
                        <Animated.View
                            style={[
                                styles.wave,
                                {
                                    width: size * 2,
                                    height: size * 2,
                                    borderRadius: size,
                                    backgroundColor: accentColor,
                                    transform: [{ scale: wave1Anim }],
                                    opacity: Animated.subtract(1, wave1Anim),
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.wave,
                                {
                                    width: size * 1.5,
                                    height: size * 1.5,
                                    borderRadius: size * 0.75,
                                    backgroundColor: accentColor,
                                    transform: [{ scale: wave2Anim }],
                                    opacity: Animated.subtract(1, wave2Anim),
                                },
                            ]}
                        />
                        <Animated.View
                            style={[
                                styles.wave,
                                {
                                    width: size,
                                    height: size,
                                    borderRadius: size * 0.5,
                                    backgroundColor: accentColor,
                                    transform: [{ scale: wave3Anim }],
                                    opacity: Animated.subtract(1, wave3Anim),
                                },
                            ]}
                        />
                    </View>
                );

            case 'dots':
                return (
                    <View style={[styles.dotsContainer, style]}>
                        {dotsAnim.map((anim, index) => (
                            <Animated.View
                                key={index}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor: accentColor,
                                        transform: [{ scale: Animated.add(0.7, anim) }],
                                        opacity: Animated.add(0.3, anim),
                                    },
                                ]}
                            />
                        ))}
                    </View>
                );

            case 'minimal':
            default:
                return (
                    <Animated.View
                        style={[
                            styles.minimalContainer,
                            {
                                width: size * 0.6,
                                height: size * 0.6,
                                borderRadius: size * 0.3,
                                borderWidth: 2,
                                borderColor: accentColor,
                                borderTopColor: 'transparent',
                                transform: [{ rotate: rotationAnim }],
                            },
                            style,
                        ]}
                    />
                );
        }
    };

    if (!isActive) {
        return null;
    }

    return (
        <View style={styles.animatedContainer}>
            {renderAnimation()}
        </View>
    );
};

const styles = StyleSheet.create({
    animatedContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    pulseContainer: {
        borderRadius: 20,
    },
    ringContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    ring: {
        position: 'absolute',
        borderRadius: 20,
        borderWidth: 2,
    },
    waveContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    wave: {
        position: 'absolute',
    },
    dotsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginHorizontal: 2,
    },
    minimalContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default CallScreenAnimations;