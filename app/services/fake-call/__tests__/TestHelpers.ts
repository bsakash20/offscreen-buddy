/**
 * Test Helpers for Fake Call Notification System Testing
 * Provides common testing utilities, setup functions, and validation helpers
 */

import {
    CallState,
    CallAction,
    CallPriority,
    CallError,
    CallErrorType,
    CallerInfo,
    VoiceProfile,
    FakeCallConfig,
    CallSchedule,
    CallStateData,
    FakeCallPreferences,
    AudioBufferInfo,
    DeviceInfo,
    FakeCallResult
} from '../types';

import {
    MockCallerInfoFactory,
    MockVoiceProfileFactory,
    MockFakeCallConfigFactory,
    MockCallScheduleFactory,
    MockCallStateDataFactory,
    MockDeviceInfoFactory,
    MockCallErrorFactory,
    MockFakeCallPreferencesFactory,
    MockAudioBufferInfoFactory,
    MockStressTestFactory
} from './MockFactories';

// ===========================================
// TEST SETUP AND CLEANUP HELPERS
// ===========================================

export class TestSetupHelper {
    /**
     * Setup test environment before each test
     */
    static setupTestEnvironment(): void {
        // Reset global state
        (global as any).fetch = jest.fn();
        (global as any).navigator = { mediaDevices: { getUserMedia: jest.fn() } } as any;

        // Mock AsyncStorage
        jest.mock('@react-native-async-storage/async-storage', () =>
            require('@react-native-async-storage/async-storage')
        );

        // Mock Platform
        jest.mock('react-native', () => ({
            Platform: {
                OS: 'ios'
            },
            AppState: {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            }
        }));

        // Mock uuid
        jest.mock('uuid', () => ({
            v4: jest.fn(() => 'mock-uuid-12345')
        }));
    }

    /**
     * Cleanup test environment after each test
     */
    static cleanupTestEnvironment(): void {
        // Clear all mocks
        jest.clearAllMocks();

        // Reset module registry
        jest.resetModules();

        // Clear async storage mocks
        const AsyncStorage = require('@react-native-async-storage/async-storage');
        AsyncStorage.clear = jest.fn();
    }

    /**
     * Create a comprehensive mock for the fake call service
     */
    static createMockFakeCallService() {
        const mockService = {
            initialize: jest.fn().mockResolvedValue({
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 100,
                    platform: 'ios'
                }
            }),

            scheduleCall: jest.fn().mockImplementation((config: CallSchedule) => {
                return Promise.resolve({
                    success: true,
                    data: {
                        callId: `mock-call-${Date.now()}`,
                        scheduledTime: config.scheduledFor,
                        notificationId: 'mock-notification-123'
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 150,
                        platform: 'ios'
                    }
                });
            }),

            triggerCall: jest.fn().mockImplementation((callId: string) => {
                return Promise.resolve({
                    success: true,
                    data: {
                        call: MockCallStateDataFactory.createActive(),
                        platformSupport: {
                            canUseNativeCallUI: true,
                            canUseCallKit: true,
                            canSimulatePhoneCall: false,
                            canFullScreenCall: true,
                            canBackgroundAudio: true,
                            canHapticFeedback: true,
                            supportedAudioFormats: ['mp3', 'wav'],
                            maxCallDuration: 300
                        },
                        audioConfig: {
                            category: 'playback',
                            mode: 'spokenAudio',
                            options: ['mixWithOthers'],
                            sampleRate: 22050,
                            channels: 1,
                            bufferSize: 4096
                        }
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 200,
                        platform: 'ios'
                    }
                });
            }),

            endCall: jest.fn().mockImplementation((callId: string) => {
                return Promise.resolve({
                    success: true,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 100,
                        platform: 'ios'
                    }
                });
            }),

