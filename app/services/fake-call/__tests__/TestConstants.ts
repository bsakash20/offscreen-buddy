/**
 * Test Constants for Fake Call Notification System Testing
 * Centralized constants for all test scenarios and expected behaviors
 */

// ===========================================
// TEST TIMING CONSTANTS
// ===========================================

export const TEST_TIMEOUTS = {
    SHORT: 5000,      // 5 seconds
    MEDIUM: 15000,    // 15 seconds  
    LONG: 30000,      // 30 seconds
    EXTENDED: 60000,  // 1 minute
    PERFORMANCE: 120000 // 2 minutes
} as const;

export const TEST_DELAYS = {
    MINIMAL: 10,        // 10ms
    SMALL: 100,         // 100ms
    MODERATE: 500,      // 500ms
    SIGNIFICANT: 1000,  // 1 second
    LONG: 5000          // 5 seconds
} as const;

// ===========================================
// PLATFORM CONSTANTS
// ===========================================

export const SUPPORTED_PLATFORMS = {
    IOS: 'ios',
    ANDROID: 'android',
    WEB: 'web'
} as const;

export const PLATFORM_CAPABILITIES = {
    IOS: {
        hasCallKit: true,
        hasInCallService: false,
        canCriticalAlerts: true,
        canFullScreenIntent: false,
        supportedAudioFormats: ['mp3', 'wav', 'aac'],
        maxCallDuration: 300
    },
    ANDROID: {
        hasCallKit: false,
        hasInCallService: true,
        canCriticalAlerts: false,
        canFullScreenIntent: true,
        supportedAudioFormats: ['mp3', 'wav'],
        maxCallDuration: 600
    },
    WEB: {
        hasCallKit: false,
        hasInCallService: false,
        canCriticalAlerts: false,
        canFullScreenIntent: false,
        supportedAudioFormats: ['mp3', 'wav'],
        maxCallDuration: 180
    }
} as const;

// ===========================================
// CALL LIMITS AND THRESHOLDS
// ===========================================

export const CALL_LIMITS = {
    MAX_ACTIVE_CALLS: 3,
    MAX_DAILY_CALLS: 100,
    MAX_WEEKLY_CALLS: 500,
    MAX_MONTHLY_CALLS: 2000,
    DEFAULT_CALL_DURATION: 30,
    MAX_CALL_DURATION: 300,
    MIN_CALL_DURATION: 5,
    MAX_SIMULTANEOUS_SYNTHESIS: 5,
    MAX_CACHE_SIZE: 50,
    CACHE_DURATION_MS: 24 * 60 * 60 * 1000 // 24 hours
} as const;

// ===========================================
// PERFORMANCE BENCHMARKS
// ===========================================

export const PERFORMANCE_THRESHOLDS = {
    INITIALIZATION: {
        MAX_DURATION: 2000,      // 2 seconds
        ACCEPTABLE_DURATION: 1000 // 1 second
    },
    SCHEDULE_CALL: {
        MAX_DURATION: 500,       // 500ms
        ACCEPTABLE_DURATION: 200  // 200ms
    },
    TRIGGER_CALL: {
        MAX_DURATION: 1000,      // 1 second
        ACCEPTABLE_DURATION: 300  // 300ms
    },
    END_CALL: {
        MAX_DURATION: 300,       // 300ms
        ACCEPTABLE_DURATION: 100  // 100ms
    },
    VOICE_SYNTHESIS: {
        MAX_DURATION: 3000,      // 3 seconds
        ACCEPTABLE_DURATION: 1500, // 1.5 seconds
        MIN_TEXT_LENGTH: 10,
        MAX_TEXT_LENGTH: 1000
    },
    AUDIO_PLAYBACK: {
        MAX_LATENCY: 200,        // 200ms
        ACCEPTABLE_LATENCY: 100  // 100ms
    },
    MEMORY_USAGE: {
        MAX_HEAP_SIZE: 50 * 1024 * 1024,  // 50MB
        MAX_RSS_SIZE: 100 * 1024 * 1024,  // 100MB
        MAX_EXTERNAL_SIZE: 10 * 1024 * 1024 // 10MB
    },
    BATTERY_DRAIN: {
        MAX_DRAIN_PER_HOUR: 0.05, // 5% per hour
        MAX_DRAIN_PER_CALL: 0.01  // 1% per call
    }
} as const;

