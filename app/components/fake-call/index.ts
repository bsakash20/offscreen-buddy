/**
 * Fake Call Components Index
 * Central export file for all fake call UI components including accessibility features
 */

// Import all components
import FakeCallSettingsScreen from './FakeCallSettingsScreen';
import CallFrequencyConfig from './CallFrequencyConfig';
import VoiceProfileSettings from './VoiceProfileSettings';
import CallerIDManager from './CallerIDManager';
import ProTierFeatureGate from './ProTierFeatureGate';
import FakeCallToggle from './FakeCallToggle';
import CallSchedulePreview from './CallSchedulePreview';

// Phone Interface Components
import PhoneCallInterface from './PhoneCallInterface';
import { CallStateIndicator } from './CallStateIndicator';
import { CallScreenAnimations } from './CallScreenAnimations';
import { CallInteractionHandler } from './CallInteractionHandler';
import { iOSCallKitIntegration } from './iOSCallKitIntegration';
import { AndroidTelecomIntegration } from './AndroidTelecomIntegration';
import { WebPhoneInterface } from './WebPhoneInterface';

// Accessibility Components
import AccessibleCallScreen from './AccessibleCallScreen';
import FakeCallAnnouncements from './FakeCallAnnouncements';
import MotorAccessibilityEnhancements from './MotorAccessibilityEnh';
import HighContrastCallInterface from './HighContrast';
import ScreenReaderCallControls from './ScreenReaderCallControls';

// Import types
import type {
    FakeCallSettings,
    FakeCallSettingsScreenProps
} from './FakeCallSettingsScreen';

import type { CallFrequencyConfigProps } from './CallFrequencyConfig';
import type { VoiceProfileSettingsProps } from './VoiceProfileSettings';
import type { CallerIDManagerProps } from './CallerIDManager';
import type { CallSchedulePreviewProps } from './CallSchedulePreview';
import type { ProTierFeatureGateProps } from './ProTierFeatureGate';
import type { FakeCallToggleProps } from './FakeCallToggle';

// Phone Interface Types
import type * as PhoneInterfaceTypes from './types';
import type { PhoneCallInterfaceProps } from './PhoneCallInterface';
import type { CallStateIndicatorProps } from './CallStateIndicator';
import type { CallScreenAnimationsProps } from './CallScreenAnimations';
import type { CallInteractionHandlerProps } from './CallInteractionHandler';
import type { iOSCallKitIntegrationProps } from './iOSCallKitIntegration';
import type { AndroidTelecomIntegrationProps } from './AndroidTelecomIntegration';
import type { WebPhoneInterfaceProps } from './WebPhoneInterface';

// Accessibility Component Types
import type { AccessibleCallScreenProps } from './AccessibleCallScreen';
import type { AnnouncementConfig, CallAnnouncementEvent, FakeCallAnnouncementsProps } from './FakeCallAnnouncements';
import type { MotorAccessibilityConfig, InteractionMode, MotorAccessibilityEnhancementsProps } from './MotorAccessibilityEnh';
import type { HighContrastTheme, HighContrastCallInterfaceProps } from './HighContrast';
import type { ScreenReaderCallControlConfig, ScreenReaderCallControlsProps } from './ScreenReaderCallControls';

// Main settings screen
export { default as FakeCallSettingsScreen } from './FakeCallSettingsScreen';
export type {
    FakeCallSettings,
    FakeCallSettingsScreenProps
} from './FakeCallSettingsScreen';

// Configuration components
export { default as CallFrequencyConfig } from './CallFrequencyConfig';
export type { CallFrequencyConfigProps } from './CallFrequencyConfig';

export { default as VoiceProfileSettings } from './VoiceProfileSettings';
export type { VoiceProfileSettingsProps } from './VoiceProfileSettings';

export { default as CallerIDManager } from './CallerIDManager';
export type { CallerIDManagerProps } from './CallerIDManager';

// Feature gating and controls
export { default as ProTierFeatureGate } from './ProTierFeatureGate';
export type { ProTierFeatureGateProps } from './ProTierFeatureGate';

export { default as FakeCallToggle } from './FakeCallToggle';
export type { FakeCallToggleProps } from './FakeCallToggle';

// Preview and visualization
export { default as CallSchedulePreview } from './CallSchedulePreview';
export type { CallSchedulePreviewProps } from './CallSchedulePreview';

// Phone Interface Components
export { default as PhoneCallInterface } from './PhoneCallInterface';
export type { PhoneCallInterfaceProps } from './PhoneCallInterface';

export { CallStateIndicator } from './CallStateIndicator';
export type { CallStateIndicatorProps } from './CallStateIndicator';

export { CallScreenAnimations } from './CallScreenAnimations';
export type { CallScreenAnimationsProps } from './CallScreenAnimations';

export { CallInteractionHandler } from './CallInteractionHandler';
export type { CallInteractionHandlerProps } from './CallInteractionHandler';

