/**
 * TouchTimerControls - Advanced timer control component with optimized touch interactions
 * Integrates all touch optimization features for timer controls
 */

import React, { useState, useCallback, forwardRef } from 'react';
import { View, StyleSheet, ViewStyle, GestureResponderEvent } from 'react-native';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { HapticType, hapticManager } from '../../_utils/HapticManager';
import TouchableRipple from './TouchableRipple';
import SwipeableCard from './SwipeableCard';
import TouchFeedback, { touchFeedbackPresets } from './TouchFeedback';
import { useSwipeGesture } from '../../_gestures/useSwipeGesture';
import { useLongPress } from '../../_gestures/useLongPress';

export interface TimerControlAction {
    id: string;
    label: string;
    icon: React.ReactElement;
    hapticType?: HapticType;
    onPress: () => void;
    accessibilityLabel?: string;
}

export interface TouchTimerControlsProps {
    // Timer state
    isRunning?: boolean;
    isPaused?: boolean;
    timeRemaining?: number;

    // Control actions
    primaryAction?: TimerControlAction;
    secondaryActions?: TimerControlAction[];

    // Swipe actions for quick access
    leftSwipeActions?: SwipeAction[];
    rightSwipeActions?: SwipeAction[];

    // Configuration
    enableSwipeGestures?: boolean;
    enableLongPress?: boolean;
    enableHapticFeedback?: boolean;

    // Touch feedback
    touchFeedbackStyle?: 'subtle' | 'standard' | 'strong' | 'timer' | 'disabled';

    // Event handlers
    onEmergencyStop?: () => void;
    onQuickActions?: (action: string) => void;
    onGestureDetected?: (gesture: string, data?: any) => void;

    // Style overrides
    style?: ViewStyle;
    buttonSize?: 'sm' | 'md' | 'lg' | 'xl';

    // Accessibility
    accessibilityLabel?: string;
    testID?: string;
}

interface SwipeAction {
    id: string;
    icon: React.ReactElement;
    label: string;
    color: string;
    hapticType?: HapticType;
    onPress: () => void;
}

