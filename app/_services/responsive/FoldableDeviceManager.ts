/**
 * Foldable Device Manager Service
 * Manages foldable device detection, fold state, and adaptive layouts
 * Supports Samsung Galaxy Fold, Microsoft Surface Duo, and similar devices
 */

import { Dimensions, Platform } from 'react-native';
import DeviceDetector, { FoldableState, DeviceCategory } from './DeviceDetector';

export type FoldDirection = 'horizontal' | 'vertical';
export type FoldPosition = 'left' | 'right' | 'top' | 'bottom' | 'center';
export type DisplayMode = 'single' | 'dual' | 'spanning';

export interface FoldInfo {
    isFoldable: boolean;
    state: FoldableState;
    direction: FoldDirection;
    position: FoldPosition;
    hingeRect: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | null;
    displayMode: DisplayMode;
    screenSegments: ScreenSegment[];
}

export interface ScreenSegment {
    id: string;
    bounds: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    isActive: boolean;
}

export interface FoldableLayoutConfig {
    unfolded: {
        columns: number;
        showSplitView: boolean;
        masterDetailRatio: number;
    };
    folded: {
        columns: number;
        showSplitView: boolean;
        masterDetailRatio: number;
    };
    halfFolded: {
        columns: number;
        showSplitView: boolean;
        masterDetailRatio: number;
        flexMode: 'top-bottom' | 'left-right';
    };
}

class FoldableDeviceManagerService {
    private static instance: FoldableDeviceManagerService;
    private foldInfo: FoldInfo;
    private listeners: Set<(info: FoldInfo) => void> = new Set();
    private layoutConfig: FoldableLayoutConfig;

    private constructor() {
        this.foldInfo = this.detectFoldInfo();
        this.layoutConfig = this.getDefaultLayoutConfig();
        this.setupFoldListener();
    }

    static getInstance(): FoldableDeviceManagerService {
        if (!FoldableDeviceManagerService.instance) {
            FoldableDeviceManagerService.instance = new FoldableDeviceManagerService();
        }
        return FoldableDeviceManagerService.instance;
    }

    /**
     * Get default layout configuration
     */
    private getDefaultLayoutConfig(): FoldableLayoutConfig {
        return {
            unfolded: {
                columns: 2,
                showSplitView: true,
                masterDetailRatio: 0.4,
            },
            folded: {
                columns: 1,
                showSplitView: false,
                masterDetailRatio: 1,
            },
            halfFolded: {
                columns: 1,
                showSplitView: true,
                masterDetailRatio: 0.5,
                flexMode: 'top-bottom',
            },
        };
    }

    /**
     * Detect fold information
     */
    private detectFoldInfo(): FoldInfo {
        const { width, height } = Dimensions.get('window');
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const isFoldable = deviceInfo.capabilities.isFoldable;
        const state = DeviceDetector.getFoldableState();

        // Detect fold direction based on aspect ratio
        const direction = this.detectFoldDirection(width, height);

        // Detect fold position
        const position = this.detectFoldPosition(width, height, direction);

        // Detect hinge rectangle
        const hingeRect = this.detectHingeRect(width, height, direction, state);

        // Detect display mode
        const displayMode = this.detectDisplayMode(state, width, height);

        // Get screen segments
        const screenSegments = this.calculateScreenSegments(
            width,
            height,
            hingeRect,
            direction
        );

        return {
            isFoldable,
            state,
            direction,
            position,
            hingeRect,
            displayMode,
            screenSegments,
        };
    }

    /**
     * Detect fold direction
     */
    private detectFoldDirection(width: number, height: number): FoldDirection {
        // Most foldables fold horizontally (book-style)
        // Surface Duo folds vertically
        const aspectRatio = width / height;

        // If width > height significantly, likely horizontal fold
        if (aspectRatio > 1.5) {
            return 'horizontal';
        }

        return 'vertical';
    }

    /**
     * Detect fold position
     */
    private detectFoldPosition(
        width: number,
        height: number,
        direction: FoldDirection
    ): FoldPosition {
        // Most foldables have center fold
        // Some may have asymmetric folds
        return 'center';
    }

    /**
     * Detect hinge rectangle
     */
    private detectHingeRect(
        width: number,
        height: number,
        direction: FoldDirection,
        state: FoldableState
    ): FoldInfo['hingeRect'] {
        if (state === 'not-foldable') {
            return null;
        }

        // Estimate hinge size (typically 0-28 pixels)
        const hingeWidth = state === 'unfolded' ? 0 : 28;

        if (direction === 'vertical') {
            return {
                x: (width - hingeWidth) / 2,
                y: 0,
                width: hingeWidth,
                height: height,
            };
        } else {
            return {
                x: 0,
                y: (height - hingeWidth) / 2,
                width: width,
                height: hingeWidth,
            };
        }
    }