export { iOSCallKitIntegration } from './iOSCallKitIntegration';
export type { iOSCallKitIntegrationProps } from './iOSCallKitIntegration';

export { AndroidTelecomIntegration } from './AndroidTelecomIntegration';
export type { AndroidTelecomIntegrationProps } from './AndroidTelecomIntegration';

export { WebPhoneInterface } from './WebPhoneInterface';
export type { WebPhoneInterfaceProps } from './WebPhoneInterface';

// Accessibility Components
export { default as AccessibleCallScreen } from './AccessibleCallScreen';
export type { AccessibleCallScreenProps } from './AccessibleCallScreen';

export { default as FakeCallAnnouncements } from './FakeCallAnnouncements';
export type { AnnouncementConfig, CallAnnouncementEvent, FakeCallAnnouncementsProps } from './FakeCallAnnouncements';

export { default as MotorAccessibilityEnhancements } from './MotorAccessibilityEnh';
export type { MotorAccessibilityConfig, InteractionMode, MotorAccessibilityEnhancementsProps } from './MotorAccessibilityEnh';

export { default as HighContrastCallInterface } from './HighContrast';
export type { HighContrastTheme, HighContrastCallInterfaceProps } from './HighContrast';

export { default as ScreenReaderCallControls } from './ScreenReaderCallControls';
export type { ScreenReaderCallControlConfig, ScreenReaderCallControlsProps } from './ScreenReaderCallControls';

// Accessibility Hooks
export { useMotorAccessibility } from './MotorAccessibilityEnh';
export { useScreenReaderCallControls } from './ScreenReaderCallControls';

// Export comprehensive type definitions
export * from './types';
export type * as PhoneInterfaceTypes from './types';

/**
 * Fake Call Component Registry
 * Convenient object for importing all components
 */
export const FakeCallComponents = {
    // Main screen
    SettingsScreen: FakeCallSettingsScreen,

    // Configuration components
    FrequencyConfig: CallFrequencyConfig,
    VoiceSettings: VoiceProfileSettings,
    CallerManager: CallerIDManager,

    // Feature management
    FeatureGate: ProTierFeatureGate,
    Toggle: FakeCallToggle,

    // Preview components
    SchedulePreview: CallSchedulePreview,

    // Phone Interface Components
    PhoneCallInterface: PhoneCallInterface,
    CallStateIndicator: CallStateIndicator,
    CallScreenAnimations: CallScreenAnimations,
    CallInteractionHandler: CallInteractionHandler,
    iOSCallKitIntegration: iOSCallKitIntegration,
    AndroidTelecomIntegration: AndroidTelecomIntegration,
    WebPhoneInterface: WebPhoneInterface,

    // Accessibility Components
    AccessibleCallScreen: AccessibleCallScreen,
    FakeCallAnnouncements: FakeCallAnnouncements,
    MotorAccessibilityEnhancements: MotorAccessibilityEnhancements,
    HighContrastCallInterface: HighContrastCallInterface,
    ScreenReaderCallControls: ScreenReaderCallControls,
} as const;

/**
 * Phone Interface Component Registry
 * Centralized access to all phone interface components
 */
export const PhoneInterfaceComponents = {
    // Main interface
    PhoneCallInterface: PhoneCallInterface,

    // Supporting components
    CallStateIndicator: CallStateIndicator,
    CallScreenAnimations: CallScreenAnimations,
    CallInteractionHandler: CallInteractionHandler,

    // Platform-specific integrations
    iOSCallKitIntegration: iOSCallKitIntegration,
    AndroidTelecomIntegration: AndroidTelecomIntegration,
    WebPhoneInterface: WebPhoneInterface,
} as const;

/**
 * Accessibility Component Registry
 * Centralized access to all accessibility components
 */
export const AccessibilityComponents = {
    // Main accessibility interface
    AccessibleCallScreen: AccessibleCallScreen,

    // Supporting accessibility components
    FakeCallAnnouncements: FakeCallAnnouncements,
    MotorAccessibilityEnhancements: MotorAccessibilityEnhancements,
    HighContrastCallInterface: HighContrastCallInterface,
    ScreenReaderCallControls: ScreenReaderCallControls,
} as const;

