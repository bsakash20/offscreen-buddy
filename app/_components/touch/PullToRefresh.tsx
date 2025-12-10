/**
 * PullToRefresh - Enhanced pull-to-refresh component with haptic feedback
 * Optimized for timer data updates and refresh scenarios
 */

import React, { useState, useRef, useCallback, forwardRef } from 'react';
import {
    View,
    Animated,
    StyleSheet,
    ViewStyle,
    ScrollView,
    RefreshControl as RNRefreshControl,
    GestureResponderEvent,
} from 'react-native';
import {
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
    State,
} from 'react-native-gesture-handler';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { HapticType, hapticManager } from '../../_utils/HapticManager';

export interface PullToRefreshProps {
    // Content
    children: React.ReactNode;

    // Refresh functionality
    onRefresh: () => Promise<void> | void;
    refreshing: boolean;

    // Configuration
    threshold?: number;
    maxDistance?: number;
    pullToRefreshHeight?: number;
    animationDuration?: number;

    // Visual customization
    refreshIndicator?: React.ReactElement;
    refreshIndicatorColor?: string;
    refreshBackgroundColor?: string;

    // Haptic feedback
    hapticEnabled?: boolean;
    hapticType?: HapticType;

    // Event handlers
    onPullStart?: () => void;
    onPullEnd?: () => void;
    onRefreshStart?: () => void;
    onRefreshEnd?: () => void;

    // Style overrides
    style?: ViewStyle;
    contentContainerStyle?: ViewStyle;

    // Accessibility
    accessibilityLabel?: string;
    testID?: string;
}

const DEFAULT_THRESHOLD = 80;
const DEFAULT_PULL_HEIGHT = 60;
const DEFAULT_MAX_DISTANCE = 120;

const PullToRefresh = forwardRef<ScrollView, PullToRefreshProps>(({
    children,
    onRefresh,
    refreshing,
    threshold = DEFAULT_THRESHOLD,
    maxDistance = DEFAULT_MAX_DISTANCE,
    pullToRefreshHeight = DEFAULT_PULL_HEIGHT,
    animationDuration = 300,
    refreshIndicator,
    refreshIndicatorColor,
    refreshBackgroundColor,
    hapticEnabled = true,
    hapticType = HapticType.LIGHT_TAP,
    onPullStart,
    onPullEnd,
    onRefreshStart,
    onRefreshEnd,
    style,
    contentContainerStyle,
    accessibilityLabel = 'Pull to refresh',
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing } = theme;

    const translateY = useRef(new Animated.Value(0)).current;
    const refreshOpacity = useRef(new Animated.Value(0)).current;
    const [isPulling, setIsPulling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(refreshing);

    // Get refresh indicator color
    const getRefreshIndicatorColor = useCallback(() => {
        return refreshIndicatorColor || colors.brand.primary[600];
    }, [refreshIndicatorColor, colors.brand.primary]);

    // Get refresh background color
    const getRefreshBackgroundColor = useCallback(() => {
        return refreshBackgroundColor || colors.system.background.surface;
    }, [refreshBackgroundColor, colors.system.background]);

    // Handle refresh start
    const handleRefreshStart = useCallback(async () => {
        if (hapticEnabled) {
            hapticManager.trigger(hapticType);
        }

        setIsRefreshing(true);
        onRefreshStart?.();

        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
            onRefreshEnd?.();

            // Animate back to original position
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
                Animated.spring(refreshOpacity, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
            ]).start();

            setIsPulling(false);
        }
    }, [hapticEnabled, hapticType, onRefresh, onRefreshStart, onRefreshEnd]);

    // Handle gesture event
    const onGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationY } = event.nativeEvent;

        // Only allow pull down when at the top
        if (translationY <= 0) {
            return;
        }

        // Limit the pull distance
        const clampedDistance = Math.min(translationY, maxDistance);
        translateY.setValue(clampedDistance);

        // Calculate opacity based on pull distance
        const opacity = Math.min(1, clampedDistance / threshold);
        refreshOpacity.setValue(opacity);

        // Set pulling state when threshold is reached
        if (clampedDistance >= threshold && !isPulling) {
            setIsPulling(true);
            if (hapticEnabled) {
                hapticManager.trigger(HapticType.MEDIUM_TAP);
            }
            onPullStart?.();
        } else if (clampedDistance < threshold && isPulling) {
            setIsPulling(false);
            onPullEnd?.();
        }
    }, [maxDistance, threshold, hapticEnabled, isPulling, onPullStart, onPullEnd]);

    // Handle gesture state change
    const onHandlerStateChange = useCallback(({ nativeEvent }: PanGestureHandlerGestureEvent) => {
        const { state, translationY } = nativeEvent;

        if (state === State.END) {
            if (translationY >= threshold && isPulling) {
                // Trigger refresh
                handleRefreshStart();
            } else {
                // Snap back to original position
                Animated.parallel([
                    Animated.spring(translateY, {
                        toValue: 0,
                        tension: 300,
                        friction: 30,
                        useNativeDriver: true,
                    }),
                    Animated.spring(refreshOpacity, {
                        toValue: 0,
                        tension: 300,
                        friction: 30,
                        useNativeDriver: true,
                    }),
                ]).start();

                setIsPulling(false);
                onPullEnd?.();
            }
        }
    }, [threshold, isPulling, handleRefreshStart, onPullEnd]);

    // Handle built-in refresh control state changes
    React.useEffect(() => {
        setIsRefreshing(refreshing);
    }, [refreshing]);

    // Default refresh indicator
    const defaultRefreshIndicator = (
        <View style={[styles.refreshIndicatorContainer, { backgroundColor: getRefreshBackgroundColor() }]}>
            <Animated.View
                style={[
                    styles.refreshIndicator,
                    {
                        opacity: refreshOpacity,
                        transform: [
                            { translateY: Animated.multiply(translateY, 0.5) },
                            { scale: refreshOpacity },
                        ],
                        borderColor: getRefreshIndicatorColor(),
                    },
                ]}
            >
                {refreshIndicator || (
                    <View style={[
                        styles.defaultIndicator,
                        { borderTopColor: getRefreshIndicatorColor() }
                    ]} />
                )}
            </Animated.View>
        </View>
    );

    // Configure built-in RefreshControl
    const refreshControl = (
        <RNRefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefreshStart}
            colors={[getRefreshIndicatorColor()]}
            tintColor={getRefreshIndicatorColor()}
            progressBackgroundColor={getRefreshBackgroundColor()}
            accessibilityLabel={accessibilityLabel}
        />
    );

    return (
        <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
        >
            <Animated.View
                style={[
                    styles.container,
                    style,
                ]}
            >
                {/* Custom refresh indicator */}
                {defaultRefreshIndicator}

                {/* Content with built-in refresh control */}
                <ScrollView
                    ref={ref}
                    style={styles.scrollView}
                    contentContainerStyle={contentContainerStyle}
                    refreshControl={refreshControl}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    showsHorizontalScrollIndicator={false}
                    testID={testID}
                >
                    {children}
                </ScrollView>
            </Animated.View>
        </PanGestureHandler>
    );
});

PullToRefresh.displayName = 'PullToRefresh';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    scrollView: {
        flex: 1,
    },
    refreshIndicatorContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    },
    refreshIndicator: {
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 2,
        borderStyle: 'solid',
        alignItems: 'center',
        justifyContent: 'center',
    },
    defaultIndicator: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderTopColor: '#007AFF',
        borderRightColor: 'transparent',
        borderBottomColor: 'transparent',
        borderLeftColor: 'transparent',
    },
});

export default PullToRefresh;