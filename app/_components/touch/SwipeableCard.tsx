/**
 * SwipeableCard - Advanced swipeable container with gesture recognition
 * Optimized for timer controls and quick actions
 */

import React, { useState, useRef, useCallback, forwardRef, useEffect } from 'react';
import {
    View,
    Animated,
    StyleSheet,
    ViewStyle,
    LayoutChangeEvent,
    GestureResponderEvent,
    Text,
} from 'react-native';
import {
    PanGestureHandler,
    PanGestureHandlerGestureEvent,
    State,
    GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { HapticType, hapticManager } from '../../_utils/HapticManager';

export interface SwipeAction {
    id: string;
    icon: React.ReactElement;
    label: string;
    color: string;
    hapticType?: HapticType;
    onPress: () => void;
    background?: string;
}

export interface SwipeableCardProps {
    // Content
    children: React.ReactNode;

    // Swipe actions
    leftActions?: SwipeAction[];
    rightActions?: SwipeAction[];

    // Configuration
    threshold?: number;
    maxSwipeDistance?: number;
    animationDuration?: number;
    backgroundOpacity?: number;
    showLabels?: boolean;

    // Haptic feedback
    hapticEnabled?: boolean;

    // Event handlers
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    onOpen?: (direction: 'left' | 'right') => void;
    onClose?: () => void;
    onSwipeStart?: () => void;
    onSwipeEnd?: () => void;

    // Style overrides
    style?: ViewStyle;

    // Accessibility
    accessibilityLabel?: string;
    testID?: string;
}

const SWIPE_THRESHOLD = 100;
const ANIMATION_DURATION = 250;
const MAX_ROTATION = 0.1; // Maximum rotation for visual effect

const SwipeableCard = forwardRef<View, SwipeableCardProps>(({
    children,
    leftActions = [],
    rightActions = [],
    threshold = SWIPE_THRESHOLD,
    maxSwipeDistance = 150,
    animationDuration = ANIMATION_DURATION,
    backgroundOpacity = 0.8,
    showLabels = true,
    hapticEnabled = true,
    onSwipeLeft,
    onSwipeRight,
    onOpen,
    onClose,
    onSwipeStart,
    onSwipeEnd,
    style,
    accessibilityLabel,
    testID,
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing, borderRadius } = theme;

    const translateX = useRef(new Animated.Value(0)).current;
    const rotateZ = useRef(new Animated.Value(0)).current;
    const [cardWidth, setCardWidth] = useState(0);
    const [isOpen, setIsOpen] = useState<'left' | 'right' | null>(null);
    const [actionOpacity, setActionOpacity] = useState(0);

    // Handle layout changes
    const handleLayout = useCallback((event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setCardWidth(width);
    }, []);

    // Get action background color
    const getActionColor = useCallback((actions: SwipeAction[], isLeft: boolean) => {
        if (actions.length === 0) return 'transparent';
        return isLeft ? actions[0].color : actions[0].color;
    }, []);

    // Get action handler
    const getActionHandler = useCallback((actions: SwipeAction[]) => {
        if (actions.length === 0) return undefined;
        return actions[0];
    }, []);

    // Handle gesture start
    const handleGestureStart = useCallback(() => {
        if (hapticEnabled) {
            hapticManager.trigger(HapticType.LIGHT_TAP);
        }
        onSwipeStart?.();
    }, [hapticEnabled, onSwipeStart]);

    // Handle gesture end
    const handleGestureEnd = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationX } = event.nativeEvent;

        // Use the current translation directly from the gesture event
        if (Math.abs(translationX) > threshold) {
            const direction = translationX > 0 ? 'right' : 'left';
            const newPosition = direction === 'right' ? maxSwipeDistance : -maxSwipeDistance;

            // Animate to the swipe position
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: newPosition,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
                Animated.spring(rotateZ, {
                    toValue: direction === 'right' ? MAX_ROTATION : -MAX_ROTATION,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
            ]).start();

            setIsOpen(direction);
            onOpen?.(direction);

            // Trigger haptic feedback based on direction
            if (hapticEnabled) {
                const actionHandler = getActionHandler(direction === 'right' ? rightActions : leftActions);
                if (actionHandler?.hapticType) {
                    hapticManager.trigger(actionHandler.hapticType);
                }
            }

            // Trigger swipe callbacks
            if (direction === 'left') {
                onSwipeLeft?.();
            } else {
                onSwipeRight?.();
            }
        } else {
            // Snap back to original position
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
                Animated.spring(rotateZ, {
                    toValue: 0,
                    tension: 300,
                    friction: 30,
                    useNativeDriver: true,
                }),
            ]).start();

            setIsOpen(null);
            onSwipeEnd?.();
        }
    }, [threshold, maxSwipeDistance, hapticEnabled, onSwipeLeft, onSwipeRight, onOpen, onClose, onSwipeEnd, getActionHandler, leftActions, rightActions]);

    // Handle gesture event
    const onGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
        const { translationX } = event.nativeEvent;

        // Limit the swipe distance
        const clampedX = Math.max(-maxSwipeDistance, Math.min(maxSwipeDistance, translationX));

        translateX.setValue(clampedX);

        // Calculate rotation based on swipe
        const rotation = cardWidth > 0 ? (clampedX / cardWidth) * MAX_ROTATION : 0;
        rotateZ.setValue(Math.max(-MAX_ROTATION, Math.min(MAX_ROTATION, rotation)));

        // Update action opacity
        const opacity = Math.min(1, Math.abs(clampedX) / threshold);
        setActionOpacity(opacity);
    }, [cardWidth, maxSwipeDistance, threshold]);

    // Close card
    const closeCard = useCallback(() => {
        Animated.parallel([
            Animated.spring(translateX, {
                toValue: 0,
                tension: 300,
                friction: 30,
                useNativeDriver: true,
            }),
            Animated.spring(rotateZ, {
                toValue: 0,
                tension: 300,
                friction: 30,
                useNativeDriver: true,
            }),
        ]).start();

        setIsOpen(null);
        setActionOpacity(0);
        onClose?.();
    }, [onClose]);

    // Handle action press
    const handleActionPress = useCallback((action: SwipeAction) => {
        if (hapticEnabled && action.hapticType) {
            hapticManager.trigger(action.hapticType);
        }

        action.onPress();
        closeCard();
    }, [hapticEnabled, closeCard]);

    // Reset card when isOpen changes
    useEffect(() => {
        if (isOpen === null) {
            closeCard();
        }
    }, [isOpen, closeCard]);

    // Render action buttons
    const renderActions = useCallback((actions: SwipeAction[], isLeft: boolean) => {
        if (actions.length === 0) return null;

        const actionHandler = actions[0];

        return (
            <View
                style={[
                    styles.actionContainer,
                    isLeft ? styles.leftAction : styles.rightAction,
                    {
                        backgroundColor: actionHandler.background || getActionColor(actions, isLeft),
                        opacity: actionOpacity,
                    }
                ]}
            >
                <View style={styles.actionContent}>
                    {actionHandler.icon}
                    {showLabels && actionHandler.label && (
                        <Animated.Text
                            style={[
                                styles.actionLabel,
                                {
                                    color: colors.system.text.inverse,
                                    opacity: actionOpacity
                                }
                            ]}
                        >
                            {actionHandler.label}
                        </Animated.Text>
                    )}
                </View>
            </View>
        );
    }, [actionOpacity, showLabels, colors.system.text.inverse, getActionColor]);

    return (
        <GestureHandlerRootView style={[styles.container, style]} testID={testID}>
            {/* Left actions */}
            {leftActions.length > 0 && renderActions(leftActions, true)}

            {/* Right actions */}
            {rightActions.length > 0 && renderActions(rightActions, false)}

            {/* Main card */}
            <PanGestureHandler
                onGestureEvent={onGestureEvent}
                onHandlerStateChange={({ nativeEvent, ...rest }) => {
                    if (nativeEvent.state === State.BEGAN) {
                        handleGestureStart();
                    } else if (nativeEvent.state === State.END) {
                        handleGestureEnd({ nativeEvent } as PanGestureHandlerGestureEvent);
                    }
                }}
            >
                <Animated.View
                    style={[
                        styles.card,
                        {
                            transform: [
                                { translateX },
                                { rotateZ },
                            ],
                            backgroundColor: colors.system.background.surface,
                        },
                    ]}
                    ref={ref}
                >
                    {children}
                </Animated.View>
            </PanGestureHandler>
        </GestureHandlerRootView>
    );
});

SwipeableCard.displayName = 'SwipeableCard';

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        overflow: 'hidden',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 8,
        elevation: 2,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        shadowOpacity: 0.1,
        width: '100%',
        height: '100%',
    },
    actionContainer: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 150,
        zIndex: 1,
    },
    leftAction: {
        left: 0,
    },
    rightAction: {
        right: 0,
    },
    actionContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    actionLabel: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
    },
    actionButton: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 150,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionButtonContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 16,
    },
    actionButtonLabel: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '600',
    },
});

export default SwipeableCard;