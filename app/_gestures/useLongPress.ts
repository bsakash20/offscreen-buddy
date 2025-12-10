/**
 * useLongPress - Hook for long press gesture recognition
 * Optimized for accessibility and haptic feedback
 */

import { useCallback, useRef, useState } from 'react';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { HapticType, hapticManager } from '../_utils/HapticManager';

export interface LongPressOptions {
    duration?: number;
    hapticEnabled?: boolean;
    hapticType?: HapticType;
    onLongPressStart?: () => void;
    onLongPress?: () => void;
    onLongPressEnd?: () => void;
    onLongPressCancel?: () => void;
    accessibilityLabel?: string;
}

export interface LongPressResult {
    gestureHandler: (event: PanGestureHandlerGestureEvent) => void;
    stateHandler: (event: PanGestureHandlerGestureEvent) => void;
    isLongPressing: boolean;
    longPressProgress: number; // 0 to 1, progress of long press
    triggerLongPress: () => void;
}

export function useLongPress(options: LongPressOptions = {}): LongPressResult {
    const {
        duration = 500,
        hapticEnabled = true,
        hapticType = HapticType.MEDIUM_TAP,
        onLongPressStart,
        onLongPress,
        onLongPressEnd,
        onLongPressCancel,
        accessibilityLabel = 'Long press to activate',
    } = options;

    const [isLongPressing, setIsLongPressing] = useState(false);
    const [longPressProgress, setLongPressProgress] = useState(0);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);

    // Clear timers
    const clearTimers = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    }, []);

    // Handle long press progress
    const updateProgress = useCallback(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(1, elapsed / duration);
        setLongPressProgress(progress);

        // Trigger haptic feedback at halfway point
        if (hapticEnabled && progress >= 0.5) {
            hapticManager.trigger(hapticType);
        }
    }, [duration, hapticEnabled, hapticType]);

    // Start long press
    const startLongPress = useCallback(() => {
        startTimeRef.current = Date.now();
        setIsLongPressing(true);
        setLongPressProgress(0);

        // Trigger haptic feedback for start
        if (hapticEnabled) {
            hapticManager.trigger(HapticType.LIGHT_TAP);
        }

        onLongPressStart?.();

        // Start progress updates
        progressIntervalRef.current = setInterval(updateProgress, 16); // ~60fps

        // Set long press timer
        timerRef.current = setTimeout(() => {
            clearTimers();
            setIsLongPressing(false);

            if (hapticEnabled) {
                hapticManager.trigger(HapticType.HEAVY_TAP);
            }

            onLongPress?.();
        }, duration);
    }, [duration, hapticEnabled, hapticType, onLongPressStart, onLongPress, updateProgress]);

    // Cancel long press
    const cancelLongPress = useCallback(() => {
        clearTimers();
        setIsLongPressing(false);
        setLongPressProgress(0);
        onLongPressCancel?.();
    }, [onLongPressCancel]);

    // Handle gesture event
    const handleGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { state } = event.nativeEvent;

        // Only process events when gesture is active
        if (state === 3) { // BEGAN
            startLongPress();
        }
    }, [startLongPress]);

    // Handle gesture state change
    const handleStateChange = useCallback(({ nativeEvent }: PanGestureHandlerGestureEvent) => {
        const { state } = nativeEvent;

        if (state === 5) { // END
            if (isLongPressing && longPressProgress < 1) {
                // Long press was interrupted before completion
                cancelLongPress();
            } else if (isLongPressing && longPressProgress >= 1) {
                // Long press completed
                setIsLongPressing(false);
                onLongPressEnd?.();
            }
        } else if (state === 4) { // CANCELLED
            cancelLongPress();
        }
    }, [isLongPressing, longPressProgress, onLongPressEnd, cancelLongPress]);

    // Manual trigger function for accessibility
    const triggerLongPress = useCallback(() => {
        if (!isLongPressing) {
            startLongPress();
            // Auto-complete after duration
            setTimeout(() => {
                if (isLongPressing) {
                    cancelLongPress();
                    onLongPress?.();
                }
            }, duration);
        }
    }, [isLongPressing, startLongPress, cancelLongPress, onLongPress, duration]);

    // Cleanup on unmount
    const cleanup = useCallback(() => {
        clearTimers();
    }, [clearTimers]);

    return {
        gestureHandler: handleGestureEvent,
        stateHandler: handleStateChange,
        isLongPressing,
        longPressProgress,
        triggerLongPress,
    };
}

// Preset configurations for common use cases
export const longPressPresets = {
    // Quick long press for power users
    quick: {
        duration: 300,
        hapticType: HapticType.MEDIUM_TAP,
    },

    // Standard long press duration
    standard: {
        duration: 500,
        hapticType: HapticType.MEDIUM_TAP,
    },

    // Extended long press for confirmations
    extended: {
        duration: 800,
        hapticType: HapticType.HEAVY_TAP,
    },

    // Timer-specific long press for advanced options
    timer: {
        duration: 600,
        hapticType: HapticType.MEDIUM_TAP,
    },
};

export default useLongPress;