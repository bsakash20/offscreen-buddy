/**
 * Smart Error Expansion System
 * Implements adaptive behavior and intelligent expansion triggers
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    PanGestureHandler,
    State,
    GestureHandler,
    InteractionManager
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
    DisclosureLevel,
    DisclosureInteraction,
    UserExpertiseLevel,
    DisclosureContext,
    AdaptiveBehavior,
    UserEngagementMetrics
} from '../types/ProgressiveDisclosureTypes';

// Expansion Triggers
export enum ExpansionTrigger {
    CLICK = 'click',
    LONG_PRESS = 'long_press',
    SWIPE_UP = 'swipe_up',
    AUTO_AFTER_DELAY = 'auto_after_delay',
    CONTEXTUAL_SUGGESTION = 'contextual_suggestion',
    USER_EXPERTISE = 'user_expertise'
}

// Smart Expansion Manager
class SmartExpansionManager {
    private interactionHistory: DisclosureInteraction[] = [];
    private expansionTimeout: NodeJS.Timeout | null = null;
    private autoExpandThreshold: number = 3;

    constructor(private userExpertise: UserExpertiseLevel = UserExpertiseLevel.BASIC) {
        this.adaptThreshold();
    }

    // Adapt expansion behavior based on user expertise
    private adaptThreshold() {
        const thresholds = {
            [UserExpertiseLevel.BASIC]: 5,
            [UserExpertiseLevel.INTERMEDIATE]: 3,
            [UserExpertiseLevel.ADVANCED]: 1,
            [UserExpertiseLevel.EXPERT]: 0
        };
        this.autoExpandThreshold = thresholds[this.userExpertise];
    }

    // Determine if should auto-expand based on user behavior
    shouldAutoExpand(behavior: AdaptiveBehavior, userEngagement: UserEngagementMetrics): boolean {
        if (!behavior.autoExpandThreshold) return false;

        const advancedInteractions = this.interactionHistory.filter(
            interaction => interaction.action === 'view_technical' || interaction.action === 'view_debug'
        ).length;

        const totalInteractions = this.interactionHistory.length;
        const advancementRatio = totalInteractions > 0 ? advancedInteractions / totalInteractions : 0;

        // Advanced users get more detailed info by default
        if (this.userExpertise === UserExpertiseLevel.ADVANCED || this.userExpertise === UserExpertiseLevel.EXPERT) {
            return true;
        }

        // Users who frequently expand get auto-expansion
        return advancementRatio > 0.5 || totalInteractions >= this.autoExpandThreshold;
    }

    // Get optimal expansion trigger
    getOptimalTrigger(context: DisclosureContext): ExpansionTrigger {
        const { applicationState, accessibilityPreferences } = context;

        // Check accessibility preferences
        if (accessibilityPreferences.reduceMotion) {
            return ExpansionTrigger.CLICK;
        }

        // Check user journey stage
        if (applicationState.userJourneyStage === 'start') {
            return ExpansionTrigger.AUTO_AFTER_DELAY;
        }

        // For complex errors, suggest contextual expansion
        if (context.currentError.severity === 'critical') {
            return ExpansionTrigger.CONTEXTUAL_SUGGESTION;
        }

        // For advanced users, use swipe gestures
        if (this.userExpertise === UserExpertiseLevel.ADVANCED || this.userExpertise === UserExpertiseLevel.EXPERT) {
            return ExpansionTrigger.SWIPE_UP;
        }

        return ExpansionTrigger.CLICK;
    }

    // Schedule auto-expansion
    scheduleAutoExpansion(callback: (trigger: ExpansionTrigger) => void, delay: number = 2000) {
        if (this.expansionTimeout) {
            clearTimeout(this.expansionTimeout);
        }

        this.expansionTimeout = setTimeout(() => {
            callback(ExpansionTrigger.AUTO_AFTER_DELAY);
        }, delay);
    }

    // Record user interaction
    recordInteraction(interaction: DisclosureInteraction) {
        this.interactionHistory.push(interaction);

        // Keep only last 10 interactions for performance
        if (this.interactionHistory.length > 10) {
            this.interactionHistory.shift();
        }
    }

    // Clear expansion timeout
    clearAutoExpansion() {
        if (this.expansionTimeout) {
            clearTimeout(this.expansionTimeout);
            this.expansionTimeout = null;
        }
    }

    // Get contextual suggestions
    getContextualSuggestions(error: any): string[] {
        const suggestions = [];

        if (error.category === 'network') {
            suggestions.push('Check your internet connection');
            suggestions.push('Try switching to Wi-Fi');
        }

        if (error.category === 'payment') {
            suggestions.push('Verify your payment method');
            suggestions.push('Check your card details');
        }

        if (error.severity === 'critical') {
            suggestions.push('This error requires immediate attention');
        }

        return suggestions;
    }

    // Analyze user behavior for optimization
    analyzeBehavior(): {
        preferredLevel: DisclosureLevel;
        interactionPattern: string;
        engagementScore: number;
    } {
        const levelCounts = this.interactionHistory.reduce((acc, interaction) => {
            acc[interaction.level] = (acc[interaction.level] || 0) + 1;
            return acc;
        }, {} as Record<DisclosureLevel, number>);

        const preferredLevel = Object.entries(levelCounts).reduce(
            (max, [level, count]) => count > max.count ? { level: level as DisclosureLevel, count } : max,
            { level: DisclosureLevel.SUMMARY, count: 0 }
        ).level;

        const totalTime = this.interactionHistory.reduce((sum, interaction) => sum + interaction.duration, 0);
        const engagementScore = Math.min(totalTime / 1000, 10); // Score out of 10

        return {
            preferredLevel,
            interactionPattern: this.getInteractionPattern(),
            engagementScore
        };
    }

    private getInteractionPattern(): string {
        const technicalInteractions = this.interactionHistory.filter(
            i => i.action === 'view_technical' || i.action === 'view_debug'
        ).length;

        if (technicalInteractions > this.interactionHistory.length * 0.7) {
            return 'technical';
        } else if (technicalInteractions > this.interactionHistory.length * 0.3) {
            return 'balanced';
        } else {
            return 'simple';
        }
    }
}

// Smart Expansion Component
interface SmartExpansionProps {
    children: React.ReactNode;
    error: any;
    context: DisclosureContext;
    adaptiveBehavior: AdaptiveBehavior;
    onExpansion: (trigger: ExpansionTrigger) => void;
    onClose?: () => void;
}

export const SmartExpansion: React.FC<SmartExpansionProps> = ({
    children,
    error,
    context,
    adaptiveBehavior,
    onExpansion,
    onClose
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [expansionTrigger, setExpansionTrigger] = useState<ExpansionTrigger | null>(null);
    const [suggestions, setSuggestions] = useState<string[]>([]);

    const expansionManager = useRef(new SmartExpansionManager(context.userExpertise));
    const animatedValue = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    // Initialize expansion
    useEffect(() => {
        const manager = expansionManager.current;

        // Check if should auto-expand
        if (adaptiveBehavior.autoExpandThreshold &&
            manager.shouldAutoExpand(adaptiveBehavior, {} as UserEngagementMetrics)) {
            setTimeout(() => handleExpansion(ExpansionTrigger.AUTO_AFTER_DELAY), 2000);
        }

        // Get contextual suggestions
        const contextualSuggestions = manager.getContextualSuggestions(error);
        setSuggestions(contextualSuggestions);

        // Schedule auto-expansion for basic users
        if (context.userExpertise === UserExpertiseLevel.BASIC) {
            manager.scheduleAutoExpansion(handleExpansion);
        }

        return () => {
            expansionManager.current.clearAutoExpansion();
        };
    }, [adaptiveBehavior, context.userExpertise, error]);

    // Handle expansion
    const handleExpansion = useCallback((trigger: ExpansionTrigger) => {
        setExpansionTrigger(trigger);
        setIsExpanded(true);

        // Animate expansion
        Animated.parallel([
            Animated.spring(animatedValue, {
                toValue: 1,
                useNativeDriver: true,
                damping: 25,
                stiffness: 120
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                useNativeDriver: true,
                damping: 25,
                stiffness: 120
            })
        ]).start();

        onExpansion(trigger);
    }, [animatedValue, scaleAnim, onExpansion]);

    // Handle close
    const handleClose = useCallback(() => {
        Animated.parallel([
            Animated.spring(animatedValue, {
                toValue: 0,
                useNativeDriver: true,
                damping: 25,
                stiffness: 120
            }),
            Animated.spring(scaleAnim, {
                toValue: 0.9,
                useNativeDriver: true,
                damping: 25,
                stiffness: 120
            })
        ]).start(() => {
            setIsExpanded(false);
            setExpansionTrigger(null);
            onClose?.();
        });
    }, [animatedValue, scaleAnim, onClose]);

    // Render contextual suggestions
    const renderSuggestions = () => {
        if (suggestions.length === 0) return null;

        return (
            <Animated.View
                style={[
                    styles.suggestionsContainer,
                    {
                        opacity: animatedValue,
                        transform: [{
                            translateY: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [20, 0]
                            })
                        }]
                    }
                ]}
            >
                <Text style={styles.suggestionsTitle}>Quick Fixes</Text>
                {suggestions.map((suggestion, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.suggestionItem}
                        onPress={() => onExpansion(ExpansionTrigger.CONTEXTUAL_SUGGESTION)}
                    >
                        <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                ))}
            </Animated.View>
        );
    };

    // Render expansion indicator
    const renderExpansionIndicator = () => {
        const getIcon = () => {
            switch (expansionTrigger) {
                case ExpansionTrigger.AUTO_AFTER_DELAY:
                    return 'time';
                case ExpansionTrigger.CONTEXTUAL_SUGGESTION:
                    return 'bulb';
                case ExpansionTrigger.SWIPE_UP:
                    return 'chevron-up';
                default:
                    return 'chevron-down';
            }
        };

        return (
            <TouchableOpacity
                style={styles.expansionIndicator}
                onPress={() => isExpanded ? handleClose() : handleExpansion(ExpansionTrigger.CLICK)}
                onLongPress={() => handleExpansion(ExpansionTrigger.LONG_PRESS)}
            >
                <Animated.View style={{
                    transform: [{
                        rotate: animatedValue.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg']
                        })
                    }]
                }}>
                    <Ionicons name={getIcon() as any} size={20} color="#007AFF" />
                </Animated.View>
                <Text style={styles.expansionText}>
                    {isExpanded ? 'Show Less' : 'Learn More'}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: animatedValue,
                    transform: [
                        { scale: scaleAnim },
                        {
                            translateY: animatedValue.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0]
                            })
                        }
                    ]
                }
            ]}
        >
            {/* Main content */}
            <View style={styles.contentContainer}>
                {children}
            </View>

            {/* Suggestions for non-expanded state */}
            {!isExpanded && renderSuggestions()}

            {/* Expansion indicator */}
            {renderExpansionIndicator()}

            {/* Expanded content overlay */}
            {isExpanded && (
                <View style={styles.expandedOverlay}>
                    <Text style={styles.expandedTitle}>Detailed Information</Text>
                    <Text style={styles.expandedText}>
                        Additional details and technical information will appear here when expanded.
                    </Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleClose}
                    >
                        <Text style={styles.closeButtonText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            )}
        </Animated.View>
    );
};

