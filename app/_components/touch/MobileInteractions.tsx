/**
 * MobileInteractions - Central mobile interaction coordinator
 * Integrates all touch optimization features for comprehensive mobile experience
 */

import React, { useState, useCallback, useEffect, forwardRef } from 'react';
import {
    View,
    StyleSheet,
    ViewStyle,
    LayoutChangeEvent,
    DeviceEventEmitter,
} from 'react-native';
import {
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
    State,
} from 'react-native-gesture-handler';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { HapticType, hapticManager } from '../../_utils/HapticManager';
import TouchableRipple from './TouchableRipple';
import SwipeableCard from './SwipeableCard';
import PullToRefresh from './PullToRefresh';
import TouchFeedback, { touchFeedbackPresets } from './TouchFeedback';
import TouchTimerControls from './TouchTimerControls';

export interface InteractionZone {
    id: string;
    type: 'button' | 'swipe' | 'pull' | 'gesture' | 'longPress';
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    enabled: boolean;
    accessibilityLabel?: string;
    onInteraction?: (data: any) => void;
}

export interface MobileInteractionConfig {
    // Global settings
    enableHapticFeedback?: boolean;
    enableAudioFeedback?: boolean;
    enableGestureShortcuts?: boolean;
    enableSwipeNavigation?: boolean;
    enablePullToRefresh?: boolean;

    // Thresholds and sensitivity
    swipeThreshold?: number;
    longPressDuration?: number;
    pinchSensitivity?: number;
    rotationSensitivity?: number;

    // Layout
    safeAreaInsets?: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };

    // Zones
    interactionZones?: InteractionZone[];

    // Callbacks
    onGestureDetected?: (gesture: string, data?: any) => void;
    onEmergencyAction?: () => void;
    onQuickAction?: (action: string) => void;
    onLayoutChange?: (layout: any) => void;
}

export interface MobileInteractionsProps {
    // Content
    children?: React.ReactNode;

    // Configuration
    config?: MobileInteractionConfig;

    // Timer integration
    timerControls?: {
        isRunning: boolean;
        onStart: () => void;
        onPause: () => void;
        onStop: () => void;
        onEmergencyStop?: () => void;
    };

    // Swipe navigation
    swipeNavigation?: {
        enabled: boolean;
        onSwipeLeft?: () => void;
        onSwipeRight?: () => void;
        onSwipeUp?: () => void;
        onSwipeDown?: () => void;
    };

    // Pull to refresh
    pullToRefresh?: {
        enabled: boolean;
        onRefresh: () => Promise<void>;
        refreshing: boolean;
    };

    // Event handlers
    onInteractionStart?: (zoneId: string) => void;
    onInteractionEnd?: (zoneId: string) => void;
    onLayoutChange?: (layout: { width: number; height: number }) => void;

    // Style
    style?: ViewStyle;
    contentStyle?: ViewStyle;

    // Accessibility
    accessibilityLabel?: string;
    testID?: string;
}

