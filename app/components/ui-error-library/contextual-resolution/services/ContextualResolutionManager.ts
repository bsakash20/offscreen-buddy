/**
 * Contextual Resolution Manager
 * Master service that coordinates all resolution subsystems
 */

import { CrossPlatformAppError } from '../../types/ErrorUITypes';
import {
    ResolutionManager,
    ContextualErrorDescription,
    ResolutionPath,
    ResolutionRecommendation,
    ResolutionWorkflowState,
    ResolutionStepResult,
    ContextualHelpContent,
    HelpSearchResult,
    ResolutionAnalytics,
    UserFeedback,
    UserContext,
    SearchContext,
    ResolutionSystemConfig,
} from '../types/ContextualResolutionTypes';
import { ContextualDescriptionGenerator } from './ContextualDescriptionGenerator';
import { ResolutionGuidanceEngine } from './ResolutionGuidanceEngine';
import { SmartRecommendationEngine } from './SmartRecommendationEngine';

/**
 * Contextual Resolution Manager
 * Central coordinator for all error resolution features
 */
export class ContextualResolutionManager implements ResolutionManager {
    private static instance: ContextualResolutionManager;
    private descriptionGenerator: ContextualDescriptionGenerator;
    private guidanceEngine: ResolutionGuidanceEngine;
    private recommendationEngine: SmartRecommendationEngine;
    private activeWorkflows: Map<string, ResolutionWorkflowState>;
    private helpContent: Map<string, ContextualHelpContent>;
    private analyticsData: Map<string, ResolutionAnalytics>;
    private config: ResolutionSystemConfig;

    private constructor() {
        this.descriptionGenerator = ContextualDescriptionGenerator.getInstance();
        this.guidanceEngine = ResolutionGuidanceEngine.getInstance();
        this.recommendationEngine = SmartRecommendationEngine.getInstance();
        this.activeWorkflows = new Map();
        this.helpContent = new Map();
        this.analyticsData = new Map();
        this.config = this.getDefaultConfig();
        this.initializeHelpContent();
    }

    public static getInstance(): ContextualResolutionManager {
        if (!ContextualResolutionManager.instance) {
            ContextualResolutionManager.instance = new ContextualResolutionManager();
        }
        return ContextualResolutionManager.instance;
    }

    // ==================== Core Functionality ====================

    /**
     * Generate contextual error description
     */
    public async generateDescription(error: CrossPlatformAppError): Promise<ContextualErrorDescription> {
        return await this.descriptionGenerator.generateDescription(error);
    }

    /**
     * Get resolution paths for error
     */
    public async getResolutionPaths(error: CrossPlatformAppError): Promise<ResolutionPath[]> {
        return await this.guidanceEngine.getResolutionPaths(error);
    }

