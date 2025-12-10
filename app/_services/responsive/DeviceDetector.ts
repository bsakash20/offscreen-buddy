/**
 * Device Detector Service
 * Comprehensive device detection and classification for OffScreen Buddy
 * Supports phones, tablets, foldables, and various screen configurations
 */

import { Dimensions, Platform, PixelRatio, ScaledSize } from 'react-native';
// Optional: expo-device for enhanced device detection
let Device: any = null;
try {
    Device = require('expo-device');
} catch {
    // expo-device not available, will use fallback detection
}

export type DeviceCategory = 'small-phone' | 'standard-phone' | 'large-phone' | 'small-tablet' | 'large-tablet' | 'foldable' | 'unknown';
export type DeviceOrientation = 'portrait' | 'landscape';
export type FoldableState = 'unfolded' | 'folded' | 'half-folded' | 'not-foldable';
export type AspectRatioCategory = 'standard' | 'wide' | 'ultra-wide' | 'square';

export interface DeviceInfo {
    category: DeviceCategory;
    type: 'phone' | 'tablet' | 'foldable';
    screenSize: {
        width: number;
        height: number;
        diagonal: number; // in inches
    };
    pixelDensity: {
        scale: number;
        fontScale: number;
        density: number; // DPI
    };
    orientation: DeviceOrientation;
    aspectRatio: {
        ratio: number;
        category: AspectRatioCategory;
    };
    capabilities: {
        hasNotch: boolean;
        hasHomeIndicator: boolean;
        hasDynamicIsland: boolean;
        isFoldable: boolean;
        supportsMultiWindow: boolean;
    };
    platform: {
        os: string;
        version: string;
        isIOS: boolean;
        isAndroid: boolean;
    };
    manufacturer?: string;
    model?: string;
}

export interface SafeAreaInfo {
    top: number;
    bottom: number;
    left: number;
    right: number;
    hasInsets: boolean;
}

class DeviceDetectorService {
    private static instance: DeviceDetectorService;
    private deviceInfo: DeviceInfo | null = null;
    private listeners: Set<(info: DeviceInfo) => void> = new Set();

    private constructor() {
        // Initialize with synchronous defaults first
        this.deviceInfo = this.detectDeviceSync();
        // Then update with async detection if needed
        this.initialize();
        this.setupDimensionListener();
    }

    static getInstance(): DeviceDetectorService {
        if (!DeviceDetectorService.instance) {
            DeviceDetectorService.instance = new DeviceDetectorService();
        }
        return DeviceDetectorService.instance;
    }

    /**
     * Initialize device detection
     */
    private async initialize(): Promise<void> {
        this.deviceInfo = await this.detectDevice();
    }

    /**
     * Setup dimension change listener
     */
    private setupDimensionListener(): void {
        Dimensions.addEventListener('change', async () => {
            const previousInfo = this.deviceInfo;
            this.deviceInfo = await this.detectDevice();

            // Notify listeners if significant changes occurred
            if (this.hasSignificantChange(previousInfo, this.deviceInfo)) {
                this.notifyListeners(this.deviceInfo);
            }
        });
    }

    /**
     * Detect device information synchronously
     */
    private detectDeviceSync(): DeviceInfo {
        const { width, height } = Dimensions.get('window');
        const screen = Dimensions.get('screen');
        const scale = PixelRatio.get();
        const fontScale = PixelRatio.getFontScale();

        // Calculate diagonal size in inches
        const diagonal = this.calculateDiagonalSize(width, height, scale);

        // Determine device category
        const category = this.categorizeDevice(diagonal, width, height);
        const type = this.determineDeviceType(category);

        // Detect orientation
        const orientation: DeviceOrientation = width > height ? 'landscape' : 'portrait';

        // Calculate aspect ratio
        const aspectRatio = this.calculateAspectRatio(width, height);

        // Detect capabilities
        const capabilities = this.detectCapabilities(width, height, diagonal);

        // Get platform information
        const platform = {
            os: Platform.OS,
            version: Platform.Version.toString(),
            isIOS: Platform.OS === 'ios',
            isAndroid: Platform.OS === 'android',
        };

        return {
            category,
            type,
            screenSize: {
                width,
                height,
                diagonal,
            },
            pixelDensity: {
                scale,
                fontScale,
                density: this.calculateDPI(scale),
            },
            orientation,
            aspectRatio,
            capabilities,
            platform,
            manufacturer: Device?.manufacturer || undefined,
            model: Device?.modelName || undefined,
        };
    }

    /**
     * Detect device information
     */
    private async detectDevice(): Promise<DeviceInfo> {
        return this.detectDeviceSync();
    }

    /**
     * Calculate diagonal screen size in inches
     */
    private calculateDiagonalSize(width: number, height: number, scale: number): number {
        const widthInches = width * scale / 160; // Assuming 160 DPI baseline
        const heightInches = height * scale / 160;
        return Math.sqrt(widthInches ** 2 + heightInches ** 2);
    }

