/**
 * Resolution Workflow Component
 * Interactive guided resolution wizard with progress tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated,
    Dimensions,
    ActivityIndicator,
    Platform,
} from 'react-native';
import {
    ResolutionWorkflowState,
    ResolutionPath,
    ResolutionStep,
    ResolutionStepResult,
    UserFeedback,
    WorkflowStatus,
    ResolutionEvent,
} from '../types/ContextualResolutionTypes';
import { ResolutionGuidanceEngine } from '../services/ResolutionGuidanceEngine';

const { width: screenWidth } = Dimensions.get('window');

interface ResolutionWorkflowProps {
    resolutionPath: ResolutionPath;
    errorId: string;
    onComplete: (success: boolean, feedback?: UserFeedback) => void;
    onCancel: () => void;
    onEvent?: (event: ResolutionEvent) => void;
    theme?: any;
    showProgress?: boolean;
    enableHaptics?: boolean;
    compactMode?: boolean;
}

interface StepState {
    status: 'pending' | 'active' | 'completed' | 'failed' | 'skipped';
    result?: ResolutionStepResult;
    retryCount: number;
}

/**
 * Resolution Workflow Component
 */
export const ResolutionWorkflow: React.FC<ResolutionWorkflowProps> = ({
    resolutionPath,
    errorId,
    onComplete,
    onCancel,
    onEvent,
    theme,
    showProgress = true,
    enableHaptics = true,
    compactMode = false,
}) => {
    // State
    const [workflowState, setWorkflowState] = useState<ResolutionWorkflowState>(() => ({
        workflowId: `workflow_${Date.now()}`,
        errorId,
        resolutionPathId: resolutionPath.id,
        currentStepId: resolutionPath.steps[0]?.id || '',
        currentStepIndex: 0,
        totalSteps: resolutionPath.steps.length,
        completedSteps: [],
        failedSteps: [],
        skippedSteps: [],
        progress: 0,
        status: WorkflowStatus.NOT_STARTED,
        startTime: new Date(),
        stepResults: new Map(),
    }));

    const [stepStates, setStepStates] = useState<Map<string, StepState>>(() => {
        const states = new Map<string, StepState>();
        resolutionPath.steps.forEach(step => {
            states.set(step.id, { status: 'pending', retryCount: 0 });
        });
        return states;
    });

    const [isExecuting, setIsExecuting] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    // Services
    const guidanceEngine = ResolutionGuidanceEngine.getInstance();

    // Initialize workflow
    useEffect(() => {
        startWorkflow();
        animateIn();
    }, []);

    // Update progress animation
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: workflowState.progress,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [workflowState.progress]);

    const animateIn = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                tension: 100,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const startWorkflow = () => {
        setWorkflowState(prev => ({
            ...prev,
            status: WorkflowStatus.IN_PROGRESS,
            startTime: new Date(),
        }));

        // Mark first step as active
        const firstStepId = resolutionPath.steps[0]?.id;
        if (firstStepId) {
            updateStepState(firstStepId, { status: 'active' });
        }

        emitEvent({ type: 'WORKFLOW_STARTED', workflowId: workflowState.workflowId, resolutionPathId: resolutionPath.id });
    };

    const updateStepState = (stepId: string, update: Partial<StepState>) => {
        setStepStates(prev => {
            const newStates = new Map(prev);
            const current = newStates.get(stepId) || { status: 'pending', retryCount: 0 };
            newStates.set(stepId, { ...current, ...update });
            return newStates;
        });
    };

    const emitEvent = (event: ResolutionEvent) => {
        onEvent?.(event);
    };

    const executeCurrentStep = async () => {
        const currentStep = resolutionPath.steps[workflowState.currentStepIndex];
        if (!currentStep) return;

        setIsExecuting(true);
        emitEvent({ type: 'STEP_STARTED', workflowId: workflowState.workflowId, stepId: currentStep.id });

        try {
            // Check skip condition
            if (currentStep.skipCondition?.()) {
                handleStepSkip(currentStep);
                return;
            }

            // Execute step
            const result = await guidanceEngine.executeStep(currentStep);

            if (result.success) {
                handleStepSuccess(currentStep, result);
            } else {
                handleStepFailure(currentStep, result);
            }
        } catch (error) {
            const errorResult: ResolutionStepResult = {
                success: false,
                message: error instanceof Error ? error.message : 'Unknown error',
                error: error instanceof Error ? error : new Error(String(error)),
                completionTime: 0,
                attemptCount: 1,
            };
            handleStepFailure(currentStep, errorResult);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleStepSuccess = (step: ResolutionStep, result: ResolutionStepResult) => {
        updateStepState(step.id, { status: 'completed', result });

        setWorkflowState(prev => {
            const newCompletedSteps = [...prev.completedSteps, step.id];
            const newStepResults = new Map(prev.stepResults);
            newStepResults.set(step.id, result);

            const newProgress = (newCompletedSteps.length / prev.totalSteps) * 100;

            return {
                ...prev,
                completedSteps: newCompletedSteps,
                stepResults: newStepResults,
                progress: newProgress,
            };
        });

        emitEvent({
            type: 'STEP_COMPLETED',
            workflowId: workflowState.workflowId,
            stepId: step.id,
            result,
        });

        if (enableHaptics) {
            triggerHaptic('success');
        }

        // Move to next step or complete
        if (result.nextStepId) {
            goToStep(result.nextStepId);
        } else if (workflowState.currentStepIndex < resolutionPath.steps.length - 1) {
            goToNextStep();
        } else {
            completeWorkflow(true);
        }
    };

    const handleStepFailure = (step: ResolutionStep, result: ResolutionStepResult) => {
        const currentState = stepStates.get(step.id);
        const newRetryCount = (currentState?.retryCount || 0) + 1;

        if (step.retryable && newRetryCount < (step.maxRetries || 3)) {
            updateStepState(step.id, { retryCount: newRetryCount, result });
            // Allow retry
        } else {
            updateStepState(step.id, { status: 'failed', result, retryCount: newRetryCount });

            setWorkflowState(prev => ({
                ...prev,
                failedSteps: [...prev.failedSteps, step.id],
            }));

            emitEvent({
                type: 'STEP_FAILED',
                workflowId: workflowState.workflowId,
                stepId: step.id,
                error: result.error || new Error(result.message),
            });

            if (enableHaptics) {
                triggerHaptic('error');
            }
        }
    };

    const handleStepSkip = (step: ResolutionStep) => {
        updateStepState(step.id, { status: 'skipped' });

        setWorkflowState(prev => ({
            ...prev,
            skippedSteps: [...prev.skippedSteps, step.id],
        }));

        emitEvent({
            type: 'STEP_SKIPPED',
            workflowId: workflowState.workflowId,
            stepId: step.id,
            reason: 'Skip condition met',
        });

        goToNextStep();
    };

    const goToNextStep = () => {
        const nextIndex = workflowState.currentStepIndex + 1;
        if (nextIndex < resolutionPath.steps.length) {
            const nextStep = resolutionPath.steps[nextIndex];
            setWorkflowState(prev => ({
                ...prev,
                currentStepIndex: nextIndex,
                currentStepId: nextStep.id,
            }));
            updateStepState(nextStep.id, { status: 'active' });
        } else {
            completeWorkflow(true);
        }
    };

    const goToStep = (stepId: string) => {
        const stepIndex = resolutionPath.steps.findIndex(s => s.id === stepId);
        if (stepIndex !== -1) {
            setWorkflowState(prev => ({
                ...prev,
                currentStepIndex: stepIndex,
                currentStepId: stepId,
            }));
            updateStepState(stepId, { status: 'active' });
        }
    };

    const completeWorkflow = (success: boolean) => {
        setWorkflowState(prev => ({
            ...prev,
            status: success ? WorkflowStatus.COMPLETED : WorkflowStatus.FAILED,
            endTime: new Date(),
            totalDuration: Date.now() - prev.startTime.getTime(),
        }));

        emitEvent({
            type: 'WORKFLOW_COMPLETED',
            workflowId: workflowState.workflowId,
            success,
        });

        setShowFeedback(true);
    };

    const cancelWorkflow = () => {
        setWorkflowState(prev => ({
            ...prev,
            status: WorkflowStatus.CANCELLED,
            endTime: new Date(),
        }));

        emitEvent({
            type: 'WORKFLOW_CANCELLED',
            workflowId: workflowState.workflowId,
        });

        onCancel();
    };

    const submitFeedback = (feedback: UserFeedback) => {
        emitEvent({
            type: 'FEEDBACK_SUBMITTED',
            workflowId: workflowState.workflowId,
            feedback,
        });

        onComplete(workflowState.status === WorkflowStatus.COMPLETED, feedback);
    };

    const requestHelp = () => {
        emitEvent({
            type: 'HELP_REQUESTED',
            workflowId: workflowState.workflowId,
            stepId: workflowState.currentStepId,
            helpType: 'contextual',
        });
    };

    const triggerHaptic = (type: 'success' | 'error' | 'warning') => {
        if (Platform.OS !== 'ios') return;
        // Implement haptic feedback
    };

    const getCurrentStep = (): ResolutionStep | undefined => {
        return resolutionPath.steps[workflowState.currentStepIndex];
    };

    const getStepStatus = (stepId: string): StepState => {
        return stepStates.get(stepId) || { status: 'pending', retryCount: 0 };
    };

    const styles = getStyles(theme, compactMode);

    // Render progress bar
    const renderProgressBar = () => {
        if (!showProgress) return null;

        return (
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 100],
                                    outputRange: ['0%', '100%'],
                                }),
                            },
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    Step {workflowState.currentStepIndex + 1} of {workflowState.totalSteps}
                </Text>
            </View>
        );
    };

    // Render step indicator
    const renderStepIndicator = () => {
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.stepIndicatorContainer}
            >
                {resolutionPath.steps.map((step, index) => {
                    const state = getStepStatus(step.id);
                    const isActive = index === workflowState.currentStepIndex;

                    return (
                        <View key={step.id} style={styles.stepIndicatorWrapper}>
                            <View
                                style={[
                                    styles.stepIndicator,
                                    state.status === 'completed' && styles.stepIndicatorCompleted,
                                    state.status === 'failed' && styles.stepIndicatorFailed,
                                    state.status === 'skipped' && styles.stepIndicatorSkipped,
                                    isActive && styles.stepIndicatorActive,
                                ]}
                            >
                                {state.status === 'completed' && (
                                    <Text style={styles.stepIndicatorIcon}>✓</Text>
                                )}
                                {state.status === 'failed' && (
                                    <Text style={styles.stepIndicatorIcon}>✗</Text>
                                )}
                                {state.status === 'skipped' && (
                                    <Text style={styles.stepIndicatorIcon}>−</Text>
                                )}
                                {(state.status === 'pending' || state.status === 'active') && (
                                    <Text style={styles.stepIndicatorNumber}>{index + 1}</Text>
                                )}
                            </View>
                            {index < resolutionPath.steps.length - 1 && (
                                <View
                                    style={[
                                        styles.stepConnector,
                                        (state.status === 'completed' || state.status === 'skipped') &&
                                        styles.stepConnectorCompleted,
                                    ]}
                                />
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        );
    };

    // Render current step content
    const renderCurrentStep = () => {
        const step = getCurrentStep();
        if (!step) return null;

        const state = getStepStatus(step.id);

        return (
            <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDescription}>{step.description}</Text>

                <View style={styles.instructionsContainer}>
                    <Text style={styles.instructionsLabel}>Instructions:</Text>
                    <Text style={styles.instructions}>{step.detailedInstructions}</Text>
                </View>

                <View style={styles.expectedOutcomeContainer}>
                    <Text style={styles.expectedOutcomeLabel}>Expected Outcome:</Text>
                    <Text style={styles.expectedOutcome}>{step.expectedOutcome}</Text>
                </View>

                <View style={styles.stepMetaContainer}>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Duration:</Text>
                        <Text style={styles.metaValue}>
                            ~{Math.ceil(step.estimatedDuration / 60)} min
                        </Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Difficulty:</Text>
                        <Text style={[
                            styles.metaValue,
                            step.difficulty === 'easy' && styles.difficultyEasy,
                            step.difficulty === 'medium' && styles.difficultyMedium,
                            step.difficulty === 'hard' && styles.difficultyHard,
                        ]}>
                            {step.difficulty}
                        </Text>
                    </View>
                </View>

                {state.status === 'failed' && state.result && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{state.result.message}</Text>
                        {step.retryable && state.retryCount < (step.maxRetries || 3) && (
                            <Text style={styles.retryText}>
                                Retry {state.retryCount}/{step.maxRetries || 3}
                            </Text>
                        )}
                    </View>
                )}
            </View>
        );
    };

    // Render action buttons
    const renderActions = () => {
        const step = getCurrentStep();
        const state = step ? getStepStatus(step.id) : null;
        const canRetry = step?.retryable && (state?.retryCount || 0) < (step.maxRetries || 3);

        return (
            <View style={styles.actionsContainer}>
                {step?.helpUrl && (
                    <TouchableOpacity
                        style={styles.helpButton}
                        onPress={requestHelp}
                        accessibilityLabel="Get help"
                    >
                        <Text style={styles.helpButtonText}>Need Help?</Text>
                    </TouchableOpacity>
                )}

                <View style={styles.mainActions}>
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={cancelWorkflow}
                        accessibilityLabel="Cancel resolution"
                    >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                    </TouchableOpacity>

                    {state?.status === 'failed' && canRetry ? (
                        <TouchableOpacity
                            style={[styles.primaryButton, isExecuting && styles.buttonDisabled]}
                            onPress={executeCurrentStep}
                            disabled={isExecuting}
                            accessibilityLabel="Retry step"
                        >
                            {isExecuting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Retry</Text>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            style={[styles.primaryButton, isExecuting && styles.buttonDisabled]}
                            onPress={executeCurrentStep}
                            disabled={isExecuting}
                            accessibilityLabel={step?.action ? 'Execute step' : 'Mark as complete'}
                        >
                            {isExecuting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <Text style={styles.primaryButtonText}>
                                    {step?.action ? 'Execute' : 'Done'}
                                </Text>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {step?.isOptional && (
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={() => step && handleStepSkip(step)}
                        accessibilityLabel="Skip this step"
                    >
                        <Text style={styles.skipButtonText}>Skip this step</Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    // Render feedback form
    const renderFeedbackForm = () => {
        if (!showFeedback) return null;

        return (
            <FeedbackForm
                onSubmit={submitFeedback}
                onSkip={() => onComplete(workflowState.status === WorkflowStatus.COMPLETED)}
                workflowDuration={workflowState.totalDuration || 0}
                success={workflowState.status === WorkflowStatus.COMPLETED}
                theme={theme}
            />
        );
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                },
            ]}
        >
            <View style={styles.header}>
                <Text style={styles.title}>{resolutionPath.title}</Text>
                <Text style={styles.subtitle}>{resolutionPath.description}</Text>
            </View>

            {renderProgressBar()}
            {renderStepIndicator()}

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {showFeedback ? renderFeedbackForm() : renderCurrentStep()}
            </ScrollView>

            {!showFeedback && renderActions()}
        </Animated.View>
    );
};

/**
 * Feedback Form Component
 */
interface FeedbackFormProps {
    onSubmit: (feedback: UserFeedback) => void;
    onSkip: () => void;
    workflowDuration: number;
    success: boolean;
    theme?: any;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({
    onSubmit,
    onSkip,
    workflowDuration,
    success,
    theme,
}) => {
    const [rating, setRating] = useState(0);
    const [wasHelpful, setWasHelpful] = useState<boolean | null>(null);
    const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);

    const handleSubmit = () => {
        if (rating === 0 || wasHelpful === null || difficulty === null) {
            return;
        }

        onSubmit({
            rating,
            wasHelpful,
            resolvedIssue: success,
            timeToResolve: workflowDuration,
            difficulty,
            timestamp: new Date(),
        });
    };

    const styles = getFeedbackStyles(theme);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>How was your experience?</Text>

            {/* Rating */}
            <View style={styles.ratingContainer}>
                <Text style={styles.label}>Rate this solution:</Text>
                <View style={styles.stars}>
                    {[1, 2, 3, 4, 5].map(star => (
                        <TouchableOpacity
                            key={star}
                            onPress={() => setRating(star)}
                            accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
                        >
                            <Text style={[styles.star, rating >= star && styles.starActive]}>
                                ★
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* Helpful */}
            <View style={styles.questionContainer}>
                <Text style={styles.label}>Was this helpful?</Text>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[styles.optionButton, wasHelpful === true && styles.optionButtonActive]}
                        onPress={() => setWasHelpful(true)}
                    >
                        <Text style={[styles.optionText, wasHelpful === true && styles.optionTextActive]}>
                            Yes
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.optionButton, wasHelpful === false && styles.optionButtonActive]}
                        onPress={() => setWasHelpful(false)}
                    >
                        <Text style={[styles.optionText, wasHelpful === false && styles.optionTextActive]}>
                            No
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Difficulty */}
            <View style={styles.questionContainer}>
                <Text style={styles.label}>How difficult was this?</Text>
                <View style={styles.buttonGroup}>
                    {(['easy', 'medium', 'hard'] as const).map(level => (
                        <TouchableOpacity
                            key={level}
                            style={[styles.optionButton, difficulty === level && styles.optionButtonActive]}
                            onPress={() => setDifficulty(level)}
                        >
                            <Text style={[styles.optionText, difficulty === level && styles.optionTextActive]}>
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                    <Text style={styles.skipText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (rating === 0 || wasHelpful === null || difficulty === null) &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={handleSubmit}
                    disabled={rating === 0 || wasHelpful === null || difficulty === null}
                >
                    <Text style={styles.submitText}>Submit</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// Styles
const getStyles = (theme: any, compactMode: boolean) =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme?.colors?.ui?.background || '#FFFFFF',
        },
        header: {
            padding: compactMode ? 12 : 20,
            borderBottomWidth: 1,
            borderBottomColor: theme?.colors?.ui?.border || '#E5E5EA',
        },
        title: {
            fontSize: compactMode ? 18 : 22,
            fontWeight: 'bold',
            color: theme?.colors?.ui?.text?.primary || '#000000',
            marginBottom: 4,
        },
        subtitle: {
            fontSize: compactMode ? 13 : 14,
            color: theme?.colors?.ui?.text?.secondary || '#666666',
        },
        progressContainer: {
            padding: compactMode ? 12 : 16,
        },
        progressBar: {
            height: 4,
            backgroundColor: '#E5E5EA',
            borderRadius: 2,
            overflow: 'hidden',
        },
        progressFill: {
            height: '100%',
            backgroundColor: '#007AFF',
            borderRadius: 2,
        },
        progressText: {
            fontSize: 12,
            color: theme?.colors?.ui?.text?.secondary || '#666666',
            textAlign: 'center',
            marginTop: 8,
        },
        stepIndicatorContainer: {
            paddingHorizontal: 16,
            paddingVertical: 12,
        },
        stepIndicatorWrapper: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        stepIndicator: {
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#E5E5EA',
            justifyContent: 'center',
            alignItems: 'center',
        },
        stepIndicatorActive: {
            backgroundColor: '#007AFF',
        },
        stepIndicatorCompleted: {
            backgroundColor: '#34C759',
        },
        stepIndicatorFailed: {
            backgroundColor: '#FF3B30',
        },
        stepIndicatorSkipped: {
            backgroundColor: '#8E8E93',
        },
        stepIndicatorIcon: {
            color: '#FFFFFF',
            fontSize: 14,
            fontWeight: 'bold',
        },
        stepIndicatorNumber: {
            color: '#FFFFFF',
            fontSize: 12,
            fontWeight: '600',
        },
        stepConnector: {
            width: 24,
            height: 2,
            backgroundColor: '#E5E5EA',
        },
        stepConnectorCompleted: {
            backgroundColor: '#34C759',
        },
        scrollView: {
            flex: 1,
        },
        scrollContent: {
            padding: compactMode ? 12 : 20,
        },
        stepContent: {
            flex: 1,
        },
        stepTitle: {
            fontSize: compactMode ? 18 : 20,
            fontWeight: '600',
            color: theme?.colors?.ui?.text?.primary || '#000000',
            marginBottom: 8,
        },
        stepDescription: {
            fontSize: compactMode ? 14 : 15,
            color: theme?.colors?.ui?.text?.secondary || '#666666',
            marginBottom: 16,
            lineHeight: 22,
        },
        instructionsContainer: {
            backgroundColor: '#F5F5F7',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
        },
        instructionsLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: theme?.colors?.ui?.text?.secondary || '#666666',
            marginBottom: 4,
        },
        instructions: {
            fontSize: 14,
            color: theme?.colors?.ui?.text?.primary || '#000000',
            lineHeight: 20,
        },
        expectedOutcomeContainer: {
            backgroundColor: '#E8F5E9',
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
        },
        expectedOutcomeLabel: {
            fontSize: 12,
            fontWeight: '600',
            color: '#2E7D32',
            marginBottom: 4,
        },
        expectedOutcome: {
            fontSize: 14,
            color: '#1B5E20',
            lineHeight: 20,
        },
        stepMetaContainer: {
            flexDirection: 'row',
            marginBottom: 16,
        },
        metaItem: {
            flexDirection: 'row',
            marginRight: 24,
        },
        metaLabel: {
            fontSize: 12,
            color: theme?.colors?.ui?.text?.secondary || '#666666',
            marginRight: 4,
        },
        metaValue: {
            fontSize: 12,
            fontWeight: '600',
            color: theme?.colors?.ui?.text?.primary || '#000000',
        },
        difficultyEasy: {
            color: '#34C759',
        },
        difficultyMedium: {
            color: '#FF9500',
        },
        difficultyHard: {
            color: '#FF3B30',
        },
        errorContainer: {
            backgroundColor: '#FFF3F3',
            borderRadius: 8,
            padding: 12,
            borderLeftWidth: 3,
            borderLeftColor: '#FF3B30',
        },
        errorText: {
            fontSize: 14,
            color: '#D32F2F',
        },
        retryText: {
            fontSize: 12,
            color: '#666666',
            marginTop: 4,
        },
        actionsContainer: {
            padding: compactMode ? 12 : 16,
            borderTopWidth: 1,
            borderTopColor: theme?.colors?.ui?.border || '#E5E5EA',
        },
        helpButton: {
            alignSelf: 'center',
            marginBottom: 12,
        },
        helpButtonText: {
            fontSize: 14,
            color: '#007AFF',
        },
        mainActions: {
            flexDirection: 'row',
            justifyContent: 'space-between',
        },
        cancelButton: {
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E5EA',
        },
        cancelButtonText: {
            fontSize: 16,
            color: theme?.colors?.ui?.text?.primary || '#000000',
        },
        primaryButton: {
            backgroundColor: '#007AFF',
            paddingHorizontal: 32,
            paddingVertical: 12,
            borderRadius: 8,
            minWidth: 100,
            alignItems: 'center',
        },
        primaryButtonText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
        },
        buttonDisabled: {
            backgroundColor: '#8E8E93',
        },
        skipButton: {
            alignSelf: 'center',
            marginTop: 12,
        },
        skipButtonText: {
            fontSize: 14,
            color: '#8E8E93',
        },
    });

const getFeedbackStyles = (theme: any) =>
    StyleSheet.create({
        container: {
            padding: 20,
        },
        title: {
            fontSize: 20,
            fontWeight: '600',
            color: theme?.colors?.ui?.text?.primary || '#000000',
            textAlign: 'center',
            marginBottom: 24,
        },
        ratingContainer: {
            marginBottom: 20,
        },
        label: {
            fontSize: 14,
            color: theme?.colors?.ui?.text?.secondary || '#666666',
            marginBottom: 8,
        },
        stars: {
            flexDirection: 'row',
            justifyContent: 'center',
        },
        star: {
            fontSize: 32,
            color: '#E5E5EA',
            marginHorizontal: 4,
        },
        starActive: {
            color: '#FFD60A',
        },
        questionContainer: {
            marginBottom: 20,
        },
        buttonGroup: {
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 12,
        },
        optionButton: {
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: '#E5E5EA',
            minWidth: 80,
            alignItems: 'center',
        },
        optionButtonActive: {
            backgroundColor: '#007AFF',
            borderColor: '#007AFF',
        },
        optionText: {
            fontSize: 14,
            color: theme?.colors?.ui?.text?.primary || '#000000',
        },
        optionTextActive: {
            color: '#FFFFFF',
        },
        actions: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: 24,
        },
        skipButton: {
            paddingHorizontal: 24,
            paddingVertical: 12,
        },
        skipText: {
            fontSize: 16,
            color: '#8E8E93',
        },
        submitButton: {
            backgroundColor: '#007AFF',
            paddingHorizontal: 32,
            paddingVertical: 12,
            borderRadius: 8,
        },
        submitButtonDisabled: {
            backgroundColor: '#E5E5EA',
        },
        submitText: {
            fontSize: 16,
            fontWeight: '600',
            color: '#FFFFFF',
        },
    });

export default ResolutionWorkflow;