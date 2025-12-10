/**
 * Multi-Modal Error Indicators System for iOS Accessibility
 * Provides redundant error feedback through visual, audio, and haptic channels
 */

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import {
    Platform,
    Vibration,
    Animated,
    View,
    Text,
    StyleSheet,
} from 'react-native';
import { useMultiModalFeedback } from './enhanced-hooks';

// Multi-modal feedback configuration
export interface MultiModalConfig {
    enabled: boolean;
    visual: {
        enabled: boolean;
        animations: boolean;
        colorCoded: boolean;
        iconography: boolean;
        highContrast: boolean;
    };
    haptic: {
        enabled: boolean;
        errorIntensity: 'light' | 'medium' | 'heavy';
        warningIntensity: 'light' | 'medium';
        successIntensity: 'light' | 'medium';
        infoIntensity: 'light';
    };
    audio: {
        enabled: boolean;
        volume: number;
        pitchAdjustments: boolean;
        errorSounds: boolean;
        warningSounds: boolean;
        successSounds: boolean;
        infoSounds: boolean;
    };
    priorityHandling: {
        interruptLowerPriority: boolean;
        queueManagement: boolean;
        maxConcurrentFeedback: number;
    };
}

// Multi-modal feedback context
interface MultiModalContextType {
    config: MultiModalConfig;
    updateConfig: (newConfig: Partial<MultiModalConfig>) => void;
    provideFeedback: (
        type: 'error' | 'warning' | 'success' | 'info',
        severity: 'low' | 'medium' | 'high' | 'critical',
        message?: string,
        options?: MultiModalOptions
    ) => Promise<void>;
    getFeedbackState: () => MultiModalFeedbackState;
    isHighContrastEnabled: boolean;
    preferReducedMotion: boolean;
}

interface MultiModalOptions {
    interruptCurrent?: boolean;
    customHaptic?: string;
    customAudio?: string;
    customAnimation?: string;
    duration?: number;
    location?: 'top' | 'center' | 'bottom';
}

// Feedback state
interface MultiModalFeedbackState {
    activeFeedback: Map<string, MultiModalFeedback>;
    queue: MultiModalFeedback[];
    isProcessing: boolean;
    currentPriority: 'low' | 'medium' | 'high' | 'critical' | null;
}

// Individual feedback item
interface MultiModalFeedback {
    id: string;
    type: 'error' | 'warning' | 'success' | 'info';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message?: string;
    timestamp: Date;
    options?: MultiModalOptions;
}

// Context creation
const MultiModalContext = createContext<MultiModalContextType | undefined>(undefined);

// Default configuration
const DEFAULT_MULTI_MODAL_CONFIG: MultiModalConfig = {
    enabled: true,
    visual: {
        enabled: true,
        animations: true,
        colorCoded: true,
        iconography: true,
        highContrast: true,
    },
    haptic: {
        enabled: true,
        errorIntensity: 'medium',
        warningIntensity: 'light',
        successIntensity: 'light',
        infoIntensity: 'light',
    },
    audio: {
        enabled: true,
        volume: 0.7,
        pitchAdjustments: true,
        errorSounds: true,
        warningSounds: true,
        successSounds: true,
        infoSounds: true,
    },
    priorityHandling: {
        interruptLowerPriority: true,
        queueManagement: true,
        maxConcurrentFeedback: 3,
    },
};

// Provider component
interface MultiModalProviderProps {
    children: ReactNode;
    config?: Partial<MultiModalConfig>;
    onFeedbackStart?: (feedback: MultiModalFeedback) => void;
    onFeedbackEnd?: (feedback: MultiModalFeedback) => void;
}

