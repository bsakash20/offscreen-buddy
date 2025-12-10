/**
 * Orientation Manager Service
 * Manages device orientation changes and provides orientation-specific utilities
 * Handles portrait/landscape transitions with smooth animations
 */

import { Dimensions, ScaledSize } from 'react-native';
import DeviceDetector, { DeviceOrientation } from './DeviceDetector';

export type OrientationLockMode = 'portrait' | 'landscape' | 'both' | 'sensor';
export type OrientationTransitionState = 'idle' | 'transitioning' | 'completed';

export interface OrientationState {
    current: DeviceOrientation;
    previous: DeviceOrientation | null;
    isTransitioning: boolean;
    transitionProgress: number; // 0 to 1
    angle: number; // 0, 90, 180, 270
    dimensions: {
        width: number;
        height: number;
    };
}

export interface OrientationConfig {
    lockMode: OrientationLockMode;
    enableSmoothTransitions: boolean;
    transitionDuration: number;
    onOrientationChange?: (state: OrientationState) => void;
    onTransitionStart?: (from: DeviceOrientation, to: DeviceOrientation) => void;
    onTransitionEnd?: (orientation: DeviceOrientation) => void;
}

export interface OrientationLayoutConfig {
    portrait: {
        width: number | string;
        height: number | string;
        flexDirection: 'column' | 'row';
        padding: number;
    };
    landscape: {
        width: number | string;
        height: number | string;
        flexDirection: 'column' | 'row';
        padding: number;
    };
}

class OrientationManagerService {
    private static instance: OrientationManagerService;
    private orientationState: OrientationState;
    private config: OrientationConfig;
    private listeners: Set<(state: OrientationState) => void> = new Set();
    private transitionTimer: ReturnType<typeof setTimeout> | null = null;

    private constructor() {
        this.config = {
            lockMode: 'both',
            enableSmoothTransitions: true,
            transitionDuration: 300,
        };

        this.orientationState = this.initializeOrientationState();
        this.setupOrientationListener();
    }

    static getInstance(): OrientationManagerService {
        if (!OrientationManagerService.instance) {
            OrientationManagerService.instance = new OrientationManagerService();
        }
        return OrientationManagerService.instance;
    }

    /**
     * Initialize orientation state
     */
    private initializeOrientationState(): OrientationState {
        const { width, height } = Dimensions.get('window');
        const current: DeviceOrientation = width > height ? 'landscape' : 'portrait';

        return {
            current,
            previous: null,
            isTransitioning: false,
            transitionProgress: 0,
            angle: this.calculateAngle(current),
            dimensions: { width, height },
        };
    }

    /**
     * Setup orientation change listener
     */
    private setupOrientationListener(): void {
        Dimensions.addEventListener('change', ({ window }) => {
            this.handleOrientationChange(window);
        });
    }

    /**
     * Handle orientation change
     */
    private handleOrientationChange(window: ScaledSize): void {
        const newOrientation: DeviceOrientation = window.width > window.height ? 'landscape' : 'portrait';

        // Check if orientation actually changed
        if (newOrientation === this.orientationState.current) {
            // Just update dimensions
            this.orientationState.dimensions = {
                width: window.width,
                height: window.height,
            };
            return;
        }

        // Check if orientation change is allowed
        if (!this.isOrientationAllowed(newOrientation)) {
            return;
        }

        // Start transition
        this.startOrientationTransition(newOrientation, window);
    }

    /**
     * Start orientation transition
     */
    private startOrientationTransition(newOrientation: DeviceOrientation, window: ScaledSize): void {
        const previousOrientation = this.orientationState.current;

        // Call transition start callback
        if (this.config.onTransitionStart) {
            this.config.onTransitionStart(previousOrientation, newOrientation);
        }

        // Update state
        this.orientationState = {
            current: newOrientation,
            previous: previousOrientation,
            isTransitioning: this.config.enableSmoothTransitions,
            transitionProgress: 0,
            angle: this.calculateAngle(newOrientation),
            dimensions: {
                width: window.width,
                height: window.height,
            },
        };

        // Notify listeners
        this.notifyListeners(this.orientationState);

        // Handle smooth transition
        if (this.config.enableSmoothTransitions) {
            this.animateTransition();
        } else {
            this.completeTransition();
        }
    }

