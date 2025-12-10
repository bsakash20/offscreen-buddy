/**
 * Cognitive Accessibility Service
 * Simplified modes, reduced cognitive load, and memory aids for users with ADHD and cognitive impairments
 */

import AccessibilityManager from './AccessibilityManager';
import ScreenReaderService from './ScreenReaderService';

export interface SimplificationLevel {
    level: 'none' | 'low' | 'moderate' | 'high';
    features: {
        reducedOptions: boolean;
        simplifiedLanguage: boolean;
        visualSimplification: boolean;
        progressiveDisclosure: boolean;
        guidedWorkflow: boolean;
    };
}

export interface MemoryAid {
    id: string;
    type: 'reminder' | 'progress' | 'context' | 'instruction';
    content: string;
    frequency: 'once' | 'repeated' | 'persistent';
    priority: 'low' | 'medium' | 'high';
}

export interface CognitiveLoadMetrics {
    visualComplexity: number; // 0-100
    interactionComplexity: number; // 0-100
    informationDensity: number; // 0-100
    overallLoad: number; // 0-100
}

class CognitiveAccessibilityService {
    private static instance: CognitiveAccessibilityService;
    private simplificationLevel: SimplificationLevel;
    private memoryAids: Map<string, MemoryAid> = new Map();
    private progressTracking: Map<string, number> = new Map();

    private constructor() {
        this.simplificationLevel = this.getDefaultSimplification();
        this.registerDefaultMemoryAids();
    }

    static getInstance(): CognitiveAccessibilityService {
        if (!CognitiveAccessibilityService.instance) {
            CognitiveAccessibilityService.instance = new CognitiveAccessibilityService();
        }
        return CognitiveAccessibilityService.instance;
    }

    /**
     * Get default simplification settings
     */
    private getDefaultSimplification(): SimplificationLevel {
        const preferences = AccessibilityManager.getPreferences();

        if (preferences.simplifiedMode) {
            return {
                level: 'moderate',
                features: {
                    reducedOptions: true,
                    simplifiedLanguage: true,
                    visualSimplification: true,
                    progressiveDisclosure: true,
                    guidedWorkflow: true,
                },
            };
        }

        return {
            level: 'none',
            features: {
                reducedOptions: false,
                simplifiedLanguage: false,
                visualSimplification: false,
                progressiveDisclosure: false,
                guidedWorkflow: false,
            },
        };
    }

    /**
     * Register default memory aids
     */
    private registerDefaultMemoryAids(): void {
        this.registerMemoryAid({
            id: 'timer_reminder',
            type: 'reminder',
            content: 'Remember to start your focus timer',
            frequency: 'repeated',
            priority: 'medium',
        });

        this.registerMemoryAid({
            id: 'break_reminder',
            type: 'reminder',
            content: 'Take a break after your focus session',
            frequency: 'repeated',
            priority: 'high',
        });

        this.registerMemoryAid({
            id: 'progress_context',
            type: 'context',
            content: 'You are in the middle of a focus session',
            frequency: 'persistent',
            priority: 'medium',
        });
    }

    /**
     * Simplify text for better comprehension
     */
    simplifyText(text: string, level: 'low' | 'moderate' | 'high' = 'moderate'): string {
        if (!this.simplificationLevel.features.simplifiedLanguage) {
            return text;
        }

        let simplified = text;

        // Replace complex words with simpler alternatives
        const replacements: Record<string, Record<string, string>> = {
            low: {
                'utilize': 'use',
                'commence': 'start',
                'terminate': 'end',
            },
            moderate: {
                'utilize': 'use',
                'commence': 'start',
                'terminate': 'end',
                'approximately': 'about',
                'sufficient': 'enough',
                'additional': 'more',
                'require': 'need',
                'accomplish': 'do',
                'demonstrate': 'show',
            },
            high: {
                'utilize': 'use',
                'commence': 'start',
                'terminate': 'end',
                'approximately': 'about',
                'sufficient': 'enough',
                'additional': 'more',
                'require': 'need',
                'accomplish': 'do',
                'demonstrate': 'show',
                'implement': 'do',
                'configure': 'set up',
                'modify': 'change',
                'subsequently': 'then',
                'consequently': 'so',
            },
        };

        const levelReplacements = replacements[level];
        for (const [complex, simple] of Object.entries(levelReplacements)) {
            const regex = new RegExp(`\\b${complex}\\b`, 'gi');
            simplified = simplified.replace(regex, simple);
        }

        // Simplify sentence structure for high level
        if (level === 'high') {
            // Break long sentences
            simplified = simplified.replace(/([.!?])\s+/g, '$1\n');
            // Remove redundant words
            simplified = simplified.replace(/\b(very|really|quite|rather)\s+/gi, '');
        }

        return simplified;
    }

