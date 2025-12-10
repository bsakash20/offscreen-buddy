/**
 * Mobile-First Design System - Color Tokens
 * Comprehensive color system with light/dark mode support optimized for mobile
 */

export interface ColorScale {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
}

export interface SemanticColors {
    success: {
        light: string;
        main: string;
        dark: string;
        background: string;
    };
    warning: {
        light: string;
        main: string;
        dark: string;
        background: string;
    };
    error: {
        light: string;
        main: string;
        dark: string;
        background: string;
    };
    info: {
        light: string;
        main: string;
        dark: string;
        background: string;
    };
}

export interface SystemColors {
    background: {
        primary: string;
        secondary: string;
        tertiary: string;
        surface: string;
        overlay: string;
        input: string;
    };
    text: {
        primary: string;
        secondary: string;
        tertiary: string;
        inverse: string;
        disabled: string;
    };
    border: {
        light: string;
        main: string;
        dark: string;
    };
    shadow: {
        small: string;
        medium: string;
        large: string;
    };
    glass: {
        background: string;
        border: string;
        shadow: string;
    };
}

export interface BrandColors {
    primary: ColorScale;
    accent: ColorScale;
    neutral: ColorScale;
}

export interface PremiumColors {
    gold: {
        light: string;
        main: string;
        dark: string;
        gradientStart: string;
        gradientEnd: string;
    };
    platinum: {
        light: string;
        main: string;
        dark: string;
        gradientStart: string;
        gradientEnd: string;
    };
}

export interface ColorTokens {
    brand: BrandColors;
    premium?: PremiumColors;
    semantic: SemanticColors;
    system: SystemColors;
    mode: {
        light: ColorTokens;
        dark: ColorTokens;
    };
    contrast: {
        high: string;
        medium: string;
        low: string;
    };
}

// Light theme color tokens
const lightThemeColors: ColorTokens = {
    brand: {
        primary: {
            50: '#EFF6FF',
            100: '#DBEAFE',
            200: '#BFDBFE',
            300: '#93C5FD',
            400: '#60A5FA',
            500: '#3A7BDB',
            600: '#2563EB',
            700: '#1D4ED8',
            800: '#1E40AF',
            900: '#1E3A8A',
        },
        accent: {
            50: '#FFF7ED',
            100: '#FFEDD5',
            200: '#FED7AA',
            300: '#FDBA74',
            400: '#FB923C',
            500: '#FFB347',
            600: '#EA580C',
            700: '#C2410C',
            800: '#9A3412',
            900: '#7C2D12',
        },
        neutral: {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#E5E5E5',
            300: '#D4D4D4',
            400: '#A3A3A3',
            500: '#737373',
            600: '#525252',
            700: '#404040',
            800: '#262626',
            900: '#171717',
        },
    },
    semantic: {
        success: {
            light: '#DCFCE7',
            main: '#16A34A',
            dark: '#15803D',
            background: '#F0FDF4',
        },
        warning: {
            light: '#FEF3C7',
            main: '#D97706',
            dark: '#B45309',
            background: '#FFFBEB',
        },
        error: {
            light: '#FEE2E2',
            main: '#DC2626',
            dark: '#B91C1C',
            background: '#FEF2F2',
        },
        info: {
            light: '#DBEAFE',
            main: '#2563EB',
            dark: '#1D4ED8',
            background: '#EFF6FF',
        },
    },
    system: {
        background: {
            primary: '#FFFFFF',
            secondary: '#F8FAFC',
            tertiary: '#F1F5F9',
            surface: '#FFFFFF',
            overlay: 'rgba(0, 0, 0, 0.5)',
            input: '#F1F5F9',
        },
        text: {
            primary: '#0F172A',
            secondary: '#475569',
            tertiary: '#64748B',
            inverse: '#FFFFFF',
            disabled: '#94A3B8',
        },
        border: {
            light: '#E2E8F0',
            main: '#CBD5E1',
            dark: '#94A3B8',
        },
        shadow: {
            small: 'rgba(0, 0, 0, 0.05)',
            medium: 'rgba(0, 0, 0, 0.1)',
            large: 'rgba(0, 0, 0, 0.15)',
        },
        glass: {
            background: 'rgba(255, 255, 255, 0.8)',
            border: 'rgba(255, 255, 255, 0.2)',
            shadow: 'rgba(0, 0, 0, 0.1)',
        },
    },
    mode: {
        light: {} as ColorTokens,
        dark: {} as ColorTokens,
    },
    contrast: {
        high: '#000000',
        medium: '#404040',
        low: '#737373',
    },
};

