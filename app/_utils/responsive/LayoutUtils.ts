/**
 * Layout Utilities
 * Advanced layout calculation and positioning utilities for responsive design
 */

import { Dimensions, Platform } from 'react-native';
import DeviceDetector from '../../_services/responsive/DeviceDetector';
import LayoutManager from '../../_services/responsive/LayoutManager';
import { BreakpointSystem } from './BreakpointSystem';

export interface GridConfig {
    columns: number;
    gap: number;
    padding: number;
}

export interface FlexConfig {
    direction: 'row' | 'column';
    wrap: boolean;
    justify: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
    align: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    gap: number;
}

export interface PositionConfig {
    x: number;
    y: number;
    width: number;
    height: number;
}

/**
 * Layout Utilities
 */
export const LayoutUtils = {
    /**
     * Calculate grid item dimensions
     */
    calculateGridItemSize(
        containerWidth: number,
        columns: number,
        gap: number,
        aspectRatio: number = 1
    ): { width: number; height: number } {
        const totalGap = gap * (columns - 1);
        const availableWidth = containerWidth - totalGap;
        const itemWidth = availableWidth / columns;
        const itemHeight = itemWidth / aspectRatio;

        return {
            width: Math.floor(itemWidth),
            height: Math.floor(itemHeight),
        };
    },

    /**
     * Calculate optimal grid configuration
     */
    calculateOptimalGrid(containerWidth: number): GridConfig {
        const breakpoint = BreakpointSystem.getCurrentBreakpoint(containerWidth);
        const deviceInfo = DeviceDetector.getDeviceInfo();

        let columns = 1;
        let gap = 16;
        let padding = 16;

        switch (breakpoint) {
            case 'xs':
                columns = 1;
                gap = 8;
                padding = 12;
                break;
            case 'sm':
                columns = 2;
                gap = 12;
                padding = 16;
                break;
            case 'md':
                columns = deviceInfo.orientation === 'landscape' ? 3 : 2;
                gap = 16;
                padding = 20;
                break;
            case 'lg':
                columns = 3;
                gap = 20;
                padding = 24;
                break;
            case 'xl':
                columns = 4;
                gap = 24;
                padding = 32;
                break;
            case '2xl':
                columns = 6;
                gap = 28;
                padding = 40;
                break;
        }

        return { columns, gap, padding };
    },

    /**
     * Calculate masonry layout positions
     */
    calculateMasonryLayout(
        items: Array<{ width: number; height: number }>,
        containerWidth: number,
        columns: number,
        gap: number
    ): PositionConfig[] {
        const columnHeights = new Array(columns).fill(0);
        const itemWidth = (containerWidth - gap * (columns - 1)) / columns;
        const positions: PositionConfig[] = [];

        items.forEach((item) => {
            // Find shortest column
            const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));
            const x = shortestColumnIndex * (itemWidth + gap);
            const y = columnHeights[shortestColumnIndex];

            // Calculate scaled height maintaining aspect ratio
            const scaledHeight = (itemWidth / item.width) * item.height;

            positions.push({
                x,
                y,
                width: itemWidth,
                height: scaledHeight,
            });

            columnHeights[shortestColumnIndex] += scaledHeight + gap;
        });

        return positions;
    },

    /**
     * Calculate flex layout
     */
    calculateFlexLayout(
        itemCount: number,
        containerWidth: number,
        containerHeight: number,
        config: Partial<FlexConfig> = {}
    ): FlexConfig {
        const defaultConfig: FlexConfig = {
            direction: 'row',
            wrap: true,
            justify: 'flex-start',
            align: 'stretch',
            gap: 16,
        };

        return { ...defaultConfig, ...config };
    },

    /**
     * Calculate split view layout
     */
    calculateSplitView(
        containerWidth: number,
        masterRatio: number = 0.4,
        dividerWidth: number = 1
    ): {
        masterWidth: number;
        detailWidth: number;
        dividerWidth: number;
    } {
        const masterWidth = Math.floor(containerWidth * masterRatio);
        const detailWidth = containerWidth - masterWidth - dividerWidth;

        return {
            masterWidth,
            detailWidth,
            dividerWidth,
        };
    },

    /**
     * Calculate safe content area
     */
    calculateSafeContentArea(): {
        top: number;
        bottom: number;
        left: number;
        right: number;
        width: number;
        height: number;
    } {
        const { width, height } = Dimensions.get('window');
        const safeArea = DeviceDetector.getSafeAreaInsets();

        return {
            top: safeArea.top,
            bottom: safeArea.bottom,
            left: safeArea.left,
            right: safeArea.right,
            width: width - safeArea.left - safeArea.right,
            height: height - safeArea.top - safeArea.bottom,
        };
    },

    /**
     * Calculate centered position
     */
    calculateCenteredPosition(
        containerWidth: number,
        containerHeight: number,
        itemWidth: number,
        itemHeight: number
    ): { x: number; y: number } {
        return {
            x: (containerWidth - itemWidth) / 2,
            y: (containerHeight - itemHeight) / 2,
        };
    },

    /**
     * Calculate aspect ratio fit
     */
    calculateAspectRatioFit(
        srcWidth: number,
        srcHeight: number,
        maxWidth: number,
        maxHeight: number,
        contain: boolean = true
    ): { width: number; height: number } {
        const ratio = srcWidth / srcHeight;
        const maxRatio = maxWidth / maxHeight;

        if (contain) {
            if (ratio > maxRatio) {
                return { width: maxWidth, height: maxWidth / ratio };
            } else {
                return { width: maxHeight * ratio, height: maxHeight };
            }
        } else {
            // Cover mode
            if (ratio > maxRatio) {
                return { width: maxHeight * ratio, height: maxHeight };
            } else {
                return { width: maxWidth, height: maxWidth / ratio };
            }
        }
    },

    /**
     * Calculate optimal modal position
     */
    calculateModalPosition(
        modalWidth: number,
        modalHeight: number
    ): {
        x: number;
        y: number;
        centered: boolean;
    } {
        const { width, height } = Dimensions.get('window');
        const deviceInfo = DeviceDetector.getDeviceInfo();

        // Center on tablets and desktop
        if (deviceInfo.type === 'tablet' || deviceInfo.type === 'foldable') {
            return {
                x: (width - modalWidth) / 2,
                y: (height - modalHeight) / 2,
                centered: true,
            };
        }

        // Bottom sheet style on phones
        return {
            x: 0,
            y: height - modalHeight,
            centered: false,
        };
    },

    /**
     * Calculate card layout
     */
    calculateCardLayout(
        containerWidth: number,
        minCardWidth: number = 280,
        maxCardWidth: number = 400,
        gap: number = 16
    ): {
        columns: number;
        cardWidth: number;
        gap: number;
    } {
        let columns = Math.floor((containerWidth + gap) / (minCardWidth + gap));
        columns = Math.max(1, columns);

        const totalGap = gap * (columns - 1);
        let cardWidth = (containerWidth - totalGap) / columns;
        cardWidth = Math.min(cardWidth, maxCardWidth);

        return { columns, cardWidth, gap };
    },

    /**
     * Calculate list item height
     */
    calculateListItemHeight(
        contentHeight: number,
        hasImage: boolean = false,
        hasActions: boolean = false
    ): number {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        let baseHeight = contentHeight;

        if (hasImage) {
            baseHeight += deviceInfo.type === 'tablet' ? 200 : 150;
        }

        if (hasActions) {
            baseHeight += 60;
        }

        // Add padding
        baseHeight += deviceInfo.type === 'tablet' ? 32 : 24;

        return Math.ceil(baseHeight);
    },

    /**
     * Calculate scroll container height
     */
    calculateScrollContainerHeight(
        itemCount: number,
        itemHeight: number,
        maxHeight?: number
    ): number {
        const totalHeight = itemCount * itemHeight;
        const { height } = Dimensions.get('window');
        const safeArea = DeviceDetector.getSafeAreaInsets();
        const availableHeight = height - safeArea.top - safeArea.bottom - 100; // Reserve space for nav

        return Math.min(totalHeight, maxHeight || availableHeight);
    },

    /**
     * Check if should use horizontal layout
     */
    shouldUseHorizontalLayout(): boolean {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        return (
            deviceInfo.orientation === 'landscape' &&
            (deviceInfo.type === 'tablet' || deviceInfo.type === 'foldable')
        );
    },

    /**
     * Get optimal spacing for current layout
     */
    getOptimalSpacing(density: 'compact' | 'comfortable' | 'spacious' = 'comfortable'): {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    } {
        const multipliers = {
            compact: 0.75,
            comfortable: 1,
            spacious: 1.5,
        };

        const multiplier = multipliers[density];

        return {
            xs: Math.round(4 * multiplier),
            sm: Math.round(8 * multiplier),
            md: Math.round(16 * multiplier),
            lg: Math.round(24 * multiplier),
            xl: Math.round(32 * multiplier),
        };
    },

    /**
     * Calculate responsive container width
     */
    calculateContainerWidth(maxWidth?: number): number {
        const { width } = Dimensions.get('window');
        const layoutConfig = LayoutManager.getLayoutConfig();
        const availableWidth = width - layoutConfig.margins.left - layoutConfig.margins.right;

        if (maxWidth) {
            return Math.min(availableWidth, maxWidth);
        }

        return availableWidth;
    },

    /**
     * Calculate button group layout
     */
    calculateButtonGroupLayout(
        buttonCount: number,
        containerWidth: number,
        gap: number = 12
    ): {
        direction: 'row' | 'column';
        buttonWidth: number | string;
    } {
        const minButtonWidth = 120;
        const totalGap = gap * (buttonCount - 1);

        // Check if buttons fit horizontally
        if (containerWidth >= buttonCount * minButtonWidth + totalGap) {
            return {
                direction: 'row',
                buttonWidth: (containerWidth - totalGap) / buttonCount,
            };
        }

        // Stack vertically
        return {
            direction: 'column',
            buttonWidth: '100%',
        };
    },

    /**
     * Calculate navigation bar height
     */
    calculateNavigationHeight(): number {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const safeArea = DeviceDetector.getSafeAreaInsets();

        let baseHeight = 56; // Standard navigation height

        if (deviceInfo.type === 'tablet') {
            baseHeight = 64;
        }

        // Add safe area for devices with notch/home indicator
        if (deviceInfo.capabilities.hasHomeIndicator) {
            baseHeight += safeArea.bottom;
        }

        return baseHeight;
    },
};

export default LayoutUtils;