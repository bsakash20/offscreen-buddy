/**
 * Enhanced Breakpoint System
 * Advanced breakpoint management with dynamic calculations and device-specific adaptations
 */

import { Dimensions, PixelRatio } from 'react-native';
import { breakpointTokens, BreakpointKey } from '../../_design-system/tokens/breakpoints';
import DeviceDetector from '../../_services/responsive/DeviceDetector';

export interface BreakpointConfig {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
}

export interface ResponsiveValue<T> {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
}

export interface BreakpointInfo {
    current: BreakpointKey;
    width: number;
    height: number;
    isXs: boolean;
    isSm: boolean;
    isMd: boolean;
    isLg: boolean;
    isXl: boolean;
    is2xl: boolean;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
}

// Default breakpoint configuration
const defaultBreakpoints: BreakpointConfig = {
    xs: 0,
    sm: 375,
    md: 768,
    lg: 1024,
    xl: 1280,
    '2xl': 1536,
};

/**
 * Enhanced Breakpoint System
 */
export const BreakpointSystem = {
    /**
     * Get current breakpoint key
     */
    getCurrentBreakpoint(width?: number): BreakpointKey {
        const screenWidth = width ?? Dimensions.get('window').width;

        if (screenWidth >= defaultBreakpoints['2xl']) return '2xl';
        if (screenWidth >= defaultBreakpoints.xl) return 'xl';
        if (screenWidth >= defaultBreakpoints.lg) return 'lg';
        if (screenWidth >= defaultBreakpoints.md) return 'md';
        if (screenWidth >= defaultBreakpoints.sm) return 'sm';
        return 'xs';
    },

    /**
     * Get comprehensive breakpoint information
     */
    getBreakpointInfo(): BreakpointInfo {
        const { width, height } = Dimensions.get('window');
        const current = this.getCurrentBreakpoint(width);

        return {
            current,
            width,
            height,
            isXs: current === 'xs',
            isSm: current === 'sm',
            isMd: current === 'md',
            isLg: current === 'lg',
            isXl: current === 'xl',
            is2xl: current === '2xl',
            isMobile: width < defaultBreakpoints.md,
            isTablet: width >= defaultBreakpoints.md && width < defaultBreakpoints.lg,
            isDesktop: width >= defaultBreakpoints.lg,
        };
    },

    /**
     * Check if current width is at least the specified breakpoint
     */
    isAtLeast(breakpoint: BreakpointKey, width?: number): boolean {
        const screenWidth = width ?? Dimensions.get('window').width;
        return screenWidth >= defaultBreakpoints[breakpoint];
    },

    /**
     * Check if current width is at most the specified breakpoint
     */
    isAtMost(breakpoint: BreakpointKey, width?: number): boolean {
        const screenWidth = width ?? Dimensions.get('window').width;
        return screenWidth <= defaultBreakpoints[breakpoint];
    },

    /**
     * Check if current width is between two breakpoints
     */
    isBetween(minBreakpoint: BreakpointKey, maxBreakpoint: BreakpointKey, width?: number): boolean {
        const screenWidth = width ?? Dimensions.get('window').width;
        return (
            screenWidth >= defaultBreakpoints[minBreakpoint] &&
            screenWidth < defaultBreakpoints[maxBreakpoint]
        );
    },

    /**
     * Get responsive value based on current breakpoint
     */
    getResponsiveValue<T>(values: ResponsiveValue<T>, fallback: T, width?: number): T {
        const current = this.getCurrentBreakpoint(width);
        const breakpointOrder: BreakpointKey[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
        const currentIndex = breakpointOrder.indexOf(current);

        // Find the value for current breakpoint or the nearest smaller one
        for (let i = currentIndex; i >= 0; i--) {
            const bp = breakpointOrder[i];
            if (values[bp] !== undefined) {
                return values[bp] as T;
            }
        }

        return fallback;
    },

    /**
     * Create responsive value object with cascading values
     */
    createResponsiveValue<T>(values: Partial<ResponsiveValue<T>>): ResponsiveValue<T> {
        const breakpointOrder: BreakpointKey[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
        const result: ResponsiveValue<T> = {};
        let lastValue: T | undefined;

        for (const bp of breakpointOrder) {
            if (values[bp] !== undefined) {
                lastValue = values[bp];
            }
            if (lastValue !== undefined) {
                result[bp] = lastValue;
            }
        }

        return result;
    },

    /**
     * Get breakpoint value in pixels
     */
    getBreakpointValue(breakpoint: BreakpointKey): number {
        return defaultBreakpoints[breakpoint];
    },

    /**
     * Get all breakpoint values
     */
    getBreakpoints(): BreakpointConfig {
        return { ...defaultBreakpoints };
    },

    /**
     * Calculate responsive columns based on screen width
     */
    getResponsiveColumns(
        config: ResponsiveValue<number> = { xs: 1, sm: 2, md: 2, lg: 3, xl: 4, '2xl': 6 }
    ): number {
        return this.getResponsiveValue(config, 1);
    },

    /**
     * Calculate responsive gap/gutter based on screen width
     */
    getResponsiveGap(
        config: ResponsiveValue<number> = { xs: 8, sm: 12, md: 16, lg: 20, xl: 24, '2xl': 28 }
    ): number {
        return this.getResponsiveValue(config, 16);
    },

    /**
     * Calculate responsive padding based on screen width
     */
    getResponsivePadding(
        config: ResponsiveValue<number> = { xs: 12, sm: 16, md: 20, lg: 24, xl: 32, '2xl': 40 }
    ): number {
        return this.getResponsiveValue(config, 16);
    },

    /**
     * Calculate responsive font size based on screen width
     */
    getResponsiveFontSize(
        baseFontSize: number,
        config?: ResponsiveValue<number>
    ): number {
        if (config) {
            return this.getResponsiveValue(config, baseFontSize);
        }

        // Default responsive scaling
        const info = this.getBreakpointInfo();
        let scale = 1;

        if (info.isXs) scale = 0.9;
        else if (info.isSm) scale = 1;
        else if (info.isMd) scale = 1.05;
        else if (info.isLg) scale = 1.1;
        else if (info.isXl) scale = 1.15;
        else if (info.is2xl) scale = 1.2;

        return Math.round(baseFontSize * scale);
    },

    /**
     * Get container max width for current breakpoint
     */
    getContainerMaxWidth(): number | null {
        const info = this.getBreakpointInfo();

        if (info.isMobile) return null; // Full width on mobile
        if (info.isTablet) return 720;
        if (info.isLg) return 960;
        if (info.isXl) return 1140;
        return 1320;
    },

    /**
     * Calculate responsive spacing multiplier
     */
    getSpacingMultiplier(): number {
        const info = this.getBreakpointInfo();

        if (info.isXs) return 0.75;
        if (info.isSm) return 1;
        if (info.isMd) return 1.25;
        if (info.isLg) return 1.5;
        if (info.isXl) return 1.75;
        return 2;
    },

    /**
     * Get responsive border radius
     */
    getResponsiveBorderRadius(baseBorderRadius: number): number {
        const multiplier = this.getSpacingMultiplier();
        return Math.round(baseBorderRadius * Math.sqrt(multiplier));
    },

    /**
     * Check if should use compact layout
     */
    shouldUseCompactLayout(): boolean {
        const info = this.getBreakpointInfo();
        return info.isXs || info.isSm;
    },

    /**
     * Check if should use spacious layout
     */
    shouldUseSpaciousLayout(): boolean {
        const info = this.getBreakpointInfo();
        return info.isLg || info.isXl || info.is2xl;
    },

    /**
     * Get optimal touch target size for current breakpoint
     */
    getOptimalTouchTargetSize(): number {
        const info = this.getBreakpointInfo();
        const pixelRatio = PixelRatio.get();

        // Base touch target: 44px (iOS HIG)
        let baseSize = 44;

        if (info.isTablet || info.isDesktop) {
            baseSize = 48; // Larger on tablets/desktop
        }

        // Adjust for pixel density
        if (pixelRatio >= 3) {
            baseSize = Math.round(baseSize * 1.1);
        }

        return baseSize;
    },

    /**
     * Create media query-like function
     */
    mediaQuery(breakpoint: BreakpointKey): boolean {
        return this.isAtLeast(breakpoint);
    },

    /**
     * Create range-based media query
     */
    mediaQueryRange(minBreakpoint: BreakpointKey, maxBreakpoint?: BreakpointKey): boolean {
        if (maxBreakpoint) {
            return this.isBetween(minBreakpoint, maxBreakpoint);
        }
        return this.isAtLeast(minBreakpoint);
    },

    /**
     * Get responsive style object
     */
    getResponsiveStyles<T extends Record<string, any>>(
        styles: ResponsiveValue<T>,
        defaultStyles: T
    ): T {
        return this.getResponsiveValue(styles, defaultStyles);
    },
};

/**
 * Utility function to create responsive values
 */
export function responsive<T>(values: ResponsiveValue<T>, fallback: T): T {
    return BreakpointSystem.getResponsiveValue(values, fallback);
}

/**
 * Utility function to check breakpoint
 */
export function atLeast(breakpoint: BreakpointKey): boolean {
    return BreakpointSystem.isAtLeast(breakpoint);
}

/**
 * Utility function to check breakpoint
 */
export function atMost(breakpoint: BreakpointKey): boolean {
    return BreakpointSystem.isAtMost(breakpoint);
}

/**
 * Utility function to check breakpoint range
 */
export function between(min: BreakpointKey, max: BreakpointKey): boolean {
    return BreakpointSystem.isBetween(min, max);
}

export default BreakpointSystem;