            handleCallAction: jest.fn().mockImplementation((callId: string, action: CallAction) => {
                return Promise.resolve({
                    success: true,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 50,
                        platform: 'ios'
                    }
                });
            }),

            getCallStatus: jest.fn().mockImplementation((callId: string) => {
                return Promise.resolve({
                    success: true,
                    data: MockCallStateDataFactory.createActive(),
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 75,
                        platform: 'ios'
                    }
                });
            }),

            getActiveCalls: jest.fn().mockImplementation((userId: string) => {
                return Promise.resolve({
                    success: true,
                    data: [MockCallStateDataFactory.createActive()],
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 100,
                        platform: 'ios'
                    }
                });
            }),

            getUserPreferences: jest.fn().mockImplementation((userId: string) => {
                return Promise.resolve({
                    success: true,
                    data: MockFakeCallPreferencesFactory.createDefault(),
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 50,
                        platform: 'ios'
                    }
                });
            }),

            updateUserPreferences: jest.fn().mockImplementation((userId: string, prefs: Partial<FakeCallPreferences>) => {
                return Promise.resolve({
                    success: true,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 100,
                        platform: 'ios'
                    }
                });
            }),

            dispose: jest.fn().mockResolvedValue(undefined)
        };

        return mockService;
    }

    /**
     * Create a mock voice synthesis service
     */
    static createMockVoiceSynthesisService() {
        return {
            initialize: jest.fn().mockResolvedValue({
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 200,
                    platform: 'ios'
                }
            }),

            getAvailableVoices: jest.fn().mockResolvedValue({
                success: true,
                data: MockVoiceProfileFactory.createAll(),
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 100,
                    platform: 'ios'
                }
            }),

            loadVoiceProfile: jest.fn().mockImplementation((voiceId: string) => {
                return Promise.resolve({
                    success: true,
                    data: true,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 150,
                        platform: 'ios'
                    }
                });
            }),

            preloadVoices: jest.fn().mockResolvedValue({
                success: true,
                data: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 500,
                    platform: 'ios'
                }
            }),

            synthesizeSpeech: jest.fn().mockImplementation((text: string, voiceId: string) => {
                return Promise.resolve({
                    success: true,
                    data: MockAudioBufferInfoFactory.createStandard(),
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 300,
                        platform: 'ios'
                    }
                });
            }),

            synthesizeCallMessage: jest.fn().mockImplementation((message: any) => {
                return Promise.resolve({
                    success: true,
                    data: MockAudioBufferInfoFactory.createStandard(),
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 350,
                        platform: 'ios'
                    }
                });
            }),

            getVoiceQuality: jest.fn().mockImplementation((voiceId: string) => {
                return Promise.resolve({
                    success: true,
                    data: {
                        latency: 150,
                        quality: 'medium',
                        naturalness: 0.85,
                        intelligibility: 0.92,
                        fileSize: 2048576
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 75,
                        platform: 'ios'
                    }
                });
            }),

            setSynthesisRate: jest.fn().mockResolvedValue({
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 50,
                    platform: 'ios'
                }
            }),

            setSynthesisPitch: jest.fn().mockResolvedValue({
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 50,
                    platform: 'ios'
                }
            }),

            clearCache: jest.fn(),
            getCacheStats: jest.fn().mockReturnValue({
                size: 5,
                totalSize: 102400,
                hitRate: 0.85
            }),
            dispose: jest.fn().mockResolvedValue(undefined)
        };
    }

    /**
     * Create a mock caller ID service
     */
    static createMockCallerIDService() {
        return {
            initialize: jest.fn().mockResolvedValue({
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 100,
                    platform: 'ios'
                }
            }),

            generateSafeCallerID: jest.fn().mockImplementation((options: any) => {
                return Promise.resolve({
                    success: true,
                    data: MockCallerInfoFactory.createSafe(options?.callerType || 'safe'),
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 100,
                        platform: 'ios'
                    }
                });
            }),

            validateCallerID: jest.fn().mockImplementation((callerInfo: CallerInfo) => {
                return {
                    isSafe: true,
                    riskLevel: 'low',
                    reasons: ['Generated caller ID'],
                    suggestions: [],
                    needsReview: false
                };
            }),

            getSafeNameDatabase: jest.fn().mockReturnValue({
                firstNames: {
                    male: ['John', 'Mike', 'David'],
                    female: ['Jane', 'Sarah', 'Emily'],
                    neutral: ['Alex', 'Taylor', 'Casey']
                },
                lastNames: ['Smith', 'Johnson', 'Williams'],
                businessNames: ['Acme Corp', 'Tech Solutions', 'Global Services'],
                emergencyContacts: [
                    { service: 'Emergency', number: '911', description: 'Emergency Services' }
                ],
                blockedPatterns: [],
                suspiciousPatterns: []
            }),

            validatePhoneNumber: jest.fn().mockImplementation((number: string) => {
                return {
                    isValid: true,
                    isSafe: true,
                    format: 'national',
                    region: 'US',
                    isEmergency: number === '911',
                    isTollFree: false,
                    riskFlags: []
                };
            }),

            dispose: jest.fn().mockResolvedValue(undefined)
        };
    }

    /**
     * Create a mock notification service
     */
    static createMockNotificationService() {
        return {
            initialize: jest.fn().mockResolvedValue({
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: 'mock-req-123',
                    duration: 150,
                    platform: 'ios'
                }
            }),

            scheduleNotification: jest.fn().mockImplementation((config: any) => {
                return Promise.resolve({
                    success: true,
                    data: `notification-${Date.now()}`,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 200,
                        platform: 'ios'
                    }
                });
            }),

            sendImmediateNotification: jest.fn().mockImplementation((config: any) => {
                return Promise.resolve({
                    success: true,
                    data: `immediate-${Date.now()}`,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 100,
                        platform: 'ios'
                    }
                });
            }),

            cancelNotification: jest.fn().mockImplementation((notificationId: string) => {
                return Promise.resolve({
                    success: true,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 50,
                        platform: 'ios'
                    }
                });
            }),

            getNotificationStatus: jest.fn().mockImplementation((notificationId: string) => {
                return Promise.resolve({
                    success: true,
                    data: {
                        status: 'scheduled',
                        scheduledFor: new Date(),
                        delivered: false
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 75,
                        platform: 'ios'
                    }
                });
            }),

            updateNotification: jest.fn().mockImplementation((notificationId: string, updates: any) => {
                return Promise.resolve({
                    success: true,
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 100,
                        platform: 'ios'
                    }
                });
            }),

            getNotificationHistory: jest.fn().mockImplementation((userId: string) => {
                return Promise.resolve({
                    success: true,
                    data: [],
                    metadata: {
                        timestamp: new Date(),
                        requestId: 'mock-req-123',
                        duration: 150,
                        platform: 'ios'
                    }
                });
            })
        };
    }
}

