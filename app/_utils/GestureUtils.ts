/**
 * GestureUtils - Utility functions for gesture handling and optimization
 * Provides common gesture patterns and helper functions
 */

import { PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { TouchOptimizationUtils } from './TouchOptimization';
import { HapticType } from './HapticManager';

export interface GesturePoint {
    x: number;
    y: number;
    timestamp: number;
}

export interface GestureVelocity {
    x: number;
    y: number;
    magnitude: number;
    angle: number;
}

export interface GestureMetrics {
    distance: number;
    velocity: GestureVelocity;
    duration: number;
    direction: string;
    confidence: number; // 0-1, confidence in gesture recognition
}

export class GestureUtils {
    // Calculate velocity from gesture points
    static calculateVelocity(points: GesturePoint[], timeWindow: number = 100): GestureVelocity {
        if (points.length < 2) {
            return { x: 0, y: 0, magnitude: 0, angle: 0 };
        }

        const recentPoints = points.filter(p =>
            Date.now() - p.timestamp <= timeWindow
        );

        if (recentPoints.length < 2) {
            return { x: 0, y: 0, magnitude: 0, angle: 0 };
        }

        const latest = recentPoints[recentPoints.length - 1];
        const oldest = recentPoints[0];

        const dx = latest.x - oldest.x;
        const dy = latest.y - oldest.y;
        const dt = (latest.timestamp - oldest.timestamp) / 1000; // Convert to seconds

        if (dt === 0) {
            return { x: 0, y: 0, magnitude: 0, angle: 0 };
        }

        const vx = dx / dt;
        const vy = dy / dt;
        const magnitude = Math.sqrt(vx * vx + vy * vy);
        const angle = Math.atan2(vy, vx) * (180 / Math.PI); // Convert to degrees

        return { x: vx, y: vy, magnitude, angle };
    }

    // Calculate gesture distance
    static calculateDistance(points: GesturePoint[]): number {
        if (points.length < 2) return 0;

        let totalDistance = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            totalDistance += Math.sqrt(dx * dx + dy * dy);
        }

        return totalDistance;
    }

    // Determine gesture direction
    static determineDirection(velocity: GestureVelocity): string {
        const { magnitude, angle } = velocity;

        if (magnitude < 50) return 'none';

        // Convert angle to standard position (0° = right, 90° = down)
        let normalizedAngle = angle;
        if (normalizedAngle < 0) {
            normalizedAngle += 360;
        }

        if (normalizedAngle >= 315 || normalizedAngle < 45) {
            return 'right';
        } else if (normalizedAngle >= 45 && normalizedAngle < 135) {
            return 'down';
        } else if (normalizedAngle >= 135 && normalizedAngle < 225) {
            return 'left';
        } else {
            return 'up';
        }
    }

    // Analyze gesture confidence
    static analyzeGestureConfidence(points: GesturePoint[]): number {
        if (points.length < 3) return 0.5;

        // Factors that increase confidence:
        // 1. Consistency in direction
        // 2. Smooth curve (not too jerky)
        // 3. Sufficient velocity
        // 4. Adequate distance

        const velocity = this.calculateVelocity(points);
        const distance = this.calculateDistance(points);

        // Direction consistency (simplified)
        const directions = points.map(p => ({ x: p.x, y: p.y }));
        let directionChanges = 0;
        for (let i = 2; i < directions.length; i++) {
            const v1x = directions[i - 1].x - directions[i - 2].x;
            const v1y = directions[i - 1].y - directions[i - 2].y;
            const v2x = directions[i].x - directions[i - 1].x;
            const v2y = directions[i].y - directions[i - 1].y;

            const angle1 = Math.atan2(v1y, v1x);
            const angle2 = Math.atan2(v2y, v2x);
            const angleDiff = Math.abs(angle1 - angle2);

            if (angleDiff > Math.PI / 4) { // 45 degrees
                directionChanges++;
            }
        }

        // Calculate confidence score
        let confidence = 0.5; // Base confidence

        // Velocity factor
        if (velocity.magnitude > 100) confidence += 0.2;
        else if (velocity.magnitude > 50) confidence += 0.1;

        // Distance factor
        if (distance > 100) confidence += 0.2;
        else if (distance > 50) confidence += 0.1;

        // Smoothness factor (penalize direction changes)
        const smoothnessPenalty = Math.min(directionChanges * 0.1, 0.3);
        confidence -= smoothnessPenalty;

        return Math.max(0, Math.min(1, confidence));
    }

    // Check if gesture matches a pattern
    static matchesPattern(
        event: PanGestureHandlerGestureEvent,
        pattern: 'swipe' | 'longPress' | 'pinch' | 'rotation',
        threshold: number = 50,
        duration?: number
    ): boolean {
        const { translationX, translationY, velocityX, velocityY } = event.nativeEvent;

        switch (pattern) {
            case 'swipe':
                const swipeDistance = Math.sqrt(translationX ** 2 + translationY ** 2);
                const swipeVelocity = Math.sqrt(velocityX ** 2 + velocityY ** 2);
                return swipeDistance > threshold && swipeVelocity > 500;

            case 'longPress':
                return (duration || 0) > 500;

            case 'pinch':
                // This would require scale data from gesture handler
                return false;

            case 'rotation':
                // This would require rotation data from gesture handler
                return false;

            default:
                return false;
        }
    }

    // Optimize gesture for timer interactions
    static optimizeTimerGesture(
        gestureType: string,
        data: any,
        timerContext: {
            isRunning: boolean;
            timeRemaining: number;
            sessionId: string;
        }
    ): any {
        // Apply timer-specific optimizations
        const optimized = { ...data };

        // Add timer context
        optimized.timerContext = timerContext;

        // Enhance gesture with timer-specific features
        if (gestureType === 'swipe') {
            // Quick swipe up/down for timer adjustment
            optimized.quickTimerAdjustment = this.isQuickTimerGesture(data);

            // Emergency swipe detection
            optimized.isEmergencyGesture = this.isEmergencyGesture(data);
        }

        if (gestureType === 'longPress') {
            // Long press for advanced timer options
            optimized.showAdvancedOptions = true;
        }

        return optimized;
    }

    // Check if gesture is a quick timer adjustment
    private static isQuickTimerGesture(data: any): boolean {
        const { translationX, translationY, velocityX, velocityY } = data;

        // Quick vertical swipe with high velocity
        const verticalSwipe = Math.abs(translationY) > Math.abs(translationX);
        const highVelocity = Math.abs(velocityY) > 1000;
        const shortDistance = Math.abs(translationY) < 100;

        return verticalSwipe && highVelocity && shortDistance;
    }

    // Check if gesture is an emergency action
    private static isEmergencyGesture(data: any): boolean {
        const { translationX, translationY } = data;

        // Very quick swipe down (emergency stop)
        const quickDownSwipe = translationY > 150 && Math.abs(translationX) < 50;

        return quickDownSwipe;
    }

    // Generate haptic feedback based on gesture
    static generateHapticFeedback(
        gestureType: string,
        gestureData: any,
        timerContext?: any
    ): HapticType {
        if (timerContext?.isTimerAction) {
            switch (gestureType) {
                case 'tap':
                    return HapticType.LIGHT_TAP;
                case 'longPress':
                    return HapticType.MEDIUM_TAP;
                case 'swipe':
                    if (gestureData.quickTimerAdjustment) {
                        return HapticType.MEDIUM_TAP;
                    }
                    if (gestureData.isEmergencyGesture) {
                        return HapticType.TIMER_CANCEL;
                    }
                    return HapticType.LIGHT_TAP;
                default:
                    return HapticType.MEDIUM_TAP;
            }
        }

        // Default haptic feedback
        switch (gestureType) {
            case 'tap':
                return HapticType.LIGHT_TAP;
            case 'longPress':
                return HapticType.MEDIUM_TAP;
            case 'swipe':
                return HapticType.LIGHT_TAP;
            default:
                return HapticType.LIGHT_TAP;
        }
    }

    // Gesture validation
    static validateGesture(
        gestureType: string,
        data: any,
        options: {
            minDistance?: number;
            maxDistance?: number;
            minVelocity?: number;
            requiredDirection?: string;
            allowDiagonal?: boolean;
        } = {}
    ): { isValid: boolean; reason?: string } {
        const {
            minDistance = 0,
            maxDistance = Infinity,
            minVelocity = 0,
            requiredDirection,
            allowDiagonal = true,
        } = options;

        const distance = Math.sqrt(data.translationX ** 2 + data.translationY ** 2);
        const velocity = Math.sqrt(data.velocityX ** 2 + data.velocityY ** 2);

        // Check distance constraints
        if (distance < minDistance) {
            return { isValid: false, reason: `Distance ${distance} below minimum ${minDistance}` };
        }

        if (distance > maxDistance) {
            return { isValid: false, reason: `Distance ${distance} above maximum ${maxDistance}` };
        }

        // Check velocity constraint
        if (velocity < minVelocity) {
            return { isValid: false, reason: `Velocity ${velocity} below minimum ${minVelocity}` };
        }

        // Check direction constraint
        if (requiredDirection) {
            const detectedDirection = this.determineDirection(
                this.calculateVelocity([{ x: 0, y: 0, timestamp: 0 }, { x: data.translationX, y: data.translationY, timestamp: 1 }])
            );

            if (detectedDirection !== requiredDirection) {
                return { isValid: false, reason: `Direction ${detectedDirection} doesn't match required ${requiredDirection}` };
            }
        }

        return { isValid: true };
    }

    // Smooth gesture data (reduce noise)
    static smoothGestureData(points: GesturePoint[], factor: number = 0.3): GesturePoint[] {
        if (points.length < 3) return points;

        const smoothed = [points[0]];

        for (let i = 1; i < points.length - 1; i++) {
            const prev = points[i - 1];
            const current = points[i];
            const next = points[i + 1];

            const smoothedX = current.x + factor * ((prev.x + next.x) / 2 - current.x);
            const smoothedY = current.y + factor * ((prev.y + next.y) / 2 - current.y);

            smoothed.push({
                x: smoothedX,
                y: smoothedY,
                timestamp: current.timestamp,
            });
        }

        smoothed.push(points[points.length - 1]);
        return smoothed;
    }

    // Gesture replay for debugging
    static replayGesture(points: GesturePoint[], callback: (point: GesturePoint) => void): Promise<void> {
        return new Promise((resolve) => {
            let index = 0;

            const playNextPoint = () => {
                if (index >= points.length) {
                    resolve();
                    return;
                }

                callback(points[index]);
                index++;

                // Calculate delay to next point based on timestamps
                const delay = index < points.length
                    ? points[index].timestamp - points[index - 1].timestamp
                    : 16; // ~60fps

                setTimeout(playNextPoint, Math.max(16, delay));
            };

            playNextPoint();
        });
    }
}

export default GestureUtils;