    /**
     * Calculate DPI from scale
     */
    private calculateDPI(scale: number): number {
        return scale * 160; // Base DPI is 160
    }

    /**
     * Categorize device based on screen size
     */
    private categorizeDevice(diagonal: number, width: number, height: number): DeviceCategory {
        const minDimension = Math.min(width, height);

        // Foldable detection (approximate)
        if (this.isFoldableDevice(width, height)) {
            return 'foldable';
        }

        // Tablet detection (7+ inches)
        if (diagonal >= 7) {
            return diagonal >= 10 ? 'large-tablet' : 'small-tablet';
        }

        // Phone detection
        if (minDimension < 375) {
            return 'small-phone'; // iPhone SE, compact Android
        } else if (minDimension < 400) {
            return 'standard-phone'; // iPhone 12-14, standard Android
        } else {
            return 'large-phone'; // iPhone Pro Max, Samsung Ultra
        }
    }

    /**
     * Determine device type from category
     */
    private determineDeviceType(category: DeviceCategory): 'phone' | 'tablet' | 'foldable' {
        if (category === 'foldable') return 'foldable';
        if (category.includes('tablet')) return 'tablet';
        return 'phone';
    }

    /**
     * Detect if device is foldable
     */
    private isFoldableDevice(width: number, height: number): boolean {
        // Detect common foldable device patterns
        const aspectRatio = Math.max(width, height) / Math.min(width, height);

        // Samsung Galaxy Fold series (unfolded: ~1.8:1, folded: ~21:9)
        // Microsoft Surface Duo (unfolded: ~3:2)
        return (
            (aspectRatio > 1.7 && aspectRatio < 1.9) || // Unfolded tablets
            (aspectRatio > 2.3 && aspectRatio < 2.4) || // Folded narrow screens
            (width > 700 && height > 1000) // Large unfolded screens
        );
    }

    /**
     * Calculate aspect ratio information
     */
    private calculateAspectRatio(width: number, height: number): { ratio: number; category: AspectRatioCategory } {
        const ratio = Math.max(width, height) / Math.min(width, height);

        let category: AspectRatioCategory;
        if (ratio < 1.5) {
            category = 'square';
        } else if (ratio < 1.9) {
            category = 'standard';
        } else if (ratio < 2.2) {
            category = 'wide';
        } else {
            category = 'ultra-wide';
        }

        return { ratio, category };
    }

    /**
     * Detect device capabilities
     */
    private detectCapabilities(width: number, height: number, diagonal: number): DeviceInfo['capabilities'] {
        const hasNotch = this.detectNotch(width, height);
        const hasDynamicIsland = this.detectDynamicIsland(width, height);
        const hasHomeIndicator = hasNotch || hasDynamicIsland;
        const isFoldable = this.isFoldableDevice(width, height);
        const supportsMultiWindow = Platform.OS === 'android' || diagonal >= 10;

        return {
            hasNotch,
            hasHomeIndicator,
            hasDynamicIsland,
            isFoldable,
            supportsMultiWindow,
        };
    }

    /**
     * Detect notch (iPhone X and newer)
     */
    private detectNotch(width: number, height: number): boolean {
        if (Platform.OS !== 'ios') return false;

        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);