// ===========================================
// ASSERTION HELPERS
// ===========================================

export class TestAssertionHelper {
    /**
     * Assert that a call result is successful
     */
    static assertSuccess(result: any, expectedData?: any): void {
        expect(result.success).toBe(true);
        expect(result.metadata).toBeDefined();
        expect(result.metadata.timestamp).toBeInstanceOf(Date);
        expect(result.metadata.requestId).toBeDefined();
        expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
        expect(result.metadata.platform).toBeDefined();

        if (expectedData !== undefined) {
            expect(result.data).toEqual(expectedData);
        }
    }

    /**
     * Assert that a call result has failed
     */
    static assertFailure(result: any, expectedErrorType?: CallErrorType): void {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error.type).toBeDefined();
        expect(result.error.code).toBeDefined();
        expect(result.error.message).toBeDefined();
        expect(result.error.recoverable).toBeDefined();
        expect(result.error.suggestedAction).toBeDefined();
        expect(result.error.timestamp).toBeInstanceOf(Date);
        expect(result.error.callId).toBeDefined();
        expect(result.error.userId).toBeDefined();
        expect(result.metadata).toBeDefined();

        if (expectedErrorType) {
            expect(result.error.type).toBe(expectedErrorType);
        }
    }

    /**
     * Assert call state data structure
     */
    static assertCallStateData(callData: CallStateData): void {
        expect(callData.callId).toBeDefined();
        expect(callData.userId).toBeDefined();
        expect(callData.config).toBeDefined();
        expect(callData.state).toBeDefined();
        expect(Object.values(CallState)).toContain(callData.state);
        expect(callData.interactionHistory).toBeInstanceOf(Array);
        expect(callData.metadata).toBeDefined();
        expect(callData.metadata.platform).toBeDefined();
        expect(callData.metadata.deviceInfo).toBeDefined();
        expect(callData.metadata.sessionId).toBeDefined();
    }

    /**
     * Assert caller info safety
     */
    static assertCallerInfoSafety(callerInfo: CallerInfo): void {
        expect(callerInfo.id).toBeDefined();
        expect(callerInfo.name).toBeDefined();
        expect(callerInfo.phoneNumber).toBeDefined();
        expect(callerInfo.callerType).toBeDefined();
        expect(['safe', 'emergency', 'business', 'personal']).toContain(callerInfo.callerType);
        expect(callerInfo.riskLevel).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(callerInfo.riskLevel);
        expect(callerInfo.isVerified).toBeDefined();
        expect(callerInfo.displayName).toBeDefined();

        // Ensure no real phone numbers
        expect(callerInfo.phoneNumber).not.toMatch(/^[0-9]{10}$/);
        expect(callerInfo.phoneNumber).not.toBe('911');
    }

    /**
     * Assert voice profile validity
     */
    static assertVoiceProfile(profile: VoiceProfile): void {
        expect(profile.id).toBeDefined();
        expect(profile.name).toBeDefined();
        expect(profile.language).toBeDefined();
        expect(profile.gender).toBeDefined();
        expect(['male', 'female', 'neutral']).toContain(profile.gender);
        expect(profile.quality).toBeDefined();
        expect(['premium', 'standard', 'basic']).toContain(profile.quality);
        expect(profile.isAvailable).toBeDefined();
        expect(profile.fileSize).toBeGreaterThan(0);
    }

    /**
     * Assert audio buffer info structure
     */
    static assertAudioBufferInfo(buffer: AudioBufferInfo): void {
        expect(buffer.format).toBeDefined();
        expect(['mp3', 'wav', 'aac']).toContain(buffer.format);
        expect(buffer.sampleRate).toBeGreaterThan(0);
        expect(buffer.channels).toBeGreaterThan(0);
        expect(buffer.bitRate).toBeGreaterThan(0);
        expect(buffer.duration).toBeGreaterThan(0);
        expect(buffer.size).toBeGreaterThan(0);
        expect(buffer.voiceProfileId).toBeDefined();
        expect(buffer.quality).toBeDefined();
        expect(['low', 'medium', 'high']).toContain(buffer.quality);
    }

    /**
     * Assert device info completeness
     */
    static assertDeviceInfo(deviceInfo: DeviceInfo): void {
        expect(deviceInfo.platform).toBeDefined();
        expect(deviceInfo.osVersion).toBeDefined();
        expect(deviceInfo.deviceModel).toBeDefined();
        expect(deviceInfo.audioSessionAvailable).toBeDefined();
        expect(deviceInfo.notificationCapabilities).toBeDefined();

        const caps = deviceInfo.notificationCapabilities;
        expect(caps.canSchedule).toBeDefined();
        expect(caps.canSound).toBeDefined();
        expect(caps.canVibrate).toBeDefined();

        // Platform-specific capabilities
        if (deviceInfo.platform === 'ios') {
            expect(deviceInfo.hasCallKit).toBeDefined();
        } else if (deviceInfo.platform === 'android') {
            expect(deviceInfo.hasInCallService).toBeDefined();
            expect(caps.canFullScreenIntent).toBeDefined();
        }
    }
}

