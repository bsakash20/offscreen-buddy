/**
 * Progressive Error Disclosure Manager
 * Core service for managing layered error presentation with intelligent adaptation
 */

import React, { createContext, useContext, ReactNode, useReducer, useCallback } from 'react';
import {
    DisclosureManager,
    DisclosureContext,
    ProgressiveDisclosureState,
    DisclosureLevel,
    UserExpertiseLevel,
    ErrorContent,
    DisclosureInteraction,
    UserEngagementMetrics,
    RelatedError,
    ResolutionPath,
    DisclosureEvent,
    DisclosurePreferences,
    AccessibilityPreferences
} from '../types/ProgressiveDisclosureTypes';
import { CrossPlatformAppError } from '../../types/ErrorUITypes';

// State Management
interface DisclosureManagerState {
    activeDisclosures: Map<string, ProgressiveDisclosureState>;
    userProfiles: Map<string, UserExpertiseLevel>;
    globalPreferences: DisclosurePreferences;
    accessibilityPreferences: Map<string, AccessibilityPreferences>;
}

type DisclosureAction =
    | { type: 'SHOW_ERROR'; id: string; error: CrossPlatformAppError; context: Partial<DisclosureContext> }
    | { type: 'UPDATE_LEVEL'; id: string; level: DisclosureLevel }
    | { type: 'RECORD_INTERACTION'; id: string; interaction: DisclosureInteraction }
    | { type: 'UPDATE_PREFERENCES'; userId?: string; preferences: Partial<DisclosurePreferences> }
    | { type: 'CLEAR_DISCLOSURE'; id: string }
    | { type: 'CLEAR_ALL' }
    | { type: 'SET_USER_PROFILE'; userId: string; expertise: UserExpertiseLevel };

// Initial State
const initialState: DisclosureManagerState = {
    activeDisclosures: new Map(),
    userProfiles: new Map(),
    globalPreferences: {
        autoExpand: true,
        expandThreshold: 2,
        defaultLevel: DisclosureLevel.SUMMARY,
        respectExpertise: true,
        progressiveDisclose: true,
        showTechnicalByDefault: false,
        animationSpeed: 'normal',
        compactMode: false
    },
    accessibilityPreferences: new Map()
};

// Reducer
const disclosureReducer = (state: DisclosureManagerState, action: DisclosureAction): DisclosureManagerState => {
    switch (action.type) {
        case 'SHOW_ERROR': {
            const newDisclosure: ProgressiveDisclosureState = {
                currentLevel: action.context.disclosurePreferences?.defaultLevel || state.globalPreferences.defaultLevel,
                expandedSections: new Set(),
                interactionHistory: [],
                userEngagement: {
                    totalDisclosures: 0,
                    averageTimePerLevel: {} as Record<DisclosureLevel, number>,
                    abandonmentRate: {} as Record<DisclosureLevel, number>,
                    mostViewedLevel: DisclosureLevel.SUMMARY,
                    helpfulnessRating: 0
                },
                adaptiveBehavior: {
                    autoExpandThreshold: 3,
                    skipIntermediateLevels: false,
                    contextualRecommendations: true,
                    personalizedContent: true
                }
            };

            return {
                ...state,
                activeDisclosures: new Map(state.activeDisclosures).set(action.id, newDisclosure)
            };
        }

        case 'UPDATE_LEVEL': {
            const currentDisclosure = state.activeDisclosures.get(action.id);
            if (!currentDisclosure) return state;

            return {
                ...state,
                activeDisclosures: new Map(state.activeDisclosures).set(action.id, {
                    ...currentDisclosure,
                    currentLevel: action.level
                })
            };
        }

        case 'RECORD_INTERACTION': {
            const currentDisclosure = state.activeDisclosures.get(action.id);
            if (!currentDisclosure) return state;

            const updatedDisclosure = {
                ...currentDisclosure,
                interactionHistory: [...currentDisclosure.interactionHistory, action.interaction]
            };

            return {
                ...state,
                activeDisclosures: new Map(state.activeDisclosures).set(action.id, updatedDisclosure)
            };
        }

        case 'UPDATE_PREFERENCES': {
            if (action.userId) {
                // Update user-specific preferences
                return state;
            }

            return {
                ...state,
                globalPreferences: { ...state.globalPreferences, ...action.preferences }
            };
        }

        case 'CLEAR_DISCLOSURE': {
            const updatedDisclosures = new Map(state.activeDisclosures);
            updatedDisclosures.delete(action.id);
            return {
                ...state,
                activeDisclosures: updatedDisclosures
            };
        }

        case 'CLEAR_ALL': {
            return {
                ...state,
                activeDisclosures: new Map()
            };
        }

        case 'SET_USER_PROFILE': {
            const updatedProfiles = new Map(state.userProfiles);
            updatedProfiles.set(action.userId, action.expertise);
            return {
                ...state,
                userProfiles: updatedProfiles
            };
        }

        default:
            return state;
    }
};

