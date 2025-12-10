/**
 * Contextual Error Description and Resolution Types
 * Comprehensive type definitions for intelligent error resolution system
 */

import { CrossPlatformAppError, CrossPlatformErrorCategory } from '../../types/ErrorUITypes';

// ==================== Core Resolution Types ====================

/**
 * Resolution Step - Individual action in resolution workflow
 */
export interface ResolutionStep {
    id: string;
    title: string;
    description: string;
    detailedInstructions: string;
    expectedOutcome: string;
    estimatedDuration: number; // in seconds
    difficulty: 'easy' | 'medium' | 'hard';
    prerequisites?: string[];
    action?: () => Promise<ResolutionStepResult>;
    validation?: () => Promise<boolean>;
    skipCondition?: () => boolean;
    helpUrl?: string;
    videoUrl?: string;
    screenshots?: string[];
    order: number;
    isOptional: boolean;
    retryable: boolean;
    maxRetries?: number;
}

/**
 * Resolution Step Result
 */
export interface ResolutionStepResult {
    success: boolean;
    message: string;
    data?: any;
    nextStepId?: string;
    skipToStepId?: string;
    error?: Error;
    completionTime: number;
    attemptCount: number;
}

/**
 * Resolution Path - Complete sequence of steps to resolve error
 */
export interface ResolutionPath {
    id: string;
    title: string;
    description: string;
    errorCategory: CrossPlatformErrorCategory;
    errorCodes: string[];
    steps: ResolutionStep[];
    successRate: number; // 0-1
    averageCompletionTime: number; // in seconds
    difficulty: 'easy' | 'medium' | 'hard';
    userRating: number; // 0-5
    usageCount: number;
    lastUpdated: Date;
    tags: string[];
    applicableConditions?: ApplicableCondition[];
    alternativePaths?: string[]; // IDs of alternative resolution paths
    priority: number; // Higher number = higher priority
}

/**
 * Applicable Condition - Determines if resolution path is applicable
 */
export interface ApplicableCondition {
    type: 'platform' | 'version' | 'feature_flag' | 'user_type' | 'custom';
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: any;
    field: string;
}

/**
 * Contextual Error Description
 */
export interface ContextualErrorDescription {
    errorId: string;
    naturalLanguageDescription: string;
    technicalDescription: string;
    userFriendlyTitle: string;
    userFriendlyMessage: string;
    causeExplanation: string;
    impactAssessment: ImpactAssessment;
    contextualFactors: ContextualFactor[];
    relatedConcepts: string[];
    preventionTips: string[];
    generatedAt: Date;
    confidence: number; // 0-1
}

/**
 * Impact Assessment
 */
export interface ImpactAssessment {
    userImpact: 'blocking' | 'disruptive' | 'minor' | 'none';
    affectedFeatures: string[];
    estimatedDowntime?: number; // in seconds
    dataLossRisk: 'none' | 'low' | 'medium' | 'high';
    securityRisk: 'none' | 'low' | 'medium' | 'high';
    businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
    affectedUsers: number | 'unknown';
}

/**
 * Contextual Factor - Environmental or situational context
 */
export interface ContextualFactor {
    type: 'device' | 'network' | 'user_action' | 'app_state' | 'external_service';
    name: string;
    value: any;
    relevance: 'high' | 'medium' | 'low';
    description: string;
}

// ==================== Resolution Recommendation ====================

/**
 * Resolution Recommendation
 */
export interface ResolutionRecommendation {
    resolutionPathId: string;
    confidence: number; // 0-1
    reasoning: string;
    estimatedSuccessRate: number; // 0-1
    estimatedTime: number; // in seconds
    userEffort: 'minimal' | 'moderate' | 'significant';
    priority: number;
    personalizedFactors: PersonalizationFactor[];
    alternatives: AlternativeRecommendation[];
}

/**
 * Personalization Factor
 */
export interface PersonalizationFactor {
    type: 'user_expertise' | 'past_success' | 'device_capability' | 'preference';
    name: string;
    value: any;
    weight: number; // 0-1
    description: string;
}

/**
 * Alternative Recommendation
 */
export interface AlternativeRecommendation {
    resolutionPathId: string;
    reason: string;
    confidence: number;
    estimatedTime: number;
}

// ==================== Interactive Resolution Workflow ====================

/**
 * Resolution Workflow State
 */