    /**
     * Get personalized recommendations
     */
    public async getRecommendations(
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<ResolutionRecommendation[]> {
        if (!this.config.enableAIRecommendations) {
            // Return basic recommendations without personalization
            const paths = await this.getResolutionPaths(error);
            return paths.map(path => ({
                resolutionPathId: path.id,
                confidence: path.successRate,
                reasoning: `This solution has a ${(path.successRate * 100).toFixed(0)}% success rate`,
                estimatedSuccessRate: path.successRate,
                estimatedTime: path.averageCompletionTime,
                userEffort: 'moderate',
                priority: path.priority,
                personalizedFactors: [],
                alternatives: [],
            }));
        }

        return await this.recommendationEngine.getRecommendations(error, userContext);
    }

    // ==================== Workflow Management ====================

    /**
     * Start resolution workflow
     */
    public async startWorkflow(resolutionPathId: string, errorId: string): Promise<string> {
        const path = this.guidanceEngine.getResolutionPath(resolutionPathId);
        if (!path) {
            throw new Error(`Resolution path ${resolutionPathId} not found`);
        }

        const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const workflowState: ResolutionWorkflowState = {
            workflowId,
            errorId,
            resolutionPathId,
            currentStepId: path.steps[0]?.id || '',
            currentStepIndex: 0,
            totalSteps: path.steps.length,
            completedSteps: [],
            failedSteps: [],
            skippedSteps: [],
            progress: 0,
            status: 'in_progress' as any,
            startTime: new Date(),
            stepResults: new Map(),
        };

        this.activeWorkflows.set(workflowId, workflowState);
        return workflowId;
    }

    /**
     * Get workflow state
     */
    public getWorkflowState(workflowId: string): ResolutionWorkflowState | null {
        return this.activeWorkflows.get(workflowId) || null;
    }

    /**
     * Execute workflow step
     */
    public async executeStep(workflowId: string, stepId: string): Promise<ResolutionStepResult> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        const path = this.guidanceEngine.getResolutionPath(workflow.resolutionPathId);
        if (!path) {
            throw new Error(`Resolution path ${workflow.resolutionPathId} not found`);
        }

        const step = path.steps.find(s => s.id === stepId);
        if (!step) {
            throw new Error(`Step ${stepId} not found`);
        }

        const result = await this.guidanceEngine.executeStep(step);

        // Update workflow state
        workflow.stepResults.set(stepId, result);
        if (result.success) {
            workflow.completedSteps.push(stepId);
        } else {
            workflow.failedSteps.push(stepId);
        }
        workflow.progress = (workflow.completedSteps.length / workflow.totalSteps) * 100;

        this.activeWorkflows.set(workflowId, workflow);

        return result;
    }

    /**
     * Pause workflow
     */
    public pauseWorkflow(workflowId: string): void {
        const workflow = this.activeWorkflows.get(workflowId);
        if (workflow) {
            workflow.status = 'paused' as any;
            this.activeWorkflows.set(workflowId, workflow);
        }
    }

    /**
     * Resume workflow
     */
    public resumeWorkflow(workflowId: string): void {
        const workflow = this.activeWorkflows.get(workflowId);
        if (workflow) {
            workflow.status = 'in_progress' as any;
            this.activeWorkflows.set(workflowId, workflow);
        }
    }

    /**
     * Cancel workflow
     */
    public cancelWorkflow(workflowId: string): void {
        const workflow = this.activeWorkflows.get(workflowId);
        if (workflow) {
            workflow.status = 'cancelled' as any;
            workflow.endTime = new Date();
            this.activeWorkflows.set(workflowId, workflow);
        }
    }

    // ==================== Help and Guidance ====================