/**
 * Component Types Documentation
 *
 * Exported types are available through the individual component imports:
 *
 * // Settings and Configuration
 * import { FakeCallSettings, FakeCallSettingsScreenProps } from './FakeCallSettingsScreen';
 * import { CallFrequencyConfigProps } from './CallFrequencyConfig';
 * import { VoiceProfileSettingsProps } from './VoiceProfileSettings';
 * import { CallerIDManagerProps } from './CallerIDManager';
 * import { CallSchedulePreviewProps } from './CallSchedulePreview';
 * import { ProTierFeatureGateProps } from './ProTierFeatureGate';
 * import { FakeCallToggleProps } from './FakeCallToggle';
 *
 * // Phone Interface Components
 * import { PhoneCallInterfaceProps } from './PhoneCallInterface';
 * import { CallStateIndicatorProps } from './CallStateIndicator';
 * import { CallScreenAnimationsProps } from './CallScreenAnimations';
 * import { CallInteractionHandlerProps } from './CallInteractionHandler';
 * import { iOSCallKitIntegrationProps } from './iOSCallKitIntegration';
 * import { AndroidTelecomIntegrationProps } from './AndroidTelecomIntegration';
 * import { WebPhoneInterfaceProps } from './WebPhoneInterface';
 *
 * // Accessibility Components
 * import { AccessibleCallScreenProps } from './AccessibleCallScreen';
 * import { FakeCallAnnouncementsProps } from './FakeCallAnnouncements';
 * import { MotorAccessibilityEnhancementsProps } from './MotorAccessibilityEnhancements';
 * import { HighContrastCallInterfaceProps } from './HighContrastCallInterface';
 * import { ScreenReaderCallControlsProps } from './ScreenReaderCallControls';
 */

/**
 * Component version information
 */
export const VERSION = '2.1.0';

/**
 * Component metadata
 */
export const METADATA = {
    name: 'Fake Call UI Components with Accessibility',
    version: VERSION,
    description: 'Comprehensive UI controls and phone interfaces for fake call notification system with WCAG 2.1 AA accessibility compliance',
    components: Object.keys(FakeCallComponents).length,
    phoneInterfaceComponents: Object.keys(PhoneInterfaceComponents).length,
    accessibilityComponents: Object.keys(AccessibilityComponents).length,
    features: [
        'Pro tier feature gating',
        'Responsive mobile-first design',
        'WCAG 2.1 AA accessibility compliance',
        'Real-time settings validation',
        'Context-aware scheduling',
        'Safety-first caller ID management',
        'Voice profile customization',
        'Call frequency configuration',
        'Schedule preview',
        // Phone Interface Features
        'Platform-specific phone interface integrations',
        'iOS CallKit framework integration',
        'Android TelecomManager integration',
        'Web Audio API integration',
        'Realistic call animations and state indicators',
        'Unified call interaction handling',
        'Cross-platform call experience',
        'Native call UI appearance',
        'Haptic feedback integration',
        'Call state synchronization',
        // Accessibility Features
        'Screen reader integration and optimization',
        'Voice control for hands-free operation',
        'Motor accessibility with large touch targets',
        'Switch control and dwell control support',
        'High contrast mode with WCAG AAA compliance',
        'Cognitive accessibility with simplified interfaces',
        'Dynamic type support and scalable text',
        'Keyboard navigation and focus management',
        'Alternative interaction methods',
        'Comprehensive error announcement system',
    ],
} as const;

/**
 * Feature sets for different use cases
 */
export const FEATURE_SETS = {
    BASIC: {
        name: 'Basic Fake Call',
        components: [
            'FakeCallToggle',
            'FakeCallSettingsScreen',
            'PhoneCallInterface',
        ],
    },
    ACCESSIBLE: {
        name: 'Accessible Fake Call',
        components: [
            'FakeCallToggle',
            'FakeCallSettingsScreen',
            'AccessibleCallScreen',
            'FakeCallAnnouncements',
            'ScreenReaderCallControls',
        ],
    },
    ADVANCED: {
        name: 'Advanced Fake Call',
        components: [
            'FakeCallToggle',
            'FakeCallSettingsScreen',
            'CallFrequencyConfig',
            'VoiceProfileSettings',
            'CallerIDManager',
            'PhoneCallInterface',
            'CallInteractionHandler',
            'CallStateIndicator',
        ],
    },
    FULL_ACCESSIBILITY: {
        name: 'Full Accessibility',
        components: [
            'AccessibleCallScreen',
            'FakeCallAnnouncements',
            'MotorAccessibilityEnhancements',
            'HighContrastCallInterface',
            'ScreenReaderCallControls',
            'PhoneCallInterface',
        ],
    },
    PLATFORM_INTEGRATION: {
        name: 'Platform Integration',
        components: [
            'iOSCallKitIntegration',
            'AndroidTelecomIntegration',
            'WebPhoneInterface',
            'CallScreenAnimations',
        ],
    },
    COMPREHENSIVE: {
        name: 'Comprehensive Package',
        components: [
            'FakeCallToggle',
            'FakeCallSettingsScreen',
            'CallFrequencyConfig',
            'VoiceProfileSettings',
            'CallerIDManager',
            'PhoneCallInterface',
            'AccessibleCallScreen',
            'FakeCallAnnouncements',
            'MotorAccessibilityEnhancements',
            'HighContrastCallInterface',
            'ScreenReaderCallControls',
        ],
    },
} as const;

export default {
    // Default export for all components
    components: FakeCallComponents,
    phoneInterface: PhoneInterfaceComponents,
    accessibility: AccessibilityComponents,
    version: VERSION,
    metadata: METADATA,
    featureSets: FEATURE_SETS,
};