    /**
     * Animate orientation transition
     */
    private animateTransition(): void {
        const startTime = Date.now();
        const duration = this.config.transitionDuration;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            this.orientationState.transitionProgress = progress;
            this.notifyListeners(this.orientationState);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.completeTransition();
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Complete orientation transition
     */
    private completeTransition(): void {
        this.orientationState.isTransitioning = false;
        this.orientationState.transitionProgress = 1;

        // Call transition end callback
        if (this.config.onTransitionEnd) {
            this.config.onTransitionEnd(this.orientationState.current);
        }

        // Call orientation change callback
        if (this.config.onOrientationChange) {
            this.config.onOrientationChange(this.orientationState);
        }

        // Notify listeners
        this.notifyListeners(this.orientationState);
    }

    /**
     * Calculate rotation angle for orientation
     */
    private calculateAngle(orientation: DeviceOrientation): number {
        return orientation === 'landscape' ? 90 : 0;
    }

    /**
     * Check if orientation is allowed based on lock mode
     */
    private isOrientationAllowed(orientation: DeviceOrientation): boolean {
        switch (this.config.lockMode) {
            case 'portrait':
                return orientation === 'portrait';
            case 'landscape':
                return orientation === 'landscape';
            case 'both':
            case 'sensor':
                return true;
            default:
                return true;
        }
    }

    /**
     * Get current orientation state
     */
    getOrientationState(): OrientationState {
        return { ...this.orientationState };
    }

    /**
     * Check if device is in portrait orientation
     */
    isPortrait(): boolean {
        return this.orientationState.current === 'portrait';
    }

    /**
     * Check if device is in landscape orientation
     */
    isLandscape(): boolean {
        return this.orientationState.current === 'landscape';
    }

    /**
     * Check if orientation is transitioning
     */
    isTransitioning(): boolean {
        return this.orientationState.isTransitioning;
    }

    /**
     * Get current dimensions
     */
    getDimensions(): { width: number; height: number } {
        return { ...this.orientationState.dimensions };
    }

    /**
     * Get orientation-specific value
     */
    getOrientationValue<T>(portraitValue: T, landscapeValue: T): T {
        return this.isPortrait() ? portraitValue : landscapeValue;
    }

    /**
     * Create orientation-specific layout
     */
    createOrientationLayout(
        portraitLayout: Partial<OrientationLayoutConfig['portrait']>,
        landscapeLayout: Partial<OrientationLayoutConfig['landscape']>
    ): OrientationLayoutConfig['portrait'] | OrientationLayoutConfig['landscape'] {
        // const { width, height } = this.orientationState.dimensions;

        const defaultPortrait: OrientationLayoutConfig['portrait'] = {
            width: '100%',
            height: '100%',
            flexDirection: 'column',
            padding: 16,
        };

        const defaultLandscape: OrientationLayoutConfig['landscape'] = {
            width: '100%',
            height: '100%',
            flexDirection: 'row',
            padding: 16,
        };

        if (this.isPortrait()) {
            return { ...defaultPortrait, ...portraitLayout };
        } else {
            return { ...defaultLandscape, ...landscapeLayout };
        }
    }

    /**
     * Get orientation-specific styles
     */
    getOrientationStyles(): {
        container: any;
        content: any;
        navigation: any;
    } {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        const { width, height } = this.orientationState.dimensions;

        if (this.isPortrait()) {
            return {
                container: {
                    flexDirection: 'column' as const,
                    width,
                    height,
                },
                content: {
                    flex: 1,
                    paddingHorizontal: 16,
                    paddingVertical: 16,
                },
                navigation: {
                    position: 'absolute' as const,
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: 60,
                },
            };
        } else {
            return {
                container: {
                    flexDirection: 'row' as const,
                    width,
                    height,
                },
                content: {
                    flex: 1,
                    paddingHorizontal: 24,
                    paddingVertical: 16,
                },
                navigation: {
                    position: 'absolute' as const,
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 48,
                },
            };
        }
    }

    /**
     * Get optimal keyboard avoiding behavior
     */
    getKeyboardAvoidingBehavior(): 'padding' | 'height' | 'position' {
        return this.isPortrait() ? 'padding' : 'height';
    }

    /**
     * Get orientation-specific grid columns
     */
    getGridColumns(portraitColumns: number, landscapeColumns: number): number {
        return this.isPortrait() ? portraitColumns : landscapeColumns;
    }

    /**
     * Get orientation-specific spacing
     */
    getSpacing(portraitSpacing: number, landscapeSpacing: number): number {
        return this.isPortrait() ? portraitSpacing : landscapeSpacing;
    }

    /**
     * Get orientation-specific font size
     */
    getFontSize(portraitSize: number, landscapeSize: number): number {
        return this.isPortrait() ? portraitSize : landscapeSize;
    }

    /**
     * Configure orientation manager
     */
    configure(config: Partial<OrientationConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * Set orientation lock mode
     */
    setLockMode(mode: OrientationLockMode): void {
        this.config.lockMode = mode;
    }

    /**
     * Get current lock mode
     */
    getLockMode(): OrientationLockMode {
        return this.config.lockMode;
    }

    /**
     * Enable smooth transitions
     */
    enableSmoothTransitions(enable: boolean = true): void {
        this.config.enableSmoothTransitions = enable;
    }

    /**
     * Set transition duration
     */
    setTransitionDuration(duration: number): void {
        this.config.transitionDuration = duration;
    }

    /**
     * Subscribe to orientation changes
     */
    subscribe(callback: (state: OrientationState) => void): () => void {
        this.listeners.add(callback);

        // Immediately call with current state
        callback(this.orientationState);

        return () => this.listeners.delete(callback);
    }

    /**
     * Notify all listeners
     */
    private notifyListeners(state: OrientationState): void {
        this.listeners.forEach(listener => listener(state));
    }

    /**
     * Get aspect ratio for current orientation
     */
    getAspectRatio(): number {
        const { width, height } = this.orientationState.dimensions;
        return width / height;
    }

    /**
     * Check if aspect ratio is wide (> 16:9)
     */
    isWideAspectRatio(): boolean {
        return this.getAspectRatio() > 16 / 9;
    }

    /**
     * Get safe area adjustments for orientation
     */
    getSafeAreaAdjustments(): {
        paddingTop: number;
        paddingBottom: number;
        paddingLeft: number;
        paddingRight: number;
    } {
        const safeArea = DeviceDetector.getSafeAreaInsets();

        if (this.isPortrait()) {
            return {
                paddingTop: safeArea.top,
                paddingBottom: safeArea.bottom,
                paddingLeft: safeArea.left,
                paddingRight: safeArea.right,
            };
        } else {
            // In landscape, notch/home indicator move to sides
            return {
                paddingTop: 0,
                paddingBottom: 0,
                paddingLeft: safeArea.top || safeArea.left,
                paddingRight: safeArea.top || safeArea.right,
            };
        }
    }

    /**
     * Get orientation-specific modal positioning
     */
    getModalPosition(): {
        width: number | string;
        height: number | string;
        maxWidth?: number;
        maxHeight?: number;
    } {
        const { width, height } = this.orientationState.dimensions;
        const deviceInfo = DeviceDetector.getDeviceInfo();

        if (this.isPortrait()) {
            return {
                width: deviceInfo.type === 'phone' ? '90%' : '80%',
                height: 'auto',
                maxHeight: height * 0.8,
            };
        } else {
            return {
                width: deviceInfo.type === 'phone' ? '70%' : '60%',
                height: 'auto',
                maxWidth: width * 0.7,
                maxHeight: height * 0.9,
            };
        }
    }

    /**
     * Get optimal scroll direction
     */
    getScrollDirection(): 'vertical' | 'horizontal' {
        return this.isPortrait() ? 'vertical' : 'horizontal';
    }

    /**
     * Check if should show landscape optimizations
     */
    shouldUseLandscapeOptimizations(): boolean {
        const deviceInfo = DeviceDetector.getDeviceInfo();
        return (
            this.isLandscape() &&
            (deviceInfo.type === 'tablet' || deviceInfo.type === 'foldable')
        );
    }

    /**
     * Get orientation-specific button layout
     */
    getButtonLayout(): {
        direction: 'row' | 'column';
        spacing: number;
        alignment: 'flex-start' | 'center' | 'flex-end';
    } {
        if (this.isPortrait()) {
            return {
                direction: 'column',
                spacing: 12,
                alignment: 'center',
            };
        } else {
            return {
                direction: 'row',
                spacing: 16,
                alignment: 'center',
            };
        }
    }

    /**
     * Reset orientation manager
     */
    reset(): void {
        this.orientationState = this.initializeOrientationState();
        this.config = {
            lockMode: 'both',
            enableSmoothTransitions: true,
            transitionDuration: 300,
        };
        this.notifyListeners(this.orientationState);
    }
}

export default OrientationManagerService.getInstance();