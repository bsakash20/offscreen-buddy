/**
 * Progressive Error Disclosure Component
 * Main React Native component with layered presentation and smooth animations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    Dimensions,
    ScrollView,
    AccessibilityInfo,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
    ProgressiveDisclosureProps,
    DisclosureLevel,
    ErrorContent,
    DisclosureAnimationConfig,
    DisclosureContext
} from '../types/ProgressiveDisclosureTypes';
import { useProgressiveDisclosure } from '../services/ProgressiveDisclosureManager';
// import { useErrorAccessibility } from '../../accessibility/master-accessibility-provider'; // TEMPORARILY COMMENTED OUT (accessibility provider not implemented)

// Animation constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ANIMATION_DURATION = 300;
const SPRING_CONFIG = {
    damping: 25,
    stiffness: 120,
    mass: 1,
    velocity: 0
};

// Default animation config
const DEFAULT_ANIMATION_CONFIG: DisclosureAnimationConfig = {
    expandDuration: ANIMATION_DURATION,
    collapseDuration: ANIMATION_DURATION,
    staggerDelay: 50,
    easing: 'easeInOut',
    springConfig: SPRING_CONFIG
};

/**
 * Main Progressive Disclosure Component
 * Implements three-tier layered presentation with intelligent expansion
 */
