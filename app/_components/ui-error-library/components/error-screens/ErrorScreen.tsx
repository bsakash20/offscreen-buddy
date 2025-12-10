/**
 * Error Screen Component for iOS Error UI Library
 * Implements full-screen error display with retry functionality and recovery guidance
 */

import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    ScrollView,
    Image,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { ErrorScreenConfig, ErrorScreenAction, RecoveryStep, AccessibilityConfig } from '../../types/ErrorUITypes';

const { width: screenWidth } = Dimensions.get('window');

interface Props {
    config: ErrorScreenConfig;
    onDismiss: (id: string) => void;
    theme: any;
    visible: boolean;
}

interface ErrorScreenRef {
    retry: () => void;
    nextStep: () => void;
    getProgress: () => number;
    isComplete: () => boolean;
}

// Error Screen Component
const ErrorScreen = forwardRef<ErrorScreenRef, Props>(({
    config,
    onDismiss,
    theme,
    visible,
}, ref) => {
    const [retryCount, setRetryCount] = useState(0);
    const [isRetrying, setIsRetrying] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const [progress, setProgress] = useState(0);

    // Animation refs
    const fadeIn = useRef(new Animated.Value(0)).current;
    const slideUp = useRef(new Animated.Value(50)).current;
    const scaleIn = useRef(new Animated.Value(0.95)).current;

    // Auto-retry timer
    const autoRetryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
        retry: () => {
            handleRetry();
        },
        nextStep: () => {
            handleNextStep();
        },
        getProgress: () => {
            return calculateProgress();
        },
        isComplete: () => {
            return isComplete;
        },
    }));

    useEffect(() => {
        if (visible) {
            showScreen();
            setupAutoRetry();
        } else {
            hideScreen();
            cleanupTimers();
        }

        return () => {
            cleanupTimers();
        };
    }, [visible, config.autoRetry, config.retryInterval]);

    const showScreen = () => {
        Animated.parallel([
            Animated.timing(fadeIn, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.spring(slideUp, {
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

        // Haptic feedback for critical errors
        if (config.type === 'server_error' || config.type === 'maintenance_mode') {
            triggerHapticFeedback('impactMedium');
        }
    };

    const hideScreen = () => {
        Animated.parallel([
            Animated.timing(fadeIn, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(slideUp, {
                toValue: 50,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const setupAutoRetry = () => {
        if (!config.autoRetry || !config.retryInterval || !config.maxRetries) {
            return;
        }

        autoRetryTimer.current = setInterval(() => {
            if (retryCount < config.maxRetries!) {
                handleRetry();
            } else {
                cleanupTimers();
            }
        }, config.retryInterval);
    };

    const cleanupTimers = () => {
        if (autoRetryTimer.current) {
            clearInterval(autoRetryTimer.current);
            autoRetryTimer.current = null;
        }
    };

    const handleRetry = async () => {
        setIsRetrying(true);
        setRetryCount(prev => prev + 1);

        // Simulate retry process
        await new Promise(resolve => setTimeout(resolve, 1000));

        if (config.primaryAction?.onPress) {
            try {
                await config.primaryAction.onPress();
                // Success - hide error screen
                setTimeout(() => onDismiss(config.id), 500);
            } catch (error) {
                console.error('Retry failed:', error);
                setIsRetrying(false);
            }
        }
    };

    const handleActionPress = (action: ErrorScreenAction) => {
        setIsRetrying(true);

        if (action.onPress) {
            action.onPress();
        }

        setTimeout(() => setIsRetrying(false), 500);
    };

    const handleNextStep = () => {
        if (config.steps && currentStep < config.steps.length - 1) {
            setCurrentStep(prev => prev + 1);
            setProgress(calculateProgress());

            if (currentStep === config.steps.length - 2) {
                setIsComplete(true);
            }
        }
    };

    const calculateProgress = (): number => {
        if (!config.steps || config.steps.length === 0) {
            return config.maxRetries ? (retryCount / config.maxRetries) * 100 : 0;
        }
        return ((currentStep + 1) / config.steps.length) * 100;
    };

    const triggerHapticFeedback = (type: 'impactLight' | 'impactMedium' | 'impactHeavy') => {
        if (Platform.OS !== 'ios') return;

        // Note: In a real implementation, you'd use react-native-haptic-feedback
        // import { impactLight, impactMedium, impactHeavy } from 'react-native-haptic-feedback';
        // hapticFeedback(type);
    };

    const getScreenIcon = () => {
        const iconMap = {
            network_offline: '📶',
            server_error: '⚠️',
            maintenance_mode: '🔧',
            empty_state: '📭',
            recovery: '🔄',
        };
        return iconMap[config.type];
    };

    const getScreenTitle = () => {
        const titleMap = {
            network_offline: 'No Internet Connection',
            server_error: 'Server Error',
            maintenance_mode: 'Under Maintenance',
            empty_state: 'No Data Available',
            recovery: 'Recovering...',
        };
        return titleMap[config.type] || config.title;
    };

    const getScreenMessage = () => {
        const messageMap = {
            network_offline: 'Please check your internet connection and try again.',
            server_error: 'We\'re experiencing technical difficulties. Please try again later.',
            maintenance_mode: 'We\'re currently performing maintenance. Please check back soon.',
            empty_state: 'There\'s nothing to show here at the moment.',
            recovery: 'We\'re working to fix the issue. Please wait...',
        };
        return messageMap[config.type] || config.message;
    };

    const getPrimaryActionText = () => {
        const actionMap = {
            network_offline: 'Try Again',
            server_error: 'Retry',
            maintenance_mode: 'Check Status',
            empty_state: 'Refresh',
            recovery: 'Retry',
        };
        return config.primaryAction?.title || actionMap[config.type] || 'Try Again';
    };

    const getRetryCountText = () => {
        if (!config.maxRetries) return '';
        return `Retry ${retryCount}/${config.maxRetries}`;
    };

    const renderSteps = () => {
        if (!config.steps || config.steps.length === 0) return null;

        return (
            <View style={styles.stepsContainer}>
                <Text style={[styles.stepsTitle, getTextStyle('title')]}>
                    Recovery Steps
                </Text>
                {config.steps.map((step, index) => (
                    <TouchableOpacity
                        key={step.id}
                        style={[
                            styles.step,
                            index === currentStep && styles.stepActive,
                            step.completed && styles.stepCompleted,
                        ]}
                        onPress={step.action}
                        disabled={index > currentStep}
                        accessibilityRole="button"
                        accessibilityLabel={`Step ${index + 1}: ${step.title}`}
                    >
                        <View style={styles.stepIndicator}>
                            {step.completed ? (
                                <Text style={styles.stepCheckmark}>✓</Text>
                            ) : index === currentStep ? (
                                <View style={styles.stepCurrent} />
                            ) : (
                                <View style={styles.stepPending} />
                            )}
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={[
                                styles.stepTitle,
                                index === currentStep && styles.stepTitleActive,
                            ]}>
                                {step.title}
                            </Text>
                            <Text style={styles.stepDescription}>
                                {step.description}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const renderProgress = () => {
        if (!config.steps || config.steps.length === 0) return null;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: `${progress}%`,
                                opacity: fadeIn,
                            },
                        ]}
                    />
                </View>
                <Text style={[styles.progressText, getTextStyle('secondary')]}>
                    Progress: {Math.round(progress)}%
                </Text>
            </View>
        );
    };

    const renderIllustration = () => {
        if (config.illustration) {
            return (
                <View style={styles.illustrationContainer}>
                    <Image
                        source={{ uri: config.illustration }}
                        style={[
                            styles.illustration,
                            config.illustrationStyle === 'light' && styles.illustrationLight,
                            config.illustrationStyle === 'dark' && styles.illustrationDark,
                        ]}
                        resizeMode="contain"
                    />
                </View>
            );
        }

        // Use emoji for illustration
        return (
            <View style={styles.emojiContainer}>
                <Text style={styles.emoji}>
                    {getScreenIcon()}
                </Text>
            </View>
        );
    };

    const getTextStyle = (variant: 'title' | 'message' | 'secondary') => {
        const baseStyles = getStyles(theme);
        const textStyles = {
            title: baseStyles.title,
            message: baseStyles.message,
            secondary: baseStyles.progressText,
        };
        return textStyles[variant];
    };

    const styles = getStyles(theme);

    if (!visible) {
        return null;
    }

    return (
        <Animated.View style={[
            styles.container,
            { opacity: fadeIn, transform: [{ translateY: slideUp }, { scale: scaleIn }] },
        ]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header with illustration */}
                <View style={styles.header}>
                    {renderIllustration()}
                </View>

                {/* Content */}
                <View style={styles.content}>
                    {/* Title */}
                    <Text style={[styles.title, getTextStyle('title')]}>
                        {getScreenTitle()}
                    </Text>

                    {/* Message */}
                    <Text style={[styles.message, getTextStyle('message')]}>
                        {getScreenMessage()}
                    </Text>

                    {/* Retry count */}
                    {getRetryCountText() && (
                        <Text style={[styles.retryCount, getTextStyle('secondary')]}>
                            {getRetryCountText()}
                        </Text>
                    )}

                    {/* Progress */}
                    {renderProgress()}

                    {/* Action buttons */}
                    <View style={styles.actionsContainer}>
                        {config.primaryAction && (
                            <TouchableOpacity
                                style={[
                                    styles.primaryButton,
                                    isRetrying && styles.primaryButtonDisabled,
                                ]}
                                onPress={() => handleActionPress(config.primaryAction!)}
                                disabled={isRetrying}
                                accessibilityRole="button"
                                accessibilityLabel={config.primaryAction.title}
                            >
                                {isRetrying ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        {getPrimaryActionText()}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        )}

                        {config.secondaryAction && (
                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={() => handleActionPress(config.secondaryAction!)}
                                disabled={isRetrying}
                                accessibilityRole="button"
                                accessibilityLabel={config.secondaryAction.title}
                            >
                                <Text style={styles.secondaryButtonText}>
                                    {config.secondaryAction.title}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Recovery steps */}
                {renderSteps()}
            </ScrollView>
        </Animated.View>
    );
});

ErrorScreen.displayName = 'ErrorScreen';

const getStyles = (theme: any) => StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.colors?.ui?.background || '#FFFFFF',
        zIndex: 9998,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
    },
    illustrationContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    illustration: {
        width: 100,
        height: 100,
    },
    illustrationLight: {
        tintColor: '#000000',
    },
    illustrationDark: {
        tintColor: '#FFFFFF',
    },
    emojiContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 60,
    },
    content: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors?.error?.text || '#000000',
        textAlign: 'center',
        marginBottom: 16,
    },
    message: {
        fontSize: 16,
        lineHeight: 24,
        color: theme.colors?.ui?.text?.primary || '#000000',
        textAlign: 'center',
        marginBottom: 16,
        paddingHorizontal: 20,
    },
    retryCount: {
        fontSize: 14,
        color: theme.colors?.ui?.text?.secondary || '#666666',
        textAlign: 'center',
        marginBottom: 20,
    },
    actionsContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 12,
        marginBottom: 32,
    },
    primaryButton: {
        backgroundColor: theme.colors?.error?.primary || '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
        minWidth: 200,
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        backgroundColor: '#8E8E93',
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors?.ui?.border || '#E0E0E0',
        minWidth: 160,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: theme.colors?.error?.primary || '#007AFF',
        fontSize: 14,
        fontWeight: '500',
    },
    stepsContainer: {
        width: '100%',
        marginTop: 20,
    },
    stepsTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors?.error?.text || '#000000',
        marginBottom: 16,
    },
    step: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 8,
    },
    stepActive: {
        backgroundColor: '#F0F8FF',
    },
    stepCompleted: {
        backgroundColor: '#F0FFF4',
    },
    stepIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
        marginTop: 2,
    },
    stepCurrent: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
    },
    stepPending: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D1D1D6',
    },
    stepCheckmark: {
        fontSize: 14,
        color: '#34C759',
        fontWeight: 'bold',
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors?.ui?.text?.primary || '#000000',
        marginBottom: 4,
    },
    stepTitleActive: {
        color: '#007AFF',
    },
    stepDescription: {
        fontSize: 14,
        lineHeight: 20,
        color: theme.colors?.ui?.text?.secondary || '#666666',
    },
    progressContainer: {
        width: '100%',
        marginBottom: 24,
    },
    progressBar: {
        width: '100%',
        height: 4,
        backgroundColor: '#E5E5EA',
        borderRadius: 2,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 12,
        textAlign: 'center',
        color: theme.colors?.ui?.text?.secondary || '#666666',
    },
});

export default ErrorScreen;