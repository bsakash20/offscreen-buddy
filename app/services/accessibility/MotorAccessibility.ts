/**
 * Motor Accessibility Service
 * Touch target optimization, gesture alternatives, and motor impairment support
 */

import { Dimensions, Platform } from 'react-native';
import AccessibilityManager from './AccessibilityManager';
import ScreenReaderService from './ScreenReaderService';

export interface TouchTarget {
    minSize: number;
    recommendedSize: number;
    spacing: number;
}

export interface GestureAlternative {
    primary: string;
    alternatives: string[];
    description: string;
}

export interface InteractionTiming {
    tapDelay: number;
    doubleTapWindow: number;
    longPressDelay: number;
    swipeThreshold: number;
}

class MotorAccessibilityService {
    private static instance: MotorAccessibilityService;
    private touchTargets: Map<string, TouchTarget> = new Map();
    private gestureAlternatives: Map<string, GestureAlternative> = new Map();
    private interactionTiming: InteractionTiming;

    private constructor() {
        this.interactionTiming = this.getDefaultTiming();
        this.registerDefaultGestureAlternatives();
    }

    static getInstance(): MotorAccessibilityService {
        if (!MotorAccessibilityService.instance) {
            MotorAccessibilityService.instance = new MotorAccessibilityService();
        }
        return MotorAccessibilityService.instance;
    }

    /**
     * Get default interaction timing
     */
    private getDefaultTiming(): InteractionTiming {
        return {
            tapDelay: 100,
            doubleTapWindow: 300,
            longPressDelay: 500,
            swipeThreshold: 10,
        };
    }

    /**
     * Register default gesture alternatives
     */
    private registerDefaultGestureAlternatives(): void {
        this.registerGestureAlternative({
            primary: 'swipe',
            alternatives: ['button tap', 'voice command'],
            description: 'Use navigation buttons or voice commands instead of swiping',
        });

        this.registerGestureAlternative({
            primary: 'pinch',
            alternatives: ['button tap', 'slider'],
            description: 'Use zoom buttons or slider instead of pinch gesture',
        });

        this.registerGestureAlternative({
            primary: 'long press',
            alternatives: ['button tap', 'menu button'],
            description: 'Use context menu button instead of long press',
        });

        this.registerGestureAlternative({
            primary: 'double tap',
            alternatives: ['single tap', 'button tap'],
            description: 'Use single tap or dedicated button',
        });
    }

    /**
     * Get minimum touch target size based on accessibility preferences
     */
    getMinimumTouchTarget(): TouchTarget {
        const preferences = AccessibilityManager.getPreferences();
        const baseSize = AccessibilityManager.getTouchTargetSize();

        const sizes: Record<string, TouchTarget> = {
            standard: {
                minSize: 44, // iOS HIG minimum
                recommendedSize: 48,
                spacing: 8,
            },
            large: {
                minSize: 60,
                recommendedSize: 64,
                spacing: 12,
            },
            'extra-large': {
                minSize: 72,
                recommendedSize: 76,
                spacing: 16,
            },
        };

        return sizes[preferences.touchTargetSize];
    }

    /**
     * Calculate accessible touch target dimensions
     */
    calculateTouchTargetDimensions(
        contentWidth: number,
        contentHeight: number
    ): { width: number; height: number; padding: number } {
        const target = this.getMinimumTouchTarget();
        const minSize = target.minSize;

        const width = Math.max(contentWidth, minSize);
        const height = Math.max(contentHeight, minSize);
        const padding = Math.max(0, (minSize - Math.min(contentWidth, contentHeight)) / 2);

        return { width, height, padding };
    }

    /**
     * Get spacing between interactive elements
     */
    getInteractiveSpacing(): number {
        const target = this.getMinimumTouchTarget();
        return target.spacing;
    }

    /**
     * Register gesture alternative
     */
    registerGestureAlternative(alternative: GestureAlternative): void {
        this.gestureAlternatives.set(alternative.primary, alternative);
    }

