/**
 * useDeviceDetection Hook
 * React hook for device detection and characteristics
 */

import { useState, useEffect } from 'react';
import DeviceDetector, { DeviceInfo } from '../../_services/responsive/DeviceDetector';

export interface UseDeviceDetectionResult extends DeviceInfo {
    isPhone: boolean;
    isTablet: boolean;
    isFoldable: boolean;
    isLandscape: boolean;
    isPortrait: boolean;
    hasNotch: boolean;
    hasDynamicIsland: boolean;
    hasHomeIndicator: boolean;
}

/**
 * Hook to detect and track device characteristics
 */
export function useDeviceDetection(): UseDeviceDetectionResult {
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(() =>
        DeviceDetector.getDeviceInfo()
    );

    useEffect(() => {
        // Subscribe to device changes
        const unsubscribe = DeviceDetector.subscribe((info) => {
            setDeviceInfo(info);
        });

        return unsubscribe;
    }, []);

    return {
        ...deviceInfo,
        isPhone: deviceInfo.type === 'phone',
        isTablet: deviceInfo.type === 'tablet',
        isFoldable: deviceInfo.type === 'foldable',
        isLandscape: deviceInfo.orientation === 'landscape',
        isPortrait: deviceInfo.orientation === 'portrait',
        hasNotch: deviceInfo.capabilities.hasNotch,
        hasDynamicIsland: deviceInfo.capabilities.hasDynamicIsland,
        hasHomeIndicator: deviceInfo.capabilities.hasHomeIndicator,
    };
}

export default useDeviceDetection;