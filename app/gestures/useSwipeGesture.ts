/**
 * useSwipeGesture - Hook for swipe gesture recognition
 * Provides advanced swipe detection with configurable thresholds and directions
 */

import { useCallback, useRef, useState } from 'react';
import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { Animated } from 'react-native';

export interface SwipeGestureOptions {
    direction?: 'horizontal' | 'vertical' | 'both';
    threshold?: number;
    velocityThreshold?: number;
    sensitivity?: number;
    onSwipeStart?: () => void;
    onSwipe?: (direction: SwipeDirection, distance: number) => void;
    onSwipeEnd?: (direction: SwipeDirection, totalDistance: number) => void;
    onSwipeCancel?: () => void;
}

export type SwipeDirection = 'left' | 'right' | 'up' | 'down';

export interface SwipeGestureResult {
    gestureHandler: (event: PanGestureHandlerGestureEvent) => void;
    stateHandler: (event: PanGestureHandlerGestureEvent) => void;
    translateX: Animated.Value;
    translateY: Animated.Value;
    isSwiping: boolean;
    currentDirection: SwipeDirection | null;
    swipeDistance: number;
    setSwipeDistance: (distance: number) => void;
    setIsSwiping: (swiping: boolean) => void;
    setCurrentDirection: (direction: SwipeDirection | null) => void;
}

