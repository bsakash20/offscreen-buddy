/**
 * useResponsiveLayout Hook
 * React hook for responsive layout management
 */

import { useState, useEffect, useMemo } from 'react';
import { Dimensions } from 'react-native';
import LayoutManager, { LayoutConfig, GridLayout, StackLayout, FlexLayout } from '../../_services/responsive/LayoutManager';
import DeviceDetector from '../../_services/responsive/DeviceDetector';
import { BreakpointSystem } from '../../_utils/responsive/BreakpointSystem';

export interface UseResponsiveLayoutResult {
    layout: LayoutConfig;
    columns: number;
    gutter: number;
    margins: LayoutConfig['margins'];
    touchTargetSize: number;
    contentDensity: 'compact' | 'comfortable' | 'spacious';
    navigationPattern: string;
    isSingleColumn: boolean;
    isMultiColumn: boolean;
    containerWidth: number;
    createGrid: (itemWidth: number, itemHeight?: number) => GridLayout;
    createStack: (direction?: 'horizontal' | 'vertical') => StackLayout;
    createFlex: (direction?: 'row' | 'column') => FlexLayout;
    getCardLayout: () => {
        width: number | string;
        minHeight: number;
        padding: number;
        margin: number;
    };
    getButtonLayout: () => {
        height: number;
        minWidth: number;
        padding: { horizontal: number; vertical: number };
    };
    getInputLayout: () => {
        height: number;
        padding: { horizontal: number; vertical: number };
        fontSize: number;
    };
    getModalWidth: () => number | string;
    getSplitViewConfig: () => {
        masterWidth: number;
        detailWidth: number;
        dividerWidth: number;
    } | null;
}

/**
 * Hook for responsive layout management
 */
export function useResponsiveLayout(): UseResponsiveLayoutResult {
    const [layout, setLayout] = useState<LayoutConfig>(() =>
        LayoutManager.getLayoutConfig()
    );

    useEffect(() => {
        // Subscribe to layout changes
        const unsubscribe = LayoutManager.subscribe((newLayout) => {
            setLayout(newLayout);
        });

        // Also listen to dimension changes
        const subscription = Dimensions.addEventListener('change', () => {
            setLayout(LayoutManager.getLayoutConfig());
        });

        return () => {
            unsubscribe();
            subscription?.remove();
        };
    }, []);

    const containerWidth = useMemo(() => {
        return LayoutManager.getContainerWidth();
    }, [layout]);

    return {
        layout,
        columns: layout.columns,
        gutter: layout.gutter,
        margins: layout.margins,
        touchTargetSize: layout.touchTargetSize,
        contentDensity: layout.contentDensity,
        navigationPattern: layout.navigationPattern,
        isSingleColumn: layout.strategy === 'single-column',
        isMultiColumn: layout.strategy === 'two-column' || layout.strategy === 'multi-column',
        containerWidth,
        createGrid: (itemWidth: number, itemHeight?: number): GridLayout => {
            return LayoutManager.createGridLayout(itemWidth, itemHeight);
        },
        createStack: (direction?: 'horizontal' | 'vertical'): StackLayout => {
            return LayoutManager.createStackLayout(direction);
        },
        createFlex: (direction?: 'row' | 'column'): FlexLayout => {
            return LayoutManager.createFlexLayout(direction);
        },
        getCardLayout: () => {
            return LayoutManager.getCardLayout();
        },
        getButtonLayout: () => {
            return LayoutManager.getButtonLayout();
        },
        getInputLayout: () => {
            return LayoutManager.getInputLayout();
        },
        getModalWidth: () => {
            return LayoutManager.getModalWidth();
        },
        getSplitViewConfig: () => {
            return LayoutManager.getSplitViewConfig();
        },
    };
}

export default useResponsiveLayout;