    /**
     * Create progressive disclosure structure
     */
    createProgressiveDisclosure(
        content: { essential: string[]; secondary: string[]; advanced: string[] }
    ): {
        current: string[];
        hasMore: boolean;
        nextLevel: 'secondary' | 'advanced' | null;
    } {
        if (!this.simplificationLevel.features.progressiveDisclosure) {
            return {
                current: [...content.essential, ...content.secondary, ...content.advanced],
                hasMore: false,
                nextLevel: null,
            };
        }

        const level = this.simplificationLevel.level;

        if (level === 'high') {
            return {
                current: content.essential,
                hasMore: true,
                nextLevel: 'secondary',
            };
        } else if (level === 'moderate') {
            return {
                current: [...content.essential, ...content.secondary],
                hasMore: content.advanced.length > 0,
                nextLevel: 'advanced',
            };
        }

        return {
            current: [...content.essential, ...content.secondary, ...content.advanced],
            hasMore: false,
            nextLevel: null,
        };
    }

    /**
     * Reduce visual complexity
     */
    getVisualSimplificationSettings(): {
        reduceAnimations: boolean;
        simplifyIcons: boolean;
        increaseWhitespace: boolean;
        limitColors: boolean;
        focusMode: boolean;
    } {
        if (!this.simplificationLevel.features.visualSimplification) {
            return {
                reduceAnimations: false,
                simplifyIcons: false,
                increaseWhitespace: false,
                limitColors: false,
                focusMode: false,
            };
        }

        const level = this.simplificationLevel.level;

        return {
            reduceAnimations: level !== 'none',
            simplifyIcons: level === 'high',
            increaseWhitespace: level !== 'none',
            limitColors: level === 'high',
            focusMode: level === 'high',
        };
    }

    /**
     * Calculate cognitive load of content
     */
    calculateCognitiveLoad(content: {
        wordCount: number;
        interactiveElements: number;
        visualElements: number;
        complexity: 'simple' | 'moderate' | 'complex';
    }): CognitiveLoadMetrics {
        // Visual complexity (based on element count)
        const visualComplexity = Math.min(100, (content.visualElements / 10) * 100);

        // Interaction complexity (based on interactive elements)
        const interactionComplexity = Math.min(100, (content.interactiveElements / 5) * 100);

        // Information density (based on word count)
        const informationDensity = Math.min(100, (content.wordCount / 200) * 100);

        // Complexity multiplier
        const complexityMultiplier = {
            simple: 0.7,
            moderate: 1.0,
            complex: 1.3,
        }[content.complexity];

        // Overall cognitive load
        const overallLoad = Math.min(
            100,
            ((visualComplexity + interactionComplexity + informationDensity) / 3) * complexityMultiplier
        );

        return {
            visualComplexity,
            interactionComplexity,
            informationDensity,
            overallLoad,
        };
    }

    /**
     * Get recommended timeout extension
     */
    getTimeoutExtension(baseTimeout: number): number {
        const preferences = AccessibilityManager.getPreferences();

        if (!preferences.extendedTimeouts) {
            return baseTimeout;
        }

        const level = this.simplificationLevel.level;
        const multipliers = {
            none: 1.0,
            low: 1.5,
            moderate: 2.0,
            high: 3.0,
        };

        return baseTimeout * multipliers[level];
    }

    /**
     * Register memory aid
     */
    registerMemoryAid(aid: MemoryAid): void {
        this.memoryAids.set(aid.id, aid);
    }

    /**
     * Get active memory aids
     */
    getActiveMemoryAids(): MemoryAid[] {
        const preferences = AccessibilityManager.getPreferences();

        if (!preferences.memoryAids) {
            return [];
        }

        return Array.from(this.memoryAids.values()).filter(
            aid => aid.frequency === 'persistent' || aid.frequency === 'repeated'
        );
    }

    /**
     * Show memory aid
     */
    showMemoryAid(id: string): void {
        const aid = this.memoryAids.get(id);

        if (aid) {
            ScreenReaderService.announce({
                message: aid.content,
                priority: aid.priority === 'high' ? 'high' : 'normal',
            });
        }
    }

    /**
     * Track progress through multi-step process
     */
    trackProgress(processId: string, currentStep: number, totalSteps: number): void {
        this.progressTracking.set(processId, currentStep);

        const percentage = Math.round((currentStep / totalSteps) * 100);

        ScreenReaderService.announce({
            message: `Step ${currentStep} of ${totalSteps}. ${percentage}% complete.`,
            priority: 'normal',
        });
    }

