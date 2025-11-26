/**
 * useOrientation Hook
 * React hook for orientation detection and management
 */

import { useState, useEffect } from 'react';
import OrientationManager, { OrientationState } from '../../services/responsive/OrientationManager';

export interface UseOrientationResult {
    orientation: 'portrait' | 'landscape';
    isPortrait: boolean;
    isLandscape: boolean;
    isTransitioning: boolean;
    transitionProgress: number;
    dimensions: {
        width: number;
        height: number;
    };
    getValue: <T>(portraitValue: T, landscapeValue: T) => T;
    getStyles: <T>(portraitStyles: T, landscapeStyles: T) => T;
}

/**
 * Hook to detect and track device orientation
 */
export function useOrientation(): UseOrientationResult {
    const [orientationState, setOrientationState] = useState<OrientationState>(() =>
        OrientationManager.getOrientationState()
    );

    useEffect(() => {
        // Subscribe to orientation changes
        const unsubscribe = OrientationManager.subscribe((state) => {
            setOrientationState(state);
        });

        return unsubscribe;
    }, []);

    return {
        orientation: orientationState.current,
        isPortrait: orientationState.current === 'portrait',
        isLandscape: orientationState.current === 'landscape',
        isTransitioning: orientationState.isTransitioning,
        transitionProgress: orientationState.transitionProgress,
        dimensions: orientationState.dimensions,
        getValue: <T>(portraitValue: T, landscapeValue: T): T => {
            return OrientationManager.getOrientationValue(portraitValue, landscapeValue);
        },
        getStyles: <T>(portraitStyles: T, landscapeStyles: T): T => {
            return orientationState.current === 'portrait' ? portraitStyles : landscapeStyles;
        },
    };
}

export default useOrientation;