/**
 * Cognitive Accessibility System for iOS Error Presentation
 * Implements text simplification, progressive disclosure, and cognitive load management
 */

import React, { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Cognitive accessibility configuration
export interface CognitiveAccessibilityConfig {
    enabled: boolean;
    textSimplification: {
        enabled: boolean;
        targetReadingLevel: 'elementary' | 'middle' | 'high' | 'college';
        simplifyJargon: boolean;
        shortenSentences: boolean;
        useActiveVoice: boolean;
        addExplanations: boolean;
    };
    progressiveDisclosure: {
        enabled: boolean;
        maxInitialLength: number;
        showMoreThreshold: number;
        collapseAfterDelay: boolean;
        collapseDelay: number;
        summaryLength: number;
    };
    informationChunking: {
        enabled: boolean;
        chunkSize: number;
        showChunkNumbers: boolean;
        allowChunkNavigation: boolean;
    };
    visualConsistency: {
        consistentIconography: boolean;
        consistentLayout: boolean;
        consistentColors: boolean;
        predictableInteractions: boolean;
    };
    cognitiveLoad: {
        maxDecisions: number;
        maxActions: number;
        timeLimits: boolean;
        attentionCues: boolean;
    };
}

// Cognitive accessibility state
interface CognitiveAccessibilityState {
    currentComplexity: 'simple' | 'moderate' | 'complex';
    chunkIndex: number;
    totalChunks: number;
    showDetails: boolean;
    readingLevel: 'elementary' | 'middle' | 'high' | 'college';
    timeRemaining?: number;
}

// Context for cognitive accessibility
interface CognitiveAccessibilityContextType {
    config: CognitiveAccessibilityConfig;
    updateConfig: (newConfig: Partial<CognitiveAccessibilityConfig>) => void;
    simplifyText: (text: string, targetLevel?: 'simple' | 'moderate' | 'complex') => string;
    createProgressiveDisclosure: (content: string, maxLength?: number) => {
        summary: string;
        details: string;
        showMore: boolean;
    };
    chunkInformation: (content: string, chunkSize?: number) => {
        chunks: string[];
        currentChunk: string;
        chunkNumber: number;
        totalChunks: number;
    };
    getCognitiveLoadScore: (content: string) => number;
    estimateReadingTime: (content: string) => number;
    validateCognitiveAccessibility: (content: string) => {
        score: number;
        issues: string[];
        suggestions: string[];
    };
    getState: () => CognitiveAccessibilityState;
}

// Context creation
const CognitiveAccessibilityContext = createContext<CognitiveAccessibilityContextType | undefined>(undefined);

// Default configuration
const DEFAULT_COGNITIVE_ACCESSIBILITY_CONFIG: CognitiveAccessibilityConfig = {
    enabled: true,
    textSimplification: {
        enabled: true,
        targetReadingLevel: 'middle',
        simplifyJargon: true,
        shortenSentences: true,
        useActiveVoice: true,
        addExplanations: true,
    },
    progressiveDisclosure: {
        enabled: true,
        maxInitialLength: 100,
        showMoreThreshold: 50,
        collapseAfterDelay: false,
        collapseDelay: 10000,
        summaryLength: 60,
    },
    informationChunking: {
        enabled: true,
        chunkSize: 50,
        showChunkNumbers: true,
        allowChunkNavigation: true,
    },
    visualConsistency: {
        consistentIconography: true,
        consistentLayout: true,
        consistentColors: true,
        predictableInteractions: true,
    },
    cognitiveLoad: {
        maxDecisions: 3,
        maxActions: 5,
        timeLimits: false,
        attentionCues: true,
    },
};

// Provider component
interface CognitiveAccessibilityProviderProps {
    children: ReactNode;
    config?: Partial<CognitiveAccessibilityConfig>;
    onComplexityChange?: (complexity: 'simple' | 'moderate' | 'complex') => void;
    onChunkNavigation?: (chunkIndex: number, totalChunks: number) => void;
}

const CognitiveAccessibilityProvider: React.FC<CognitiveAccessibilityProviderProps> = ({
    children,
    config = {},
    onComplexityChange,
    onChunkNavigation,
}) => {
    const [cognitiveConfig, setCognitiveConfig] = useState<CognitiveAccessibilityConfig>({
        ...DEFAULT_COGNITIVE_ACCESSIBILITY_CONFIG,
        ...config,
    });

    const [cognitiveState, setCognitiveState] = useState<CognitiveAccessibilityState>({
        currentComplexity: 'moderate',
        chunkIndex: 0,
        totalChunks: 1,
        showDetails: false,
        readingLevel: 'middle',
    });

    // Text simplification utilities
    const simplifyText = useCallback((text: string, targetLevel: 'simple' | 'moderate' | 'complex' = 'moderate'): string => {
        if (!cognitiveConfig.textSimplification.enabled) return text;

        let simplifiedText = text;

        // Remove jargon and technical terms
        if (cognitiveConfig.textSimplification.simplifyJargon) {
            const jargonMap = {
                'authentication': 'login',
                'authorization': 'permission',
                'validation': 'checking',
                'execute': 'run',
                'implement': 'add',
                'configure': 'set up',
                'initialize': 'start',
                'terminate': 'end',
                'submit': 'send',
                'retrieve': 'get',
                'persist': 'save',
                'decrement': 'decrease',
                'increment': 'increase',
                'error': 'problem',
                'success': 'worked',
                'failure': 'did not work',
            };

            Object.entries(jargonMap).forEach(([technical, simple]) => {
                const regex = new RegExp(`\\b${technical}\\b`, 'gi');
                simplifiedText = simplifiedText.replace(regex, simple);
            });
        }

        // Shorten sentences
        if (cognitiveConfig.textSimplification.shortenSentences) {
            // Split on conjunctions and rephrase
            simplifiedText = simplifiedText
                .replace(/\b(because|since|therefore|however|although)\b/gi, '. ')
                .replace(/\band\b/gi, '. ')
                .replace(/\bbut\b/gi, '. ')
                .replace(/\bwhich\b/gi, ' that ');
        }

        // Use active voice
        if (cognitiveConfig.textSimplification.useActiveVoice) {
            simplifiedText = simplifiedText
                .replace(/\bwas\b\s+(\w+ed)\b/gi, 'were $1')
                .replace(/\bis\s+being\s+(\w+ed)\b/gi, 'are $1')
                .replace(/\b(\w+ed)\s+by\s+(.+?)(?=\.|\,)/gi, '$2 $1');
        }

        // Adjust complexity based on target level
        if (targetLevel === 'simple') {
            // Further simplify for simple level
            simplifiedText = simplifiedText
                .replace(/\b(very|extremely|really)\b/gi, '')
                .replace(/\b(however|furthermore|moreover)\b/gi, 'also')
                .replace(/\b(therefore|consequently)\b/gi, 'so')
                .replace(/\b(additionally)\b/gi, 'plus');
        }

        return simplifiedText;
    }, [cognitiveConfig.textSimplification]);

    // Progressive disclosure
    const createProgressiveDisclosure = useCallback((
        content: string,
        maxLength: number = cognitiveConfig.progressiveDisclosure.maxInitialLength
    ) => {
        if (!cognitiveConfig.progressiveDisclosure.enabled || content.length <= maxLength) {
            return {
                summary: content,
                details: '',
                showMore: false,
            };
        }

        // Create summary by truncating at sentence or word boundary
        let summary = content.substring(0, maxLength);

        // Find last sentence boundary
        const lastSentence = content.lastIndexOf('.');
        const lastQuestion = content.lastIndexOf('?');
        const lastExclamation = content.lastIndexOf('!');
        const lastPeriod = Math.max(lastSentence, lastQuestion, lastExclamation);

        if (lastPeriod > maxLength * 0.7) {
            summary = content.substring(0, lastPeriod + 1);
        } else {
            // Find last word boundary
            const lastSpace = content.lastIndexOf(' ', maxLength);
            if (lastSpace > maxLength * 0.8) {
                summary = content.substring(0, lastSpace) + '...';
            } else {
                summary = content.substring(0, maxLength) + '...';
            }
        }

        return {
            summary,
            details: content,
            showMore: true,
        };
    }, [cognitiveConfig.progressiveDisclosure]);

    // Information chunking
    const chunkInformation = useCallback((
        content: string,
        chunkSize: number = cognitiveConfig.informationChunking.chunkSize
    ) => {
        if (!cognitiveConfig.informationChunking.enabled) {
            return {
                chunks: [content],
                currentChunk: content,
                chunkNumber: 1,
                totalChunks: 1,
            };
        }

        // Split content into meaningful chunks
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const chunks: string[] = [];
        let currentChunk = '';

        sentences.forEach(sentence => {
            const trimmedSentence = sentence.trim();
            if (currentChunk.length + trimmedSentence.length > chunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim() + '.');
                currentChunk = trimmedSentence;
            } else {
                currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
            }
        });

        if (currentChunk.trim()) {
            chunks.push(currentChunk.trim() + '.');
        }

        return {
            chunks,
            currentChunk: chunks[cognitiveState.chunkIndex] || chunks[0] || '',
            chunkNumber: cognitiveState.chunkIndex + 1,
            totalChunks: chunks.length,
        };
    }, [cognitiveConfig.informationChunking, cognitiveState.chunkIndex]);

    // Cognitive load estimation
    const getCognitiveLoadScore = useCallback((content: string): number => {
        let score = 0;

        // Count decision points
        const decisionWords = ['choose', 'select', 'decide', 'determine', 'decide between', 'choose between'];
        decisionWords.forEach(word => {
            const matches = (content.match(new RegExp(word, 'gi')) || []).length;
            score += matches * 2;
        });

        // Count action words
        const actionWords = ['click', 'tap', 'press', 'select', 'enter', 'type', 'fill', 'choose'];
        actionWords.forEach(word => {
            const matches = (content.match(new RegExp(word, 'gi')) || []).length;
            score += matches;
        });

        // Count technical terms
        const technicalTerms = /\b[A-Z]{2,}\b/g;
        const technicalCount = (content.match(technicalTerms) || []).length;
        score += technicalCount * 1.5;

        // Length penalty (longer content = higher load)
        const lengthPenalty = Math.max(0, content.length - 200) / 100;
        score += lengthPenalty;

        // Complexity penalty (longer sentences)
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgSentenceLength = content.length / sentences.length;
        if (avgSentenceLength > 20) {
            score += (avgSentenceLength - 20) / 5;
        }

        return Math.min(10, score); // Cap at 10
    }, []);

    // Reading time estimation
    const estimateReadingTime = useCallback((content: string): number => {
        // Average reading speed: 200-250 words per minute
        const wordCount = content.split(/\s+/).length;
        const wordsPerMinute = 225;
        return Math.ceil(wordCount / wordsPerMinute * 60); // Return in seconds
    }, []);

    // Accessibility validation
    const validateCognitiveAccessibility = useCallback((content: string) => {
        const issues: string[] = [];
        const suggestions: string[] = [];
        const score = getCognitiveLoadScore(content);

        // Check reading level
        const avgWordsPerSentence = content.split(' ').length / content.split(/[.!?]+/).length;
        if (avgWordsPerSentence > 25) {
            issues.push('Sentences are too long');
            suggestions.push('Break long sentences into shorter ones');
        }

        // Check technical jargon
        const technicalTerms = ['authentication', 'authorization', 'initialization', 'implementation', 'configuration'];
        const hasTechnicalTerms = technicalTerms.some(term => content.toLowerCase().includes(term));
        if (hasTechnicalTerms) {
            issues.push('Contains technical jargon');
            suggestions.push('Replace technical terms with simpler alternatives');
        }

        // Check action density
        const actionWords = content.match(/\b(click|tap|press|select|enter|type)\b/gi) || [];
        if (actionWords.length > 3) {
            issues.push('Too many actions required');
            suggestions.push('Reduce the number of steps or actions');
        }

        // Check content length
        if (content.length > 500) {
            issues.push('Content is too long');
            suggestions.push('Use progressive disclosure to show information gradually');
        }

        return {
            score: Math.max(0, 10 - score),
            issues,
            suggestions,
        };
    }, [getCognitiveLoadScore]);

    // State updates
    const updateConfig = useCallback((newConfig: Partial<CognitiveAccessibilityConfig>) => {
        setCognitiveConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const getState = useCallback(() => cognitiveState, [cognitiveState]);

    const contextValue: CognitiveAccessibilityContextType = {
        config: cognitiveConfig,
        updateConfig,
        simplifyText,
        createProgressiveDisclosure,
        chunkInformation,
        getCognitiveLoadScore,
        estimateReadingTime,
        validateCognitiveAccessibility,
        getState,
    };

    return (
        <CognitiveAccessibilityContext.Provider value={contextValue}>
            {children}
        </CognitiveAccessibilityContext.Provider>
    );
};

// Hook to use cognitive accessibility context
export const useCognitiveAccessibility = (): CognitiveAccessibilityContextType => {
    const context = useContext(CognitiveAccessibilityContext);
    if (context === undefined) {
        throw new Error('useCognitiveAccessibility must be used within a CognitiveAccessibilityProvider');
    }
    return context;
};

// Progressive disclosure component
interface ProgressiveDisclosureProps {
    content: string;
    maxLength?: number;
    summaryLength?: number;
    onToggle?: (showDetails: boolean) => void;
    className?: string;
}

export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
    content,
    maxLength = 100,
    summaryLength = 60,
    onToggle,
    className,
}) => {
    const { createProgressiveDisclosure } = useCognitiveAccessibility();
    const [showDetails, setShowDetails] = useState(false);

    const { summary, showMore } = createProgressiveDisclosure(content, maxLength);

    const handleToggle = useCallback(() => {
        const newShowDetails = !showDetails;
        setShowDetails(newShowDetails);
        onToggle?.(newShowDetails);
    }, [showDetails, onToggle]);

    return (
        <View style={styles.progressiveDisclosure}>
            <Text style={styles.content}>
                {showDetails ? content : summary}
            </Text>
            {showMore && (
                <Text
                    style={styles.showMoreButton}
                    onPress={handleToggle}
                    accessibilityRole="button"
                    accessibilityLabel={showDetails ? 'Show less' : 'Show more'}
                >
                    {showDetails ? 'Show less' : 'Show more'}
                </Text>
            )}
        </View>
    );
};