        // iPhone X, XS, 11 Pro, 12/13/14 mini, 12/13/14, 12/13/14 Pro
        return (
            (minDimension >= 375 && minDimension <= 428 && maxDimension >= 812 && maxDimension <= 932) ||
            (minDimension >= 390 && minDimension <= 430 && maxDimension >= 844 && maxDimension <= 926)
        );
    }

    /**
     * Detect Dynamic Island (iPhone 14 Pro and newer)
     */
    private detectDynamicIsland(width: number, height: number): boolean {
        if (Platform.OS !== 'ios') return false;

        const minDimension = Math.min(width, height);
        const maxDimension = Math.max(width, height);

        // iPhone 14 Pro, 14 Pro Max, 15 Pro, 15 Pro Max
        return (
            (minDimension >= 393 && minDimension <= 430) &&
            (maxDimension >= 852 && maxDimension <= 932)
        );
    }

    /**
     * Get safe area insets
     */
    getSafeAreaInsets(): SafeAreaInfo {
        if (!this.deviceInfo) {
            return { top: 0, bottom: 0, left: 0, right: 0, hasInsets: false };
        }

        const { capabilities, orientation } = this.deviceInfo;
        let top = 0;
        let bottom = 0;
        let left = 0;
        let right = 0;

        if (capabilities.hasDynamicIsland) {
            top = 59; // Dynamic Island height
            bottom = 34; // Home indicator
        } else if (capabilities.hasNotch) {
            top = 44; // Status bar with notch
            bottom = 34; // Home indicator
        } else if (Platform.OS === 'ios') {
            top = 20; // Standard iOS status bar
        } else if (Platform.OS === 'android') {
            top = 24; // Standard Android status bar
        }

        // Adjust for landscape orientation
        if (orientation === 'landscape' && capabilities.hasHomeIndicator) {
            left = 44;
            right = 44;
            top = 0;
            bottom = 21;
        }

        const hasInsets = top > 0 || bottom > 0 || left > 0 || right > 0;

        return { top, bottom, left, right, hasInsets };
    }

    /**
     * Get current device info
     */
    getDeviceInfo(): DeviceInfo {
        if (!this.deviceInfo) {
            throw new Error('Device info not initialized');
        }
        return this.deviceInfo;
    }

    /**
     * Check if device matches category
     */
    isDeviceCategory(category: DeviceCategory): boolean {
        return this.deviceInfo?.category === category;
    }

    /**
     * Check if device is phone
     */
    isPhone(): boolean {
        return this.deviceInfo?.type === 'phone';
    }

    /**
     * Check if device is tablet
     */
    isTablet(): boolean {
        return this.deviceInfo?.type === 'tablet';
    }

    /**
     * Check if device is foldable
     */
    isFoldable(): boolean {
        return this.deviceInfo?.type === 'foldable';
    }

    /**
     * Check if device is in landscape orientation
     */
    isLandscape(): boolean {
        return this.deviceInfo?.orientation === 'landscape';
    }

    /**
     * Check if device is in portrait orientation
     */
    isPortrait(): boolean {
        return this.deviceInfo?.orientation === 'portrait';
    }

    /**
     * Get foldable state
     */
    getFoldableState(): FoldableState {
        if (!this.deviceInfo?.capabilities.isFoldable) {
            return 'not-foldable';
        }

        const { width, height } = this.deviceInfo.screenSize;
        const aspectRatio = Math.max(width, height) / Math.min(width, height);

        // Detect fold state based on aspect ratio
        if (aspectRatio > 2.2) {
            return 'folded'; // Narrow screen indicates folded state
        } else if (aspectRatio > 1.9 && aspectRatio < 2.1) {
            return 'half-folded'; // Medium aspect ratio
        } else {
            return 'unfolded'; // Wide screen indicates unfolded state
        }
    }

    /**
     * Subscribe to device changes
     */
    subscribe(callback: (info: DeviceInfo) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(info: DeviceInfo): void {
        this.listeners.forEach(listener => listener(info));
    }

    /**
     * Check if there's a significant change between device states
     */
    private hasSignificantChange(prev: DeviceInfo | null, current: DeviceInfo): boolean {
        if (!prev) return true;

        return (
            prev.orientation !== current.orientation ||
            prev.category !== current.category ||
            prev.capabilities.isFoldable !== current.capabilities.isFoldable
        );
    }

    /**
     * Get one-handed reachability zones
     */
    getReachabilityZones(): { easy: number; stretch: number; hard: number } {
        if (!this.deviceInfo) {
            return { easy: 0.5, stretch: 0.75, hard: 1.0 };
        }

        const { screenSize, orientation } = this.deviceInfo;
        const height = orientation === 'portrait' ? screenSize.height : screenSize.width;

        // Calculate thumb-friendly zones (from bottom)
        return {
            easy: height * 0.5,      // Bottom 50% - easy reach
            stretch: height * 0.75,  // Bottom 75% - stretch reach
            hard: height,            // Top 25% - hard reach
        };
    }

    /**
     * Get optimal touch target size
     */
    getOptimalTouchTargetSize(): number {
        if (!this.deviceInfo) return 44;

        const { pixelDensity, type } = this.deviceInfo;

        // Base size: 44px (iOS HIG recommendation)
        let baseSize = 44;

        // Adjust for tablets
        if (type === 'tablet') {
            baseSize = 48; // Slightly larger for tablets
        }

        // Adjust for pixel density
        return Math.round(baseSize * pixelDensity.fontScale);
    }

    /**
     * Check if device supports picture-in-picture
     */
    supportsPictureInPicture(): boolean {
        if (!this.deviceInfo) return false;

        // PiP is supported on iOS 14+ and Android 8+
        if (this.deviceInfo.platform.isIOS) {
            return parseInt(this.deviceInfo.platform.version) >= 14;
        }
        if (this.deviceInfo.platform.isAndroid) {
            return parseInt(this.deviceInfo.platform.version) >= 26; // Android 8.0
        }
        return false;
    }

    /**
     * Get recommended column count for grid layouts
     */
    getRecommendedColumnCount(): number {
        if (!this.deviceInfo) return 1;

        const { category, orientation } = this.deviceInfo;

        if (orientation === 'landscape') {
            switch (category) {
                case 'small-phone':
                case 'standard-phone':
                    return 2;
                case 'large-phone':
                    return 3;
                case 'small-tablet':
                    return 3;
                case 'large-tablet':
                case 'foldable':
                    return 4;
                default:
                    return 2;
            }
        } else {
            switch (category) {
                case 'small-phone':
                    return 1;
                case 'standard-phone':
                case 'large-phone':
                    return 2;
                case 'small-tablet':
                    return 2;
                case 'large-tablet':
                case 'foldable':
                    return 3;
                default:
                    return 1;
            }
        }
    }
}

export default DeviceDetectorService.getInstance();