// Expansion Trigger Component
interface ExpansionTriggerProps {
    trigger: ExpansionTrigger;
    onTrigger: () => void;
    context: DisclosureContext;
}

const ExpansionTriggerComponent: React.FC<ExpansionTriggerProps> = ({
    trigger,
    onTrigger,
    context
}) => {
    const [isPressed, setIsPressed] = useState(false);

    const getTriggerDescription = () => {
        const descriptions = {
            [ExpansionTrigger.CLICK]: 'Tap to expand',
            [ExpansionTrigger.LONG_PRESS]: 'Long press for more options',
            [ExpansionTrigger.SWIPE_UP]: 'Swipe up to reveal details',
            [ExpansionTrigger.AUTO_AFTER_DELAY]: 'Will expand automatically',
            [ExpansionTrigger.CONTEXTUAL_SUGGESTION]: 'Quick suggestions available',
            [ExpansionTrigger.USER_EXPERTISE]: 'Tailored for your experience level'
        };
        return descriptions[trigger];
    };

    const getTriggerIcon = () => {
        const icons = {
            [ExpansionTrigger.CLICK]: 'finger-print',
            [ExpansionTrigger.LONG_PRESS]: 'ellipsis-horizontal',
            [ExpansionTrigger.SWIPE_UP]: 'chevron-up-circle',
            [ExpansionTrigger.AUTO_AFTER_DELAY]: 'time',
            [ExpansionTrigger.CONTEXTUAL_SUGGESTION]: 'bulb',
            [ExpansionTrigger.USER_EXPERTISE]: 'person'
        };
        return icons[trigger];
    };

    return (
        <TouchableOpacity
            style={[
                styles.triggerContainer,
                isPressed && styles.triggerPressed
            ]}
            onPress={onTrigger}
            onPressIn={() => setIsPressed(true)}
            onPressOut={() => setIsPressed(false)}
            accessibilityLabel={getTriggerDescription()}
            accessibilityHint="Activate to reveal additional error information"
        >
            <Ionicons
                name={getTriggerIcon() as any}
                size={16}
                color={isPressed ? '#0051D5' : '#007AFF'}
            />
            <Text style={[
                styles.triggerText,
                isPressed && styles.triggerTextPressed
            ]}>
                {getTriggerDescription()}
            </Text>
        </TouchableOpacity>
    );
};

