/**
 * Device Utilities
 * Device-specific detection and optimization utilities
 */

import { Platform, Dimensions, PixelRatio } from 'react-native';
import DeviceDetector from '../../services/responsive/DeviceDetector';

/**
 * Device Utilities
 */
export const DeviceUtils = {
    /**
     * Check if device is iOS
     */
    isIOS(): boolean {
        return Platform.OS === 'ios';
    },

    /**
     * Check if device is Android
     */
    isAndroid(): boolean {
        return Platform.OS === 'android';
    },

    /**
     * Check if device is phone
     */
    isPhone(): boolean {
        return DeviceDetector.isPhone();
    },

    /**
     * Check if device is tablet
     */
    isTablet(): boolean {
        return DeviceDetector.isTablet();
    },

    /**
     * Check if device is foldable
     */
    isFoldable(): boolean {
        return DeviceDetector.isFoldable();
    },

    /**
     * Get device category
     */
    getDeviceCategory(): string {
        return DeviceDetector.getDeviceInfo().category;
    },

    /**
     * Check if device has notch
     */
    hasNotch(): boolean {
        return DeviceDetector.getDeviceInfo().capabilities.hasNotch;
    },

    /**
     * Check if device has Dynamic Island
     */
    hasDynamicIsland(): boolean {
        return DeviceDetector.getDeviceInfo().capabilities.hasDynamicIsland;
    },

    /**
     * Check if device has home indicator
     */
    hasHomeIndicator(): boolean {
        return DeviceDetector.getDeviceInfo().capabilities.hasHomeIndicator;
    },

    /**
     * Get pixel ratio
     */
    getPixelRatio(): number {
        return PixelRatio.get();
    },

    /**
     * Get font scale
     */
    getFontScale(): number {
        return PixelRatio.getFontScale();
    },

    /**
     * Check if high DPI device
     */
    isHighDPI(): boolean {
        return PixelRatio.get() >= 3;
    },

    /**
     * Get screen dimensions
     */
    getScreenDimensions(): { width: number; height: number } {
        return Dimensions.get('window');
    },

    /**
     * Get screen diagonal size in inches
     */
    getScreenDiagonal(): number {
        return DeviceDetector.getDeviceInfo().screenSize.diagonal;
    },

    /**
     * Check if small screen device
     */
    isSmallScreen(): boolean {
        const info = DeviceDetector.getDeviceInfo();
        return info.category === 'small-phone';
    },

    /**
     * Check if large screen device
     */
    isLargeScreen(): boolean {
        const info = DeviceDetector.getDeviceInfo();
        return info.type === 'tablet' || info.category === 'large-tablet';
    },

    /**
     * Get optimal touch target size
     */
    getOptimalTouchTargetSize(): number {
        return DeviceDetector.getOptimalTouchTargetSize();
    },

    /**
     * Check if supports picture-in-picture
     */
    supportsPictureInPicture(): boolean {
        return DeviceDetector.supportsPictureInPicture();
    },

    /**
     * Get platform-specific value
     */
    getPlatformValue<T>(iosValue: T, androidValue: T): T {
        return Platform.OS === 'ios' ? iosValue : androidValue;
    },

    /**
     * Get device-specific value
     */
    getDeviceValue<T>(phoneValue: T, tabletValue: T): T {
        return this.isTablet() ? tabletValue : phoneValue;
    },

    /**
     * Check if should use tablet layout
     */
    shouldUseTabletLayout(): boolean {
        const info = DeviceDetector.getDeviceInfo();
        return info.type === 'tablet' || info.type === 'foldable';
    },

    /**
     * Get recommended column count
     */
    getRecommendedColumnCount(): number {
        return DeviceDetector.getRecommendedColumnCount();
    },

    /**
     * Get reachability zones for one-handed use
     */
    getReachabilityZones(): { easy: number; stretch: number; hard: number } {
        return DeviceDetector.getReachabilityZones();
    },

    /**
     * Check if content is in easy reach zone
     */
    isInEasyReach(yPosition: number): boolean {
        const zones = this.getReachabilityZones();
        return yPosition <= zones.easy;
    },

    /**
     * Get safe area insets
     */
    getSafeAreaInsets(): {
        top: number;
        bottom: number;
        left: number;
        right: number;
    } {
        return DeviceDetector.getSafeAreaInsets();
    },
};

export default DeviceUtils;