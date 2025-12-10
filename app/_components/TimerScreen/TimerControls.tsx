import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../_design-system/providers/ThemeProvider';

interface TimerControlsProps {
    isPaused: boolean;
    isLocked: boolean;
    onTimeout?: () => void;
    onPauseToggle: () => void;
    onCancel: () => void;
}

export const TimerControls = ({ isPaused, isLocked, onPauseToggle, onCancel }: TimerControlsProps) => {
    const { theme } = useTheme();
    const colors = theme.colors;

    // If locked, we still show buttons but they might be disabled or look different? 
    // Based on index.tsx: disabled={settings.timerLockEnabled && hasPremiumAccess}
    // The props `isLocked` should capture that condition.

    return (
        <View style={styles.controlButtons}>
            {/* Cancel Button */}
            <TouchableOpacity
                style={[
                    styles.controlButton,
                    {
                        backgroundColor: isLocked
                            ? colors.system.background.surface
                            : colors.semantic.error.main,
                        opacity: isLocked ? 0.6 : 1,
                        ...theme.elevation.small,
                    },
                ]}
                onPress={onCancel}
                disabled={isLocked}
                activeOpacity={0.8}
            >
                <Text style={[
                    styles.controlButtonText,
                    {
                        color: isLocked
                            ? colors.system.text.secondary
                            : '#FFFFFF'
                    }
                ]}>
                    {isLocked ? '🔒' : '✕'}
                </Text>
            </TouchableOpacity>

            {/* Pause/Resume Button */}
            <TouchableOpacity
                style={[
                    styles.controlButton,
                    {
                        backgroundColor: isLocked
                            ? colors.system.background.surface
                            : colors.brand.accent[500],
                        opacity: isLocked ? 0.6 : 1,
                        ...theme.elevation.small,
                    },
                ]}
                onPress={onPauseToggle}
                disabled={isLocked}
                activeOpacity={0.8}
            >
                <Text style={[
                    styles.controlButtonText,
                    {
                        color: isLocked
                            ? colors.system.text.secondary
                            : '#FFFFFF'
                    }
                ]}>
                    {isLocked ? '🔒' : (isPaused ? "▶" : "❚❚")}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    controlButtons: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 60,
        marginTop: 40,
        marginBottom: 20,
    },
    controlButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
    },
    controlButtonText: {
        fontSize: 32,
        fontWeight: "300",
    },
});