const MultiModalProvider: React.FC<MultiModalProviderProps> = ({
    children,
    config = {},
    onFeedbackStart,
    onFeedbackEnd,
}) => {
    const [multiModalConfig, setMultiModalConfig] = useState<MultiModalConfig>({
        ...DEFAULT_MULTI_MODAL_CONFIG,
        ...config,
    });

    const [feedbackState, setFeedbackState] = useState<MultiModalFeedbackState>({
        activeFeedback: new Map(),
        queue: [],
        isProcessing: false,
        currentPriority: null,
    });

    const [isHighContrastEnabled, setIsHighContrastEnabled] = useState(false);
    const [preferReducedMotion, setPreferReducedMotion] = useState(false);

    // Monitor accessibility settings
    useEffect(() => {
        const checkAccessibilitySettings = async () => {
            // This would integrate with actual accessibility detection
            // For now, we'll simulate it
            setIsHighContrastEnabled(false);
            setPreferReducedMotion(false);
        };

        checkAccessibilitySettings();
    }, []);

    // Visual feedback implementation
    const provideVisualFeedback = useCallback(async (
        feedback: MultiModalFeedback,
        animatedValue: Animated.Value
    ): Promise<void> => {
        if (!multiModalConfig.visual.enabled) return;

        const getVisualConfig = () => {
            const configs = {
                error: {
                    color: '#FF3B30',
                    backgroundColor: '#FFF5F5',
                    borderColor: '#FFB3B3',
                    icon: 'error',
                    priority: feedback.severity === 'critical' ? 4 : 3,
                },
                warning: {
                    color: '#FF9500',
                    backgroundColor: '#FFF8E6',
                    borderColor: '#FFE4B5',
                    icon: 'warning',
                    priority: 2,
                },
                success: {
                    color: '#34C759',
                    backgroundColor: '#F0FFF4',
                    borderColor: '#90EE90',
                    icon: 'success',
                    priority: 1,
                },
                info: {
                    color: '#007AFF',
                    backgroundColor: '#F0F8FF',
                    borderColor: '#ADD8E6',
                    icon: 'info',
                    priority: 1,
                },
            };

            return configs[feedback.type];
        };

        const visualConfig = getVisualConfig();

        if (multiModalConfig.visual.animations && !preferReducedMotion) {
            // Animated feedback
            return new Promise((resolve) => {
                Animated.sequence([
                    Animated.timing(animatedValue, {
                        toValue: 1,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                    Animated.delay(1500),
                    Animated.timing(animatedValue, {
                        toValue: 0,
                        duration: 200,
                        useNativeDriver: true,
                    }),
                ]).start(() => resolve());
            });
        }
    }, [multiModalConfig.visual, preferReducedMotion]);

    // Haptic feedback implementation
    const provideHapticFeedback = useCallback(async (
        feedback: MultiModalFeedback
    ): Promise<void> => {
        if (!multiModalConfig.haptic.enabled) return;

        const getHapticType = () => {
            const hapticTypes = {
                error: {
                    critical: 'notificationError',
                    high: 'notificationError',
                    medium: 'impactMedium',
                    low: 'impactLight',
                },
                warning: {
                    critical: 'notificationWarning',
                    high: 'notificationWarning',
                    medium: 'impactLight',
                    low: 'impactLight',
                },
                success: {
                    critical: 'notificationSuccess',
                    high: 'notificationSuccess',
                    medium: 'impactLight',
                    low: 'impactLight',
                },
                info: {
                    critical: 'notificationSuccess',
                    high: 'notificationSuccess',
                    medium: 'impactLight',
                    low: 'impactLight',
                },
            };

            return hapticTypes[feedback.type][feedback.severity];
        };

        const hapticType = getHapticType();

        // Platform-specific haptic feedback
        try {
            if (Platform.OS === 'android') {
                const pattern = feedback.type === 'error' ? [100, 50, 100] : 50;
                Vibration.vibrate(pattern);
            }
            // iOS haptic feedback would be integrated here
        } catch (error) {
            console.warn('Haptic feedback failed:', error);
        }
    }, [multiModalConfig.haptic]);

    // Audio feedback implementation
    const provideAudioFeedback = useCallback(async (
        feedback: MultiModalFeedback
    ): Promise<void> => {
        if (!multiModalConfig.audio.enabled) return;

        const getAudioConfig = () => {
            const audioConfigs = {
                error: {
                    frequency: feedback.severity === 'critical' ? 200 : 300,
                    duration: 500,
                    waveform: 'sine',
                },
                warning: {
                    frequency: 400,
                    duration: 300,
                    waveform: 'triangle',
                },
                success: {
                    frequency: 600,
                    duration: 200,
                    waveform: 'sine',
                },
                info: {
                    frequency: 500,
                    duration: 150,
                    waveform: 'sine',
                },
            };

            return audioConfigs[feedback.type];
        };

        const audioConfig = getAudioConfig();

        // This would integrate with actual audio feedback system
        // For demonstration, we'll log the audio configuration
        if (multiModalConfig.audio.enabled) {
            console.log(`Audio feedback: ${feedback.type} - frequency: ${audioConfig.frequency}Hz, duration: ${audioConfig.duration}ms`);
        }
    }, [multiModalConfig.audio]);

    // Priority handling
    const canProcessFeedback = useCallback((newFeedback: MultiModalFeedback): boolean => {
        const { currentPriority } = feedbackState;

        if (!currentPriority) return true;

        const priorityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
        const newPriority = priorityOrder[newFeedback.severity];
        const currentPriorityValue = priorityOrder[currentPriority];

        return newPriority > currentPriorityValue;
    }, [feedbackState.currentPriority]);

    // Main feedback provider
    const provideFeedback = useCallback(async (
        type: 'error' | 'warning' | 'success' | 'info',
        severity: 'low' | 'medium' | 'high' | 'critical',
        message?: string,
        options?: MultiModalOptions
    ): Promise<void> => {
        const feedback: MultiModalFeedback = {
            id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            severity,
            message,
            timestamp: new Date(),
            options,
        };

        // Check if we should process this feedback
        if (!canProcessFeedback(feedback)) {
            // Queue if queue management is enabled
            if (multiModalConfig.priorityHandling.queueManagement) {
                setFeedbackState(prev => ({
                    ...prev,
                    queue: [...prev.queue, feedback],
                }));
            }
            return;
        }

        // Update state to show processing
        setFeedbackState(prev => ({
            ...prev,
            currentPriority: severity,
            activeFeedback: new Map(prev.activeFeedback).set(feedback.id, feedback),
        }));

        // Notify start
        onFeedbackStart?.(feedback);

        try {
            // Execute all feedback channels in parallel
            const animatedValue = new Animated.Value(0);

            await Promise.all([
                provideVisualFeedback(feedback, animatedValue),
                provideHapticFeedback(feedback),
                provideAudioFeedback(feedback),
            ]);
        } finally {
            // Clean up
            setFeedbackState(prev => {
                const newActive = new Map(prev.activeFeedback);
                newActive.delete(feedback.id);

                // Process queue if available
                const nextPriority = prev.queue.length > 0 ? prev.queue[0].severity : null;

                return {
                    ...prev,
                    activeFeedback: newActive,
                    currentPriority: nextPriority,
                    queue: prev.queue.slice(1),
                };
            });

            onFeedbackEnd?.(feedback);
        }
    }, [
        canProcessFeedback,
        multiModalConfig,
        provideVisualFeedback,
        provideHapticFeedback,
        provideAudioFeedback,
        onFeedbackStart,
        onFeedbackEnd,
    ]);

    const updateConfig = useCallback((newConfig: Partial<MultiModalConfig>) => {
        setMultiModalConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const getFeedbackState = useCallback(() => feedbackState, [feedbackState]);

    const contextValue: MultiModalContextType = {
        config: multiModalConfig,
        updateConfig,
        provideFeedback,
        getFeedbackState,
        isHighContrastEnabled,
        preferReducedMotion,
    };

    return (
        <MultiModalContext.Provider value={contextValue}>
            {children}
        </MultiModalContext.Provider>
    );
};

// Hook to use multi-modal context
export const useMultiModal = (): MultiModalContextType => {
    const context = useContext(MultiModalContext);
    if (context === undefined) {
        throw new Error('useMultiModal must be used within a MultiModalProvider');
    }
    return context;
};

// Multi-modal error component
interface MultiModalErrorProps {
    type: 'error' | 'warning' | 'success' | 'info';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    duration?: number;
    showVisual?: boolean;
    showHaptic?: boolean;
    showAudio?: boolean;
    children?: ReactNode;
}

export const MultiModalError: React.FC<MultiModalErrorProps> = ({
    type,
    severity,
    message,
    duration = 3000,
    showVisual = true,
    showHaptic = true,
    showAudio = true,
    children,
}) => {
    const { provideFeedback, isHighContrastEnabled, preferReducedMotion } = useMultiModal();
    const [animatedValue] = useState(new Animated.Value(0));

    useEffect(() => {
        // Auto-trigger feedback
        const timer = setTimeout(() => {
            provideFeedback(type, severity, message);
        }, 100);

        return () => clearTimeout(timer);
    }, [type, severity, message, provideFeedback]);

    // Visual representation
    const getVisualStyles = () => {
        const baseStyles = {
            padding: 16,
            borderRadius: 8,
            margin: 8,
        };

        const colorSchemes = {
            error: {
                backgroundColor: '#FFF5F5',
                borderColor: '#FF3B30',
                color: '#8E1B1B',
            },
            warning: {
                backgroundColor: '#FFF8E6',
                borderColor: '#FF9500',
                color: '#CC7700',
            },
            success: {
                backgroundColor: '#F0FFF4',
                borderColor: '#34C759',
                color: '#2D7A2F',
            },
            info: {
                backgroundColor: '#F0F8FF',
                borderColor: '#007AFF',
                color: '#0051A5',
            },
        };

        const scheme = colorSchemes[type];

        let finalStyles = {
            ...baseStyles,
            ...scheme,
        };

        if (isHighContrastEnabled) {
            finalStyles = {
                ...finalStyles,
                color: '#000000',
            } as any;
        }

        return finalStyles;
    };

    const visualStyles = getVisualStyles();

    return (
        <Animated.View
            style={[
                styles.container,
                visualStyles,
                {
                    transform: [
                        {
                            scale: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.8, 1],
                            }),
                        },
                    ],
                    opacity: animatedValue,
                },
            ]}
        >
            <Text style={[styles.text, { color: visualStyles.color }]}>
                {message}
            </Text>
            {children}
        </Animated.View>
    );
};

// Advanced multi-modal feedback manager
export class MultiModalFeedbackManager {
    private static instance: MultiModalFeedbackManager;
    private activeFeedback: Map<string, MultiModalFeedback> = new Map();
    private feedbackHistory: MultiModalFeedback[] = [];

    static getInstance(): MultiModalFeedbackManager {
        if (!MultiModalFeedbackManager.instance) {
            MultiModalFeedbackManager.instance = new MultiModalFeedbackManager();
        }
        return MultiModalFeedbackManager.instance;
    }

    addFeedback(feedback: MultiModalFeedback): void {
        this.activeFeedback.set(feedback.id, feedback);
        this.feedbackHistory.unshift(feedback);

        // Keep history limited
        if (this.feedbackHistory.length > 100) {
            this.feedbackHistory = this.feedbackHistory.slice(0, 100);
        }
    }

    removeFeedback(id: string): void {
        this.activeFeedback.delete(id);
    }

    clearActiveFeedback(): void {
        this.activeFeedback.clear();
    }

    getActiveFeedback(): MultiModalFeedback[] {
        return Array.from(this.activeFeedback.values());
    }

    getFeedbackHistory(limit?: number): MultiModalFeedback[] {
        return limit ? this.feedbackHistory.slice(0, limit) : this.feedbackHistory;
    }

    getFeedbackByType(type: string): MultiModalFeedback[] {
        return this.feedbackHistory.filter(f => f.type === type);
    }

    getFeedbackBySeverity(severity: string): MultiModalFeedback[] {
        return this.feedbackHistory.filter(f => f.severity === severity);
    }

    // Statistics
    getFeedbackStats() {
        return {
            total: this.feedbackHistory.length,
            byType: {
                error: this.feedbackHistory.filter(f => f.type === 'error').length,
                warning: this.feedbackHistory.filter(f => f.type === 'warning').length,
                success: this.feedbackHistory.filter(f => f.type === 'success').length,
                info: this.feedbackHistory.filter(f => f.type === 'info').length,
            },
            bySeverity: {
                low: this.feedbackHistory.filter(f => f.severity === 'low').length,
                medium: this.feedbackHistory.filter(f => f.severity === 'medium').length,
                high: this.feedbackHistory.filter(f => f.severity === 'high').length,
                critical: this.feedbackHistory.filter(f => f.severity === 'critical').length,
            },
        };
    }
}

// Styles
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    text: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
});

// Predefined feedback patterns
export const FEEDBACK_PATTERNS = {
    // Standard error patterns
    VALIDATION_ERROR: {
        type: 'error' as const,
        severity: 'medium' as const,
        hapticIntensity: 'medium' as const,
        visualDuration: 3000,
    },
    NETWORK_ERROR: {
        type: 'error' as const,
        severity: 'high' as const,
        hapticIntensity: 'medium' as const,
        visualDuration: 5000,
    },
    CRITICAL_ERROR: {
        type: 'error' as const,
        severity: 'critical' as const,
        hapticIntensity: 'heavy' as const,
        visualDuration: 8000,
    },

    // Success patterns
    OPERATION_SUCCESS: {
        type: 'success' as const,
        severity: 'low' as const,
        hapticIntensity: 'light' as const,
        visualDuration: 2000,
    },

    // Warning patterns
    ATTENTION_WARNING: {
        type: 'warning' as const,
        severity: 'medium' as const,
        hapticIntensity: 'light' as const,
        visualDuration: 4000,
    },
};

export default MultiModalProvider;