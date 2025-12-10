/**
 * useScreenDimensions Hook
 * React hook for screen dimensions and responsive layout calculations
 */

import { useState, useEffect, useMemo } from 'react';
import { Dimensions, ScaledSize } from 'react-native';
import { BreakpointSystem, ResponsiveValue } from '../../_utils/responsive/BreakpointSystem';
import LayoutManager, { LayoutConfig } from '../../_services/responsive/LayoutManager';

export interface UseScreenDimensionsResult {
    width: number;
    height: number;
    breakpoint: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isSmallScreen: boolean;
    isLargeScreen: boolean;
    layout: LayoutConfig;
    getResponsiveValue: <T>(values: ResponsiveValue<T>, fallback: T) => T;
    getColumns: () => number;
    getGutter: () => number;
    getContainerWidth: () => number;
}

/**
 * Hook to track screen dimensions and provide responsive utilities
 */
export function useScreenDimensions(): UseScreenDimensionsResult {
    const [dimensions, setDimensions] = useState<ScaledSize>(() =>
        Dimensions.get('window')
    );
    const [layout, setLayout] = useState<LayoutConfig>(() =>
        LayoutManager.getLayoutConfig()
    );

    useEffect(() => {
        // Subscribe to dimension changes
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions(window);
        });

        // Subscribe to layout changes
        const unsubscribeLayout = LayoutManager.subscribe((newLayout) => {
            setLayout(newLayout);
        });

        return () => {
            subscription?.remove();
            unsubscribeLayout();
        };
    }, []);

    const breakpointInfo = useMemo(() => {
        return BreakpointSystem.getBreakpointInfo();
    }, [dimensions.width]);

    return {
        width: dimensions.width,
        height: dimensions.height,
        breakpoint: breakpointInfo.current,
        isMobile: breakpointInfo.isMobile,
        isTablet: breakpointInfo.isTablet,
        isDesktop: breakpointInfo.isDesktop,
        isSmallScreen: breakpointInfo.isXs || breakpointInfo.isSm,
        isLargeScreen: breakpointInfo.isLg || breakpointInfo.isXl || breakpointInfo.is2xl,
        layout,
        getResponsiveValue: <T>(values: ResponsiveValue<T>, fallback: T): T => {
            return BreakpointSystem.getResponsiveValue(values, fallback, dimensions.width);
        },
        getColumns: (): number => {
            return layout.columns;
        },
        getGutter: (): number => {
            return layout.gutter;
        },
        getContainerWidth: (): number => {
            return LayoutManager.getContainerWidth();
        },
    };
}

export default useScreenDimensions;