// ===========================================
// ACCESSIBILITY CONSTANTS
// ===========================================

export const ACCESSIBILITY_STANDARDS = {
    WCAG_LEVEL: 'AA',
    MIN_CONTRAST_RATIO: 4.5,
    MIN_TOUCH_TARGET_SIZE: 44,
    MIN_FONT_SIZE: 16,
    MAX_FOCUS_ORDER_DEPTH: 3,
    MIN_ANIMATION_DURATION: 0,
    MAX_ANIMATION_DURATION: 300,
    SCREEN_READER_ANNOUNCEMENT_DELAY: 1000,
    VOICE_COMMAND_TIMEOUT: 5000,
    KEYBOARD_NAVIGATION_TIMEOUT: 3000
} as const;

export const ACCESSIBILITY_FEATURES = {
    SCREEN_READER: {
        REQUIRED_LABELS: ['caller_name', 'call_duration', 'call_actions'],
        REQUIRED_HINTS: ['answer_button', 'decline_button', 'end_call_button'],
        REQUIRED_STATES: ['incoming', 'active', 'ended', 'missed']
    },
    KEYBOARD_NAVIGATION: {
        TAB_ORDER: ['answer_button', 'decline_button', 'call_info', 'end_call_button'],
        ENTER_KEY_ACTIONS: ['answer_call', 'decline_call'],
        ESC_KEY_ACTIONS: ['dismiss_call'],
        SPACE_KEY_ACTIONS: ['answer_call', 'end_call']
    },
    VOICE_CONTROL: {
        COMMANDS: ['answer call', 'decline call', 'end call', 'hold call'],
        ALIASES: {
            'answer': ['answer call', 'pick up', 'accept call'],
            'decline': ['decline call', 'reject call', 'dismiss call'],
            'end': ['end call', 'hang up', 'terminate call']
        },
        CONFIDENCE_THRESHOLD: 0.8
    }
} as const;

// ===========================================
// SECURITY CONSTANTS
// ===========================================

