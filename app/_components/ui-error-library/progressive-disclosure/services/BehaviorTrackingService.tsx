/**
 * User Behavior Tracking and Optimization System
 * Analyzes user interactions to optimize progressive disclosure experience
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
    DisclosureInteraction,
    DisclosureLevel,
    UserEngagementMetrics,
    UserExpertiseLevel,
    DisclosureEvent,
    DisclosurePreferences
} from '../types/ProgressiveDisclosureTypes';

// User Behavior Tracking Context
interface BehaviorTrackingContextType {
    recordInteraction: (interaction: DisclosureInteraction) => void;
    getEngagementMetrics: () => UserEngagementMetrics;
    getUserExpertiseLevel: () => UserExpertiseLevel;
    getOptimizedPreferences: () => Partial<DisclosurePreferences>;
    getBehavioralInsights: () => BehavioralInsights;
    clearHistory: () => void;
}

const BehaviorTrackingContext = createContext<BehaviorTrackingContextType | undefined>(undefined);

// Behavioral Insights Interface
interface BehavioralInsights {
    expertiseLevel: UserExpertiseLevel;
    preferredDisclosureLevel: DisclosureLevel;
    interactionPattern: InteractionPattern;
    engagementScore: number;
    optimalTiming: number;
    accessibilityNeeds: AccessibilityNeeds;
    personalizedRecommendations: string[];
}

interface InteractionPattern {
    primaryAction: 'expand' | 'collapse' | 'view_detail' | 'view_technical' | 'view_debug';
    averageTimePerLevel: Record<DisclosureLevel, number>;
    abandonmentTriggers: string[];
    completionRate: number;
    mostUsefulLevels: DisclosureLevel[];
}

interface AccessibilityNeeds {
    prefersReducedMotion: boolean;
    prefersLargeText: boolean;
    needsHighContrast: boolean;
    voiceOverUsage: number;
    gestureComplexity: number;
}

// Behavior Tracking Service
class BehaviorTrackingService {
    private interactions: DisclosureInteraction[] = [];
    private sessionStartTime: number = Date.now();
    private readonly MAX_INTERACTIONS = 1000;

    // Record user interaction
    recordInteraction(interaction: DisclosureInteraction): void {
        // Add timestamp if not present
        if (!interaction.timestamp) {
            interaction.timestamp = new Date();
        }

        // Add session duration
        interaction.duration = Date.now() - this.sessionStartTime;

        this.interactions.push(interaction);

        // Maintain maximum size for performance
        if (this.interactions.length > this.MAX_INTERACTIONS) {
            this.interactions = this.interactions.slice(-this.MAX_INTERACTIONS / 2);
        }

        // Save to persistent storage
        this.saveToStorage();
    }

    // Calculate engagement metrics
    getEngagementMetrics(): UserEngagementMetrics {
        const totalInteractions = this.interactions.length;

        if (totalInteractions === 0) {
            return {
                totalDisclosures: 0,
                averageTimePerLevel: {} as Record<DisclosureLevel, number>,
                abandonmentRate: {} as Record<DisclosureLevel, number>,
                mostViewedLevel: DisclosureLevel.SUMMARY,
                helpfulnessRating: 0
            };
        }

        // Calculate average time per level
        const timeByLevel = this.interactions.reduce((acc, interaction) => {
            acc[interaction.level] = (acc[interaction.level] || 0) + interaction.duration;
            return acc;
        }, {} as Record<DisclosureLevel, number>);

        const averageTimePerLevel = Object.entries(timeByLevel).reduce((acc, [level, totalTime]) => {
            const levelInteractions = this.interactions.filter(i => i.level === level).length;
            acc[level as DisclosureLevel] = levelInteractions > 0 ? totalTime / levelInteractions : 0;
            return acc;
        }, {} as Record<DisclosureLevel, number>);

        // Calculate abandonment rate per level
        const abandonmentByLevel = this.interactions.reduce((acc, interaction) => {
            if (interaction.outcome === 'abandoned') {
                acc[interaction.level] = (acc[interaction.level] || 0) + 1;
            }
            return acc;
        }, {} as Record<DisclosureLevel, number>);

        const totalByLevel = this.interactions.reduce((acc, interaction) => {
            acc[interaction.level] = (acc[interaction.level] || 0) + 1;
            return acc;
        }, {} as Record<DisclosureLevel, number>);

        const abandonmentRate = Object.entries(abandonmentByLevel).reduce((acc, [level, abandonments]) => {
            const total = totalByLevel[level as DisclosureLevel] || 1;
            acc[level as DisclosureLevel] = abandonments / total;
            return acc;
        }, {} as Record<DisclosureLevel, number>);

        // Find most viewed level
        const levelCounts = Object.entries(timeByLevel).reduce((acc, [level]) => {
            const interactions = this.interactions.filter(i => i.level === level).length;
            acc[level] = interactions;
            return acc;
        }, {} as Record<string, number>);

        const mostViewedLevel = Object.entries(levelCounts).reduce((max, [level, count]) =>
            count > max.count ? { level: level as DisclosureLevel, count } : max,
            { level: DisclosureLevel.SUMMARY, count: 0 }
        ).level;

        // Calculate helpfulness rating
        const helpfulInteractions = this.interactions.filter(i => i.outcome === 'helpful').length;
        const helpfulnessRating = totalInteractions > 0 ? helpfulInteractions / totalInteractions : 0;

        return {
            totalDisclosures: totalInteractions,
            averageTimePerLevel,
            abandonmentRate,
            mostViewedLevel,
            helpfulnessRating
        };
    }

    // Determine user expertise level
    getUserExpertiseLevel(): UserExpertiseLevel {
        const metrics = this.getEngagementMetrics();

        // Analyze technical interaction patterns
        const technicalInteractions = this.interactions.filter(
            interaction => interaction.action === 'view_technical' || interaction.action === 'view_debug'
        ).length;

        const totalInteractions = this.interactions.length;
        const technicalRatio = totalInteractions > 0 ? technicalInteractions / totalInteractions : 0;

        // Analyze time spent (advanced users spend more time on technical details)
        const avgTime = Object.values(metrics.averageTimePerLevel).reduce((sum, time) => sum + time, 0) /
            Object.keys(metrics.averageTimePerLevel).length || 0;

        // Consider helpfulness (advanced users provide more feedback)
        const feedbackRate = this.interactions.filter(i => i.outcome !== 'abandoned').length / totalInteractions;

        // Decision logic
        if (technicalRatio > 0.7 && avgTime > 10000 && feedbackRate > 0.8) {
            return UserExpertiseLevel.EXPERT;
        } else if (technicalRatio > 0.4 && avgTime > 5000 && feedbackRate > 0.6) {
            return UserExpertiseLevel.ADVANCED;
        } else if (technicalRatio > 0.2 || avgTime > 2000) {
            return UserExpertiseLevel.INTERMEDIATE;
        } else {
            return UserExpertiseLevel.BASIC;
        }
    }

    // Get optimized user preferences
    getOptimizedPreferences(): Partial<DisclosurePreferences> {
        const expertiseLevel = this.getUserExpertiseLevel();
        const metrics = this.getEngagementMetrics();

        const preferences: Partial<DisclosurePreferences> = {};

        // Set default level based on expertise
        switch (expertiseLevel) {
            case UserExpertiseLevel.EXPERT:
                preferences.defaultLevel = DisclosureLevel.TECHNICAL;
                preferences.showTechnicalByDefault = true;
                preferences.autoExpand = true;
                break;
            case UserExpertiseLevel.ADVANCED:
                preferences.defaultLevel = DisclosureLevel.DETAILS;
                preferences.showTechnicalByDefault = true;
                preferences.autoExpand = false;
                break;
            case UserExpertiseLevel.INTERMEDIATE:
                preferences.defaultLevel = DisclosureLevel.DETAILS;
                preferences.showTechnicalByDefault = false;
                preferences.autoExpand = false;
                break;
            default: // BASIC
                preferences.defaultLevel = DisclosureLevel.SUMMARY;
                preferences.showTechnicalByDefault = false;
                preferences.autoExpand = true;
                break;
        }

        // Animation preferences based on engagement
        if (metrics.helpfulnessRating > 0.8) {
            preferences.animationSpeed = 'normal';
        } else {
            preferences.animationSpeed = 'slow';
        }

        // Compact mode for frequent users
        if (metrics.totalDisclosures > 20) {
            preferences.compactMode = true;
        }

        // Progressive disclosure based on abandonment patterns
        const highAbandonmentLevels = Object.entries(metrics.abandonmentRate)
            .filter(([_, rate]) => rate > 0.3)
            .map(([level, _]) => level as DisclosureLevel);

        if (highAbandonmentLevels.length > 0) {
            preferences.progressiveDisclose = true;
        }

        return preferences;
    }

    // Analyze behavioral patterns
    getBehavioralInsights(): BehavioralInsights {
        const metrics = this.getEngagementMetrics();
        const expertiseLevel = this.getUserExpertiseLevel();

        // Analyze interaction patterns
        const primaryActionCounts = this.interactions.reduce((acc, interaction) => {
            acc[interaction.action] = (acc[interaction.action] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const primaryAction = Object.entries(primaryActionCounts).reduce((max, [action, count]) =>
            count > max.count ? { action: action as any, count } : max,
            { action: 'expand' as any, count: 0 }
        ).action;

        // Find abandonment triggers
        const abandonedInteractions = this.interactions.filter(i => i.outcome === 'abandoned');
        const abandonmentTriggers = abandonedInteractions.map(i => `${i.action}_${i.level}`);

        // Calculate completion rate
        const completedInteractions = this.interactions.filter(i => i.outcome !== 'abandoned');
        const completionRate = this.interactions.length > 0 ? completedInteractions.length / this.interactions.length : 0;

        // Find most useful levels (high helpfulness, low abandonment)
        const levelUtility = Object.values(DisclosureLevel).map(level => {
            const levelInteractions = this.interactions.filter(i => i.level === level);
            const helpfulCount = levelInteractions.filter(i => i.outcome === 'helpful').length;
            const totalCount = levelInteractions.length;
            const utility = totalCount > 0 ? helpfulCount / totalCount : 0;
            return { level, utility };
        });

        const mostUsefulLevels = levelUtility
            .sort((a, b) => b.utility - a.utility)
            .slice(0, 2)
            .map(item => item.level);

        // Calculate optimal timing
        const avgTimePerInteraction = this.interactions.reduce((sum, i) => sum + i.duration, 0) /
            this.interactions.length || 1000;
        const optimalTiming = Math.max(1000, Math.min(5000, avgTimePerInteraction * 0.5));

        // Assess accessibility needs
        const accessibilityNeeds = this.assessAccessibilityNeeds();

        // Generate personalized recommendations
        const recommendations = this.generateRecommendations(expertiseLevel, metrics, primaryAction);

        return {
            expertiseLevel,
            preferredDisclosureLevel: metrics.mostViewedLevel,
            interactionPattern: {
                primaryAction,
                averageTimePerLevel: metrics.averageTimePerLevel,
                abandonmentTriggers,
                completionRate,
                mostUsefulLevels
            },
            engagementScore: this.calculateEngagementScore(),
            optimalTiming,
            accessibilityNeeds,
            personalizedRecommendations: recommendations
        };
    }

    // Assess accessibility needs based on behavior
    private assessAccessibilityNeeds(): AccessibilityNeeds {
        // Analyze gesture complexity preferences
        const complexGestureUsage = this.interactions.filter(
            interaction => interaction.action === 'swipe_up' || interaction.action === 'long_press'
        ).length;
        const gestureComplexity = this.interactions.length > 0 ? complexGestureUsage / this.interactions.length : 0;

        // Note: In a real implementation, you would track actual accessibility settings
        // For now, we'll infer needs from interaction patterns
        return {
            prefersReducedMotion: gestureComplexity < 0.1, // Users who don't use gestures much
            prefersLargeText: false, // Would need font size tracking
            needsHighContrast: false, // Would need UI theme tracking
            voiceOverUsage: 0, // Would need screen reader usage tracking
            gestureComplexity
        };
    }

    // Calculate engagement score (0-1)
    private calculateEngagementScore(): number {
        const metrics = this.getEngagementMetrics();

        // Factors: completion rate, helpfulness, time investment, diversity
        const completionRate = this.interactions.length > 0 ?
            this.interactions.filter(i => i.outcome !== 'abandoned').length / this.interactions.length : 0;

        const helpfulness = metrics.helpfulnessRating;

        const diversity = Object.keys(metrics.averageTimePerLevel).length / Object.values(DisclosureLevel).length;

        const timeInvestment = Math.min(1, metrics.totalDisclosures / 10); // Normalize to 0-1

        return (completionRate * 0.3 + helpfulness * 0.3 + diversity * 0.2 + timeInvestment * 0.2);
    }

    // Generate personalized recommendations
    private generateRecommendations(
        expertiseLevel: UserExpertiseLevel,
        metrics: UserEngagementMetrics,
        primaryAction: string
    ): string[] {
        const recommendations: string[] = [];

        // Expertise-based recommendations
        switch (expertiseLevel) {
            case UserExpertiseLevel.BASIC:
                recommendations.push('Consider enabling auto-expand for faster access to details');
                recommendations.push('Try the simplified view mode for easier navigation');
                break;
            case UserExpertiseLevel.INTERMEDIATE:
                recommendations.push('Enable progressive disclosure to avoid information overload');
                recommendations.push('Set default to Details level for more context');
                break;
            case UserExpertiseLevel.ADVANCED:
                recommendations.push('Enable technical details by default');
                recommendations.push('Use compact mode for faster navigation');
                break;
            case UserExpertiseLevel.EXPERT:
                recommendations.push('Skip intermediate levels for direct access to technical info');
                recommendations.push('Enable debug information for troubleshooting');
                break;
        }

        // Behavior-based recommendations
        if (metrics.abandonmentRate[DisclosureLevel.SUMMARY] > 0.5) {
            recommendations.push('Try expanding directly to Details level');
        }

        if (primaryAction === 'view_technical') {
            recommendations.push('Enable Technical level as default');
        }

        if (metrics.totalDisclosures > 20) {
            recommendations.push('Enable compact mode for faster interaction');
        }

        return recommendations;
    }

    // Save interactions to persistent storage
    private async saveToStorage(): Promise<void> {
        try {
            await AsyncStorage.setItem('progressive_disclosure_interactions', JSON.stringify(this.interactions));
        } catch (error) {
            console.warn('Failed to save interaction history:', error);
        }
    }

    // Load interactions from persistent storage
    private async loadFromStorage(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('progressive_disclosure_interactions');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.interactions = parsed.map((interaction: any) => ({
                    ...interaction,
                    timestamp: new Date(interaction.timestamp)
                }));
            }
        } catch (error) {
            console.warn('Failed to load interaction history:', error);
            this.interactions = [];
        }
    }

    // Clear interaction history
    async clearHistory(): Promise<void> {
        this.interactions = [];
        this.sessionStartTime = Date.now();
        try {
            await AsyncStorage.removeItem('progressive_disclosure_interactions');
        } catch (error) {
            console.warn('Failed to clear interaction history:', error);
        }
    }

    // Initialize from storage
    async initialize(): Promise<void> {
        await this.loadFromStorage();
    }
}

// Behavior Tracking Provider
interface BehaviorTrackingProviderProps {
    children: React.ReactNode;
    userId?: string;
}

export const BehaviorTrackingProvider: React.FC<BehaviorTrackingProviderProps> = ({
    children,
    userId
}) => {
    const [trackingService] = useState(() => new BehaviorTrackingService());

    // Initialize service
    useEffect(() => {
        trackingService.initialize();
    }, [trackingService]);

    const contextValue: BehaviorTrackingContextType = {
        recordInteraction: trackingService.recordInteraction.bind(trackingService),
        getEngagementMetrics: trackingService.getEngagementMetrics.bind(trackingService),
        getUserExpertiseLevel: trackingService.getUserExpertiseLevel.bind(trackingService),
        getOptimizedPreferences: trackingService.getOptimizedPreferences.bind(trackingService),
        getBehavioralInsights: trackingService.getBehavioralInsights.bind(trackingService),
        clearHistory: trackingService.clearHistory.bind(trackingService)
    };

    return (
        <BehaviorTrackingContext.Provider value={contextValue}>
            {children}
        </BehaviorTrackingContext.Provider>
    );
};

// Hook to use behavior tracking
export const useBehaviorTracking = (): BehaviorTrackingContextType => {
    const context = useContext(BehaviorTrackingContext);
    if (context === undefined) {
        throw new Error('useBehaviorTracking must be used within a BehaviorTrackingProvider');
    }
    return context;
};

// Convenience hooks
export const useUserEngagement = () => {
    const { getEngagementMetrics, getBehavioralInsights } = useBehaviorTracking();
    return {
        metrics: getEngagementMetrics(),
        insights: getBehavioralInsights()
    };
};

export const useOptimizedPreferences = () => {
    const { getOptimizedPreferences, getUserExpertiseLevel } = useBehaviorTracking();
    return {
        preferences: getOptimizedPreferences(),
        expertiseLevel: getUserExpertiseLevel()
    };
};

// Analytics Integration
export interface AnalyticsEvent {
    event: string;
    properties: Record<string, any>;
    timestamp: Date;
}

class BehaviorAnalytics {
    private events: AnalyticsEvent[] = [];
    private sessionId: string = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Track analytics event
    trackEvent(event: string, properties: Record<string, any> = {}): void {
        const analyticsEvent: AnalyticsEvent = {
            event,
            properties: {
                ...properties,
                sessionId: this.sessionId,
                timestamp: new Date().toISOString()
            },
            timestamp: new Date()
        };

        this.events.push(analyticsEvent);

        // Send to analytics service (e.g., Amplitude, Mixpanel, etc.)
        this.sendToAnalytics(analyticsEvent);
    }

    // Send event to analytics service
    private sendToAnalytics(event: AnalyticsEvent): void {
        // In a real implementation, you would integrate with your analytics service
        console.log('Analytics Event:', event);

        // Example integration with Amplitude:
        // amplitude.getInstance().logEvent(event.event, event.properties);

        // Example integration with Firebase Analytics:
        // firebase.analytics().logEvent(event.event, event.properties);
    }

    // Track disclosure level changes
    trackLevelChange(fromLevel: DisclosureLevel, toLevel: DisclosureLevel, userId?: string): void {
        this.trackEvent('DISCLOSURE_LEVEL_CHANGE', {
            fromLevel,
            toLevel,
            userId,
            timestamp: new Date().toISOString()
        });
    }

    // Track user interactions
    trackUserInteraction(interaction: DisclosureInteraction, userId?: string): void {
        this.trackEvent('USER_INTERACTION', {
            action: interaction.action,
            level: interaction.level,
            duration: interaction.duration,
            outcome: interaction.outcome,
            userId,
            timestamp: interaction.timestamp.toISOString()
        });
    }

    // Track error disclosure performance
    trackPerformance(errorId: string, metrics: {
        loadTime: number;
        interactionCount: number;
        completionRate: number;
    }): void {
        this.trackEvent('DISCLOSURE_PERFORMANCE', {
            errorId,
            ...metrics
        });
    }
}

// Export singleton instance
export const behaviorAnalytics = new BehaviorAnalytics();

export default BehaviorTrackingProvider;