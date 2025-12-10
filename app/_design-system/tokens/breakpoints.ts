/**
 * Mobile-First Design System - Breakpoints Tokens
 * Mobile-first responsive design breakpoints optimized for React Native
 */

import { Dimensions, ScaledSize } from 'react-native';

export interface BreakpointScale {
    xs: number;   // Extra small (small phones)
    sm: number;   // Small (large phones)
    md: number;   // Medium (small tablets)
    lg: number;   // Large (tablets)
    xl: number;   // Extra large (large tablets/small desktop)
    '2xl': number; // 2X large (desktop)
}

// Mobile-first breakpoint values (in points/pixels)
const mobileBreakpoints: BreakpointScale = {
    xs: 0,      // Small phones and up
    sm: 375,    // Large phones and up
    md: 768,    // Small tablets and up
    lg: 1024,   // Large tablets and up
    xl: 1280,   // Extra large screens
    '2xl': 1536, // Very large screens
};

export interface ResponsiveHooks {
    // Window dimensions
    window: ScaledSize;
    screen: ScaledSize;

    // Breakpoint utilities
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLargeDesktop: boolean;

    // Device type
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'large-desktop';

    // Orientation
    isPortrait: boolean;
    isLandscape: boolean;

    // Current breakpoint
    currentBreakpoint: keyof BreakpointScale;

    // Responsive values
    getBreakpoint: () => keyof BreakpointScale;
    getWidth: () => number;
    getHeight: () => number;
    isWidthAtLeast: (breakpoint: keyof BreakpointScale) => boolean;
    isWidthAtMost: (breakpoint: keyof BreakpointScale) => boolean;
    isHeightAtLeast: (breakpoint: keyof BreakpointScale) => boolean;
    isHeightAtMost: (breakpoint: keyof BreakpointScale) => boolean;
}

export interface BreakpointTokens {
    scale: BreakpointScale;
    // Responsive utility functions
    utils: {
        getCurrentBreakpoint: (width: number) => keyof BreakpointScale;
        isMobile: (width: number) => boolean;
        isTablet: (width: number) => boolean;
        isDesktop: (width: number) => boolean;
        isWidthAtLeast: (width: number, breakpoint: keyof BreakpointScale) => boolean;
        isWidthAtMost: (width: number, breakpoint: keyof BreakpointScale) => boolean;
        getResponsiveValue: <T>(
            value: Record<keyof BreakpointScale, T> | T,
            width: number
        ) => T;
    };
    // Screen size categories
    categories: {
        smallPhones: { min: number; max: number };
        largePhones: { min: number; max: number };
        tablets: { min: number; max: number };
        desktop: { min: number; max: number };
        largeDesktop: { min: number; max: number };
    };
}

export const breakpointTokens: BreakpointTokens = {
    scale: mobileBreakpoints,

    utils: {
        getCurrentBreakpoint: (width: number): keyof BreakpointScale => {
            if (width >= mobileBreakpoints['2xl']) return '2xl';
            if (width >= mobileBreakpoints.xl) return 'xl';
            if (width >= mobileBreakpoints.lg) return 'lg';
            if (width >= mobileBreakpoints.md) return 'md';
            if (width >= mobileBreakpoints.sm) return 'sm';
            return 'xs';
        },

        isMobile: (width: number): boolean => {
            return width < mobileBreakpoints.md;
        },

        isTablet: (width: number): boolean => {
            return width >= mobileBreakpoints.md && width < mobileBreakpoints.lg;
        },

        isDesktop: (width: number): boolean => {
            return width >= mobileBreakpoints.lg;
        },

        isWidthAtLeast: (width: number, breakpoint: keyof BreakpointScale): boolean => {
            return width >= mobileBreakpoints[breakpoint];
        },

        isWidthAtMost: (width: number, breakpoint: keyof BreakpointScale): boolean => {
            return width <= mobileBreakpoints[breakpoint];
        },

        getResponsiveValue: <T>(
            value: Record<keyof BreakpointScale, T> | T,
            width: number
        ): T => {
            if (typeof value !== 'object' || value === null) {
                return value as T; // Return static value
            }

            const currentBreakpoint = breakpointTokens.utils.getCurrentBreakpoint(width);
            const typedValue = value as Record<keyof BreakpointScale, T>;
            return typedValue[currentBreakpoint];
        },
    },

    categories: {
        smallPhones: {
            min: mobileBreakpoints.xs,
            max: mobileBreakpoints.sm - 1,
        },
        largePhones: {
            min: mobileBreakpoints.sm,
            max: mobileBreakpoints.md - 1,
        },
        tablets: {
            min: mobileBreakpoints.md,
            max: mobileBreakpoints.lg - 1,
        },
        desktop: {
            min: mobileBreakpoints.lg,
            max: mobileBreakpoints.xl - 1,
        },
        largeDesktop: {
            min: mobileBreakpoints.xl,
            max: Infinity,
        },
    },
};

