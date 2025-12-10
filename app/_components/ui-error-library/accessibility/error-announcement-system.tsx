/**
 * Comprehensive Error Announcement System for iOS Accessibility
 * Intelligent error announcement timing, prioritization, and context-aware delivery
 */

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode, useRef } from 'react';
import {
    View,
    Text,
    AccessibilityInfo,
    Platform,
    InteractionManager,
} from 'react-native';
import { useVoiceOver } from './voiceover-system';
import { useErrorAnnouncements as useEnhancedErrorAnnouncements } from './enhanced-hooks';
import { useMultiModal } from './multi-modal-system';
import { useCognitiveAccessibility } from './cognitive-accessibility-system';

// Error announcement configuration
export interface ErrorAnnouncementConfig {
    enabled: boolean;
    intelligentTiming: {
        enabled: boolean;
        delayAfterFocus: number;
        delayAfterChange: number;
        batchSimilarErrors: boolean;
        maxAnnouncementsPerMinute: number;
    };
    priorityHandling: {
        criticalInterrupt: boolean;
        urgentQueueJump: boolean;
        batchLowPriority: boolean;
        contextAwarePrioritization: boolean;
    };
    announcementGrouping: {
        enabled: boolean;
        groupTimeout: number;
        maxGroupSize: number;
        summarizeGroups: boolean;
    };
    contextPreservation: {
        enabled: boolean;
        contextRetentionTime: number;
        screenContext: boolean;
        userActionContext: boolean;
        errorFlowContext: boolean;
    };
    accessibilityIntegration: {
        voiceOverOptimization: boolean;
        screenReaderCompatibility: boolean;
        switchControlSupport: boolean;
        motorImpairmentAdaptation: boolean;
    };
}

// Announcement item
interface AnnouncementItem {
    id: string;
    type: 'error' | 'warning' | 'info' | 'success';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    context?: string;
    actions?: string[];
    timestamp: Date;
    priority: number;
    groupId?: string;
    screenContext?: string;
    userActionContext?: string;
    originalSource?: string;
    retryable?: boolean;
    requiresUserAction?: boolean;
}

// Announcement group
interface AnnouncementGroup {
    id: string;
    items: AnnouncementItem[];
    type: 'error' | 'warning' | 'info' | 'success';
    timestamp: Date;
    summarizedMessage?: string;
}

// Error announcement state
interface ErrorAnnouncementState {
    activeAnnouncement: AnnouncementItem | null;
    queuedAnnouncements: AnnouncementItem[];
    announcementGroups: AnnouncementGroup[];
    recentAnnouncements: AnnouncementItem[];
    isProcessingQueue: boolean;
    screenContext: string;
    userActionContext: string;
    lastAnnouncementTime: number;
    announcementsThisMinute: number;
}

// Context for error announcement system
interface ErrorAnnouncementContextType {
    config: ErrorAnnouncementConfig;
    updateConfig: (newConfig: Partial<ErrorAnnouncementConfig>) => void;
    announceError: (
        message: string,
        severity: 'low' | 'medium' | 'high' | 'critical',
        options?: {
            context?: string;
            actions?: string[];
            screenContext?: string;
            userActionContext?: string;
            groupId?: string;
            retryable?: boolean;
            requiresUserAction?: boolean;
        }
    ) => string;
    announceWarning: (message: string, context?: string) => string;
    announceInfo: (message: string, context?: string) => string;
    announceSuccess: (message: string, context?: string) => string;
    createErrorGroup: (errors: Omit<AnnouncementItem, 'id' | 'timestamp' | 'priority'>[]) => string;
    clearAnnouncements: () => void;
    clearQueue: () => void;
    getState: () => ErrorAnnouncementState;
    pauseAnnouncements: () => void;
    resumeAnnouncements: () => void;
    setScreenContext: (context: string) => void;
    setUserActionContext: (context: string) => void;
    getRecommendedActions: (errorType: string, severity: string) => string[];
}

// Context creation
const ErrorAnnouncementContext = createContext<ErrorAnnouncementContextType | undefined>(undefined);

// Default configuration
const DEFAULT_ERROR_ANNOUNCEMENT_CONFIG: ErrorAnnouncementConfig = {
    enabled: true,
    intelligentTiming: {
        enabled: true,
        delayAfterFocus: 500,
        delayAfterChange: 200,
        batchSimilarErrors: true,
        maxAnnouncementsPerMinute: 5,
    },
    priorityHandling: {
        criticalInterrupt: true,
        urgentQueueJump: true,
        batchLowPriority: true,
        contextAwarePrioritization: true,
    },
    announcementGrouping: {
        enabled: true,
        groupTimeout: 3000,
        maxGroupSize: 3,
        summarizeGroups: true,
    },
    contextPreservation: {
        enabled: true,
        contextRetentionTime: 10000,
        screenContext: true,
        userActionContext: true,
        errorFlowContext: true,
    },
    accessibilityIntegration: {
        voiceOverOptimization: true,
        screenReaderCompatibility: true,
        switchControlSupport: true,
        motorImpairmentAdaptation: true,
    },
};