// Simplified text component
interface SimplifiedTextProps {
    content: string;
    targetLevel?: 'simple' | 'moderate' | 'complex';
    showOriginal?: boolean;
    onToggleLevel?: (level: 'simple' | 'moderate' | 'complex') => void;
}

export const SimplifiedText: React.FC<SimplifiedTextProps> = ({
    content,
    targetLevel = 'moderate',
    showOriginal = false,
    onToggleLevel,
}) => {
    const { simplifyText } = useCognitiveAccessibility();
    const [currentLevel, setCurrentLevel] = useState(targetLevel);
    const [showOriginalText, setShowOriginalText] = useState(showOriginal);

    const simplifiedContent = simplifyText(content, currentLevel);

    const handleLevelChange = useCallback((newLevel: 'simple' | 'moderate' | 'complex') => {
        setCurrentLevel(newLevel);
        onToggleLevel?.(newLevel);
    }, [onToggleLevel]);

    return (
        <View style={styles.simplifiedText}>
            <View style={styles.levelSelector}>
                <Text
                    style={[
                        styles.levelButton,
                        currentLevel === 'simple' && styles.levelButtonActive
                    ]}
                    onPress={() => handleLevelChange('simple')}
                >
                    Simple
                </Text>
                <Text
                    style={[
                        styles.levelButton,
                        currentLevel === 'moderate' && styles.levelButtonActive
                    ]}
                    onPress={() => handleLevelChange('moderate')}
                >
                    Normal
                </Text>
                <Text
                    style={[
                        styles.levelButton,
                        currentLevel === 'complex' && styles.levelButtonActive
                    ]}
                    onPress={() => handleLevelChange('complex')}
                >
                    Detailed
                </Text>
            </View>

            <Text style={styles.content}>
                {showOriginalText ? content : simplifiedContent}
            </Text>

            {showOriginal && (
                <Text
                    style={styles.toggleOriginal}
                    onPress={() => setShowOriginalText(!showOriginalText)}
                    accessibilityRole="button"
                    accessibilityLabel={showOriginalText ? 'Show simplified' : 'Show original'}
                >
                    {showOriginalText ? 'Show simplified' : 'Show original'}
                </Text>
            )}
        </View>
    );
};