export interface ResolutionWorkflowState {
    workflowId: string;
    errorId: string;
    resolutionPathId: string;
    currentStepId: string;
    currentStepIndex: number;
    totalSteps: number;
    completedSteps: string[];
    failedSteps: string[];
    skippedSteps: string[];
    progress: number; // 0-100
    status: WorkflowStatus;
    startTime: Date;
    endTime?: Date;
    totalDuration?: number;
    stepResults: Map<string, ResolutionStepResult>;
    userFeedback?: UserFeedback;
}

/**
 * Workflow Status
 */
export enum WorkflowStatus {
    NOT_STARTED = 'not_started',
    IN_PROGRESS = 'in_progress',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    FAILED = 'failed',
    ABANDONED = 'abandoned',
    CANCELLED = 'cancelled'
}

/**
 * User Feedback
 */
export interface UserFeedback {
    rating: number; // 1-5
    wasHelpful: boolean;
    resolvedIssue: boolean;
    timeToResolve?: number;
    difficulty: 'easy' | 'medium' | 'hard';
    comments?: string;
    suggestedImprovements?: string[];
    timestamp: Date;
}

// ==================== Contextual Help ====================

/**
 * Contextual Help Content
 */
export interface ContextualHelpContent {
    id: string;
    title: string;
    content: string;
    type: 'explanation' | 'tutorial' | 'faq' | 'troubleshooting' | 'video' | 'article';
    format: 'text' | 'markdown' | 'html' | 'video' | 'interactive';
    relevanceScore: number; // 0-1
    tags: string[];
    searchKeywords: string[];
    relatedErrors: string[];
    lastUpdated: Date;
    viewCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    averageReadTime?: number; // in seconds
}

/**
 * Help Search Result
 */
export interface HelpSearchResult {
    content: ContextualHelpContent;
    relevanceScore: number;
    matchedKeywords: string[];
    snippet: string;
}

/**
 * Interactive Tutorial Step
 */
export interface InteractiveTutorialStep {
    id: string;
    title: string;
    instruction: string;
    targetElement?: string; // CSS selector or component ID
    highlightArea?: HighlightArea;
    action?: 'tap' | 'swipe' | 'input' | 'wait' | 'observe';
    validation?: () => boolean;
    nextStepCondition?: () => boolean;
}

/**
 * Highlight Area
 */
export interface HighlightArea {
    x: number;
    y: number;
    width: number;
    height: number;
    shape: 'rectangle' | 'circle' | 'custom';
}

// ==================== Resolution Analytics ====================

/**
 * Resolution Analytics
 */
export interface ResolutionAnalytics {
    errorId: string;
    resolutionPathId: string;
    totalAttempts: number;
    successfulAttempts: number;
    failedAttempts: number;
    abandonedAttempts: number;
    averageCompletionTime: number;
    averageSuccessRate: number;
    userSatisfactionScore: number; // 0-5
    mostCommonFailurePoints: FailurePoint[];
    improvementSuggestions: ImprovementSuggestion[];
    trendData: TrendData[];
}

/**
 * Failure Point
 */
export interface FailurePoint {
    stepId: string;
    stepTitle: string;
    failureRate: number; // 0-1
    commonErrors: string[];
    averageRetries: number;
    userFeedback: string[];
}

/**
 * Improvement Suggestion
 */
export interface ImprovementSuggestion {
    type: 'step_clarification' | 'additional_help' | 'alternative_path' | 'automation';
    priority: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    expectedImpact: number; // 0-1
    implementationEffort: 'low' | 'medium' | 'high';
}

/**
 * Trend Data
 */
export interface TrendData {
    date: Date;
    successRate: number;
    averageTime: number;
    attemptCount: number;
    satisfactionScore: number;
}

// ==================== AI-Powered Features ====================

/**
 * Natural Language Generation Config
 */
export interface NLGConfig {
    tone: 'formal' | 'casual' | 'empathetic' | 'technical';
    verbosity: 'concise' | 'detailed' | 'comprehensive';
    audienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    includeExamples: boolean;
    includeAnalogies: boolean;
    language: string;
}

/**
 * Error Pattern
 */
export interface ErrorPattern {
    id: string;
    pattern: string; // regex or pattern string
    category: CrossPlatformErrorCategory;
    commonCauses: string[];
    typicalResolutions: string[];
    frequency: number;
    lastSeen: Date;
    confidence: number; // 0-1
}

/**
 * Resolution Success Prediction
 */
export interface ResolutionSuccessPrediction {
    resolutionPathId: string;
    predictedSuccessRate: number; // 0-1
    confidence: number; // 0-1
    factors: PredictionFactor[];
    alternativeRecommendations: string[];
}