// Provider component
interface ErrorAnnouncementProviderProps {
    children: ReactNode;
    config?: Partial<ErrorAnnouncementConfig>;
    onAnnouncementStart?: (announcement: AnnouncementItem) => void;
    onAnnouncementEnd?: (announcement: AnnouncementItem) => void;
    onQueueEmpty?: () => void;
}

const ErrorAnnouncementProvider: React.FC<ErrorAnnouncementProviderProps> = ({
    children,
    config = {},
    onAnnouncementStart,
    onAnnouncementEnd,
    onQueueEmpty,
}) => {
    const [announcementConfig, setAnnouncementConfig] = useState<ErrorAnnouncementConfig>({
        ...DEFAULT_ERROR_ANNOUNCEMENT_CONFIG,
        ...config,
    });

    const [announcementState, setAnnouncementState] = useState<ErrorAnnouncementState>({
        activeAnnouncement: null,
        queuedAnnouncements: [],
        announcementGroups: [],
        recentAnnouncements: [],
        isProcessingQueue: false,
        screenContext: '',
        userActionContext: '',
        lastAnnouncementTime: 0,
        announcementsThisMinute: 0,
    });

    const queueProcessingRef = useRef<number | null>(null);
    const groupingTimeoutRef = useRef<number | null>(null);
    const announcementHistoryRef = useRef<number[]>([]);

    // Access other accessibility systems
    const { announce: voiceOverAnnounce } = useVoiceOver();
    const { addAnnouncement } = useEnhancedErrorAnnouncements();
    const { provideFeedback } = useMultiModal();
    const { simplifyText, createProgressiveDisclosure } = useCognitiveAccessibility();

    // Announcement prioritization
    const calculatePriority = useCallback((
        type: 'error' | 'warning' | 'info' | 'success',
        severity: 'low' | 'medium' | 'high' | 'critical',
        requiresUserAction?: boolean
    ): number => {
        const basePriority = {
            error: 4,
            warning: 3,
            info: 2,
            success: 1,
        }[type];

        const severityMultiplier = {
            critical: 4,
            high: 3,
            medium: 2,
            low: 1,
        }[severity];

        const actionMultiplier = requiresUserAction ? 1.5 : 1;

        return basePriority * severityMultiplier * actionMultiplier;
    }, []);

    // Smart timing calculation
    const calculateAnnouncementDelay = useCallback((
        announcement: AnnouncementItem,
        previousAnnouncement?: AnnouncementItem
    ): number => {
        if (!announcementConfig.intelligentTiming.enabled) return 0;

        let delay = 0;

        // Focus delay for screen readers
        if (announcementConfig.accessibilityIntegration.screenReaderCompatibility) {
            delay += announcementConfig.intelligentTiming.delayAfterFocus;
        }

        // Change detection delay
        if (previousAnnouncement && previousAnnouncement.message !== announcement.message) {
            delay += announcementConfig.intelligentTiming.delayAfterChange;
        }

        // Critical errors get immediate announcement
        if (announcement.severity === 'critical') {
            delay = 0;
        }

        // Rate limiting consideration
        const now = Date.now();
        const minuteAgo = now - 60000;
        const recentAnnouncements = announcementHistoryRef.current.filter(time => time > minuteAgo);

        if (recentAnnouncements.length >= announcementConfig.intelligentTiming.maxAnnouncementsPerMinute) {
            // Add extra delay for rate limiting
            delay += Math.max(0, 60000 - (now - Math.max(...recentAnnouncements)));
        }

        return delay;
    }, [announcementConfig]);

    // Announcement grouping
    const findGroupForAnnouncement = useCallback((
        announcement: AnnouncementItem
    ): AnnouncementGroup | null => {
        if (!announcementConfig.announcementGrouping.enabled) return null;

        return announcementState.announcementGroups.find(group => {
            // Check if announcement matches group criteria
            const timeDiff = Date.now() - group.timestamp.getTime();
            const withinTimeout = timeDiff < announcementConfig.announcementGrouping.groupTimeout;
            const sameType = group.type === announcement.type;
            const similarSeverity = Math.abs(
                ['low', 'medium', 'high', 'critical'].indexOf(announcement.severity) -
                ['low', 'medium', 'high', 'critical'].indexOf(
                    group.items[0]?.severity || 'low'
                )
            ) <= 1;

            return withinTimeout && sameType && similarSeverity;
        }) || null;
    }, [announcementConfig, announcementState.announcementGroups]);

    // Main announcement creation
    const createAnnouncement = useCallback((
        type: 'error' | 'warning' | 'info' | 'success',
        severity: 'low' | 'medium' | 'high' | 'critical',
        message: string,
        options: {
            context?: string;
            actions?: string[];
            screenContext?: string;
            userActionContext?: string;
            groupId?: string;
            retryable?: boolean;
            requiresUserAction?: boolean;
        } = {}
    ): AnnouncementItem => {
        const {
            context,
            actions = [],
            screenContext,
            userActionContext,
            groupId,
            retryable = false,
            requiresUserAction = false,
        } = options;

        // Apply cognitive accessibility enhancements
        let processedMessage = message;
        if (type === 'error' && announcementConfig.accessibilityIntegration.screenReaderCompatibility) {
            processedMessage = simplifyText(message, 'moderate');
        }

        return {
            id: `announcement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            severity,
            message: processedMessage,
            context,
            actions,
            timestamp: new Date(),
            priority: calculatePriority(type, severity, requiresUserAction),
            groupId: groupId || `group_${type}_${severity}`,
            screenContext: screenContext || announcementState.screenContext,
            userActionContext: userActionContext || announcementState.userActionContext,
            retryable,
            requiresUserAction,
        };
    }, [
        announcementConfig,
        announcementState.screenContext,
        announcementState.userActionContext,
        calculatePriority,
        simplifyText,
    ]);

    // Build comprehensive announcement message
    const buildAnnouncementMessage = useCallback((announcement: AnnouncementItem): string => {
        let message = '';

        // Add severity context
        if (announcement.severity === 'critical') {
            message += 'Critical error: ';
        } else if (announcement.severity === 'high') {
            message += 'Error: ';
        } else if (announcement.severity === 'medium') {
            message += 'Warning: ';
        }

        // Add context if available
        if (announcement.context) {
            message += `${announcement.context}. `;
        }

        // Add main message
        message += announcement.message;

        // Add retry context if applicable
        if (announcement.retryable) {
            message += ' You can try again.';
        }

        // Add available actions
        if (announcement.actions && announcement.actions.length > 0) {
            const actionText = announcement.actions.length === 1
                ? announcement.actions[0]
                : announcement.actions.slice(0, -1).join(', ') + ' or ' + announcement.actions.slice(-1);
            message += ` Available actions: ${actionText}.`;
        }

        return message;
    }, []);

    // Utility methods
    const clearAnnouncements = useCallback(() => {
        setAnnouncementState(prev => ({
            ...prev,
            activeAnnouncement: null,
            queuedAnnouncements: [],
            recentAnnouncements: [],
            announcementGroups: [],
        }));

        if (queueProcessingRef.current) {
            clearTimeout(queueProcessingRef.current);
            queueProcessingRef.current = null;
        }
    }, []);

    const clearQueue = useCallback(() => {
        setAnnouncementState(prev => ({
            ...prev,
            queuedAnnouncements: [],
        }));
    }, []);

    const pauseAnnouncements = useCallback(() => {
        setAnnouncementConfig(prev => ({ ...prev, enabled: false }));
    }, []);

    const resumeAnnouncements = useCallback(() => {
        setAnnouncementConfig(prev => ({ ...prev, enabled: true }));
    }, []);

    const setScreenContext = useCallback((context: string) => {
        setAnnouncementState(prev => ({ ...prev, screenContext: context }));
    }, []);

    const setUserActionContext = useCallback((context: string) => {
        setAnnouncementState(prev => ({ ...prev, userActionContext: context }));
    }, []);

    const getRecommendedActions = useCallback((errorType: string, severity: string): string[] => {
        const actionMap: Record<string, Record<string, string[]>> = {
            network: {
                critical: ['Check internet connection', 'Try again later', 'Contact support'],
                high: ['Check network settings', 'Refresh page', 'Try again'],
                medium: ['Check connection', 'Try again'],
                low: ['Check network', 'Try again'],
            },
            validation: {
                critical: ['Review all fields', 'Check required information', 'Contact support'],
                high: ['Correct highlighted fields', 'Try again'],
                medium: ['Fix validation errors', 'Try again'],
                low: ['Check input format', 'Try again'],
            },
            authentication: {
                critical: ['Restart app', 'Check credentials', 'Contact support'],
                high: ['Re-enter password', 'Reset password'],
                medium: ['Check login details', 'Try again'],
                low: ['Verify information', 'Try again'],
            },
        };

        return actionMap[errorType]?.[severity] || ['Try again', 'Contact support if problem persists'];
    }, []);

    const updateConfig = useCallback((newConfig: Partial<ErrorAnnouncementConfig>) => {
        setAnnouncementConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const getState = useCallback(() => announcementState, [announcementState]);

    // Public announcement methods (simplified for now)
    const announceError = useCallback((
        message: string,
        severity: 'low' | 'medium' | 'high' | 'critical',
        options: {
            context?: string;
            actions?: string[];
            screenContext?: string;
            userActionContext?: string;
            groupId?: string;
            retryable?: boolean;
            requiresUserAction?: boolean;
        } = {}
    ): string => {
        if (!announcementConfig.enabled) return message;

        const announcement = createAnnouncement('error', severity, message, options);

        // Add to queue
        setAnnouncementState(prev => ({
            ...prev,
            queuedAnnouncements: [...prev.queuedAnnouncements, announcement],
        }));

        return announcement.id;
    }, [announcementConfig.enabled, createAnnouncement]);

    const announceWarning = useCallback((message: string, context?: string): string => {
        if (!announcementConfig.enabled) return message;

        const announcement = createAnnouncement('warning', 'medium', message, { context });

        setAnnouncementState(prev => ({
            ...prev,
            queuedAnnouncements: [...prev.queuedAnnouncements, announcement],
        }));

        return announcement.id;
    }, [announcementConfig.enabled, createAnnouncement]);

    const announceInfo = useCallback((message: string, context?: string): string => {
        if (!announcementConfig.enabled) return message;

        const announcement = createAnnouncement('info', 'low', message, { context });

        setAnnouncementState(prev => ({
            ...prev,
            queuedAnnouncements: [...prev.queuedAnnouncements, announcement],
        }));

        return announcement.id;
    }, [announcementConfig.enabled, createAnnouncement]);

    const announceSuccess = useCallback((message: string, context?: string): string => {
        if (!announcementConfig.enabled) return message;

        const announcement = createAnnouncement('success', 'low', message, { context });

        setAnnouncementState(prev => ({
            ...prev,
            queuedAnnouncements: [...prev.queuedAnnouncements, announcement],
        }));

        return announcement.id;
    }, [announcementConfig.enabled, createAnnouncement]);

    const createErrorGroup = useCallback((
        errors: Omit<AnnouncementItem, 'id' | 'timestamp' | 'priority'>[]
    ): string => {
        if (!announcementConfig.announcementGrouping.enabled || errors.length === 0) {
            return '';
        }

        const groupId = `group_${Date.now()}`;
        const processedErrors = errors.map(error => ({
            ...error,
            id: `${groupId}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(),
            priority: calculatePriority(error.type, error.severity, error.requiresUserAction),
            groupId,
        }));

        // Add all errors to queue
        setAnnouncementState(prev => ({
            ...prev,
            queuedAnnouncements: [...prev.queuedAnnouncements, ...processedErrors],
        }));

        // Create group record
        const group: AnnouncementGroup = {
            id: groupId,
            items: processedErrors,
            type: 'error',
            timestamp: new Date(),
            summarizedMessage: createGroupSummary(processedErrors),
        };

        setAnnouncementState(prev => ({
            ...prev,
            announcementGroups: [...prev.announcementGroups, group].slice(-5), // Keep last 5 groups
        }));

        return groupId;
    }, [announcementConfig.announcementGrouping.enabled, calculatePriority]);

    const createGroupSummary = useCallback((errors: AnnouncementItem[]): string => {
        const errorCounts = errors.reduce((acc, error) => {
            acc[error.severity] = (acc[error.severity] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const summaryParts = Object.entries(errorCounts).map(([severity, count]) => {
            if (count === 1) return `${severity} error`;
            return `${count} ${severity} errors`;
        });

        return `${summaryParts.join(', ')} occurred`;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (queueProcessingRef.current) {
                clearTimeout(queueProcessingRef.current);
            }
            if (groupingTimeoutRef.current) {
                clearTimeout(groupingTimeoutRef.current);
            }
        };
    }, []);

    // Clean up old groups
    useEffect(() => {
        const cleanup = setInterval(() => {
            setAnnouncementState(prev => ({
                ...prev,
                announcementGroups: prev.announcementGroups.filter(group =>
                    Date.now() - group.timestamp.getTime() < 60000 // 1 minute
                ),
            }));
        }, 30000); // Clean up every 30 seconds

        return () => clearInterval(cleanup);
    }, []);

    const contextValue: ErrorAnnouncementContextType = {
        config: announcementConfig,
        updateConfig,
        announceError,
        announceWarning,
        announceInfo,
        announceSuccess,
        createErrorGroup,
        clearAnnouncements,
        clearQueue,
        getState,
        pauseAnnouncements,
        resumeAnnouncements,
        setScreenContext,
        setUserActionContext,
        getRecommendedActions,
    };

    return (
        <ErrorAnnouncementContext.Provider value={contextValue}>
            {children}
        </ErrorAnnouncementContext.Provider>
    );
};

// Hook to use error announcement context
export const useErrorAnnouncements = (): ErrorAnnouncementContextType => {
    const context = useContext(ErrorAnnouncementContext);
    if (context === undefined) {
        throw new Error('useErrorAnnouncements must be used within an ErrorAnnouncementProvider');
    }
    return context;
};

// Error announcement status component
interface ErrorAnnouncementStatusProps {
    visible: boolean;
    onDismiss?: () => void;
}

export const ErrorAnnouncementStatus: React.FC<ErrorAnnouncementStatusProps> = ({
    visible,
    onDismiss,
}) => {
    const { getState } = useErrorAnnouncements();
    const [state, setState] = useState(getState());

    useEffect(() => {
        const interval = setInterval(() => {
            setState(getState());
        }, 1000);

        return () => clearInterval(interval);
    }, [getState]);

    if (!visible) return null;

    return (
        <View style={{
            position: 'absolute',
            top: 50,
            right: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            borderRadius: 8,
            zIndex: 1000,
        }}>
            <Text style={{ color: 'white', fontSize: 12, marginBottom: 4 }}>
                Accessibility Status
            </Text>
            <Text style={{ color: 'white', fontSize: 10 }}>
                Active: {state.activeAnnouncement ? 'Yes' : 'No'}
            </Text>
            <Text style={{ color: 'white', fontSize: 10 }}>
                Queue: {state.queuedAnnouncements.length}
            </Text>
            <Text style={{ color: 'white', fontSize: 10 }}>
                Context: {state.screenContext || 'None'}
            </Text>
        </View>
    );
};

// High-level error announcement manager
export class ErrorAnnouncementManager {
    private static instance: ErrorAnnouncementManager;
    private announcements: Map<string, AnnouncementItem> = new Map();
    private groups: Map<string, AnnouncementGroup> = new Map();

    static getInstance(): ErrorAnnouncementManager {
        if (!ErrorAnnouncementManager.instance) {
            ErrorAnnouncementManager.instance = new ErrorAnnouncementManager();
        }
        return ErrorAnnouncementManager.instance;
    }

    addAnnouncement(announcement: AnnouncementItem): void {
        this.announcements.set(announcement.id, announcement);
    }

    addGroup(group: AnnouncementGroup): void {
        this.groups.set(group.id, group);
        group.items.forEach(item => {
            this.announcements.set(item.id, item);
        });
    }

    getAnnouncement(id: string): AnnouncementItem | null {
        return this.announcements.get(id) || null;
    }

    getGroup(id: string): AnnouncementGroup | null {
        return this.groups.get(id) || null;
    }

    getRecentAnnouncements(limit: number = 10): AnnouncementItem[] {
        return Array.from(this.announcements.values())
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }

    clearOldAnnouncements(maxAge: number = 300000): void { // 5 minutes
        const cutoff = Date.now() - maxAge;
        this.announcements.forEach((announcement, id) => {
            if (announcement.timestamp.getTime() < cutoff) {
                this.announcements.delete(id);
            }
        });
    }

    getStatistics() {
        return {
            totalAnnouncements: this.announcements.size,
            totalGroups: this.groups.size,
            byType: {
                error: Array.from(this.announcements.values()).filter(a => a.type === 'error').length,
                warning: Array.from(this.announcements.values()).filter(a => a.type === 'warning').length,
                info: Array.from(this.announcements.values()).filter(a => a.type === 'info').length,
                success: Array.from(this.announcements.values()).filter(a => a.type === 'success').length,
            },
            bySeverity: {
                critical: Array.from(this.announcements.values()).filter(a => a.severity === 'critical').length,
                high: Array.from(this.announcements.values()).filter(a => a.severity === 'high').length,
                medium: Array.from(this.announcements.values()).filter(a => a.severity === 'medium').length,
                low: Array.from(this.announcements.values()).filter(a => a.severity === 'low').length,
            },
        };
    }
}

export default ErrorAnnouncementProvider;