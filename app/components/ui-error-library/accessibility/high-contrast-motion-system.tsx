/**
 * High Contrast and Reduced Motion Support System for iOS Accessibility
 * Comprehensive support for users with visual and motion sensitivity needs
 */

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import {
    View,
    Text,
    StyleSheet,
    AccessibilityInfo,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { useAccessibility } from './enhanced-hooks';
import { useMultiModal } from './multi-modal-system';
import { useDynamicTypeContext } from './dynamic-type-system';

// High contrast and reduced motion configuration
export interface HighContrastMotionConfig {
    enabled: boolean;
    highContrast: {
        enabled: boolean;
        autoDetect: boolean;
        threshold: number; // Minimum contrast ratio
        forceEnable: boolean;
        theme: 'system' | 'light' | 'dark' | 'custom';
        customColors: {
            primary: string;
            secondary: string;
            background: string;
            surface: string;
            error: string;
            warning: string;
            success: string;
            text: string;
        };
    };
    reducedMotion: {
        enabled: boolean;
        autoDetect: boolean;
        globalDuration: number; // Default animation duration
        excludeTypes: string[]; // Animation types to exclude from reduced motion
        preferStaticAlternatives: boolean;
        minimumReadableDuration: number; // Minimum duration for text animations
    };
    visualEnhancements: {
        enabled: boolean;
        focusIndicators: boolean;
        selectionHighlights: boolean;
        hoverStates: boolean;
        enhancedBorders: boolean;
        boldText: boolean;
    };
    responsiveAdaptations: {
        enabled: boolean;
        adaptToDeviceSettings: boolean;
        respectUserPreferences: boolean;
        fallbackStyles: boolean;
    };
}

// High contrast theme
interface HighContrastTheme {
    colors: {
        background: string;
        surface: string;
        primary: string;
        secondary: string;
        text: {
            primary: string;
            secondary: string;
            disabled: string;
        };
        error: string;
        warning: string;
        success: string;
        info: string;
        border: string;
        focus: string;
        selection: string;
    };
    typography: {
        fontWeight: 'normal' | 'bold' | 'bolder';
        fontSize: {
            small: number;
            medium: number;
            large: number;
            xLarge: number;
        };
        lineHeight: number;
    };
    spacing: {
        tight: number;
        normal: number;
        relaxed: number;
    };
    borders: {
        width: number;
        radius: number;
    };
}

// Animation configuration with reduced motion support
interface AnimationConfig {
    duration: number;
    easing: string;
    useNativeDriver?: boolean;
    reducedMotionDuration?: number;
    skipAnimation?: boolean;
}

// State for high contrast and motion management
interface HighContrastMotionState {
    isHighContrastEnabled: boolean;
    isReducedMotionEnabled: boolean;
    currentTheme: 'light' | 'dark' | 'high-contrast';
    contrastRatio: number;
    motionPreference: 'full' | 'reduced' | 'minimal';
    deviceSettings: {
        reduceMotion: boolean;
        boldText: boolean;
        highContrast: boolean;
        darkMode: boolean;
    };
}

// Context for high contrast and motion system
interface HighContrastMotionContextType {
    config: HighContrastMotionConfig;
    state: HighContrastMotionState;
    theme: HighContrastTheme;
    updateConfig: (newConfig: Partial<HighContrastMotionConfig>) => void;
    isHighContrastEnabled: () => boolean;
    isReducedMotionEnabled: () => boolean;
    getHighContrastColors: () => HighContrastTheme['colors'];
    getAnimationConfig: (baseDuration: number, animationType?: string) => AnimationConfig;
    getAccessibleTextStyle: (baseStyle: any) => any;
    getFocusIndicatorStyle: () => any;
    shouldAnimate: (animationType?: string) => boolean;
    adaptColorForContrast: (color: string, backgroundColor: string) => string;
    createHighContrastPressable: (PressableComponent: any) => any;
    generateContrastReport: () => {
        currentRatio: number;
        issues: string[];
        suggestions: string[];
        compliance: 'AA' | 'AAA' | 'non-compliant';
    };
}

// Context creation
const HighContrastMotionContext = createContext<HighContrastMotionContextType | undefined>(undefined);

// Default configuration
const DEFAULT_HIGH_CONTRAST_MOTION_CONFIG: HighContrastMotionConfig = {
    enabled: true,
    highContrast: {
        enabled: true,
        autoDetect: true,
        threshold: 4.5, // WCAG AA standard
        forceEnable: false,
        theme: 'system',
        customColors: {
            primary: '#000000',
            secondary: '#1a1a1a',
            background: '#ffffff',
            surface: '#f8f8f8',
            error: '#dc2626',
            warning: '#d97706',
            success: '#16a34a',
            info: '#2563eb',
            text: '#000000',
        },
    },
    reducedMotion: {
        enabled: true,
        autoDetect: true,
        globalDuration: 0,
        excludeTypes: ['entrance', 'exit', 'hover'],
        preferStaticAlternatives: true,
        minimumReadableDuration: 150,
    },
    visualEnhancements: {
        enabled: true,
        focusIndicators: true,
        selectionHighlights: true,
        hoverStates: false,
        enhancedBorders: true,
        boldText: true,
    },
    responsiveAdaptations: {
        enabled: true,
        adaptToDeviceSettings: true,
        respectUserPreferences: true,
        fallbackStyles: true,
    },
};

// High contrast themes
const HIGH_CONTRAST_THEMES = {
    light: {
        colors: {
            background: '#ffffff',
            surface: '#f8f8f8',
            primary: '#000000',
            secondary: '#1a1a1a',
            text: {
                primary: '#000000',
                secondary: '#333333',
                disabled: '#666666',
            },
            error: '#dc2626',
            warning: '#d97706',
            success: '#16a34a',
            info: '#2563eb',
            border: '#000000',
            focus: '#0066cc',
            selection: '#0066cc',
        },
        typography: {
            fontWeight: 'bold' as const,
            fontSize: {
                small: 16,
                medium: 18,
                large: 20,
                xLarge: 24,
            },
            lineHeight: 1.6,
        },
        spacing: {
            tight: 4,
            normal: 8,
            relaxed: 16,
        },
        borders: {
            width: 2,
            radius: 0,
        },
    },
    dark: {
        colors: {
            background: '#000000',
            surface: '#1a1a1a',
            primary: '#ffffff',
            secondary: '#e5e5e5',
            text: {
                primary: '#ffffff',
                secondary: '#cccccc',
                disabled: '#999999',
            },
            error: '#fca5a5',
            warning: '#fcd34d',
            success: '#86efac',
            info: '#93c5fd',
            border: '#ffffff',
            focus: '#66b3ff',
            selection: '#66b3ff',
        },
        typography: {
            fontWeight: 'bold' as const,
            fontSize: {
                small: 16,
                medium: 18,
                large: 20,
                xLarge: 24,
            },
            lineHeight: 1.6,
        },
        spacing: {
            tight: 4,
            normal: 8,
            relaxed: 16,
        },
        borders: {
            width: 2,
            radius: 0,
        },
    },
    'high-contrast': {
        colors: {
            background: '#000000',
            surface: '#000000',
            primary: '#ffffff',
            secondary: '#ffff00',
            text: {
                primary: '#ffffff',
                secondary: '#ffff00',
                disabled: '#808080',
            },
            error: '#ff0000',
            warning: '#ffff00',
            success: '#00ff00',
            info: '#00ffff',
            border: '#ffffff',
            focus: '#ffff00',
            selection: '#ffff00',
        },
        typography: {
            fontWeight: 'bolder' as const,
            fontSize: {
                small: 18,
                medium: 20,
                large: 24,
                xLarge: 28,
            },
            lineHeight: 1.8,
        },
        spacing: {
            tight: 8,
            normal: 12,
            relaxed: 20,
        },
        borders: {
            width: 3,
            radius: 0,
        },
    },
};

// Provider component
interface HighContrastMotionProviderProps {
    children: ReactNode;
    config?: Partial<HighContrastMotionConfig>;
    onHighContrastChange?: (enabled: boolean) => void;
    onReducedMotionChange?: (enabled: boolean) => void;
}

const HighContrastMotionProvider: React.FC<HighContrastMotionProviderProps> = ({
    children,
    config = {},
    onHighContrastChange,
    onReducedMotionChange,
}) => {
    const [contrastMotionConfig, setContrastMotionConfig] = useState<HighContrastMotionConfig>({
        ...DEFAULT_HIGH_CONTRAST_MOTION_CONFIG,
        ...config,
    });

    const [contrastMotionState, setContrastMotionState] = useState<HighContrastMotionState>({
        isHighContrastEnabled: false,
        isReducedMotionEnabled: false,
        currentTheme: 'light',
        contrastRatio: 4.5,
        motionPreference: 'full',
        deviceSettings: {
            reduceMotion: false,
            boldText: false,
            highContrast: false,
            darkMode: false,
        },
    });

    const [currentTheme, setCurrentTheme] = useState<HighContrastTheme>(HIGH_CONTRAST_THEMES.light);

    // Access other accessibility systems
    const { announceForAccessibility } = useAccessibility();
    const { provideFeedback } = useMultiModal();
    const { dynamicTypeScale } = useDynamicTypeContext();

    // Device accessibility settings detection
    useEffect(() => {
        const checkDeviceSettings = async () => {
            try {
                // Check for reduced motion
                const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled?.() || false;

                // Check for bold text
                const isBoldTextEnabled = await AccessibilityInfo.isBoldTextEnabled?.() || false;

                // Check system theme
                const { width, height } = Dimensions.get('window');
                const isDarkMode = false; // This would require native module or Appearance API

                setContrastMotionState(prev => ({
                    ...prev,
                    deviceSettings: {
                        reduceMotion: isReduceMotionEnabled,
                        boldText: isBoldTextEnabled,
                        highContrast: false, // Would need native implementation
                        darkMode: isDarkMode,
                    },
                    isReducedMotionEnabled: isReduceMotionEnabled || contrastMotionConfig.reducedMotion.autoDetect,
                    motionPreference: isReduceMotionEnabled ? 'reduced' : 'full',
                }));

                // Auto-detect high contrast
                if (contrastMotionConfig.highContrast.autoDetect) {
                    const highContrastEnabled = detectHighContrast();
                    setContrastMotionState(prev => ({
                        ...prev,
                        isHighContrastEnabled: highContrastEnabled,
                        currentTheme: highContrastEnabled ? 'high-contrast' : (isDarkMode ? 'dark' : 'light'),
                    }));

                    onHighContrastChange?.(highContrastEnabled);
                }

            } catch (error) {
                console.warn('Failed to detect device accessibility settings:', error);
            }
        };

        checkDeviceSettings();

        // Subscribe to accessibility changes
        const subscriptions: { remove: () => void }[] = [];

        if (Platform.OS === 'ios') {
            const reduceMotionSubscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (reduceMotion) => {
                setContrastMotionState(prev => ({
                    ...prev,
                    isReducedMotionEnabled: reduceMotion,
                    motionPreference: reduceMotion ? 'reduced' : 'full',
                }));
                onReducedMotionChange?.(reduceMotion);
            });

            if (reduceMotionSubscription && typeof reduceMotionSubscription.remove === 'function') {
                subscriptions.push(reduceMotionSubscription);
            }
        }

        return () => {
            subscriptions.forEach(subscription => {
                if (subscription && typeof subscription.remove === 'function') {
                    subscription.remove();
                }
            });
        };
    }, [
        contrastMotionConfig.reducedMotion.autoDetect,
        contrastMotionConfig.highContrast.autoDetect,
        onHighContrastChange,
        onReducedMotionChange,
    ]);

    // Theme update effect
    useEffect(() => {
        const themeKey = contrastMotionState.isHighContrastEnabled
            ? 'high-contrast'
            : contrastMotionState.deviceSettings.darkMode
                ? 'dark'
                : 'light';

        setCurrentTheme(HIGH_CONTRAST_THEMES[themeKey]);
    }, [
        contrastMotionState.isHighContrastEnabled,
        contrastMotionState.deviceSettings.darkMode,
    ]);

    // High contrast detection algorithm
    const detectHighContrast = useCallback((): boolean => {
        // This is a simplified implementation
        // In a real app, you might check system settings or use more sophisticated detection
        const baseContrast = 4.5; // Standard contrast ratio
        const highContrastThreshold = 7.0; // AAA standard

        // For demonstration, we'll return based on user preference
        return contrastMotionConfig.highContrast.forceEnable ||
            contrastMotionConfig.deviceSettings.highContrast ||
            false;
    }, [contrastMotionConfig.highContrast.forceEnable, contrastMotionConfig.deviceSettings.highContrast]);

    // Color contrast calculation
    const calculateContrastRatio = useCallback((foreground: string, background: string): number => {
        // Simplified contrast ratio calculation
        // In a real implementation, this would properly parse RGB values
        const getLuminance = (color: string): number => {
            // Mock luminance calculation - real implementation would parse hex/rgb values
            const isLight = color === '#ffffff' || color === '#fff' || color === 'white';
            return isLight ? 1 : 0;
        };

        const fgLuminance = getLuminance(foreground);
        const bgLuminance = getLuminance(background);
        const lighter = Math.max(fgLuminance, bgLuminance);
        const darker = Math.min(fgLuminance, bgLuminance);

        return (lighter + 0.05) / (darker + 0.05);
    }, []);

    // Color adaptation for contrast
    const adaptColorForContrast = useCallback((color: string, backgroundColor: string): string => {
        const currentRatio = calculateContrastRatio(color, backgroundColor);
        const requiredRatio = contrastMotionConfig.highContrast.threshold;

        if (currentRatio >= requiredRatio) {
            return color;
        }

        // Adapt color to meet contrast requirements
        if (currentRatio < requiredRatio) {
            // For demonstration, return high contrast color
            if (backgroundColor === '#ffffff' || backgroundColor === 'white') {
                return '#000000'; // Black on white
            } else {
                return '#ffffff'; // White on dark
            }
        }

        return color;
    }, [calculateContrastRatio, contrastMotionConfig.highContrast.threshold]);

    // Animation configuration with reduced motion support
    const getAnimationConfig = useCallback((
        baseDuration: number,
        animationType: string = 'default'
    ): AnimationConfig => {
        const { reducedMotion } = contrastMotionConfig;

        // Check if animation type should be excluded
        if (reducedMotion.excludeTypes.includes(animationType)) {
            return {
                duration: 0,
                easing: 'linear',
                useNativeDriver: true,
                skipAnimation: true,
            };
        }

        // Apply reduced motion duration
        if (contrastMotionState.isReducedMotionEnabled || reducedMotion.enabled) {
            const duration = Math.max(
                reducedMotion.minimumReadableDuration,
                Math.min(baseDuration, reducedMotion.globalDuration)
            );

            return {
                duration,
                easing: 'linear',
                useNativeDriver: true,
                reducedMotionDuration: duration,
            };
        }

        return {
            duration: baseDuration,
            easing: 'ease-in-out',
            useNativeDriver: true,
        };
    }, [
        contrastMotionConfig.reducedMotion,
        contrastMotionState.isReducedMotionEnabled,
    ]);

    // Check if animation should be performed
    const shouldAnimate = useCallback((animationType: string = 'default'): boolean => {
        const { reducedMotion } = contrastMotionConfig;

        if (contrastMotionState.isReducedMotionEnabled) {
            return !reducedMotion.excludeTypes.includes(animationType) &&
                !reducedMotion.preferStaticAlternatives;
        }

        return true;
    }, [
        contrastMotionConfig.reducedMotion,
        contrastMotionState.isReducedMotionEnabled,
    ]);

    // Accessible text styling
    const getAccessibleTextStyle = useCallback((baseStyle: any = {}): any => {
        const { visualEnhancements, highContrast } = contrastMotionConfig;

        return {
            ...baseStyle,
            fontWeight: visualEnhancements.boldText || highContrast.forceEnable ? 'bold' : baseStyle.fontWeight,
            fontSize: dynamicTypeScale === 'extraLarge'
                ? (baseStyle.fontSize || 16) * 1.2
                : baseStyle.fontSize,
            color: highContrast.enabled && contrastMotionState.isHighContrastEnabled
                ? adaptColorForContrast(baseStyle.color || currentTheme.colors.text.primary, currentTheme.colors.background)
                : baseStyle.color,
            lineHeight: currentTheme.typography.lineHeight,
        };
    }, [
        contrastMotionConfig.visualEnhancements,
        contrastMotionConfig.highContrast,
        contrastMotionState.isHighContrastEnabled,
        currentTheme.colors,
        dynamicTypeScale,
        adaptColorForContrast,
    ]);

    // Focus indicator styling
    const getFocusIndicatorStyle = useCallback((): any => {
        return {
            borderWidth: currentTheme.borders.width,
            borderColor: currentTheme.colors.focus,
            borderStyle: 'solid',
            outlineWidth: currentTheme.borders.width,
            outlineColor: currentTheme.colors.focus,
            outlineStyle: 'solid',
        };
    }, [currentTheme]);

    // High contrast checkers
    const isHighContrastEnabled = useCallback((): boolean => {
        return contrastMotionState.isHighContrastEnabled && contrastMotionConfig.highContrast.enabled;
    }, [
        contrastMotionState.isHighContrastEnabled,
        contrastMotionConfig.highContrast.enabled,
    ]);

    const isReducedMotionEnabled = useCallback((): boolean => {
        return contrastMotionState.isReducedMotionEnabled && contrastMotionConfig.reducedMotion.enabled;
    }, [
        contrastMotionState.isReducedMotionEnabled,
        contrastMotionConfig.reducedMotion.enabled,
    ]);

    // Get high contrast colors
    const getHighContrastColors = useCallback((): HighContrastTheme['colors'] => {
        return currentTheme.colors;
    }, [currentTheme.colors]);

    // Create high contrast pressable wrapper
    const createHighContrastPressable = useCallback((PressableComponent: any) => {
        return (props: any) => {
            const enhancedProps = {
                ...props,
                accessibilityRole: 'button',
                accessible: true,
                style: [
                    props.style,
                    isHighContrastEnabled() && {
                        borderWidth: currentTheme.borders.width,
                        borderColor: currentTheme.colors.focus,
                        borderStyle: 'solid',
                    },
                    contrastMotionConfig.visualEnhancements.focusIndicators && {
                        // Focus styles would be applied on focus event
                    },
                ],
            };

            return React.createElement(PressableComponent, enhancedProps);
        };
    }, [
        isHighContrastEnabled,
        currentTheme.borders,
        currentTheme.colors.focus,
        contrastMotionConfig.visualEnhancements.focusIndicators,
    ]);

    // Generate contrast compliance report
    const generateContrastReport = useCallback(() => {
        const issues: string[] = [];
        const suggestions: string[] = [];

        const testColors = [
            { name: 'Error Text', color: currentTheme.colors.error, background: currentTheme.colors.background },
            { name: 'Warning Text', color: currentTheme.colors.warning, background: currentTheme.colors.background },
            { name: 'Success Text', color: currentTheme.colors.success, background: currentTheme.colors.background },
            { name: 'Info Text', color: currentTheme.colors.info, background: currentTheme.colors.background },
            { name: 'Primary Text', color: currentTheme.colors.text.primary, background: currentTheme.colors.background },
        ];

        testColors.forEach(({ name, color, background }) => {
            const ratio = calculateContrastRatio(color, background);
            if (ratio < 4.5) {
                issues.push(`${name} has insufficient contrast (${ratio.toFixed(2)}:1)`);
                suggestions.push(`Increase contrast for ${name.toLowerCase()}`);
            }
        });

        const compliance = issues.length === 0 ? 'AAA' :
            issues.length <= 2 ? 'AA' : 'non-compliant';

        return {
            currentRatio: Math.min(...testColors.map(c => calculateContrastRatio(c.color, c.background))),
            issues,
            suggestions,
            compliance,
        };
    }, [
        currentTheme.colors,
        calculateContrastRatio,
    ]);

    const updateConfig = useCallback((newConfig: Partial<HighContrastMotionConfig>) => {
        setContrastMotionConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const contextValue: HighContrastMotionContextType = {
        config: contrastMotionConfig,
        state: contrastMotionState,
        theme: currentTheme,
        updateConfig,
        isHighContrastEnabled,
        isReducedMotionEnabled,
        getHighContrastColors,
        getAnimationConfig,
        getAccessibleTextStyle,
        getFocusIndicatorStyle,
        shouldAnimate,
        adaptColorForContrast,
        createHighContrastPressable,
        generateContrastReport,
    };

    return (
        <HighContrastMotionContext.Provider value={contextValue}>
            {children}
        </HighContrastMotionContext.Provider>
    );
};

// Hook to use high contrast and motion context
export const useHighContrastMotion = (): HighContrastMotionContextType => {
    const context = useContext(HighContrastMotionContext);
    if (context === undefined) {
        throw new Error('useHighContrastMotion must be used within a HighContrastMotionProvider');
    }
    return context;
};

// High contrast text component
interface HighContrastTextProps {
    children: ReactNode;
    style?: any;
    variant?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
    size?: 'small' | 'medium' | 'large' | 'xLarge';
}

export const HighContrastText: React.FC<HighContrastTextProps> = ({
    children,
    style,
    variant = 'primary',
    size = 'medium',
}) => {
    const { getAccessibleTextStyle, theme } = useHighContrastMotion();

    const variantColors = {
        primary: theme.colors.text.primary,
        secondary: theme.colors.text.secondary,
        error: theme.colors.error,
        warning: theme.colors.warning,
        success: theme.colors.success,
        info: theme.colors.info,
    };

    const sizeStyles = {
        small: { fontSize: theme.typography.fontSize.small },
        medium: { fontSize: theme.typography.fontSize.medium },
        large: { fontSize: theme.typography.fontSize.large },
        xLarge: { fontSize: theme.typography.fontSize.xLarge },
    };

    const accessibleStyle = getAccessibleTextStyle({
        color: variantColors[variant],
        ...sizeStyles[size],
        ...style,
    });

    return (
        <Text style={accessibleStyle}>
            {children}
        </Text>
    );
};

// High contrast button component
interface HighContrastButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'error' | 'warning' | 'success' | 'info';
    disabled?: boolean;
    style?: any;
}

export const HighContrastButton: React.FC<HighContrastButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    disabled = false,
    style,
}) => {
    const { createHighContrastPressable, getAccessibleTextStyle, theme } = useHighContrastMotion();
    const { provideFeedback } = useMultiModal();

    const Pressable = createHighContrastPressable(View);

    const variantStyles = {
        primary: {
            backgroundColor: theme.colors.primary,
            color: theme.colors.background,
        },
        secondary: {
            backgroundColor: theme.colors.secondary,
            color: theme.colors.background,
        },
        error: {
            backgroundColor: theme.colors.error,
            color: theme.colors.background,
        },
        warning: {
            backgroundColor: theme.colors.warning,
            color: theme.colors.background,
        },
        success: {
            backgroundColor: theme.colors.success,
            color: theme.colors.background,
        },
        info: {
            backgroundColor: theme.colors.info,
            color: theme.colors.background,
        },
    };

    const handlePress = () => {
        if (!disabled) {
            provideFeedback('info', 'light');
            onPress();
        }
    };

    return (
        <Pressable
            onPress={handlePress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={title}
            accessibilityState={{ disabled }}
            style={[
                {
                    padding: theme.spacing.normal,
                    borderRadius: theme.borders.radius,
                    borderWidth: theme.borders.width,
                    borderColor: theme.colors.border,
                    opacity: disabled ? 0.5 : 1,
                    backgroundColor: disabled ? theme.colors.surface : variantStyles[variant].backgroundColor,
                },
                style,
            ]}
        >
            <HighContrastText
                variant="primary"
                style={{
                    color: disabled ? theme.colors.text.disabled : variantStyles[variant].color,
                    textAlign: 'center',
                    fontWeight: 'bold',
                }}
            >
                {title}
            </HighContrastText>
        </Pressable>
    );
};

// Reduced motion wrapper component
interface ReducedMotionWrapperProps {
    children: ReactNode;
    animationType?: string;
    fallback?: ReactNode;
}

export const ReducedMotionWrapper: React.FC<ReducedMotionWrapperProps> = ({
    children,
    animationType = 'default',
    fallback,
}) => {
    const { shouldAnimate } = useHighContrastMotion();

    if (!shouldAnimate(animationType)) {
        return <>{fallback || children}</>;
    }

    return <>{children}</>;
};

// Animated component with reduced motion support
interface AccessibleAnimatedViewProps {
    children: ReactNode;
    animationConfig: AnimationConfig;
    style?: any;
}

export const AccessibleAnimatedView: React.FC<AccessibleAnimatedViewProps> = ({
    children,
    animationConfig,
    style,
}) => {
    const { getAnimationConfig, shouldAnimate } = useHighContrastMotion();

    const config = getAnimationConfig(animationConfig.duration, animationConfig.easing);

    if (config.skipAnimation || !shouldAnimate('default')) {
        return (
            <View style={style}>
                {children}
            </View>
        );
    }

    return (
        <Animated.View
            style={style}
            useNativeDriver={config.useNativeDriver}
        >
            {children}
        </Animated.View>
    );
};

// High contrast status indicator
interface HighContrastStatusProps {
    visible: boolean;
}

export const HighContrastStatus: React.FC<HighContrastStatusProps> = ({
    visible,
}) => {
    const { state, generateContrastReport } = useHighContrastMotion();

    if (!visible) return null;

    const report = generateContrastReport();

    return (
        <View style={styles.statusContainer}>
            <HighContrastText variant="primary" style={styles.statusTitle}>
                Accessibility Status
            </HighContrastText>
            <HighContrastText variant="secondary" style={styles.statusItem}>
                High Contrast: {state.isHighContrastEnabled ? 'Enabled' : 'Disabled'}
            </HighContrastText>
            <HighContrastText variant="secondary" style={styles.statusItem}>
                Reduced Motion: {state.isReducedMotionEnabled ? 'Enabled' : 'Disabled'}
            </HighContrastText>
            <HighContrastText variant="secondary" style={styles.statusItem}>
                Current Theme: {state.currentTheme}
            </HighContrastText>
            <HighContrastText variant="secondary" style={styles.statusItem}>
                Contrast Ratio: {report.currentRatio.toFixed(2)}:1
            </HighContrastText>
            <HighContrastText variant="secondary" style={styles.statusItem}>
                Compliance: {report.compliance}
            </HighContrastText>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    statusContainer: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: '#ffffff',
        zIndex: 1000,
    },
    statusTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#ffffff',
    },
    statusItem: {
        fontSize: 12,
        marginBottom: 2,
        color: '#ffffff',
    },
});

export default HighContrastMotionProvider;