// Context Creation
interface DisclosureManagerContextType extends DisclosureManager {
    state: DisclosureManagerState;
    dispatch: React.Dispatch<DisclosureAction>;
}

const DisclosureManagerContext = createContext<DisclosureManagerContextType | undefined>(undefined);

// Default Context Generator
const generateDefaultContext = (error: CrossPlatformAppError): Partial<DisclosureContext> => ({
    userExpertise: UserExpertiseLevel.BASIC,
    interactionHistory: [],
    currentError: error,
    applicationState: {
        currentScreen: 'unknown',
        featureInUse: 'unknown',
        userJourneyStage: 'error',
        retryCount: 0
    },
    accessibilityPreferences: {
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        voiceOver: false,
        switchControl: false,
        keyboardNavigation: false
    },
    disclosurePreferences: {
        autoExpand: true,
        expandThreshold: 2,
        defaultLevel: DisclosureLevel.SUMMARY,
        respectExpertise: true,
        progressiveDisclose: true,
        showTechnicalByDefault: false,
        animationSpeed: 'normal',
        compactMode: false
    }
});

// Content Generation Service
class ContentGenerationService {
    async generateErrorContent(error: CrossPlatformAppError, level: DisclosureLevel): Promise<ErrorContent> {
        const summary = await this.generateSummary(error);
        const details = await this.generateDetails(error);
        const technical = await this.generateTechnical(error);
        const debug = await this.generateDebug(error);

        return {
            summary,
            details,
            technical,
            debug,
            contextualHelp: await this.generateContextualHelp(error),
            relatedErrors: await this.getRelatedErrors(error),
            resolutionPaths: await this.getResolutionPaths(error)
        };
    }

    private async generateSummary(error: CrossPlatformAppError) {
        const severityMap = {
            critical: { level: 'critical', color: '#FF3B30', icon: '🚨', announcement: 'Critical error' },
            high: { level: 'high', color: '#FF9500', icon: '⚠️', announcement: 'High priority error' },
            medium: { level: 'medium', color: '#FFCC00', icon: '⚠️', announcement: 'Medium priority error' },
            low: { level: 'low', color: '#34C759', icon: 'ℹ️', announcement: 'Low priority error' }
        };

        const severity = severityMap[error.severity] || severityMap.low;

        return {
            title: this.generateUserFriendlyTitle(error),
            description: this.generateUserFriendlyMessage(error),
            impact: this.generateImpactDescription(error),
            immediateAction: this.generateImmediateAction(error),
            estimatedTimeToResolve: this.generateEstimatedTime(error),
            severityIndicator: {
                level: severity.level as any,
                color: severity.color,
                icon: severity.icon,
                announcement: severity.announcement
            },
            emotionTone: this.determineEmotionTone(error)
        };
    }

    private async generateDetails(error: CrossPlatformAppError) {
        return {
            whatHappened: this.explainWhatHappened(error),
            whyItHappened: this.explainWhyItHappened(error),
            whatYouCanDo: this.generateActionSteps(error),
            preventionTips: this.generatePreventionTips(error),
            relatedFeatures: this.getRelatedFeatures(error),
            nextBestActions: this.generateNextBestActions(error)
        };
    }

    private async generateTechnical(error: CrossPlatformAppError) {
        return {
            errorCode: error.code,
            category: error.category,
            platformDetails: this.extractPlatformDetails(error),
            systemRequirements: this.getSystemRequirements(error),
            technicalContext: this.extractTechnicalContext(error),
            logEntries: this.extractLogEntries(error),
            stackTrace: this.extractStackTrace(error)
        };
    }

    private async generateDebug(error: CrossPlatformAppError) {
        return {
            fullStackTrace: this.extractFullStackTrace(error),
            variables: this.dumpVariables(error),
            systemState: this.captureSystemState(),
            networkRequests: this.captureNetworkRequests(),
            performanceMetrics: this.capturePerformanceMetrics(),
            environmentDetails: this.captureEnvironmentDetails()
        };
    }

    // Helper methods for content generation
    private generateUserFriendlyTitle(error: CrossPlatformAppError): string {
        const categoryMap = {
            network: 'Connection Issue',
            authentication: 'Sign-in Problem',
            validation: 'Input Error',
            system: 'App Issue',
            payment: 'Payment Error',
            storage: 'Storage Problem',
            navigation: 'Navigation Issue',
            business_logic: 'Process Error',
            crash: 'App Crashed',
            performance: 'Performance Issue'
        };

        return categoryMap[error.category] || 'Something went wrong';
    }

