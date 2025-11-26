/**
 * Fake Call Service - Main Orchestrator
 * Integrates voice synthesis, caller ID generation, and notification system for complete fake call functionality
 */

import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

import {
    CallState,
    CallAction,
    CallPriority,
    FakeCallType,
    CallStateData,
    CallInteraction,
    CallSchedule,
    FakeCallConfig,
    CallSchedulingResult,
    CallInitializationResult,
    FakeCallPreferences,
    CallErrorType,
    FakeCallResult,
    FakeCallEvent,
    FakeCallEventType
} from './types';

import { voiceSynthesisService } from './VoiceSynthesisService';
import { callerIDService } from './CallerIDService';
import { notificationService } from '../notifications/NotificationService';
import { logger } from '../../utils/Logger';
import { hapticManager, HapticType } from '../../utils/HapticManager';
import { soundManager } from '../../utils/SoundManager';

interface ActiveCall {
    callId: string;
    userId: string;
    config: FakeCallConfig;
    state: CallState;
    startTime?: Date;
    endTime?: Date;
    duration: number;
    interactionHistory: CallInteraction[];
    audioData?: any;
    scheduledTimeout?: any;
    createdAt: Date;
}

interface CallMetrics {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageDuration: number;
    answerRate: number;
    platform: string;
    lastCallDate?: Date;
}

interface SmartSchedulingContext {
    userId: string;
    currentTime: Date;
    isInFocusMode: boolean;
    isInMeeting: boolean;
    batteryLevel: number;
    networkStatus: 'online' | 'offline' | 'poor';
    recentActivity: Date;
}

export class FakeCallService {
    private static instance: FakeCallService;
    private activeCalls: Map<string, ActiveCall> = new Map();
    private scheduledCalls: Map<string, CallSchedule> = new Map();
    private userPreferences: Map<string, FakeCallPreferences> = new Map();
    private callMetrics: Map<string, CallMetrics> = new Map();
    private isInitialized = false;
    private eventListeners: Map<string, ((event: FakeCallEvent) => void)[]> = new Map();

    // Service limits and thresholds
    private readonly MAX_ACTIVE_CALLS = 3;
    private readonly MAX_DAILY_CALLS = 100;
    private readonly DEFAULT_CALL_DURATION = 30;
    private readonly AUTO_DISCONNECT_DELAY = 30000;

    private constructor() {
        this.setupEventHandlers();
    }

    public static getInstance(): FakeCallService {
        if (!FakeCallService.instance) {
            FakeCallService.instance = new FakeCallService();
        }
        return FakeCallService.instance;
    }

