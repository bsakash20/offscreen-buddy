/**
 * Mobile-First Design System - Responsive Utilities
 * Responsive design utilities for mobile-optimized layouts
 */

import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { breakpointTokens, BreakpointKey } from '../tokens/breakpoints';

export interface ResponsiveState {
    window: ScaledSize;
    screen: ScaledSize;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    currentBreakpoint: BreakpointKey;
    isPortrait: boolean;
    isLandscape: boolean;
}

// Get current screen dimensions
const getScreenDimensions = () => {
    return {
        window: Dimensions.get('window'),
        screen: Dimensions.get('screen'),
    };
};

// Get current breakpoint based on width
const getCurrentBreakpoint = (width: number): BreakpointKey => {
    if (width >= breakpointTokens.scale['2xl']) return '2xl';
    if (width >= breakpointTokens.scale.xl) return 'xl';
    if (width >= breakpointTokens.scale.lg) return 'lg';
    if (width >= breakpointTokens.scale.md) return 'md';
    if (width >= breakpointTokens.scale.sm) return 'sm';
    return 'xs';
};

// Check if device type
const isMobileDevice = (width: number) => width < breakpointTokens.scale.md;
const isTabletDevice = (width: number) =>
    width >= breakpointTokens.scale.md && width < breakpointTokens.scale.lg;
const isDesktopDevice = (width: number) => width >= breakpointTokens.scale.lg;

// Check orientation
const isPortraitOrientation = (width: number, height: number) => height > width;

// Hook for responsive design
export const useResponsive = (): ResponsiveState => {
    const [dimensions, setDimensions] = useState(() => {
        const { window, screen } = getScreenDimensions();
        const currentBreakpoint = getCurrentBreakpoint(window.width);

        return {
            window,
            screen,
            isMobile: isMobileDevice(window.width),
            isTablet: isTabletDevice(window.width),
            isDesktop: isDesktopDevice(window.width),
            currentBreakpoint,
            isPortrait: isPortraitOrientation(window.width, window.height),
            isLandscape: !isPortraitOrientation(window.width, window.height),
        };
    });

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
            const currentBreakpoint = getCurrentBreakpoint(window.width);

            setDimensions({
                window,
                screen,
                isMobile: isMobileDevice(window.width),
                isTablet: isTabletDevice(window.width),
                isDesktop: isDesktopDevice(window.width),
                currentBreakpoint,
                isPortrait: isPortraitOrientation(window.width, window.height),
                isLandscape: !isPortraitOrientation(window.width, window.height),
            });
        });

        return () => {
            // Cleanup subscription
            if (subscription && typeof subscription.remove === 'function') {
                subscription.remove();
            }
        };
    }, []);

    return dimensions;
};

// Utility functions for responsive values
export const responsiveUtils = {
    // Get value based on current breakpoint
    getValue: <T>(
        value: T | Partial<Record<BreakpointKey, T>>,
        width: number
    ): T => {
        if (typeof value !== 'object') {
            return value;
        }

        const currentBreakpoint = getCurrentBreakpoint(width);
        return (value as Partial<Record<BreakpointKey, T>>)[currentBreakpoint] ||
            (value as Partial<Record<BreakpointKey, T>>).sm ||
            (value as Partial<Record<BreakpointKey, T>>).xs ||
            Object.values(value as object)[0];
    },

    // Get responsive spacing
    getSpacing: (baseSpacing: number, width: number): number => {
        const isTablet = isTabletDevice(width);
        const isLandscape = !isPortraitOrientation(width, Dimensions.get('window').height);

        if (isTablet) {
            return baseSpacing * 1.25; // Increase spacing on tablets
        }
        if (isLandscape) {
            return baseSpacing * 1.1; // Slight increase in landscape
        }
        return baseSpacing;
    },

    // Get responsive font size
    getFontSize: (baseSize: number, width: number): number => {
        const isTablet = isTabletDevice(width);

        if (isTablet) {
            return baseSize * 1.1; // Slightly larger on tablets
        }
        return baseSize;
    },

    // Get grid columns based on screen size
    getGridColumns: (width: number): number => {
        if (width < breakpointTokens.scale.sm) return 1;      // Mobile: 1 column
        if (width < breakpointTokens.scale.md) return 2;      // Large phone: 2 columns
        if (width < breakpointTokens.scale.lg) return 3;      // Small tablet: 3 columns
        if (width < breakpointTokens.scale.xl) return 4;      // Large tablet: 4 columns
        return 6;                                             // Desktop: 6 columns
    },

    // Get gutter spacing
    getGutter: (width: number): number => {
        if (width < breakpointTokens.scale.sm) return 8;      // Mobile: 8px
        if (width < breakpointTokens.scale.md) return 12;     // Large phone: 12px
        if (width < breakpointTokens.scale.lg) return 16;     // Tablet: 16px
        return 20;                                           // Desktop: 20px
    },

    // Check if value matches breakpoint
    isAtLeast: (breakpoint: BreakpointKey, width: number): boolean => {
        return width >= breakpointTokens.scale[breakpoint];
    },

    isAtMost: (breakpoint: BreakpointKey, width: number): boolean => {
        return width <= breakpointTokens.scale[breakpoint];
    },

    // Get responsive container width
    getContainerWidth: (width: number): number => {
        if (width < breakpointTokens.scale.sm) return width - (spacing.scale.md * 2);
        if (width < breakpointTokens.scale.md) return width - (spacing.scale.lg * 2);
        if (width < breakpointTokens.scale.lg) return width - (spacing.scale.xl * 2);
        if (width < breakpointTokens.scale.xl) return 1024;
        return 1200;
    },
};

