/**
 * Dynamic Type Support Infrastructure for iOS Error Presentation
 * Comprehensive Dynamic Type integration with responsive error layouts
 */

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode, useMemo } from 'react';
import {
    Dimensions,
    PixelRatio,
    Text,
    View,
    StyleSheet,
    AccessibilityInfo,
    Platform
} from 'react-native';
import { useDynamicType } from './enhanced-hooks';

// Dynamic Type configuration
export interface DynamicTypeConfig {
    enabled: boolean;
    scaleLimit: {
        min: number;
        max: number;
    };
    respectSystemSettings: boolean;
    customScales: Record<string, number>;
    progressiveScaling: boolean;
    fontLoadingStrategy: 'system' | 'custom' | 'mixed';
}

// Dynamic Type context
interface DynamicTypeContextType {
    config: DynamicTypeConfig;
    updateConfig: (newConfig: Partial<DynamicTypeConfig>) => void;
    scale: 'small' | 'medium' | 'large' | 'extraLarge';
    fontScale: number;
    getScaledSize: (baseSize: number, component?: string) => number;
    getScaledSpacing: (baseSpacing: number) => number;
    getScaledSizeForText: (baseSize: number) => number;
    getScaledSizeForButton: (baseSize: number) => number;
    getMinimumTouchTarget: () => number;
    getResponsiveLayout: (baseWidth: number, baseHeight: number) => { width: number; height: number };
    shouldTruncate: (text: string, maxLength: number) => { shouldTruncate: boolean; truncated: string };
    getAccessibilitySizes: () => {
        minimumTouchTarget: number;
        minimumTextSize: number;
        recommendedSpacing: number;
    };
    isLargeTextEnabled: boolean;
    preferLargerText: boolean;
}

// Default configuration
const DEFAULT_DYNAMIC_TYPE_CONFIG: DynamicTypeConfig = {
    enabled: true,
    scaleLimit: {
        min: 0.75,
        max: 2.0,
    },
    respectSystemSettings: true,
    customScales: {},
    progressiveScaling: true,
    fontLoadingStrategy: 'system',
};

// Context creation
const DynamicTypeContext = createContext<DynamicTypeContextType | undefined>(undefined);

// Dynamic Type provider
interface DynamicTypeProviderProps {
    children: ReactNode;
    config?: Partial<DynamicTypeConfig>;
    onScaleChange?: (scale: 'small' | 'medium' | 'large' | 'extraLarge') => void;
}

