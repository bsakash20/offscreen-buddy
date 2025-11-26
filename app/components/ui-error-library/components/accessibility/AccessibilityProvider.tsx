/**
 * Accessibility Provider Component for iOS Error UI Library
 * Provides VoiceOver optimization, Dynamic Type support, and accessibility context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    AccessibilityInfo,
    Text,
    Platform,
    Settings,
} from 'react-native';

interface AccessibilityContextType {
    isScreenReaderEnabled: boolean;
    isReduceMotionEnabled: boolean;
    isHighContrastEnabled: boolean;
    isBoldTextEnabled: boolean;
    dynamicTextSize: 'small' | 'medium' | 'large' | 'extraLarge';
    announceForAccessibility: (message: string) => void;
    announceForAccessibilityWithOptions: (message: string, options: any) => void;
    preferredLanguages: string[];
    shouldAnimate: boolean;
    accessibilitySettings: {
        fontScale: number;
        accessibilityEnabled: boolean;
        highContrast: boolean;
        reduceMotion: boolean;
        boldText: boolean;
    };
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface Props {
    children: ReactNode;
    errorComponents?: React.ComponentType<any>[];
    enableAnnouncements?: boolean;
    defaultLanguage?: string;
}

interface AccessibilityProviderState {
    isScreenReaderEnabled: boolean;
    isReduceMotionEnabled: boolean;
    isHighContrastEnabled: boolean;
    isBoldTextEnabled: boolean;
    dynamicTextSize: 'small' | 'medium' | 'large' | 'extraLarge';
    preferredLanguages: string[];
    accessibilitySettings: {
        fontScale: number;
        accessibilityEnabled: boolean;
        highContrast: boolean;
        reduceMotion: boolean;
        boldText: boolean;
    };
}

const AccessibilityProvider: React.FC<Props> = ({
    children,
    errorComponents = [],
    enableAnnouncements = true,
    defaultLanguage = 'en',
}) => {
    const [state, setState] = useState<AccessibilityProviderState>({
        isScreenReaderEnabled: false,
        isReduceMotionEnabled: false,
        isHighContrastEnabled: false,
        isBoldTextEnabled: false,
        dynamicTextSize: 'medium',
        preferredLanguages: [defaultLanguage],
        accessibilitySettings: {
            fontScale: 1,
            accessibilityEnabled: false,
            highContrast: false,
            reduceMotion: false,
            boldText: false,
        },
    });

    const announceForAccessibility = (message: string) => {
        if (enableAnnouncements && state.isScreenReaderEnabled) {
            AccessibilityInfo.announceForAccessibility(message);
        }
    };

    const announceForAccessibilityWithOptions = (message: string, options: any) => {
        if (enableAnnouncements && state.isScreenReaderEnabled) {
            // In a real implementation, this would use React Native's announceForAccessibilityWithOptions
            AccessibilityInfo.announceForAccessibility(message);
        }
    };

    const detectDynamicTextSize = (fontScale: number): 'small' | 'medium' | 'large' | 'extraLarge' => {
        if (fontScale <= 0.85) return 'small';
        if (fontScale <= 1.15) return 'medium';
        if (fontScale <= 1.45) return 'large';
        return 'extraLarge';
    };

    useEffect(() => {
        // Subscribe to accessibility info changes
        const subscriptions: { remove: () => void }[] = [];

        // Screen reader status
        const screenReaderSubscription = AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
            setState(prev => ({
                ...prev,
                isScreenReaderEnabled: isEnabled,
            }));
        });
        if (screenReaderSubscription && typeof screenReaderSubscription.remove === 'function') {
            subscriptions.push(screenReaderSubscription);
        }

        // Reduce motion
        if (Platform.OS === 'ios') {
            const reduceMotionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (isReduceMotionEnabled) => {
                setState(prev => ({
                    ...prev,
                    isReduceMotionEnabled,
                }));
            });
            if (reduceMotionSubscription && typeof reduceMotionSubscription.remove === 'function') {
                subscriptions.push(reduceMotionSubscription);
            }
        }

        // Bold text
        if (Platform.OS === 'ios') {
            const boldTextSubscription = AccessibilityInfo.addEventListener('boldTextChanged', (isBoldTextEnabled) => {
                setState(prev => ({
                    ...prev,
                    isBoldTextEnabled,
                }));
            });
            if (boldTextSubscription && typeof boldTextSubscription.remove === 'function') {
                subscriptions.push(boldTextSubscription);
            }
        }

        // Fetch initial values
        Promise.all([
            AccessibilityInfo.isScreenReaderEnabled(),
            Platform.OS === 'ios' ? AccessibilityInfo.isReduceMotionEnabled() : Promise.resolve(false),
            Platform.OS === 'ios' ? AccessibilityInfo.isBoldTextEnabled() : Promise.resolve(false),
        ]).then(([isScreenReaderEnabled, isReduceMotionEnabled, isBoldTextEnabled]) => {
            setState(prev => ({
                ...prev,
                isScreenReaderEnabled,
                isReduceMotionEnabled,
                isBoldTextEnabled,
            }));

            // Get font scale from PixelRatio or Dimensions
            const fontScale = 1; // Default value, would need platform-specific implementation
            const dynamicTextSize = detectDynamicTextSize(fontScale);

            setState(prev => ({
                ...prev,
                dynamicTextSize,
                accessibilitySettings: {
                    fontScale,
                    accessibilityEnabled: isScreenReaderEnabled,
                    highContrast: false, // Would need platform-specific implementation
                    reduceMotion: isReduceMotionEnabled,
                    boldText: isBoldTextEnabled,
                },
            }));
        });

        return () => {
            subscriptions.forEach(subscription => {
                if (subscription && typeof subscription.remove === 'function') {
                    subscription.remove();
                }
            });
        };
    }, []);

    const contextValue: AccessibilityContextType = {
        isScreenReaderEnabled: state.isScreenReaderEnabled,
        isReduceMotionEnabled: state.isReduceMotionEnabled,
        isHighContrastEnabled: state.isHighContrastEnabled,
        isBoldTextEnabled: state.isBoldTextEnabled,
        dynamicTextSize: state.dynamicTextSize,
        announceForAccessibility,
        announceForAccessibilityWithOptions,
        preferredLanguages: state.preferredLanguages,
        shouldAnimate: !state.isReduceMotionEnabled,
        accessibilitySettings: state.accessibilitySettings,
    };

    return (
        <AccessibilityContext.Provider value={contextValue}>
            {children}
        </AccessibilityContext.Provider>
    );
};

// Hook to use accessibility context
export const useAccessibility = (): AccessibilityContextType => {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
};

// HOC to enhance components with accessibility
export const withAccessibility = <P extends object>(
    WrappedComponent: React.ComponentType<P>,
    accessibilityOptions?: {
        defaultAnnouncement?: string;
        shouldAnnounceOnMount?: boolean;
        shouldAnnounceOnUpdate?: boolean;
        customAnnouncements?: Record<string, string>;
    }
) => {
    const EnhancedComponent = (props: P & { testID?: string }) => {
        const accessibility = useAccessibility();

        useEffect(() => {
            if (accessibilityOptions?.shouldAnnounceOnMount && accessibilityOptions.defaultAnnouncement) {
                accessibility.announceForAccessibility(accessibilityOptions.defaultAnnouncement);
            }
        }, [accessibility.isScreenReaderEnabled]);

        // Pass accessibility props to wrapped component
        const accessibilityProps = {
            ...props,
            accessibility,
            testID: props.testID || `accessibility_component_${WrappedComponent.displayName}`,
            accessible: accessibility.isScreenReaderEnabled,
            accessibilityRole: 'text' as const,
            accessibilityLabel: accessibilityOptions?.defaultAnnouncement,
            accessibilityHint: 'This component provides accessible error information',
        };

        return <WrappedComponent {...accessibilityProps} />;
    };

    EnhancedComponent.displayName = `withAccessibility(${WrappedComponent.displayName || 'Component'})`;

    return EnhancedComponent;
};

// Accessibility announcement utilities
export const AccessibilityAnnouncements = {
    // Toast announcements
    TOAST_ERROR: (title: string, message: string) => `${title}. ${message}.`,
    TOAST_SUCCESS: (title: string, message: string) => `${title}. ${message}.`,
    TOAST_WARNING: (title: string, message: string) => `${title}. ${message}.`,
    TOAST_DISMISSED: (title: string) => `${title} notification dismissed.`,

    // Alert announcements
    ALERT_ERROR: (title: string, message: string) => `Error alert. ${title}. ${message}.`,
    ALERT_WARNING: (title: string, message: string) => `Warning. ${title}. ${message}.`,
    ALERT_CONFIRMATION: (title: string, message: string) => `Confirmation required. ${title}. ${message}.`,
    ALERT_DISMISSED: (title: string) => `${title} alert dismissed.`,

    // Error screen announcements
    ERROR_SCREEN: (title: string, message: string) => `Error screen. ${title}. ${message}.`,
    ERROR_SCREEN_RETRY: 'Retrying action. Please wait.',
    ERROR_SCREEN_RECOVERED: 'Error resolved. Content loading.',

    // Inline error announcements
    INLINE_ERROR: (fieldName: string, message: string) => `${fieldName}. ${message}.`,
    INLINE_ERROR_FIXED: (fieldName: string) => `${fieldName} error resolved.`,

    // Generic announcements
    LOADING: 'Loading content. Please wait.',
    LOADING_COMPLETE: 'Content loaded successfully.',
    LOADING_ERROR: 'Loading failed. Please try again.',
    FOCUS_MOVED: 'Focus moved to next element.',
    NAVIGATION_HELP: 'Use swipe gestures or keyboard to navigate between elements.',
};

// Dynamic type utilities
export const DynamicType = {
    getTextSize: (baseSize: number, scale: 'small' | 'medium' | 'large' | 'extraLarge'): number => {
        const scaleMap = {
            small: 0.85,
            medium: 1,
            large: 1.15,
            extraLarge: 1.3,
        };
        return Math.round(baseSize * scaleMap[scale]);
    },

    getLineHeight: (baseLineHeight: number, scale: 'small' | 'medium' | 'large' | 'extraLarge'): number => {
        const scaleMap = {
            small: 0.85,
            medium: 1,
            large: 1.15,
            extraLarge: 1.3,
        };
        return Math.round(baseLineHeight * scaleMap[scale]);
    },

    getSpacing: (baseSpacing: number, scale: 'small' | 'medium' | 'large' | 'extraLarge'): number => {
        const scaleMap = {
            small: 0.9,
            medium: 1,
            large: 1.1,
            extraLarge: 1.2,
        };
        return Math.round(baseSpacing * scaleMap[scale]);
    },
};

// High contrast utilities
export const HighContrast = {
    getHighContrastColor: (lightColor: string, darkColor: string): string => {
        // This is a simplified implementation
        // In a real app, you'd have more sophisticated color management
        return lightColor;
    },

    getBorderColor: (baseColor: string, isHighContrast: boolean): string => {
        return isHighContrast ? '#000000' : baseColor;
    },

    getBackgroundColor: (baseColor: string, isHighContrast: boolean): string => {
        return isHighContrast ? '#FFFFFF' : baseColor;
    },
};

// Motion utilities
export const ReducedMotion = {
    shouldAnimate: (prefersReducedMotion: boolean, defaultAnimation: boolean): boolean => {
        return !prefersReducedMotion && defaultAnimation;
    },

    getReducedMotionConfig: () => ({
        duration: 0,
        easing: 'linear',
    }),
};

// Test utilities
export const AccessibilityTestUtils = {
    getTestAnnouncement: (component: string, action: string) =>
        `Test announcement. ${component} ${action}.`,

    createTestAccessibilityProps: (announcement: string, role?: string) => ({
        accessible: true,
        accessibilityRole: role || 'text',
        accessibilityLabel: announcement,
        testID: `test_accessibility_${Math.random().toString(36).substr(2, 9)}`,
    }),

    simulateScreenReader: () => {
        // In testing, you can simulate screen reader announcements
        console.log('[Accessibility Test] Simulating screen reader announcement');
    },
};

export default AccessibilityProvider;