export const SECURITY_RULES = {
    INPUT_VALIDATION: {
        MAX_CALLER_NAME_LENGTH: 50,
        MAX_PHONE_NUMBER_LENGTH: 20,
        MAX_AUDIO_MESSAGE_LENGTH: 500,
        ALLOWED_CHARACTERS: /^[a-zA-Z0-9\s\-\.\(\)\+\_]+$/,
        BLOCKED_PATTERNS: [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi,
            /\.\.\//g,
            /[;&|`$()]/g
        ]
    },
    CALLER_ID_SAFETY: {
        MIN_RISK_LEVEL: 'low',
        BLOCKED_NUMBERS: ['911', '112', '999', '000'],
        EMERGENCY_OVERRIDE_REQUIRED: true,
        REAL_NUMBER_DETECTION: /^[0-9]{10}$/,
        SAFE_NUMBER_PREFIXES: ['555', '800', '888', '877', '866']
    },
    RATE_LIMITING: {
        MAX_CALLS_PER_MINUTE: 10,
        MAX_CALLS_PER_HOUR: 50,
        MAX_CALLS_PER_DAY: 100,
        SYNTHESIS_REQUESTS_PER_MINUTE: 30,
        NOTIFICATION_REQUESTS_PER_MINUTE: 20
    },
    PERMISSIONS: {
        REQUIRED_FOR_CALLS: ['notification', 'audio'],
        REQUIRED_FOR_SCHEDULING: ['notification', 'calendar'],
        REQUIRED_FOR_VOICE: ['microphone'],
        PLATFORM_SPECIFIC: {
            IOS: ['notification', 'calendar'],
            ANDROID: ['notification', 'call_phone'],
            WEB: ['notification']
        }
    }
} as const;

// ===========================================
// ERROR CONSTANTS
// ===========================================

export const ERROR_TYPES = {
    PLATFORM_UNSUPPORTED: 'PLATFORM_UNSUPPORTED',
    CALLKIT_NOT_AVAILABLE: 'CALLKIT_NOT_AVAILABLE',
    AUDIO_SESSION_ERROR: 'AUDIO_SESSION_ERROR',
    VOICE_SYNTHESIS_FAILED: 'VOICE_SYNTHESIS_FAILED',
    AUDIO_PLAYBACK_ERROR: 'AUDIO_PLAYBACK_ERROR',
    VOICE_PROFILE_MISSING: 'VOICE_PROFILE_MISSING',
    PRO_TIER_REQUIRED: 'PRO_TIER_REQUIRED',
    SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
    ACCESS_DENIED: 'ACCESS_DENIED',
    INVALID_CALLER_ID: 'INVALID_CALLER_ID',
    RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    NETWORK_ERROR: 'NETWORK_ERROR',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export const ERROR_RECOVERY_STRATEGIES = {
    PERMISSION_DENIED: {
        RETRYABLE: true,
        MAX_RETRIES: 3,
        RETRY_DELAY: 1000,
        SUGGESTED_ACTION: 'Grant required permissions and try again'
    },
    RESOURCE_EXHAUSTED: {
        RETRYABLE: false,
        SUGGESTED_ACTION: 'Free up resources and try again later'
    },
    NETWORK_ERROR: {
        RETRYABLE: true,
        MAX_RETRIES: 5,
        RETRY_DELAY: 2000,
        SUGGESTED_ACTION: 'Check network connection and try again'
    },
    PLATFORM_UNSUPPORTED: {
        RETRYABLE: false,
        SUGGESTED_ACTION: 'Use a supported platform'
    }
} as const;

// ===========================================
// TEST DATA CONSTANTS
// ===========================================

export const TEST_VOICE_PROFILES = {
    PROFESSIONAL_MALE: {
        id: 'professional_male',
        name: 'Professional Male',
        language: 'en-US',
        gender: 'male',
        quality: 'premium',
        expectedSynthesisTime: 1500
    },
    PROFESSIONAL_FEMALE: {
        id: 'professional_female',
        name: 'Professional Female',
        language: 'en-US',
        gender: 'female',
        quality: 'premium',
        expectedSynthesisTime: 1200
    },
    CASUAL_MALE: {
        id: 'casual_male',
        name: 'Casual Male',
        language: 'en-US',
        gender: 'male',
        quality: 'standard',
        expectedSynthesisTime: 1000
    },
    BUSINESS_FEMALE: {
        id: 'business_female',
        name: 'Business Female',
        language: 'en-GB',
        gender: 'female',
        quality: 'premium',
        expectedSynthesisTime: 1800
    }
} as const;

export const TEST_CALLER_TYPES = {
    SAFE: {
        riskLevel: 'low',
        isVerified: true,
        allowedInProduction: true
    },
    BUSINESS: {
        riskLevel: 'low',
        isVerified: true,
        allowedInProduction: true,
        requiresBusinessHours: false
    },
    EMERGENCY: {
        riskLevel: 'low',
        isVerified: true,
        allowedInProduction: false,
        requiresOverride: true
    },
    PERSONAL: {
        riskLevel: 'medium',
        isVerified: false,
        allowedInProduction: true
    }
} as const;

export const TEST_SAMPLE_TEXTS = {
    SHORT: 'Hello, this is a test call.',
    MEDIUM: 'Good morning, this is Sarah from Acme Corporation. I am calling to follow up on our previous conversation about the quarterly budget review.',
    LONG: 'Thank you for taking my call today. This is an automated message from the OffScreen Buddy application. The purpose of this call is to demonstrate the voice synthesis capabilities and ensure that the fake call system is working correctly. This message contains multiple sentences to test the natural speech patterns and timing. We appreciate your patience during this test.',
    ACCESSIBILITY: 'Incoming call from Sarah Johnson. Tap to answer or swipe up to decline.',
    BUSINESS: 'Good afternoon, this is Michael from Tech Solutions Inc. I am calling regarding your recent service inquiry and would like to schedule a consultation.',
    EMERGENCY: 'This is an emergency services test call. Please respond by pressing any key to acknowledge this test.',
    MALICIOUS: '<script>alert("XSS")</script>../../../etc/passwd',
    VERY_LONG: 'This is an extremely long message designed to test the voice synthesis service performance and memory usage under heavy load. '.repeat(100)
} as const;

// ===========================================
// INTEGRATION TEST CONSTANTS
// ===========================================

export const INTEGRATION_TEST_TIMEOUTS = {
    FULL_LIFECYCLE: 30000,        // 30 seconds
    NOTIFICATION_INTEGRATION: 10000, // 10 seconds
    VOICE_SYNTHESIS_INTEGRATION: 20000, // 20 seconds
    ACCESSIBILITY_INTEGRATION: 15000, // 15 seconds
    SECURITY_INTEGRATION: 25000,  // 25 seconds
    PLATFORM_INTEGRATION: 20000,  // 20 seconds
    PERFORMANCE_INTEGRATION: 60000 // 60 seconds
} as const;

export const INTEGRATION_TEST_SCENARIOS = {
    COMPLETE_CALL_FLOW: {
        steps: [
            'initialize services',
            'create call configuration',
            'schedule call',
            'trigger call',
            'handle user interaction',
            'synthesize voice message',
            'end call',
            'cleanup resources'
        ],
        expectedDuration: 15000,
        criticalPoints: ['initialization', 'scheduling', 'triggering', 'synthesis']
    },
    ACCESSIBILITY_WORKFLOW: {
        steps: [
            'enable screen reader',
            'test call notification',
            'test call interface navigation',
            'test voice commands',
            'test keyboard shortcuts',
            'disable accessibility features'
        ],
        expectedDuration: 10000,
        criticalPoints: ['navigation', 'commands', 'feedback']
    },
    SECURITY_VALIDATION: {
        steps: [
            'validate input sanitization',
            'test caller ID generation',
            'verify permission handling',
            'test rate limiting',
            'validate emergency protection'
        ],
        expectedDuration: 8000,
        criticalPoints: ['sanitization', 'validation', 'protection']
    }
} as const;

// ===========================================
// PERFORMANCE TEST CONSTANTS
// ===========================================

export const PERFORMANCE_TEST_ITERATIONS = {
    LIGHT: 10,
    MODERATE: 50,
    HEAVY: 100,
    STRESS: 500,
    ENDURANCE: 1000
} as const;

export const PERFORMANCE_TEST_SCENARIOS = {
    MEMORY_LEAK_DETECTION: {
        duration: 300000,  // 5 minutes
        iterations: 100,
        measurementInterval: 10000, // 10 seconds
        memoryThreshold: 10 * 1024 * 1024 // 10MB growth
    },
    CPU_USAGE_MONITORING: {
        duration: 120000,  // 2 minutes
        iterations: 200,
        measurementInterval: 5000, // 5 seconds
        cpuThreshold: 50 // 50% CPU usage
    },
    BATTERY_DRAIN_TEST: {
        duration: 3600000, // 1 hour
        iterations: 1000,
        measurementInterval: 60000, // 1 minute
        drainThreshold: 0.1 // 10% per hour
    },
    CONCURRENT_CALLS: {
        maxCalls: CALL_LIMITS.MAX_ACTIVE_CALLS,
        duration: 60000, // 1 minute
        concurrentTrigger: true
    }
} as const;

// ===========================================
// PLATFORM-SPECIFIC CONSTANTS
// ===========================================

export const PLATFORM_TEST_DATA = {
    IOS: {
        supportedCallKit: true,
        criticalAlertsSupported: true,
        backgroundAudioSupported: true,
        expectedAudioLatency: 100,
        maxSimultaneousCalls: 3,
        testDeviceModels: ['iPhone 13', 'iPhone 14', 'iPhone 15', 'iPad'],
        testOSVersions: ['15.0', '16.0', '17.0']
    },
    ANDROID: {
        supportedCallKit: false,
        criticalAlertsSupported: false,
        backgroundAudioSupported: true,
        expectedAudioLatency: 150,
        maxSimultaneousCalls: 5,
        testDeviceModels: ['Samsung Galaxy S21', 'Google Pixel 6', 'OnePlus 9'],
        testOSVersions: ['11', '12', '13']
    },
    WEB: {
        supportedCallKit: false,
        criticalAlertsSupported: false,
        backgroundAudioSupported: false,
        expectedAudioLatency: 200,
        maxSimultaneousCalls: 1,
        testBrowsers: ['Chrome', 'Safari', 'Firefox', 'Edge'],
        testOSVersions: ['macOS', 'Windows', 'Linux', 'iOS', 'Android']
    }
} as const;

// ===========================================
// COMPLIANCE AND STANDARDS CONSTANTS
// ===========================================

export const COMPLIANCE_STANDARDS = {
    GDPR: {
        dataRetentionDays: 30,
        requiresConsent: true,
        requiredDataPoints: ['userId', 'callTimestamp', 'duration'],
        anonymizationRequired: true
    },
    CCPA: {
        requiresOptOut: true,
        dataDisclosureRequired: true,
        thirdPartySharingRestricted: true
    },
    ACCESSIBILITY: {
        wcagVersion: '2.1',
        complianceLevel: 'AA',
        testingTools: ['axe-core', 'WAVE', 'Lighthouse'],
        requiredFeatures: ['keyboardNavigation', 'screenReader', 'highContrast', 'voiceControl']
    },
    SECURITY: {
        encryptionRequired: true,
        secureStorageRequired: true,
        auditLoggingRequired: true,
        penetrationTestingRequired: true
    }
} as const;

// ===========================================
// MOCK SERVICE CONSTANTS
// ===========================================

export const MOCK_SERVICE_RESPONSE_TIMES = {
    SUCCESSFUL: {
        initialize: 100,
        scheduleCall: 50,
        triggerCall: 150,
        endCall: 30,
        synthesizeSpeech: 200,
        generateCallerID: 25
    },
    FAILED: {
        networkError: 5000,
        permissionDenied: 100,
        resourceExhausted: 200,
        platformError: 300
    }
} as const;

export const MOCK_SERVICE_ERROR_RATES = {
    SUCCESS: 0.95,
    NETWORK_ERROR: 0.02,
    PERMISSION_ERROR: 0.02,
    RESOURCE_ERROR: 0.01
} as const;

// ===========================================
// EXPORT ALL CONSTANTS
// ===========================================

export const ALL_TEST_CONSTANTS = {
    TIMEOUTS: TEST_TIMEOUTS,
    DELAYS: TEST_DELAYS,
    PLATFORMS: SUPPORTED_PLATFORMS,
    PLATFORM_CAPABILITIES,
    CALL_LIMITS,
    PERFORMANCE_THRESHOLDS,
    ACCESSIBILITY_STANDARDS,
    ACCESSIBILITY_FEATURES,
    SECURITY_RULES,
    ERROR_TYPES,
    ERROR_RECOVERY_STRATEGIES,
    TEST_VOICE_PROFILES,
    TEST_CALLER_TYPES,
    TEST_SAMPLE_TEXTS,
    INTEGRATION_TEST_TIMEOUTS,
    INTEGRATION_TEST_SCENARIOS,
    PERFORMANCE_TEST_ITERATIONS,
    PERFORMANCE_TEST_SCENARIOS,
    PLATFORM_TEST_DATA,
    COMPLIANCE_STANDARDS,
    MOCK_SERVICE_RESPONSE_TIMES,
    MOCK_SERVICE_ERROR_RATES
} as const;

// ===========================================
// CONSTANT VALIDATORS
// ===========================================

export const ConstantValidators = {
    validateTimeout: (timeout: number): boolean => {
        return timeout > 0 && timeout <= TEST_TIMEOUTS.EXTENDED;
    },

    validatePerformanceThreshold: (duration: number, threshold: keyof typeof PERFORMANCE_THRESHOLDS): boolean => {
        const maxDuration = PERFORMANCE_THRESHOLDS[threshold]?.MAX_DURATION;
        return maxDuration ? duration <= maxDuration : false;
    },

    validateSecurityRule: (input: string, rule: keyof typeof SECURITY_RULES.INPUT_VALIDATION): boolean => {
        const securityRule = SECURITY_RULES.INPUT_VALIDATION[rule];
        if (!securityRule) return false;

        if (typeof securityRule === 'object' && 'test' in securityRule) {
            return securityRule.test(input);
        }

        return true;
    },

    validatePlatformCompatibility: (platform: keyof typeof SUPPORTED_PLATFORMS): boolean => {
        return Object.values(SUPPORTED_PLATFORMS).includes(platform);
    }
} as const;

export default ALL_TEST_CONSTANTS;