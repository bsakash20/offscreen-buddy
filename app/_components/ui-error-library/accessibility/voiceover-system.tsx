/**
 * VoiceOver Optimization System for iOS Error Presentation
 * Advanced VoiceOver integration with intelligent error announcements
 */

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { AccessibilityInfo, Text, Platform } from 'react-native';
import { useEnhancedAccessibility, useErrorAnnouncements } from './enhanced-hooks';

// VoiceOver announcement types
export interface VoiceOverAnnouncement {
    id: string;
    message: string;
    priority: 'low' | 'normal' | 'high' | 'critical';
    category: 'error' | 'warning' | 'success' | 'info';
    context?: string;
    actions?: string[];
    shouldInterrupt?: boolean;
    delayMs?: number;
}

// VoiceOver configuration
export interface VoiceOverConfig {
    enabled: boolean;
    interruptCurrent: boolean;
    queueAnnouncements: boolean;
    contextRetention: boolean;
    adaptiveSpeed: boolean;
    errorContext: boolean;
}

// Context for VoiceOver management
interface VoiceOverContextType {
    config: VoiceOverConfig;
    updateConfig: (newConfig: Partial<VoiceOverConfig>) => void;
    announce: (announcement: VoiceOverAnnouncement) => string;
    announceError: (type: string, message: string, severity: 'low' | 'medium' | 'high' | 'critical') => string;
    announceSuccess: (message: string) => string;
    announceWarning: (message: string) => string;
    announceInfo: (message: string) => string;
    createContextAwareAnnouncement: (baseMessage: string, context: string) => string;
    preserveContext: (context: string) => void;
    getPreservedContext: () => string | null;
    clearContext: () => void;
    isEnabled: boolean;
}

const VoiceOverContext = createContext<VoiceOverContextType | undefined>(undefined);

// Default configuration
const DEFAULT_VOICEOVER_CONFIG: VoiceOverConfig = {
    enabled: true,
    interruptCurrent: true,
    queueAnnouncements: true,
    contextRetention: true,
    adaptiveSpeed: true,
    errorContext: true,
};

// Announcement templates for different error types
const ERROR_ANNOUNCEMENT_TEMPLATES = {
    validation: {
        low: 'Validation notice: {message}',
        medium: 'Please check: {message}',
        high: 'Invalid input: {message}',
        critical: 'Critical validation error: {message}',
    },
    network: {
        low: 'Connection notice: {message}',
        medium: 'Network issue: {message}',
        high: 'Connection failed: {message}',
        critical: 'Network critical error: {message}',
    },
    system: {
        low: 'System notice: {message}',
        medium: 'System issue: {message}',
        high: 'System error: {message}',
        critical: 'System critical error: {message}',
    },
    payment: {
        low: 'Payment notice: {message}',
        medium: 'Payment issue: {message}',
        high: 'Payment failed: {message}',
        critical: 'Payment critical error: {message}',
    },
};

// VoiceOver system provider
interface VoiceOverProviderProps {
    children: ReactNode;
    config?: Partial<VoiceOverConfig>;
    errorAnnouncementTimeout?: number;
    contextRetentionTime?: number;
}

