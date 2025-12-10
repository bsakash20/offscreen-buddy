/**
 * Progressive Error Disclosure Types
 * Comprehensive type definitions for layered error presentation system
 */

import { CrossPlatformAppError, AccessibilityConfig } from '../../types/ErrorUITypes';

// Progressive Disclosure Levels
export enum DisclosureLevel {
    SUMMARY = 'summary',           // User-friendly overview
    DETAILS = 'details',           // Context and resolution steps
    TECHNICAL = 'technical',       // Debugging information
    DEBUG = 'debug'                // Full technical details
}

// User Expertise Levels
export enum UserExpertiseLevel {
    BASIC = 'basic',               // Casual users
    INTERMEDIATE = 'intermediate', // Power users
    ADVANCED = 'advanced',         // Technical users
    EXPERT = 'expert'             // Developers/Support agents
}

// Disclosure Context
export interface DisclosureContext {
    userExpertise: UserExpertiseLevel;
    interactionHistory: DisclosureInteraction[];
    currentError: CrossPlatformAppError;
    applicationState: ApplicationStateContext;
    accessibilityPreferences: AccessibilityPreferences;
    disclosurePreferences: DisclosurePreferences;
}

// User Interaction History
export interface DisclosureInteraction {
    timestamp: Date;
    level: DisclosureLevel;
    action: 'expand' | 'collapse' | 'view_detail' | 'view_technical' | 'view_debug';
    duration: number;
    outcome: 'helpful' | 'not_helpful' | 'abandoned';
}

// Application State Context
export interface ApplicationStateContext {
    currentScreen: string;
    featureInUse: string;
    userJourneyStage: 'start' | 'progress' | 'complete' | 'error';
    retryCount: number;
    lastSuccessfulAction?: Date;
}

// User Preferences
export interface DisclosurePreferences {
    autoExpand: boolean;
    expandThreshold: number; // Number of clicks to auto-expand
    defaultLevel: DisclosureLevel;
    respectExpertise: boolean;
    progressiveDisclose: boolean;
    showTechnicalByDefault: boolean;
    animationSpeed: 'fast' | 'normal' | 'slow' | 'none';
    compactMode: boolean;
}

// Accessibility Preferences
export interface AccessibilityPreferences {
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    voiceOver: boolean;
    switchControl: boolean;
    keyboardNavigation: boolean;
}

// Error Content Structure
export interface ErrorContent {
    summary: ErrorSummary;
    details: ErrorDetails;
    technical: ErrorTechnical;
    debug: ErrorDebug;
    contextualHelp?: ContextualHelp[];
    relatedErrors?: RelatedError[];
    resolutionPaths?: ResolutionPath[];
}

// User-friendly Summary
export interface ErrorSummary {
    title: string;
    description: string;
    impact: string;
    immediateAction?: string;
    estimatedTimeToResolve?: string;
    severityIndicator: SeverityIndicator;
    emotionTone: 'concerned' | 'helpful' | 'neutral' | 'apologetic';
}

// Detailed Information
export interface ErrorDetails {
    whatHappened: string;
    whyItHappened: string;
    whatYouCanDo: ActionStep[];
    preventionTips: string[];
    relatedFeatures: string[];
    nextBestActions: NextBestAction[];
}

// Technical Information
export interface ErrorTechnical {
    errorCode: string;
    category: string;
    platformDetails: PlatformDetails;
    systemRequirements: SystemRequirement[];
    technicalContext: TechnicalContext;
    logEntries: LogEntry[];
    stackTrace?: StackTraceEntry[];
}

// Debug Information
export interface ErrorDebug {
    fullStackTrace: StackTraceEntry[];
    variables: VariableDump;
    systemState: SystemState;
    networkRequests: NetworkRequest[];
    performanceMetrics: PerformanceMetric[];
    environmentDetails: EnvironmentDetails;
}

// Supporting Content
export interface ActionStep {
    id: string;
    title: string;
    description: string;
    action: () => void;
    estimatedTime: string;
    difficulty: 'easy' | 'medium' | 'hard';
    prerequisites?: string[];
}

export interface NextBestAction {
    action: string;
    probability: number; // 0-1
    impact: 'low' | 'medium' | 'high';
    effort: 'low' | 'medium' | 'high';
    description: string;
}

export interface SeverityIndicator {
    level: 'low' | 'medium' | 'high' | 'critical';
    color: string;
    icon: string;
    announcement: string;
}

export interface PlatformDetails {
    platform: string;
    osVersion: string;
    appVersion: string;
    deviceInfo: string;
    networkStatus: string;
}

export interface SystemRequirement {
    name: string;
    current: string;
    required: string;
    status: 'met' | 'partial' | 'unmet';
}

export interface TechnicalContext {
    component: string;
    method: string;
    lineNumber?: number;
    fileName?: string;
    module: string;
}

export interface LogEntry {
    timestamp: Date;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    source: string;
    metadata?: Record<string, any>;
}

export interface StackTraceEntry {
    function: string;
    file: string;
    line: number;
    column: number;
    native?: boolean;
}

export interface VariableDump {
    [key: string]: {
        value: any;
        type: string;
        description?: string;
    };
}

export interface SystemState {
    memory: MemoryInfo;
    performance: PerformanceInfo;
    storage: StorageInfo;
    network: NetworkInfo;
}

export interface NetworkRequest {
    url: string;
    method: string;
    status: number;
    duration: number;
    headers?: Record<string, string>;
    response?: string;
}