// Import spacing scale for responsive calculations
import { spacingTokens } from '../tokens/spacing';
const spacing = spacingTokens;

// Component-level responsive utilities
export const responsiveComponents = {
    // Create responsive grid
    createGrid: (columns: Partial<Record<BreakpointKey, number>>) => {
        return (width: number) => {
            const responsiveCols = responsiveUtils.getValue(columns, width);
            const gutter = responsiveUtils.getGutter(width);
            const containerWidth = responsiveUtils.getContainerWidth(width);
            const itemWidth = (containerWidth - (gutter * (responsiveCols - 1))) / responsiveCols;

            return {
                columns: responsiveCols,
                gutter,
                itemWidth,
                containerWidth,
            };
        };
    },

    // Create responsive stack layout
    createStack: (direction: 'row' | 'column' = 'column') => {
        return (width: number) => {
            const isMobile = isMobileDevice(width);

            return {
                direction: isMobile ? 'column' : direction,
                spacing: responsiveUtils.getSpacing(spacing.scale.md, width),
                alignItems: isMobile ? 'stretch' : 'flex-start',
                justifyContent: isMobile ? 'flex-start' : 'flex-start',
            };
        };
    },

    // Create responsive flex layout
    createFlex: (flexDirection: Partial<Record<BreakpointKey, 'row' | 'column'>>) => {
        return (width: number) => {
            const direction = responsiveUtils.getValue(flexDirection, width);
            const isMobile = isMobileDevice(width);

            return {
                flexDirection: isMobile ? 'column' : direction,
                alignItems: isMobile ? 'stretch' : 'flex-start',
                justifyContent: 'flex-start',
            };
        };
    },
};

// Responsive style creators
export const createResponsiveStyles = {
    // Create responsive padding
    padding: (padding: Partial<Record<BreakpointKey, number | string>>) => {
        return (width: number) => {
            const value = responsiveUtils.getValue(padding, width);
            return { padding: value };
        };
    },

    // Create responsive margin
    margin: (margin: Partial<Record<BreakpointKey, number | string>>) => {
        return (width: number) => {
            const value = responsiveUtils.getValue(margin, width);
            return { margin: value };
        };
    },

    // Create responsive dimensions
    dimensions: (width: Partial<Record<BreakpointKey, number>>, height?: Partial<Record<BreakpointKey, number>>) => {
        return (screenWidth: number) => {
            const responsiveWidth = responsiveUtils.getValue(width, screenWidth);
            const responsiveHeight = height ? responsiveUtils.getValue(height, screenWidth) : undefined;

            return {
                width: responsiveWidth,
                height: responsiveHeight,
            };
        };
    },

    // Create responsive font size
    fontSize: (fontSize: Partial<Record<BreakpointKey, number>>) => {
        return (width: number) => {
            const value = responsiveUtils.getValue(fontSize, width);
            return { fontSize: value };
        };
    },
};

// Media query utilities (for conditional rendering)
export const mediaQueries = {
    // Check if matches breakpoint
    match: (query: BreakpointKey, width: number): boolean => {
        return responsiveUtils.isAtLeast(query, width);
    },

    // Create media query function
    create: (breakpoint: BreakpointKey) => {
        return (width: number) => responsiveUtils.isAtLeast(breakpoint, width);
    },

    // Common breakpoints as functions
    isMobile: (width: number) => responsiveUtils.isAtMost('sm', width),
    isTablet: (width: number) => {
        const w = width;
        return w >= breakpointTokens.scale.md && w < breakpointTokens.scale.lg;
    },
    isDesktop: (width: number) => responsiveUtils.isAtLeast('lg', width),
};

// Hook for conditional rendering based on breakpoints
export const useMediaQuery = (breakpoint: BreakpointKey): boolean => {
    const { window } = useResponsive();
    return mediaQueries.match(breakpoint, window.width);
};

// Export utility functions
export default {
    useResponsive,
    responsiveUtils,
    responsiveComponents,
    createResponsiveStyles,
    mediaQueries,
    useMediaQuery,
};