// ===========================================
// MOCK VALIDATION HELPERS
// ===========================================

export class MockValidationHelper {
    /**
     * Validate mock service interface compliance
     */
    static validateFakeCallServiceInterface(mockService: any): void {
        const requiredMethods = [
            'initialize', 'scheduleCall', 'triggerCall', 'endCall',
            'handleCallAction', 'getCallStatus', 'getActiveCalls',
            'getUserPreferences', 'updateUserPreferences', 'dispose'
        ];

        requiredMethods.forEach(method => {
            expect(mockService[method]).toBeDefined();
            expect(typeof mockService[method]).toBe('function');
        });
    }

    /**
     * Validate mock voice synthesis service interface
     */
    static validateVoiceSynthesisServiceInterface(mockService: any): void {
        const requiredMethods = [
            'initialize', 'getAvailableVoices', 'loadVoiceProfile',
            'preloadVoices', 'synthesizeSpeech', 'synthesizeCallMessage',
            'getVoiceQuality', 'setSynthesisRate', 'setSynthesisPitch',
            'clearCache', 'dispose'
        ];

        requiredMethods.forEach(method => {
            expect(mockService[method]).toBeDefined();
            expect(typeof mockService[method]).toBe('function');
        });
    }

    /**
     * Validate mock caller ID service interface
     */
    static validateCallerIDServiceInterface(mockService: any): void {
        const requiredMethods = [
            'initialize', 'generateSafeCallerID', 'validateCallerID',
            'getSafeNameDatabase', 'validatePhoneNumber', 'dispose'
        ];

        requiredMethods.forEach(method => {
            expect(mockService[method]).toBeDefined();
            expect(typeof mockService[method]).toBe('function');
        });
    }

    /**
     * Validate mock notification service interface
     */
    static validateNotificationServiceInterface(mockService: any): void {
        const requiredMethods = [
            'initialize', 'scheduleNotification', 'sendImmediateNotification',
            'cancelNotification', 'getNotificationStatus', 'updateNotification',
            'getNotificationHistory'
        ];

        requiredMethods.forEach(method => {
            expect(mockService[method]).toBeDefined();
            expect(typeof mockService[method]).toBe('function');
        });
    }
}