    private generateUserFriendlyMessage(error: CrossPlatformAppError): string {
        return error.userFriendlyMessage || error.message;
    }

    private generateImpactDescription(error: CrossPlatformAppError): string {
        const impactMap = {
            blocking: 'This issue prevents you from continuing',
            disruptive: 'This issue affects your current task',
            minor: 'This issue has minimal impact',
            none: 'This issue does not affect your usage'
        };

        return impactMap[error.userImpact] || 'This issue may affect your usage';
    }

    private generateImmediateAction(error: CrossPlatformAppError): string | undefined {
        if (error.retryable) {
            return 'Try again in a moment';
        }

        if (error.recoverable) {
            return 'You can continue with other features';
        }

        return undefined;
    }

    private generateEstimatedTime(error: CrossPlatformAppError): string | undefined {
        if (error.category === 'network') {
            return '1-2 minutes';
        }

        if (error.category === 'payment') {
            return '5-10 minutes';
        }

        return undefined;
    }

    private determineEmotionTone(error: CrossPlatformAppError): 'concerned' | 'helpful' | 'neutral' | 'apologetic' {
        if (error.severity === 'critical') return 'apologetic';
        if (error.userImpact === 'blocking') return 'concerned';
        return 'helpful';
    }

    private explainWhatHappened(error: CrossPlatformAppError): string {
        // Generate contextual explanation based on error category
        switch (error.category) {
            case 'network':
                return 'The app was unable to connect to our servers. This can happen due to internet connectivity issues or server problems.';
            case 'authentication':
                return 'There was an issue with your sign-in credentials. This could be due to incorrect information or account problems.';
            case 'payment':
                return 'The payment process encountered an error. This might be due to payment method issues or processing problems.';
            default:
                return 'An unexpected condition occurred that prevented the app from completing your request.';
        }
    }

    private explainWhyItHappened(error: CrossPlatformAppError): string {
        // Generate technical explanation that's user-friendly
        return `This error (${error.code}) occurred because the app encountered a condition it wasn't prepared for.`;
    }

    private generateActionSteps(error: CrossPlatformAppError) {
        const steps = [];

        if (error.retryable) {
            steps.push({
                id: 'retry',
                title: 'Try Again',
                description: 'Attempt the action one more time',
                action: () => console.log('Retry action'),
                estimatedTime: '30 seconds',
                difficulty: 'easy' as const
            });
        }

        steps.push({
            id: 'check_connection',
            title: 'Check Internet Connection',
            description: 'Verify your device is connected to the internet',
            action: () => console.log('Check connection'),
            estimatedTime: '1 minute',
            difficulty: 'easy' as const
        });

        return steps;
    }

    private generatePreventionTips(error: CrossPlatformAppError): string[] {
        const tips = [];

        switch (error.category) {
            case 'network':
                tips.push('Ensure you have a stable internet connection');
                tips.push('Try using Wi-Fi instead of cellular data for better reliability');
                break;
            case 'authentication':
                tips.push('Double-check your login credentials');
                tips.push('Make sure your account is active and verified');
                break;
            default:
                tips.push('Keep the app updated to the latest version');
                tips.push('Regularly clear app cache to prevent issues');
        }

        return tips;
    }

    private getRelatedFeatures(error: CrossPlatformAppError): string[] {
        // Return related features based on error context
        switch (error.category) {
            case 'payment':
                return ['Billing', 'Account Settings', 'Transaction History'];
            case 'network':
                return ['Settings', 'Help & Support', 'Diagnostics'];
            default:
                return ['Help & Support', 'Contact Us', 'Settings'];
        }
    }

    private generateNextBestActions(error: CrossPlatformAppError) {
        return [
            {
                action: 'Contact Support',
                probability: 0.8,
                impact: 'medium',
                effort: 'low',
                description: 'Get help from our support team'
            },
            {
                action: 'Try Again Later',
                probability: error.retryable ? 0.9 : 0.3,
                impact: 'high',
                effort: 'low',
                description: error.retryable ? 'The issue may resolve itself' : 'May help if the problem is temporary'
            }
        ];
    }

    private extractPlatformDetails(error: CrossPlatformAppError) {
        return {
            platform: error.platformContext.platform,
            osVersion: error.platformContext.deviceInfo.osVersion,
            appVersion: error.platformContext.deviceInfo.appVersion,
            deviceInfo: error.platformContext.deviceInfo.deviceModel,
            networkStatus: error.platformContext.deviceInfo.networkType
        };
    }