const MobileInteractions = forwardRef<View, MobileInteractionsProps>(({
    children,
    config = {},
    timerControls,
    swipeNavigation,
    pullToRefresh,
    onInteractionStart,
    onInteractionEnd,
    onLayoutChange,
    style,
    contentStyle,
    accessibilityLabel = 'Mobile interaction area',
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { elevation } = theme;

    const [layout, setLayout] = useState({ width: 0, height: 0 });
    const [activeZones, setActiveZones] = useState<Set<string>>(new Set());

    // Default configuration
    const defaultConfig: MobileInteractionConfig = {
        enableHapticFeedback: true,
        enableAudioFeedback: false,
        enableGestureShortcuts: true,
        enableSwipeNavigation: true,
        enablePullToRefresh: true,
        swipeThreshold: 100,
        longPressDuration: 600,
        pinchSensitivity: 1,
        rotationSensitivity: 1,
        interactionZones: [],
    };

    const mergedConfig = { ...defaultConfig, ...config };

    // Handle layout changes
    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
        onLayoutChange?.({ width, height });
    }, [onLayoutChange]);

    // Handle gesture detection
    const handleGesture = useCallback((gesture: string, data?: any) => {
        // Trigger haptic feedback for significant gestures
        if (mergedConfig.enableHapticFeedback && ['swipe', 'longPress', 'pinch'].includes(gesture)) {
            hapticManager?.trigger(HapticType.MEDIUM_TAP);
        }

        mergedConfig.onGestureDetected?.(gesture, data);

        // Handle specific gestures
        switch (gesture) {
            case 'emergency':
                mergedConfig.onEmergencyAction?.();
                if (mergedConfig.enableHapticFeedback) {
                    hapticManager?.trigger(HapticType.TIMER_CANCEL);
                }
                break;
            case 'quick_action':
                mergedConfig.onQuickAction?.(data?.action);
                break;
        }
    }, [mergedConfig, theme]);

    // Pan gesture handlers for navigation
    const onPanGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;

        if (!swipeNavigation?.enabled) return;

        const absX = Math.abs(translationX);
        const absY = Math.abs(translationY);

        // Determine gesture type
        if (absX > absY && absX > mergedConfig.swipeThreshold!) {
            // Horizontal swipe
            if (translationX > 0) {
                handleGesture('swipe_right', { translationX, velocityX });
                swipeNavigation.onSwipeRight?.();
            } else {
                handleGesture('swipe_left', { translationX, velocityX });
                swipeNavigation.onSwipeLeft?.();
            }
        } else if (absY > mergedConfig.swipeThreshold!) {
            // Vertical swipe
            if (translationY < 0) {
                handleGesture('swipe_up', { translationY, velocityY });
                swipeNavigation.onSwipeUp?.();
            } else {
                handleGesture('swipe_down', { translationY, velocityY });
                swipeNavigation.onSwipeDown?.();
            }
        }
    }, [swipeNavigation, mergedConfig.swipeThreshold, handleGesture]);

    const onPanStateChange = useCallback(({ nativeEvent }: PanGestureHandlerGestureEvent) => {
        if (nativeEvent.state === State.END) {
            // Handle gesture end
            const { translationX, translationY } = nativeEvent;

            // Emergency gesture: very quick swipe down
            if (translationY > 200) {
                handleGesture('emergency', { translationY });
            }
        }
    }, [handleGesture]);

    // Handle zone interaction
    const handleZoneInteraction = useCallback((zoneId: string, type: string, data?: any) => {
        setActiveZones(prev => new Set([...prev, zoneId]));
        onInteractionStart?.(zoneId);

        // Trigger haptic feedback for interaction zones
        if (mergedConfig.enableHapticFeedback) {
            switch (type) {
                case 'button':
                    hapticManager?.trigger(HapticType.LIGHT_TAP);
                    break;
                case 'swipe':
                    hapticManager?.trigger(HapticType.MEDIUM_TAP);
                    break;
                case 'longPress':
                    hapticManager?.trigger(HapticType.HEAVY_TAP);
                    break;
            }
        }

        // Execute zone callback
        const zone = mergedConfig.interactionZones?.find(z => z.id === zoneId);
        zone?.onInteraction?.(data);

        handleGesture('zone_interaction', { zoneId, type, data });
    }, [mergedConfig, handleGesture, onInteractionStart]);

    // Interaction zone renderer
    const renderInteractionZones = () => {
        if (!mergedConfig.interactionZones?.length) return null;

        return mergedConfig.interactionZones.map(zone => {
            if (!zone.enabled) return null;

            return (
                <TouchableRipple
                    key={zone.id}
                    onPress={() => handleZoneInteraction(zone.id, 'button')}
                    style={{
                        ...styles.interactionZone,
                        left: zone.bounds.x,
                        top: zone.bounds.y,
                        width: zone.bounds.width,
                        height: zone.bounds.height,
                    }}
                    accessibilityLabel={zone.accessibilityLabel || `Interaction zone ${zone.id}`}
                    testID={`zone-${zone.id}`}
                >
                    <View style={{ flex: 1 }} />
                </TouchableRipple>
            );
        });
    };

    // Main content with pull to refresh
    const mainContent = (
        <View style={[styles.content, contentStyle]} onLayout={handleLayout}>
            {pullToRefresh?.enabled ? (
                <PullToRefresh
                    onRefresh={pullToRefresh.onRefresh}
                    refreshing={pullToRefresh.refreshing}
                    onPullStart={() => handleGesture('pull_refresh_start')}
                    onPullEnd={() => handleGesture('pull_refresh_end')}
                    testID="mobile-pull-refresh"
                >
                    {children}
                </PullToRefresh>
            ) : (
                children
            )}
        </View>
    );

    // Timer controls overlay
    const timerOverlay = timerControls ? (
        <View style={styles.timerOverlay}>
            <TouchTimerControls
                isRunning={timerControls.isRunning}
                onEmergencyStop={timerControls.onEmergencyStop}
                onGestureDetected={(gesture, data) => handleGesture('timer_gesture', { gesture, data })}
                buttonSize="lg"
                touchFeedbackStyle="timer"
                testID="mobile-timer-controls"
            />
        </View>
    ) : null;

    // Gesture overlay for navigation
    const gestureOverlay = swipeNavigation?.enabled ? (
        <PanGestureHandler
            onGestureEvent={onPanGestureEvent}
            onHandlerStateChange={onPanStateChange}
        >
            <View style={styles.gestureOverlay} />
        </PanGestureHandler>
    ) : null;

    return (
        <View style={[styles.container, style]} ref={ref} testID={testID}>
            {/* Interaction zones */}
            {renderInteractionZones()}

            {/* Main content */}
            {mainContent}

            {/* Timer controls */}
            {timerOverlay}

            {/* Gesture navigation overlay */}
            {gestureOverlay}

            {/* Accessibility overlays */}
            <View style={styles.accessibilityOverlay} pointerEvents="none" />
        </View>
    );
});

MobileInteractions.displayName = 'MobileInteractions';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    content: {
        flex: 1,
    },
    timerOverlay: {
        position: 'absolute',
        bottom: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    gestureOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999,
    },
    interactionZone: {
        position: 'absolute',
        zIndex: 1001,
        elevation: 2,
    },
    accessibilityOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1002,
        pointerEvents: 'none',
        elevation: 2,
    },
});

// Preset configurations
export const mobileInteractionPresets = {
    // Basic mobile interactions
    basic: {
        enableHapticFeedback: true,
        enableGestureShortcuts: false,
        enableSwipeNavigation: false,
        enablePullToRefresh: true,
    },

    // Advanced mobile experience
    advanced: {
        enableHapticFeedback: true,
        enableAudioFeedback: false,
        enableGestureShortcuts: true,
        enableSwipeNavigation: true,
        enablePullToRefresh: true,
        swipeThreshold: 80,
        longPressDuration: 500,
    },

    // Timer-specific optimization
    timer: {
        enableHapticFeedback: true,
        enableGestureShortcuts: true,
        enableSwipeNavigation: true,
        enablePullToRefresh: true,
        swipeThreshold: 60,
        longPressDuration: 600,
    },

    // Minimal accessibility focus
    accessible: {
        enableHapticFeedback: true,
        enableAudioFeedback: true,
        enableGestureShortcuts: false,
        enableSwipeNavigation: false,
        enablePullToRefresh: false,
    },
};

export default MobileInteractions;