/**
 * Notification Banner Component for OffScreen Buddy
 * Displays in-app notification banners with customizable content and actions
 */

import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Dimensions,
    TouchableOpacity,
    GestureResponderEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import Card from '../../_design-system/components/Card';
import Button from '../../_design-system/components/Button';
import {
    NotificationData,
    NotificationType,
    NotificationCategory,
    NotificationPriority
} from '../../_services/notifications/types';
import { useTheme } from '../../_design-system/providers/ThemeProvider';
import { spacingTokens } from '../../_design-system/tokens/spacing';
import { hapticManager, HapticType } from '../../_utils/HapticManager';
import { soundManager } from '../../_utils/SoundManager';

const spacing = spacingTokens.scale;
const theme = { borderRadius: { lg: 16 } };

const { width } = Dimensions.get('window');

interface NotificationBannerProps {
    notification: NotificationData;
    onAction?: (action: string) => void;
    onDismiss?: (notificationId: string) => void;
    autoHide?: boolean;
    autoHideDuration?: number;
    position?: 'top' | 'bottom';
    showProgress?: boolean;
    enableSwipe?: boolean;
    maxWidth?: number;
    customColors?: {
        background: string[];
        text: string;
        accent: string;
    };
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
    notification,
    onAction,
    onDismiss,
    autoHide = true,
    autoHideDuration = 5000,
    position = 'top',
    showProgress = true,
    enableSwipe = true,
    maxWidth = width - 32,
    customColors,
}) => {
    const { theme } = useTheme();
    const [isVisible, setIsVisible] = useState(true);
    const [slideAnim] = useState(new Animated.Value(-100));
    const [progressAnim] = useState(new Animated.Value(0));
    const [startTime] = useState(Date.now());

    useEffect(() => {
        // Animate in
        Animated.parallel([
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        // Auto-hide logic
        if (autoHide) {
            const timer = setTimeout(() => {
                handleDismiss();
            }, autoHideDuration);

            // Progress bar animation
            if (showProgress) {
                Animated.timing(progressAnim, {
                    toValue: 1,
                    duration: autoHideDuration,
                    useNativeDriver: false,
                }).start();
            }

            return () => {
                clearTimeout(timer);
                progressAnim.removeAllListeners();
            };
        }
    }, [autoHide, autoHideDuration, showProgress]);

    const getNotificationColors = () => {
        if (customColors) {
            return customColors;
        }

        const colorMap = {
            [NotificationType.TIMER_COMPLETE]: {
                background: ['#4CAF50', '#45a049'],
                text: '#ffffff',
                accent: '#81C784',
            },
            [NotificationType.TIMER_START]: {
                background: ['#2196F3', '#1976D2'],
                text: '#ffffff',
                accent: '#64B5F6',
            },
            [NotificationType.TIMER_PAUSE]: {
                background: ['#FF9800', '#F57C00'],
                text: '#ffffff',
                accent: '#FFB74D',
            },
            [NotificationType.MILESTONE_ACHIEVEMENT]: {
                background: ['#9C27B0', '#7B1FA2'],
                text: '#ffffff',
                accent: '#BA68C8',
            },
            [NotificationType.URGENT_ALERT]: {
                background: ['#F44336', '#D32F2F'],
                text: '#ffffff',
                accent: '#E57373',
            },
            [NotificationType.BREAK_REMINDER]: {
                background: ['#00BCD4', '#0097A7'],
                text: '#ffffff',
                accent: '#4DD0E1',
            },
            [NotificationType.USER_ROAST]: {
                background: ['#FF5722', '#E64A19'],
                text: '#ffffff',
                accent: '#FF8A65',
            },
            [NotificationType.TIMER_RESUME]: {
                background: ['#2196F3', '#1976D2'],
                text: '#ffffff',
                accent: '#64B5F6',
            },
            [NotificationType.FOCUS_REMINDER]: {
                background: ['#673AB7', '#512DA8'],
                text: '#ffffff',
                accent: '#9575CD',
            },
            [NotificationType.STREAK_CELEBRATION]: {
                background: ['#FFC107', '#FFA000'],
                text: '#000000',
                accent: '#FFD54F',
            },
            [NotificationType.DAILY_GOAL]: {
                background: ['#009688', '#00796B'],
                text: '#ffffff',
                accent: '#4DB6AC',
            },
            [NotificationType.QUICK_REMINDER]: {
                background: ['#607D8B', '#455A64'],
                text: '#ffffff',
                accent: '#90A4AE',
            },
            [NotificationType.SMART_BREAK]: {
                background: ['#00BCD4', '#0097A7'],
                text: '#ffffff',
                accent: '#4DD0E1',
            },
            [NotificationType.HABIT_REMINDER]: {
                background: ['#8BC34A', '#689F38'],
                text: '#ffffff',
                accent: '#AED581',
            },
            [NotificationType.ACHIEVEMENT_UNLOCK]: {
                background: ['#FFEB3B', '#FBC02D'],
                text: '#000000',
                accent: '#FFF176',
            },
        };

        return colorMap[notification.type] || {
            background: ['#607D8B', '#455A64'],
            text: '#ffffff',
            accent: '#90A4AE',
        };
    };

    const getIconEmoji = () => {
        const iconMap = {
            [NotificationType.TIMER_COMPLETE]: '🎉',
            [NotificationType.TIMER_START]: '⏰',
            [NotificationType.TIMER_PAUSE]: '⏸️',
            [NotificationType.TIMER_RESUME]: '▶️',
            [NotificationType.MILESTONE_ACHIEVEMENT]: '🏆',
            [NotificationType.STREAK_CELEBRATION]: '🔥',
            [NotificationType.DAILY_GOAL]: '🎯',
            [NotificationType.USER_ROAST]: '😏',
            [NotificationType.BREAK_REMINDER]: '☕',
            [NotificationType.URGENT_ALERT]: '⚠️',
            [NotificationType.QUICK_REMINDER]: '🔔',
            [NotificationType.FOCUS_REMINDER]: '🎯',
            [NotificationType.HABIT_REMINDER]: '📅',
            [NotificationType.ACHIEVEMENT_UNLOCK]: '🔓',
            [NotificationType.SMART_BREAK]: '🧘',
        };

        return iconMap[notification.type] || '🔔';
    };

    const handleDismiss = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsVisible(false);
            onDismiss?.(notification.id);
        });

        hapticManager.trigger(HapticType.LIGHT_TAP);
    };

    const handleAction = (action: string) => {
        hapticManager.trigger(HapticType.MEDIUM_TAP);
        soundManager.playUISound('button');
        onAction?.(action);
    };

    const getPriorityOpacity = () => {
        const opacityMap = {
            [NotificationPriority.LOW]: 0.8,
            [NotificationPriority.NORMAL]: 0.9,
            [NotificationPriority.HIGH]: 1.0,
            [NotificationPriority.URGENT]: 1.0,
        };
        return opacityMap[notification.priority] || 0.9;
    };

    const renderActions = () => {
        const actions = notification.actions || [];

        if (actions.length === 0) {
            return (
                <TouchableOpacity onPress={handleDismiss} style={styles.dismissArea}>
                    <Text style={[styles.dismissText, { color: getNotificationColors().text }]}>
                        Tap to dismiss
                    </Text>
                </TouchableOpacity>
            );
        }

        return (
            <View style={styles.actionsContainer}>
                {actions.map((action, index) => (
                    <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onPress={() => handleAction(action)}
                        style={StyleSheet.flatten([
                            styles.actionButton,
                            { borderColor: getNotificationColors().accent },
                        ])}
                        textStyle={{ color: getNotificationColors().text }}
                    >
                        {getActionLabel(action)}
                    </Button>
                ))}
            </View>
        );
    };

    const getActionLabel = (action: string) => {
        const actionMap: Record<string, string> = {
            'view_timer': 'View Timer',
            'start_session': 'Start',
            'pause_session': 'Pause',
            'stop_session': 'Stop',
            'view_milestones': 'Milestones',
            'view_settings': 'Settings',
            'dismiss': 'Dismiss',
            'snooze': 'Snooze',
            'complete_task': 'Complete',
        };
        return actionMap[action] || action;
    };

    if (!isVisible) {
        return null;
    }

    const colors = getNotificationColors();

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    transform: [
                        {
                            translateY: slideAnim,
                        },
                    ],
                    opacity: getPriorityOpacity(),
                    maxWidth,
                    [position]: 0,
                },
            ]}
        >
            <LinearGradient
                colors={colors.background as any}
                style={styles.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
            >
                <Card style={styles.card}>
                    <View style={styles.content}>
                        {/* Icon and Progress */}
                        <View style={styles.header}>
                            <Text style={styles.icon}>{getIconEmoji()}</Text>
                            {showProgress && (
                                <View style={styles.progressContainer}>
                                    <Animated.View
                                        style={[
                                            styles.progressBar,
                                            {
                                                width: progressAnim.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0%', '100%'],
                                                }),
                                                backgroundColor: colors.accent,
                                            },
                                        ]}
                                    />
                                </View>
                            )}
                        </View>

                        {/* Content */}
                        <View style={styles.textContainer}>
                            {notification.subtitle && (
                                <Text style={[styles.subtitle, { color: colors.accent }]}>
                                    {notification.subtitle}
                                </Text>
                            )}
                            <Text style={[styles.title, { color: colors.text }]}>
                                {notification.title}
                            </Text>
                            <Text style={[styles.message, { color: colors.text }]}>
                                {notification.message}
                            </Text>
                        </View>

                        {/* Actions */}
                        {renderActions()}

                        {/* Dismiss button */}
                        <TouchableOpacity
                            onPress={handleDismiss}
                            style={styles.dismissButton}
                        >
                            <Text style={[styles.dismissIcon, { color: colors.accent }]}>
                                ✕
                            </Text>
                        </TouchableOpacity>
                    </View>
                </Card>
            </LinearGradient>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: spacing.md,
        right: spacing.md,
        zIndex: 1000,
        elevation: 5,
    },
    gradient: {
        borderRadius: theme.borderRadius.lg,
    },
    card: {
        margin: 0,
        backgroundColor: 'transparent',
        borderRadius: theme.borderRadius.lg,
        overflow: 'hidden',
    },
    content: {
        padding: spacing.md,
        position: 'relative',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    icon: {
        fontSize: 24,
    },
    progressContainer: {
        flex: 1,
        height: 3,
        marginLeft: spacing.sm,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 2,
    },
    textContainer: {
        flex: 1,
        marginBottom: spacing.md,
    },
    subtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: spacing.xs,
        opacity: 0.8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.9,
    },
    actionsContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    actionButton: {
        flex: 1,
        borderWidth: 1,
    },
    dismissArea: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    dismissText: {
        fontSize: 12,
        opacity: 0.7,
    },
    dismissButton: {
        position: 'absolute',
        top: spacing.sm,
        right: spacing.sm,
        padding: spacing.xs,
    },
    dismissIcon: {
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default NotificationBanner;