    private getSystemRequirements(error: CrossPlatformAppError) {
        return [
            {
                name: 'iOS Version',
                current: error.platformContext.deviceInfo.osVersion,
                required: '13.0',
                status: 'met' as const
            },
            {
                name: 'App Version',
                current: error.platformContext.deviceInfo.appVersion,
                required: '1.0.0',
                status: 'met' as const
            }
        ];
    }

    private extractTechnicalContext(error: CrossPlatformAppError) {
        return {
            component: 'ErrorHandler',
            method: 'handleError',
            lineNumber: 42,
            fileName: 'ErrorHandler.ts',
            module: 'error-handling'
        };
    }

    private extractLogEntries(error: CrossPlatformAppError) {
        return [
            {
                timestamp: new Date(),
                level: 'error' as const,
                message: error.message,
                source: 'ErrorHandler'
            }
        ];
    }

    private extractStackTrace(error: CrossPlatformAppError) {
        return error.nativeError?.stack ? this.parseStackTrace(error.nativeError.stack) : [];
    }

    private extractFullStackTrace(error: CrossPlatformAppError) {
        return this.extractStackTrace(error);
    }

    private dumpVariables(error: CrossPlatformAppError) {
        return {
            errorCode: { value: error.code, type: 'string', description: 'Error identifier' },
            category: { value: error.category, type: 'string', description: 'Error category' },
            severity: { value: error.severity, type: 'string', description: 'Error severity level' }
        };
    }

    private captureSystemState() {
        return {
            memory: { used: 0, available: 0, percentage: 0, breakdown: { app: 0, system: 0, cache: 0 } },
            performance: { cpuUsage: 0, memoryPressure: 'normal' as const },
            storage: { available: 0, used: 0, total: 0, categories: { app: 0, documents: 0, cache: 0, temporary: 0 } },
            network: { type: 'wifi' as const, strength: 100 }
        };
    }

    private captureNetworkRequests() {
        return [];
    }

    private capturePerformanceMetrics() {
        return [];
    }

    private captureEnvironmentDetails() {
        return {
            buildType: 'debug',
            environment: __DEV__ ? 'development' : 'production',
            featureFlags: {},
            configuration: {}
        };
    }

    private parseStackTrace(stack: string) {
        const lines = stack.split('\n');
        return lines.slice(0, 5).map((line, index) => {
            const match = line.match(/at\s+(.+)\s+\((.+):(\d+):(\d+)\)/);
            return match ? {
                function: match[1],
                file: match[2],
                line: parseInt(match[3]),
                column: parseInt(match[4])
            } : {
                function: `frame${index}`,
                file: 'unknown',
                line: 0,
                column: 0
            };
        });
    }

    private async generateContextualHelp(error: CrossPlatformAppError) {
        return [
            {
                id: 'help1',
                title: 'Understanding this error',
                content: 'This section explains what this error means and why it occurred.',
                type: 'explanation' as const,
                relevanceScore: 0.9
            }
        ];
    }

    private async getRelatedErrors(error: CrossPlatformAppError): Promise<RelatedError[]> {
        return [];
    }

    private async getResolutionPaths(error: CrossPlatformAppError): Promise<ResolutionPath[]> {
        return [
            {
                id: 'path1',
                title: 'Try the basic solution',
                description: 'Follow these simple steps to resolve the issue',
                steps: this.generateActionSteps(error),
                successRate: 0.7,
                estimatedTime: '2-3 minutes',
                difficulty: 'easy',
                prerequisites: []
            }
        ];
    }
}

// Manager Implementation
class ProgressiveDisclosureManager implements DisclosureManager {
    private state: DisclosureManagerState;
    private dispatch: React.Dispatch<DisclosureAction>;
    private contentService: ContentGenerationService;

    constructor(state: DisclosureManagerState, dispatch: React.Dispatch<DisclosureAction>) {
        this.state = state;
        this.dispatch = dispatch;
        this.contentService = new ContentGenerationService();
    }

    async showProgressiveError(error: CrossPlatformAppError, context: Partial<DisclosureContext> = {}): Promise<string> {
        const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const fullContext = { ...generateDefaultContext(error), ...context };

        this.dispatch({
            type: 'SHOW_ERROR',
            id,
            error,
            context: fullContext
        });

        return id;
    }

    updateDisclosureLevel(id: string, level: DisclosureLevel): void {
        this.dispatch({
            type: 'UPDATE_LEVEL',
            id,
            level
        });
    }

