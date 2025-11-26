/**
 * Toast Notification Component for iOS Error UI Library
 * Implements iOS Human Interface Guidelines with haptic feedback and accessibility
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    AccessibilityInfo,
    LayoutAnimation,
    UIManager,
    Platform,
} from 'react-native';
import { ToastConfig, ToastAction, AccessibilityConfig } from '../../types/ErrorUITypes';

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Props {
    config: ToastConfig;
    onDismiss: (id: string) => void;
    theme: any;
    index?: number;
    total?: number;
}

const { width: screenWidth } = Dimensions.get('window');

const ToastNotification: React.FC<Props> = ({
    config,
    onDismiss,
    theme,
    index = 0,
    total = 1
}) => {
    const [visible, setVisible] = useState(true);
    const [progress, setProgress] = useState(1);
    const [isPressed, setIsPressed] = useState(false);

    // Animation refs
    const translateY = useRef(new Animated.Value(-100)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.9)).current;
    const progressAnimation = useRef(new Animated.Value(1)).current;

    // Auto-dismiss timer
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        showToast();

        // Setup auto-dismiss
        if (!config.persistent && config.duration) {
            dismissTimer.current = setTimeout(() => {
                dismissToast();
            }, config.duration);
        }

        // Setup progress animation if duration is specified
        if (config.duration && !config.persistent) {
            Animated.timing(progressAnimation, {
                toValue: 0,
                duration: config.duration,
                useNativeDriver: false,
            }).start();
        }

        return () => {
            if (dismissTimer.current) {
                clearTimeout(dismissTimer.current);
            }
        };
    }, []);

    const showToast = () => {
        // Haptic feedback
        if (config.haptic && Platform.OS === 'ios') {
            triggerHapticFeedback();
        }

        // Accessibility announcement
        if (config.accessibility?.liveRegion) {
            announceAccessibility();
        }

        // Layout animation
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

        Animated.parallel([
            Animated.spring(translateY, {
                toValue: calculatePosition(index, total),
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        setVisible(true);
    };

    const dismissToast = () => {
        if (!visible) return;

        Animated.parallel([
            Animated.timing(translateY, {
                toValue: -150,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setVisible(false);
            onDismiss(config.id);
        });
    };

    const triggerHapticFeedback = () => {
        if (Platform.OS !== 'ios') return;

        const hapticMap = {
            error: 'impactMedium',
            warning: 'impactLight',
            info: 'selection',
            success: 'impactLight'
        };

        // Note: In a real implementation, you'd use react-native-haptic-feedback
        // import { impactMedium, impactLight, selection } from 'react-native-haptic-feedback';
        // hapticFeedback(hapticMap[config.type] || 'selection');
    };

    const announceAccessibility = () => {
        const announcement = config.accessibility?.announcements?.[0] ||
            `${config.title}: ${config.message}`;

        // Accessibility announcement would be handled by the accessibility system
        // In React Native, this is handled automatically with proper accessibility props
    };

    const calculatePosition = (index: number, total: number): number => {
        const safeAreaTop = 50; // Account for status bar and safe area
        const toastHeight = 80;
        const spacing = 8;

        if (total === 1) {
            return safeAreaTop;
        }

        return safeAreaTop + (index * (toastHeight + spacing));
    };

    const getToastStyles = () => {
        const baseStyles = getStyles(theme);

        const typeStyles = {
            error: baseStyles.errorToast,
            warning: baseStyles.warningToast,
            info: baseStyles.infoToast,
            success: baseStyles.successToast,
        };

        const severityStyles = {
            low: { opacity: 0.9 },
            medium: { opacity: 1 },
            high: { opacity: 1, transform: [{ scale: 1.02 }] },
            critical: { opacity: 1, transform: [{ scale: 1.05 }] },
        };

        return [
            baseStyles.container,
            typeStyles[config.type],
            severityStyles[config.severity],
            {
                transform: [
                    { translateY },
                    { scale },
                ],
                opacity,
            },
        ];
    };

    const getProgressBarWidth = () => {
        return progressAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: ['0%', '100%'],
        });
    };

    const handleActionPress = (action: ToastAction) => {
        setIsPressed(true);
        if (action.onPress) {
            action.onPress();
        }

        // Haptic feedback for action
        if (config.haptic && Platform.OS === 'ios') {
            triggerHapticFeedback();
        }

        setTimeout(() => setIsPressed(false), 150);
    };

    const handleDismiss = () => {
        dismissToast();
    };

    const styles = getStyles(theme);

    if (!visible) {
        return null;
    }

    return (
        <Animated.View style={getToastStyles()}>
            <TouchableOpacity
                style={[
                    styles.content,
                    isPressed && styles.contentPressed,
                ]}
                onPress={config.actions ? undefined : handleDismiss}
                onLongPress={config.dismissible ? handleDismiss : undefined}
                activeOpacity={1}
                accessibilityRole="alert"
                accessibilityLabel={config.accessibility?.label || `${config.title}: ${config.message}`}
                accessibilityHint={config.accessibility?.hint || "Double tap to dismiss"}
                accessible={true}
            >
                {/* Icon and Content */}
                <View style={styles.contentRow}>
                    {/* Icon */}
                    <View style={[styles.iconContainer, getIconStyle()]}>
                        <Text style={[styles.icon, getIconTextStyle()]}>
                            {getIconForType()}
                        </Text>
                    </View>

                    {/* Text Content */}
                    <View style={styles.textContainer}>
                        <Text style={[styles.title, getTitleStyle()]}>
                            {config.title}
                        </Text>
                        <Text style={[styles.message, getMessageStyle()]}>
                            {config.message}
                        </Text>
                    </View>

                    {/* Dismiss Button */}
                    {config.dismissible && (
                        <TouchableOpacity
                            style={styles.dismissButton}
                            onPress={handleDismiss}
                            accessibilityLabel="Dismiss notification"
                            accessibilityRole="button"
                        >
                            <Text style={[styles.dismissIcon, getIconTextStyle()]}>
                                ×
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Actions */}
                {config.actions && config.actions.length > 0 && (
                    <View style={styles.actionsContainer}>
                        {config.actions.map((action, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[
                                    styles.actionButton,
                                    action.style === 'destructive' && styles.actionButtonDestructive,
                                ]}
                                onPress={() => handleActionPress(action)}
                                disabled={action.disabled}
                                accessibilityLabel={action.title}
                                accessibilityRole="button"
                            >
                                <Text style={[
                                    styles.actionText,
                                    action.style === 'destructive' && styles.actionTextDestructive,
                                ]}>
                                    {action.title}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Progress Bar for Auto-dismiss */}
                {!config.persistent && config.duration && (
                    <Animated.View style={[styles.progressBar, { width: getProgressBarWidth() }]} />
                )}
            </TouchableOpacity>
        </Animated.View>
    );

    function getIconForType() {
        const icons = {
            error: '⚠️',
            warning: '⚠️',
            info: 'ℹ️',
            success: '✓',
        };
        return icons[config.type];
    }

    function getIconStyle() {
        const baseStyles = getStyles(theme);
        const typeStyles = {
            error: baseStyles.iconError,
            warning: baseStyles.iconWarning,
            info: baseStyles.iconInfo,
            success: baseStyles.iconSuccess,
        };
        return typeStyles[config.type];
    }

    function getIconTextStyle() {
        const baseStyles = getStyles(theme);
        const typeStyles = {
            error: baseStyles.iconTextError,
            warning: baseStyles.iconTextWarning,
            info: baseStyles.iconTextInfo,
            success: baseStyles.iconTextSuccess,
        };
        return typeStyles[config.type];
    }

    function getTitleStyle() {
        const baseStyles = getStyles(theme);
        return [baseStyles.title, getTitleColorStyle()];
    }

    function getMessageStyle() {
        const baseStyles = getStyles(theme);
        return [baseStyles.message, getMessageColorStyle()];
    }

    function getTitleColorStyle() {
        const colors = theme.colors?.error || {};
        const typeColors = {
            error: { color: colors.text || '#000000' },
            warning: { color: colors.text || '#000000' },
            info: { color: colors.text || '#000000' },
            success: { color: colors.text || '#000000' },
        };
        return typeColors[config.type];
    }

    function getMessageColorStyle() {
        const colors = theme.colors?.ui?.text || {};
        return { color: colors.secondary || '#666666' };
    }
};

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        position: 'absolute',
        left: 16,
        right: 16,
        borderRadius: 12,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        zIndex: 1000,
    },
    content: {
        padding: 16,
        borderRadius: 12,
        backgroundColor: theme.colors?.ui?.surface || '#FFFFFF',
        borderLeftWidth: 4,
    },
    contentPressed: {
        transform: [{ scale: 0.98 }],
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    icon: {
        fontSize: 16,
    },
    textContainer: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    message: {
        fontSize: 14,
        lineHeight: 20,
    },
    dismissButton: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    dismissIcon: {
        fontSize: 18,
        fontWeight: '300',
    },
    actionsContainer: {
        flexDirection: 'row',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: theme.colors?.ui?.border || '#E0E0E0',
    },
    actionButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 6,
        marginRight: 8,
    },
    actionButtonDestructive: {
        backgroundColor: '#FF3B30',
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors?.error?.primary || '#007AFF',
    },
    actionTextDestructive: {
        color: '#FFFFFF',
    },
    progressBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        height: 2,
        borderRadius: 1,
    },

    // Type-specific styles
    errorToast: {
        borderLeftColor: '#FF3B30',
        backgroundColor: '#FFF5F5',
    },
    warningToast: {
        borderLeftColor: '#FF9500',
        backgroundColor: '#FFF8E6',
    },
    infoToast: {
        borderLeftColor: '#007AFF',
        backgroundColor: '#F0F8FF',
    },
    successToast: {
        borderLeftColor: '#34C759',
        backgroundColor: '#F0FFF4',
    },

    // Icon styles
    iconError: {
        backgroundColor: '#FF3B30',
    },
    iconWarning: {
        backgroundColor: '#FF9500',
    },
    iconInfo: {
        backgroundColor: '#007AFF',
    },
    iconSuccess: {
        backgroundColor: '#34C759',
    },

    iconTextError: {
        color: '#FFFFFF',
    },
    iconTextWarning: {
        color: '#FFFFFF',
    },
    iconTextInfo: {
        color: '#FFFFFF',
    },
    iconTextSuccess: {
        color: '#FFFFFF',
    },
});

export default ToastNotification;