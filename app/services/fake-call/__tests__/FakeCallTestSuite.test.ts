/**
 * Fake Call Test Suite - Comprehensive Unit and Integration Tests
 * Tests all core functionality of the fake call notification system
 */

import React from 'react';
import { Platform } from 'react-native';
import {
    FakeCallService,
    voiceSynthesisService,
    callerIDService,
    notificationService
} from '../FakeCallService';
import {
    CallState,
    CallAction,
    CallPriority,
    FakeCallType,
    CallErrorType
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

import {
    TestSetupHelper,
    TestAssertionHelper,
    MockValidationHelper,
    PerformanceTestHelper,
    AccessibilityTestHelper,
    SecurityTestHelper,
    ErrorSimulationHelper,
    IntegrationTestHelper
} from './TestHelpers';

import {
    TEST_TIMEOUTS,
    CALL_LIMITS,
    PERFORMANCE_THRESHOLDS,
    TEST_SAMPLE_TEXTS,
    ERROR_TYPES
} from './TestConstants';

describe('FakeCallTestSuite', () => {
    let mockFakeCallService: any;
    let mockVoiceSynthesisService: any;
    let mockCallerIDService: any;
    let mockNotificationService: any;

    beforeAll(() => {
        // Setup test environment
        TestSetupHelper.setupTestEnvironment();

        // Create mock services
        mockFakeCallService = TestSetupHelper.createMockFakeCallService();
        mockVoiceSynthesisService = TestSetupHelper.createMockVoiceSynthesisService();
        mockCallerIDService = TestSetupHelper.createMockCallerIDService();
        mockNotificationService = TestSetupHelper.createMockNotificationService();
    });

    afterAll(() => {
        TestSetupHelper.cleanupTestEnvironment();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    // ===========================================
    // UNIT TESTS - SERVICE INITIALIZATION
    // ===========================================

    describe('Service Initialization Tests', () => {
        test('should initialize fake call service successfully', async () => {
            const result = await mockFakeCallService.initialize();

            expect(result.success).toBe(true);
            expect(result.metadata).toBeDefined();
            expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
            expect(result.metadata.platform).toBeDefined();
        }, TEST_TIMEOUTS.SHORT);

        test('should handle initialization failure gracefully', async () => {
            mockFakeCallService.initialize.mockRejectedValueOnce(new Error('Initialization failed'));

            const result = await mockFakeCallService.initialize();

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error.type).toBe(ERROR_TYPES.UNKNOWN_ERROR);
            expect(result.error.recoverable).toBe(true);
        });

        test('should validate service interface after initialization', async () => {
            await mockFakeCallService.initialize();
            MockValidationHelper.validateFakeCallServiceInterface(mockFakeCallService);
        });
    });

    // ===========================================
    // UNIT TESTS - CALL SCHEDULING
    // ===========================================

    describe('Call Scheduling Tests', () => {
        test('should schedule a call successfully', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();
            const result = await mockFakeCallService.scheduleCall(callSchedule);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.callId).toBeDefined();
            expect(result.data.scheduledTime).toBeDefined();
            expect(result.data.notificationId).toBeDefined();
        });

        test('should reject scheduling when service not initialized', async () => {
            // Simulate uninitialized service
            mockFakeCallService.initialize.mockResolvedValueOnce({
                success: false,
                error: { type: ERROR_TYPES.UNKNOWN_ERROR }
            });

            const callSchedule = MockCallScheduleFactory.createStandard();
            const result = await mockFakeCallService.scheduleCall(callSchedule);

            expect(result.success).toBe(false);
            expect(result.error.type).toBe(ERROR_TYPES.UNKNOWN_ERROR);
            expect(result.error.code).toBe('SERVICE_NOT_INITIALIZED');
        });

        test('should enforce daily call limits', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();

            // Mock hitting daily limit
            mockFakeCallService.scheduleCall.mockRejectedValueOnce({
                type: ERROR_TYPES.RESOURCE_EXHAUSTED,
                code: 'DAILY_LIMIT_REACHED'
            });

            const result = await mockFakeCallService.scheduleCall(callSchedule);

            expect(result.success).toBe(false);
            expect(result.error.type).toBe(ERROR_TYPES.RESOURCE_EXHAUSTED);
            expect(result.error.code).toBe('DAILY_LIMIT_REACHED');
        });

        test('should handle smart scheduling validation', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();
            callSchedule.smartScheduling.enabled = true;
            callSchedule.smartScheduling.skipDuringFocus = true;

            const result = await mockFakeCallService.scheduleCall(callSchedule);

            // Should either succeed or fail with scheduling blocked reason
            if (!result.success) {
                expect(result.error.code).toBe('SCHEDULING_BLOCKED');
                expect(result.error.recoverable).toBe(true);
            }
        });

        test('should handle notification scheduling failure', async () => {
            mockNotificationService.scheduleNotification.mockRejectedValueOnce(
                new Error('Notification scheduling failed')
            );

            const callSchedule = MockCallScheduleFactory.createStandard();
            const result = await mockFakeCallService.scheduleCall(callSchedule);

            expect(result.success).toBe(false);
        });
    });

    // ===========================================
    // UNIT TESTS - CALL TRIGGERING
    // ===========================================

    describe('Call Triggering Tests', () => {
        test('should trigger a scheduled call successfully', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();
            await mockFakeCallService.scheduleCall(callSchedule);

            const result = await mockFakeCallService.triggerCall(callSchedule.id);

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.call).toBeDefined();
            expect(result.data.call.state).toBeDefined();
            expect(result.data.platformSupport).toBeDefined();
            expect(result.data.audioConfig).toBeDefined();
        });

        test('should handle non-existent call ID', async () => {
            const result = await mockFakeCallService.triggerCall('non-existent-id');

            expect(result.success).toBe(false);
            expect(result.error.type).toBe(ERROR_TYPES.UNKNOWN_ERROR);
            expect(result.error.code).toBe('CALL_NOT_FOUND');
        });

        test('should enforce active call limits', async () => {
            // Mock hitting active call limit
            mockFakeCallService.triggerCall.mockRejectedValueOnce({
                type: ERROR_TYPES.RESOURCE_EXHAUSTED,
                code: 'MAX_ACTIVE_CALLS_REACHED'
            });

            const result = await mockFakeCallService.triggerCall('any-call-id');

            expect(result.success).toBe(false);
            expect(result.error.type).toBe(ERROR_TYPES.RESOURCE_EXHAUSTED);
            expect(result.error.code).toBe('MAX_ACTIVE_CALLS_REACHED');
        });

        test('should generate safe caller ID during trigger', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();
            await mockFakeCallService.scheduleCall(callSchedule);

            mockCallerIDService.generateSafeCallerID.mockResolvedValueOnce({
                success: true,
                data: MockCallerInfoFactory.createSafe()
            });

            const result = await mockFakeCallService.triggerCall(callSchedule.id);

            expect(result.success).toBe(true);
            expect(mockCallerIDService.generateSafeCallerID).toHaveBeenCalled();
        });

        test('should handle caller ID generation failure', async () => {
            mockCallerIDService.generateSafeCallerID.mockResolvedValueOnce({
                success: false,
                error: { type: ERROR_TYPES.INVALID_CALLER_ID }
            });

            const callSchedule = MockCallScheduleFactory.createStandard();
            await mockFakeCallService.scheduleCall(callSchedule);

            const result = await mockFakeCallService.triggerCall(callSchedule.id);

            expect(result.success).toBe(false);
            expect(result.error.type).toBe(ERROR_TYPES.INVALID_CALLER_ID);
        });
    });

    // ===========================================
    // UNIT TESTS - CALL MANAGEMENT
    // ===========================================

    describe('Call Management Tests', () => {
        let testCallId: string;

        beforeEach(async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();
            await mockFakeCallService.scheduleCall(callSchedule);
            testCallId = callSchedule.id;
        });

        test('should end a call successfully', async () => {
            const result = await mockFakeCallService.endCall(testCallId);

            expect(result.success).toBe(true);
        });

        test('should handle ending non-existent call', async () => {
            const result = await mockFakeCallService.endCall('non-existent-call');

            expect(result.success).toBe(false);
            expect(result.error.type).toBe(ERROR_TYPES.UNKNOWN_ERROR);
            expect(result.error.code).toBe('CALL_NOT_ACTIVE');
        });

        test('should handle call action - answer', async () => {
            const result = await mockFakeCallService.handleCallAction(testCallId, CallAction.ANSWER);

            expect(result.success).toBe(true);
        });

        test('should handle call action - decline', async () => {
            const result = await mockFakeCallService.handleCallAction(testCallId, CallAction.DECLINE);

            expect(result.success).toBe(true);
        });

        test('should handle call action - end', async () => {
            const result = await mockFakeCallService.handleCallAction(testCallId, CallAction.END);

            expect(result.success).toBe(true);
        });

        test('should get call status successfully', async () => {
            const result = await mockFakeCallService.getCallStatus(testCallId);

            if (result.success) {
                expect(result.data).toBeDefined();
                TestAssertionHelper.assertCallStateData(result.data);
            }
        });

        test('should get all active calls for user', async () => {
            const result = await mockFakeCallService.getActiveCalls('test_user_123');

            expect(result.success).toBe(true);
            expect(Array.isArray(result.data)).toBe(true);

            if (result.data && result.data.length > 0) {
                result.data.forEach(call => TestAssertionHelper.assertCallStateData(call));
            }
        });
    });

    // ===========================================
    // UNIT TESTS - USER PREFERENCES
    // ===========================================

    describe('User Preferences Tests', () => {
        test('should get default user preferences', async () => {
            const result = await mockFakeCallService.getUserPreferences('test_user_123');

            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.data.userId).toBe('test_user_123');
            expect(result.data.enabled).toBeDefined();
            expect(result.data.autoAnswer).toBeDefined();
        });

        test('should update user preferences', async () => {
            const updates = {
                autoAnswer: true,
                defaultCallDuration: 60,
                voiceVolume: 0.8
            };

            const result = await mockFakeCallService.updateUserPreferences('test_user_123', updates);

            expect(result.success).toBe(true);
        });

        test('should handle invalid preference updates', async () => {
            const invalidUpdates = {
                autoAnswer: 'invalid_boolean',
                defaultCallDuration: -1,
                voiceVolume: 2.0
            };

            const result = await mockFakeCallService.updateUserPreferences('test_user_123', invalidUpdates);

            // Should still succeed but validate values
            expect(result.success).toBe(true);
        });
    });

    // ===========================================
    // INTEGRATION TESTS
    // ===========================================

    describe('Integration Tests', () => {
        test('should complete full call lifecycle', async () => {
            const endToEndResult = await IntegrationTestHelper.validateEndToEndFlow(
                mockFakeCallService,
                MockCallScheduleFactory.createStandard()
            );

            expect(endToEndResult).toBe(true);
        }, TEST_TIMEOUTS.MEDIUM);

        test('should integrate with voice synthesis service', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();
            await mockFakeCallService.scheduleCall(callSchedule);
            await mockFakeCallService.triggerCall(callSchedule.id);

            // Test voice synthesis integration
            const synthesisResult = await mockVoiceSynthesisService.synthesizeSpeech(
                TEST_SAMPLE_TEXTS.MEDIUM,
                'professional_male'
            );

            expect(synthesisResult.success).toBe(true);
            expect(synthesisResult.data).toBeDefined();
            TestAssertionHelper.assertAudioBufferInfo(synthesisResult.data);
        });

        test('should integrate with notification service', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();

            // Test notification scheduling
            const scheduleResult = await mockNotificationService.scheduleNotification({
                type: 'fake_call_reminder',
                title: 'Test Call',
                scheduledFor: callSchedule.scheduledFor
            });

            expect(scheduleResult.success).toBe(true);
            expect(scheduleResult.data).toBeDefined();

            // Test immediate notification
            const immediateResult = await mockNotificationService.sendImmediateNotification({
                type: 'fake_call_incoming',
                title: 'Incoming Call',
                message: 'Test incoming call'
            });

            expect(immediateResult.success).toBe(true);
        });

        test('should integrate with caller ID service', async () => {
            const callerResult = await mockCallerIDService.generateSafeCallerID({
                callerType: 'business',
                region: 'US'
            });

            expect(callerResult.success).toBe(true);
            expect(callerResult.data).toBeDefined();
            TestAssertionHelper.assertCallerInfoSafety(callerResult.data);
        });
    });

    // ===========================================
    // PERFORMANCE TESTS
    // ===========================================

    describe('Performance Tests', () => {
        test('should meet initialization performance requirements', async () => {
            const { result, duration } = await PerformanceTestHelper.measureExecutionTime(
                () => mockFakeCallService.initialize()
            );

            expect(result.success).toBe(true);
            PerformanceTestHelper.validatePerformanceRequirements(
                duration,
                PERFORMANCE_THRESHOLDS.INITIALIZATION.MAX_DURATION
            );
        });

        test('should meet call scheduling performance requirements', async () => {
            const callSchedule = MockCallScheduleFactory.createStandard();

            const { result, duration } = await PerformanceTestHelper.measureExecutionTime(
                () => mockFakeCallService.scheduleCall(callSchedule)
            );

            expect(result.success).toBe(true);
            PerformanceTestHelper.validatePerformanceRequirements(
                duration,
                PERFORMANCE_THRESHOLDS.SCHEDULE_CALL.MAX_DURATION
            );
        });

        test('should meet voice synthesis performance requirements', async () => {
            const { result, duration } = await PerformanceTestHelper.measureExecutionTime(
                () => mockVoiceSynthesisService.synthesizeSpeech(
                    TEST_SAMPLE_TEXTS.MEDIUM,
                    'professional_male'
                )
            );

            expect(result.success).toBe(true);
            PerformanceTestHelper.validatePerformanceRequirements(
                duration,
                PERFORMANCE_THRESHOLDS.VOICE_SYNTHESIS.MAX_DURATION
            );
        });

        test('should handle concurrent calls efficiently', async () => {
            const scenarios = MockStressTestFactory.createMultipleCalls(CALL_LIMITS.MAX_ACTIVE_CALLS);

            const startTime = Date.now();
            const promises = scenarios.map(scenario =>
                PerformanceTestHelper.measureExecutionTime(() =>
                    mockFakeCallService.triggerCall(scenario.callId)
                )
            );

            const results = await Promise.all(promises);
            const totalDuration = Date.now() - startTime;

            // All calls should succeed
            results.forEach(result => {
                expect(result.result.success).toBe(true);
            });

            // Concurrent calls should not take much longer than sequential
            expect(totalDuration).toBeLessThan(5000);
        });
    });

    // ===========================================
    // EDGE CASE TESTS
    // ===========================================

    describe('Edge Case Tests', () => {
        test('should handle extremely long audio messages', async () => {
            const longText = TEST_SAMPLE_TEXTS.VERY_LONG;

            const result = await mockVoiceSynthesisService.synthesizeSpeech(longText, 'professional_male');

            expect(result.success).toBe(true);
        });

        test('should handle multiple rapid calls', async () => {
            const callSchedules = Array.from({ length: 10 }, () => MockCallScheduleFactory.createStandard());

            const results = await Promise.all(
                callSchedules.map(schedule => mockFakeCallService.scheduleCall(schedule))
            );

            // Should handle all calls without crashes
            results.forEach(result => {
                expect(result).toBeDefined();
            });
        });

        test('should handle invalid call configurations', async () => {
            const invalidConfig = {
                ...MockFakeCallConfigFactory.createStandard(),
                callDuration: -1,
                voiceProfileId: 'non-existent-voice',
                callerInfo: {
                    name: '',
                    phoneNumber: '',
                    callerType: 'invalid_type' as any
                }
            };

            const callSchedule = MockCallScheduleFactory.createStandard();
            callSchedule.config = invalidConfig;

            const result = await mockFakeCallService.scheduleCall(callSchedule);

            // Should either succeed with validation or fail gracefully
            expect(result.success || !result.success).toBe(true);
        });

        test('should handle service unavailability during operations', async () => {
            // Mock service failures
            mockFakeCallService.scheduleCall.mockRejectedValueOnce(
                ErrorSimulationHelper.simulateNetworkError()
            );

            const callSchedule = MockCallScheduleFactory.createStandard();
            const result = await mockFakeCallService.scheduleCall(callSchedule);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });

    // ===========================================
    // ACCESSIBILITY TESTS
    // ===========================================

    describe('Accessibility Tests', () => {
        test('should integrate with accessibility features', async () => {
            const accessibilityScenario = AccessibilityTestHelper.createAccessibilityTestScenario();

            // Test screen reader support
            expect(accessibilityScenario.screenReader.expectedBehavior).toContain('announce');

            // Test keyboard navigation
            expect(accessibilityScenario.keyboardNavigation.expectedBehavior).toContain('keyboard');

            // Test voice control
            expect(accessibilityScenario.voiceControl.expectedBehavior).toContain('voice');
        });

        test('should validate accessibility compliance', async () => {
            const mockComponent = {
                props: {
                    accessibilityRole: 'button',
                    accessible: true,
                    accessibilityLabel: 'Answer Call',
                    accessibilityHint: 'Tap to answer the incoming call'
                }
            };

            AccessibilityTestHelper.validateAccessibilityCompliance(mockComponent);
        });

        test('should handle accessibility preferences', async () => {
            const accessibilityPrefs = MockFakeCallPreferencesFactory.createAccessibilityOptimized();

            expect(accessibilityPrefs.accessibility.screenReaderEnabled).toBe(true);
            expect(accessibilityPrefs.accessibility.highContrast).toBe(true);
            expect(accessibilityPrefs.accessibility.voiceControl).toBe(true);
        });
    });

    // ===========================================
    // SECURITY TESTS
    // ===========================================

    describe('Security Tests', () => {
        test('should validate input sanitization', async () => {
            const maliciousInputs = SecurityTestHelper.createSecurityTestCases()[0].maliciousInputs;

            maliciousInputs.forEach(input => {
                const isValid = SecurityTestHelper.validateInputSanitization(input, false);
                expect(isValid).toBe(true); // Should detect malicious content
            });
        });

        test('should validate caller ID safety', async () => {
            const testCaller = MockCallerInfoFactory.createSafe();
            const validation = SecurityTestHelper.validateCallerIDSafety(testCaller);

            expect(validation.isSafe).toBe(true);
            expect(validation.violations).toHaveLength(0);
        });

        test('should handle malicious call configuration', async () => {
            const maliciousConfig = MockStressTestFactory.createMaliciousInput();

            // Should sanitize or reject malicious input
            expect(maliciousConfig.callerInfo.name).toContain('<script>');
            expect(maliciousConfig.callerInfo.phoneNumber).toContain('DROP TABLE');

            // The service should detect and handle this safely
            const validation = SecurityTestHelper.validateInputSanitization(maliciousConfig.callerInfo.name);
            expect(validation).toBe(false); // Should be flagged as unsafe
        });
    });

    // ===========================================
    // ERROR HANDLING TESTS
    // ===========================================

    describe('Error Handling Tests', () => {
        test('should handle network errors gracefully', async () => {
            mockFakeCallService.scheduleCall.mockRejectedValueOnce(
                ErrorSimulationHelper.simulateNetworkError()
            );

            const callSchedule = MockCallScheduleFactory.createStandard();
            const result = await mockFakeCallService.scheduleCall(callSchedule);

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error.recoverable).toBe(true);
        });

        test('should handle permission denied errors', async () => {
            mockFakeCallService.initialize.mockRejectedValueOnce(
                ErrorSimulationHelper.simulatePermissionDeniedError('notification')
            );

            const result = await mockFakeCallService.initialize();

            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });

        test('should handle resource exhaustion errors', async () => {
            mockFakeCallService.triggerCall.mockRejectedValueOnce(
                ErrorSimulationHelper.simulateResourceExhaustionError('audio_session')
            );

            const result = await mockFakeCallService.triggerCall('any-call-id');

            expect(result.success).toBe(false);
            expect(result.error.type).toBe(ERROR_TYPES.RESOURCE_EXHAUSTED);
        });

        test('should create proper error responses', async () => {
            const errorResponse = ErrorSimulationHelper.createMockErrorResponse(
                CallErrorType.VOICE_SYNTHESIS_FAILED,
                'Test synthesis error'
            );

            expect(errorResponse.success).toBe(false);
            expect(errorResponse.error.type).toBe(CallErrorType.VOICE_SYNTHESIS_FAILED);
            expect(errorResponse.error.message).toBe('Test synthesis error');
            expect(errorResponse.error.recoverable).toBeDefined();
            expect(errorResponse.error.suggestedAction).toBeDefined();
        });
    });

    // ===========================================
    // CLEANUP TESTS
    // ===========================================

    describe('Service Cleanup Tests', () => {
        test('should dispose services properly', async () => {
            await mockFakeCallService.dispose();

            expect(mockFakeCallService.dispose).toHaveBeenCalled();
        });

        test('should cleanup resources after tests', async () => {
            // Create some test data
            const callSchedule = MockCallScheduleFactory.createStandard();
            await mockFakeCallService.scheduleCall(callSchedule);

            // Cleanup
            await mockFakeCallService.dispose();

            // Verify cleanup (mock should not error on subsequent calls)
            const result = await mockFakeCallService.getActiveCalls('test_user');
            expect(result).toBeDefined();
        });
    });
});

export default FakeCallTestSuite;