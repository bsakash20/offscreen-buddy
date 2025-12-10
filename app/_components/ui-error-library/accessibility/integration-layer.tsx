/**
 * Integration Layer for Accessibility-Compliant Error Presentation System
 * Seamlessly integrates all accessibility systems with existing UI components
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

// Integration configuration
export interface AccessibilityIntegrationConfig {
    enabled: boolean;
    providers: {
        accessibility: boolean;
        voiceOver: boolean;
        dynamicType: boolean;
        multiModal: boolean;
        keyboardNavigation: boolean;
        cognitiveAccessibility: boolean;
        errorAnnouncements: boolean;
        testing: boolean;
    };
    autoEnhance: {
        existingComponents: boolean;
        errorComponents: boolean;
        inputComponents: boolean;
        navigationComponents: boolean;
    };
    features: {
        wcagCompliance: boolean;
        iosGuidelines: boolean;
        voiceOverOptimized: boolean;
        keyboardAccessible: boolean;
        cognitivelyAccessible: boolean;
    };
}

// Integration state
interface AccessibilityIntegrationState {
    isInitialized: boolean;
    activeProviders: string[];
    config: AccessibilityIntegrationConfig;
    version: string;
}

// Integration context
interface AccessibilityIntegrationContextType {
    config: AccessibilityIntegrationConfig;
    state: AccessibilityIntegrationState;
    updateConfig: (newConfig: Partial<AccessibilityIntegrationConfig>) => void;
    getActiveProvider: (name: string) => any;
    isProviderActive: (name: string) => boolean;
    initialize: () => Promise<void>;
    shutdown: () => void;
}

// Context creation
const AccessibilityIntegrationContext = createContext<AccessibilityIntegrationContextType | undefined>(undefined);

// Default configuration
const DEFAULT_ACCESSIBILITY_INTEGRATION_CONFIG: AccessibilityIntegrationConfig = {
    enabled: true,
    providers: {
        accessibility: true,
        voiceOver: true,
        dynamicType: true,
        multiModal: true,
        keyboardNavigation: true,
        cognitiveAccessibility: true,
        errorAnnouncements: true,
        testing: __DEV__, // Only enable testing in development
    },
    autoEnhance: {
        existingComponents: true,
        errorComponents: true,
        inputComponents: true,
        navigationComponents: true,
    },
    features: {
        wcagCompliance: true,
        iosGuidelines: true,
        voiceOverOptimized: true,
        keyboardAccessible: true,
        cognitivelyAccessible: true,
    },
};

// Provider component
interface AccessibilityIntegrationProviderProps {
    children: ReactNode;
    config?: Partial<AccessibilityIntegrationConfig>;
    onInitialize?: (state: AccessibilityIntegrationState) => void;
}

const AccessibilityIntegrationProvider: React.FC<AccessibilityIntegrationProviderProps> = ({
    children,
    config = {},
    onInitialize,
}) => {
    const [integrationConfig, setIntegrationConfig] = React.useState<AccessibilityIntegrationConfig>({
        ...DEFAULT_ACCESSIBILITY_INTEGRATION_CONFIG,
        ...config,
    });

    const [integrationState, setIntegrationState] = React.useState<AccessibilityIntegrationState>({
        isInitialized: false,
        activeProviders: [],
        config: integrationConfig,
        version: '1.0.0',
    });

    // Update configuration
    const updateConfig = React.useCallback((newConfig: Partial<AccessibilityIntegrationConfig>) => {
        setIntegrationConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    // Check if provider is active
    const isProviderActive = React.useCallback((name: string): boolean => {
        return integrationConfig.providers[name as keyof typeof integrationConfig.providers] || false;
    }, [integrationConfig.providers]);

    // Get active provider
    const getActiveProvider = React.useCallback((name: string) => {
        const providerMap = {
            accessibility: AccessibilityProvider,
            voiceOver: VoiceOverProvider,
            dynamicType: DynamicTypeProvider,
            multiModal: MultiModalProvider,
            keyboardNavigation: KeyboardNavigationProvider,
            cognitiveAccessibility: CognitiveAccessibilityProvider,
            errorAnnouncements: ErrorAnnouncementProvider,
            testing: AccessibilityTestingProvider,
        };

        return providerMap[name as keyof typeof providerMap];
    }, []);

    // Initialize integration
    const initialize = React.useCallback(async () => {
        const activeProviders = Object.entries(integrationConfig.providers)
            .filter(([_, enabled]) => enabled)
            .map(([name, _]) => name);

        setIntegrationState(prev => ({
            ...prev,
            isInitialized: true,
            activeProviders,
        }));

        onInitialize?.({
            isInitialized: true,
            activeProviders,
            config: integrationConfig,
            version: '1.0.0',
        });
    }, [integrationConfig.providers, integrationConfig, onInitialize]);

    // Shutdown integration
    const shutdown = React.useCallback(() => {
        setIntegrationState(prev => ({
            ...prev,
            isInitialized: false,
            activeProviders: [],
        }));
    }, []);

    // Auto-initialize on mount
    React.useEffect(() => {
        if (integrationConfig.enabled) {
            initialize();
        }
    }, [integrationConfig.enabled, initialize]);

    // Provider composition
    const renderProviders = React.useCallback((children: ReactNode, providerList: string[]): ReactNode => {
        let wrappedChildren = children;

        // Render providers in reverse order (innermost first)
        for (let i = providerList.length - 1; i >= 0; i--) {
            const providerName = providerList[i];
            const ProviderComponent = getActiveProvider(providerName);

            if (ProviderComponent) {
                wrappedChildren = React.createElement(ProviderComponent, {
                    children: wrappedChildren,
                });
            }
        }

        return wrappedChildren;
    }, [getActiveProvider]);

    // Main provider wrapper
    const ProviderWrapper = React.useCallback(({ children: providerChildren }: { children: ReactNode }) => {
        if (!integrationConfig.enabled) {
            return <>{providerChildren}</>;
        }

        const activeProviders = integrationState.activeProviders;

        // Wrap existing components with enhancements if enabled
        let enhancedChildren = providerChildren;

        if (integrationConfig.autoEnhance.existingComponents) {
            enhancedChildren = React.createElement(EnhancedComponentWrapper, {
                children: enhancedChildren,
                config: integrationConfig,
            });
        }

        return renderProviders(enhancedChildren, activeProviders);
    }, [
        integrationConfig.enabled,
        integrationConfig.autoEnhance.existingComponents,
        integrationState.activeProviders,
        renderProviders,
    ]);

    const contextValue: AccessibilityIntegrationContextType = {
        config: integrationConfig,
        state: integrationState,
        updateConfig,
        getActiveProvider,
        isProviderActive,
        initialize,
        shutdown,
    };

    return (
        <AccessibilityIntegrationContext.Provider value={contextValue}>
            <ProviderWrapper>
                {children}
            </ProviderWrapper>
        </AccessibilityIntegrationContext.Provider>
    );
};

// Enhanced component wrapper
interface EnhancedComponentWrapperProps {
    children: ReactNode;
    config: AccessibilityIntegrationConfig;
}

const EnhancedComponentWrapper: React.FC<EnhancedComponentWrapperProps> = ({
    children,
    config,
}) => {
    // This wrapper would enhance existing components with accessibility features
    // In a real implementation, this would use React's cloneElement to add props
    // or use higher-order components to wrap the children

    return <>{children}</>;
};

// Hook to use accessibility integration
export const useAccessibilityIntegration = (): AccessibilityIntegrationContextType => {
    const context = useContext(AccessibilityIntegrationContext);
    if (context === undefined) {
        throw new Error('useAccessibilityIntegration must be used within an AccessibilityIntegrationProvider');
    }
    return context;
};

// Quick access hooks for individual accessibility systems
export const useAccessibilitySystem = (systemName: keyof AccessibilityIntegrationConfig['providers']) => {
    const { isProviderActive, getActiveProvider } = useAccessibilityIntegration();
    return {
        isActive: isProviderActive(systemName),
        Provider: getActiveProvider(systemName),
    };
};

// Utility functions for easy integration
export const AccessibilityIntegrationUtils = {
    // Create an enhanced error handler
    createEnhancedErrorHandler: (baseHandler: (error: any) => void) => {
        return (error: any) => {
            // Add accessibility context
            const enhancedError = {
                ...error,
                accessibilityContext: {
                    timestamp: new Date(),
                    userContext: 'unknown', // Would be populated from user context
                    screenContext: 'error-handler',
                    requiresAnnouncement: true,
                },
            };

            // Call base handler
            baseHandler(enhancedError);
        };
    },

    // Create an accessibility-aware component
    createAccessibilityAwareComponent: <P extends object>(
        Component: React.ComponentType<P>,
        accessibilityOptions: {
            role?: string;
            label?: string;
            hint?: string;
            traits?: string[];
        }
    ) => {
        return (props: P) => {
            const accessibilityProps = {
                accessible: true,
                accessibilityRole: accessibilityOptions.role,
                accessibilityLabel: accessibilityOptions.label,
                accessibilityHint: accessibilityOptions.hint,
                accessibilityTraits: accessibilityOptions.traits,
            };

            return React.createElement(Component, { ...props, ...accessibilityProps });
        };
    },

    // Create accessibility-enhanced error UI
    createEnhancedErrorUI: (errorType: string) => {
        const enhancementMap = {
            validation: {
                role: 'alert',
                traits: ['error'],
                cognitiveSimplification: true,
                keyboardNavigation: true,
            },
            network: {
                role: 'alert',
                traits: ['error', 'connection'],
                retryable: true,
                multiModalFeedback: true,
            },
            authentication: {
                role: 'alert',
                traits: ['error', 'security'],
                progressiveDisclosure: true,
                voiceOverOptimization: true,
            },
        };

        return enhancementMap[errorType as keyof typeof enhancementMap] || {
            role: 'alert',
            traits: ['error'],
        };
    },

    // Pre-configured accessibility props for common error types
    getErrorAccessibilityProps: (errorType: string, severity: 'low' | 'medium' | 'high' | 'critical') => {
        const baseProps = {
            accessible: true,
            accessibilityRole: 'alert' as const,
        };

        const severityProps = {
            low: {
                accessibilityLabel: `${errorType} notice`,
                accessibilityHint: 'This is a minor notice that may not require immediate action',
            },
            medium: {
                accessibilityLabel: `${errorType} warning`,
                accessibilityHint: 'This warning requires attention but is not critical',
            },
            high: {
                accessibilityLabel: `${errorType} error`,
                accessibilityHint: 'This error needs to be resolved before continuing',
            },
            critical: {
                accessibilityLabel: `Critical ${errorType} error`,
                accessibilityHint: 'This critical error requires immediate attention and may block functionality',
            },
        };

        return {
            ...baseProps,
            ...severityProps[severity],
        };
    },

    // Check if accessibility features should be applied based on context
    shouldApplyAccessibility: (context: {
        userAgent?: string;
        platform?: string;
        environment?: string;
        accessibilityEnabled?: boolean;
    }) => {
        // Always apply accessibility features in development
        if (context.environment === 'development') return true;

        // Apply based on platform capabilities
        if (context.platform === 'ios') return true;

        // Respect user accessibility preferences
        return context.accessibilityEnabled || false;
    },
};

// Pre-built accessibility patterns
export const AccessibilityPatterns = {
    // Error message pattern
    errorMessage: (title: string, message: string, actions?: string[]) => ({
        title,
        message,
        accessibility: {
            label: `${title}: ${message}`,
            hint: actions && actions.length > 0
                ? `Available actions: ${actions.join(', ')}`
                : undefined,
            role: 'alert' as const,
        },
    }),

    // Toast notification pattern
    toastNotification: (type: 'success' | 'warning' | 'error' | 'info', message: string) => ({
        type,
        message,
        accessibility: {
            label: `${type} notification: ${message}`,
            role: 'status' as const,
            liveRegion: 'polite' as const,
        },
    }),

    // Error screen pattern
    errorScreen: (
        type: 'network' | 'server' | 'validation' | 'authentication',
        title: string,
        message: string,
        actions: { title: string; handler: () => void }[]
    ) => ({
        type,
        title,
        message,
        actions: actions.map(action => ({
            ...action,
            accessibility: {
                label: action.title,
                role: 'button' as const,
            },
        })),
        accessibility: {
            label: `${type} error screen: ${title}. ${message}`,
            role: 'alert' as const,
        },
    }),

    // Input error pattern
    inputError: (fieldName: string, error: string, fixAction?: string) => ({
        fieldName,
        error,
        fixAction,
        accessibility: {
            label: `${fieldName} input error: ${error}`,
            hint: fixAction
                ? `Error in ${fieldName} field. ${fixAction}`
                : `Error in ${fieldName} field`,
            role: 'alert' as const,
        },
    }),
};

// Export all providers for individual use
export {
    AccessibilityProvider,
    VoiceOverProvider,
    DynamicTypeProvider,
    MultiModalProvider,
    KeyboardNavigationProvider,
    CognitiveAccessibilityProvider,
    ErrorAnnouncementProvider,
    AccessibilityTestingProvider,
};

// Export existing UI managers (placeholder exports)
export const AlertManager = null;
export const ToastManager = null;
export const ErrorScreenManager = null;
export const InlineErrorManager = null;

export default AccessibilityIntegrationProvider;