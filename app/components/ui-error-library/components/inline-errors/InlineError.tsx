/**
 * Inline Error Component for iOS Error UI Library
 * Implements form field error indicators with validation messaging and accessibility
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    TextInput,
    Platform,
} from 'react-native';
import { InlineErrorConfig, InlineErrorAction, AccessibilityConfig } from '../../types/ErrorUITypes';

interface Props {
    config: InlineErrorConfig;
    onDismiss: (id: string) => void;
    theme: any;
    visible: boolean;
    inputRef?: React.ElementRef<typeof TextInput>;
}

interface InlineErrorRef {
    dismiss: () => void;
    update: (newConfig: Partial<InlineErrorConfig>) => void;
    getErrorId: () => string;
    focusField: () => void;
}

// Inline Error Component
const InlineError = forwardRef<InlineErrorRef, Props>(({
    config,
    onDismiss,
    theme,
    visible,
    inputRef,
}, ref) => {
    const [isPressed, setIsPressed] = useState(false);
    const [isVisible, setIsVisible] = useState(visible);

    // Animation refs
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideIn = useRef(new Animated.Value(-10)).current;
    const scaleIn = useRef(new Animated.Value(0.95)).current;

    // Auto-hide timer
    const autoHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        dismiss: () => {
            handleDismiss();
        },
        update: (newConfig: Partial<InlineErrorConfig>) => {
            // Update config in parent component
        },
        getErrorId: () => {
            return config.id;
        },
        focusField: () => {
            if (inputRef && inputRef.focus) {
                inputRef.focus();
            }
        },
    }));

    useEffect(() => {
        if (visible) {
            showError();
            setupAutoHide();
        } else {
            hideError();
            cleanupTimers();
        }

        return () => {
            cleanupTimers();
        };
    }, [visible, config.autoHide, config.autoHideDelay]);

    const showError = () => {
        setIsVisible(true);

        Animated.parallel([
            Animated.timing(fadeIn, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.spring(slideIn, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(scaleIn, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        // Haptic feedback for high severity errors
        if (config.severity === 'high') {
            triggerHapticFeedback('impactMedium');
        }
    };

    const hideError = () => {
        Animated.parallel([
            Animated.timing(fadeIn, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideIn, {
                toValue: -10,
                duration: 150,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setIsVisible(false);
            onDismiss(config.id);
        });
    };

    const setupAutoHide = () => {
        if (config.autoHide && config.autoHideDelay) {
            autoHideTimer.current = setTimeout(() => {
                handleDismiss();
            }, config.autoHideDelay);
        }
    };

    const cleanupTimers = () => {
        if (autoHideTimer.current) {
            clearTimeout(autoHideTimer.current);
            autoHideTimer.current = null;
        }
    };

    const handleDismiss = () => {
        hideError();
    };

    const handleActionPress = (action: InlineErrorAction) => {
        setIsPressed(true);

        if (action.onPress) {
            action.onPress();
        }

        setTimeout(() => setIsPressed(false), 150);
    };

    const triggerHapticFeedback = (type: 'impactLight' | 'impactMedium' | 'impactHeavy') => {
        if (Platform.OS !== 'ios') return;

        // Note: In a real implementation, you'd use react-native-haptic-feedback
        // import { impactLight, impactMedium, impactHeavy } from 'react-native-haptic-feedback';
        // hapticFeedback(type);
    };

    const getErrorIcon = () => {
        const iconMap = {
            low: '💡',
            medium: '⚠️',
            high: '❌',
        };
        return iconMap[config.severity] || '⚠️';
    };

    const getSeverityColor = () => {
        const colors = theme.colors?.error || {};
        const severityColors = {
            low: colors.info || '#007AFF',
            medium: colors.warning || '#FF9500',
            high: colors.primary || '#FF3B30',
        };
        return severityColors[config.severity];
    };

    const getErrorStyles = () => {
        const baseStyles = getStyles(theme);

        const typeStyles = {
            field: baseStyles.fieldError,
            badge: baseStyles.badgeError,
            pill: baseStyles.pillError,
            hint: baseStyles.hintError,
            placeholder: baseStyles.placeholderError,
        };

        const variantStyles = {
            default: {},
            subtle: baseStyles.subtleVariant,
            prominent: baseStyles.prominentVariant,
        };

        return [
            baseStyles.container,
            typeStyles[config.type],
            variantStyles[config.styling?.variant || 'default'],
            {
                backgroundColor: config.styling?.backgroundColor || 'transparent',
                borderColor: config.styling?.borderColor || getSeverityColor(),
            },
        ];
    };

    const getTextStyles = () => {
        const baseStyles = getStyles(theme);
        const colors = theme.colors?.error || {};

        return [
            baseStyles.errorText,
            {
                color: config.styling?.textColor || colors.text || getSeverityColor(),
            },
        ];
    };

    const renderFieldError = () => (
        <View style={[getErrorStyles(), { flexDirection: 'row', alignItems: 'center' }]}>
            {/* Error Icon */}
            <View style={styles.iconContainer}>
                <Text style={styles.icon}>
                    {getErrorIcon()}
                </Text>
            </View>

            {/* Error Message */}
            <View style={styles.messageContainer}>
                <Text style={getTextStyles()}>
                    {config.message}
                </Text>
            </View>

            {/* Actions */}
            {config.actions && config.actions.length > 0 && (
                <View style={styles.actionsContainer}>
                    {config.actions.map((action, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.actionButton}
                            onPress={() => handleActionPress(action)}
                            accessibilityRole="button"
                            accessibilityLabel={action.title}
                        >
                            <Text style={styles.actionText}>
                                {action.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            {/* Dismiss Button */}
            {config.dismissible && (
                <TouchableOpacity
                    style={styles.dismissButton}
                    onPress={handleDismiss}
                    accessibilityRole="button"
                    accessibilityLabel="Dismiss error"
                >
                    <Text style={styles.dismissIcon}>×</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    const renderBadgeError = () => (
        <View style={getErrorStyles()}>
            <View style={styles.badgeContainer}>
                <Text style={styles.badgeIcon}>
                    {getErrorIcon()}
                </Text>
                <Text style={getTextStyles()}>
                    {config.message}
                </Text>
            </View>
        </View>
    );

    const renderPillError = () => (
        <View style={getErrorStyles()}>
            <View style={styles.pillContainer}>
                <Text style={styles.pillIcon}>
                    {getErrorIcon()}
                </Text>
                <Text style={getTextStyles()}>
                    {config.message}
                </Text>
                {config.dismissible && (
                    <TouchableOpacity
                        style={styles.pillDismiss}
                        onPress={handleDismiss}
                        accessibilityRole="button"
                        accessibilityLabel="Dismiss"
                    >
                        <Text style={styles.pillDismissIcon}>×</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderHintError = () => (
        <View style={getErrorStyles()}>
            <Text style={getTextStyles()}>
                💡 {config.message}
            </Text>
        </View>
    );

    const renderPlaceholderError = () => (
        <View style={getErrorStyles()}>
            <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderIcon}>
                    {getErrorIcon()}
                </Text>
                <View style={styles.placeholderContent}>
                    <Text style={styles.placeholderTitle}>
                        {config.message}
                    </Text>
                    {config.actions && config.actions.length > 0 && (
                        <View style={styles.placeholderActions}>
                            {config.actions.map((action, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.placeholderAction}
                                    onPress={() => handleActionPress(action)}
                                    accessibilityRole="button"
                                    accessibilityLabel={action.title}
                                >
                                    <Text style={styles.placeholderActionText}>
                                        {action.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </View>
    );

    const renderError = () => {
        switch (config.type) {
            case 'field':
                return renderFieldError();
            case 'badge':
                return renderBadgeError();
            case 'pill':
                return renderPillError();
            case 'hint':
                return renderHintError();
            case 'placeholder':
                return renderPlaceholderError();
            default:
                return renderFieldError();
        }
    };

    if (!isVisible) {
        return null;
    }

    const styles = getStyles(theme);

    return (
        <Animated.View style={[
            getErrorStyles(),
            {
                opacity: fadeIn,
                transform: [
                    { translateY: slideIn },
                    { scale: scaleIn },
                ],
            },
        ]}>
            <TouchableOpacity
                onPress={config.dismissible ? handleDismiss : undefined}
                disabled={!config.dismissible}
                accessible={true}
                accessibilityLabel={config.accessibility?.label || config.message}
                accessibilityRole={(() => {
                    const role = config.accessibility?.role;
                    if (role === 'button' || role === 'alert') {
                        return role;
                    }
                    return 'alert';
                })()}
                accessibilityHint={config.accessibility?.hint || "Tap to dismiss"}
            >
                {renderError()}
            </TouchableOpacity>
        </Animated.View>
    );
});

InlineError.displayName = 'InlineError';

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        borderRadius: 8,
        borderWidth: 1,
        padding: 12,
        marginVertical: 4,
    },
    iconContainer: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    icon: {
        fontSize: 12,
    },
    messageContainer: {
        flex: 1,
    },
    actionsContainer: {
        flexDirection: 'row',
        marginLeft: 8,
    },
    actionButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '500',
        color: theme.colors?.error?.primary || '#007AFF',
    },
    dismissButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    dismissIcon: {
        fontSize: 14,
        fontWeight: '300',
    },

    // Error types
    fieldError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF5F5',
    },
    badgeError: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF5F5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    pillError: {
        alignSelf: 'flex-start',
        backgroundColor: '#FFF5F5',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    hintError: {
        backgroundColor: 'transparent',
        borderStyle: 'dashed',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    placeholderError: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
    },

    // Variants
    subtleVariant: {
        opacity: 0.8,
        transform: [{ scale: 0.98 }],
    },
    prominentVariant: {
        transform: [{ scale: 1.02 }],
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },

    // Text styles
    errorText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
    },

    // Badge specific styles
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    badgeIcon: {
        fontSize: 12,
        marginRight: 4,
    },

    // Pill specific styles
    pillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pillIcon: {
        fontSize: 10,
        marginRight: 6,
    },
    pillDismiss: {
        width: 16,
        height: 16,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 6,
    },
    pillDismissIcon: {
        fontSize: 10,
        fontWeight: '300',
    },

    // Placeholder specific styles
    placeholderContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    placeholderIcon: {
        fontSize: 24,
        marginRight: 12,
        marginTop: 2,
    },
    placeholderContent: {
        flex: 1,
    },
    placeholderTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors?.error?.text || '#000000',
        marginBottom: 8,
    },
    placeholderActions: {
        flexDirection: 'row',
        gap: 8,
    },
    placeholderAction: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: theme.colors?.error?.primary || '#007AFF',
        borderRadius: 6,
    },
    placeholderActionText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#FFFFFF',
    },
});

export default InlineError;