const ProgressiveErrorDisclosure: React.FC<ProgressiveDisclosureProps> = ({
    error,
    initialLevel = DisclosureLevel.SUMMARY,
    onLevelChange,
    onAction,
    animationConfig = DEFAULT_ANIMATION_CONFIG,
    accessibilityConfig,
    context,
    adaptiveBehavior = true,
    showProgress = true,
    compactMode = false
}) => {
    // Hooks
    const { generateContent, updateDisclosureLevel, recordInteraction } = useProgressiveDisclosure();
    // const accessibilityFeatures = useErrorAccessibility(); // TEMPORARILY COMMENTED OUT
    const accessibilityFeatures = {}; // TEMPORARY FALLBACK

    // State
    const [currentLevel, setCurrentLevel] = useState<DisclosureLevel>(initialLevel);
    const [errorContent, setErrorContent] = useState<ErrorContent | null>(null);
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);

    // Animation values
    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [scaleAnim] = useState(new Animated.Value(0.9));
    const [progressAnim] = useState(new Animated.Value(0));

    // Calculate level progress for animations
    const getLevelProgress = useCallback((level: DisclosureLevel): number => {
        const levelMap = {
            [DisclosureLevel.SUMMARY]: 0.25,
            [DisclosureLevel.DETAILS]: 0.5,
            [DisclosureLevel.TECHNICAL]: 0.75,
            [DisclosureLevel.DEBUG]: 1.0
        };
        return levelMap[level];
    }, []);

    // Load error content
    useEffect(() => {
        const loadContent = async () => {
            setIsLoading(true);
            try {
                const content = await generateContent(error, currentLevel);
                setErrorContent(content);
            } catch (error) {
                console.error('Failed to generate error content:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadContent();
    }, [error, currentLevel, generateContent]);

    // Animate entrance
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: animationConfig.expandDuration,
                useNativeDriver: true
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                ...animationConfig.springConfig,
                useNativeDriver: true
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                ...animationConfig.springConfig,
                useNativeDriver: true
            })
        ]).start();

        // Animate progress indicator
        if (showProgress) {
            Animated.timing(progressAnim, {
                toValue: getLevelProgress(currentLevel),
                duration: animationConfig.expandDuration,
                useNativeDriver: false
            }).start();
        }
    }, [currentLevel, fadeAnim, slideAnim, scaleAnim, progressAnim, animationConfig, getLevelProgress, showProgress]);

    // Handle level change
    const handleLevelChange = useCallback(async (newLevel: DisclosureLevel) => {
        if (newLevel === currentLevel) return;

        const interactionStartTime = Date.now();

        // Start collapse animation for current level
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: animationConfig.collapseDuration,
                useNativeDriver: true
            }),
            Animated.timing(slideAnim, {
                toValue: 50,
                duration: animationConfig.collapseDuration,
                useNativeDriver: true
            })
        ]).start(() => {
            // Change level and animate in
            setCurrentLevel(newLevel);
            updateDisclosureLevel('current', newLevel);
            onLevelChange?.(newLevel);

            // Record interaction
            recordInteraction('current', {
                timestamp: new Date(),
                level: newLevel,
                action: 'expand',
                duration: Date.now() - interactionStartTime,
                outcome: 'helpful'
            });
        });

        // Update progress animation
        if (showProgress) {
            Animated.timing(progressAnim, {
                toValue: getLevelProgress(newLevel),
                duration: animationConfig.expandDuration,
                useNativeDriver: false
            }).start();
        }
    }, [currentLevel, fadeAnim, slideAnim, progressAnim, animationConfig, updateDisclosureLevel, recordInteraction, onLevelChange, getLevelProgress, showProgress]);

    // Get level-specific accessibility hints
    const getAccessibilityHint = useCallback((level: DisclosureLevel): string => {
        const hints = {
            [DisclosureLevel.SUMMARY]: 'Shows basic error information',
            [DisclosureLevel.DETAILS]: 'Shows detailed explanation and steps',
            [DisclosureLevel.TECHNICAL]: 'Shows technical information for debugging',
            [DisclosureLevel.DEBUG]: 'Shows complete debug information'
        };
        return hints[level];
    }, []);

    // Render level selector
    const renderLevelSelector = () => {
        const levels = [
            { level: DisclosureLevel.SUMMARY, icon: 'information-circle', label: 'Summary' },
            { level: DisclosureLevel.DETAILS, icon: 'list', label: 'Details' },
            { level: DisclosureLevel.TECHNICAL, icon: 'code-slash', label: 'Technical' },
            { level: DisclosureLevel.DEBUG, icon: 'bug', label: 'Debug' }
        ];

        return (
            <View style={[styles.levelSelector, compactMode && styles.compactLevelSelector]}>
                {levels.map(({ level, icon, label }) => (
                    <TouchableOpacity
                        key={level}
                        style={[
                            styles.levelButton,
                            currentLevel === level && styles.levelButtonActive,
                            compactMode && styles.compactLevelButton
                        ]}
                        onPress={() => handleLevelChange(level)}
                        accessibilityLabel={`View ${label}`}
                        accessibilityHint={getAccessibilityHint(level)}
                        accessibilityRole="button"
                    >
                        <Ionicons
                            name={icon as any}
                            size={compactMode ? 16 : 20}
                            color={currentLevel === level ? '#007AFF' : '#666666'}
                        />
                        {!compactMode && (
                            <Text style={[
                                styles.levelButtonText,
                                currentLevel === level && styles.levelButtonTextActive
                            ]}>
                                {label}
                            </Text>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // Render progress indicator
    const renderProgressIndicator = () => {
        if (!showProgress) return null;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    {Math.round(getLevelProgress(currentLevel) * 100)}% Complete
                </Text>
            </View>
        );
    };

    // Render loading state
    const renderLoading = () => (
        <View style={styles.loadingContainer}>
            <Animated.View style={[styles.loadingCard, { opacity: fadeAnim }]}>
                <Ionicons name="refresh" size={24} color="#007AFF" />
                <Text style={styles.loadingText}>Loading error details...</Text>
            </Animated.View>
        </View>
    );

    // Render error content based on level
    const renderErrorContent = () => {
        if (!errorContent || isLoading) {
            return renderLoading();
        }

        switch (currentLevel) {
            case DisclosureLevel.SUMMARY:
                return <SummaryLevel content={errorContent.summary} compactMode={compactMode} />;
            case DisclosureLevel.DETAILS:
                return <DetailsLevel content={errorContent.details} compactMode={compactMode} />;
            case DisclosureLevel.TECHNICAL:
                return <TechnicalLevel content={errorContent.technical} compactMode={compactMode} />;
            case DisclosureLevel.DEBUG:
                return <DebugLevel content={errorContent.debug} compactMode={compactMode} />;
            default:
                return <SummaryLevel content={errorContent.summary} compactMode={compactMode} />;
        }
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim, transform: [{ translateY: slideAnim }, { scale: scaleAnim }] }]}>
            {/* Header */}
            <View style={[styles.header, compactMode && styles.compactHeader]}>
                {renderProgressIndicator()}
                {renderLevelSelector()}
            </View>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {renderErrorContent()}
            </ScrollView>
        </Animated.View>
    );
};

// Summary Level Component
interface LevelContentProps {
    content: any;
    compactMode: boolean;
}

const SummaryLevel: React.FC<LevelContentProps> = ({ content, compactMode }) => (
    <View style={[styles.levelContent, compactMode && styles.compactLevelContent]}>
        <View style={styles.severityIndicator}>
            <Ionicons name={content?.severityIndicator?.icon as any || 'alert-circle'} size={24} color={content?.severityIndicator?.color || '#FF3B30'} />
            <Text style={[styles.severityText, { color: content?.severityIndicator?.color || '#FF3B30' }]}>
                {content?.severityIndicator?.announcement || 'Error occurred'}
            </Text>
        </View>

        <Text style={[styles.errorTitle, compactMode && styles.compactErrorTitle]}>
            {content?.title || 'Something went wrong'}
        </Text>

        <Text style={[styles.errorDescription, compactMode && styles.compactErrorDescription]}>
            {content?.description || 'An unexpected error occurred while processing your request.'}
        </Text>

        {content?.impact && (
            <View style={styles.impactContainer}>
                <Ionicons name="warning" size={16} color="#FF9500" />
                <Text style={styles.impactText}>{content.impact}</Text>
            </View>
        )}
    </View>
);

// Details Level Component
const DetailsLevel: React.FC<LevelContentProps> = ({ content, compactMode }) => (
    <View style={[styles.levelContent, compactMode && styles.compactLevelContent]}>
        <Text style={[styles.sectionTitle, compactMode && styles.compactSectionTitle]}>What Happened</Text>
        <Text style={[styles.sectionText, compactMode && styles.compactSectionText]}>
            {content?.whatHappened || 'An unexpected condition occurred that prevented the app from completing your request.'}
        </Text>

        <Text style={[styles.sectionTitle, compactMode && styles.compactSectionTitle]}>Why It Happened</Text>
        <Text style={[styles.sectionText, compactMode && styles.compactSectionText]}>
            {content?.whyItHappened || 'This can happen due to various factors including network connectivity, server issues, or temporary system conditions.'}
        </Text>

        <Text style={[styles.sectionTitle, compactMode && styles.compactSectionTitle]}>What You Can Do</Text>
        <Text style={[styles.sectionText, compactMode && styles.compactSectionText]}>
            Try refreshing the app, checking your internet connection, or contact support if the problem persists.
        </Text>
    </View>
);

// Technical Level Component
const TechnicalLevel: React.FC<LevelContentProps> = ({ content, compactMode }) => (
    <View style={[styles.levelContent, compactMode && styles.compactLevelContent]}>
        <Text style={[styles.sectionTitle, compactMode && styles.compactSectionTitle]}>Technical Details</Text>

        <View style={styles.techDetailRow}>
            <Text style={styles.techDetailLabel}>Error Code:</Text>
            <Text style={styles.techDetailValue}>{content?.errorCode || 'ERR_GENERIC'}</Text>
        </View>

        <View style={styles.techDetailRow}>
            <Text style={styles.techDetailLabel}>Category:</Text>
            <Text style={styles.techDetailValue}>{content?.category || 'system'}</Text>
        </View>

        <View style={styles.platformInfoContainer}>
            <Text style={[styles.sectionTitle, compactMode && styles.compactSectionTitle]}>Platform Information</Text>
            <Text style={[styles.platformInfoText, compactMode && styles.compactPlatformInfoText]}>
                Platform: {content?.platformDetails?.platform || 'iOS'}
            </Text>
            <Text style={[styles.platformInfoText, compactMode && styles.compactPlatformInfoText]}>
                App Version: {content?.platformDetails?.appVersion || '1.0.0'}
            </Text>
        </View>
    </View>
);

// Debug Level Component
const DebugLevel: React.FC<LevelContentProps> = ({ content, compactMode }) => (
    <View style={[styles.levelContent, compactMode && styles.compactLevelContent]}>
        <Text style={[styles.sectionTitle, compactMode && styles.compactSectionTitle]}>Debug Information</Text>

        <Text style={[styles.debugNotice, compactMode && styles.compactDebugNotice]}>
            Debug information contains sensitive technical details.
            This information is primarily for developers and support agents.
        </Text>

        <Text style={[styles.sectionText, compactMode && styles.compactSectionText]}>
            For debugging purposes, check the console logs or contact support with the error details.
        </Text>
    </View>
);

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3
    },

    // Header styles
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F9FA',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5'
    },
    compactHeader: {
        paddingHorizontal: 12,
        paddingVertical: 8
    },

    // Progress indicator
    progressContainer: {
        marginBottom: 12
    },
    progressTrack: {
        height: 4,
        backgroundColor: '#E5E5E5',
        borderRadius: 2,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 2
    },
    progressText: {
        fontSize: 12,
        color: '#666666',
        marginTop: 4,
        textAlign: 'center'
    },

    // Level selector
    levelSelector: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 2
    },
    compactLevelSelector: {
        marginBottom: 0
    },
    levelButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6
    },
    compactLevelButton: {
        paddingVertical: 6,
        paddingHorizontal: 8
    },
    levelButtonActive: {
        backgroundColor: '#E3F2FD'
    },
    levelButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666666',
        marginLeft: 6
    },
    levelButtonTextActive: {
        color: '#007AFF'
    },

    // Content styles
    scrollContainer: {
        flex: 1
    },
    levelContent: {
        flex: 1,
        padding: 16
    },
    compactLevelContent: {
        padding: 12
    },

    // Summary styles
    severityIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    severityText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8
    },
    errorTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 8,
        lineHeight: 24
    },
    compactErrorTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        lineHeight: 20
    },
    errorDescription: {
        fontSize: 16,
        color: '#3C3C43',
        lineHeight: 22,
        marginBottom: 12
    },
    compactErrorDescription: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8
    },

    impactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3CD',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12
    },
    impactText: {
        fontSize: 14,
        color: '#856404',
        marginLeft: 8,
        flex: 1
    },

    // Section styles
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1C1C1E',
        marginTop: 16,
        marginBottom: 8
    },
    compactSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
        marginBottom: 6
    },
    sectionText: {
        fontSize: 16,
        color: '#3C3C43',
        lineHeight: 22,
        marginBottom: 12
    },
    compactSectionText: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8
    },

    // Technical styles
    techDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5E5'
    },
    techDetailLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3C3C43'
    },
    techDetailValue: {
        fontSize: 14,
        color: '#1C1C1E',
        fontFamily: 'monospace'
    },

    platformInfoContainer: {
        marginTop: 16
    },
    platformInfoText: {
        fontSize: 14,
        color: '#3C3C43',
        fontFamily: 'monospace',
        marginBottom: 4
    },
    compactPlatformInfoText: {
        fontSize: 12,
        marginBottom: 2
    },

    // Debug styles
    debugNotice: {
        fontSize: 14,
        color: '#856404',
        backgroundColor: '#FFF3CD',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
        fontStyle: 'italic'
    },
    compactDebugNotice: {
        fontSize: 12,
        padding: 8,
        marginBottom: 8
    },

    // Loading styles
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32
    },
    loadingCard: {
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 8
    },
    loadingText: {
        fontSize: 16,
        color: '#3C3C43',
        marginTop: 8
    }
});

export default ProgressiveErrorDisclosure;