/**
 * Alert Dialog Component for iOS Error UI Library
 * Implements iOS Human Interface Guidelines with modal presentation and animations
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    ScrollView,
} from 'react-native';
import { AlertConfig, AlertButton, AccessibilityConfig } from '../../types/ErrorUITypes';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
    config: AlertConfig;
    onDismiss: (id: string) => void;
    theme: any;
    visible: boolean;
}

interface AlertDialogRef {
    dismiss: () => void;
    updateConfig: (newConfig: Partial<AlertConfig>) => void;
}

// Styles function
const getStyles = (theme: any) => StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdropTouchable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalDefault: {
        // Centered modal
    },
    modalSheet: {
        justifyContent: 'flex-end',
        paddingBottom: 40,
    },
    modalCard: {
        maxWidth: 320,
        alignSelf: 'center',
    },
    alertContainer: {
        backgroundColor: theme.colors?.ui?.surface || '#FFFFFF',
        borderRadius: 14,
        maxWidth: Math.min(screenWidth - 40, 320),
        minWidth: 280,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    alertCritical: {
        borderLeftWidth: 4,
        borderLeftColor: '#FF3B30',
    },
    alertWarning: {
        borderLeftWidth: 4,
        borderLeftColor: '#FF9500',
    },
    alertConfirmation: {
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    alertInputRequired: {
        borderLeftWidth: 4,
        borderLeftColor: '#AF52DE',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        lineHeight: 22,
        color: theme.colors?.error?.text || '#000000',
        flex: 1,
        marginRight: 10,
    },
    closeButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeIcon: {
        fontSize: 18,
        fontWeight: '300',
    },
    messageContainer: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        maxHeight: 200,
    },
    message: {
        fontSize: 15,
        lineHeight: 21,
        color: theme.colors?.ui?.text?.primary || '#000000',
    },
    buttonsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        paddingTop: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    button: {
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 8,
        minWidth: 64,
        alignItems: 'center',
    },
    buttonDefault: {
        backgroundColor: '#007AFF',
    },
    buttonCancel: {
        backgroundColor: '#8E8E93',
    },
    buttonDestructive: {
        backgroundColor: '#FF3B30',
    },
    buttonPressed: {
        transform: [{ scale: 0.96 }],
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    buttonTextCancel: {
        color: '#FFFFFF',
    },
    buttonTextDestructive: {
        color: '#FFFFFF',
    },

    // iOS Action Sheet styles
    sheetContainer: {
        backgroundColor: theme.colors?.ui?.surface || '#FFFFFF',
        borderRadius: 14,
        minWidth: 280,
        maxWidth: Math.min(screenWidth - 40, 320),
        overflow: 'hidden',
    },
    sheetButton: {
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: theme.colors?.ui?.surface || '#FFFFFF',
    },
    sheetButtonFirst: {
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    sheetButtonLast: {
        borderBottomLeftRadius: 14,
        borderBottomRightRadius: 14,
    },
    sheetButtonDestructive: {
        backgroundColor: '#FFF5F5',
    },
    sheetButtonCancel: {
        backgroundColor: '#F0F0F0',
    },
    sheetButtonPressed: {
        backgroundColor: '#E5E5EA',
    },
    sheetSpacer: {
        height: 8,
        backgroundColor: 'transparent',
    },
    sheetButtonText: {
        fontSize: 17,
        color: '#007AFF',
    },
    sheetButtonTextDestructive: {
        color: '#FF3B30',
    },
    sheetButtonTextCancel: {
        color: '#007AFF',
        fontWeight: '600',
    },
});

// Alert Dialog Component
const AlertDialog = forwardRef<AlertDialogRef, Props>(({
    config,
    onDismiss,
    theme,
    visible,
}, ref) => {
    const [currentConfig, setCurrentConfig] = useState<AlertConfig>(config);
    const [isPressed, setIsPressed] = useState(false);

    // Animation refs
    const modalOpacity = useRef(new Animated.Value(0)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const slideAnimation = useRef(new Animated.Value(screenHeight)).current;
    const scaleAnimation = useRef(new Animated.Value(0.9)).current;

    // Get styles
    const styles = getStyles(theme);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        dismiss: () => {
            handleDismiss();
        },
        updateConfig: (newConfig: Partial<AlertConfig>) => {
            setCurrentConfig(prev => ({ ...prev, ...newConfig }));
        },
    }));

    useEffect(() => {
        if (visible) {
            showAlert();
        } else {
            hideAlert();
        }
    }, [visible]);

    const showAlert = () => {
        // Reset animations
        modalOpacity.setValue(0);
        backdropOpacity.setValue(0);
        slideAnimation.setValue(screenHeight);
        scaleAnimation.setValue(0.9);

        // Haptic feedback
        if (currentConfig.haptic && Platform.OS === 'ios') {
            triggerHapticFeedback();
        }

        // Entrance animations
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 0.5,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnimation, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnimation, {
                toValue: 1,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        // Accessibility announcement
        if (currentConfig.accessibility?.liveRegion) {
            announceAccessibility();
        }
    };

    const hideAlert = () => {
        Animated.parallel([
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(modalOpacity, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnimation, {
                toValue: screenHeight,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onDismiss(currentConfig.id);
        });
    };

    const handleDismiss = () => {
        hideAlert();
    };

    const triggerHapticFeedback = () => {
        if (Platform.OS !== 'ios') return;

        const hapticMap = {
            critical: 'impactHeavy',
            warning: 'impactMedium',
            confirmation: 'impactLight',
            input_required: 'impactMedium',
        };

        // Note: In a real implementation, you'd use react-native-haptic-feedback
        // import { impactHeavy, impactMedium, impactLight } from 'react-native-haptic-feedback';
        // hapticFeedback(hapticMap[currentConfig.type] || 'impactLight');
    };

    const announceAccessibility = () => {
        const announcement = currentConfig.accessibility?.announcements?.[0] ||
            `${currentConfig.title}: ${currentConfig.message}`;

        // Accessibility announcement would be handled by the accessibility system
        // In React Native, this is handled automatically with proper accessibility props
    };

    const handleButtonPress = (button: AlertButton) => {
        setIsPressed(true);

        if (button.onPress) {
            button.onPress();
        }

        // Haptic feedback for button press
        if (currentConfig.haptic && Platform.OS === 'ios') {
            triggerHapticFeedback();
        }

        // Auto-dismiss alert after button press
        setTimeout(() => {
            setIsPressed(false);
            handleDismiss();
        }, 100);
    };

    const renderButtons = () => {
        const { buttons } = currentConfig;

        if (buttons.length === 0) return null;

        if (currentConfig.style === 'sheet') {
            // iOS Action Sheet style
            return (
                <View style={styles.sheetContainer}>
                    {buttons.map((button, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.sheetButton,
                                button.style === 'destructive' && styles.sheetButtonDestructive,
                                button.style === 'cancel' && styles.sheetButtonCancel,
                                index === 0 && styles.sheetButtonFirst,
                                index === buttons.length - 1 && styles.sheetButtonLast,
                                isPressed && styles.buttonPressed,
                            ]}
                            onPress={() => handleButtonPress(button)}
                            disabled={button.disabled}
                            accessibilityRole="button"
                            accessibilityLabel={button.accessibilityLabel || button.title}
                        >
                            <Text style={[
                                styles.sheetButtonText,
                                button.style === 'destructive' && styles.sheetButtonTextDestructive,
                                button.style === 'cancel' && styles.sheetButtonTextCancel,
                            ]}>
                                {button.title}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            );
        }

        // Default alert button style
        return (
            <View style={styles.buttonsContainer}>
                {buttons.map((button, index) => (
                    <TouchableOpacity
                        key={index}
                        style={[
                            styles.button,
                            button.style === 'default' && styles.buttonDefault,
                            button.style === 'cancel' && styles.buttonCancel,
                            button.style === 'destructive' && styles.buttonDestructive,
                            isPressed && styles.buttonPressed,
                        ]}
                        onPress={() => handleButtonPress(button)}
                        disabled={button.disabled}
                        accessibilityRole="button"
                        accessibilityLabel={button.accessibilityLabel || button.title}
                    >
                        <Text style={[
                            styles.buttonText,
                            button.style === 'destructive' && styles.buttonTextDestructive,
                            button.style === 'cancel' && styles.buttonTextCancel,
                        ]}>
                            {button.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const getModalStyle = () => {
        const baseStyles = getStyles(theme);

        const styleMap = {
            default: baseStyles.modalDefault,
            sheet: baseStyles.modalSheet,
            card: baseStyles.modalCard,
        };

        return styleMap[currentConfig.style];
    };

    const getAlertStyles = () => {
        const baseStyles = getStyles(theme);

        const typeStyles = {
            critical: baseStyles.alertCritical,
            warning: baseStyles.alertWarning,
            confirmation: baseStyles.alertConfirmation,
            input_required: baseStyles.alertInputRequired,
        };

        return [baseStyles.alertContainer, typeStyles[currentConfig.type]];
    };

    const getTitleStyle = () => {
        const baseStyles = getStyles(theme);
        return [baseStyles.title, getTitleColorStyle()];
    };

    const getTitleColorStyle = () => {
        const colors = theme.colors?.error?.text || '#000000';
        const typeColors = {
            critical: { color: colors },
            warning: { color: colors },
            confirmation: { color: colors },
            input_required: { color: colors },
        };
        return typeColors[currentConfig.type];
    };

    const getIconTextStyle = () => {
        const colors = theme.colors?.ui?.text?.secondary || '#666666';
        return { color: colors };
    };

    if (!visible) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleDismiss}
        >
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
                <TouchableOpacity
                    style={styles.backdropTouchable}
                    activeOpacity={1}
                    onPress={currentConfig.type === 'confirmation' ? undefined : handleDismiss}
                />
            </Animated.View>

            <Animated.View style={[
                styles.modalContainer,
                getModalStyle(),
                {
                    opacity: modalOpacity,
                    transform: [
                        { translateY: slideAnimation },
                        { scale: scaleAnimation },
                    ],
                },
            ]}>
                <View style={getAlertStyles()}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={[styles.title, getTitleStyle()]} accessibilityRole="header">
                            {currentConfig.title}
                        </Text>

                        {/* Close button for non-modal alerts */}
                        {!currentConfig.modal && (
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={handleDismiss}
                                accessibilityRole="button"
                                accessibilityLabel="Close"
                            >
                                <Text style={[styles.closeIcon, getIconTextStyle()]}>×</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Message */}
                    <ScrollView
                        style={styles.messageContainer}
                        showsVerticalScrollIndicator={false}
                        accessible={true}
                        accessibilityLabel={currentConfig.message}
                        accessibilityRole="text"
                    >
                        <Text style={styles.message}>
                            {currentConfig.message}
                        </Text>
                    </ScrollView>

                    {/* Buttons */}
                    {renderButtons()}
                </View>
            </Animated.View>
        </Modal>
    );
});

AlertDialog.displayName = 'AlertDialog';

export default AlertDialog;