// ===========================================
// PERFORMANCE TEST HELPERS
// ===========================================

export class PerformanceTestHelper {
    /**
     * Measure execution time of a function
     */
    static async measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
        const startTime = Date.now();
        const result = await fn();
        const endTime = Date.now();
        const duration = endTime - startTime;

        return { result, duration };
    }

    /**
     * Measure memory usage
     */
    static measureMemoryUsage(): any {
        if (typeof process !== 'undefined' && process.memoryUsage) {
            return process.memoryUsage();
        }
        return {
            rss: 0,
            heapTotal: 0,
            heapUsed: 0,
            external: 0
        };
    }

    /**
     * Create performance test scenarios
     */
    static createPerformanceTestScenario() {
        return {
            name: 'fake-call-performance-test',
            iterations: 100,
            operations: [
                'initialize',
                'scheduleCall',
                'triggerCall',
                'endCall',
                'synthesizeSpeech'
            ],
            expectedDurations: {
                initialize: 500,
                scheduleCall: 200,
                triggerCall: 300,
                endCall: 100,
                synthesizeSpeech: 1000
            }
        };
    }

    /**
     * Validate performance requirements
     */
    static validatePerformanceRequirements(actualDuration: number, expectedDuration: number, tolerance: number = 0.2): void {
        const maxAllowedDuration = expectedDuration * (1 + tolerance);
        expect(actualDuration).toBeLessThanOrEqual(maxAllowedDuration);
    }
}

// ===========================================
// ACCESSIBILITY TEST HELPERS
// ===========================================

export class AccessibilityTestHelper {
    /**
     * Create accessibility test scenarios
     */
    static createAccessibilityTestScenario() {
        return {
            screenReader: {
                enabled: true,
                expectedBehavior: 'Should announce call state changes',
                testCases: ['incoming call', 'call answered', 'call ended']
            },
            keyboardNavigation: {
                enabled: true,
                expectedBehavior: 'All call actions should be keyboard accessible',
                testCases: ['answer', 'decline', 'end call']
            },
            highContrast: {
                enabled: true,
                expectedBehavior: 'Should maintain visibility in high contrast mode',
                testCases: ['call interface', 'notification', 'settings']
            },
            voiceControl: {
                enabled: true,
                expectedBehavior: 'Should respond to voice commands',
                testCases: ['answer call', 'decline call', 'end call']
            }
        };
    }

    /**
     * Validate accessibility compliance
     */
    static validateAccessibilityCompliance(component: any, wcagLevel: 'A' | 'AA' | 'AAA' = 'AA'): void {
        // Basic accessibility checks
        expect(component.props.accessibilityRole).toBeDefined();
        expect(component.props.accessible).toBeDefined();

        // For interactive elements
        if (component.props.onPress || component.props.onClick) {
            expect(component.props.accessibilityLabel).toBeDefined();
            expect(component.props.accessibilityHint).toBeDefined();
        }
    }
}

// ===========================================
// SECURITY TEST HELPERS
// ===========================================

export class SecurityTestHelper {
    /**
     * Create security test cases
     */
    static createSecurityTestCases() {
        return [
            {
                name: 'Input Sanitization Test',
                description: 'Ensure all inputs are properly sanitized',
                maliciousInputs: [
                    '<script>alert("xss")</script>',
                    '../../../etc/passwd',
                    '${jndi:ldap://malicious.com/a}',
                    'DROP TABLE users;'
                ]
            },
            {
                name: 'Call Limits Test',
                description: 'Ensure call limits are enforced',
                scenarios: [
                    'daily limit exceeded',
                    'simultaneous call limit',
                    'resource exhaustion'
                ]
            },
            {
                name: 'Permission Validation Test',
                description: 'Ensure proper permission handling',
                scenarios: [
                    'missing notification permissions',
                    'missing audio permissions',
                    'revoked permissions'
                ]
            }
        ];
    }

