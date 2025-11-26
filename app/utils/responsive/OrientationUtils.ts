/**
 * Orientation Utilities
 * Utilities for orientation-aware layouts and transitions
 */

import { Dimensions } from 'react-native';
import OrientationManager from '../../services/responsive/OrientationManager';
import DeviceDetector from '../../services/responsive/DeviceDetector';

export interface OrientationStyles {
    portrait: any;
    landscape: any;
}

export interface OrientationLayout {
    direction: 'row' | 'column';
    spacing: number;
    alignment: 'flex-start' | 'center' | 'flex-end' | 'stretch';
}

/**
 * Orientation Utilities
 */
export const OrientationUtils = {
    /**
     * Get current orientation
     */
    getOrientation(): 'portrait' | 'landscape' {
        return OrientationManager.isPortrait() ? 'portrait' : 'landscape';
    },

    /**
     * Check if portrait
     */
    isPortrait(): boolean {
        return OrientationManager.isPortrait();
    },

    /**
     * Check if landscape
     */
    isLandscape(): boolean {
        return OrientationManager.isLandscape();
    },

    /**
     * Get orientation-specific value
     */
    getValue<T>(portraitValue: T, landscapeValue: T): T {
        return OrientationManager.getOrientationValue(portraitValue, landscapeValue);
    },

    /**
     * Get orientation-specific styles
     */
    getStyles<T>(styles: OrientationStyles): T {
        return this.isPortrait() ? styles.portrait : styles.landscape;
    },

    /**
     * Calculate orientation-aware dimensions
     */
    getDimensions(): {
        width: number;
        height: number;
        isPortrait: boolean;
        isLandscape: boolean;
        aspectRatio: number;
    } {
        const { width, height } = Dimensions.get('window');
        const isPortrait = height > width;

        return {
            width,
            height,
            isPortrait,
            isLandscape: !isPortrait,
            aspectRatio: width / height,
        };
    },

    /**
     * Get optimal layout direction for orientation
     */
    getLayoutDirection(): 'row' | 'column' {
        return this.isPortrait() ? 'column' : 'row';
    },

    /**
     * Get orientation-aware spacing
     */
    getSpacing(portraitSpacing: number, landscapeSpacing: number): number {
        return OrientationManager.getSpacing(portraitSpacing, landscapeSpacing);
    },

    /**
     * Get orientation-aware font size
     */
    getFontSize(portraitSize: number, landscapeSize: number): number {
        return OrientationManager.getFontSize(portraitSize, landscapeSize);
    },

    /**
     * Get orientation-aware grid columns
     */
    getGridColumns(portraitColumns: number, landscapeColumns: number): number {
        return OrientationManager.getGridColumns(portraitColumns, landscapeColumns);
    },

    /**
     * Calculate orientation-aware padding
     */
    getPadding(): {
        horizontal: number;
        vertical: number;
    } {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const base = deviceInfo.type === 'tablet' ? 24 : 16;

        return this.getValue(
            { horizontal: base, vertical: base },
            { horizontal: base * 1.5, vertical: base * 0.75 }
        );
    },

    /**
     * Get orientation-aware content width
     */
    getContentWidth(maxWidth?: number): number {
        const { width } = Dimensions.get('window');
        const padding = this.getPadding();
        const availableWidth = width - padding.horizontal * 2;

        if (maxWidth) {
            return Math.min(availableWidth, maxWidth);
        }

        return availableWidth;
    },

    /**
     * Get orientation-aware modal dimensions
     */
    getModalDimensions(): {
        width: number | string;
        height: number | string;
        maxWidth?: number;
        maxHeight?: number;
    } {
        return OrientationManager.getModalPosition();
    },

    /**
     * Get keyboard avoiding behavior for orientation
     */
    getKeyboardBehavior(): 'padding' | 'height' | 'position' {
        return OrientationManager.getKeyboardAvoidingBehavior();
    },

    /**
     * Calculate safe area for orientation
     */
    getSafeArea(): {
        top: number;
        bottom: number;
        left: number;
        right: number;
    } {
        const adjustments = OrientationManager.getSafeAreaAdjustments();
        return {
            top: adjustments.paddingTop,
            bottom: adjustments.paddingBottom,
            left: adjustments.paddingLeft,
            right: adjustments.paddingRight,
        };
    },

    /**
     * Get orientation transition state
     */
    getTransitionState(): {
        isTransitioning: boolean;
        progress: number;
    } {
        const state = OrientationManager.getOrientationState();
        return {
            isTransitioning: state.isTransitioning,
            progress: state.transitionProgress,
        };
    },

    /**
     * Create orientation-aware layout
     */
    createLayout(
        portraitConfig: Partial<OrientationLayout>,
        landscapeConfig: Partial<OrientationLayout>
    ): OrientationLayout {
        const defaultLayout: OrientationLayout = {
            direction: 'column',
            spacing: 16,
            alignment: 'stretch',
        };

        const config = this.isPortrait()
            ? { ...defaultLayout, ...portraitConfig }
            : { ...defaultLayout, ...landscapeConfig };

        return config;
    },

    /**
     * Get optimal scroll direction
     */
    getScrollDirection(): 'vertical' | 'horizontal' {
        return OrientationManager.getScrollDirection();
    },

    /**
     * Check if should use landscape optimizations
     */
    shouldOptimizeForLandscape(): boolean {
        return OrientationManager.shouldUseLandscapeOptimizations();
    },

    /**
     * Get button layout for orientation
     */
    getButtonLayout(): {
        direction: 'row' | 'column';
        spacing: number;
        alignment: 'flex-start' | 'center' | 'flex-end';
    } {
        return OrientationManager.getButtonLayout();
    },

    /**
     * Calculate image dimensions for orientation
     */
    getImageDimensions(
        aspectRatio: number = 16 / 9
    ): {
        width: number;
        height: number;
    } {
        const contentWidth = this.getContentWidth();

        if (this.isPortrait()) {
            return {
                width: contentWidth,
                height: contentWidth / aspectRatio,
            };
        } else {
            // In landscape, limit height
            const { height } = Dimensions.get('window');
            const maxHeight = height * 0.6;
            const calculatedHeight = contentWidth / aspectRatio;

            if (calculatedHeight > maxHeight) {
                return {
                    width: maxHeight * aspectRatio,
                    height: maxHeight,
                };
            }

            return {
                width: contentWidth,
                height: calculatedHeight,
            };
        }
    },

    /**
     * Get navigation position for orientation
     */
    getNavigationPosition(): 'top' | 'bottom' | 'side' {
        const deviceInfo = DeviceDetector.getDeviceInfo();

        if (this.isLandscape() && deviceInfo.type === 'tablet') {
            return 'side';
        }

        if (this.isLandscape()) {
            return 'top';
        }

        return 'bottom';
    },

    /**
     * Calculate card dimensions for orientation
     */
    getCardDimensions(minWidth: number = 280): {
        width: number;
        height: number;
        aspectRatio: number;
    } {
        const contentWidth = this.getContentWidth();
        const columns = this.getValue(1, 2);
        const gap = 16;
        const cardWidth = (contentWidth - gap * (columns - 1)) / columns;

        // Portrait cards are taller, landscape cards are wider
        const aspectRatio = this.getValue(0.75, 1.5);

        return {
            width: Math.max(cardWidth, minWidth),
            height: cardWidth / aspectRatio,
            aspectRatio,
        };
    },

    /**
     * Get optimal text columns for orientation
     */
    getTextColumns(): number {
        const deviceInfo = DeviceDetector.getDeviceInfo();

        if (this.isLandscape() && deviceInfo.type === 'tablet') {
            return 2; // Two-column text layout on landscape tablets
        }

        return 1;
    },

    /**
     * Calculate header height for orientation
     */
    getHeaderHeight(): number {
        const safeArea = this.getSafeArea();
        const baseHeight = this.getValue(56, 48);

        return baseHeight + safeArea.top;
    },

    /**
     * Calculate footer height for orientation
     */
    getFooterHeight(): number {
        const safeArea = this.getSafeArea();
        const baseHeight = this.getValue(60, 48);

        return baseHeight + safeArea.bottom;
    },

    /**
     * Get optimal input layout for orientation
     */
    getInputLayout(): {
        direction: 'column' | 'row';
        labelPosition: 'top' | 'left';
        spacing: number;
    } {
        if (this.isLandscape()) {
            return {
                direction: 'row',
                labelPosition: 'left',
                spacing: 16,
            };
        }

        return {
            direction: 'column',
            labelPosition: 'top',
            spacing: 8,
        };
    },

    /**
     * Calculate split view ratio for orientation
     */
    getSplitViewRatio(): {
        master: number;
        detail: number;
    } {
        // In landscape, use wider master pane
        if (this.isLandscape()) {
            return { master: 0.45, detail: 0.55 };
        }

        // In portrait, use narrower master pane (if split view is used)
        return { master: 0.35, detail: 0.65 };
    },
};

export default OrientationUtils;