// Adaptive Behavior Hook
export const useAdaptiveExpansion = (context: DisclosureContext) => {
    const [behavior, setBehavior] = useState<AdaptiveBehavior>({
        autoExpandThreshold: 3,
        skipIntermediateLevels: false,
        contextualRecommendations: true,
        personalizedContent: true
    });

    const expansionManager = useRef(new SmartExpansionManager(context.userExpertise));

    // Update behavior based on user interaction
    const updateBehavior = useCallback((newBehavior: Partial<AdaptiveBehavior>) => {
        setBehavior(prev => ({ ...prev, ...newBehavior }));
    }, []);

    // Get behavioral insights
    const getInsights = useCallback(() => {
        const analysis = expansionManager.current.analyzeBehavior();
        return {
            ...analysis,
            recommendations: behavior.skipIntermediateLevels ?
                ['Skip directly to technical details'] :
                ['Provide intermediate steps'],
            shouldAdaptContent: behavior.personalizedContent
        };
    }, [behavior]);

    return {
        behavior,
        updateBehavior,
        getInsights,
        expansionManager: expansionManager.current
    };
};

// Styles
const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        marginHorizontal: 16,
        marginVertical: 8,
        overflow: 'hidden'
    },

    contentContainer: {
        padding: 16
    },

    suggestionsContainer: {
        padding: 12,
        backgroundColor: '#F0F9FF',
        borderTopWidth: 1,
        borderTopColor: '#E0F2FE'
    },

    suggestionsTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0369A1',
        marginBottom: 8
    },

    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6
    },

    suggestionText: {
        fontSize: 13,
        color: '#0369A1',
        marginLeft: 8,
        flex: 1
    },

    expansionIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#F8F9FA',
        borderTopWidth: 1,
        borderTopColor: '#E5E5E5'
    },

    expansionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 8
    },

    expandedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFFFFF',
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center'
    },

    expandedTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 12,
        textAlign: 'center'
    },

    expandedText: {
        fontSize: 16,
        color: '#3C3C43',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20
    },

    closeButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8
    },

    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600'
    },

    triggerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        backgroundColor: '#F8F9FA',
        borderRadius: 6,
        marginVertical: 4
    },

    triggerPressed: {
        backgroundColor: '#E3F2FD'
    },

    triggerText: {
        fontSize: 12,
        color: '#007AFF',
        marginLeft: 6
    },

    triggerTextPressed: {
        color: '#0051D5',
        fontWeight: '600'
    }
});

export default SmartExpansion;