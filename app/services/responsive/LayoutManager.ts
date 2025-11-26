/**
 * Layout Manager Service
 * Manages responsive layouts and adaptive component positioning
 * Provides intelligent layout strategies for different screen sizes
 */

import { Dimensions, ScaledSize } from 'react-native';
import DeviceDetector, { DeviceCategory, DeviceOrientation } from './DeviceDetector';
import { breakpointTokens, BreakpointKey } from '../../design-system/tokens/breakpoints';

export type LayoutStrategy = 'single-column' | 'two-column' | 'multi-column' | 'grid' | 'masonry' | 'list';
export type NavigationPattern = 'bottom-tabs' | 'side-menu' | 'top-tabs' | 'hamburger' | 'rail';
export type ContentDensity = 'compact' | 'comfortable' | 'spacious';

export interface LayoutConfig {
    strategy: LayoutStrategy;
    navigationPattern: NavigationPattern;
    contentDensity: ContentDensity;
    columns: number;
    gutter: number;
    margins: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    touchTargetSize: number;
    maxContentWidth?: number;
}

export interface GridLayout {
    columns: number;
    rows?: number;
    columnGap: number;
    rowGap: number;
    itemWidth: number;
    itemHeight?: number;
    containerWidth: number;
}

export interface StackLayout {
    direction: 'horizontal' | 'vertical';
    spacing: number;
    alignment: 'start' | 'center' | 'end' | 'stretch';
    justifyContent: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
}

export interface FlexLayout {
    direction: 'row' | 'column';
    wrap: boolean;
    gap: number;
    alignItems: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
}

class LayoutManagerService {
    private static instance: LayoutManagerService;
    private currentLayout: LayoutConfig | null = null;
    private listeners: Set<(layout: LayoutConfig) => void> = new Set();

    private constructor() {
        this.initialize();
        this.setupDimensionListener();
    }

    static getInstance(): LayoutManagerService {
        if (!LayoutManagerService.instance) {
            LayoutManagerService.instance = new LayoutManagerService();
        }
        return LayoutManagerService.instance;
    }

    /**
     * Initialize layout manager
     */
    private initialize(): void {
        this.currentLayout = this.calculateOptimalLayout();
    }

    /**
     * Setup dimension change listener
     */
    private setupDimensionListener(): void {
        Dimensions.addEventListener('change', () => {
            const previousLayout = this.currentLayout;
            this.currentLayout = this.calculateOptimalLayout();

            if (this.hasLayoutChanged(previousLayout, this.currentLayout)) {
                this.notifyListeners(this.currentLayout);
            }
        });
    }

    /**
     * Calculate optimal layout based on device and screen size
     */
    private calculateOptimalLayout(): LayoutConfig {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const { width, height } = deviceInfo.screenSize;
        const { category, orientation } = deviceInfo;

        // Determine layout strategy
        const strategy = this.determineLayoutStrategy(category, orientation, width);

        // Determine navigation pattern
        const navigationPattern = this.determineNavigationPattern(category, orientation);

        // Determine content density
        const contentDensity = this.determineContentDensity(category);

        // Calculate columns
        const columns = this.calculateColumns(category, orientation, width);

        // Calculate gutter
        const gutter = this.calculateGutter(category, width);

        // Calculate margins
        const margins = this.calculateMargins(category, orientation);

        // Get touch target size
        const touchTargetSize = DeviceDetector.getOptimalTouchTargetSize();

        // Calculate max content width
        const maxContentWidth = this.calculateMaxContentWidth(category, width);

        return {
            strategy,
            navigationPattern,
            contentDensity,
            columns,
            gutter,
            margins,
            touchTargetSize,
            maxContentWidth,
        };
    }

    /**
     * Determine layout strategy based on device characteristics
     */
    private determineLayoutStrategy(
        category: DeviceCategory,
        orientation: DeviceOrientation,
        width: number
    ): LayoutStrategy {
        // Tablets and large screens use multi-column layouts
        if (category === 'large-tablet' || category === 'foldable') {
            return orientation === 'landscape' ? 'multi-column' : 'two-column';
        }

        if (category === 'small-tablet') {
            return orientation === 'landscape' ? 'two-column' : 'single-column';
        }

        // Large phones in landscape can use two-column
        if (category === 'large-phone' && orientation === 'landscape') {
            return 'two-column';
        }

        // Default to single-column for phones
        return 'single-column';
    }

