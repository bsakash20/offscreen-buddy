/**
 * Screen Size Adapter Service
 * Adapts UI elements and layouts based on screen size
 * Provides dynamic scaling and sizing utilities
 */

import { Dimensions, PixelRatio } from 'react-native';
import DeviceDetector, { DeviceCategory } from './DeviceDetector';
import { breakpointTokens } from '../../_design-system/tokens/breakpoints';

export interface ScaleConfig {
    baseWidth: number;
    baseHeight: number;
    minScale: number;
    maxScale: number;
}

export interface AdaptiveSize {
    width: number;
    height: number;
    fontSize: number;
    padding: number;
    margin: number;
    borderRadius: number;
    iconSize: number;
}

class ScreenSizeAdapterService {
    private static instance: ScreenSizeAdapterService;
    private baseConfig: ScaleConfig = {
        baseWidth: 375, // iPhone 11/12/13 width
        baseHeight: 812,
        minScale: 0.8,
        maxScale: 1.5,
    };

    private constructor() { }

    static getInstance(): ScreenSizeAdapterService {
        if (!ScreenSizeAdapterService.instance) {
            ScreenSizeAdapterService.instance = new ScreenSizeAdapterService();
        }
        return ScreenSizeAdapterService.instance;
    }

    /**
     * Configure base scaling parameters
     */
    configure(config: Partial<ScaleConfig>): void {
        this.baseConfig = { ...this.baseConfig, ...config };
    }

    /**
     * Scale value based on screen width
     */
    scaleWidth(size: number): number {
        const { width } = Dimensions.get('window');
        const scale = width / this.baseConfig.baseWidth;
        const clampedScale = Math.max(
            this.baseConfig.minScale,
            Math.min(scale, this.baseConfig.maxScale)
        );
        return Math.round(size * clampedScale);
    }

    /**
     * Scale value based on screen height
     */
    scaleHeight(size: number): number {
        const { height } = Dimensions.get('window');
        const scale = height / this.baseConfig.baseHeight;
        const clampedScale = Math.max(
            this.baseConfig.minScale,
            Math.min(scale, this.baseConfig.maxScale)
        );
        return Math.round(size * clampedScale);
    }

    /**
     * Scale value based on smaller dimension (maintains aspect ratio)
     */
    scaleModerate(size: number, factor: number = 0.5): number {
        const { width, height } = Dimensions.get('window');
        const shortDimension = Math.min(width, height);
        const scale = shortDimension / this.baseConfig.baseWidth;
        const clampedScale = Math.max(
            this.baseConfig.minScale,
            Math.min(scale, this.baseConfig.maxScale)
        );
        return Math.round(size * (1 + (clampedScale - 1) * factor));
    }

    /**
     * Scale font size with accessibility considerations
     */
    scaleFontSize(baseSize: number): number {
        const fontScale = PixelRatio.getFontScale();
        const deviceInfo = DeviceDetector.getDeviceInfo();

        let scaledSize = this.scaleModerate(baseSize, 0.3);

        // Apply font scale for accessibility
        scaledSize *= fontScale;

        // Adjust for device category
        if (deviceInfo.category === 'small-phone') {
            scaledSize *= 0.95;
        } else if (deviceInfo.type === 'tablet') {
            scaledSize *= 1.1;
        }

        return Math.round(scaledSize);
    }

