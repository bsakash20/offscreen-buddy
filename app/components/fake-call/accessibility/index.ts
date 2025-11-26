/**
 * Fake Call Accessibility Components Index
 * Central export file for all fake call accessibility components
 */

// Components
import AccessibleCallScreen from '../AccessibleCallScreen';
import FakeCallAnnouncements from '../FakeCallAnnouncements';
import MotorAccessibilityEnhancements from '../MotorAccessibilityEnh';
import HighContrastCallInterface from '../HighContrast';
import ScreenReaderCallControls from '../ScreenReaderCallControls';

// Component types and interfaces
export type {
    AccessibleCallScreenProps,
} from '../AccessibleCallScreen';

export type {
    AnnouncementConfig,
    CallAnnouncementEvent,
    FakeCallAnnouncementsProps,
} from '../FakeCallAnnouncements';

export type {
    MotorAccessibilityConfig,
    SwitchControlConfig,
    InteractionMode,
    MotorAccessibilityEnhancementsProps,
} from '../MotorAccessibilityEnh';

export type {
    HighContrastTheme,
    HighContrastCallInterfaceProps,
} from '../HighContrast';

export type {
    ScreenReaderCallControlConfig,
    ScreenReaderCallControlState,
    ScreenReaderCallControlsProps,
} from '../ScreenReaderCallControls';

// Main exports
export { default as AccessibleCallScreen } from '../AccessibleCallScreen';
export { default as FakeCallAnnouncements } from '../FakeCallAnnouncements';
export { default as MotorAccessibilityEnhancements } from '../MotorAccessibilityEnh';
export { default as HighContrastCallInterface } from '../HighContrast';
export { default as ScreenReaderCallControls } from '../ScreenReaderCallControls';

// Component metadata
export const ACCESSIBILITY_COMPONENTS = {
    AccessibleCallScreen: {
        name: 'Accessible Call Screen',
        version: '1.0.0',
        description: 'WCAG 2.1 AA compliant call interface with comprehensive accessibility features',
        features: [
            'Screen reader optimized interface',
            'Voice control integration',
            'Motor accessibility support',
            'High contrast mode',
            'Scalable text support',
            'Keyboard navigation',
            'Focus management',
            'Alternative text for visual elements',
        ],
        wcagCompliance: 'AA',
    },
    FakeCallAnnouncements: {
        name: 'Fake Call Announcements',
        version: '1.0.0',
        description: 'Real-time screen reader announcements for call events',
        features: [
            'Real-time announcement queue',
            'Priority-based announcements',
            'Context-aware messaging',
            'Customizable verbosity levels',
            'Multi-language support',
            'Error handling and recovery',
        ],
        wcagCompliance: 'AA',
    },
    MotorAccessibilityEnhancements: {
        name: 'Motor Accessibility Enhancements',
        version: '1.0.0',
        description: 'Alternative interaction methods for users with motor impairments',
        features: [
            'Large touch targets',
            'Switch control support',
            'Dwell control integration',
            'Timeout extensions',
            'Gesture alternatives',
            'Single switch activation',
        ],
        wcagCompliance: 'AA',
    },
    HighContrastCallInterface: {
        name: 'High Contrast Call Interface',
        version: '1.0.0',
        description: 'WCAG AAA compliant high contrast call interface',
        features: [
            'High contrast color schemes',
            'WCAG AAA compliance validation',
            'Enhanced focus indicators',
            'Bold text support',
            'Minimum touch target sizing',
            'Contrast ratio validation',
        ],
        wcagCompliance: 'AAA',
    },
    ScreenReaderCallControls: {
        name: 'Screen Reader Call Controls',
        version: '1.0.0',
        description: 'Screen reader optimized call controls with comprehensive announcements',
        features: [
            'Context-aware announcements',
            'State change notifications',
            'Control action feedback',
            'Verbose and concise modes',
            'Priority announcement handling',
            'Error announcement system',
        ],
        wcagCompliance: 'AA',
    },
} as const;

// Convenience hook exports
export { useMotorAccessibility } from '../MotorAccessibilityEnh';
export { useScreenReaderCallControls } from '../ScreenReaderCallControls';

// Component registry for easy access
export const AccessibilityComponentRegistry = {
    AccessibleCallScreen,
    FakeCallAnnouncements,
    MotorAccessibilityEnhancements,
    HighContrastCallInterface,
    ScreenReaderCallControls,
} as const;

// Default export with all components
export default {
    components: AccessibilityComponentRegistry,
    metadata: ACCESSIBILITY_COMPONENTS,
    version: '1.0.0',
};