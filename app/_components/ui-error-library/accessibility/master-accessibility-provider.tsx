/**
 * Master Accessibility Provider for iOS Error Presentation System
 * Unified provider that integrates all accessibility systems seamlessly
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { Platform } from 'react-native';

// Import all accessibility providers
import AccessibilityProvider from '../components/accessibility/AccessibilityProvider';
import VoiceOverProvider from './voiceover-system';
import DynamicTypeProvider from './dynamic-type-system';
import MultiModalProvider from './multi-modal-system';
import KeyboardNavigationProvider from './keyboard-navigation-system';
import CognitiveAccessibilityProvider from './cognitive-accessibility-system';
import ErrorAnnouncementProvider from './error-announcement-system';
import AccessibilityTestingProvider from './accessibility-testing-utilities';
import HighContrastMotionProvider from './high-contrast-motion-system';
import ValidationLintingProvider from './validation-linting-tools';
import IntegrationLayer from './integration-layer';

// Master accessibility configuration
export interface MasterAccessibilityConfig {
    enabled: boolean;
    environment: 'development' | 'staging' | 'production';
    providers: {
        core: boolean;              // Base accessibility provider
        voiceOver: boolean;         // VoiceOver optimization
        dynamicType: boolean;       // Dynamic Type support
        multiModal: boolean;        // Multi-modal feedback
        keyboardNavigation: boolean; // Keyboard & switch control
        cognitive: boolean;         // Cognitive accessibility
        errorAnnouncements: boolean; // Error announcement system
        testing: boolean;           // Testing utilities
        highContrast: boolean;      // High contrast & motion
        validation: boolean;        // Validation & linting
        integration: boolean;       // Integration layer
    };
    features: {
        wcagCompliance: 'A' | 'AA' | 'AAA';
        iosGuidelines: boolean;
        autoEnhance: boolean;
        debugMode: boolean;
        performance: boolean;
    };
    settings: {
        respectUserPreferences: boolean;
        adaptiveBehavior: boolean;
        fallbackStrategies: boolean;
        errorRecovery: boolean;
    };
}

// Master accessibility state
interface MasterAccessibilityState {
    isInitialized: boolean;
    activeProviders: string[];
    config: MasterAccessibilityConfig;
    version: string;
    compatibility: {
        ios: string;
        reactNative: string;
        accessibility: string;
    };
    features: {
        voiceOver: boolean;
        dynamicType: boolean;
        keyboardNavigation: boolean;
        screenReader: boolean;
        highContrast: boolean;
        reducedMotion: boolean;
    };
}

// Master accessibility context
interface MasterAccessibilityContextType {
    config: MasterAccessibilityConfig;
    state: MasterAccessibilityState;
    updateConfig: (newConfig: Partial<MasterAccessibilityConfig>) => void;
    isEnabled: () => boolean;
    getActiveProviders: () => string[];
    getFeatureStatus: () => MasterAccessibilityState['features'];
    initialize: () => Promise<void>;
    shutdown: () => void;
    getSystemHealth: () => {
        overall: 'healthy' | 'degraded' | 'critical';
        providers: Record<string, 'active' | 'inactive' | 'error'>;
        issues: string[];
        recommendations: string[];
    };
}

// Context creation
const MasterAccessibilityContext = createContext<MasterAccessibilityContextType | undefined>(undefined);

// Default configuration
const DEFAULT_MASTER_ACCESSIBILITY_CONFIG: MasterAccessibilityConfig = {
    enabled: true,
    environment: __DEV__ ? 'development' : 'production',
    providers: {
        core: true,
        voiceOver: true,
        dynamicType: true,
        multiModal: true,
        keyboardNavigation: true,
        cognitive: true,
        errorAnnouncements: true,
        testing: __DEV__, // Only in development
        highContrast: true,
        validation: __DEV__, // Only in development
        integration: true,
    },
    features: {
        wcagCompliance: 'AA',
        iosGuidelines: true,
        autoEnhance: true,
        debugMode: __DEV__,
        performance: true,
    },
    settings: {
        respectUserPreferences: true,
        adaptiveBehavior: true,
        fallbackStrategies: true,
        errorRecovery: true,
    },
};

// Provider component
interface MasterAccessibilityProviderProps {
    children: ReactNode;
    config?: Partial<MasterAccessibilityConfig>;
    onInitialize?: (state: MasterAccessibilityState) => void;
    onError?: (error: Error) => void;
}

const MasterAccessibilityProvider: React.FC<MasterAccessibilityProviderProps> = ({
    children,
    config = {},
    onInitialize,
    onError,
}) => {
    const [masterConfig, setMasterConfig] = React.useState<MasterAccessibilityConfig>({
        ...DEFAULT_MASTER_ACCESSIBILITY_CONFIG,
        ...config,
    });

    const [masterState, setMasterState] = React.useState<MasterAccessibilityState>({
        isInitialized: false,
        activeProviders: [],
        config: masterConfig,
        version: '1.0.0',
        compatibility: {
            ios: '13.0+',
            reactNative: '0.71+',
            accessibility: 'WCAG 2.1 AA',
        },
        features: {
            voiceOver: false,
            dynamicType: false,
            keyboardNavigation: false,
            screenReader: false,
            highContrast: false,
            reducedMotion: false,
        },
    });

    // Update configuration
    const updateConfig = React.useCallback((newConfig: Partial<MasterAccessibilityConfig>) => {
        setMasterConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    // Check if system is enabled
    const isEnabled = React.useCallback((): boolean => {
        return masterConfig.enabled && Platform.OS === 'ios';
    }, [masterConfig.enabled]);

    // Get active providers
    const getActiveProviders = React.useCallback((): string[] => {
        return Object.entries(masterConfig.providers)
            .filter(([_, enabled]) => enabled)
            .map(([name, _]) => name);
    }, [masterConfig.providers]);

    // Get feature status
    const getFeatureStatus = React.useCallback((): MasterAccessibilityState['features'] => {
        return masterState.features;
    }, [masterState.features]);

    // Initialize master system
    const initialize = React.useCallback(async () => {
        if (!isEnabled()) {
            console.log('Master Accessibility System disabled');
            return;
        }

        try {
            const activeProviders = getActiveProviders();

            setMasterState(prev => ({
                ...prev,
                isInitialized: true,
                activeProviders,
            }));

            // Initialize feature detection
            setTimeout(() => {
                setMasterState(prev => ({
                    ...prev,
                    features: {
                        voiceOver: masterConfig.providers.voiceOver,
                        dynamicType: masterConfig.providers.dynamicType,
                        keyboardNavigation: masterConfig.providers.keyboardNavigation,
                        screenReader: masterConfig.providers.voiceOver,
                        highContrast: masterConfig.providers.highContrast,
                        reducedMotion: masterConfig.providers.highContrast,
                    },
                }));
            }, 1000);

            onInitialize?.({
                ...masterState,
                isInitialized: true,
                activeProviders,
            });

            console.log('🎯 Master Accessibility System initialized:', {
                providers: activeProviders.length,
                features: Object.values(masterState.features).filter(Boolean).length,
                environment: masterConfig.environment,
            });

        } catch (error) {
            console.error('Failed to initialize Master Accessibility System:', error);
            onError?.(error as Error);
        }
    }, [isEnabled, getActiveProviders, masterConfig, masterState, onInitialize, onError]);

    // Shutdown system
    const shutdown = React.useCallback(() => {
        setMasterState(prev => ({
            ...prev,
            isInitialized: false,
            activeProviders: [],
        }));
    }, []);

    // System health check
    const getSystemHealth = React.useCallback(() => {
        const activeProviders = getActiveProviders();
        const totalProviders = Object.keys(masterConfig.providers).length;
        const healthPercentage = (activeProviders.length / totalProviders) * 100;

        let overall: 'healthy' | 'degraded' | 'critical';
        if (healthPercentage >= 90) {
            overall = 'healthy';
        } else if (healthPercentage >= 70) {
            overall = 'degraded';
        } else {
            overall = 'critical';
        }

        const providerStatus = Object.entries(masterConfig.providers).reduce((acc, [name, enabled]) => {
            acc[name] = enabled ? 'active' : 'inactive';
            return acc;
        }, {} as Record<string, 'active' | 'inactive' | 'error'>);

        const issues: string[] = [];
        const recommendations: string[] = [];

        if (healthPercentage < 100) {
            issues.push(`${totalProviders - activeProviders.length} accessibility providers disabled`);
            recommendations.push('Enable all accessibility providers for full compliance');
        }

        if (!masterConfig.features.wcagCompliance) {
            issues.push('WCAG compliance not configured');
            recommendations.push('Set WCAG compliance level to AA or AAA');
        }

        if (masterConfig.environment === 'production' && masterConfig.features.debugMode) {
            issues.push('Debug mode enabled in production');
            recommendations.push('Disable debug mode in production environment');
        }

        return {
            overall,
            providers: providerStatus,
            issues,
            recommendations,
        };
    }, [masterConfig, getActiveProviders]);

    // Auto-initialize on mount
    React.useEffect(() => {
        if (isEnabled()) {
            initialize();
        }
    }, [isEnabled, initialize]);

    // Provider composition - wrap all providers in correct order
    const renderProviders = React.useCallback((children: ReactNode): ReactNode => {
        if (!isEnabled()) {
            return <>{children}</>;
        }

        let wrappedChildren = children;

        // Apply providers in dependency order (innermost first)
        const providerChain = [
            { name: 'integration', Provider: IntegrationLayer, config: {} },
            { name: 'validation', Provider: ValidationLintingProvider, config: {} },
            { name: 'testing', Provider: AccessibilityTestingProvider, config: {} },
            { name: 'highContrast', Provider: HighContrastMotionProvider, config: {} },
            { name: 'errorAnnouncements', Provider: ErrorAnnouncementProvider, config: {} },
            { name: 'cognitive', Provider: CognitiveAccessibilityProvider, config: {} },
            { name: 'keyboardNavigation', Provider: KeyboardNavigationProvider, config: {} },
            { name: 'multiModal', Provider: MultiModalProvider, config: {} },
            { name: 'dynamicType', Provider: DynamicTypeProvider, config: {} },
            { name: 'voiceOver', Provider: VoiceOverProvider, config: {} },
            { name: 'core', Provider: AccessibilityProvider, config: {} },
        ];

        // Only render enabled providers
        const enabledProviders = providerChain.filter(({ name }) =>
            masterConfig.providers[name as keyof typeof masterConfig.providers]
        );

        // Render providers in reverse order (outermost first)
        for (let i = enabledProviders.length - 1; i >= 0; i--) {
            const { Provider, config: providerConfig } = enabledProviders[i];
            wrappedChildren = React.createElement(Provider, {
                children: wrappedChildren,
                ...providerConfig,
            });
        }

        return wrappedChildren;
    }, [isEnabled, masterConfig.providers]);

    const contextValue: MasterAccessibilityContextType = {
        config: masterConfig,
        state: masterState,
        updateConfig,
        isEnabled,
        getActiveProviders,
        getFeatureStatus,
        initialize,
        shutdown,
        getSystemHealth,
    };

    return (
        <MasterAccessibilityContext.Provider value={contextValue}>
            {renderProviders(children)}
        </MasterAccessibilityContext.Provider>
    );
};

// Hook to use master accessibility context
export const useMasterAccessibility = (): MasterAccessibilityContextType => {
    const context = useContext(MasterAccessibilityContext);
    if (context === undefined) {
        throw new Error('useMasterAccessibility must be used within a MasterAccessibilityProvider');
    }
    return context;
};

// Convenience hooks for common accessibility features
export const useAccessibility = () => {
    const { getFeatureStatus, getSystemHealth } = useMasterAccessibility();
    return {
        features: getFeatureStatus(),
        health: getSystemHealth(),
        isEnabled: true,
    };
};

export const useErrorAccessibility = () => {
    const { state } = useMasterAccessibility();
    return {
        voiceOver: state.features.voiceOver,
        dynamicType: state.features.dynamicType,
        keyboardNavigation: state.features.keyboardNavigation,
        highContrast: state.features.highContrast,
        reducedMotion: state.features.reducedMotion,
    };
};

// Quick setup component for easy integration
interface AccessibilitySetupProps {
    children: ReactNode;
    level?: 'basic' | 'standard' | 'comprehensive';
    environment?: 'development' | 'production';
    customConfig?: Partial<MasterAccessibilityConfig>;
}

export const AccessibilitySetup: React.FC<AccessibilitySetupProps> = ({
    children,
    level = 'standard',
    environment = __DEV__ ? 'development' : 'production',
    customConfig = {},
}) => {
    const getConfigByLevel = (): Partial<MasterAccessibilityConfig> => {
        switch (level) {
            case 'basic':
                return {
                    providers: {
                        core: true,
                        voiceOver: true,
                        dynamicType: true,
                        keyboardNavigation: true,
                        multiModal: false,
                        cognitive: false,
                        errorAnnouncements: true,
                        testing: false,
                        highContrast: true,
                        validation: false,
                        integration: true,
                    },
                    features: {
                        wcagCompliance: 'A',
                        iosGuidelines: true,
                        autoEnhance: true,
                        debugMode: environment === 'development',
                        performance: true,
                    },
                };

            case 'comprehensive':
                return {
                    providers: {
                        core: true,
                        voiceOver: true,
                        dynamicType: true,
                        keyboardNavigation: true,
                        multiModal: true,
                        cognitive: true,
                        errorAnnouncements: true,
                        testing: environment === 'development',
                        highContrast: true,
                        validation: environment === 'development',
                        integration: true,
                    },
                    features: {
                        wcagCompliance: 'AAA',
                        iosGuidelines: true,
                        autoEnhance: true,
                        debugMode: environment === 'development',
                        performance: true,
                    },
                };

            case 'standard':
            default:
                return {
                    providers: {
                        core: true,
                        voiceOver: true,
                        dynamicType: true,
                        keyboardNavigation: true,
                        multiModal: true,
                        cognitive: true,
                        errorAnnouncements: true,
                        testing: environment === 'development',
                        highContrast: true,
                        validation: environment === 'development',
                        integration: true,
                    },
                    features: {
                        wcagCompliance: 'AA',
                        iosGuidelines: true,
                        autoEnhance: true,
                        debugMode: environment === 'development',
                        performance: true,
                    },
                };
        }
    };

    return (
        <MasterAccessibilityProvider
            config={{
                environment,
                ...getConfigByLevel(),
                ...customConfig,
            }}
        >
            {children}
        </MasterAccessibilityProvider>
    );
};

// Export all individual providers for advanced usage
export {
    AccessibilityProvider,
    VoiceOverProvider,
    DynamicTypeProvider,
    MultiModalProvider,
    KeyboardNavigationProvider,
    CognitiveAccessibilityProvider,
    ErrorAnnouncementProvider,
    AccessibilityTestingProvider,
    HighContrastMotionProvider,
    ValidationLintingProvider,
    IntegrationLayer,
};

export default MasterAccessibilityProvider;