    /**
     * Get adaptive sizing for UI elements
     */
    getAdaptiveSize(category: 'button' | 'input' | 'card' | 'icon' | 'modal'): AdaptiveSize {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const { width, height } = Dimensions.get('window');

        const baseSizes = {
            button: {
                width: 120,
                height: 44,
                fontSize: 16,
                padding: 16,
                margin: 8,
                borderRadius: 8,
                iconSize: 20,
            },
            input: {
                width: width * 0.9,
                height: 44,
                fontSize: 16,
                padding: 12,
                margin: 8,
                borderRadius: 8,
                iconSize: 20,
            },
            card: {
                width: width * 0.9,
                height: 120,
                fontSize: 14,
                padding: 16,
                margin: 12,
                borderRadius: 12,
                iconSize: 24,
            },
            icon: {
                width: 24,
                height: 24,
                fontSize: 14,
                padding: 8,
                margin: 4,
                borderRadius: 4,
                iconSize: 24,
            },
            modal: {
                width: width * 0.9,
                height: height * 0.7,
                fontSize: 16,
                padding: 20,
                margin: 16,
                borderRadius: 16,
                iconSize: 28,
            },
        };

        const base = baseSizes[category];

        return {
            width: this.scaleWidth(base.width),
            height: this.scaleHeight(base.height),
            fontSize: this.scaleFontSize(base.fontSize),
            padding: this.scaleModerate(base.padding),
            margin: this.scaleModerate(base.margin),
            borderRadius: this.scaleModerate(base.borderRadius),
            iconSize: this.scaleModerate(base.iconSize),
        };
    }

    /**
     * Get responsive spacing based on screen size
     */
    getResponsiveSpacing(baseSpacing: number): {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    } {
        return {
            xs: this.scaleModerate(baseSpacing * 0.5),
            sm: this.scaleModerate(baseSpacing * 0.75),
            md: this.scaleModerate(baseSpacing),
            lg: this.scaleModerate(baseSpacing * 1.5),
            xl: this.scaleModerate(baseSpacing * 2),
        };
    }

    /**
     * Get responsive typography scale
     */
    getResponsiveTypography(): {
        xs: number;
        sm: number;
        base: number;
        lg: number;
        xl: number;
        '2xl': number;
        '3xl': number;
    } {
        return {
            xs: this.scaleFontSize(12),
            sm: this.scaleFontSize(14),
            base: this.scaleFontSize(16),
            lg: this.scaleFontSize(18),
            xl: this.scaleFontSize(20),
            '2xl': this.scaleFontSize(24),
            '3xl': this.scaleFontSize(30),
        };
    }

    /**
     * Calculate optimal line height for font size
     */
    getLineHeight(fontSize: number): number {
        return Math.round(fontSize * 1.5);
    }

    /**
     * Get optimal touch target size
     */
    getTouchTargetSize(minSize: number = 44): number {
        const scaled = this.scaleModerate(minSize);
        return Math.max(scaled, 44); // Minimum 44px per iOS HIG
    }

    /**
     * Get responsive border width
     */
    getBorderWidth(baseBorderWidth: number = 1): number {
        const pixelRatio = PixelRatio.get();
        return Math.max(1 / pixelRatio, baseBorderWidth);
    }

    /**
     * Get responsive shadow configuration
     */
    getShadowConfig(elevation: 'sm' | 'md' | 'lg' | 'xl'): {
        shadowOffset: { width: number; height: number };
        shadowOpacity: number;
        shadowRadius: number;
        elevation: number;
    } {
        const configs = {
            sm: { height: 1, radius: 2, opacity: 0.1, elevation: 2 },
            md: { height: 2, radius: 4, opacity: 0.15, elevation: 4 },
            lg: { height: 4, radius: 8, opacity: 0.2, elevation: 8 },
            xl: { height: 8, radius: 16, opacity: 0.25, elevation: 16 },
        };

        const config = configs[elevation];
        return {
            shadowOffset: {
                width: 0,
                height: this.scaleModerate(config.height, 0.3),
            },
            shadowOpacity: config.opacity,
            shadowRadius: this.scaleModerate(config.radius, 0.3),
            elevation: config.elevation,
        };
    }

