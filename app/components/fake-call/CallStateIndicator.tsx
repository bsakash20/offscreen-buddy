/**
 * Call State Indicator Component
 * Visual indicator for call state with platform-specific styling
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../../design-system/providers/ThemeProvider';

export type CallState = 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'on_hold';

export interface CallStateIndicatorProps {
    state: CallState;
    duration?: number; // Call duration in seconds
    style?: any;
    showDuration?: boolean;
    variant?: 'default' | 'minimal' | 'detailed';
}

export const CallStateIndicator: React.FC<CallStateIndicatorProps> = ({
    state,
    duration = 0,
    style,
    showDuration = true,
    variant = 'default',
}) => {
    const { theme } = useTheme();

    // Animation value for pulsing effect
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    React.useEffect(() => {
        if (state === 'ringing' || state === 'connecting') {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(scaleAnim, {
                        toValue: 1.1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scaleAnim, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();

            return () => animation.stop();
        } else {
            scaleAnim.setValue(1);
        }
    }, [state, scaleAnim]);

    // Get state configuration
    const getStateConfig = () => {
        switch (state) {
            case 'ringing':
                return {
                    text: 'Incoming Call...',
                    icon: '📱',
                    color: theme.colors.semantic.warning.main,
                    showPulse: true,
                };
            case 'connecting':
                return {
                    text: 'Connecting...',
                    icon: '📞',
                    color: theme.colors.semantic.info.main,
                    showPulse: true,
                };
            case 'connected':
                return {
                    text: 'Connected',
                    icon: '✅',
                    color: theme.colors.semantic.success.main,
                    showPulse: false,
                };
            case 'on_hold':
                return {
                    text: 'On Hold',
                    icon: '⏸️',
                    color: theme.colors.semantic.warning.main,
                    showPulse: false,
                };
            case 'missed':
                return {
                    text: 'Missed Call',
                    icon: '❌',
                    color: theme.colors.semantic.error.main,
                    showPulse: false,
                };
            case 'ended':
                return {
                    text: 'Call Ended',
                    icon: '📵',
                    color: theme.colors.system.text.secondary,
                    showPulse: false,
                };
            default:
                return {
                    text: 'Calling...',
                    icon: '📞',
                    color: theme.colors.system.text.secondary,
                    showPulse: false,
                };
        }
    };

    const config = getStateConfig();

    // Format duration
    const formatDuration = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (variant === 'minimal') {
        return (
            <View style={[styles.minimalContainer, style]}>
                <Text style={[styles.minimalText, { color: config.color }]}>
                    {config.text}
                </Text>
                {showDuration && state === 'connected' && duration > 0 && (
                    <Text style={styles.duration}>
                        {formatDuration(duration)}
                    </Text>
                )}
            </View>
        );
    }

    if (variant === 'detailed') {
        return (
            <Animated.View
                style={[
                    styles.detailedContainer,
                    { borderColor: config.color },
                    config.showPulse && { transform: [{ scale: scaleAnim }] },
                    style,
                ]}
            >
                <View style={[styles.iconContainer, { backgroundColor: config.color }]}>
                    <Text style={styles.icon}>{config.icon}</Text>
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.detailedText, { color: config.color }]}>
                        {config.text}
                    </Text>
                    {showDuration && state === 'connected' && duration > 0 && (
                        <Text style={styles.duration}>
                            {formatDuration(duration)}
                        </Text>
                    )}
                    {state === 'ringing' && (
                        <Text style={styles.subtitle}>
                            Swipe up to answer
                        </Text>
                    )}
                </View>
            </Animated.View>
        );
    }

    // Default variant
    return (
        <Animated.View
            style={[
                styles.container,
                config.showPulse && { transform: [{ scale: scaleAnim }] },
                style,
            ]}
        >
            <Text style={[styles.text, { color: config.color }]}>
                {config.text}
            </Text>
            {showDuration && state === 'connected' && duration > 0 && (
                <Text style={styles.duration}>
                    {formatDuration(duration)}
                </Text>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    duration: {
        fontSize: 14,
        fontWeight: '400',
        color: '#666666',
        marginTop: 4,
    },
    minimalContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    minimalText: {
        fontSize: 14,
        fontWeight: '500',
    },
    detailedContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    icon: {
        fontSize: 16,
    },
    textContainer: {
        flex: 1,
    },
    detailedText: {
        fontSize: 16,
        fontWeight: '600',
    },
    subtitle: {
        fontSize: 12,
        color: '#666666',
        marginTop: 2,
    },
});

export default CallStateIndicator;