export function useSwipeGesture(options: SwipeGestureOptions = {}): SwipeGestureResult {
    const {
        direction = 'both',
        threshold = 50,
        velocityThreshold = 1000,
        sensitivity = 1,
        onSwipeStart,
        onSwipe,
        onSwipeEnd,
        onSwipeCancel,
    } = options;

    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const [isSwiping, setIsSwiping] = useState(false);
    const [currentDirection, setCurrentDirection] = useState<SwipeDirection | null>(null);
    const [swipeDistance, setSwipeDistance] = useState(0);

    // Keep internal refs for gesture processing
    const internalDirection = useRef(-1); // -1: none, 0: left, 1: right, 2: up, 3: down
    const internalDistance = useRef(0);

    // Animation helpers
    const resetAnimations = useCallback(() => {
        translateX.setValue(0);
        translateY.setValue(0);
        isSwiping.setValue(0);
        currentDirection.setValue(-1);
        swipeDistance.setValue(0);
    }, [translateX, translateY, isSwiping, currentDirection, swipeDistance]);

    // Handle gesture start
    const handleGestureStart = useCallback(() => {
        setIsSwiping(true);
        internalDirection.current = -1;
        internalDistance.current = 0;
        onSwipeStart?.();
    }, [onSwipeStart]);

    // Handle gesture event
    const handleGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationX, translationY } = event.nativeEvent;

        const absX = Math.abs(translationX);
        const absY = Math.abs(translationY);

        // Determine primary direction
        let directionIndex = -1;
        let swipeDir: SwipeDirection = 'right';

        if (direction === 'horizontal' || (direction === 'both' && absX > absY)) {
            if (translationX < -threshold) {
                directionIndex = 0; // left
                swipeDir = 'left';
            } else if (translationX > threshold) {
                directionIndex = 1; // right
                swipeDir = 'right';
            }

            const constrainedX = Math.max(-threshold * 2, Math.min(threshold * 2, translationX));
            translateX.setValue(constrainedX);

            if (absX > threshold * sensitivity) {
                internalDirection.current = directionIndex;
                internalDistance.current = absX;
                setCurrentDirection(swipeDir);
                setSwipeDistance(absX);
                onSwipe?.(swipeDir, absX);
            }
        } else if (direction === 'vertical' || (direction === 'both' && absY >= absX)) {
            if (translationY < -threshold) {
                directionIndex = 2; // up
                swipeDir = 'up';
            } else if (translationY > threshold) {
                directionIndex = 3; // down
                swipeDir = 'down';
            }

            const constrainedY = Math.max(-threshold * 2, Math.min(threshold * 2, translationY));
            translateY.setValue(constrainedY);

            if (absY > threshold * sensitivity) {
                internalDirection.current = directionIndex;
                internalDistance.current = absY;
                setCurrentDirection(swipeDir);
                setSwipeDistance(absY);
                onSwipe?.(swipeDir, absY);
            }
        }
    }, [direction, threshold, sensitivity, onSwipe, translateX, translateY]);

    // Handle gesture end
    const handleGestureEnd = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;

        const absX = Math.abs(translationX);
        const absY = Math.abs(translationY);
        const absVelX = Math.abs(velocityX);
        const absVelY = Math.abs(velocityY);

        // Check if swipe meets velocity threshold
        const meetsVelocityThreshold =
            (direction === 'horizontal' && absVelX > velocityThreshold) ||
            (direction === 'vertical' && absVelY > velocityThreshold) ||
            (direction === 'both' && (absVelX > velocityThreshold || absVelY > velocityThreshold));

        // Get final direction and distance
        let finalDirection: SwipeDirection = 'right';
        let finalDistance = 0;

        if (direction === 'horizontal' || (direction === 'both' && absX > absY)) {
            finalDistance = absX;
            finalDirection = translationX < 0 ? 'left' : 'right';
        } else if (direction === 'vertical' || (direction === 'both' && absY >= absX)) {
            finalDistance = absY;
            finalDirection = translationY < 0 ? 'up' : 'down';
        }

        // Check if swipe is valid
        const isValidSwipe =
            (meetsVelocityThreshold && finalDistance > threshold) ||
            (finalDistance > threshold * 1.5);

        if (isValidSwipe && isSwiping) {
            // Complete swipe
            onSwipeEnd?.(finalDirection, finalDistance);

            // Animate back to original position
            if (direction === 'horizontal' || (direction === 'both' && absX > absY)) {
                Animated.spring(translateX, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }).start();
            } else if (direction === 'vertical' || (direction === 'both' && absY >= absX)) {
                Animated.spring(translateY, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }).start();
            }
        } else {
            // Cancel swipe
            onSwipeCancel?.();

            // Animate back to original position
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
                Animated.spring(translateY, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
            ]).start();
        }

        // Reset state
        setIsSwiping(false);
        setCurrentDirection(null);
        setSwipeDistance(0);

        // Reset internal state
        internalDirection.current = -1;
        internalDistance.current = 0;
    }, [direction, threshold, velocityThreshold, onSwipeEnd, onSwipeCancel, translateX, translateY, isSwiping, setIsSwiping, setCurrentDirection, setSwipeDistance]);

    return {
        gestureHandler: handleGestureEvent,
        stateHandler: ({ nativeEvent }: PanGestureHandlerGestureEvent) => {
            if (nativeEvent.state === 3) { // BEGAN
                handleGestureStart();
            } else if (nativeEvent.state === 5) { // END
                handleGestureEnd({ nativeEvent } as PanGestureHandlerGestureEvent);
            }
        },
        translateX,
        translateY,
        isSwiping,
        currentDirection,
        swipeDistance,
        setSwipeDistance,
        setIsSwiping,
        setCurrentDirection,
    };
}

// Preset configurations for common use cases
export const swipePresets = {
    // Quick, short swipes like iOS table rows
    quick: {
        threshold: 30,
        velocityThreshold: 800,
        sensitivity: 0.8,
    },

    // Standard swipe actions
    standard: {
        threshold: 50,
        velocityThreshold: 1000,
        sensitivity: 1,
    },

    // Long swipes for advanced gestures
    long: {
        threshold: 100,
        velocityThreshold: 1500,
        sensitivity: 1.2,
    },

    // Customizable timer swipes
    timer: {
        threshold: 40,
        velocityThreshold: 900,
        sensitivity: 1,
    },
};

export default useSwipeGesture;