/**
 * Progressive Error Disclosure System - Main Index
 * Comprehensive entry point and integration guide
 */

// Core System Components
export { default as ProgressiveErrorDisclosure } from './components/ProgressiveErrorDisclosure';
export { default as SmartExpansion } from './components/SmartExpansion';

// Service Layer
export {
    ProgressiveDisclosureProvider,
    useProgressiveDisclosure,
    useDisclosureManager,
    useDisclosureState
} from './services/ProgressiveDisclosureManager';

export {
    BehaviorTrackingProvider,
    useBehaviorTracking,
    useUserEngagement,
    useOptimizedPreferences,
    behaviorAnalytics
} from './services/BehaviorTrackingService';

// Type Definitions
export * from './types/ProgressiveDisclosureTypes';

// Integration Components - TEMPORARILY COMMENTED OUT (accessibility layer not implemented)
// export {
//     AccessibilityIntegrationProvider,
//     useAccessibilityIntegration,
//     useAccessibilitySystem,
//     AccessibilityIntegrationUtils,
//     AccessibilityPatterns,
//     AccessibilityProvider,
//     VoiceOverProvider,
//     DynamicTypeProvider,
//     MultiModalProvider,
//     KeyboardNavigationProvider,
//     CognitiveAccessibilityProvider,
//     ErrorAnnouncementProvider,
//     AccessibilityTestingProvider
// } from '../accessibility/integration-layer';

// PayU Integration - Remove until implemented
// export {
//     PayUProgressiveDisclosure,
//     PayUProgressiveDisclosureProvider,
//     usePayUProgressiveDisclosure,
//     PayUErrorCategory,
//     PayUDisclosureLevel,
//     type PayUErrorContext,
//     type PayUGatewayResponse
// } from './integration/PayUProgressiveDisclosure';

// Testing Utilities (Excluded from production builds)
// export {
//     ProgressiveDisclosureTestSuite,
//     SmartExpansionTestSuite,
//     BehaviorTrackingTestSuite,
//     IntegrationTestSuite,
//     PerformanceTestSuite,
//     AccessibilityTestSuite,
//     ProgressiveDisclosureTestRunner,
//     testUtils
// } from './testing/ProgressiveDisclosureTestSuite';

// Note: DisclosureLevel and UserExpertiseLevel are already exported via the wildcard export on line 27
// export { DisclosureLevel, UserExpertiseLevel } from './types/ProgressiveDisclosureTypes';

/**
 * Quick Start Guide
 * 
 * 1. Basic Setup:
 * ```tsx
 * import { ProgressiveDisclosureProvider } from './progressive-disclosure';
 * 
 * function App() {
 *   return (
 *     <ProgressiveDisclosureProvider>
 *       <YourApp />
 *     </ProgressiveDisclosureProvider>
 *   );
 * }
 * ```
 * 
 * 2. Display Progressive Error:
 * ```tsx
 * import { useProgressiveDisclosure } from './progressive-disclosure';
 * 
 * function MyComponent() {
 *   const { showProgressiveError } = useProgressiveDisclosure();
 *   
 *   const handleError = (error) => {
 *     showProgressiveError(error, {
 *       userExpertise: UserExpertiseLevel.INTERMEDIATE,
 *       // ... other context
 *     });
 *   };
 * }
 * ```
 * 
 * 3. Accessibility-Enhanced Errors:
 * ```tsx
 * import { AccessibilityIntegrationProvider, useAccessibilityIntegration } from './progressive-disclosure';
 *
 * function AccessibleApp() {
 *   return (
 *     <AccessibilityIntegrationProvider>
 *       <YourApp />
 *     </AccessibilityIntegrationProvider>
 *   );
 * }
 * ```
 * 
 * 4. Behavior Tracking:
 * ```tsx
 * import { BehaviorTrackingProvider, useBehaviorTracking } from './progressive-disclosure';
 * 
 * function AnalyticsComponent() {
 *   const { getEngagementMetrics, getBehavioralInsights } = useBehaviorTracking();
 *   
 *   useEffect(() => {
 *     const metrics = getEngagementMetrics();
 *     const insights = getBehavioralInsights();
 *     // Use for analytics and optimization
 *   }, []);
 * }
 * ```
 */

/**
 * Architecture Overview
 * 
 * The Progressive Error Disclosure System consists of several interconnected layers:
 * 
 * 1. **Core Layer**: Type definitions and base interfaces
 * 2. **Service Layer**: State management and business logic
 * 3. **Component Layer**: React Native UI components
 * 4. **Integration Layer**: Accessibility, PayU, and other integrations
 * 5. **Testing Layer**: Comprehensive test utilities and suites
 * 
 * Key Features:
 * - Layered information presentation (Summary → Details → Technical → Debug)
 * - Adaptive behavior based on user expertise
 * - Smart expansion triggers
 * - Comprehensive accessibility support
 * - User behavior tracking and optimization
 * - Payment gateway-specific handling
 * - Smooth animations and transitions
 */

/**
 * Configuration Options
 */

export interface ProgressiveDisclosureConfig {
    // Animation settings
    animationSpeed: 'fast' | 'normal' | 'slow' | 'none';
    enableSmoothTransitions: boolean;

    // Accessibility settings
    respectAccessibilityPreferences: boolean;
    enableVoiceOverOptimizations: boolean;

    // Behavior tracking
    enableBehaviorTracking: boolean;
    trackUserInteractions: boolean;

    // PayU integration
    enablePayUIntegration: boolean;
    payuMerchantConfig?: PayUMerchantConfig;

    // Performance settings
    enableCaching: boolean;
    cacheTimeout: number;
    maxCachedContent: number;
}

/**
 * Default Configuration
 */
export const DEFAULT_CONFIG: ProgressiveDisclosureConfig = {
    animationSpeed: 'normal',
    enableSmoothTransitions: true,
    respectAccessibilityPreferences: true,
    enableVoiceOverOptimizations: true,
    enableBehaviorTracking: true,
    trackUserInteractions: true,
    enablePayUIntegration: false,
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    maxCachedContent: 100
};

/**
 * Global Configuration Manager
 */
class ProgressiveDisclosureConfigManager {
    private config: ProgressiveDisclosureConfig = DEFAULT_CONFIG;

    setConfig(newConfig: Partial<ProgressiveDisclosureConfig>) {
        this.config = { ...this.config, ...newConfig };
    }

    getConfig(): ProgressiveDisclosureConfig {
        return { ...this.config };
    }

    reset() {
        this.config = DEFAULT_CONFIG;
    }
}

// Global configuration instance
export const disclosureConfig = new ProgressiveDisclosureConfigManager();

/**
 * Environment-specific Configurations
 */
export const getEnvironmentConfig = (): ProgressiveDisclosureConfig => {
    if (__DEV__) {
        return {
            ...DEFAULT_CONFIG,
            animationSpeed: 'normal',
            enableBehaviorTracking: true,
            trackUserInteractions: true,
            enableCaching: false // Disable caching in development
        };
    } else if (process.env.NODE_ENV === 'test') {
        return {
            ...DEFAULT_CONFIG,
            animationSpeed: 'none',
            enableBehaviorTracking: false,
            trackUserInteractions: false,
            enableCaching: false
        };
    } else {
        // Production
        return {
            ...DEFAULT_CONFIG,
            animationSpeed: 'fast',
            enableBehaviorTracking: true,
            trackUserInteractions: true,
            enableCaching: true
        };
    }
};

import ProgressiveErrorDisclosure from './components/ProgressiveErrorDisclosure';
export default ProgressiveErrorDisclosure;