const DynamicTypeProvider: React.FC<DynamicTypeProviderProps> = ({
    children,
    config = {},
    onScaleChange,
}) => {
    const [dynamicTypeConfig, setDynamicTypeConfig] = useState<DynamicTypeConfig>({
        ...DEFAULT_DYNAMIC_TYPE_CONFIG,
        ...config,
    });

    const [currentScale, setCurrentScale] = useState<'small' | 'medium' | 'large' | 'extraLarge'>('medium');
    const [fontScale, setFontScale] = useState(1);
    const [isLargeTextEnabled, setIsLargeTextEnabled] = useState(false);
    const [preferLargerText, setPreferLargerText] = useState(false);

    // Scale detection
    const detectDynamicTypeScale = useCallback((scale: number): 'small' | 'medium' | 'large' | 'extraLarge' => {
        // Respect configured limits
        const clampedScale = Math.max(
            dynamicTypeConfig.scaleLimit.min,
            Math.min(scale, dynamicTypeConfig.scaleLimit.max)
        );

        if (clampedScale <= 0.85) return 'small';
        if (clampedScale <= 1.15) return 'medium';
        if (clampedScale <= 1.45) return 'large';
        return 'extraLarge';
    }, [dynamicTypeConfig.scaleLimit]);

    // Font scale detection
    useEffect(() => {
        const updateScale = async () => {
            try {
                const screenScale = Dimensions.get('window').scale;
                const pixelRatio = PixelRatio.get();

                // Calculate effective font scale
                let effectiveScale = screenScale;

                // Respect system preferences if enabled
                if (dynamicTypeConfig.respectSystemSettings) {
                    const isLargeText = await AccessibilityInfo.isBoldTextEnabled?.() || false;
                    setIsLargeTextEnabled(isLargeText);

                    // iOS specific scaling logic
                    if (Platform.OS === 'ios') {
                        // Get iOS accessibility font scale
                        // This would require native module integration in a real app
                    }
                }

                setFontScale(effectiveScale);
                const newScale = detectDynamicTypeScale(effectiveScale);
                setCurrentScale(newScale);

                if (onScaleChange) {
                    onScaleChange(newScale);
                }
            } catch (error) {
                console.warn('Error detecting font scale:', error);
            }
        };

        updateScale();

        // Listen for dimension changes
        const subscription = Dimensions.addEventListener('change', updateScale);

        return () => {
            subscription?.remove();
        };
    }, [dynamicTypeConfig, detectDynamicTypeScale, onScaleChange]);

    // Scaling utilities
    const getBaseScaleMultiplier = useCallback((scale: 'small' | 'medium' | 'large' | 'extraLarge'): number => {
        if (dynamicTypeConfig.customScales[scale]) {
            return dynamicTypeConfig.customScales[scale];
        }

        // Default scale multipliers
        const defaultScales = {
            small: 0.85,
            medium: 1.0,
            large: 1.15,
            extraLarge: 1.3,
        };

        return defaultScales[scale];
    }, [dynamicTypeConfig.customScales]);

    const getScaledSize = useCallback((baseSize: number, component: string = 'default'): number => {
        if (!dynamicTypeConfig.enabled) return baseSize;

        let multiplier = getBaseScaleMultiplier(currentScale);

        // Component-specific scaling
        if (dynamicTypeConfig.progressiveScaling) {
            const componentMultipliers = {
                title: 1.0,
                heading: 0.95,
                body: 1.0,
                caption: 0.9,
                button: 1.0,
                input: 1.0,
                error: 1.0,
                toast: 0.95,
                alert: 1.0,
                default: 1.0,
            };

            multiplier *= componentMultipliers[component as keyof typeof componentMultipliers] || 1.0;
        }

        const scaledSize = Math.round(baseSize * multiplier);

        // Ensure minimum accessibility sizes
        if (component === 'button' || component === 'input') {
            return Math.max(scaledSize, 16); // Minimum readable size
        }

        return scaledSize;
    }, [dynamicTypeConfig.enabled, currentScale, getBaseScaleMultiplier, dynamicTypeConfig.progressiveScaling]);

    const getScaledSpacing = useCallback((baseSpacing: number): number => {
        if (!dynamicTypeConfig.enabled) return baseSpacing;

        const multiplier = getBaseScaleMultiplier(currentScale);

        // Spacing scales more conservatively than text
        const spacingMultiplier = Math.sqrt(multiplier);
        const scaledSpacing = Math.round(baseSpacing * spacingMultiplier);

        // Ensure minimum spacing for touch targets
        return Math.max(scaledSpacing, 8);
    }, [dynamicTypeConfig.enabled, currentScale, getBaseScaleMultiplier]);

    const getScaledSizeForText = useCallback((baseSize: number): number => {
        return getScaledSize(baseSize, 'body');
    }, [getScaledSize]);

    const getScaledSizeForButton = useCallback((baseSize: number): number => {
        return getScaledSize(baseSize, 'button');
    }, [getScaledSize]);

    const getMinimumTouchTarget = useCallback((): number => {
        // iOS Human Interface Guidelines minimum touch target size
        const baseMinimum = 44; // Points

        if (dynamicTypeConfig.enabled) {
            const multiplier = getBaseScaleMultiplier(currentScale);
            return Math.round(baseMinimum * multiplier);
        }

        return baseMinimum;
    }, [dynamicTypeConfig.enabled, currentScale, getBaseScaleMultiplier]);

    const getResponsiveLayout = useCallback((baseWidth: number, baseHeight: number) => {
        if (!dynamicTypeConfig.enabled) {
            return { width: baseWidth, height: baseHeight };
        }

        const sizeMultiplier = getBaseScaleMultiplier(currentScale);
        const widthMultiplier = Math.sqrt(sizeMultiplier);
        const heightMultiplier = sizeMultiplier;

        return {
            width: Math.round(baseWidth * widthMultiplier),
            height: Math.round(baseHeight * heightMultiplier),
        };
    }, [dynamicTypeConfig.enabled, currentScale, getBaseScaleMultiplier]);

    const shouldTruncate = useCallback((text: string, maxLength: number) => {
        const maxAllowedLength = maxLength * (dynamicTypeConfig.enabled ? 1.2 : 1); // Allow 20% more for accessibility
        const shouldTruncate = text.length > maxAllowedLength;

        let truncated = text;
        if (shouldTruncate && maxAllowedLength > 3) {
            truncated = text.substring(0, Math.floor(maxAllowedLength) - 3) + '...';
        }

        return { shouldTruncate, truncated };
    }, [dynamicTypeConfig.enabled]);

    const getAccessibilitySizes = useCallback(() => {
        const multiplier = getBaseScaleMultiplier(currentScale);

        return {
            minimumTouchTarget: Math.round(44 * multiplier),
            minimumTextSize: Math.round(16 * multiplier),
            recommendedSpacing: Math.round(16 * multiplier),
        };
    }, [currentScale, getBaseScaleMultiplier]);

    const updateConfig = useCallback((newConfig: Partial<DynamicTypeConfig>) => {
        setDynamicTypeConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const contextValue: DynamicTypeContextType = {
        config: dynamicTypeConfig,
        updateConfig,
        scale: currentScale,
        fontScale,
        getScaledSize,
        getScaledSpacing,
        getScaledSizeForText,
        getScaledSizeForButton,
        getMinimumTouchTarget,
        getResponsiveLayout,
        shouldTruncate,
        getAccessibilitySizes,
        isLargeTextEnabled,
        preferLargerText,
    };

    return (
        <DynamicTypeContext.Provider value={contextValue}>
            {children}
        </DynamicTypeContext.Provider>
    );
};

// Hook to use Dynamic Type context
export const useDynamicTypeContext = (): DynamicTypeContextType => {
    const context = useContext(DynamicTypeContext);
    if (context === undefined) {
        throw new Error('useDynamicTypeContext must be used within a DynamicTypeProvider');
    }
    return context;
};

// Dynamic Type optimized components
interface ResponsiveTextProps {
    children: ReactNode;
    baseSize?: number;
    component?: string;
    accessibilityRole?: string;
    accessibilityLabel?: string;
    style?: any;
    testID?: string;
}

export const ResponsiveText: React.FC<ResponsiveTextProps> = ({
    children,
    baseSize = 16,
    component = 'body',
    accessibilityRole,
    accessibilityLabel,
    style,
    testID,
}) => {
    const { getScaledSizeForText } = useDynamicTypeContext();

    const scaledSize = getScaledSizeForText(baseSize);

    return (
        <Text
            accessible={true}
            accessibilityRole={accessibilityRole as any}
            accessibilityLabel={accessibilityLabel}
            style={[
                {
                    fontSize: scaledSize,
                    lineHeight: Math.round(scaledSize * 1.4),
                },
                style,
            ]}
            testID={testID}
        >
            {children}
        </Text>
    );
};

interface ResponsiveViewProps {
    children: ReactNode;
    baseWidth?: number;
    baseHeight?: number;
    padding?: number;
    margin?: number;
    style?: any;
    testID?: string;
}

export const ResponsiveView: React.FC<ResponsiveViewProps> = ({
    children,
    baseWidth,
    baseHeight,
    padding = 16,
    margin = 8,
    style,
    testID,
}) => {
    const { getScaledSpacing, getResponsiveLayout } = useDynamicTypeContext();

    const layout = getResponsiveLayout(baseWidth || 100, baseHeight || 50);
    const scaledPadding = getScaledSpacing(padding);
    const scaledMargin = getScaledSpacing(margin);

    return (
        <View
            style={[
                {
                    width: layout.width,
                    height: layout.height,
                    padding: scaledPadding,
                    margin: scaledMargin,
                },
                style,
            ]}
            testID={testID}
        >
            {children}
        </View>
    );
};

interface ResponsiveButtonProps {
    title: string;
    onPress: () => void;
    baseSize?: number;
    style?: any;
    accessibilityLabel?: string;
    disabled?: boolean;
    testID?: string;
}

export const ResponsiveButton: React.FC<ResponsiveButtonProps> = ({
    title,
    onPress,
    baseSize = 17,
    style,
    accessibilityLabel,
    disabled = false,
    testID,
}) => {
    const { getScaledSizeForButton, getMinimumTouchTarget } = useDynamicTypeContext();

    const scaledSize = getScaledSizeForButton(baseSize);
    const minimumTouchTarget = getMinimumTouchTarget();

    return (
        <Text
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel || title}
            onPress={onPress}
            style={[
                {
                    fontSize: scaledSize,
                    padding: Math.max(12, minimumTouchTarget / 4),
                    minHeight: minimumTouchTarget,
                    textAlign: 'center' as const,
                    backgroundColor: disabled ? '#E5E5E7' : '#007AFF',
                    color: disabled ? '#8E8E93' : '#FFFFFF',
                    borderRadius: 8,
                    overflow: 'hidden' as const,
                },
                style,
            ]}
            testID={testID}
        >
            {title}
        </Text>
    );
};

// Error-specific responsive components
interface ResponsiveErrorMessageProps {
    message: string;
    maxLength?: number;
    baseSize?: number;
    component?: 'toast' | 'alert' | 'inline' | 'screen';
    testID?: string;
}

export const ResponsiveErrorMessage: React.FC<ResponsiveErrorMessageProps> = ({
    message,
    maxLength = 200,
    baseSize = 16,
    component = 'inline',
    testID,
}) => {
    const { getScaledSize, shouldTruncate } = useDynamicTypeContext();

    const { shouldTruncate: shouldTruncateText, truncated } = shouldTruncate(message, maxLength);
    const scaledSize = getScaledSize(baseSize, 'error');

    const getComponentSpecificStyle = () => {
        switch (component) {
            case 'toast':
                return {
                    color: '#FF3B30',
                    fontWeight: '500' as const,
                };
            case 'alert':
                return {
                    color: '#FF3B30',
                    fontWeight: '600' as const,
                    textAlign: 'center' as const,
                };
            case 'screen':
                return {
                    color: '#FF3B30',
                    fontWeight: '600' as const,
                    textAlign: 'center' as const,
                };
            default:
                return {
                    color: '#FF3B30',
                    fontWeight: '500' as const,
                };
        }
    };

    return (
        <Text
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={shouldTruncateText ? `${truncated} (error message truncated)` : message}
            style={[
                {
                    fontSize: scaledSize,
                    lineHeight: Math.round(scaledSize * 1.4),
                    ...getComponentSpecificStyle(),
                },
            ]}
            testID={testID}
        >
            {truncated}
        </Text>
    );
};

// Style helpers for Dynamic Type
export const createDynamicTypeStyles = (scale: 'small' | 'medium' | 'large' | 'extraLarge') => {
    return StyleSheet.create({
        container: {
            flex: 1,
            padding: scale === 'extraLarge' ? 24 : 16,
        },
        text: {
            fontSize: scale === 'extraLarge' ? 20 : 16,
            lineHeight: scale === 'extraLarge' ? 28 : 22,
        },
        button: {
            minHeight: scale === 'extraLarge' ? 56 : 48,
            padding: scale === 'extraLarge' ? 16 : 12,
            borderRadius: 8,
        },
        input: {
            minHeight: scale === 'extraLarge' ? 56 : 44,
            padding: scale === 'extraLarge' ? 16 : 12,
            fontSize: scale === 'extraLarge' ? 18 : 16,
            borderRadius: 8,
        },
    });
};

// High contrast mode utilities
export const getHighContrastTextSize = (baseSize: number, scale: 'small' | 'medium' | 'large' | 'extraLarge'): number => {
    // Increase font size for better readability in high contrast mode
    const contrastMultiplier = 1.1;
    return Math.round(baseSize * contrastMultiplier);
};

// Reduced motion with Dynamic Type
export const getReducedMotionAnimation = (duration: number, scale: 'small' | 'medium' | 'large' | 'extraLarge'): number => {
    // Faster animations for larger text sizes to maintain responsiveness
    const multiplier = {
        small: 0.8,
        medium: 1.0,
        large: 1.2,
        extraLarge: 1.4,
    };
    return Math.round(duration * multiplier[scale]);
};

export default DynamicTypeProvider;