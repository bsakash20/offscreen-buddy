/**
 * Fake Call Accessibility Services Index
 * Central export file for all fake call accessibility services and components
 */

// Services
import FakeCallAccessibilityProvider from './FakeCallAccessibilityProvider';
export { FakeCallAccessibilityProvider };
export {
    useFakeCallAccessibility,
    withFakeCallAccessibility,
    FakeCallAccessibilityWrapper
} from './FakeCallAccessibilityProvider';

import VoiceControlIntegration from './VoiceControlIntegration';
export { VoiceControlIntegration };
export { useVoiceControl } from './VoiceControlIntegration';

// Configuration interfaces
export type {
    FakeCallAccessibilityConfig,
    FakeCallAccessibilityState,
    FakeCallAccessibilityContextType,
} from './FakeCallAccessibilityProvider';

export type {
    VoiceCommand,
    VoiceControlConfig,
    VoiceRecognitionState,
} from './VoiceControlIntegration';

// Service metadata
export const ACCESSIBILITY_SERVICES = {
    FakeCallAccessibilityProvider: {
        name: 'Fake Call Accessibility Provider',
        version: '1.0.0',
        description: 'Comprehensive accessibility integration for fake call system',
        features: [
            'WCAG 2.1 AA compliance',
            'Screen reader integration',
            'Voice control support',
            'Motor accessibility enhancements',
            'Cognitive accessibility support',
            'Visual accessibility features',
            'High contrast mode',
            'Dynamic type support',
        ],
    },
    VoiceControlIntegration: {
        name: 'Voice Control Integration',
        version: '1.0.0',
        description: 'Hands-free call management through voice commands',
        features: [
            'Voice command recognition',
            'Call control voice commands',
            'Custom voice commands',
            'Voice feedback',
            'Multi-language support',
            'Confidence threshold adjustment',
        ],
    },
} as const;

// Export all services and utilities
export default {
    provider: FakeCallAccessibilityProvider,
    voiceControl: VoiceControlIntegration,
    metadata: ACCESSIBILITY_SERVICES,
};