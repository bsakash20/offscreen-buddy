/**
 * Mobile-First Design System - Mobile Utilities
 * Mobile-specific utilities for safe area, orientation, keyboard handling
 */

import { useState, useEffect } from 'react';
import {
    Dimensions,
    ScaledSize,
    Keyboard,
    StatusBar,
    Platform,
    AppState,
    AppStateStatus,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface SafeAreaInsets {
    top: number;
    bottom: number;
    left: number;
    right: number;
}

export interface KeyboardInfo {
    height: number;
    duration: number;
    easing: string;
    isVisible: boolean;
}

export interface OrientationInfo {
    isPortrait: boolean;
    isLandscape: boolean;
    angle: number;
}

// Device detection utilities
export const deviceUtils = {
    // Check if device has notch
    hasNotch: (): boolean => {
        const { width, height } = Dimensions.get('window');
        const isIOS = Platform.OS === 'ios';

        if (isIOS) {
            // iPhone with notch
            return (width >= 375 && width <= 428 && height >= 812 && height <= 932) ||
                (width >= 390 && width <= 430 && height >= 844 && height <= 926);
        }

        // Android devices with notch (approximation)
        return width > height && height > 800;
    },

    // Check if device is iPad
    isIPad: (): boolean => {
        return Platform.OS === 'ios' && Platform.isPad;
    },

    // Get device type
    getDeviceType: (): 'phone' | 'tablet' => {
        const { width } = Dimensions.get('window');
        return width >= 768 ? 'tablet' : 'phone';
    },

    // Check if device is in landscape
    isLandscape: (): boolean => {
        const { width, height } = Dimensions.get('window');
        return width > height;
    },

    // Get screen dimensions
    getScreenSize: (): { width: number; height: number } => {
        const { width, height } = Dimensions.get('window');
        return { width, height };
    },
};

// Safe area utilities
export const safeAreaUtils = {
    // Get safe area insets
    getSafeAreaInsets: (): SafeAreaInsets => {
        try {
            const insets = useSafeAreaInsets();
            return {
                top: insets.top,
                bottom: insets.bottom,
                left: insets.left,
                right: insets.right,
            };
        } catch {
            // Fallback for older React Native versions
            return {
                top: deviceUtils.hasNotch() ? 44 : 20,
                bottom: deviceUtils.hasNotch() ? 34 : 0,
                left: 0,
                right: 0,
            };
        }
    },

    // Create safe area style
    createSafeAreaStyle: (insets: SafeAreaInsets) => ({
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
    }),

    // Create safe area container
    createSafeAreaContainer: (insets: SafeAreaInsets, backgroundColor?: string) => ({
        flex: 1,
        backgroundColor,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
    }),

    // Get status bar height
    getStatusBarHeight: (): number => {
        return Platform.OS === 'ios'
            ? (deviceUtils.hasNotch() ? 44 : 20)
            : StatusBar.currentHeight || 0;
    },
};

// Keyboard utilities
export const keyboardUtils = {
    // Hook for keyboard information
    useKeyboard: () => {
        const [keyboardInfo, setKeyboardInfo] = useState<KeyboardInfo>({
            height: 0,
            duration: 0,
            easing: '',
            isVisible: false,
        });

        useEffect(() => {
            const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
                setKeyboardInfo({
                    height: e.endCoordinates.height,
                    duration: e.duration,
                    easing: e.easing,
                    isVisible: true,
                });
            });

            const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', (e) => {
                setKeyboardInfo({
                    height: 0,
                    duration: e.duration,
                    easing: e.easing,
                    isVisible: false,
                });
            });

            return () => {
                keyboardDidShowListener?.remove();
                keyboardDidHideListener?.remove();
            };
        }, []);

        return keyboardInfo;
    },

    // Create keyboard avoid view style
    createKeyboardAvoidStyle: (keyboardHeight: number, extraHeight: number = 0) => ({
        paddingBottom: keyboardHeight + extraHeight,
    }),

    // Check if keyboard is visible
    isKeyboardVisible: (keyboardInfo: KeyboardInfo): boolean => {
        return keyboardInfo.isVisible;
    },

    // Get keyboard height
    getKeyboardHeight: (keyboardInfo: KeyboardInfo): number => {
        return keyboardInfo.height;
    },
};