    /**
     * Validate input sanitization
     */
    static validateInputSanitization(input: string, expectedClean: boolean = true): boolean {
        // Check for common XSS patterns
        const xssPatterns = [
            /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
            /javascript:/gi,
            /on\w+\s*=/gi
        ];

        const hasXSS = xssPatterns.some(pattern => pattern.test(input));

        // Check for path traversal
        const hasPathTraversal = /\.\.\//.test(input);

        // Check for command injection
        const hasCommandInjection = /[;&|`$()]/.test(input);

        return expectedClean ? !hasXSS && !hasPathTraversal && !hasCommandInjection : hasXSS || hasPathTraversal || hasCommandInjection;
    }

    /**
     * Validate caller ID safety
     */
    static validateCallerIDSafety(callerInfo: CallerInfo): { isSafe: boolean; violations: string[] } {
        const violations: string[] = [];

        // Check for emergency number abuse
        if (callerInfo.phoneNumber === '911' && callerInfo.callerType !== 'emergency') {
            violations.push('Emergency number used for non-emergency caller');
        }

        // Check for real phone numbers
        if (/^[0-9]{10}$/.test(callerInfo.phoneNumber.replace(/\D/g, ''))) {
            violations.push('Real phone number detected');
        }

        // Check for malicious content in display name
        if (!this.validateInputSanitization(callerInfo.displayName)) {
            violations.push('Malicious content in display name');
        }

        return {
            isSafe: violations.length === 0,
            violations
        };
    }
}

// ===========================================
// ERROR SIMULATION HELPERS
// ===========================================

export class ErrorSimulationHelper {
    /**
     * Simulate network errors
     */
    static simulateNetworkError(): Error {
        return new Error('Network connection failed');
    }

    /**
     * Simulate permission denied errors
     */
    static simulatePermissionDeniedError(permission: string): Error {
        return new Error(`Permission denied: ${permission}`);
    }

    /**
     * Simulate resource exhaustion errors
     */
    static simulateResourceExhaustionError(resource: string): Error {
        return new Error(`Resource exhausted: ${resource}`);
    }

    /**
     * Simulate platform-specific errors
     */
    static simulatePlatformError(platform: string, operation: string): Error {
        return new Error(`${platform} platform error during ${operation}`);
    }

    /**
     * Create mock error responses
     */
    static createMockErrorResponse(errorType: CallErrorType, customMessage?: string): any {
        return {
            success: false,
            error: {
                type: errorType,
                code: `${errorType}_MOCK`,
                message: customMessage || `Mock ${errorType} error`,
                recoverable: true,
                suggestedAction: 'Retry the operation',
                timestamp: new Date(),
                callId: 'mock-call-123',
                userId: 'mock-user-123'
            },
            metadata: {
                timestamp: new Date(),
                requestId: 'mock-req-123',
                duration: 100,
                platform: 'ios' as any
            }
        };
    }
}

// ===========================================
// INTEGRATION TEST HELPERS
// ===========================================

export class IntegrationTestHelper {
    /**
     * Create integration test scenarios
     */
    static createIntegrationTestScenarios() {
        return {
            fullCallLifecycle: {
                description: 'Complete fake call from scheduling to ending',
                steps: [
                    'initialize services',
                    'create call schedule',
                    'schedule notification',
                    'trigger call',
                    'handle user interaction',
                    'end call',
                    'cleanup resources'
                ],
                expectedDuration: 5000
            },
            voiceSynthesis: {
                description: 'Voice synthesis integration with call system',
                steps: [
                    'load voice profile',
                    'synthesize speech',
                    'play audio during call',
                    'cleanup audio resources'
                ],
                expectedDuration: 3000
            },
            notificationIntegration: {
                description: 'Notification system integration',
                steps: [
                    'schedule notification',
                    'send immediate notification',
                    'handle notification actions',
                    'cleanup notifications'
                ],
                expectedDuration: 2000
            },
            accessibilityIntegration: {
                description: 'Accessibility features integration',
                steps: [
                    'setup accessibility preferences',
                    'test screen reader support',
                    'test keyboard navigation',
                    'test voice control',
                    'test high contrast mode'
                ],
                expectedDuration: 4000
            }
        };
    }

    /**
     * Validate end-to-end call flow
     */
    static async validateEndToEndFlow(service: any, config: CallSchedule): Promise<boolean> {
        try {
            // Initialize
            const initResult = await service.initialize();
            if (!initResult.success) return false;

            // Schedule call
            const scheduleResult = await service.scheduleCall(config);
            if (!scheduleResult.success) return false;

            const callId = scheduleResult.data?.callId;
            if (!callId) return false;

            // Trigger call
            const triggerResult = await service.triggerCall(callId);
            if (!triggerResult.success) return false;

            // Handle call action
            const actionResult = await service.handleCallAction(callId, CallAction.ANSWER);
            if (!actionResult.success) return false;

            // End call
            const endResult = await service.endCall(callId);
            if (!endResult.success) return false;

            return true;
        } catch (error) {
            console.error('End-to-end flow validation failed:', error);
            return false;
        }
    }
}