    /**
     * Initialize the fake call service and its dependencies
     */
    public async initialize(): Promise<FakeCallResult<void>> {
        try {
            logger.info('Initializing Fake Call Service...');

            // Initialize dependencies
            const [voiceInit, callerIDInit, notificationInit] = await Promise.allSettled([
                voiceSynthesisService.initialize(),
                callerIDService.initialize(),
                notificationService.initialize()
            ]);

            // Load user preferences and call history
            await this.loadUserData();

            // Setup app state listeners
            this.setupAppStateListeners();

            this.isInitialized = true;
            logger.info('Fake Call Service initialized successfully');

            return {
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error('Failed to initialize Fake Call Service:', error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'INIT_FAILED',
                    message: 'Failed to initialize fake call service',
                    recoverable: true,
                    suggestedAction: 'Check service dependencies and permissions',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId: ''
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Schedule a fake call for future execution
     */
    public async scheduleCall(config: CallSchedule): Promise<CallSchedulingResult> {
        try {
            if (!this.isInitialized) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'SERVICE_NOT_INITIALIZED',
                        message: 'Fake call service not initialized',
                        recoverable: true,
                        suggestedAction: 'Call initialize() first',
                        timestamp: new Date(),
                        callId: '',
                        userId: config.userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Validate call limits
            const limitCheck = await this.checkCallLimits(config.userId);
            if (!limitCheck.allowed) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.RESOURCE_EXHAUSTED,
                        code: 'DAILY_LIMIT_REACHED',
                        message: 'Daily call limit reached',
                        recoverable: false,
                        suggestedAction: 'Try again tomorrow or upgrade your plan',
                        timestamp: new Date(),
                        callId: '',
                        userId: config.userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Smart scheduling validation
            const schedulingContext = await this.getSmartSchedulingContext(config.userId);
            const smartScheduleResult = await this.applySmartScheduling(config, schedulingContext);

            if (!smartScheduleResult.shouldProceed) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'SCHEDULING_BLOCKED',
                        message: smartScheduleResult.reason || 'Scheduling blocked by smart rules',
                        recoverable: true,
                        suggestedAction: 'Try again later or adjust your preferences',
                        timestamp: new Date(),
                        callId: '',
                        userId: config.userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Create call schedule
            const callSchedule: CallSchedule = {
                ...config,
                scheduledFor: smartScheduleResult.adjustedTime || config.scheduledFor
            };

            // Store the scheduled call
            this.scheduledCalls.set(callSchedule.id, callSchedule);

            // Schedule with notification service
            const notificationResult = await this.scheduleNotification(callSchedule);

            if (!notificationResult.success) {
                this.scheduledCalls.delete(callSchedule.id);
                return notificationResult;
            }

            // Emit event
            this.emitEvent({
                type: FakeCallEventType.CALL_STARTED,
                data: { callSchedule },
                timestamp: new Date(),
                userId: config.userId,
                callId: callSchedule.id
            });

            logger.info(`Fake call scheduled for ${callSchedule.scheduledFor.toISOString()}`);
            return {
                success: true,
                data: {
                    callId: callSchedule.id,
                    scheduledTime: callSchedule.scheduledFor,
                    notificationId: typeof notificationResult.data === 'string' ? notificationResult.data : undefined
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error('Failed to schedule fake call:', error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'SCHEDULING_FAILED',
                    message: 'Failed to schedule fake call',
                    recoverable: true,
                    suggestedAction: 'Check configuration and try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId: config.userId
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Trigger a fake call immediately
     */
    public async triggerCall(callId: string): Promise<CallInitializationResult> {
        try {
            if (!this.isInitialized) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'SERVICE_NOT_INITIALIZED',
                        message: 'Fake call service not initialized',
                        recoverable: true,
                        suggestedAction: 'Call initialize() first',
                        timestamp: new Date(),
                        callId,
                        userId: ''
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Find the call schedule
            const callSchedule = this.scheduledCalls.get(callId);
            if (!callSchedule) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'CALL_NOT_FOUND',
                        message: 'Scheduled call not found',
                        recoverable: false,
                        suggestedAction: 'Check call ID and try again',
                        timestamp: new Date(),
                        callId,
                        userId: ''
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Check active call limits
            if (this.activeCalls.size >= this.MAX_ACTIVE_CALLS) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.RESOURCE_EXHAUSTED,
                        code: 'MAX_ACTIVE_CALLS_REACHED',
                        message: 'Maximum number of active calls reached',
                        recoverable: true,
                        suggestedAction: 'End other calls before starting a new one',
                        timestamp: new Date(),
                        callId,
                        userId: callSchedule.userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Generate safe caller ID
            const callerResult = await callerIDService.generateSafeCallerID({
                callerType: callSchedule.config.callerInfo.callerType,
                region: 'US'
            });

            if (!callerResult.success || !callerResult.data) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.INVALID_CALLER_ID,
                        code: 'CALLER_GENERATION_FAILED',
                        message: 'Failed to generate safe caller ID',
                        recoverable: true,
                        suggestedAction: 'Check caller ID service configuration',
                        timestamp: new Date(),
                        callId,
                        userId: callSchedule.userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Create call state
            const callStateData: CallStateData = {
                callId,
                userId: callSchedule.userId,
                config: {
                    ...callSchedule.config,
                    callerInfo: callerResult.data
                },
                state: CallState.SCHEDULED,
                startTime: new Date(),
                duration: callSchedule.config.callDuration,
                interactionHistory: [],
                metadata: {
                    platform: Platform.OS as any,
                    appVersion: '1.0.0',
                    deviceInfo: {
                        platform: Platform.OS as any,
                        osVersion: '0.0.0',
                        deviceModel: 'Unknown',
                        hasCallKit: Platform.OS === 'ios',
                        hasInCallService: Platform.OS === 'android',
                        audioSessionAvailable: true,
                        notificationCapabilities: {
                            canSchedule: true,
                            canBadge: true,
                            canSound: true,
                            canVibrate: true,
                            canCriticalAlerts: Platform.OS === 'ios',
                            canFullScreenIntent: Platform.OS === 'android'
                        }
                    },
                    sessionId: uuidv4()
                }
            };

            // Create active call
            const activeCall: ActiveCall = {
                callId,
                userId: callSchedule.userId,
                config: callSchedule.config,
                state: CallState.INCOMING,
                startTime: new Date(),
                duration: callSchedule.config.callDuration,
                interactionHistory: [],
                createdAt: new Date()
            };

            // Store active call
            this.activeCalls.set(callId, activeCall);
            this.scheduledCalls.delete(callId);

            // Setup auto-disconnect
            if (callSchedule.config.autoAnswer) {
                activeCall.scheduledTimeout = setTimeout(() => {
                    this.autoDisconnect(callId);
                }, this.AUTO_DISCONNECT_DELAY);
            }

            // Send notification
            await this.sendIncomingCallNotification(activeCall);

            // Trigger haptic feedback
            await hapticManager.trigger(HapticType.APP_FOREGROUND);

            // Emit event
            this.emitEvent({
                type: FakeCallEventType.CALL_STARTED,
                data: { call: callStateData },
                timestamp: new Date(),
                userId: callSchedule.userId,
                callId
            });

            logger.info(`Fake call triggered: ${callerResult.data.displayName}`);
            return {
                success: true,
                data: {
                    call: callStateData,
                    platformSupport: {
                        canUseNativeCallUI: Platform.OS === 'ios',
                        canUseCallKit: Platform.OS === 'ios',
                        canSimulatePhoneCall: Platform.OS === 'android',
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
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error(`Failed to trigger fake call ${callId}:`, error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'TRIGGER_FAILED',
                    message: 'Failed to trigger fake call',
                    recoverable: true,
                    suggestedAction: 'Check call configuration and try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId,
                    userId: ''
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * End a fake call
     */
    public async endCall(callId: string): Promise<FakeCallResult<void>> {
        try {
            const activeCall = this.activeCalls.get(callId);
            if (!activeCall) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'CALL_NOT_ACTIVE',
                        message: 'Call is not active',
                        recoverable: false,
                        suggestedAction: 'Check call ID',
                        timestamp: new Date(),
                        callId,
                        userId: ''
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Update call state
            activeCall.state = CallState.ENDED;
            activeCall.endTime = new Date();
            activeCall.duration = Math.floor((activeCall.endTime.getTime() - activeCall.startTime!.getTime()) / 1000);

            // Clear timeout
            if (activeCall.scheduledTimeout) {
                clearTimeout(activeCall.scheduledTimeout);
            }

            // Stop audio playback
            await soundManager.playUISound('button');

            // Send end notification
            await this.sendCallEndedNotification(activeCall);

            // Update metrics
            await this.updateCallMetrics(activeCall.userId, {
                success: true,
                duration: activeCall.duration
            });

            // Emit event
            this.emitEvent({
                type: FakeCallEventType.CALL_ENDED,
                data: { callId, duration: activeCall.duration },
                timestamp: new Date(),
                userId: activeCall.userId,
                callId
            });

            // Remove from active calls
            this.activeCalls.delete(callId);

            logger.info(`Fake call ended: ${callId} (${activeCall.duration}s)`);
            return {
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error(`Failed to end fake call ${callId}:`, error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'END_CALL_FAILED',
                    message: 'Failed to end fake call',
                    recoverable: true,
                    suggestedAction: 'Force close the call and try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId,
                    userId: ''
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Handle user interaction with the call
     */
    public async handleCallAction(callId: string, action: CallAction): Promise<FakeCallResult<void>> {
        try {
            const activeCall = this.activeCalls.get(callId);
            if (!activeCall) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'CALL_NOT_ACTIVE',
                        message: 'Call is not active',
                        recoverable: false,
                        suggestedAction: 'Check call ID',
                        timestamp: new Date(),
                        callId,
                        userId: ''
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Create interaction record
            const interaction: CallInteraction = {
                timestamp: new Date(),
                action,
                userAgent: 'user'
            };

            activeCall.interactionHistory.push(interaction);

            // Handle specific actions
            switch (action) {
                case CallAction.ANSWER:
                    await this.answerCall(callId);
                    break;
                case CallAction.DECLINE:
                    await this.declineCall(callId);
                    break;
                case CallAction.END:
                    await this.endCall(callId);
                    break;
                default:
                    logger.warn(`Unhandled call action: ${action}`);
            }

            // Trigger haptic feedback
            await hapticManager.trigger(HapticType.LIGHT_TAP);

            return {
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error(`Failed to handle call action ${action} for call ${callId}:`, error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'ACTION_FAILED',
                    message: `Failed to ${action} call`,
                    recoverable: true,
                    suggestedAction: 'Try the action again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId,
                    userId: ''
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Get the current status of a call
     */
    public async getCallStatus(callId: string): Promise<FakeCallResult<CallStateData>> {
        try {
            const activeCall = this.activeCalls.get(callId);
            if (!activeCall) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'CALL_NOT_FOUND',
                        message: 'Call not found',
                        recoverable: false,
                        suggestedAction: 'Check call ID',
                        timestamp: new Date(),
                        callId,
                        userId: ''
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Convert to CallStateData format
            const callStateData: CallStateData = {
                callId: activeCall.callId,
                userId: activeCall.userId,
                config: activeCall.config,
                state: activeCall.state,
                startTime: activeCall.startTime,
                endTime: activeCall.endTime,
                duration: activeCall.duration,
                interactionHistory: activeCall.interactionHistory,
                metadata: {
                    platform: Platform.OS as any,
                    appVersion: '1.0.0',
                    deviceInfo: {
                        platform: Platform.OS as any,
                        osVersion: '0.0.0',
                        deviceModel: 'Unknown',
                        hasCallKit: Platform.OS === 'ios',
                        hasInCallService: Platform.OS === 'android',
                        audioSessionAvailable: true,
                        notificationCapabilities: {
                            canSchedule: true,
                            canBadge: true,
                            canSound: true,
                            canVibrate: true,
                            canCriticalAlerts: Platform.OS === 'ios',
                            canFullScreenIntent: Platform.OS === 'android'
                        }
                    },
                    sessionId: uuidv4()
                }
            };

            return {
                success: true,
                data: callStateData,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error(`Failed to get call status for ${callId}:`, error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'STATUS_FAILED',
                    message: 'Failed to get call status',
                    recoverable: true,
                    suggestedAction: 'Try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId,
                    userId: ''
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Get all active calls for a user
     */
    public async getActiveCalls(userId: string): Promise<FakeCallResult<CallStateData[]>> {
        try {
            const userCalls = Array.from(this.activeCalls.values())
                .filter(call => call.userId === userId)
                .map(call => ({
                    callId: call.callId,
                    userId: call.userId,
                    config: call.config,
                    state: call.state,
                    startTime: call.startTime,
                    endTime: call.endTime,
                    duration: call.duration,
                    interactionHistory: call.interactionHistory,
                    metadata: {
                        platform: Platform.OS as any,
                        appVersion: '1.0.0',
                        deviceInfo: {
                            platform: Platform.OS as any,
                            osVersion: '0.0.0',
                            deviceModel: 'Unknown',
                            hasCallKit: Platform.OS === 'ios',
                            hasInCallService: Platform.OS === 'android',
                            audioSessionAvailable: true,
                            notificationCapabilities: {
                                canSchedule: true,
                                canBadge: true,
                                canSound: true,
                                canVibrate: true,
                                canCriticalAlerts: Platform.OS === 'ios',
                                canFullScreenIntent: Platform.OS === 'android'
                            }
                        },
                        sessionId: uuidv4()
                    }
                }));

            return {
                success: true,
                data: userCalls,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error(`Failed to get active calls for user ${userId}:`, error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'GET_ACTIVE_CALLS_FAILED',
                    message: 'Failed to get active calls',
                    recoverable: true,
                    suggestedAction: 'Try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Get user preferences
     */
    public async getUserPreferences(userId: string): Promise<FakeCallResult<FakeCallPreferences>> {
        try {
            const preferences = this.userPreferences.get(userId);

            if (!preferences) {
                // Return default preferences
                const defaultPreferences: FakeCallPreferences = {
                    userId,
                    enabled: true,
                    autoAnswer: false,
                    defaultCallDuration: this.DEFAULT_CALL_DURATION,
                    priority: CallPriority.NORMAL,
                    voiceSpeed: 'normal',
                    voiceVolume: 0.7,
                    audioQuality: 'medium',
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

                return {
                    success: true,
                    data: defaultPreferences,
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            return {
                success: true,
                data: preferences,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error(`Failed to get user preferences for ${userId}:`, error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'GET_PREFS_FAILED',
                    message: 'Failed to get user preferences',
                    recoverable: true,
                    suggestedAction: 'Try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Update user preferences
     */
    public async updateUserPreferences(userId: string, preferences: Partial<FakeCallPreferences>): Promise<FakeCallResult<void>> {
        try {
            const currentPreferences = await this.getUserPreferences(userId);

            if (currentPreferences.success && currentPreferences.data) {
                const updatedPreferences: FakeCallPreferences = {
                    ...currentPreferences.data,
                    ...preferences,
                    updatedAt: new Date()
                };

                this.userPreferences.set(userId, updatedPreferences);
                await this.saveUserPreferences(userId);

                logger.info(`Updated preferences for user ${userId}`);

                return {
                    success: true,
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            } else {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'UPDATE_PREFS_FAILED',
                        message: 'Failed to update user preferences',
                        recoverable: true,
                        suggestedAction: 'Try again',
                        timestamp: new Date(),
                        callId: '',
                        userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }
        } catch (error) {
            logger.error(`Failed to update user preferences for ${userId}:`, error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'UPDATE_PREFS_FAILED',
                    message: 'Failed to update user preferences',
                    recoverable: true,
                    suggestedAction: 'Try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    // Event handling methods

    /**
     * Subscribe to fake call events
     */
    public on(eventType: FakeCallEventType, handler: (event: FakeCallEvent) => void): void {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType)!.push(handler);
    }

    /**
     * Unsubscribe from fake call events
     */
    public off(eventType: FakeCallEventType, handler: (event: FakeCallEvent) => void): void {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            const index = listeners.indexOf(handler);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // Private implementation methods

    private async checkCallLimits(userId: string): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
        try {
            const metrics = this.callMetrics.get(userId);
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let todayUsage = 0;
            if (metrics && metrics.lastCallDate) {
                const lastCallDate = new Date(metrics.lastCallDate);
                lastCallDate.setHours(0, 0, 0, 0);
                if (lastCallDate.getTime() === today.getTime()) {
                    todayUsage = metrics.totalCalls;
                }
            }

            return {
                allowed: todayUsage < this.MAX_DAILY_CALLS,
                currentUsage: todayUsage,
                limit: this.MAX_DAILY_CALLS
            };
        } catch (error) {
            logger.error('Failed to check call limits:', error as any);
            return { allowed: false, currentUsage: 0, limit: this.MAX_DAILY_CALLS };
        }
    }

    private async getSmartSchedulingContext(userId: string): Promise<SmartSchedulingContext> {
        return {
            userId,
            currentTime: new Date(),
            isInFocusMode: false,
            isInMeeting: false,
            batteryLevel: 0.8,
            networkStatus: 'online',
            recentActivity: new Date()
        };
    }

    private async applySmartScheduling(
        callSchedule: CallSchedule,
        context: SmartSchedulingContext
    ): Promise<{ shouldProceed: boolean; adjustedTime?: Date; reason?: string }> {
        // Check if smart scheduling is enabled
        if (!callSchedule.smartScheduling.enabled) {
            return { shouldProceed: true };
        }

        // Respect focus mode
        if (callSchedule.smartScheduling.skipDuringFocus && context.isInFocusMode) {
            return {
                shouldProceed: false,
                reason: 'Skipping during focus mode'
            };
        }

        // Respect meetings
        if (callSchedule.smartScheduling.skipDuringMeetings && context.isInMeeting) {
            return {
                shouldProceed: false,
                reason: 'Skipping during meetings'
            };
        }

        // Respect do not disturb
        if (callSchedule.smartScheduling.respectDoNotDisturb) {
            const now = new Date();
            const hour = now.getHours();
            // Simple DND check - 10 PM to 8 AM
            if (hour >= 22 || hour < 8) {
                return {
                    shouldProceed: false,
                    reason: 'Respecting do not disturb hours'
                };
            }
        }

        // Check battery level
        if (context.batteryLevel < 0.2) {
            return {
                shouldProceed: false,
                reason: 'Low battery'
            };
        }

        return { shouldProceed: true };
    }

    private async scheduleNotification(callSchedule: CallSchedule): Promise<CallSchedulingResult> {
        try {
            const notificationData = {
                type: 'quick_reminder' as any,
                category: 'reminders' as any,
                title: 'Fake Call Scheduled',
                message: `Call from ${callSchedule.config.callerInfo.displayName} at ${callSchedule.scheduledFor.toLocaleTimeString()}`,
                priority: 'normal' as any,
                userId: callSchedule.userId,
                scheduledFor: callSchedule.scheduledFor,
                data: {
                    callId: callSchedule.id,
                    callerInfo: callSchedule.config.callerInfo,
                    callConfig: callSchedule.config,
                    scheduledTime: callSchedule.scheduledFor,
                    estimatedDuration: callSchedule.config.callDuration
                }
            };

            const result = await notificationService.scheduleNotification(notificationData);

            if (result.success) {
                return {
                    success: true,
                    data: {
                        callId: callSchedule.id,
                        scheduledTime: callSchedule.scheduledFor,
                        notificationId: result.data
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            } else {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.UNKNOWN_ERROR,
                        code: 'NOTIFICATION_SCHEDULE_FAILED',
                        message: 'Failed to schedule notification',
                        recoverable: true,
                        suggestedAction: 'Check notification service',
                        timestamp: new Date(),
                        callId: callSchedule.id,
                        userId: callSchedule.userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }
        } catch (error) {
            logger.error('Failed to schedule notification:', error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.UNKNOWN_ERROR,
                    code: 'NOTIFICATION_SCHEDULE_FAILED',
                    message: 'Failed to schedule notification',
                    recoverable: true,
                    suggestedAction: 'Check notification service',
                    timestamp: new Date(),
                    callId: callSchedule.id,
                    userId: callSchedule.userId
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    private async sendIncomingCallNotification(activeCall: ActiveCall): Promise<void> {
        try {
            const notificationData = {
                type: 'quick_reminder' as any,
                category: 'reminders' as any,
                title: `${activeCall.config.callerInfo.displayName}`,
                message: 'Incoming fake call',
                priority: activeCall.config.priority as any,
                userId: activeCall.userId,
                data: {
                    callId: activeCall.callId,
                    callerInfo: activeCall.config.callerInfo,
                    callConfig: activeCall.config
                }
            };

            await notificationService.sendImmediateNotification(notificationData);
        } catch (error) {
            logger.error('Failed to send incoming call notification:', error as any);
        }
    }

    private async sendCallEndedNotification(activeCall: ActiveCall): Promise<void> {
        try {
            const notificationData = {
                type: 'quick_reminder' as any,
                category: 'reminders' as any,
                title: 'Call Ended',
                message: `Fake call with ${activeCall.config.callerInfo.displayName} ended`,
                priority: 'normal' as any,
                userId: activeCall.userId,
                data: {
                    callId: activeCall.callId,
                    duration: activeCall.duration,
                    callerInfo: activeCall.config.callerInfo
                }
            };

            await notificationService.sendImmediateNotification(notificationData);
        } catch (error) {
            logger.error('Failed to send call ended notification:', error as any);
        }
    }

    private async answerCall(callId: string): Promise<void> {
        const activeCall = this.activeCalls.get(callId);
        if (!activeCall) return;

        activeCall.state = CallState.ACTIVE;

        // Play synthesized audio if message provided
        if (activeCall.config.audioMessage) {
            try {
                const synthesisResult = await voiceSynthesisService.synthesizeSpeech(
                    activeCall.config.audioMessage,
                    activeCall.config.voiceProfileId
                );

                if (synthesisResult.success) {
                    // Play the synthesized audio
                    await soundManager.playUISound('button');
                }
            } catch (error) {
                logger.error('Failed to play call audio:', error as any);
            }
        }

        logger.info(`Call answered: ${callId}`);
    }

    private async declineCall(callId: string): Promise<void> {
        const activeCall = this.activeCalls.get(callId);
        if (!activeCall) return;

        activeCall.state = CallState.DISMISSED;

        // Play decline sound
        await soundManager.playUISound('button');

        // End the call
        await this.endCall(callId);

        logger.info(`Call declined: ${callId}`);
    }

    private async autoDisconnect(callId: string): Promise<void> {
        const activeCall = this.activeCalls.get(callId);
        if (!activeCall) return;

        activeCall.state = CallState.ENDED;
        activeCall.endTime = new Date();

        await this.endCall(callId);
        logger.info(`Call auto-disconnected: ${callId}`);
    }

    private async updateCallMetrics(userId: string, result: { success: boolean; duration: number }): Promise<void> {
        try {
            const metrics = this.callMetrics.get(userId) || {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageDuration: 0,
                answerRate: 0,
                platform: Platform.OS as any
            };

            metrics.totalCalls++;
            if (result.success) {
                metrics.successfulCalls++;
            } else {
                metrics.failedCalls++;
            }

            // Update average duration
            metrics.averageDuration = ((metrics.averageDuration * (metrics.totalCalls - 1)) + result.duration) / metrics.totalCalls;

            // Update answer rate
            metrics.answerRate = metrics.successfulCalls / metrics.totalCalls;
            (metrics as any).lastCallDate = new Date();

            this.callMetrics.set(userId, metrics);
            await this.saveCallMetrics(userId);
        } catch (error) {
            logger.error('Failed to update call metrics:', error as any);
        }
    }

    private emitEvent(event: FakeCallEvent): void {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            listeners.forEach(handler => {
                try {
                    handler(event);
                } catch (error) {
                    logger.error('Event handler error:', error as any);
                }
            });
        }
    }

    private setupEventHandlers(): void {
        // Setup handlers for notification actions
    }

    private setupAppStateListeners(): void {
        AppState.addEventListener('change', (nextAppState) => {
            if (nextAppState === 'background') {
                this.handleAppBackground();
            } else if (nextAppState === 'active') {
                this.handleAppForeground();
            }
        });
    }

    private async handleAppBackground(): Promise<void> {
        logger.debug('App went to background - managing active calls');
    }

    private async handleAppForeground(): Promise<void> {
        logger.debug('App came to foreground - resuming call management');
    }

    private async loadUserData(): Promise<void> {
        try {
            // Load user preferences
            const preferencesData = await AsyncStorage.getItem('fake_call_preferences');
            if (preferencesData) {
                const preferences = JSON.parse(preferencesData);
                Object.entries(preferences).forEach(([userId, prefs]) => {
                    this.userPreferences.set(userId, prefs as FakeCallPreferences);
                });
            }

            // Load call metrics
            const metricsData = await AsyncStorage.getItem('fake_call_metrics');
            if (metricsData) {
                const metrics = JSON.parse(metricsData);
                Object.entries(metrics).forEach(([userId, metric]) => {
                    this.callMetrics.set(userId, metric as CallMetrics);
                });
            }

            logger.info('User data loaded successfully');
        } catch (error) {
            logger.warn('Failed to load user data:', error as any);
        }
    }

    private async saveUserPreferences(userId: string): Promise<void> {
        try {
            const preferences = this.userPreferences.get(userId);
            if (preferences) {
                const allPreferences = Object.fromEntries(this.userPreferences.entries());
                await AsyncStorage.setItem('fake_call_preferences', JSON.stringify(allPreferences));
            }
        } catch (error) {
            logger.warn('Failed to save user preferences:', error as any);
        }
    }

    private async saveCallMetrics(userId: string): Promise<void> {
        try {
            const metrics = this.callMetrics.get(userId);
            if (metrics) {
                const allMetrics = Object.fromEntries(this.callMetrics.entries());
                await AsyncStorage.setItem('fake_call_metrics', JSON.stringify(allMetrics));
            }
        } catch (error) {
            logger.warn('Failed to save call metrics:', error as any);
        }
    }

    /**
     * Cleanup resources
     */
    public async dispose(): Promise<void> {
        try {
            // End all active calls
            const activeCallIds = Array.from(this.activeCalls.keys());
            await Promise.all(activeCallIds.map(callId => this.endCall(callId)));

            // Clear data
            this.activeCalls.clear();
            this.scheduledCalls.clear();
            this.userPreferences.clear();
            this.callMetrics.clear();
            this.eventListeners.clear();

            // Dispose services
            await voiceSynthesisService.dispose();
            await callerIDService.dispose();

            this.isInitialized = false;
            logger.info('Fake Call Service disposed');
        } catch (error) {
            logger.error('Error during Fake Call Service disposal:', error as any);
        }
    }
}

// Export singleton instance
export const fakeCallService = FakeCallService.getInstance();
export default fakeCallService;