    /**
     * Determine navigation pattern
     */
    private determineNavigationPattern(
        category: DeviceCategory,
        orientation: DeviceOrientation
    ): NavigationPattern {
        // Tablets use side menu or rail navigation
        if (category === 'large-tablet' || category === 'foldable') {
            return orientation === 'landscape' ? 'rail' : 'side-menu';
        }

        if (category === 'small-tablet') {
            return orientation === 'landscape' ? 'top-tabs' : 'bottom-tabs';
        }

        // Phones use bottom tabs or hamburger menu
        if (orientation === 'landscape') {
            return 'top-tabs';
        }

        return 'bottom-tabs';
    }

    /**
     * Determine content density
     */
    private determineContentDensity(category: DeviceCategory): ContentDensity {
        switch (category) {
            case 'small-phone':
                return 'compact';
            case 'standard-phone':
            case 'large-phone':
                return 'comfortable';
            case 'small-tablet':
            case 'large-tablet':
            case 'foldable':
                return 'spacious';
            default:
                return 'comfortable';
        }
    }

    /**
     * Calculate optimal number of columns
     */
    private calculateColumns(
        category: DeviceCategory,
        orientation: DeviceOrientation,
        width: number
    ): number {
        // Use existing breakpoint system
        return DeviceDetector.getRecommendedColumnCount();
    }

    /**
     * Calculate gutter spacing
     */
    private calculateGutter(category: DeviceCategory, width: number): number {
        const breakpoint = breakpointTokens.utils.getCurrentBreakpoint(width);

        switch (breakpoint) {
            case 'xs':
                return 8;
            case 'sm':
                return 12;
            case 'md':
                return 16;
            case 'lg':
                return 20;
            case 'xl':
            case '2xl':
                return 24;
            default:
                return 16;
        }
    }

    /**
     * Calculate margins based on device and orientation
     */
    private calculateMargins(
        category: DeviceCategory,
        orientation: DeviceOrientation
    ): LayoutConfig['margins'] {
        const safeArea = DeviceDetector.getSafeAreaInsets();

        // Base margins
        let horizontal = 16;
        let vertical = 16;

        // Adjust for device category
        if (category === 'small-phone') {
            horizontal = 12;
            vertical = 12;
        } else if (category === 'large-tablet' || category === 'foldable') {
            horizontal = 24;
            vertical = 24;
        }

        // Apply safe area insets
        return {
            top: vertical + safeArea.top,
            bottom: vertical + safeArea.bottom,
            left: horizontal + safeArea.left,
            right: horizontal + safeArea.right,
        };
    }

    /**
     * Calculate maximum content width for readability
     */
    private calculateMaxContentWidth(category: DeviceCategory, width: number): number | undefined {
        // Tablets and large screens benefit from max content width
        if (category === 'large-tablet' || category === 'foldable') {
            return Math.min(width * 0.9, 1200);
        }

        if (category === 'small-tablet') {
            return Math.min(width * 0.95, 800);
        }

        // No max width for phones
        return undefined;
    }

    /**
     * Get current layout configuration
     */
    getLayoutConfig(): LayoutConfig {
        if (!this.currentLayout) {
            this.currentLayout = this.calculateOptimalLayout();
        }
        return this.currentLayout;
    }

    /**
     * Create grid layout configuration
     */
    createGridLayout(itemWidth: number, itemHeight?: number): GridLayout {
        const layout = this.getLayoutConfig();
        const { width } = Dimensions.get('window');
        const availableWidth = width - layout.margins.left - layout.margins.right;

        const columns = Math.floor((availableWidth + layout.gutter) / (itemWidth + layout.gutter));
        const actualItemWidth = (availableWidth - (layout.gutter * (columns - 1))) / columns;

        return {
            columns,
            columnGap: layout.gutter,
            rowGap: layout.gutter,
            itemWidth: actualItemWidth,
            itemHeight,
            containerWidth: availableWidth,
        };
    }

    /**
     * Create stack layout configuration
     */
    createStackLayout(direction?: 'horizontal' | 'vertical'): StackLayout {
        const layout = this.getLayoutConfig();
        const deviceInfo = DeviceDetector.getDeviceInfo();

        // Default direction based on orientation
        const stackDirection = direction || (deviceInfo.orientation === 'landscape' ? 'horizontal' : 'vertical');

        return {
            direction: stackDirection,
            spacing: layout.gutter,
            alignment: 'stretch',
            justifyContent: 'start',
        };
    }

    /**
     * Create flex layout configuration
     */
    createFlexLayout(direction?: 'row' | 'column'): FlexLayout {
        const layout = this.getLayoutConfig();
        const deviceInfo = DeviceDetector.getDeviceInfo();

        // Default direction based on orientation
        const flexDirection = direction || (deviceInfo.orientation === 'landscape' ? 'row' : 'column');

        return {
            direction: flexDirection,
            wrap: true,
            gap: layout.gutter,
            alignItems: 'stretch',
            justifyContent: 'flex-start',
        };
    }

