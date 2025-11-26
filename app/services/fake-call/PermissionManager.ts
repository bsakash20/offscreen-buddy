/**
 * Fake Call Permission Manager
 * Platform-specific permission handling for fake call notification system
 * 
 * Manages microphone, calls, notifications, background operations, and accessibility permissions
 * with progressive permission requests and user education
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { securityMonitor } from '../security/SecurityMonitor';
import { privacyManager } from '../security/PrivacyManager';
import { FakeCallConfig, CallError, CallErrorType, FakeCallResult } from './types';

export interface PermissionConfig {
    enableProgressiveRequests: boolean;
    enableUserEducation: boolean;
    enablePermissionRecovery: boolean;
    enableAccessibilityIntegration: boolean;
    enableBackgroundPermissions: boolean;
    requestTimeout: number; // ms
    maxRetries: number;
    educationDelay: number; // ms
}

export interface PermissionStatus {
    microphone: PermissionState;
    notifications: PermissionState;
    calls: PermissionState;
    background: PermissionState;
    accessibility: PermissionState;
    overlay: PermissionState; // Android only
    criticalAlerts: PermissionState; // iOS only
}

export type PermissionState = 'granted' | 'denied' | 'limited' | 'unavailable' | 'undetermined';

export interface PermissionRequest {
    permission: keyof PermissionStatus;
    reason: string;
    educationalMessage?: string;
    fallbackMessage?: string;
    critical?: boolean;
    benefits?: string[];
    steps?: string[];
}

export interface PermissionResult {
    permission: keyof PermissionStatus;
    state: PermissionState;
    granted: boolean;
    shouldEducateUser: boolean;
    canRetry: boolean;
    nextAction?: string;
    educationalContent?: PermissionEducationContent;
}

export interface PermissionEducationContent {
    title: string;
    message: string;
    benefits: string[];
    steps: string[];
    icon?: string;
    primaryAction: string;
    secondaryAction?: string;
}

export interface PermissionContext {
    userId: string;
    isFirstRequest: boolean;
    previousDenials: number;
    userPreferences: {
        skipEducation: boolean;
        autoRequest: boolean;
        silentMode: boolean;
    };
    deviceContext: {
        platform: Platform;
        osVersion: string;
        hasRequestedBefore: boolean;
        permissionHistory: PermissionHistoryEntry[];
    };
}

export interface PermissionHistoryEntry {
    permission: keyof PermissionStatus;
    timestamp: Date;
    state: PermissionState;
    userAction: 'granted' | 'denied' | 'limited' | 'retry';
    context?: string;
}

export interface BackgroundPermissionConfig {
    allowWhileInUse: boolean;
    allowAlways: boolean;
    frequency: 'immediate' | 'delayed' | 'scheduled';
    batteryOptimization: boolean;
    dataUsage: 'low' | 'medium' | 'high';
}

export class FakeCallPermissionManager {
    private config: PermissionConfig;
    private permissionStates: Map<string, PermissionState> = new Map();
    private educationShown: Set<string> = new Set();
    private permissionHistory: Map<string, PermissionHistoryEntry[]> = new Map();
    private isInitialized: boolean = false;

    constructor(config?: Partial<PermissionConfig>) {
        this.config = {
            enableProgressiveRequests: true,
            enableUserEducation: true,
            enablePermissionRecovery: true,
            enableAccessibilityIntegration: true,
            enableBackgroundPermissions: true,
            requestTimeout: 30000, // 30 seconds
            maxRetries: 3,
            educationDelay: 2000, // 2 seconds
            ...config
        };
    }

    /**
     * Initialize permission manager
     */
    async initialize(): Promise<void> {
        try {
            // Load existing permission states
            await this.loadPermissionStates();

            // Load permission history
            await this.loadPermissionHistory();

            // Initialize platform-specific permissions
            await this.initializePlatformPermissions();

            // Start permission monitoring
            this.startPermissionMonitoring();

            await securityMonitor.logSecurityEvent('fake_call_permission_manager_initialized', {
                config: this.config,
                initialStates: Object.fromEntries(this.permissionStates)
            });

            this.isInitialized = true;
            console.log('📱 FakeCall Permission Manager initialized');
        } catch (error) {
            console.error('Failed to initialize FakeCall Permission Manager:', error);
            throw error;
        }
    }

    /**
     * Request all necessary permissions for fake call functionality
     */
    async requestAllPermissions(userId: string): Promise<FakeCallResult<PermissionStatus>> {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const context = await this.buildPermissionContext(userId);
            const requiredPermissions: PermissionRequest[] = [
                {
                    permission: 'microphone',
                    reason: 'Voice synthesis for realistic call audio',
                    educationalMessage: 'Microphone access allows the app to play realistic voice messages during fake calls, creating an authentic calling experience.'
                },
                {
                    permission: 'notifications',
                    reason: 'Display incoming call notifications and manage call scheduling',
                    educationalMessage: 'Notifications are essential for receiving incoming fake calls, call reminders, and scheduling updates.'
                },
                {
                    permission: 'calls',
                    reason: 'Display native call interface and manage call lifecycle',
                    educationalMessage: 'Call permission enables the native call interface for more realistic fake call experiences.'
                }
            ];

            // Add platform-specific permissions
            if (Platform.OS === 'android') {
                requiredPermissions.push({
                    permission: 'overlay',
                    reason: 'Display call interface over other apps',
                    educationalMessage: 'Display over other apps allows the fake call interface to appear on top of any other application.'
                });
            }

            if (Platform.OS === 'ios') {
                requiredPermissions.push({
                    permission: 'criticalAlerts',
                    reason: 'Bypass Do Not Disturb for important fake calls',
                    educationalMessage: 'Critical alerts allow important fake calls to break through Do Not Disturb settings.'
                });
            }

            // Add background permissions for advanced features
            if (this.config.enableBackgroundPermissions) {
                requiredPermissions.push({
                    permission: 'background',
                    reason: 'Background call scheduling and notification delivery',
                    educationalMessage: 'Background access enables scheduling fake calls and receiving notifications even when the app is closed.'
                });
            }

            // Add accessibility permissions
            if (this.config.enableAccessibilityIntegration) {
                requiredPermissions.push({
                    permission: 'accessibility',
                    reason: 'Enhanced accessibility features and voice control',
                    educationalMessage: 'Accessibility permissions enable advanced features like voice control and screen reader support.',
                    critical: false
                });
            }

            const results: PermissionResult[] = [];

            // Request permissions progressively if enabled
            if (this.config.enableProgressiveRequests) {
                for (const request of requiredPermissions) {
                    const result = await this.requestPermission(request, context);
                    results.push(result);

                    // If user denies critical permission, stop progression
                    if (request.critical && !result.granted) {
                        break;
                    }
                }
            } else {
                // Request all permissions simultaneously
                const promises = requiredPermissions.map(request =>
                    this.requestPermission(request, context)
                );
                const permissionResults = await Promise.all(promises);
                results.push(...permissionResults);
            }

            // Build final permission status
            const finalStatus: PermissionStatus = {
                microphone: 'undetermined',
                notifications: 'undetermined',
                calls: 'undetermined',
                background: 'undetermined',
                accessibility: 'undetermined',
                overlay: 'undetermined',
                criticalAlerts: 'undetermined'
            };

            for (const result of results) {
                finalStatus[result.permission] = result.state;
            }

            // Log permission request results
            await securityMonitor.logSecurityEvent('fake_call_permissions_requested', {
                userId,
                results: results.map(r => ({
                    permission: r.permission,
                    state: r.state,
                    granted: r.granted
                })),
                context: {
                    isFirstRequest: context.isFirstRequest,
                    previousDenials: context.previousDenials
                }
            });

            return {
                success: true,
                data: finalStatus,
                metadata: {
                    timestamp: new Date(),
                    requestId: this.generateRequestId(),
                    duration: 0,
                    platform: Platform.OS
                }
            };

        } catch (error) {
            console.error('Failed to request permissions:', error);
            return {
                success: false,
                error: this.createCallError(
                    CallErrorType.ACCESS_DENIED,
                    'Permission request failed'
                ),
                metadata: {
                    timestamp: new Date(),
                    requestId: this.generateRequestId(),
                    duration: 0,
                    platform: Platform.OS
                }
            };
        }
    }

    /**
     * Request a single permission with user education
     */
    async requestPermission(request: PermissionRequest, context: PermissionContext): Promise<PermissionResult> {
        try {
            const permissionKey = `${context.userId}_${request.permission}`;
            const hasBeenDenied = context.deviceContext.permissionHistory
                .some(entry => entry.permission === request.permission && entry.state === 'denied');

            // Check if we should show user education
            const shouldEducate = this.shouldShowEducation(request, context, hasBeenDenied);

            if (shouldEducate && this.config.enableUserEducation) {
                await this.showPermissionEducation(request, context);
            }

            // Perform the actual permission request
            const state = await this.performPermissionRequest(request.permission);

            // Record the permission request in history
            await this.recordPermissionRequest(request.permission, state, context);

            // Update internal state
            this.permissionStates.set(permissionKey, state);

            // Determine if user should be educated for future requests
            const shouldEducateUser = state === 'denied' && !hasBeenDenied;

            // Determine if permission can be retried
            const canRetry = state === 'denied' &&
                context.deviceContext.permissionHistory.filter(h => h.permission === request.permission).length < this.config.maxRetries;

            const result: PermissionResult = {
                permission: request.permission,
                state,
                granted: state === 'granted',
                shouldEducateUser,
                canRetry,
                nextAction: this.getNextAction(state, request),
                educationalContent: shouldEducateUser ? this.getEducationalContent(request) : undefined
            };

            // Save updated states
            await this.savePermissionStates();

            return result;

        } catch (error) {
            console.error(`Failed to request permission ${request.permission}:`, error);

            return {
                permission: request.permission,
                state: 'unavailable',
                granted: false,
                shouldEducateUser: true,
                canRetry: false,
                nextAction: 'Contact support'
            };
        }
    }

    /**
     * Check current permission status
     */
    async getPermissionStatus(userId: string): Promise<PermissionStatus> {
        try {
            const status: PermissionStatus = {
                microphone: await this.checkPermission('microphone'),
                notifications: await this.checkPermission('notifications'),
                calls: await this.checkPermission('calls'),
                background: await this.checkPermission('background'),
                accessibility: await this.checkPermission('accessibility'),
                overlay: await this.checkPermission('overlay'),
                criticalAlerts: await this.checkPermission('criticalAlerts')
            };

            return status;
        } catch (error) {
            console.error('Failed to get permission status:', error);

            // Return default status on error
            return {
                microphone: 'undetermined',
                notifications: 'undetermined',
                calls: 'undetermined',
                background: 'undetermined',
                accessibility: 'undetermined',
                overlay: 'undetermined',
                criticalAlerts: 'undetermined'
            };
        }
    }

    /**
     * Recover from permission denial with educational prompts
     */
    async recoverFromDenial(userId: string, permission: keyof PermissionStatus): Promise<PermissionResult> {
        try {
            const context = await this.buildPermissionContext(userId);
            const history = context.deviceContext.permissionHistory.filter(h => h.permission === permission);

            if (history.length === 0) {
                throw new Error('No denial history found for permission recovery');
            }

            const denialCount = history.filter(h => h.state === 'denied').length;
            const request: PermissionRequest = {
                permission,
                reason: `Recover permission for ${permission}`,
                educationalMessage: `Let's help you enable ${permission} permissions for the best fake call experience.`,
                critical: true
            };

            // Use progressively stronger education messages
            const educationalContent = this.getRecoveryEducationalContent(permission, denialCount);
            request.educationalMessage = educationalContent.message;

            // Show recovery education
            if (this.config.enableUserEducation) {
                await this.showRecoveryEducation(request, educationalContent);
            }

            // Retry permission request
            const result = await this.requestPermission(request, context);

            await securityMonitor.logSecurityEvent('fake_call_permission_recovery_attempted', {
                userId,
                permission,
                denialCount,
                recoveryResult: result.state
            });

            return result;

        } catch (error) {
            console.error('Permission recovery failed:', error);
            throw error;
        }
    }

    /**
     * Get permission requirements for specific fake call features
     */
    async getFeaturePermissions(feature: 'basic_calls' | 'advanced_scheduling' | 'background_execution' | 'accessibility_features'): Promise<{
        required: (keyof PermissionStatus)[];
        optional: (keyof PermissionStatus)[];
        description: string;
    }> {
        switch (feature) {
            case 'basic_calls':
                return {
                    required: ['microphone', 'notifications'],
                    optional: ['calls', 'accessibility'],
                    description: 'Basic fake call functionality requires microphone and notification permissions'
                };

            case 'advanced_scheduling':
                return {
                    required: ['notifications', 'background'],
                    optional: ['calls', 'accessibility'],
                    description: 'Advanced scheduling requires background notifications and background execution'
                };

            case 'background_execution':
                return {
                    required: ['background', 'notifications'],
                    optional: ['microphone', 'calls'],
                    description: 'Background execution requires background app refresh and notification permissions'
                };

            case 'accessibility_features':
                return {
                    required: ['accessibility'],
                    optional: ['microphone', 'notifications'],
                    description: 'Accessibility features require accessibility service permissions'
                };

            default:
                return {
                    required: [],
                    optional: [],
                    description: 'Unknown feature'
                };
        }
    }

    /**
     * Check if user has granted all required permissions for a feature
     */
    async checkFeatureAccess(userId: string, feature: 'basic_calls' | 'advanced_scheduling' | 'background_execution' | 'accessibility_features'): Promise<{
        hasAccess: boolean;
        missingPermissions: (keyof PermissionStatus)[];
        canRequestMissing: boolean;
        suggestions: string[];
    }> {
        try {
            const featurePerms = await this.getFeaturePermissions(feature);
            const currentStatus = await this.getPermissionStatus(userId);

            const missingPermissions: (keyof PermissionStatus)[] = [];

            // Check required permissions
            for (const permission of featurePerms.required) {
                if (currentStatus[permission] !== 'granted') {
                    missingPermissions.push(permission);
                }
            }

            // Check optional permissions (warn if missing but don't block)
            const optionalMissing = featurePerms.optional.filter(permission =>
                currentStatus[permission] !== 'granted'
            );

            const hasAccess = missingPermissions.length === 0;
            const canRequestMissing = missingPermissions.length > 0;

            const suggestions = [
                ...(missingPermissions.length > 0 ? [
                    `Grant ${missingPermissions.join(', ')} permissions for ${feature} features`
                ] : []),
                ...(optionalMissing.length > 0 ? [
                    `Consider granting ${optionalMissing.join(', ')} permissions for enhanced ${feature} experience`
                ] : [])
            ];

            return {
                hasAccess,
                missingPermissions,
                canRequestMissing,
                suggestions
            };

        } catch (error) {
            console.error('Failed to check feature access:', error);
            return {
                hasAccess: false,
                missingPermissions: [],
                canRequestMissing: false,
                suggestions: ['Contact support to resolve permission issues']
            };
        }
    }

    /**
     * Private helper methods
     */
    private async buildPermissionContext(userId: string): Promise<PermissionContext> {
        const permissionHistory = this.permissionHistory.get(userId) || [];
        const previousDenials = permissionHistory.filter(h => h.state === 'denied').length;

        // Load user preferences
        const preferences = await this.getUserPreferences(userId);

        return {
            isFirstRequest: permissionHistory.length === 0,
            previousDenials,
            userPreferences: preferences,
            deviceContext: {
                platform: Platform.OS,
                osVersion: await this.getOSVersion(),
                hasRequestedBefore: permissionHistory.length > 0,
                permissionHistory
            }
        };
    }

    private shouldShowEducation(request: PermissionRequest, context: PermissionContext, hasBeenDenied: boolean): boolean {
        // Don't show education if user has opted out
        if (context.userPreferences.skipEducation) {
            return false;
        }

        // Show education for first-time requests or denials
        if (context.isFirstRequest || hasBeenDenied) {
            return this.config.enableUserEducation;
        }

        // Show education for critical permissions
        if (request.critical) {
            return this.config.enableUserEducation;
        }

        return false;
    }

    private async showPermissionEducation(request: PermissionRequest, context: PermissionContext): Promise<void> {
        const educationalContent = this.getEducationalContent(request);

        return new Promise((resolve) => {
            setTimeout(() => {
                Alert.alert(
                    educationalContent.title,
                    educationalContent.message,
                    [
                        {
                            text: educationalContent.secondaryAction || 'Skip',
                            style: 'default',
                            onPress: resolve
                        },
                        {
                            text: educationalContent.primaryAction,
                            style: 'default',
                            onPress: resolve
                        }
                    ]
                );
            }, this.config.educationDelay);
        });
    }

    private async showRecoveryEducation(request: PermissionRequest, content: any): Promise<void> {
        return new Promise((resolve) => {
            Alert.alert(
                content.title,
                content.message,
                [
                    {
                        text: 'Maybe Later',
                        style: 'default',
                        onPress: resolve
                    },
                    {
                        text: 'Enable Now',
                        style: 'default',
                        onPress: resolve
                    }
                ]
            );
        });
    }

    private async performPermissionRequest(permission: keyof PermissionStatus): Promise<PermissionState> {
        switch (permission) {
            case 'microphone':
                return await this.requestMicrophonePermission();
            case 'notifications':
                return await this.requestNotificationPermission();
            case 'calls':
                return await this.requestCallPermission();
            case 'background':
                return await this.requestBackgroundPermission();
            case 'accessibility':
                return await this.requestAccessibilityPermission();
            case 'overlay':
                return Platform.OS === 'android' ? await this.requestOverlayPermission() : 'unavailable';
            case 'criticalAlerts':
                return Platform.OS === 'ios' ? await this.requestCriticalAlertsPermission() : 'unavailable';
            default:
                return 'unavailable';
        }
    }

    private async requestMicrophonePermission(): Promise<PermissionState> {
        try {
            if (Platform.OS === 'ios') {
                // iOS handles microphone permissions through native audio session
                return 'granted'; // Simplified - would check actual status
            } else if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: 'Microphone Permission',
                        message: 'Microphone access is needed for voice synthesis during fake calls',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK'
                    }
                );

                return granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
            }

            return 'unavailable';
        } catch (error) {
            console.error('Microphone permission request failed:', error);
            return 'unavailable';
        }
    }

    private async requestNotificationPermission(): Promise<PermissionState> {
        try {
            if (Platform.OS === 'ios') {
                // iOS notifications are handled through native implementation
                return 'granted'; // Simplified - would check actual status
            } else if (Platform.OS === 'android') {
                // Android API 33+ requires POST_NOTIFICATIONS permission
                if (Platform.Version >= 33) {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
                        {
                            title: 'Notification Permission',
                            message: 'Notifications are needed to show incoming fake calls',
                            buttonNeutral: 'Ask Me Later',
                            buttonNegative: 'Cancel',
                            buttonPositive: 'OK'
                        }
                    );

                    return granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
                }

                return 'granted'; // Older Android versions don't need explicit permission
            }

            return 'unavailable';
        } catch (error) {
            console.error('Notification permission request failed:', error);
            return 'unavailable';
        }
    }

    private async requestCallPermission(): Promise<PermissionState> {
        try {
            if (Platform.OS === 'android') {
                // Android call permissions
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CALL_PHONE,
                    {
                        title: 'Call Permission',
                        message: 'Call permission enables the native call interface',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK'
                    }
                );

                return granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
            }

            return 'unavailable';
        } catch (error) {
            console.error('Call permission request failed:', error);
            return 'unavailable';
        }
    }

    private async requestBackgroundPermission(): Promise<PermissionState> {
        try {
            if (Platform.OS === 'ios') {
                // iOS background app refresh
                return 'granted'; // Simplified - would check actual status
            } else if (Platform.OS === 'android') {
                // Android background location/access
                return 'granted'; // Simplified - would request specific background permissions
            }

            return 'unavailable';
        } catch (error) {
            console.error('Background permission request failed:', error);
            return 'unavailable';
        }
    }

    private async requestAccessibilityPermission(): Promise<PermissionState> {
        try {
            if (Platform.OS === 'android') {
                // Android accessibility service
                return 'granted'; // Simplified - would open accessibility settings
            } else if (Platform.OS === 'ios') {
                // iOS accessibility features
                return 'granted'; // Simplified - would check assistive access
            }

            return 'unavailable';
        } catch (error) {
            console.error('Accessibility permission request failed:', error);
            return 'unavailable';
        }
    }

    private async requestOverlayPermission(): Promise<PermissionState> {
        try {
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.SYSTEM_ALERT_WINDOW,
                    {
                        title: 'Display Over Other Apps',
                        message: 'This permission allows fake calls to appear over other apps',
                        buttonNeutral: 'Ask Me Later',
                        buttonNegative: 'Cancel',
                        buttonPositive: 'OK'
                    }
                );

                return granted === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied';
            }

            return 'unavailable';
        } catch (error) {
            console.error('Overlay permission request failed:', error);
            return 'unavailable';
        }
    }

    private async requestCriticalAlertsPermission(): Promise<PermissionState> {
        try {
            if (Platform.OS === 'ios') {
                // iOS critical alerts require special setup
                return 'granted'; // Simplified - would use native critical alerts API
            }

            return 'unavailable';
        } catch (error) {
            console.error('Critical alerts permission request failed:', error);
            return 'unavailable';
        }
    }

    private async checkPermission(permission: keyof PermissionStatus): Promise<PermissionState> {
        // In a real implementation, this would check the actual permission status
        // For now, return cached state or default
        return this.permissionStates.get(permission) || 'undetermined';
    }

    private async recordPermissionRequest(
        permission: keyof PermissionStatus,
        state: PermissionState,
        context: PermissionContext
    ): Promise<void> {
        const entry: PermissionHistoryEntry = {
            permission,
            timestamp: new Date(),
            state,
            userAction: state === 'granted' ? 'granted' :
                state === 'denied' ? 'denied' : 'retry',
            context: context.isFirstRequest ? 'first_request' : 'subsequent_request'
        };

        const userId = 'current_user'; // This would come from context in real implementation
        const history = this.permissionHistory.get(userId) || [];
        history.push(entry);

        // Keep only last 50 entries per user
        if (history.length > 50) {
            history.splice(0, history.length - 50);
        }

        this.permissionHistory.set(userId, history);
        await this.savePermissionHistory();
    }

    private getNextAction(state: PermissionState, request: PermissionRequest): string {
        switch (state) {
            case 'granted':
                return 'Permission granted successfully';
            case 'denied':
                return request.critical ?
                    'Critical permission denied - some features may not work' :
                    'Permission denied - features may be limited';
            case 'limited':
                return 'Permission granted with limitations';
            case 'unavailable':
                return 'Permission not available on this device';
            default:
                return 'Permission status unknown';
        }
    }

    private getEducationalContent(request: PermissionRequest): PermissionEducationContent {
        const permissionTitles = {
            microphone: 'Microphone Access',
            notifications: 'Notification Access',
            calls: 'Call Interface Access',
            background: 'Background Execution',
            accessibility: 'Accessibility Features',
            overlay: 'Display Over Apps',
            criticalAlerts: 'Critical Alerts'
        };

        const permissionMessages = {
            microphone: request.educationalMessage || 'Microphone access enables realistic voice synthesis for fake calls.',
            notifications: request.educationalMessage || 'Notifications allow you to receive incoming fake calls and reminders.',
            calls: request.educationalMessage || 'Call access enables the native call interface for realistic fake calls.',
            background: request.educationalMessage || 'Background access enables scheduled fake calls even when the app is closed.',
            accessibility: request.educationalMessage || 'Accessibility features provide enhanced control and compatibility.',
            overlay: request.educationalMessage || 'Display over apps allows fake calls to appear on top of other applications.',
            criticalAlerts: request.educationalMessage || 'Critical alerts allow important fake calls to break through Do Not Disturb.'
        };

        return {
            title: permissionTitles[request.permission],
            message: permissionMessages[request.permission],
            benefits: [
                'Enhanced user experience',
                'More realistic fake call features',
                'Better integration with device capabilities'
            ],
            steps: [
                'Tap "Enable" when prompted',
                'Grant the requested permission',
                'Enjoy enhanced fake call features'
            ],
            primaryAction: 'Enable Now',
            secondaryAction: 'Maybe Later'
        };
    }

    private getRecoveryEducationalContent(permission: keyof PermissionStatus, denialCount: number): any {
        const titles = {
            microphone: 'Enable Microphone Access',
            notifications: 'Enable Notifications',
            calls: 'Enable Call Interface',
            background: 'Enable Background Access',
            accessibility: 'Enable Accessibility',
            overlay: 'Enable Display Over Apps',
            criticalAlerts: 'Enable Critical Alerts'
        };

        const messages = {
            microphone: denialCount > 1 ?
                'Microphone access is needed for realistic voice synthesis. Please enable it to continue.' :
                'Enable microphone access to unlock voice synthesis features.',
            notifications: denialCount > 1 ?
                'Notifications are essential for receiving fake calls. Please enable them.' :
                'Enable notifications to receive incoming fake calls.',
            calls: denialCount > 1 ?
                'Call interface access provides a more realistic experience. Please enable it.' :
                'Enable call interface for native fake call functionality.',
            background: denialCount > 1 ?
                'Background access enables scheduled calls. Please enable it.' :
                'Enable background access for scheduled fake calls.',
            accessibility: denialCount > 1 ?
                'Accessibility features enhance usability. Please enable them.' :
                'Enable accessibility for enhanced features.',
            overlay: denialCount > 1 ?
                'Display over apps is needed for seamless fake calls. Please enable it.' :
                'Enable display over apps for better fake call integration.',
            criticalAlerts: denialCount > 1 ?
                'Critical alerts ensure important fake calls are delivered. Please enable them.' :
                'Enable critical alerts for priority fake calls.'
        };

        return {
            title: titles[permission],
            message: messages[permission],
            denialCount
        };
    }

    private async initializePlatformPermissions(): Promise<void> {
        // Platform-specific initialization
        if (Platform.OS === 'android') {
            // Check for dangerous permissions that need runtime requests
            console.log('📱 Initializing Android permissions...');
        } else if (Platform.OS === 'ios') {
            // Initialize iOS permissions
            console.log('📱 Initializing iOS permissions...');
        }
    }

    private startPermissionMonitoring(): void {
        // Monitor permission changes
        setInterval(async () => {
            await this.checkPermissionChanges();
        }, 30000); // Check every 30 seconds
    }

    private async checkPermissionChanges(): Promise<void> {
        // Check if any permissions have changed state
        // This would be implemented to monitor permission changes from system settings
    }

    private async loadPermissionStates(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('fake_call_permission_states');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.permissionStates = new Map(Object.entries(parsed));
            }
        } catch (error) {
            console.error('Failed to load permission states:', error);
        }
    }

    private async savePermissionStates(): Promise<void> {
        try {
            const states = Object.fromEntries(this.permissionStates);
            await AsyncStorage.setItem('fake_call_permission_states', JSON.stringify(states));
        } catch (error) {
            console.error('Failed to save permission states:', error);
        }
    }

    private async loadPermissionHistory(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('fake_call_permission_history');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.permissionHistory = new Map(Object.entries(parsed).map(([userId, history]: [string, any]) => [
                    userId,
                    history.map((entry: any) => ({
                        ...entry,
                        timestamp: new Date(entry.timestamp)
                    }))
                ]));
            }
        } catch (error) {
            console.error('Failed to load permission history:', error);
        }
    }

    private async savePermissionHistory(): Promise<void> {
        try {
            const history = Object.fromEntries(
                Array.from(this.permissionHistory.entries()).map(([userId, entries]) => [
                    userId,
                    entries.map(entry => ({
                        ...entry,
                        timestamp: entry.timestamp.toISOString()
                    }))
                ])
            );
            await AsyncStorage.setItem('fake_call_permission_history', JSON.stringify(history));
        } catch (error) {
            console.error('Failed to save permission history:', error);
        }
    }

    private async getUserPreferences(userId: string): Promise<{
        skipEducation: boolean;
        autoRequest: boolean;
        silentMode: boolean;
    }> {
        try {
            const key = `user_prefs_${userId}`;
            const stored = await AsyncStorage.getItem(key);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load user preferences:', error);
        }

        return {
            skipEducation: false,
            autoRequest: false,
            silentMode: false
        };
    }

    private async getOSVersion(): Promise<string> {
        return Platform.Version?.toString() || 'unknown';
    }

    private generateRequestId(): string {
        return `perm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private createCallError(type: CallErrorType, message: string): CallError {
        return {
            type,
            code: type,
            message,
            recoverable: false,
            suggestedAction: 'Check app permissions in system settings',
            timestamp: new Date(),
            callId: '',
            userId: ''
        };
    }

    /**
     * Dispose of permission manager
     */
    async dispose(): Promise<void> {
        try {
            // Save current state
            await this.savePermissionStates();
            await this.savePermissionHistory();

            // Clear memory
            this.permissionStates.clear();
            this.educationShown.clear();
            this.permissionHistory.clear();

            await securityMonitor.logSecurityEvent('fake_call_permission_manager_disposed', {
                statesCleared: this.permissionStates.size,
                historyCleared: this.permissionHistory.size
            });

            console.log('📱 FakeCall Permission Manager disposed');
        } catch (error) {
            console.error('Error disposing FakeCall Permission Manager:', error);
        }
    }
}

// Export singleton instance
export const fakeCallPermissionManager = new FakeCallPermissionManager();