    /**
     * Get progress for process
     */
    getProgress(processId: string): number | null {
        return this.progressTracking.get(processId) || null;
    }

    /**
     * Create guided workflow steps
     */
    createGuidedWorkflow(steps: string[]): {
        currentStep: number;
        totalSteps: number;
        instruction: string;
        canGoBack: boolean;
        canGoForward: boolean;
    } {
        if (!this.simplificationLevel.features.guidedWorkflow) {
            return {
                currentStep: 0,
                totalSteps: steps.length,
                instruction: steps.join(', '),
                canGoBack: false,
                canGoForward: false,
            };
        }

        return {
            currentStep: 1,
            totalSteps: steps.length,
            instruction: steps[0],
            canGoBack: false,
            canGoForward: true,
        };
    }

    /**
     * Reduce options to essential choices
     */
    reduceOptions<T>(
        options: T[],
        essentialIndices: number[]
    ): { reduced: T[]; hidden: T[] } {
        if (!this.simplificationLevel.features.reducedOptions) {
            return { reduced: options, hidden: [] };
        }

        const reduced = essentialIndices.map(i => options[i]);
        const hidden = options.filter((_, i) => !essentialIndices.includes(i));

        return { reduced, hidden };
    }

    /**
     * Get focus mode settings for ADHD support
     */
    getFocusModeSettings(): {
        enabled: boolean;
        hideDistractions: boolean;
        simplifyInterface: boolean;
        enableBreakReminders: boolean;
        timerVisibility: 'always' | 'minimal' | 'hidden';
    } {
        const visual = this.getVisualSimplificationSettings();

        return {
            enabled: visual.focusMode,
            hideDistractions: visual.focusMode,
            simplifyInterface: visual.focusMode,
            enableBreakReminders: true,
            timerVisibility: visual.focusMode ? 'minimal' : 'always',
        };
    }

    /**
     * Create chunked information for better processing
     */
    chunkInformation(
        information: string,
        chunkSize: number = 3
    ): string[] {
        const sentences = information.split(/[.!?]+/).filter(s => s.trim());
        const chunks: string[] = [];

        for (let i = 0; i < sentences.length; i += chunkSize) {
            const chunk = sentences.slice(i, i + chunkSize).join('. ') + '.';
            chunks.push(chunk.trim());
        }

        return chunks;
    }

    /**
     * Get reading complexity level
     */
    getReadingComplexity(text: string): {
        level: 'simple' | 'moderate' | 'complex';
        wordCount: number;
        averageWordLength: number;
        sentenceCount: number;
    } {
        const words = text.split(/\s+/);
        const sentences = text.split(/[.!?]+/).filter(s => s.trim());

        const wordCount = words.length;
        const averageWordLength = words.reduce((sum, word) => sum + word.length, 0) / wordCount;
        const sentenceCount = sentences.length;
        const averageSentenceLength = wordCount / sentenceCount;

        let level: 'simple' | 'moderate' | 'complex';

        if (averageWordLength < 5 && averageSentenceLength < 15) {
            level = 'simple';
        } else if (averageWordLength < 7 && averageSentenceLength < 25) {
            level = 'moderate';
        } else {
            level = 'complex';
        }

        return {
            level,
            wordCount,
            averageWordLength,
            sentenceCount,
        };
    }

    /**
     * Set simplification level
     */
    async setSimplificationLevel(level: 'none' | 'low' | 'moderate' | 'high'): Promise<void> {
        this.simplificationLevel.level = level;

        const features = {
            none: {
                reducedOptions: false,
                simplifiedLanguage: false,
                visualSimplification: false,
                progressiveDisclosure: false,
                guidedWorkflow: false,
            },
            low: {
                reducedOptions: false,
                simplifiedLanguage: true,
                visualSimplification: false,
                progressiveDisclosure: false,
                guidedWorkflow: false,
            },
            moderate: {
                reducedOptions: true,
                simplifiedLanguage: true,
                visualSimplification: true,
                progressiveDisclosure: true,
                guidedWorkflow: false,
            },
            high: {
                reducedOptions: true,
                simplifiedLanguage: true,
                visualSimplification: true,
                progressiveDisclosure: true,
                guidedWorkflow: true,
            },
        };

        this.simplificationLevel.features = features[level];
        await AccessibilityManager.updatePreferences({
            simplifiedMode: level !== 'none',
            reducedCognitiveLoad: level === 'moderate' || level === 'high',
        });
    }

    /**
     * Get current simplification level
     */
    getSimplificationLevel(): SimplificationLevel {
        return { ...this.simplificationLevel };
    }
}

export default CognitiveAccessibilityService.getInstance();