    /**
     * Get gesture alternatives
     */
    getGestureAlternatives(gesture: string): GestureAlternative | null {
        return this.gestureAlternatives.get(gesture) || null;
    }

    /**
     * Get all gesture alternatives
     */
    getAllGestureAlternatives(): GestureAlternative[] {
        return Array.from(this.gestureAlternatives.values());
    }

    /**
     * Get interaction timing settings
     */
    getInteractionTiming(): InteractionTiming {
        const preferences = AccessibilityManager.getPreferences();

        if (preferences.extendedTimeouts) {
            return {
                tapDelay: this.interactionTiming.tapDelay * 1.5,
                doubleTapWindow: this.interactionTiming.doubleTapWindow * 2,
                longPressDelay: this.interactionTiming.longPressDelay * 1.5,
                swipeThreshold: this.interactionTiming.swipeThreshold * 1.5,
            };
        }

        return { ...this.interactionTiming };
    }

    /**
     * Update interaction timing
     */
    updateInteractionTiming(timing: Partial<InteractionTiming>): void {
        this.interactionTiming = { ...this.interactionTiming, ...timing };
    }

    /**
     * Check if gesture should have alternative
     */
    shouldProvideGestureAlternative(gesture: string): boolean {
        const preferences = AccessibilityManager.getPreferences();
        return preferences.gestureAlternatives && this.gestureAlternatives.has(gesture);
    }

    /**
     * Get one-handed operation layout
     */
    getOneHandedLayout(screenHeight: number): {
        thumbReachZone: { top: number; bottom: number };
        recommendedPosition: 'bottom' | 'middle' | 'floating';
    } {
        // Based on average thumb reach (approximately 50-75% of screen height from bottom)
        const thumbReachPercentage = 0.65;
        const reachableHeight = screenHeight * thumbReachPercentage;

        return {
            thumbReachZone: {
                top: screenHeight - reachableHeight,
                bottom: screenHeight,
            },
            recommendedPosition: 'bottom',
        };
    }

    /**
     * Get recommended button position for one-handed use
     */
    getRecommendedButtonPosition(screenWidth: number, screenHeight: number): {
        x: number;
        y: number;
        alignment: 'left' | 'right' | 'center';
    } {
        const layout = this.getOneHandedLayout(screenHeight);
        const centerX = screenWidth / 2;
        const bottomY = layout.thumbReachZone.bottom - 80; // 80px from bottom

        return {
            x: centerX,
            y: bottomY,
            alignment: 'center',
        };
    }

    /**
     * Validate touch target accessibility
     */
    validateTouchTarget(width: number, height: number): {
        valid: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const target = this.getMinimumTouchTarget();
        const issues: string[] = [];
        const recommendations: string[] = [];

        if (width < target.minSize) {
            issues.push(`Width ${width}px is below minimum ${target.minSize}px`);
            recommendations.push(`Increase width to at least ${target.minSize}px`);
        }

        if (height < target.minSize) {
            issues.push(`Height ${height}px is below minimum ${target.minSize}px`);
            recommendations.push(`Increase height to at least ${target.minSize}px`);
        }

        if (width < target.recommendedSize || height < target.recommendedSize) {
            recommendations.push(`Consider using recommended size of ${target.recommendedSize}px for better accessibility`);
        }

        return {
            valid: issues.length === 0,
            issues,
            recommendations,
        };
    }

    /**
     * Get accessible swipe configuration
     */
    getSwipeConfiguration(): {
        threshold: number;
        velocity: number;
        maxDuration: number;
    } {
        const timing = this.getInteractionTiming();

        return {
            threshold: timing.swipeThreshold,
            velocity: 0.3, // Reduced velocity requirement for motor impairments
            maxDuration: 1000, // Allow slower swipes
        };
    }