    /**
     * Get container padding based on screen size
     */
    getContainerPadding(): {
        horizontal: number;
        vertical: number;
    } {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const { width } = Dimensions.get('window');

        let horizontal = 16;
        let vertical = 16;

        if (deviceInfo.category === 'small-phone') {
            horizontal = 12;
            vertical = 12;
        } else if (deviceInfo.type === 'tablet') {
            horizontal = 24;
            vertical = 24;
        }

        // Increase padding on very wide screens
        if (width > 1024) {
            horizontal = Math.min(width * 0.1, 80);
        }

        return {
            horizontal: this.scaleModerate(horizontal),
            vertical: this.scaleModerate(vertical),
        };
    }

    /**
     * Get optimal column width for grid layouts
     */
    getColumnWidth(columns: number, gap: number = 16): number {
        const { width } = Dimensions.get('window');
        const padding = this.getContainerPadding();
        const availableWidth = width - (padding.horizontal * 2);
        const totalGap = gap * (columns - 1);
        return (availableWidth - totalGap) / columns;
    }

    /**
     * Get responsive aspect ratio
     */
    getAspectRatio(defaultRatio: number = 16 / 9): number {
        const deviceInfo = DeviceDetector.getDeviceInfo();

        // Adjust aspect ratio for different device types
        if (deviceInfo.type === 'tablet') {
            return 4 / 3; // More square for tablets
        }

        if (deviceInfo.aspectRatio.category === 'ultra-wide') {
            return 21 / 9;
        }

        return defaultRatio;
    }

    /**
     * Calculate optimal modal size
     */
    getModalSize(): {
        width: number | string;
        height: number | string;
        maxWidth: number;
        maxHeight: number;
    } {
        const { width, height } = Dimensions.get('window');
        const deviceInfo = DeviceDetector.getDeviceInfo();

        if (deviceInfo.type === 'phone') {
            return {
                width: '90%',
                height: 'auto',
                maxWidth: width * 0.95,
                maxHeight: height * 0.85,
            };
        }

        if (deviceInfo.type === 'tablet') {
            return {
                width: Math.min(width * 0.7, 600),
                height: 'auto',
                maxWidth: 600,
                maxHeight: height * 0.8,
            };
        }

        return {
            width: Math.min(width * 0.5, 500),
            height: 'auto',
            maxWidth: 500,
            maxHeight: height * 0.9,
        };
    }

    /**
     * Get responsive image size
     */
    getImageSize(
        aspectRatio: number = 16 / 9,
        maxWidth?: number
    ): { width: number; height: number } {
        const { width } = Dimensions.get('window');
        const padding = this.getContainerPadding();
        const availableWidth = maxWidth || (width - padding.horizontal * 2);

        return {
            width: availableWidth,
            height: availableWidth / aspectRatio,
        };
    }

    /**
     * Convert design pixels to actual pixels
     */
    dp(size: number): number {
        return this.scaleModerate(size);
    }

    /**
     * Convert design font size to actual font size
     */
    sp(size: number): number {
        return this.scaleFontSize(size);
    }

    /**
     * Get percentage of screen width
     */
    widthPercentage(percentage: number): number {
        const { width } = Dimensions.get('window');
        return (width * percentage) / 100;
    }

    /**
     * Get percentage of screen height
     */
    heightPercentage(percentage: number): number {
        const { height } = Dimensions.get('window');
        return (height * percentage) / 100;
    }

    /**
     * Check if size is considered large
     */
    isLargeScreen(): boolean {
        const { width } = Dimensions.get('window');
        return width >= breakpointTokens.scale.lg;
    }

    /**
     * Check if size is considered small
     */
    isSmallScreen(): boolean {
        const { width } = Dimensions.get('window');
        return width < breakpointTokens.scale.sm;
    }

    /**
     * Get optimal content width for readability
     */
    getReadableContentWidth(): number {
        const { width } = Dimensions.get('window');
        const deviceInfo = DeviceDetector.getDeviceInfo();

        if (deviceInfo.type === 'phone') {
            return width * 0.9;
        }

        // Optimal reading width is around 600-700px
        return Math.min(width * 0.8, 700);
    }
}

export default ScreenSizeAdapterService.getInstance();