// Dark theme color tokens (extending existing colors)
const darkThemeColors: ColorTokens = {
    brand: {
        primary: {
            50: '#F0F9FF',
            100: '#E0F2FE',
            200: '#BAE6FD',
            300: '#7DD3FC',
            400: '#38BDF8',
            500: '#0EA5E9',
            600: '#0284C7',
            700: '#0369A1',
            800: '#075985',
            900: '#0C4A6E',
        },
        accent: {
            50: '#FFF7ED',
            100: '#FFEDD5',
            200: '#FED7AA',
            300: '#FDBA74',
            400: '#FB923C',
            500: '#F97316',
            600: '#EA580C',
            700: '#C2410C',
            800: '#9A3412',
            900: '#7C2D12',
        },
        neutral: {
            50: '#FAFAFA',
            100: '#F5F5F5',
            200: '#E5E5E5',
            300: '#D4D4D4',
            400: '#A3A3A3',
            500: '#737373',
            600: '#525252',
            700: '#404040',
            800: '#262626',
            900: '#171717',
        },
    },
    premium: {
        gold: {
            light: '#FDE047',
            main: '#EAB308',
            dark: '#A16207',
            gradientStart: '#FDE68A',
            gradientEnd: '#B45309',
        },
        platinum: {
            light: '#F8FAFC',
            main: '#E2E8F0',
            dark: '#94A3B8',
            gradientStart: '#F1F5F9',
            gradientEnd: '#CBD5E1',
        },
    },
    semantic: {
        success: {
            light: '#166534',
            main: '#22C55E',
            dark: '#4ADE80',
            background: 'rgba(34, 197, 94, 0.1)',
        },
        warning: {
            light: '#92400E',
            main: '#F59E0B',
            dark: '#FBBF24',
            background: 'rgba(245, 158, 11, 0.1)',
        },
        error: {
            light: '#991B1B',
            main: '#EF4444',
            dark: '#F87171',
            background: 'rgba(239, 68, 68, 0.1)',
        },
        info: {
            light: '#1E3A8A',
            main: '#3B82F6',
            dark: '#60A5FA',
            background: 'rgba(59, 130, 246, 0.1)',
        },
    },
    system: {
        background: {
            primary: '#0B0F19', // Deep luxurious midnight blue
            secondary: '#111827',
            tertiary: '#1F2937',
            surface: '#1E293B',
            overlay: 'rgba(0, 0, 0, 0.75)',
            input: 'rgba(255, 255, 255, 0.05)',
        },
        text: {
            primary: '#F8FAFC',
            secondary: '#CBD5E1',
            tertiary: '#94A3B8',
            inverse: '#0F172A',
            disabled: '#475569',
        },
        border: {
            light: 'rgba(255, 255, 255, 0.1)',
            main: 'rgba(255, 255, 255, 0.15)',
            dark: 'rgba(255, 255, 255, 0.25)',
        },
        shadow: {
            small: 'rgba(0, 0, 0, 0.3)',
            medium: 'rgba(0, 0, 0, 0.5)',
            large: 'rgba(0, 0, 0, 0.8)',
        },
        glass: {
            background: 'rgba(30, 41, 59, 0.7)',
            border: 'rgba(255, 255, 255, 0.08)',
            shadow: 'rgba(0, 0, 0, 0.4)',
        },
    },
    mode: {
        light: lightThemeColors,
        dark: {} as ColorTokens,
    },
    contrast: {
        high: '#FFFFFF',
        medium: '#B8C5D0',
        low: '#656D76',
    },
};

// Link the mode references
lightThemeColors.mode.dark = darkThemeColors;
darkThemeColors.mode.light = lightThemeColors;

export const colorTokens = {
    light: lightThemeColors,
    dark: darkThemeColors,
};

export type ThemeMode = 'light' | 'dark';
export type ColorScaleKey = keyof ColorScale;
export type BrandColor = keyof BrandColors;