    /**
     * Search help content
     */
    public async searchHelp(query: string, context?: SearchContext): Promise<HelpSearchResult[]> {
        const results: HelpSearchResult[] = [];
        const queryLower = query.toLowerCase();

        for (const content of this.helpContent.values()) {
            // Simple keyword matching (can be enhanced with NLP)
            const titleMatch = content.title.toLowerCase().includes(queryLower);
            const contentMatch = content.content.toLowerCase().includes(queryLower);
            const keywordMatch = content.searchKeywords.some(k => k.toLowerCase().includes(queryLower));

            if (titleMatch || contentMatch || keywordMatch) {
                const relevanceScore = this.calculateRelevance(content, query, context);

                results.push({
                    content,
                    relevanceScore,
                    matchedKeywords: content.searchKeywords.filter(k =>
                        k.toLowerCase().includes(queryLower)
                    ),
                    snippet: this.generateSnippet(content.content, query),
                });
            }
        }

        // Sort by relevance
        return results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    /**
     * Get contextual help for error
     */
    public async getContextualHelp(errorId: string): Promise<ContextualHelpContent[]> {
        const helpItems: ContextualHelpContent[] = [];

        for (const content of this.helpContent.values()) {
            if (content.relatedErrors.includes(errorId)) {
                helpItems.push(content);
            }
        }

        return helpItems.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // ==================== Analytics and Optimization ====================

    /**
     * Get resolution analytics
     */
    public async getAnalytics(errorId: string): Promise<ResolutionAnalytics> {
        const existing = this.analyticsData.get(errorId);
        if (existing) {
            return existing;
        }

        // Create default analytics
        const analytics: ResolutionAnalytics = {
            errorId,
            resolutionPathId: '',
            totalAttempts: 0,
            successfulAttempts: 0,
            failedAttempts: 0,
            abandonedAttempts: 0,
            averageCompletionTime: 0,
            averageSuccessRate: 0,
            userSatisfactionScore: 0,
            mostCommonFailurePoints: [],
            improvementSuggestions: [],
            trendData: [],
        };

        this.analyticsData.set(errorId, analytics);
        return analytics;
    }

    /**
     * Submit user feedback
     */
    public async submitFeedback(workflowId: string, feedback: UserFeedback): Promise<void> {
        const workflow = this.activeWorkflows.get(workflowId);
        if (!workflow) {
            throw new Error(`Workflow ${workflowId} not found`);
        }

        // Store feedback
        workflow.userFeedback = feedback;
        this.activeWorkflows.set(workflowId, workflow);

        // Update analytics
        await this.updateAnalyticsFromFeedback(workflow, feedback);

        // Learn from outcome if enabled
        if (this.config.enablePersonalization && workflow.errorId) {
            await this.recommendationEngine.learnFromOutcome(
                'anonymous', // Would use actual userId in production
                workflow.resolutionPathId,
                { id: workflow.errorId } as any,
                feedback.resolvedIssue,
                feedback.timeToResolve || 0
            );
        }
    }

    /**
     * Optimize resolution path
     */
    public async optimizeResolutionPath(pathId: string): Promise<ResolutionPath> {
        const path = this.guidanceEngine.getResolutionPath(pathId);
        if (!path) {
            throw new Error(`Resolution path ${pathId} not found`);
        }

        // Analyze performance and suggest optimizations
        // This is a simplified version - production would use ML
        const analytics = await this.getAnalytics(pathId);

        if (analytics.averageSuccessRate < 0.7) {
            // Low success rate - needs improvement
            console.log(`Path ${pathId} has low success rate: ${analytics.averageSuccessRate}`);
        }

        return path;
    }

    // ==================== Configuration ====================

    /**
     * Update system configuration
     */
    public updateConfig(config: Partial<ResolutionSystemConfig>): void {
        this.config = { ...this.config, ...config };

        // Update sub-systems
        if (config.nlgConfig) {
            this.descriptionGenerator.updateConfig(config.nlgConfig);
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): ResolutionSystemConfig {
        return { ...this.config };
    }

    // ==================== Private Methods ====================

    private calculateRelevance(
        content: ContextualHelpContent,
        query: string,
        context?: SearchContext
    ): number {
        let score = content.relevanceScore;

        // Boost if title matches
        if (content.title.toLowerCase().includes(query.toLowerCase())) {
            score += 0.2;
        }

        // Boost if category matches context
        if (context?.errorCategory && content.tags.includes(context.errorCategory)) {
            score += 0.15;
        }

        // Boost based on helpfulness
        if (content.helpfulCount > content.notHelpfulCount) {
            score += 0.1;
        }

        return Math.min(1, score);
    }

    private generateSnippet(content: string, query: string, length: number = 150): string {
        const queryIndex = content.toLowerCase().indexOf(query.toLowerCase());
        if (queryIndex === -1) {
            return content.substring(0, length) + '...';
        }

        const start = Math.max(0, queryIndex - 50);
        const end = Math.min(content.length, queryIndex + query.length + 100);

        return (start > 0 ? '...' : '') + content.substring(start, end) + (end < content.length ? '...' : '');
    }

    private async updateAnalyticsFromFeedback(
        workflow: ResolutionWorkflowState,
        feedback: UserFeedback
    ): Promise<void> {
        const analytics = await this.getAnalytics(workflow.errorId);

        analytics.totalAttempts++;
        if (feedback.resolvedIssue) {
            analytics.successfulAttempts++;
        } else {
            analytics.failedAttempts++;
        }

        analytics.averageSuccessRate = analytics.successfulAttempts / analytics.totalAttempts;
        analytics.userSatisfactionScore =
            (analytics.userSatisfactionScore * (analytics.totalAttempts - 1) + feedback.rating) /
            analytics.totalAttempts;

        if (feedback.timeToResolve) {
            analytics.averageCompletionTime =
                (analytics.averageCompletionTime * (analytics.totalAttempts - 1) + feedback.timeToResolve) /
                analytics.totalAttempts;
        }

        this.analyticsData.set(workflow.errorId, analytics);
    }

    private getDefaultConfig(): ResolutionSystemConfig {
        return {
            enableAIRecommendations: true,
            enablePersonalization: true,
            enableAnalytics: true,
            enableInteractiveTutorials: true,
            maxConcurrentWorkflows: 5,
            workflowTimeout: 1800, // 30 minutes
            autoSaveProgress: true,
            enableOfflineMode: false,
            cacheResolutionPaths: true,
            analyticsReportingInterval: 300, // 5 minutes
            nlgConfig: {
                tone: 'empathetic',
                verbosity: 'detailed',
                audienceLevel: 'intermediate',
                includeExamples: true,
                includeAnalogies: false,
                language: 'en',
            },
        };
    }

    private initializeHelpContent(): void {
        // Network help
        this.helpContent.set('help_network_001', {
            id: 'help_network_001',
            title: 'Troubleshooting Network Connection Issues',
            content: 'If you\'re experiencing network connection issues, try these steps: 1. Check if other apps can connect to the internet. 2. Toggle airplane mode on and off. 3. Restart your WiFi router. 4. Check if you have a stable internet connection.',
            type: 'troubleshooting',
            format: 'text',
            relevanceScore: 0.9,
            tags: ['network', 'connectivity', 'troubleshooting'],
            searchKeywords: ['network', 'internet', 'connection', 'offline', 'wifi'],
            relatedErrors: ['NET-OFFLINE-001', 'NET-TIMEOUT-001'],
            lastUpdated: new Date(),
            viewCount: 0,
            helpfulCount: 0,
            notHelpfulCount: 0,
        });

        // Authentication help
        this.helpContent.set('help_auth_001', {
            id: 'help_auth_001',
            title: 'Reset Your Password',
            content: 'To reset your password: 1. Click "Forgot Password" on the login screen. 2. Enter your email address. 3. Check your email for a reset link. 4. Follow the link and create a new password. 5. Try logging in with your new password.',
            type: 'tutorial',
            format: 'text',
            relevanceScore: 0.85,
            tags: ['authentication', 'password', 'login'],
            searchKeywords: ['password', 'reset', 'forgot', 'login', 'authentication'],
            relatedErrors: ['AUTH-CRED-001', 'AUTH-TOKEN-001'],
            lastUpdated: new Date(),
            viewCount: 0,
            helpfulCount: 0,
            notHelpfulCount: 0,
        });

        // Payment help
        this.helpContent.set('help_payment_001', {
            id: 'help_payment_001',
            title: 'Why Was My Payment Declined?',
            content: 'Payments can be declined for several reasons: 1. Insufficient funds in your account. 2. Incorrect card details (number, CVV, or expiration date). 3. Card expired. 4. Bank security restrictions. 5. Billing address mismatch. Try verifying your payment details or using a different payment method.',
            type: 'faq',
            format: 'text',
            relevanceScore: 0.88,
            tags: ['payment', 'card', 'transaction'],
            searchKeywords: ['payment', 'declined', 'card', 'transaction', 'billing'],
            relatedErrors: ['PAY-DECLINED-001', 'PAY-FAILED-001'],
            lastUpdated: new Date(),
            viewCount: 0,
            helpfulCount: 0,
            notHelpfulCount: 0,
        });
    }

    /**
     * Clear all caches
     */
    public clearCaches(): void {
        this.descriptionGenerator.clearCache();
        this.guidanceEngine.clearCache();
    }
}

// Export singleton instance
export default ContextualResolutionManager.getInstance();