// Information chunking component
interface InformationChunksProps {
    content: string;
    chunkSize?: number;
    allowNavigation?: boolean;
    onChunkChange?: (chunkIndex: number, totalChunks: number) => void;
}

export const InformationChunks: React.FC<InformationChunksProps> = ({
    content,
    chunkSize = 50,
    allowNavigation = true,
    onChunkChange,
}) => {
    const { chunkInformation } = useCognitiveAccessibility();
    const [chunkIndex, setChunkIndex] = useState(0);

    const { chunks, currentChunk, chunkNumber, totalChunks } = chunkInformation(content, chunkSize);

    const handlePrevious = useCallback(() => {
        const newIndex = Math.max(0, chunkIndex - 1);
        setChunkIndex(newIndex);
        onChunkChange?.(newIndex, totalChunks);
    }, [chunkIndex, totalChunks, onChunkChange]);

    const handleNext = useCallback(() => {
        const newIndex = Math.min(chunks.length - 1, chunkIndex + 1);
        setChunkIndex(newIndex);
        onChunkChange?.(newIndex, totalChunks);
    }, [chunkIndex, totalChunks, onChunkChange]);

    return (
        <View style={styles.informationChunks}>
            <View style={styles.chunkHeader}>
                <Text style={styles.chunkInfo}>
                    Part {chunkNumber} of {totalChunks}
                </Text>
                {allowNavigation && (
                    <View style={styles.chunkNavigation}>
                        <Text
                            style={[
                                styles.chunkNavButton,
                                chunkIndex === 0 && styles.chunkNavButtonDisabled
                            ]}
                            onPress={handlePrevious}
                            accessibilityRole="button"
                            accessibilityLabel="Previous part"
                            accessibilityState={{ disabled: chunkIndex === 0 }}
                        >
                            ← Previous
                        </Text>
                        <Text
                            style={[
                                styles.chunkNavButton,
                                chunkIndex === chunks.length - 1 && styles.chunkNavButtonDisabled
                            ]}
                            onPress={handleNext}
                            accessibilityRole="button"
                            accessibilityLabel="Next part"
                            accessibilityState={{ disabled: chunkIndex === chunks.length - 1 }}
                        >
                            Next →
                        </Text>
                    </View>
                )}
            </View>

            <Text style={styles.chunkContent}>
                {currentChunk}
            </Text>

            {totalChunks > 1 && (
                <View style={styles.chunkIndicator}>
                    {chunks.map((_, index) => (
                        <View
                            key={index}
                            style={[
                                styles.chunkDot,
                                index === chunkIndex && styles.chunkDotActive
                            ]}
                        />
                    ))}
                </View>
            )}
        </View>
    );
};