// Orientation utilities
export const orientationUtils = {
    // Hook for orientation information
    useOrientation: () => {
        const [orientationInfo, setOrientationInfo] = useState<OrientationInfo>(() => {
            const { width, height } = Dimensions.get('window');
            return {
                isPortrait: height > width,
                isLandscape: width > height,
                angle: 0,
            };
        });

        useEffect(() => {
            const subscription = Dimensions.addEventListener('change', ({ window }) => {
                setOrientationInfo({
                    isPortrait: window.height > window.width,
                    isLandscape: window.width > window.height,
                    angle: 0, // Could calculate angle if needed
                });
            });

            return () => {
                if (subscription && typeof subscription.remove === 'function') {
                    subscription.remove();
                }
            };
        }, []);

        return orientationInfo;
    },

    // Check if orientation changed
    isOrientationChanged: (prevOrientation: OrientationInfo, newOrientation: OrientationInfo): boolean => {
        return prevOrientation.isPortrait !== newOrientation.isPortrait;
    },

    // Get orientation-specific styles
    getOrientationStyles: (portraitStyle: any, landscapeStyle: any, isPortrait: boolean) => {
        return isPortrait ? portraitStyle : landscapeStyle;
    },
};

// App state utilities
export const appStateUtils = {
    // Hook for app state
    useAppState: () => {
        const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

        useEffect(() => {
            const subscription = AppState.addEventListener('change', (nextAppState) => {
                setAppState(nextAppState);
            });

            return () => {
                subscription?.remove();
            };
        }, []);

        return appState;
    },

    // Check if app is active
    isAppActive: (appState: AppStateStatus): boolean => {
        return appState === 'active';
    },

    // Check if app is in background
    isAppInBackground: (appState: AppStateStatus): boolean => {
        return appState === 'background';
    },
};

// Layout utilities
export const layoutUtils = {
    // Get responsive dimensions
    getResponsiveDimensions: (baseWidth: number, baseHeight: number) => {
        return (currentWidth: number, currentHeight: number) => {
            const widthRatio = currentWidth / baseWidth;
            const heightRatio = currentHeight / baseHeight;

            return {
                width: baseWidth * widthRatio,
                height: baseHeight * heightRatio,
            };
        };
    },

    // Create responsive grid
    createResponsiveGrid: (containerWidth: number, itemWidth: number, gap: number = 16) => {
        const columns = Math.floor((containerWidth + gap) / (itemWidth + gap));
        const totalGapWidth = gap * (columns - 1);
        const actualItemWidth = (containerWidth - totalGapWidth) / columns;

        return {
            columns,
            itemWidth: actualItemWidth,
            gap,
            containerWidth,
        };
    },

    // Get touch target size (minimum 44px)
    getTouchTargetSize: (size: number): number => {
        return Math.max(size, 44);
    },

    // Create spacing based on touch target
    createTouchSpacing: (baseSpacing: number) => {
        return Math.max(baseSpacing, 8); // Minimum 8px spacing for touch
    },
};

// Animation utilities for mobile
export const animationUtils = {
    // Create spring animation config for mobile
    createSpringConfig: (tension: number = 100, friction: number = 8) => ({
        tension,
        friction,
        useNativeDriver: true,
    }),

    // Create timing animation config
    createTimingConfig: (duration: number = 300, easing: string = 'easeInOut') => ({
        duration,
        easing,
        useNativeDriver: true,
    }),

    // Haptic feedback utilities
    triggerHaptic: async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
        try {
            const Haptics = await import('expo-haptics');

            switch (type) {
                case 'light':
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;
                case 'medium':
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    break;
                case 'heavy':
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    break;
                case 'success':
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    break;
                case 'warning':
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    break;
                case 'error':
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    break;
            }
        } catch (error) {
            console.log('Haptic feedback not available:', error);
        }
    },
};

// Performance utilities
export const performanceUtils = {
    // Debounce function for mobile performance
    debounce: <T extends (...args: any[]) => any>(func: T, delay: number) => {
        let timeoutId: any;

        return (...args: Parameters<T>) => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => func(...args), delay);
        };
    },

    // Throttle function for mobile performance
    throttle: <T extends (...args: any[]) => any>(func: T, delay: number) => {
        let lastCall = 0;

        return (...args: Parameters<T>) => {
            const now = new Date().getTime();
            if (now - lastCall < delay) {
                return;
            }
            lastCall = now;
            return func(...args);
        };
    },

    // Memoize expensive calculations
    memoize: <T extends (...args: any[]) => any>(func: T) => {
        const cache = new Map();

        return (...args: Parameters<T>): ReturnType<T> => {
            const key = JSON.stringify(args);
            if (cache.has(key)) {
                return cache.get(key);
            }

            const result = func(...args);
            cache.set(key, result);
            return result;
        };
    },
};

// Export all utilities
export default {
    deviceUtils,
    safeAreaUtils,
    keyboardUtils,
    orientationUtils,
    appStateUtils,
    layoutUtils,
    animationUtils,
    performanceUtils,
};