    recordInteraction(id: string, interaction: DisclosureInteraction): void {
        this.dispatch({
            type: 'RECORD_INTERACTION',
            id,
            interaction
        });
    }

    getUserEngagement(id: string): UserEngagementMetrics {
        const disclosure = this.state.activeDisclosures.get(id);
        return disclosure?.userEngagement || {
            totalDisclosures: 0,
            averageTimePerLevel: {} as Record<DisclosureLevel, number>,
            abandonmentRate: {} as Record<DisclosureLevel, number>,
            mostViewedLevel: DisclosureLevel.SUMMARY,
            helpfulnessRating: 0
        };
    }

    adaptDisclosure(id: string, userBehavior: DisclosureInteraction[]): DisclosureLevel {
        // Analyze user behavior to determine optimal disclosure level
        const advancedUserCount = userBehavior.filter(i =>
            i.action === 'view_technical' || i.action === 'view_debug'
        ).length;

        const totalInteractions = userBehavior.length;
        const advancedRatio = totalInteractions > 0 ? advancedUserCount / totalInteractions : 0;

        if (advancedRatio > 0.7) {
            return DisclosureLevel.TECHNICAL;
        } else if (advancedRatio > 0.3) {
            return DisclosureLevel.DETAILS;
        }

        return DisclosureLevel.SUMMARY;
    }

    getPersonalizedContent(id: string, userProfile: UserExpertiseLevel): ErrorContent {
        // This would generate content based on user expertise level
        // For now, return a placeholder
        return {} as ErrorContent;
    }

    optimizeForAccessibility(id: string, preferences: AccessibilityPreferences): AccessibilityConfig {
        const config: AccessibilityConfig = {
            label: 'Error Information',
            hints: [],
            traits: ['alert'],
            elementType: 'alert',
            supportsVoiceOver: preferences.voiceOver,
            supportsDynamicType: preferences.largeText,
            role: 'alert',
            liveRegion: preferences.voiceOver ? 'assertive' : 'off'
        };

        return config;
    }

    async generateContent(error: CrossPlatformAppError, level: DisclosureLevel): Promise<ErrorContent> {
        return this.contentService.generateErrorContent(error, level);
    }

    getRelatedErrors(error: CrossPlatformAppError): RelatedError[] {
        // Implementation would search for related errors based on patterns
        return [];
    }

    getResolutionPaths(error: CrossPlatformAppError): ResolutionPath[] {
        // Implementation would generate resolution paths based on error patterns
        return [];
    }

    getDisclosureState(id: string): ProgressiveDisclosureState {
        return this.state.activeDisclosures.get(id) || {} as ProgressiveDisclosureState;
    }

    clearDisclosure(id: string): void {
        this.dispatch({
            type: 'CLEAR_DISCLOSURE',
            id
        });
    }

    clearAllDisclosures(): void {
        this.dispatch({
            type: 'CLEAR_ALL'
        });
    }
}

// Provider Component
interface ProgressiveDisclosureProviderProps {
    children: ReactNode;
    initialPreferences?: Partial<DisclosurePreferences>;
    onError?: (error: Error) => void;
}

export const ProgressiveDisclosureProvider: React.FC<ProgressiveDisclosureProviderProps> = ({
    children,
    initialPreferences = {},
    onError
}) => {
    const [state, dispatch] = useReducer(disclosureReducer, {
        ...initialState,
        globalPreferences: { ...initialState.globalPreferences, ...initialPreferences }
    });

    const manager = React.useMemo(() => {
        return new ProgressiveDisclosureManager(state, dispatch);
    }, [state, dispatch]);

    const contextValue: DisclosureManagerContextType = {
        ...manager,
        state,
        dispatch
    };

    return (
        <DisclosureManagerContext.Provider value={contextValue}>
            {children}
        </DisclosureManagerContext.Provider>
    );
};

// Hook to use the manager
export const useProgressiveDisclosure = (): DisclosureManagerContextType => {
    const context = useContext(DisclosureManagerContext);
    if (context === undefined) {
        throw new Error('useProgressiveDisclosure must be used within a ProgressiveDisclosureProvider');
    }
    return context;
};

// Convenience hooks
export const useDisclosureManager = (): DisclosureManager => {
    const { showProgressiveError, updateDisclosureLevel, recordInteraction } = useProgressiveDisclosure();
    return { showProgressiveError, updateDisclosureLevel, recordInteraction };
};

export const useDisclosureState = () => {
    const { state, getDisclosureState, clearDisclosure, clearAllDisclosures } = useProgressiveDisclosure();
    return { state, getDisclosureState, clearDisclosure, clearAllDisclosures };
};

export default ProgressiveDisclosureProvider;