const TouchTimerControls = forwardRef<View, TouchTimerControlsProps>(({
    isRunning = false,
    isPaused = false,
    timeRemaining = 0,
    primaryAction,
    secondaryActions = [],
    leftSwipeActions = [],
    rightSwipeActions = [],
    enableSwipeGestures = true,
    enableLongPress = true,
    enableHapticFeedback = true,
    touchFeedbackStyle = 'timer',
    onEmergencyStop,
    onQuickActions,
    onGestureDetected,
    style,
    buttonSize = 'lg',
    accessibilityLabel = 'Timer controls',
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing, elevation } = theme;

    const [lastInteraction, setLastInteraction] = useState<string>('');

    // Get button size styles
    const getButtonSize = () => {
        switch (buttonSize) {
            case 'sm':
                return { size: 44, fontSize: 14 };
            case 'md':
                return { size: 52, fontSize: 16 };
            case 'lg':
                return { size: 64, fontSize: 18 };
            case 'xl':
                return { size: 80, fontSize: 20 };
            default:
                return { size: 64, fontSize: 18 };
        }
    };

    const { size: buttonSizePx, fontSize } = getButtonSize();

    // Get primary action based on timer state
    const getPrimaryAction = useCallback((): TimerControlAction => {
        if (primaryAction) return primaryAction;

        if (isRunning) {
            return {
                id: 'pause',
                label: 'Pause',
                icon: <View style={[styles.icon, styles.pauseIcon]} />,
                hapticType: HapticType.TIMER_PAUSE,
                onPress: () => { },
            };
        } else {
            return {
                id: 'start',
                label: 'Start',
                icon: <View style={[styles.icon, styles.playIcon]} />,
                hapticType: HapticType.TIMER_START,
                onPress: () => { },
            };
        }
    }, [primaryAction, isRunning]);

    // Handle gesture detection
    const handleGestureDetected = useCallback((gesture: string, data?: any) => {
        setLastInteraction(gesture);
        if (enableHapticFeedback && hapticManager) {
            hapticManager.trigger(HapticType.MEDIUM_TAP);
        }
        onGestureDetected?.(gesture, data);
    }, [enableHapticFeedback, onGestureDetected]);

    // Initialize swipe gestures
    const swipeGestures = useSwipeGesture({
        direction: 'horizontal',
        threshold: 60,
        sensitivity: 0.8,
        onSwipeStart: () => handleGestureDetected('swipe_start'),
        onSwipe: (direction, distance) => {
            handleGestureDetected('swipe_active', { direction, distance });
            if (onQuickActions) {
                onQuickActions(`quick_${direction}`);
            }
        },
        onSwipeEnd: (direction, distance) => {
            handleGestureDetected('swipe_complete', { direction, distance });

            // Emergency stop on quick left swipe
            if (direction === 'left' && distance > 100 && onEmergencyStop) {
                if (enableHapticFeedback && hapticManager) {
                    hapticManager.trigger(HapticType.TIMER_CANCEL);
                }
                onEmergencyStop();
            }
        },
    });

    // Initialize long press gestures
    const longPressGestures = useLongPress({
        duration: 600,
        hapticEnabled: enableHapticFeedback,
        hapticType: HapticType.MEDIUM_TAP,
        onLongPressStart: () => handleGestureDetected('long_press_start'),
        onLongPress: () => {
            handleGestureDetected('long_press_complete');
            if (onQuickActions) {
                onQuickActions('advanced_options');
            }
        },
        onLongPressCancel: () => handleGestureDetected('long_press_cancel'),
    });

    // Get touch feedback options
    const getTouchFeedbackOptions = () => {
        return touchFeedbackPresets[touchFeedbackStyle] || touchFeedbackPresets.timer;
    };

    // Render primary control button
    const renderPrimaryButton = () => {
        const action = getPrimaryAction();
        const isDangerous = action.id === 'cancel' || action.id === 'stop';

        return (
            <TouchFeedback
                feedback={getTouchFeedbackOptions()}
                minTouchSize={buttonSizePx}
                accessibilityLabel={action.accessibilityLabel || action.label}
                accessibilityRole="button"
                testID={`primary-button-${action.id}`}
            >
                <TouchableRipple
                    onPress={() => {
                        if (enableHapticFeedback && action.hapticType && hapticManager) {
                            hapticManager.trigger(action.hapticType);
                        }
                        action.onPress();
                        handleGestureDetected('button_press', { action: action.id });
                    }}
                    hapticType={action.hapticType || HapticType.MEDIUM_TAP}
                    minTouchSize={buttonSizePx}
                    accessibilityLabel={action.accessibilityLabel || action.label}
                    testID={`primary-control-${action.id}`}
                >
                    <View style={[
                        styles.primaryButton,
                        {
                            width: buttonSizePx,
                            height: buttonSizePx,
                            backgroundColor: isDangerous
                                ? colors.semantic.error.main
                                : colors.brand.primary[600],
                            elevation: elevation.small.elevation,
                        }
                    ]}>
                        {action.icon}
                    </View>
                </TouchableRipple>
            </TouchFeedback>
        );
    };

    // Render secondary action buttons
    const renderSecondaryButtons = () => {
        if (secondaryActions.length === 0) return null;

        return (
            <View style={styles.secondaryButtons}>
                {secondaryActions.map((action, index) => (
                    <TouchFeedback
                        key={action.id}
                        feedback={getTouchFeedbackOptions()}
                        style={styles.secondaryButtonWrapper}
                        testID={`secondary-button-${action.id}`}
                    >
                        <TouchableRipple
                            onPress={() => {
                                if (enableHapticFeedback && action.hapticType && hapticManager) {
                                    hapticManager.trigger(action.hapticType);
                                }
                                action.onPress();
                                handleGestureDetected('secondary_button_press', { action: action.id });
                            }}
                            hapticType={action.hapticType || HapticType.LIGHT_TAP}
                            minTouchSize={44}
                            accessibilityLabel={action.accessibilityLabel || action.label}
                            testID={`secondary-control-${action.id}`}
                        >
                            <View style={[
                                styles.secondaryButton,
                                {
                                    backgroundColor: colors.system.background.surface,
                                    elevation: elevation.small.elevation,
                                }
                            ]}>
                                {action.icon}
                            </View>
                        </TouchableRipple>
                    </TouchFeedback>
                ))}
            </View>
        );
    };

    // Timer control content
    const timerContent = (
        <View style={styles.timerContent}>
            {/* Primary timer control */}
            <View style={styles.primaryControl}>
                {renderPrimaryButton()}
            </View>

            {/* Secondary actions */}
            {renderSecondaryButtons()}
        </View>
    );

    // If swipe gestures are enabled, wrap in SwipeableCard
    if (enableSwipeGestures && (leftSwipeActions.length > 0 || rightSwipeActions.length > 0)) {
        return (
            <View style={[styles.container, style]} ref={ref} testID={testID}>
                <SwipeableCard
                    leftActions={leftSwipeActions}
                    rightActions={rightSwipeActions}
                    hapticEnabled={enableHapticFeedback}
                    onSwipeLeft={() => handleGestureDetected('swipe_left')}
                    onSwipeRight={() => handleGestureDetected('swipe_right')}
                    onOpen={(direction) => handleGestureDetected('card_opened', { direction })}
                    onClose={() => handleGestureDetected('card_closed')}
                    testID={`swipeable-timer-controls`}
                >
                    {timerContent}
                </SwipeableCard>
            </View>
        );
    }

    // Regular timer controls without swipe
    return (
        <View style={[styles.container, style]} ref={ref} testID={testID}>
            {timerContent}
        </View>
    );
});

TouchTimerControls.displayName = 'TouchTimerControls';

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    timerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryControl: {
        marginBottom: 16,
    },
    primaryButton: {
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        shadowOpacity: 0.1,
    },
    icon: {
        width: 24,
        height: 24,
    },
    playIcon: {
        borderLeftWidth: 0,
        borderTopWidth: 12,
        borderBottomWidth: 12,
        borderLeftColor: 'white',
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
        marginLeft: 4,
    },
    pauseIcon: {
        width: 20,
        height: 20,
        backgroundColor: 'white',
    },
    secondaryButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    secondaryButtonWrapper: {
        marginHorizontal: 4,
    },
    secondaryButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 2,
        shadowOpacity: 0.1,
    },
});

// Preset configurations for different timer scenarios
export const timerControlPresets = {
    // Basic timer with start/pause
    basic: {
        buttonSize: 'lg' as const,
        touchFeedbackStyle: 'standard' as const,
        enableSwipeGestures: false,
        enableLongPress: false,
    },

    // Advanced timer with all features
    advanced: {
        buttonSize: 'xl' as const,
        touchFeedbackStyle: 'timer' as const,
        enableSwipeGestures: true,
        enableLongPress: true,
        enableHapticFeedback: true,
    },

    // Minimal timer for simple interactions
    minimal: {
        buttonSize: 'md' as const,
        touchFeedbackStyle: 'subtle' as const,
        enableSwipeGestures: false,
        enableLongPress: false,
    },

    // Power user timer with gesture shortcuts
    powerUser: {
        buttonSize: 'lg' as const,
        touchFeedbackStyle: 'strong' as const,
        enableSwipeGestures: true,
        enableLongPress: true,
        enableHapticFeedback: true,
    },
};

export default TouchTimerControls;