const VoiceOverProvider: React.FC<VoiceOverProviderProps> = ({
    children,
    config = {},
    errorAnnouncementTimeout = 3000,
    contextRetentionTime = 10000,
}) => {
    const [voiceOverConfig, setVoiceOverConfig] = useState<VoiceOverConfig>({
        ...DEFAULT_VOICEOVER_CONFIG,
        ...config,
    });

    const [isVoiceOverEnabled, setIsVoiceOverEnabled] = useState(false);
    const [preservedContext, setPreservedContext] = useState<string | null>(null);
    const [contextTimeout, setContextTimeout] = useState<number | null>(null);
    const { addAnnouncement } = useErrorAnnouncements();
    const { announceForAccessibility, announceForAccessibilityWithOptions } = useEnhancedAccessibility();

    // Monitor VoiceOver status
    useEffect(() => {
        const checkVoiceOverStatus = async () => {
            const isEnabled = await AccessibilityInfo.isScreenReaderEnabled();
            setIsVoiceOverEnabled(isEnabled);
        };

        checkVoiceOverStatus();

        const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
            setIsVoiceOverEnabled(isEnabled);
        });

        return () => {
            if (subscription && typeof subscription.remove === 'function') {
                subscription.remove();
            }
        };
    }, []);

    // Context preservation with timeout
    const preserveContext = useCallback((context: string) => {
        setPreservedContext(context);

        // Clear existing timeout
        if (contextTimeout) {
            clearTimeout(contextTimeout);
        }

        // Set new timeout for context retention
        const timeout = setTimeout(() => {
            setPreservedContext(null);
        }, contextRetentionTime);

        setContextTimeout(timeout);
    }, [contextTimeout, contextRetentionTime]);

    const getPreservedContext = useCallback(() => preservedContext, [preservedContext]);

    const clearContext = useCallback(() => {
        setPreservedContext(null);
        if (contextTimeout) {
            clearTimeout(contextTimeout);
            setContextTimeout(null);
        }
    }, [contextTimeout]);

    // Create context-aware announcements
    const createContextAwareAnnouncement = useCallback((baseMessage: string, context: string) => {
        if (!context) return baseMessage;
        return `${context}. ${baseMessage}`;
    }, []);

    // Template-based announcement creation
    const createTemplateAnnouncement = useCallback((
        type: keyof typeof ERROR_ANNOUNCEMENT_TEMPLATES,
        message: string,
        severity: 'low' | 'medium' | 'high' | 'critical'
    ) => {
        const template = ERROR_ANNOUNCEMENT_TEMPLATES[type][severity];
        return template.replace('{message}', message);
    }, []);

    // Main announcement method with intelligent handling
    const announce = useCallback((announcement: VoiceOverAnnouncement): string => {
        if (!voiceOverConfig.enabled || !isVoiceOverEnabled) {
            return announcement.message;
        }

        let finalMessage = announcement.message;

        // Add preserved context if available
        if (voiceOverConfig.contextRetention && preservedContext) {
            finalMessage = createContextAwareAnnouncement(finalMessage, preservedContext);
        }

        // Add context if provided
        if (announcement.context) {
            finalMessage = createContextAwareAnnouncement(finalMessage, announcement.context);
        }

        // Add actions if provided
        if (announcement.actions && announcement.actions.length > 0) {
            const actionText = announcement.actions.length === 1
                ? announcement.actions[0]
                : `${announcement.actions.slice(0, -1).join(', ')} or ${announcement.actions.slice(-1)}`;
            finalMessage += `. Available action: ${actionText}`;
        }

        // Priority-based announcement handling
        const priority = announcement.priority;

        // Interrupt current announcement for critical errors
        if (priority === 'critical' && voiceOverConfig.interruptCurrent) {
            announceForAccessibility(finalMessage);
            return finalMessage;
        }

        // Queue non-critical announcements
        if (voiceOverConfig.queueAnnouncements) {
            addAnnouncement(finalMessage, priority);
        } else {
            // Immediate announcement
            announceForAccessibility(finalMessage);
        }

        // Preserve context for error announcements
        if (announcement.category === 'error' && voiceOverConfig.errorContext) {
            preserveContext(`Error: ${announcement.message}`);
        }

        return finalMessage;
    }, [
        voiceOverConfig,
        isVoiceOverEnabled,
        preservedContext,
        announceForAccessibility,
        addAnnouncement,
        createContextAwareAnnouncement,
        preserveContext,
    ]);

    // Specialized announcement methods
    const announceError = useCallback((
        type: string,
        message: string,
        severity: 'low' | 'medium' | 'high' | 'critical'
    ): string => {
        const errorTypes = ['validation', 'network', 'system', 'payment'] as const;
        const errorType = errorTypes.includes(type as any) ? type as any : 'system';

        const announcementMessage = createTemplateAnnouncement(errorType, message, severity);

        const announcement: VoiceOverAnnouncement = {
            id: `error_${Date.now()}`,
            message: announcementMessage,
            priority: severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'normal',
            category: 'error',
            context: `Error in ${errorType}`,
            shouldInterrupt: severity === 'critical',
        };

        return announce(announcement);
    }, [announce, createTemplateAnnouncement]);

    const announceSuccess = useCallback((message: string): string => {
        const announcement: VoiceOverAnnouncement = {
            id: `success_${Date.now()}`,
            message: `Success: ${message}`,
            priority: 'low',
            category: 'success',
        };

        return announce(announcement);
    }, [announce]);

    const announceWarning = useCallback((message: string): string => {
        const announcement: VoiceOverAnnouncement = {
            id: `warning_${Date.now()}`,
            message: `Warning: ${message}`,
            priority: 'normal',
            category: 'warning',
        };

        return announce(announcement);
    }, [announce]);

    const announceInfo = useCallback((message: string): string => {
        const announcement: VoiceOverAnnouncement = {
            id: `info_${Date.now()}`,
            message: message,
            priority: 'low',
            category: 'info',
        };

        return announce(announcement);
    }, [announce]);

    const updateConfig = useCallback((newConfig: Partial<VoiceOverConfig>) => {
        setVoiceOverConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const contextValue: VoiceOverContextType = {
        config: voiceOverConfig,
        updateConfig,
        announce,
        announceError,
        announceSuccess,
        announceWarning,
        announceInfo,
        createContextAwareAnnouncement,
        preserveContext,
        getPreservedContext,
        clearContext,
        isEnabled: isVoiceOverEnabled && voiceOverConfig.enabled,
    };

    return (
        <VoiceOverContext.Provider value={contextValue}>
            {children}
        </VoiceOverContext.Provider>
    );
};

// Hook to use VoiceOver context
export const useVoiceOver = (): VoiceOverContextType => {
    const context = useContext(VoiceOverContext);
    if (context === undefined) {
        throw new Error('useVoiceOver must be used within a VoiceOverProvider');
    }
    return context;
};

// VoiceOver-optimized text component
interface VoiceOverTextProps {
    children?: ReactNode;
    announcement?: string;
    accessibilityHint?: string;
    priority?: 'low' | 'normal' | 'high';
    context?: string;
}

export const VoiceOverText: React.FC<VoiceOverTextProps> = ({
    children,
    announcement,
    accessibilityHint,
    priority = 'normal',
    context,
}) => {
    const { createContextAwareAnnouncement } = useVoiceOver();
    const { announceForAccessibility } = useEnhancedAccessibility();

    useEffect(() => {
        if (announcement) {
            let finalAnnouncement = announcement;

            if (context) {
                finalAnnouncement = createContextAwareAnnouncement(announcement, context);
            }

            // Auto-announce on mount for high priority content
            if (priority === 'high') {
                setTimeout(() => {
                    announceForAccessibility(finalAnnouncement);
                }, 100);
            }
        }
    }, [announcement, context, priority, createContextAwareAnnouncement, announceForAccessibility]);

    return (
        <Text
            accessible={true}
            accessibilityLabel={announcement}
            accessibilityHint={accessibilityHint}
            accessibilityRole="text"
        >
            {children}
        </Text>
    );
};

// VoiceOver-optimized error component
interface VoiceOverErrorProps {
    type: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    actions?: string[];
    children?: ReactNode;
    context?: string;
}

export const VoiceOverError: React.FC<VoiceOverErrorProps> = ({
    type,
    message,
    severity,
    actions,
    children,
    context,
}) => {
    const { announceError } = useVoiceOver();

    useEffect(() => {
        if (message) {
            announceError(type, message, severity);
        }
    }, [type, message, severity, announceError]);

    return (
        <Text
            accessible={true}
            accessibilityRole="alert"
            accessibilityLabel={`${type} error: ${message}`}
            accessibilityHint={actions && actions.length > 0 ? `Available actions: ${actions.join(', ')}` : undefined}
        >
            {children}
        </Text>
    );
};

// High-level VoiceOver manager
export class VoiceOverManager {
    private static instance: VoiceOverManager;
    private announcements: Map<string, VoiceOverAnnouncement> = new Map();
    private contextStack: string[] = [];

    static getInstance(): VoiceOverManager {
        if (!VoiceOverManager.instance) {
            VoiceOverManager.instance = new VoiceOverManager();
        }
        return VoiceOverManager.instance;
    }

    // Queue management
    addToQueue(announcement: VoiceOverAnnouncement): void {
        this.announcements.set(announcement.id, announcement);
    }

    removeFromQueue(id: string): void {
        this.announcements.delete(id);
    }

    clearQueue(): void {
        this.announcements.clear();
    }

    // Context management
    pushContext(context: string): void {
        this.contextStack.push(context);
    }

    popContext(): string | null {
        return this.contextStack.pop() || null;
    }

    getCurrentContext(): string | null {
        return this.contextStack[this.contextStack.length - 1] || null;
    }

    clearContextStack(): void {
        this.contextStack = [];
    }

    // Advanced announcement with context
    createContextualAnnouncement(
        baseMessage: string,
        category: 'error' | 'warning' | 'success' | 'info',
        priority: 'low' | 'normal' | 'high' | 'critical'
    ): VoiceOverAnnouncement {
        const context = this.getCurrentContext();

        return {
            id: `vo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            message: context ? `${context}: ${baseMessage}` : baseMessage,
            priority,
            category,
            context: context || undefined,
        };
    }
}

export default VoiceOverProvider;