    /**
     * Get accessible drag configuration
     */
    getDragConfiguration(): {
        activationDelay: number;
        movementThreshold: number;
        cancelDistance: number;
    } {
        const preferences = AccessibilityManager.getPreferences();

        return {
            activationDelay: preferences.extendedTimeouts ? 750 : 500,
            movementThreshold: 10, // Pixels before drag starts
            cancelDistance: 100, // Pixels to cancel drag
        };
    }

    /**
     * Check if switch control is enabled
     */
    isSwitchControlEnabled(): boolean {
        const preferences = AccessibilityManager.getPreferences();
        return preferences.switchControl;
    }

    /**
     * Get switch control navigation order
     */
    getSwitchControlNavigationOrder(): string[] {
        // Define logical navigation order for switch control
        return [
            'header',
            'timer-display',
            'start-button',
            'pause-button',
            'settings-button',
            'navigation',
            'footer',
        ];
    }

    /**
     * Get dwell control settings
     */
    getDwellControlSettings(): {
        enabled: boolean;
        dwellTime: number;
        cancelTime: number;
    } {
        const preferences = AccessibilityManager.getPreferences();

        return {
            enabled: preferences.dwellControl,
            dwellTime: 1000, // Time to hover before activation
            cancelTime: 300, // Time to cancel by moving away
        };
    }

    /**
     * Get tremor compensation settings
     */
    getTremorCompensation(): {
        enabled: boolean;
        stabilizationRadius: number;
        movementSmoothing: number;
    } {
        return {
            enabled: true,
            stabilizationRadius: 5, // Pixels to ignore minor movements
            movementSmoothing: 0.7, // Smoothing factor (0-1)
        };
    }

    /**
     * Calculate stabilized touch position
     */
    stabilizeTouchPosition(
        currentX: number,
        currentY: number,
        previousX: number,
        previousY: number
    ): { x: number; y: number } {
        const compensation = this.getTremorCompensation();

        if (!compensation.enabled) {
            return { x: currentX, y: currentY };
        }

        const distance = Math.sqrt(
            Math.pow(currentX - previousX, 2) + Math.pow(currentY - previousY, 2)
        );

        // Ignore movements within stabilization radius
        if (distance < compensation.stabilizationRadius) {
            return { x: previousX, y: previousY };
        }

        // Apply smoothing
        const smoothing = compensation.movementSmoothing;
        return {
            x: previousX + (currentX - previousX) * smoothing,
            y: previousY + (currentY - previousY) * smoothing,
        };
    }

    /**
     * Get accessible button layout
     */
    getAccessibleButtonLayout(buttonCount: number): {
        orientation: 'horizontal' | 'vertical' | 'grid';
        spacing: number;
        size: number;
    } {
        const target = this.getMinimumTouchTarget();
        const screenWidth = Dimensions.get('window').width;

        // Determine layout based on button count and screen width
        if (buttonCount <= 2) {
            return {
                orientation: 'horizontal',
                spacing: target.spacing,
                size: target.recommendedSize,
            };
        } else if (buttonCount <= 4 && screenWidth > 375) {
            return {
                orientation: 'horizontal',
                spacing: target.spacing,
                size: target.minSize,
            };
        } else {
            return {
                orientation: 'vertical',
                spacing: target.spacing,
                size: target.recommendedSize,
            };
        }
    }

    /**
     * Announce gesture alternative availability
     */
    announceGestureAlternative(gesture: string): void {
        const alternative = this.getGestureAlternatives(gesture);

        if (alternative) {
            ScreenReaderService.announce({
                message: `Gesture alternative available: ${alternative.description}`,
                priority: 'normal',
            });
        }
    }

    /**
     * Get accessible scroll configuration
     */
    getScrollConfiguration(): {
        decelerationRate: 'normal' | 'fast';
        snapToInterval: number | null;
        pagingEnabled: boolean;
    } {
        const preferences = AccessibilityManager.getPreferences();

        return {
            decelerationRate: preferences.gestureAlternatives ? 'fast' : 'normal',
            snapToInterval: preferences.gestureAlternatives ? 100 : null,
            pagingEnabled: false,
        };
    }
}

export default MotorAccessibilityService.getInstance();