    /**
     * Get responsive container width
     */
    getContainerWidth(): number {
        const layout = this.getLayoutConfig();
        const { width } = Dimensions.get('window');
        const availableWidth = width - layout.margins.left - layout.margins.right;

        if (layout.maxContentWidth) {
            return Math.min(availableWidth, layout.maxContentWidth);
        }

        return availableWidth;
    }

    /**
     * Get card layout configuration
     */
    getCardLayout(): {
        width: number | string;
        minHeight: number;
        padding: number;
        margin: number;
    } {
        const layout = this.getLayoutConfig();
        const deviceInfo = DeviceDetector.getDeviceInfo();

        let padding: number;
        let minHeight: number;

        switch (layout.contentDensity) {
            case 'compact':
                padding = 12;
                minHeight = 80;
                break;
            case 'comfortable':
                padding = 16;
                minHeight = 100;
                break;
            case 'spacious':
                padding = 20;
                minHeight = 120;
                break;
        }

        // Calculate width based on columns
        const containerWidth = this.getContainerWidth();
        const cardWidth = layout.columns === 1
            ? '100%'
            : (containerWidth - (layout.gutter * (layout.columns - 1))) / layout.columns;

        return {
            width: cardWidth,
            minHeight,
            padding,
            margin: layout.gutter / 2,
        };
    }

    /**
     * Get button layout configuration
     */
    getButtonLayout(): {
        height: number;
        minWidth: number;
        padding: { horizontal: number; vertical: number };
    } {
        const layout = this.getLayoutConfig();

        return {
            height: layout.touchTargetSize,
            minWidth: layout.touchTargetSize * 2,
            padding: {
                horizontal: 16,
                vertical: 12,
            },
        };
    }

    /**
     * Get input layout configuration
     */
    getInputLayout(): {
        height: number;
        padding: { horizontal: number; vertical: number };
        fontSize: number;
    } {
        const layout = this.getLayoutConfig();
        const deviceInfo = DeviceDetector.getDeviceInfo();

        let fontSize: number;
        switch (layout.contentDensity) {
            case 'compact':
                fontSize = 14;
                break;
            case 'comfortable':
                fontSize = 16;
                break;
            case 'spacious':
                fontSize = 18;
                break;
        }

        return {
            height: layout.touchTargetSize,
            padding: {
                horizontal: 16,
                vertical: 12,
            },
            fontSize,
        };
    }

    /**
     * Check if layout should use single column
     */
    isSingleColumn(): boolean {
        return this.getLayoutConfig().strategy === 'single-column';
    }

    /**
     * Check if layout should use multi-column
     */
    isMultiColumn(): boolean {
        const strategy = this.getLayoutConfig().strategy;
        return strategy === 'two-column' || strategy === 'multi-column';
    }

    /**
     * Get optimal modal width
     */
    getModalWidth(): number | string {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const { width } = deviceInfo.screenSize;

        if (deviceInfo.type === 'phone') {
            return width * 0.9; // 90% of screen width on phones
        }

        if (deviceInfo.type === 'tablet') {
            return Math.min(width * 0.7, 600); // Max 600px on tablets
        }

        return Math.min(width * 0.5, 500); // Max 500px on foldables
    }

    /**
     * Subscribe to layout changes
     */
    subscribe(callback: (layout: LayoutConfig) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify listeners of layout changes
     */
    private notifyListeners(layout: LayoutConfig): void {
        this.listeners.forEach(listener => listener(layout));
    }

    /**
     * Check if layout has changed significantly
     */
    private hasLayoutChanged(prev: LayoutConfig | null, current: LayoutConfig): boolean {
        if (!prev) return true;

        return (
            prev.strategy !== current.strategy ||
            prev.navigationPattern !== current.navigationPattern ||
            prev.columns !== current.columns ||
            prev.contentDensity !== current.contentDensity
        );
    }

    /**
     * Force layout recalculation
     */
    recalculate(): void {
        this.currentLayout = this.calculateOptimalLayout();
        this.notifyListeners(this.currentLayout);
    }

    /**
     * Get split view configuration for tablets
     */
    getSplitViewConfig(): {
        masterWidth: number;
        detailWidth: number;
        dividerWidth: number;
    } | null {
        const deviceInfo = DeviceDetector.getDeviceInfo();

        if (deviceInfo.type !== 'tablet' && deviceInfo.type !== 'foldable') {
            return null;
        }

        const { width } = deviceInfo.screenSize;
        const dividerWidth = 1;

        // 40/60 split for tablets
        return {
            masterWidth: width * 0.4,
            detailWidth: width * 0.6 - dividerWidth,
            dividerWidth,
        };
    }
}

export default LayoutManagerService.getInstance();