    /**
     * Detect display mode
     */
    private detectDisplayMode(
        state: FoldableState,
        width: number,
        height: number
    ): DisplayMode {
        if (state === 'not-foldable' || state === 'folded') {
            return 'single';
        }

        if (state === 'half-folded') {
            return 'spanning';
        }

        // Unfolded state - check if spanning both displays
        const aspectRatio = Math.max(width, height) / Math.min(width, height);
        if (aspectRatio > 1.7) {
            return 'dual';
        }

        return 'spanning';
    }

    /**
     * Calculate screen segments
     */
    private calculateScreenSegments(
        width: number,
        height: number,
        hingeRect: FoldInfo['hingeRect'],
        direction: FoldDirection
    ): ScreenSegment[] {
        if (!hingeRect || hingeRect.width === 0) {
            return [
                {
                    id: 'full',
                    bounds: { x: 0, y: 0, width, height },
                    isActive: true,
                },
            ];
        }

        if (direction === 'vertical') {
            const leftWidth = hingeRect.x;
            const rightWidth = width - hingeRect.x - hingeRect.width;

            return [
                {
                    id: 'left',
                    bounds: { x: 0, y: 0, width: leftWidth, height },
                    isActive: true,
                },
                {
                    id: 'right',
                    bounds: {
                        x: hingeRect.x + hingeRect.width,
                        y: 0,
                        width: rightWidth,
                        height,
                    },
                    isActive: true,
                },
            ];
        } else {
            const topHeight = hingeRect.y;
            const bottomHeight = height - hingeRect.y - hingeRect.height;

            return [
                {
                    id: 'top',
                    bounds: { x: 0, y: 0, width, height: topHeight },
                    isActive: true,
                },
                {
                    id: 'bottom',
                    bounds: {
                        x: 0,
                        y: hingeRect.y + hingeRect.height,
                        width,
                        height: bottomHeight,
                    },
                    isActive: true,
                },
            ];
        }
    }

    /**
     * Setup fold state listener
     */
    private setupFoldListener(): void {
        // Listen for dimension changes which may indicate fold state changes
        Dimensions.addEventListener('change', () => {
            const previousInfo = this.foldInfo;
            this.foldInfo = this.detectFoldInfo();

            if (this.hasFoldStateChanged(previousInfo, this.foldInfo)) {
                this.notifyListeners(this.foldInfo);
            }
        });
    }

    /**
     * Check if fold state has changed
     */
    private hasFoldStateChanged(prev: FoldInfo, current: FoldInfo): boolean {
        return (
            prev.state !== current.state ||
            prev.displayMode !== current.displayMode ||
            prev.direction !== current.direction
        );
    }

    /**
     * Get current fold information
     */
    getFoldInfo(): FoldInfo {
        return { ...this.foldInfo };
    }

    /**
     * Check if device is foldable
     */
    isFoldable(): boolean {
        return this.foldInfo.isFoldable;
    }

    /**
     * Get current fold state
     */
    getFoldState(): FoldableState {
        return this.foldInfo.state;
    }

    /**
     * Check if device is unfolded
     */
    isUnfolded(): boolean {
        return this.foldInfo.state === 'unfolded';
    }

    /**
     * Check if device is folded
     */
    isFolded(): boolean {
        return this.foldInfo.state === 'folded';
    }

    /**
     * Check if device is half-folded (flex mode)
     */
    isHalfFolded(): boolean {
        return this.foldInfo.state === 'half-folded';
    }

    /**
     * Get hinge rectangle
     */
    getHingeRect(): FoldInfo['hingeRect'] {
        return this.foldInfo.hingeRect;
    }

    /**
     * Get screen segments
     */
    getScreenSegments(): ScreenSegment[] {
        return this.foldInfo.screenSegments;
    }

    /**
     * Get layout configuration for current fold state
     */
    getLayoutConfig(): FoldableLayoutConfig['unfolded'] | FoldableLayoutConfig['folded'] | FoldableLayoutConfig['halfFolded'] {
        switch (this.foldInfo.state) {
            case 'unfolded':
                return this.layoutConfig.unfolded;
            case 'folded':
                return this.layoutConfig.folded;
            case 'half-folded':
                return this.layoutConfig.halfFolded;
            default:
                return this.layoutConfig.folded;
        }
    }

    /**
     * Configure layout for fold states
     */
    configure(config: Partial<FoldableLayoutConfig>): void {
        this.layoutConfig = {
            ...this.layoutConfig,
            ...config,
        };
    }