// Device detection utilities
export const deviceDetection = {
    // Get device type based on screen width
    getDeviceType: (width: number): 'mobile' | 'tablet' | 'desktop' | 'large-desktop' => {
        if (width < mobileBreakpoints.md) return 'mobile';
        if (width < mobileBreakpoints.lg) return 'tablet';
        if (width < mobileBreakpoints.xl) return 'desktop';
        return 'large-desktop';
    },

    // Check if device has notch (iPhone X and newer)
    hasNotch: (): boolean => {
        const { width, height } = Dimensions.get('window');
        return (
            // iPhone with notch
            (width >= 375 && width <= 428 && height >= 812 && height <= 932) ||
            // iPad with home button
            (width >= 768 && width <= 1024 && height >= 1024)
        );
    },

    // Check if device is in landscape orientation
    isLandscape: (): boolean => {
        const { width, height } = Dimensions.get('window');
        return width > height;
    },

    // Get safe area insets for devices with notches
    getSafeAreaInsets: () => {
        // In a real implementation, you'd use react-native-safe-area-context
        // For now, return safe defaults
        return {
            top: deviceDetection.hasNotch() ? 44 : 20,
            bottom: deviceDetection.hasNotch() ? 34 : 0,
            left: 0,
            right: 0,
        };
    },
};

// Responsive design utilities
export const responsiveDesign = {
    // Create responsive value based on breakpoints
    createResponsiveValue: <T>(values: Partial<Record<keyof BreakpointScale, T>>): Record<keyof BreakpointScale, T> => {
        // Fill in missing values with the nearest smaller breakpoint
        const filledValues = { ...values } as Record<keyof BreakpointScale, T>;

        const breakpoints: (keyof BreakpointScale)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
        const defaultValue = (values as any)[breakpoints[0]] as T;

        for (let i = 1; i < breakpoints.length; i++) {
            const current = breakpoints[i];
            const previous = breakpoints[i - 1];

            if (filledValues[current] === undefined) {
                filledValues[current] = filledValues[previous] || defaultValue;
            }
        }

        // Ensure all breakpoints have values
        for (const breakpoint of breakpoints) {
            if (filledValues[breakpoint] === undefined) {
                filledValues[breakpoint] = defaultValue;
            }
        }

        return filledValues;
    },

    // Get responsive font size
    getResponsiveFontSize: (baseSize: number, isTablet: boolean = false): number => {
        if (isTablet) {
            return baseSize * 1.1; // Slightly larger on tablets
        }
        return baseSize;
    },

    // Get responsive spacing
    getResponsiveSpacing: (baseSpacing: number, isTablet: boolean = false, isLandscape: boolean = false): number => {
        if (isTablet) {
            return baseSpacing * 1.25;
        }
        if (isLandscape) {
            return baseSpacing * 1.1;
        }
        return baseSpacing;
    },
};

// Export types for use in components
export type BreakpointKey = keyof BreakpointScale;
export type DeviceType = 'mobile' | 'tablet' | 'desktop' | 'large-desktop';
export type Orientation = 'portrait' | 'landscape';

// Common responsive patterns
export const responsivePatterns = {
    // Column count based on screen size
    getColumnCount: (width: number): number => {
        if (width < mobileBreakpoints.sm) return 1;      // Mobile: 1 column
        if (width < mobileBreakpoints.md) return 2;      // Large phone: 2 columns
        if (width < mobileBreakpoints.lg) return 3;      // Small tablet: 3 columns
        if (width < mobileBreakpoints.xl) return 4;      // Large tablet: 4 columns
        return 6;                                         // Desktop: 6 columns
    },

    // Grid gap based on screen size
    getGridGap: (width: number): number => {
        if (width < mobileBreakpoints.sm) return 8;      // Mobile: 8px gap
        if (width < mobileBreakpoints.md) return 12;     // Large phone: 12px gap
        if (width < mobileBreakpoints.lg) return 16;     // Tablet: 16px gap
        return 20;                                       // Desktop: 20px gap
    },

    // Card spacing based on screen size
    getCardSpacing: (width: number): number => {
        if (width < mobileBreakpoints.sm) return 12;     // Mobile: tight spacing
        if (width < mobileBreakpoints.md) return 16;     // Large phone: comfortable
        if (width < mobileBreakpoints.lg) return 20;     // Tablet: roomy
        return 24;                                       // Desktop: spacious
    },
};