export interface PerformanceMetric {
    name: string;
    value: number;
    unit: string;
    threshold: number;
    status: 'normal' | 'warning' | 'critical';
}

export interface EnvironmentDetails {
    buildType: string;
    environment: string;
    featureFlags: Record<string, boolean>;
    configuration: Record<string, any>;
}

// Progressive Disclosure State
export interface ProgressiveDisclosureState {
    currentLevel: DisclosureLevel;
    expandedSections: Set<string>;
    interactionHistory: DisclosureInteraction[];
    userEngagement: UserEngagementMetrics;
    adaptiveBehavior: AdaptiveBehavior;
}

// User Engagement Metrics
export interface UserEngagementMetrics {
    totalDisclosures: number;
    averageTimePerLevel: Record<DisclosureLevel, number>;
    abandonmentRate: Record<DisclosureLevel, number>;
    mostViewedLevel: DisclosureLevel;
    helpfulnessRating: number;
}

// Adaptive Behavior
export interface AdaptiveBehavior {
    autoExpandThreshold: number;
    skipIntermediateLevels: boolean;
    contextualRecommendations: boolean;
    personalizedContent: boolean;
}

// Contextual Help
export interface ContextualHelp {
    id: string;
    title: string;
    content: string;
    type: 'explanation' | 'guide' | 'troubleshooting' | 'faq';
    relevanceScore: number;
    url?: string;
}

// Related Errors
export interface RelatedError {
    error: CrossPlatformAppError;
    relationship: 'same_cause' | 'same_component' | 'same_user_action' | 'sequence';
    confidence: number; // 0-1
}

// Resolution Paths
export interface ResolutionPath {
    id: string;
    title: string;
    description: string;
    steps: ActionStep[];
    successRate: number;
    estimatedTime: string;
    difficulty: 'easy' | 'medium' | 'hard';
    prerequisites: string[];
}

// Disclosure Animation Config
export interface DisclosureAnimationConfig {
    expandDuration: number;
    collapseDuration: number;
    staggerDelay: number;
    easing: string;
    springConfig?: {
        damping: number;
        stiffness: number;
        mass: number;
    };
}

// Progressive Disclosure Component Props
export interface ProgressiveDisclosureProps {
    error: CrossPlatformAppError;
    initialLevel?: DisclosureLevel;
    onLevelChange?: (level: DisclosureLevel) => void;
    onAction?: (action: string, data?: any) => void;
    animationConfig?: DisclosureAnimationConfig;
    accessibilityConfig?: AccessibilityConfig;
    context?: Partial<DisclosureContext>;
    adaptiveBehavior?: boolean;
    showProgress?: boolean;
    compactMode?: boolean;
}

// Disclosure Manager Interface
export interface DisclosureManager {
    // Core functionality
    showProgressiveError(error: CrossPlatformAppError, context?: Partial<DisclosureContext>): string;
    updateDisclosureLevel(id: string, level: DisclosureLevel): void;
    recordInteraction(id: string, interaction: DisclosureInteraction): void;
    getUserEngagement(id: string): UserEngagementMetrics;

    // Adaptive behavior
    adaptDisclosure(id: string, userBehavior: DisclosureInteraction[]): DisclosureLevel;
    getPersonalizedContent(id: string, userProfile: UserExpertiseLevel): ErrorContent;
    optimizeForAccessibility(id: string, preferences: AccessibilityPreferences): AccessibilityConfig;

    // Content management
    generateContent(error: CrossPlatformAppError, level: DisclosureLevel): Promise<ErrorContent>;
    getRelatedErrors(error: CrossPlatformAppError): RelatedError[];
    getResolutionPaths(error: CrossPlatformAppError): ResolutionPath[];

    // State management
    getDisclosureState(id: string): ProgressiveDisclosureState;
    clearDisclosure(id: string): void;
    clearAllDisclosures(): void;
}

// Memory Information
export interface MemoryInfo {
    used: number;
    available: number;
    percentage: number;
    breakdown: {
        app: number;
        system: number;
        cache: number;
    };
}

// Performance Information
export interface PerformanceInfo {
    cpuUsage: number;
    memoryPressure: 'normal' | 'warning' | 'critical';
    batteryLevel?: number;
    thermalState?: 'nominal' | 'fair' | 'serious' | 'critical';
}

// Storage Information
export interface StorageInfo {
    available: number;
    used: number;
    total: number;
    categories: {
        app: number;
        documents: number;
        cache: number;
        temporary: number;
    };
}

// Network Information
export interface NetworkInfo {
    type: 'wifi' | 'cellular' | 'offline';
    strength: number; // 0-100
    latency?: number;
    bandwidth?: number;
}

// Support Types
export type DisclosureCallback = (level: DisclosureLevel, error: CrossPlatformAppError) => void;
export type DisclosureEvent =
    | { type: 'EXPAND'; level: DisclosureLevel; errorId: string }
    | { type: 'COLLAPSE'; level: DisclosureLevel; errorId: string }
    | { type: 'ACTION'; action: string; data?: any; errorId: string }
    | { type: 'PROGRESS'; progress: number; errorId: string }
    | { type: 'COMPLETE'; errorId: string; success: boolean };

// Export utility types
export type DisclosureTheme = 'light' | 'dark' | 'auto' | 'high-contrast';
export type DisclosureDensity = 'compact' | 'comfortable' | 'spacious';
export type DisclosureAnimation = 'none' | 'subtle' | 'standard' | 'enhanced';