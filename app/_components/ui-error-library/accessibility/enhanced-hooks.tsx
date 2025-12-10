/**
 * Enhanced Accessibility Hooks for iOS Error Presentation System
 * Advanced hooks for VoiceOver, Dynamic Type, and multi-modal interactions
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    Platform,
    Text,
    findNodeHandle,
    UIManager,
    LayoutAnimation,
    Dimensions,
    PixelRatio,
} from 'react-native';
import { useAccessibility } from '../components/accessibility/AccessibilityProvider';
export { useAccessibility };

// Enhanced accessibility hooks
export const useEnhancedAccessibility = () => {
    const baseAccessibility = useAccessibility();

    const [dynamicTypeScale, setDynamicTypeScale] = useState<'small' | 'medium' | 'large' | 'extraLarge'>('medium');
    const [systemFontScale, setSystemFontScale] = useState(1);
    const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
    const [boldTextEnabled, setBoldTextEnabled] = useState(false);

    useEffect(() => {
        const getDynamicTextSize = (fontScale: number): 'small' | 'medium' | 'large' | 'extraLarge' => {
            if (fontScale <= 0.85) return 'small';
            if (fontScale <= 1.15) return 'medium';
            if (fontScale <= 1.45) return 'large';
            return 'extraLarge';
        };

        // Subscribe to system font changes
        const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotion) => {
            setReduceMotionEnabled(reduceMotion);
        });

        // Get current system font scale
        const screenScale = Dimensions.get('window').scale;
        setSystemFontScale(screenScale);
        setDynamicTypeScale(getDynamicTextSize(screenScale));

        return () => {
            if (subscription && typeof subscription.remove === 'function') {
                subscription.remove();
            }
        };
    }, []);

    return {
        ...baseAccessibility,
        dynamicTypeScale,
        systemFontScale,
        reduceMotionEnabled,
        boldTextEnabled,
        scaleForDynamicType: (baseSize: number) => {
            const scaleMap: Record<string, number> = {
                small: 0.85,
                medium: 1,
                large: 1.15,
                extraLarge: 1.3,
            };
            return Math.round(baseSize * scaleMap[dynamicTypeScale]);
        },
        shouldRespectReducedMotion: (animationDuration: number = 300) => {
            return reduceMotionEnabled ? 0 : animationDuration;
        },
    };
};
// Error announcement queue management
export const useErrorAnnouncements = () => {
    const [announcementQueue, setAnnouncementQueue] = useState<string[]>([]);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const queueRef = useRef<NodeJS.Timeout | null>(null);
    const { announceForAccessibility } = useAccessibility();

    const addAnnouncement = useCallback((message: string, priority: 'low' | 'normal' | 'high' | 'critical' = 'normal') => {
        setAnnouncementQueue(prev => {
            if (priority === 'critical') {
                // Prepend critical announcements
                return [message, ...prev];
            }
            return [...prev, message];
        });
    }, []);

    const processNextAnnouncement = useCallback(() => {
        setAnnouncementQueue(prev => {
            if (prev.length === 0) {
                setIsProcessing(false);
                return prev;
            }

            const [next, ...rest] = prev;
            setCurrentAnnouncement(next);
            announceForAccessibility(next);

            // Clear current announcement after a delay
            queueRef.current = setTimeout(() => {
                setCurrentAnnouncement('');
                setIsProcessing(false);
            }, 2000) as unknown as NodeJS.Timeout;

            return rest;
        });
    }, [announceForAccessibility]);

    const clearQueue = useCallback(() => {
        setAnnouncementQueue([]);
        setCurrentAnnouncement('');
        if (queueRef.current) {
            clearTimeout(queueRef.current);
            queueRef.current = null;
        }
        setIsProcessing(false);
    }, []);

    const processQueue = useCallback(() => {
        if (!isProcessing && announcementQueue.length > 0) {
            setIsProcessing(true);
            processNextAnnouncement();
        }
    }, [isProcessing, announcementQueue.length, processNextAnnouncement]);

    // Auto-process queue when announcements are added
    useEffect(() => {
        if (announcementQueue.length > 0 && !isProcessing) {
            processQueue();
        }
    }, [announcementQueue, isProcessing, processQueue]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (queueRef.current) {
                clearTimeout(queueRef.current);
            }
        };
    }, []);

    return {
        addAnnouncement,
        clearQueue,
        queueLength: announcementQueue.length,
        currentAnnouncement,
        isProcessing,
    };
};

// VoiceOver-specific utilities
export const useVoiceOver = () => {
    const [isScreenReaderActive, setIsScreenReaderActive] = useState(false);
    const [voiceOverAnnouncements, setVoiceOverAnnouncements] = useState<string[]>([]);

    useEffect(() => {
        AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
            setIsScreenReaderActive(isEnabled);

            if (isEnabled) {
                // Enable enhanced voice over features
                setVoiceOverAnnouncements(prev => [...prev, 'Screen reader enabled']);
            }
        });

        AccessibilityInfo.isScreenReaderEnabled().then((isEnabled) => {
            setIsScreenReaderActive(isEnabled);
        });
    }, []);

    return {
        isScreenReaderActive,
        voiceOverAnnouncements,
        createAnnouncement: (message: string, type: 'polite' | 'assertive' | 'assertive-announcement' = 'polite') => {
            // Enhanced announcements with better context
            const enhancedMessage = enhanceForVoiceOver(message);
            return enhancedMessage;
        },
        announce: (announcement: any) => {
            AccessibilityInfo.announceForAccessibility(typeof announcement === 'string' ? announcement : announcement.message);
        },
        createContextAwareAnnouncement: (message: string, context: string) => {
            return `${context}. ${message}`;
        }
    };
};

// Dynamic Type responsive component helper
export const useDynamicType = (componentType: 'text' | 'button' | 'icon' = 'text') => {
    const { dynamicTypeScale, systemFontScale } = useEnhancedAccessibility();

    const getResponsiveSize = useCallback((baseSize: number) => {
        const scaleMultiplier: Record<string, number> = {
            small: 0.85,
            medium: 1,
            large: 1.15,
            extraLarge: 1.3,
        };

        return Math.round(baseSize * scaleMultiplier[dynamicTypeScale]);
    }, [dynamicTypeScale]);

    const getResponsiveSpacing = useCallback((baseSpacing: number) => {
        const scaleMultiplier: Record<string, number> = {
            small: 0.9,
            medium: 1,
            large: 1.1,
            extraLarge: 1.2,
        };

        return Math.round(baseSpacing * scaleMultiplier[dynamicTypeScale]);
    }, [dynamicTypeScale]);

    return {
        dynamicTypeScale,
        systemFontScale,
        getResponsiveSize,
        getResponsiveSpacing,
        // Accessibility-compliant minimum sizes
        getMinimumTouchSize: () => {
            const minimumSizes = {
                small: 44,
                medium: 48,
                large: 52,
                extraLarge: 56,
            };
            return minimumSizes[dynamicTypeScale];
        },
    };
};

// Multi-modal feedback system
export const useMultiModalFeedback = () => {
    const [feedbackEnabled, setFeedbackEnabled] = useState({
        haptic: true,
        audio: true,
        visual: true,
    });

    const provideFeedback = useCallback((
        type: 'error' | 'success' | 'warning' | 'info',
        intensity: 'light' | 'medium' | 'heavy' = 'medium'
    ) => {
        // Visual feedback
        if (feedbackEnabled.visual) {
            // Trigger visual feedback like color changes, animations, etc.
            console.log(`Visual feedback for ${type} with ${intensity} intensity`);
        }

        // Haptic feedback (iOS specific)
        if (Platform.OS === 'ios' && feedbackEnabled.haptic) {
            const hapticTypes = {
                error: 'notificationError',
                success: 'notificationSuccess',
                warning: 'notificationWarning',
                info: 'impactLight',
            };

            // This would integrate with actual haptic feedback system
            console.log(`Haptic feedback: ${hapticTypes[type]} with ${intensity} intensity`);
        }

        // Audio feedback
        if (feedbackEnabled.audio) {
            const audioTypes = {
                error: 'error_chime',
                success: 'success_chime',
                warning: 'warning_chime',
                info: 'info_chime',
            };

            // This would integrate with actual audio feedback system
            console.log(`Audio feedback: ${audioTypes[type]} with ${intensity} intensity`);
        }
    }, [feedbackEnabled]);

    const toggleFeedbackType = useCallback((type: keyof typeof feedbackEnabled) => {
        setFeedbackEnabled(prev => ({
            ...prev,
            [type]: !prev[type],
        }));
    }, []);

    return {
        feedbackEnabled,
        provideFeedback,
        toggleFeedbackType,
        setFeedbackEnabled,
    };
};

// Keyboard and switch control navigation
export const useKeyboardNavigation = () => {
    const [focusManager, setFocusManager] = useState({
        currentFocusIndex: 0,
        focusableElements: [] as string[],
        tabOrder: [] as string[],
    });

    const registerFocusableElement = useCallback((elementId: string) => {
        setFocusManager(prev => ({
            ...prev,
            focusableElements: [...prev.focusableElements.filter(id => id !== elementId), elementId],
        }));
    }, []);

    const unregisterFocusableElement = useCallback((elementId: string) => {
        setFocusManager(prev => ({
            ...prev,
            focusableElements: prev.focusableElements.filter(id => id !== elementId),
        }));
    }, []);

    const moveFocus = useCallback((direction: 'next' | 'previous' | 'first' | 'last', elementId?: string) => {
        const { focusableElements, currentFocusIndex } = focusManager;

        if (elementId) {
            const elementIndex = focusableElements.indexOf(elementId);
            if (elementIndex !== -1) {
                setFocusManager(prev => ({ ...prev, currentFocusIndex: elementIndex }));
            }
            return;
        }

        let newIndex = currentFocusIndex;

        switch (direction) {
            case 'next':
                newIndex = (currentFocusIndex + 1) % focusableElements.length;
                break;
            case 'previous':
                newIndex = currentFocusIndex === 0 ? focusableElements.length - 1 : currentFocusIndex - 1;
                break;
            case 'first':
                newIndex = 0;
                break;
            case 'last':
                newIndex = focusableElements.length - 1;
                break;
        }

        setFocusManager(prev => ({ ...prev, currentFocusIndex: newIndex }));
    }, [focusManager]);

    const getCurrentFocusedElement = useCallback(() => {
        const { focusableElements, currentFocusIndex } = focusManager;
        return focusableElements[currentFocusIndex] || null;
    }, [focusManager]);

    return {
        focusManager,
        registerFocusableElement,
        unregisterFocusableElement,
        moveFocus,
        getCurrentFocusedElement,
    };
};

// Cognitive accessibility helper
export const useCognitiveAccessibility = () => {
    const [complexityLevel, setComplexityLevel] = useState<'simple' | 'moderate' | 'complex'>('moderate');
    const [contentProgressiveDisclosure, setContentProgressiveDisclosure] = useState(true);

    const simplifyText = useCallback((text: string, targetLevel: 'simple' | 'moderate' | 'complex') => {
        // This would implement text simplification logic
        // For now, return the original text
        return text;
    }, []);

    const addProgressiveDisclosure = useCallback((content: string) => {
        if (!contentProgressiveDisclosure) return content;

        // Split content into manageable chunks
        const sentences = content.split('.');
        if (sentences.length <= 2) return content;

        return sentences[0] + '. ' +
            'Tap "Show details" to read more.';
    }, [contentProgressiveDisclosure]);

    return {
        complexityLevel,
        contentProgressiveDisclosure,
        setComplexityLevel,
        setContentProgressiveDisclosure,
        simplifyText,
        addProgressiveDisclosure,
    };
};

// Utility function to enhance messages for VoiceOver
const enhanceForVoiceOver = (message: string): string => {
    // Add appropriate pauses and emphasis for better screen reader experience
    return message
        .replace(/\./g, '. ')
        .replace(/!/g, '! ')
        .replace(/\?/g, '? ');
};

// Error-specific accessibility hooks
export const useErrorAccessibility = () => {
    const { addAnnouncement } = useErrorAnnouncements();
    const { provideFeedback } = useMultiModalFeedback();
    const { createAnnouncement } = useVoiceOver();

    const announceError = useCallback((
        errorType: 'validation' | 'network' | 'system' | 'payment',
        severity: 'low' | 'medium' | 'high' | 'critical',
        message: string,
        actions?: string[]
    ) => {
        let announcement = '';

        // Build context-aware announcement
        switch (severity) {
            case 'critical':
                announcement = `Critical error: ${message}`;
                provideFeedback('error', 'heavy');
                break;
            case 'high':
                announcement = `Error: ${message}`;
                provideFeedback('error', 'medium');
                break;
            case 'medium':
                announcement = `Warning: ${message}`;
                provideFeedback('warning', 'medium');
                break;
            case 'low':
                announcement = `Notice: ${message}`;
                provideFeedback('info', 'light');
                break;
        }

        // Add action context if available
        if (actions && actions.length > 0) {
            announcement += `. Actions available: ${actions.join(', ')}`;
        }

        // Announce with appropriate priority
        const priority = severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'normal';
        addAnnouncement(announcement, priority);

        return announcement;
    }, [addAnnouncement, provideFeedback]);

    return {
        announceError,
    };
};

export default useEnhancedAccessibility;