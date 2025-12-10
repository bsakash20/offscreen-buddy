/**
 * Theme Provider for iOS Error UI Library
 * Provides consistent theming and branding across all error components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
    StyleSheet,
    Appearance,
    ColorSchemeName,
    StatusBar,
} from 'react-native';
import { ErrorTheme, ErrorThemeColors, ErrorThemeDarkMode } from '../_types/ErrorUITypes';

// Default theme colors following iOS Human Interface Guidelines
const DEFAULT_COLORS: ErrorThemeColors = {
    error: {
        primary: '#FF3B30',      // iOS Red
        secondary: '#FF2D55',    // Apple System Red 2
        background: '#FFF5F5',   // Light red background
        text: '#8E1B1B',         // Dark red text
        border: '#FFB3B3',       // Light red border
        success: '#34C759',      // iOS Green
        warning: '#FF9500',      // iOS Orange
        info: '#007AFF',         // iOS Blue
    },
    severity: {
        low: '#34C759',          // Success green
        medium: '#FF9500',       // Warning orange
        high: '#FF3B30',         // Error red
        critical: '#8E1B1B',     // Dark red
    },
    ui: {
        background: '#FFFFFF',   // Pure white
        surface: '#F2F2F7',      // iOS Secondary Background
        overlay: 'rgba(0, 0, 0, 0.5)', // Semi-transparent overlay
        border: '#D1D1D6',       // iOS Separator
        shadow: 'rgba(0, 0, 0, 0.1)',
        text: {
            primary: '#000000',    // Label
            secondary: '#3C3C43',  // Secondary Label
            disabled: '#8E8E93',   // Tertiary Label
        },
    },
};

// Dark mode theme colors
const DARK_COLORS: ErrorThemeColors = {
    error: {
        primary: '#FF453A',      // iOS Red (dark mode)
        secondary: '#FF6B6B',    // Lighter red
        background: '#2C1A1A',   // Dark red background
        text: '#FFB3B3',         // Light red text
        border: '#4A4A4A',       // Dark border
        success: '#30D158',      // iOS Green (dark mode)
        warning: '#FF9F0A',      // iOS Orange (dark mode)
        info: '#0A84FF',         // iOS Blue (dark mode)
    },
    severity: {
        low: '#30D158',          // Success green
        medium: '#FF9F0A',       // Warning orange
        high: '#FF453A',         // Error red
        critical: '#FFB3B3',     // Light red
    },
    ui: {
        background: '#000000',   // Pure black
        surface: '#1C1C1E',      // Secondary Background (dark)
        overlay: 'rgba(0, 0, 0, 0.8)', // Dark overlay
        border: '#545458',       // Separator (dark)
        shadow: 'rgba(255, 255, 255, 0.1)',
        text: {
            primary: '#FFFFFF',    // Label
            secondary: '#EBEBF5',  // Secondary Label (dark)
            disabled: '#8E8E93',   // Tertiary Label
        },
    },
};

// Typography definitions
const DEFAULT_TYPOGRAPHY = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    sizes: {
        xs: 11,
        sm: 13,
        md: 15,
        lg: 17,
        xl: 20,
        xxl: 24,
    },
    weights: {
        regular: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
    },
    lineHeights: {
        tight: 1.2,
        normal: 1.4,
        relaxed: 1.6,
    },
};

// Spacing definitions
const DEFAULT_SPACING = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    component: {
        padding: 16,
        margin: 8,
        borderRadius: 8,
    },
};

// Border definitions
const DEFAULT_BORDERS = {
    radius: {
        sm: 4,
        md: 8,
        lg: 12,
        xl: 16,
    },
    width: {
        thin: 1,
        normal: 2,
        thick: 4,
    },
};

// Shadow definitions
const DEFAULT_SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    medium: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    large: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
};

// Animation definitions
const DEFAULT_ANIMATIONS = {
    duration: {
        fast: 200,
        normal: 300,
        slow: 500,
    },
    easing: {
        entrance: 'ease-out',
        exit: 'ease-in',
        interaction: 'ease-in-out',
    },
};

// iOS-specific theme additions
const IOS_THEME = {
    hapticFeedback: {
        success: 'notificationSuccess',
        warning: 'notificationWarning',
        error: 'notificationError',
        light: 'impactLight',
        medium: 'impactMedium',
        heavy: 'impactHeavy',
    },
    blurEffects: {
        regular: 'regular',
        prominent: 'prominent',
        ultraThin: 'ultraThin',
    },
    cornerRadius: {
        small: 6,
        medium: 8,
        large: 12,
    },
};

// Dark mode configuration
const DARK_MODE_CONFIG: ErrorThemeDarkMode = {
    isEnabled: true,
    autoAdapt: true,
    overrideColors: {},
};

interface ThemeContextType {
    theme: ErrorTheme;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    setDarkMode: (enabled: boolean) => void;
    getColor: (path: string) => string;
    getTypography: (variant: string) => any;
    getSpacing: (size: string) => number;
    getStyles: (component: string, variant?: string) => any;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface Props {
    children: ReactNode;
    theme?: Partial<ErrorTheme>;
    darkMode?: boolean;
    enableAutoDarkMode?: boolean;
    customBranding?: {
        primaryColor?: string;
        secondaryColor?: string;
        logo?: string;
        companyName?: string;
    };
}

interface ThemeProviderState {
    theme: ErrorTheme;
    isDarkMode: boolean;
}

const ThemeProvider: React.FC<Props> = ({
    children,
    theme = {},
    darkMode,
    enableAutoDarkMode = true,
    customBranding = {},
}) => {
    const [state, setState] = useState<ThemeProviderState>({
        theme: createTheme(theme, darkMode),
        isDarkMode: darkMode !== undefined ? darkMode : false,
    });

    useEffect(() => {
        if (enableAutoDarkMode && darkMode === undefined) {
            // Listen for system theme changes
            const subscription = Appearance.addChangeListener(({ colorScheme }) => {
                setState(prev => ({
                    ...prev,
                    isDarkMode: colorScheme === 'dark',
                    theme: createTheme(theme, colorScheme === 'dark'),
                }));
            });

            return () => {
                if (subscription && typeof subscription.remove === 'function') {
                    subscription.remove();
                }
            };
        }
    }, [theme, darkMode, enableAutoDarkMode]);

    const toggleDarkMode = () => {
        setState(prev => ({
            ...prev,
            isDarkMode: !prev.isDarkMode,
            theme: createTheme(theme, !prev.isDarkMode),
        }));
    };

    const setDarkMode = (enabled: boolean) => {
        setState(prev => ({
            ...prev,
            isDarkMode: enabled,
            theme: createTheme(theme, enabled),
        }));
    };

    const getColor = (path: string): string => {
        const keys = path.split('.');
        let value: any = state.theme.colors;

        for (const key of keys) {
            value = value?.[key];
        }

        return value || '#000000';
    };

    const getTypography = (variant: string) => {
        const typography = state.theme.typography;
        const variants = {
            title: {
                fontSize: typography.sizes.xl,
                fontWeight: typography.weights.bold,
                lineHeight: typography.lineHeights.tight,
            },
            subtitle: {
                fontSize: typography.sizes.lg,
                fontWeight: typography.weights.semibold,
                lineHeight: typography.lineHeights.normal,
            },
            body: {
                fontSize: typography.sizes.md,
                fontWeight: typography.weights.regular,
                lineHeight: typography.lineHeights.relaxed,
            },
            caption: {
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.regular,
                lineHeight: typography.lineHeights.normal,
            },
        };

        return variants[variant as keyof typeof variants] || variants.body;
    };

    const getSpacing = (size: string): number => {
        const spacing = state.theme.spacing;
        const value = spacing[size as keyof typeof spacing];
        if (typeof value === 'number') {
            return value;
        }
        return spacing.md;
    };

    const getStyles = (component: string, variant?: string): any => {
        const styles = {
            // Toast styles
            toast: {
                container: {
                    backgroundColor: state.theme.colors.ui.surface,
                    borderRadius: state.theme.spacing.component.borderRadius,
                    padding: state.theme.spacing.md,
                    margin: state.theme.spacing.sm,
                    ...state.theme.shadows.medium,
                },
                error: {
                    borderLeftColor: state.theme.colors.error.primary,
                    backgroundColor: state.theme.colors.error.background,
                },
                warning: {
                    borderLeftColor: state.theme.colors.error.warning,
                    backgroundColor: '#FFF8E6',
                },
                success: {
                    borderLeftColor: state.theme.colors.error.success,
                    backgroundColor: '#F0FFF4',
                },
                info: {
                    borderLeftColor: state.theme.colors.error.info,
                    backgroundColor: '#F0F8FF',
                },
            },

            // Alert styles
            alert: {
                container: {
                    backgroundColor: state.theme.colors.ui.surface,
                    borderRadius: state.theme.spacing.component.borderRadius,
                    ...state.theme.shadows.large,
                },
                critical: {
                    borderLeftColor: state.theme.colors.error.primary,
                },
                warning: {
                    borderLeftColor: state.theme.colors.error.warning,
                },
                confirmation: {
                    borderLeftColor: state.theme.colors.error.info,
                },
            },

            // Error screen styles
            errorScreen: {
                container: {
                    flex: 1,
                    backgroundColor: state.theme.colors.ui.background,
                    paddingHorizontal: state.theme.spacing.lg,
                },
                title: {
                    color: state.theme.colors.error.text,
                    fontSize: state.theme.typography.sizes.xxl,
                    fontWeight: state.theme.typography.weights.bold,
                    textAlign: 'center',
                    marginBottom: state.theme.spacing.md,
                },
                message: {
                    color: state.theme.colors.ui.text.primary,
                    fontSize: state.theme.typography.sizes.md,
                    lineHeight: state.theme.typography.lineHeights.relaxed,
                    textAlign: 'center',
                },
            },

            // Inline error styles
            inlineError: {
                container: {
                    borderRadius: state.theme.spacing.component.borderRadius,
                    padding: state.theme.spacing.sm,
                    marginVertical: 2,
                },
                text: {
                    color: state.theme.colors.error.primary,
                    fontSize: state.theme.typography.sizes.sm,
                    fontWeight: state.theme.typography.weights.medium,
                },
                field: {
                    backgroundColor: state.theme.colors.error.background,
                    borderColor: state.theme.colors.error.border,
                    borderWidth: 1,
                },
            },
        };

        return styles[component as keyof typeof styles]?.[variant || 'default'] || {};
    };

    const contextValue: ThemeContextType = {
        theme: state.theme,
        isDarkMode: state.isDarkMode,
        toggleDarkMode,
        setDarkMode,
        getColor,
        getTypography,
        getSpacing,
        getStyles,
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            <StatusBar
                barStyle={state.isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={state.theme.colors.ui.background}
            />
            {children}
        </ThemeContext.Provider>
    );
};

// Theme creation helper
function createTheme(override: Partial<ErrorTheme>, darkMode?: boolean): ErrorTheme {
    const colors = darkMode ? { ...DARK_COLORS, ...override.colors } : { ...DEFAULT_COLORS, ...override.colors };

    // Apply custom branding
    if (override.colors?.error?.primary && !darkMode) {
        colors.error.primary = override.colors.error.primary;
    }
    if (customBranding?.primaryColor) {
        colors.error.primary = customBranding.primaryColor;
    }
    if (customBranding?.secondaryColor) {
        colors.error.secondary = customBranding.secondaryColor;
    }

    return {
        colors,
        typography: { ...DEFAULT_TYPOGRAPHY, ...override.typography },
        spacing: { ...DEFAULT_SPACING, ...override.spacing },
        borders: { ...DEFAULT_BORDERS, ...override.borders },
        shadows: { ...DEFAULT_SHADOWS, ...override.shadows },
        animations: { ...DEFAULT_ANIMATIONS, ...override.animations },
        ios: { ...IOS_THEME, ...override.ios },
        darkMode: { ...DARK_MODE_CONFIG, ...override.darkMode, overrideColors: { ...DARK_MODE_CONFIG.overrideColors, ...override.darkMode?.overrideColors } },
    };
}

// Hook to use theme
export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// HOC to provide theme to components
export const withTheme = <P extends object>(
    WrappedComponent: React.ComponentType<P>,
    themeOptions?: {
        component?: string;
        variant?: string;
        customStyles?: any;
    }
) => {
    const EnhancedComponent = (props: P) => {
        const theme = useTheme();
        const styles = theme.getStyles(themeOptions?.component || 'default', themeOptions?.variant);

        const themedProps = {
            ...props,
            theme,
            styles: { ...styles, ...themeOptions?.customStyles },
        };

        return <WrappedComponent {...themedProps} />;
    };

    EnhancedComponent.displayName = `withTheme(${WrappedComponent.displayName || 'Component'})`;

    return EnhancedComponent;
};

// Predefined theme configurations
export const THEME_PRESETS = {
    // Default iOS theme
    DEFAULT: {},

    // Compact theme for small screens
    COMPACT: {
        typography: {
            sizes: {
                xs: 10,
                sm: 12,
                md: 14,
                lg: 16,
                xl: 18,
                xxl: 20,
            },
        },
        spacing: {
            xs: 2,
            sm: 4,
            md: 8,
            lg: 12,
            xl: 16,
            xxl: 24,
            component: {
                padding: 8,
                margin: 4,
                borderRadius: 6,
            },
        },
    },

    // Large text theme for accessibility
    ACCESSIBILITY: {
        typography: {
            sizes: {
                xs: 14,
                sm: 16,
                md: 18,
                lg: 20,
                xl: 24,
                xxl: 28,
            },
        },
        spacing: {
            xs: 8,
            sm: 12,
            md: 20,
            lg: 28,
            xl: 36,
            xxl: 48,
            component: {
                padding: 20,
                margin: 12,
                borderRadius: 12,
            },
        },
    },

    // Dark mode optimized
    DARK_MODE: {
        colors: DARK_COLORS,
    },

    // Custom branding
    CUSTOM: (branding: { primaryColor: string; secondaryColor?: string }) => ({
        colors: {
            error: {
                primary: branding.primaryColor,
                secondary: branding.secondaryColor || branding.primaryColor,
            },
        },
    }),
};

// Theme utilities
export const ThemeUtils = {
    // Generate consistent error styling based on severity
    getSeverityStyles: (severity: 'low' | 'medium' | 'high' | 'critical') => {
        const { theme } = useTheme();
        const colors = theme.colors.severity;

        return {
            backgroundColor: severity === 'low' ? '#F0FFF4' :
                severity === 'medium' ? '#FFF8E6' :
                    severity === 'high' ? '#FFF5F5' : '#2C1A1A',
            borderColor: colors[severity],
            color: colors[severity],
        };
    },

    // Generate consistent spacing
    getComponentSpacing: (component: 'toast' | 'alert' | 'errorScreen' | 'inlineError') => {
        const { theme } = useTheme();
        return {
            padding: theme.spacing.component.padding,
            margin: theme.spacing.component.margin,
            borderRadius: theme.spacing.component.borderRadius,
        };
    },

    // Generate consistent typography
    getComponentTypography: (component: 'title' | 'message' | 'action' | 'caption') => {
        const { theme } = useTheme();
        const typography = theme.typography;

        const typeMap = {
            title: {
                fontSize: typography.sizes.xl,
                fontWeight: typography.weights.bold,
            },
            message: {
                fontSize: typography.sizes.md,
                fontWeight: typography.weights.regular,
            },
            action: {
                fontSize: typography.sizes.md,
                fontWeight: typography.weights.semibold,
            },
            caption: {
                fontSize: typography.sizes.sm,
                fontWeight: typography.weights.regular,
            },
        };

        return typeMap[component];
    },
};

// Export utilities
export { createTheme };
export default ThemeProvider;