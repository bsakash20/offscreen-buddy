/**
 * Mobile-First Design System - Theme Configuration
 * Complete theme configuration combining all design tokens
 */

import { ColorTokens } from './colors';
import { TypographyTokens } from './typography';
import { SpacingTokens } from './spacing';
import { BreakpointTokens } from './breakpoints';

export interface ThemeConfig {
    colors: ColorTokens;
    typography: TypographyTokens;
    spacing: SpacingTokens;
    breakpoints: BreakpointTokens;
    // Animation and motion tokens
    animation: {
        duration: {
            fast: number;
            normal: number;
            slow: number;
        };
        easing: {
            easeOut: string;
            easeIn: string;
            easeInOut: string;
        };
    };
    // Gradients for premium effects
    gradients: {
        primary: [string, string];
        secondary: [string, string];
        gold: [string, string];
        glass: [string, string];
    };
    // Shadow tokens for elevation
    elevation: {
        small: {
            shadowColor: string;
            shadowOffset: { width: number; height: number };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
        medium: {
            shadowColor: string;
            shadowOffset: { width: number; height: number };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
        large: {
            shadowColor: string;
            shadowOffset: { width: number; height: number };
            shadowOpacity: number;
            shadowRadius: number;
            elevation: number;
        };
    };
    // Border radius tokens
    borderRadius: {
        small: number;
        medium: number;
        large: number;
        extraLarge: number;
        full: number;
    };
    // Opacity tokens
    opacity: {
        disabled: number;
        muted: number;
        faint: number;
    };
    // Z-index tokens for layering
    zIndex: {
        hide: number;
        auto: string;
        base: number;
        docked: number;
        dropdown: number;
        sticky: number;
        banner: number;
        overlay: number;
        modal: number;
        popover: number;
        skipLink: number;
        toast: number;
        tooltip: number;
    };
}

// Theme configuration with all tokens combined
export const createTheme = (mode: 'light' | 'dark'): ThemeConfig => {
    const isDark = mode === 'dark';

    return {
        colors: isDark ? colorTokens.dark : colorTokens.light,
        typography: typographyTokens,
        spacing: spacingTokens,
        breakpoints: breakpointTokens,

        // Animation tokens optimized for mobile
        animation: {
            duration: {
                fast: 150,    // Quick interactions
                normal: 250,  // Standard transitions
                slow: 350,    // Complex animations
            },
            easing: {
                easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
                easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
                easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            },
        },

        // Premium Gradients
        gradients: {
            primary: isDark ? ['#0284C7', '#0369A1'] : ['#38BDF8', '#0EA5E9'],
            secondary: isDark ? ['#475569', '#1e293b'] : ['#F8FAFC', '#E2E8F0'],
            gold: ['#FDE68A', '#B45309'],
            glass: isDark
                ? ['rgba(30, 41, 59, 0.8)', 'rgba(15, 23, 42, 0.6)']
                : ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.4)'],
        },

        // Elevation tokens for consistent shadows
        elevation: {
            small: {
                shadowColor: isDark ? '#000000' : '#000000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: isDark ? 0.25 : 0.05,
                shadowRadius: 2,
                elevation: 2,
            },
            medium: {
                shadowColor: isDark ? '#000000' : '#000000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.35 : 0.1,
                shadowRadius: 4,
                elevation: 4,
            },
            large: {
                shadowColor: isDark ? '#000000' : '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: isDark ? 0.5 : 0.15,
                shadowRadius: 8,
                elevation: 8,
            },
        },

        // Border radius tokens
        borderRadius: {
            small: 4,       // Small elements
            medium: 8,      // Cards, buttons
            large: 12,      // Large containers
            extraLarge: 16, // Modals, overlays
            full: 9999,     // Full circles
        },

        // Opacity tokens
        opacity: {
            disabled: 0.4,
            muted: 0.6,
            faint: 0.8,
        },

        // Z-index tokens for proper layering
        zIndex: {
            hide: -1,
            auto: 'auto',
            base: 0,
            docked: 10,
            dropdown: 1000,
            sticky: 1100,
            banner: 1200,
            overlay: 1300,
            modal: 1400,
            popover: 1500,
            skipLink: 1600,
            toast: 1700,
            tooltip: 1800,
        },
    };
};

// Theme variants
export const lightTheme = createTheme('light');
export const darkTheme = createTheme('dark');

// Theme store structure for state management
export interface ThemeState {
    mode: 'light' | 'dark' | 'system';
    currentTheme: ThemeConfig;
    isSystemThemeDark: boolean;
    toggleTheme: () => void;
    setTheme: (mode: 'light' | 'dark' | 'system') => void;
}

// Theme utilities
export const themeUtils = {
    // Get theme mode preference from system
    getSystemTheme: (): boolean => {
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false; // Default to light theme
    },

    // Get effective theme based on mode preference
    getEffectiveTheme: (mode: 'light' | 'dark' | 'system', systemIsDark: boolean): 'light' | 'dark' => {
        if (mode === 'system') {
            return systemIsDark ? 'dark' : 'light';
        }
        return mode;
    },

    // Create responsive theme variant
    createResponsiveTheme: (
        baseTheme: ThemeConfig,
        width: number,
        height: number
    ): ThemeConfig => {
        const isTablet = width >= breakpointTokens.scale.md;
        const isLandscape = width > height;

        return {
            ...baseTheme,
            spacing: {
                ...baseTheme.spacing,
                // Adjust spacing for larger screens
                scale: {
                    ...baseTheme.spacing.scale,
                    xs: isTablet ? 6 : baseTheme.spacing.scale.xs,
                    sm: isTablet ? 10 : baseTheme.spacing.scale.sm,
                    md: isTablet ? 20 : baseTheme.spacing.scale.md,
                    lg: isTablet ? 30 : baseTheme.spacing.scale.lg,
                    xl: isTablet ? 40 : baseTheme.spacing.scale.xl,
                },
            },
            typography: {
                ...baseTheme.typography,
                // Slightly larger text on tablets
                text: {
                    ...baseTheme.typography.text,
                    body: {
                        base: isTablet ? {
                            ...baseTheme.typography.text.body.base,
                            fontSize: baseTheme.typography.text.body.base.fontSize + 1,
                        } : baseTheme.typography.text.body.base,
                        sm: isTablet ? {
                            ...baseTheme.typography.text.body.sm,
                            fontSize: baseTheme.typography.text.body.sm.fontSize + 1,
                        } : baseTheme.typography.text.body.sm,
                        lg: isTablet ? {
                            ...baseTheme.typography.text.body.lg,
                            fontSize: baseTheme.typography.text.body.lg.fontSize + 1,
                        } : baseTheme.typography.text.body.lg,
                    },
                },
            },
        };
    },

    // Check if theme supports certain features
    supportsFeature: (theme: ThemeConfig, feature: 'glassmorphism' | 'gradients' | 'shadows'): boolean => {
        switch (feature) {
            case 'glassmorphism':
                return true; // Supported on all themes
            case 'gradients':
                return true; // Supported on all themes
            case 'shadows':
                return true; // Supported on all themes
            default:
                return false;
        }
    },
};

// Export theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

// Theme validation
export const validateTheme = (theme: ThemeConfig): boolean => {
    try {
        // Basic validation checks
        if (!theme.colors || !theme.typography || !theme.spacing) {
            console.error('Theme validation failed: missing core tokens');
            return false;
        }

        // Check for required color values
        if (!theme.colors.system || !theme.colors.brand) {
            console.error('Theme validation failed: missing color tokens');
            return false;
        }

        // Check spacing values are positive
        if (theme.spacing.scale.xs <= 0 || theme.spacing.scale.sm <= 0) {
            console.error('Theme validation failed: invalid spacing values');
            return false;
        }

        return true;
    } catch (error) {
        console.error('Theme validation error:', error);
        return false;
    }
};

// Import tokens for theme creation
import { colorTokens } from './colors';
import { typographyTokens } from './typography';
import { spacingTokens } from './spacing';
import { breakpointTokens } from './breakpoints';

// Update color tokens reference