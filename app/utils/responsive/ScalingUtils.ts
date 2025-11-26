/**
 * Scaling Utilities
 * Dynamic scaling functions for responsive design
 */

import { Dimensions, PixelRatio } from 'react-native';
import ScreenSizeAdapter from '../../services/responsive/ScreenSizeAdapter';

// Base design dimensions (iPhone 11/12/13)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

/**
 * Scaling Utilities
 */
export const ScalingUtils = {
    /**
     * Scale width proportionally
     */
    scaleWidth(size: number): number {
        return ScreenSizeAdapter.scaleWidth(size);
    },

    /**
     * Scale height proportionally
     */
    scaleHeight(size: number): number {
        return ScreenSizeAdapter.scaleHeight(size);
    },

    /**
     * Scale with moderate factor (for fonts, icons)
     */
    scaleModerate(size: number, factor: number = 0.5): number {
        return ScreenSizeAdapter.scaleModerate(size, factor);
    },

    /**
     * Scale font size with accessibility support
     */
    scaleFontSize(size: number): number {
        return ScreenSizeAdapter.scaleFontSize(size);
    },

    /**
     * Design pixel to actual pixel
     */
    dp(size: number): number {
        return ScreenSizeAdapter.dp(size);
    },

    /**
     * Scale point (for fonts)
     */
    sp(size: number): number {
        return ScreenSizeAdapter.sp(size);
    },

    /**
     * Get percentage of screen width
     */
    widthPercent(percentage: number): number {
        return ScreenSizeAdapter.widthPercentage(percentage);
    },

    /**
     * Get percentage of screen height
     */
    heightPercent(percentage: number): number {
        return ScreenSizeAdapter.heightPercentage(percentage);
    },

    /**
     * Normalize size based on screen width
     */
    normalize(size: number): number {
        const { width } = Dimensions.get('window');
        const scale = width / BASE_WIDTH;
        return Math.round(size * scale);
    },

    /**
     * Get line height for font size
     */
    lineHeight(fontSize: number, multiplier: number = 1.5): number {
        return Math.round(fontSize * multiplier);
    },

    /**
     * Get letter spacing for font size
     */
    letterSpacing(fontSize: number): number {
        // Larger fonts need less letter spacing
        if (fontSize >= 24) return -0.5;
        if (fontSize >= 18) return 0;
        if (fontSize >= 14) return 0.25;
        return 0.5;
    },

    /**
     * Calculate responsive border width
     */
    borderWidth(baseBorderWidth: number = 1): number {
        const pixelRatio = PixelRatio.get();
        return Math.max(1 / pixelRatio, baseBorderWidth);
    },

    /**
     * Get hairline width for thin borders
     */
    hairlineWidth(): number {
        return 1 / PixelRatio.get();
    },

    /**
     * Calculate responsive border radius
     */
    borderRadius(baseRadius: number): number {
        return this.scaleModerate(baseRadius, 0.3);
    },

    /**
     * Calculate responsive shadow
     */
    shadow(elevation: number): {
        shadowOffset: { width: number; height: number };
        shadowOpacity: number;
        shadowRadius: number;
        elevation: number;
    } {
        return {
            shadowOffset: {
                width: 0,
                height: this.scaleModerate(elevation * 0.5, 0.3),
            },
            shadowOpacity: 0.1 + elevation * 0.02,
            shadowRadius: this.scaleModerate(elevation, 0.3),
            elevation: elevation,
        };
    },

    /**
     * Get responsive spacing scale
     */
    spacing(multiplier: number = 1): number {
        const baseSpacing = 8;
        return this.dp(baseSpacing * multiplier);
    },

    /**
     * Get responsive icon size
     */
    iconSize(baseSize: number = 24): number {
        return this.scaleModerate(baseSize, 0.4);
    },

    /**
     * Calculate minimum touch target
     */
    minTouchTarget(): number {
        return Math.max(this.dp(44), 44);
    },

    /**
     * Get responsive container padding
     */
    containerPadding(): {
        horizontal: number;
        vertical: number;
    } {
        return ScreenSizeAdapter.getContainerPadding();
    },

    /**
     * Calculate responsive typography scale
     */
    typography(): {
        xs: number;
        sm: number;
        base: number;
        lg: number;
        xl: number;
        '2xl': number;
        '3xl': number;
    } {
        return ScreenSizeAdapter.getResponsiveTypography();
    },

    /**
     * Get responsive spacing scale
     */
    spacingScale(baseSpacing: number = 8): {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    } {
        return ScreenSizeAdapter.getResponsiveSpacing(baseSpacing);
    },

    /**
     * Calculate aspect ratio dimensions
     */
    aspectRatio(
        width: number,
        ratio: number
    ): { width: number; height: number } {
        return {
            width,
            height: width / ratio,
        };
    },

    /**
     * Clamp value between min and max
     */
    clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    },

    /**
     * Scale with bounds
     */
    scaleBounded(
        size: number,
        minSize: number,
        maxSize: number
    ): number {
        const scaled = this.scaleModerate(size);
        return this.clamp(scaled, minSize, maxSize);
    },

    /**
     * Get responsive button dimensions
     */
    buttonDimensions(size: 'sm' | 'md' | 'lg' = 'md'): {
        height: number;
        paddingHorizontal: number;
        fontSize: number;
        borderRadius: number;
    } {
        const sizes = {
            sm: { height: 32, paddingHorizontal: 12, fontSize: 14, borderRadius: 6 },
            md: { height: 44, paddingHorizontal: 16, fontSize: 16, borderRadius: 8 },
            lg: { height: 52, paddingHorizontal: 20, fontSize: 18, borderRadius: 10 },
        };

        const config = sizes[size];
        return {
            height: this.dp(config.height),
            paddingHorizontal: this.dp(config.paddingHorizontal),
            fontSize: this.sp(config.fontSize),
            borderRadius: this.borderRadius(config.borderRadius),
        };
    },

    /**
     * Get responsive input dimensions
     */
    inputDimensions(): {
        height: number;
        paddingHorizontal: number;
        fontSize: number;
        borderRadius: number;
    } {
        return {
            height: this.dp(44),
            paddingHorizontal: this.dp(16),
            fontSize: this.sp(16),
            borderRadius: this.borderRadius(8),
        };
    },

    /**
     * Get responsive card dimensions
     */
    cardDimensions(): {
        padding: number;
        borderRadius: number;
        minHeight: number;
    } {
        return {
            padding: this.dp(16),
            borderRadius: this.borderRadius(12),
            minHeight: this.dp(100),
        };
    },

    /**
     * Get responsive modal dimensions
     */
    modalDimensions(): {
        width: number | string;
        maxHeight: number;
        padding: number;
        borderRadius: number;
    } {
        const modalSize = ScreenSizeAdapter.getModalSize();
        return {
            width: modalSize.width,
            maxHeight: modalSize.maxHeight,
            padding: this.dp(20),
            borderRadius: this.borderRadius(16),
        };
    },
};

export default ScalingUtils;