/**
 * Prediction Factor
 */
export interface PredictionFactor {
    name: string;
    impact: number; // -1 to 1
    description: string;
    weight: number; // 0-1
}

// ==================== Resolution Workflow Events ====================

/**
 * Resolution Event
 */
export type ResolutionEvent =
    | { type: 'WORKFLOW_STARTED'; workflowId: string; resolutionPathId: string }
    | { type: 'STEP_STARTED'; workflowId: string; stepId: string }
    | { type: 'STEP_COMPLETED'; workflowId: string; stepId: string; result: ResolutionStepResult }
    | { type: 'STEP_FAILED'; workflowId: string; stepId: string; error: Error }
    | { type: 'STEP_SKIPPED'; workflowId: string; stepId: string; reason: string }
    | { type: 'WORKFLOW_PAUSED'; workflowId: string }
    | { type: 'WORKFLOW_RESUMED'; workflowId: string }
    | { type: 'WORKFLOW_COMPLETED'; workflowId: string; success: boolean }
    | { type: 'WORKFLOW_CANCELLED'; workflowId: string }
    | { type: 'HELP_REQUESTED'; workflowId: string; stepId: string; helpType: string }
    | { type: 'FEEDBACK_SUBMITTED'; workflowId: string; feedback: UserFeedback };

// ==================== Configuration ====================

/**
 * Resolution System Config
 */
export interface ResolutionSystemConfig {
    enableAIRecommendations: boolean;
    enablePersonalization: boolean;
    enableAnalytics: boolean;
    enableInteractiveTutorials: boolean;
    maxConcurrentWorkflows: number;
    workflowTimeout: number; // in seconds
    autoSaveProgress: boolean;
    enableOfflineMode: boolean;
    cacheResolutionPaths: boolean;
    analyticsReportingInterval: number; // in seconds
    nlgConfig: NLGConfig;
}

/**
 * Resolution Manager Interface
 */
export interface ResolutionManager {
    // Core functionality
    generateDescription(error: CrossPlatformAppError): Promise<ContextualErrorDescription>;
    getResolutionPaths(error: CrossPlatformAppError): Promise<ResolutionPath[]>;
    getRecommendations(error: CrossPlatformAppError, userContext?: UserContext): Promise<ResolutionRecommendation[]>;

    // Workflow management
    startWorkflow(resolutionPathId: string, errorId: string): Promise<string>;
    getWorkflowState(workflowId: string): ResolutionWorkflowState | null;
    executeStep(workflowId: string, stepId: string): Promise<ResolutionStepResult>;
    pauseWorkflow(workflowId: string): void;
    resumeWorkflow(workflowId: string): void;
    cancelWorkflow(workflowId: string): void;

    // Help and guidance
    searchHelp(query: string, context?: SearchContext): Promise<HelpSearchResult[]>;
    getContextualHelp(errorId: string): Promise<ContextualHelpContent[]>;

    // Analytics and optimization
    getAnalytics(errorId: string): Promise<ResolutionAnalytics>;
    submitFeedback(workflowId: string, feedback: UserFeedback): Promise<void>;
    optimizeResolutionPath(pathId: string): Promise<ResolutionPath>;
}

/**
 * User Context
 */
export interface UserContext {
    userId?: string;
    expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    deviceCapabilities: DeviceCapabilities;
    preferences: UserPreferences;
    history: ResolutionHistory;
}

/**
 * Device Capabilities
 */
export interface DeviceCapabilities {
    platform: 'ios' | 'android' | 'web';
    osVersion: string;
    screenSize: 'small' | 'medium' | 'large';
    hasCamera: boolean;
    hasInternet: boolean;
    storage: 'low' | 'medium' | 'high';
}

/**
 * User Preferences
 */
export interface UserPreferences {
    preferredLanguage: string;
    preferredTone: 'formal' | 'casual' | 'empathetic';
    preferredVerbosity: 'concise' | 'detailed';
    enableAnimations: boolean;
    enableHaptics: boolean;
    enableAudio: boolean;
}

/**
 * Resolution History
 */
export interface ResolutionHistory {
    completedWorkflows: string[];
    successfulPaths: string[];
    failedPaths: string[];
    averageCompletionTime: number;
    preferredResolutionTypes: string[];
}

/**
 * Search Context
 */
export interface SearchContext {
    errorCategory?: CrossPlatformErrorCategory;
    userExpertiseLevel?: string;
    currentStep?: string;
    tags?: string[];
}