    /**
     * Get adaptive styles for foldable device
     */
    getAdaptiveStyles(): {
        container: any;
        masterPane: any;
        detailPane: any;
        hinge: any;
    } {
        const config = this.getLayoutConfig();
        const dimensions = Dimensions.get('window');
        const hingeRect = this.foldInfo.hingeRect;

        if (!this.isFoldable() || this.foldInfo.state === 'folded') {
            return {
                container: {
                    flex: 1,
                    flexDirection: 'column' as const,
                },
                masterPane: {
                    flex: 1,
                },
                detailPane: {
                    display: 'none' as const,
                },
                hinge: {
                    display: 'none' as const,
                },
            };
        }

        if (this.isHalfFolded()) {
            const flexMode = (config as FoldableLayoutConfig['halfFolded']).flexMode;
            return {
                container: {
                    flex: 1,
                    flexDirection: flexMode === 'top-bottom' ? 'column' as const : 'row' as const,
                },
                masterPane: {
                    flex: config.masterDetailRatio,
                },
                detailPane: {
                    flex: 1 - config.masterDetailRatio,
                },
                hinge: {
                    width: flexMode === 'top-bottom' ? '100%' : hingeRect?.width || 0,
                    height: flexMode === 'top-bottom' ? hingeRect?.height || 0 : '100%',
                    backgroundColor: 'transparent',
                },
            };
        }

        // Unfolded state - master-detail layout
        const direction = this.foldInfo.direction;
        return {
            container: {
                flex: 1,
                flexDirection: direction === 'vertical' ? 'row' as const : 'column' as const,
            },
            masterPane: {
                flex: config.masterDetailRatio,
            },
            detailPane: {
                flex: 1 - config.masterDetailRatio,
            },
            hinge: {
                width: direction === 'vertical' ? hingeRect?.width || 0 : '100%',
                height: direction === 'vertical' ? '100%' : hingeRect?.height || 0,
                backgroundColor: 'rgba(0,0,0,0.1)',
            },
        };
    }

    /**
     * Check if content should span across fold
     */
    shouldSpanContent(): boolean {
        return (
            this.isFoldable() &&
            this.isUnfolded() &&
            this.foldInfo.displayMode === 'spanning'
        );
    }

    /**
     * Check if should show split view
     */
    shouldShowSplitView(): boolean {
        const config = this.getLayoutConfig();
        return this.isFoldable() && config.showSplitView;
    }

    /**
     * Get content area avoiding hinge
     */
    getContentArea(segment: 'primary' | 'secondary' | 'full'): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        const { width, height } = Dimensions.get('window');
        const segments = this.foldInfo.screenSegments;

        if (segment === 'full' || segments.length === 1) {
            return { x: 0, y: 0, width, height };
        }

        const targetSegment = segment === 'primary' ? segments[0] : segments[1];
        return targetSegment?.bounds || { x: 0, y: 0, width, height };
    }

    /**
     * Calculate safe area for content placement
     */
    getSafeContentArea(): {
        x: number;
        y: number;
        width: number;
        height: number;
    } {
        const { width, height } = Dimensions.get('window');
        const hingeRect = this.foldInfo.hingeRect;

        if (!hingeRect || !this.isFoldable()) {
            return { x: 0, y: 0, width, height };
        }

        // Return area that avoids the hinge
        if (this.foldInfo.direction === 'vertical') {
            return {
                x: 0,
                y: 0,
                width: hingeRect.x, // Use left segment
                height,
            };
        } else {
            return {
                x: 0,
                y: 0,
                width,
                height: hingeRect.y, // Use top segment
            };
        }
    }

    /**
     * Get flex mode configuration for half-folded state
     */
    getFlexModeConfig(): {
        topContent: { flex: number };
        bottomContent: { flex: number };
        isFlexMode: boolean;
    } {
        if (!this.isHalfFolded()) {
            return {
                topContent: { flex: 1 },
                bottomContent: { flex: 0 },
                isFlexMode: false,
            };
        }

        return {
            topContent: { flex: 0.5 },
            bottomContent: { flex: 0.5 },
            isFlexMode: true,
        };
    }

    /**
     * Subscribe to fold state changes
     */
    subscribe(callback: (info: FoldInfo) => void): () => void {
        this.listeners.add(callback);
        callback(this.foldInfo);
        return () => this.listeners.delete(callback);
    }

    /**
     * Notify listeners of fold state changes
     */
    private notifyListeners(info: FoldInfo): void {
        this.listeners.forEach(listener => listener(info));
    }

    /**
     * Get fold-aware navigation config
     */
    getNavigationConfig(): {
        type: 'stack' | 'drawer' | 'tab' | 'split';
        position: 'bottom' | 'side' | 'top';
    } {
        if (!this.isFoldable()) {
            return { type: 'tab', position: 'bottom' };
        }

        if (this.isUnfolded()) {
            return { type: 'split', position: 'side' };
        }

        if (this.isHalfFolded()) {
            return { type: 'drawer', position: 'side' };
        }

        return { type: 'stack', position: 'bottom' };
    }

    /**
     * Reset fold manager state
     */
    reset(): void {
        this.foldInfo = this.detectFoldInfo();
        this.layoutConfig = this.getDefaultLayoutConfig();
        this.notifyListeners(this.foldInfo);
    }
}

export default FoldableDeviceManagerService.getInstance();