// Cognitive accessibility error message component
interface CognitiveErrorMessageProps {
    title: string;
    message: string;
    solution?: string;
    actions?: string[];
    complexity?: 'simple' | 'moderate' | 'complex';
    enableChunking?: boolean;
    enableSimplification?: boolean;
}

export const CognitiveErrorMessage: React.FC<CognitiveErrorMessageProps> = ({
    title,
    message,
    solution,
    actions = [],
    complexity = 'moderate',
    enableChunking = true,
    enableSimplification = true,
}) => {
    const { simplifyText, chunkInformation, validateCognitiveAccessibility } = useCognitiveAccessibility();

    // Simplify message if enabled
    const simplifiedMessage = enableSimplification ? simplifyText(message, complexity) : message;

    // Chunk content if enabled (unused variables for future use)
    if (enableChunking) {
        chunkInformation(solution ? `${message} ${solution}` : message);
    }

    // Validate cognitive accessibility
    const validation = validateCognitiveAccessibility(message);

    return (
        <View style={styles.errorMessage}>
            <Text style={styles.errorTitle}>
                {title}
            </Text>

            <ProgressiveDisclosure
                content={simplifiedMessage}
                maxLength={80}
            />

            {solution && (
                <View style={styles.solution}>
                    <Text style={styles.solutionLabel}>
                        How to fix:
                    </Text>
                    <InformationChunks
                        content={solution}
                        chunkSize={40}
                        onChunkChange={(index, total) => console.log(`Chunk ${index + 1} of ${total}`)}
                    />
                </View>
            )}

            {actions.length > 0 && (
                <View style={styles.actions}>
                    <Text style={styles.actionsLabel}>
                        What you can do:
                    </Text>
                    {actions.map((action, index) => (
                        <Text key={index} style={styles.action}>
                            • {action}
                        </Text>
                    ))}
                </View>
            )}

            {validation.score < 7 && (
                <View style={styles.accessibilityWarning}>
                    <Text style={styles.warningText}>
                        This error message might be hard to understand.
                        Try enabling simplified text or progressive disclosure.
                    </Text>
                </View>
            )}
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    progressiveDisclosure: {
        marginVertical: 8,
    },
    content: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginBottom: 8,
    },
    showMoreButton: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '500',
    },
    simplifiedText: {
        marginVertical: 8,
    },
    levelSelector: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    levelButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        borderRadius: 4,
        backgroundColor: '#E5E5E7',
        fontSize: 14,
    },
    levelButtonActive: {
        backgroundColor: '#007AFF',
        color: 'white',
    },
    toggleOriginal: {
        color: '#007AFF',
        fontSize: 14,
        marginTop: 8,
    },
    informationChunks: {
        marginVertical: 8,
    },
    chunkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    chunkInfo: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    chunkNavigation: {
        flexDirection: 'row',
    },
    chunkNavButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginLeft: 8,
        borderRadius: 4,
        backgroundColor: '#007AFF',
        color: 'white',
        fontSize: 12,
    },
    chunkNavButtonDisabled: {
        backgroundColor: '#E5E5E7',
        color: '#999',
    },
    chunkContent: {
        fontSize: 16,
        lineHeight: 24,
        color: '#333',
        marginBottom: 8,
    },
    chunkIndicator: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    },
    chunkDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#E5E5E7',
        marginHorizontal: 2,
    },
    chunkDotActive: {
        backgroundColor: '#007AFF',
    },
    errorMessage: {
        padding: 16,
        backgroundColor: '#FFF5F5',
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF3B30',
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF3B30',
        marginBottom: 8,
    },
    solution: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#FFB3B3',
    },
    solutionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E1B1B',
        marginBottom: 4,
    },
    actions: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#FFB3B3',
    },
    actionsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#8E1B1B',
        marginBottom: 4,
    },
    action: {
        fontSize: 14,
        color: '#8E1B1B',
        marginBottom: 2,
    },
    accessibilityWarning: {
        marginTop: 12,
        padding: 8,
        backgroundColor: '#FFF8E6',
        borderRadius: 4,
        borderLeftWidth: 2,
        borderLeftColor: '#FF9500',
    },
    warningText: {
        fontSize: 12,
        color: '#CC7700',
        fontStyle: 'italic',
    },
});

export default CognitiveAccessibilityProvider;