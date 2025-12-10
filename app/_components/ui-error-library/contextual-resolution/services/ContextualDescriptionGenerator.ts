/**
 * Contextual Description Generator
 * Generates natural language error descriptions with context-aware explanations
 */

import { CrossPlatformAppError, CrossPlatformErrorCategory } from '../../types/ErrorUITypes';
import {
    ContextualErrorDescription,
    ImpactAssessment,
    ContextualFactor,
    NLGConfig,
} from '../types/ContextualResolutionTypes';

/**
 * Contextual Description Generator Service
 * Implements intelligent error description generation with NLP
 */
export class ContextualDescriptionGenerator {
    private static instance: ContextualDescriptionGenerator;
    private nlgConfig: NLGConfig;
    private descriptionCache: Map<string, ContextualErrorDescription>;
    private templateLibrary: Map<string, DescriptionTemplate>;

    private constructor() {
        this.nlgConfig = this.getDefaultNLGConfig();
        this.descriptionCache = new Map();
        this.templateLibrary = this.initializeTemplateLibrary();
    }

    public static getInstance(): ContextualDescriptionGenerator {
        if (!ContextualDescriptionGenerator.instance) {
            ContextualDescriptionGenerator.instance = new ContextualDescriptionGenerator();
        }
        return ContextualDescriptionGenerator.instance;
    }

    /**
     * Generate contextual error description
     */
    public async generateDescription(
        error: CrossPlatformAppError,
        config?: Partial<NLGConfig>
    ): Promise<ContextualErrorDescription> {
        // Check cache first
        const cacheKey = this.getCacheKey(error);
        if (this.descriptionCache.has(cacheKey)) {
            return this.descriptionCache.get(cacheKey)!;
        }

        // Merge config
        const effectiveConfig = { ...this.nlgConfig, ...config };

        // Generate description
        const description = await this.generateDescriptionInternal(error, effectiveConfig);

        // Cache the result
        this.descriptionCache.set(cacheKey, description);

        return description;
    }

    /**
     * Internal description generation logic
     */
    private async generateDescriptionInternal(
        error: CrossPlatformAppError,
        config: NLGConfig
    ): Promise<ContextualErrorDescription> {
        const template = this.selectTemplate(error);
        const contextualFactors = this.extractContextualFactors(error);
        const impactAssessment = this.assessImpact(error);

        return {
            errorId: error.id,
            naturalLanguageDescription: this.generateNaturalLanguageDescription(error, template, config),
            technicalDescription: this.generateTechnicalDescription(error),
            userFriendlyTitle: this.generateUserFriendlyTitle(error, config),
            userFriendlyMessage: this.generateUserFriendlyMessage(error, config),
            causeExplanation: this.generateCauseExplanation(error, template, config),
            impactAssessment,
            contextualFactors,
            relatedConcepts: this.extractRelatedConcepts(error),
            preventionTips: this.generatePreventionTips(error, config),
            generatedAt: new Date(),
            confidence: this.calculateConfidence(error, template),
        };
    }

    /**
     * Generate natural language description
     */
    private generateNaturalLanguageDescription(
        error: CrossPlatformAppError,
        template: DescriptionTemplate,
        config: NLGConfig
    ): string {
        const parts: string[] = [];

        // Introduction based on tone
        const intro = this.generateIntroduction(error, config.tone);
        if (intro) parts.push(intro);

        // Main description
        const mainDesc = this.interpolateTemplate(template.naturalLanguage, error);
        parts.push(mainDesc);

        // Add examples if requested
        if (config.includeExamples && template.examples) {
            parts.push(`\n\nFor example: ${template.examples[0]}`);
        }

        // Add analogies if requested
        if (config.includeAnalogies && template.analogy) {
            parts.push(`\n\nThink of it like this: ${template.analogy}`);
        }

        return parts.join(' ');
    }

    /**
     * Generate user-friendly title
     */
    private generateUserFriendlyTitle(error: CrossPlatformAppError, config: NLGConfig): string {
        const titleMap: Record<CrossPlatformErrorCategory, string> = {
            [CrossPlatformErrorCategory.NETWORK]: 'Connection Issue',
            [CrossPlatformErrorCategory.AUTHENTICATION]: 'Sign-In Problem',
            [CrossPlatformErrorCategory.VALIDATION]: 'Invalid Input',
            [CrossPlatformErrorCategory.SYSTEM]: 'System Error',
            [CrossPlatformErrorCategory.PAYMENT]: 'Payment Failed',
            [CrossPlatformErrorCategory.STORAGE]: 'Storage Problem',
            [CrossPlatformErrorCategory.NAVIGATION]: 'Navigation Error',
            [CrossPlatformErrorCategory.BUSINESS_LOGIC]: 'Operation Failed',
            [CrossPlatformErrorCategory.CRASH]: 'App Crash',
            [CrossPlatformErrorCategory.PERFORMANCE]: 'Performance Issue',
        };

        let title = titleMap[error.category] || 'Error Occurred';

        // Adjust based on severity
        if (error.severity === 'critical') {
            title = `Critical ${title}`;
        } else if (error.severity === 'high') {
            title = `Important: ${title}`;
        }

        return title;
    }

    /**
     * Generate user-friendly message
     */
    private generateUserFriendlyMessage(error: CrossPlatformAppError, config: NLGConfig): string {
        const template = this.selectTemplate(error);
        let message = this.interpolateTemplate(template.userFriendly, error);

        // Adjust verbosity
        if (config.verbosity === 'concise') {
            message = this.makeConcise(message);
        } else if (config.verbosity === 'comprehensive') {
            message = this.makeComprehensive(message, error);
        }

        // Adjust tone
        message = this.adjustTone(message, config.tone);

        return message;
    }

    /**
     * Generate cause explanation
     */
    private generateCauseExplanation(
        error: CrossPlatformAppError,
        template: DescriptionTemplate,
        config: NLGConfig
    ): string {
        const causes: string[] = [];

        // Primary cause
        const primaryCause = this.interpolateTemplate(template.cause, error);
        causes.push(primaryCause);

        // Contributing factors
        if (config.verbosity !== 'concise') {
            const contributingFactors = this.identifyContributingFactors(error);
            if (contributingFactors.length > 0) {
                causes.push(`\n\nContributing factors: ${contributingFactors.join(', ')}`);
            }
        }

        return causes.join('');
    }

    /**
     * Generate technical description
     */
    private generateTechnicalDescription(error: CrossPlatformAppError): string {
        const parts: string[] = [];

        parts.push(`Error Code: ${error.code}`);
        parts.push(`Category: ${error.category}`);
        parts.push(`Subcategory: ${error.subcategory}`);
        parts.push(`Severity: ${error.severity}`);
        parts.push(`User Impact: ${error.userImpact}`);
        parts.push(`Timestamp: ${error.timestamp.toISOString()}`);

        if (error.platformContext) {
            parts.push(`Platform: ${error.platformContext.platform}`);
            parts.push(`App State: ${error.platformContext.appState}`);
        }

        parts.push(`\nTechnical Message: ${error.message}`);

        return parts.join('\n');
    }

    /**
     * Assess impact of error
     */
    private assessImpact(error: CrossPlatformAppError): ImpactAssessment {
        return {
            userImpact: error.userImpact,
            affectedFeatures: this.identifyAffectedFeatures(error),
            estimatedDowntime: this.estimateDowntime(error),
            dataLossRisk: this.assessDataLossRisk(error),
            securityRisk: this.assessSecurityRisk(error),
            businessImpact: this.assessBusinessImpact(error),
            affectedUsers: this.estimateAffectedUsers(error),
        };
    }

    /**
     * Extract contextual factors
     */
    private extractContextualFactors(error: CrossPlatformAppError): ContextualFactor[] {
        const factors: ContextualFactor[] = [];

        // Device factors
        if (error.platformContext?.deviceInfo) {
            factors.push({
                type: 'device',
                name: 'Platform',
                value: error.platformContext.platform,
                relevance: 'high',
                description: `Running on ${error.platformContext.platform}`,
            });

            factors.push({
                type: 'device',
                name: 'Network Type',
                value: error.platformContext.deviceInfo.networkType,
                relevance: error.category === CrossPlatformErrorCategory.NETWORK ? 'high' : 'medium',
                description: `Connected via ${error.platformContext.deviceInfo.networkType}`,
            });

            if (error.platformContext.deviceInfo.memoryPressure !== 'normal') {
                factors.push({
                    type: 'device',
                    name: 'Memory Pressure',
                    value: error.platformContext.deviceInfo.memoryPressure,
                    relevance: 'high',
                    description: `Device memory pressure is ${error.platformContext.deviceInfo.memoryPressure}`,
                });
            }
        }

        // App state factors
        if (error.platformContext?.appState) {
            factors.push({
                type: 'app_state',
                name: 'App State',
                value: error.platformContext.appState,
                relevance: 'medium',
                description: `App was ${error.platformContext.appState} when error occurred`,
            });
        }

        return factors;
    }

    /**
     * Extract related concepts
     */
    private extractRelatedConcepts(error: CrossPlatformAppError): string[] {
        const concepts: string[] = [];

        // Category-based concepts
        const categoryConceptsMap: Record<CrossPlatformErrorCategory, string[]> = {
            [CrossPlatformErrorCategory.NETWORK]: ['connectivity', 'internet', 'offline mode', 'retry'],
            [CrossPlatformErrorCategory.AUTHENTICATION]: ['login', 'credentials', 'session', 'security'],
            [CrossPlatformErrorCategory.VALIDATION]: ['form validation', 'input rules', 'data format'],
            [CrossPlatformErrorCategory.SYSTEM]: ['permissions', 'resources', 'compatibility'],
            [CrossPlatformErrorCategory.PAYMENT]: ['transactions', 'billing', 'payment methods'],
            [CrossPlatformErrorCategory.STORAGE]: ['disk space', 'cache', 'data persistence'],
            [CrossPlatformErrorCategory.NAVIGATION]: ['routing', 'screen flow', 'deep links'],
            [CrossPlatformErrorCategory.BUSINESS_LOGIC]: ['workflows', 'business rules', 'operations'],
            [CrossPlatformErrorCategory.CRASH]: ['stability', 'recovery', 'app restart'],
            [CrossPlatformErrorCategory.PERFORMANCE]: ['optimization', 'speed', 'responsiveness'],
        };

        concepts.push(...(categoryConceptsMap[error.category] || []));

        return concepts;
    }

    /**
     * Generate prevention tips
     */
    private generatePreventionTips(error: CrossPlatformAppError, config: NLGConfig): string[] {
        const tips: string[] = [];

        // Category-specific tips
        switch (error.category) {
            case CrossPlatformErrorCategory.NETWORK:
                tips.push('Ensure stable internet connection');
                tips.push('Try switching between WiFi and mobile data');
                tips.push('Check if other apps can connect to the internet');
                break;

            case CrossPlatformErrorCategory.AUTHENTICATION:
                tips.push('Double-check your username and password');
                tips.push('Ensure your account is active');
                tips.push('Try resetting your password if needed');
                break;

            case CrossPlatformErrorCategory.VALIDATION:
                tips.push('Review all required fields');
                tips.push('Check for proper formatting (email, phone, etc.)');
                tips.push('Look for any validation error messages');
                break;

            case CrossPlatformErrorCategory.PAYMENT:
                tips.push('Verify your payment details are correct');
                tips.push('Ensure sufficient funds are available');
                tips.push('Check if your card is active and not expired');
                break;

            case CrossPlatformErrorCategory.STORAGE:
                tips.push('Free up device storage space');
                tips.push('Clear app cache if possible');
                tips.push('Remove unused files or apps');
                break;

            default:
                tips.push('Restart the app and try again');
                tips.push('Check for app updates');
                tips.push('Contact support if the issue persists');
        }

        // Limit tips based on verbosity
        if (config.verbosity === 'concise') {
            return tips.slice(0, 2);
        } else if (config.verbosity === 'detailed') {
            return tips.slice(0, 4);
        }

        return tips;
    }

    // ==================== Helper Methods ====================

    private selectTemplate(error: CrossPlatformAppError): DescriptionTemplate {
        const key = `${error.category}_${error.subcategory}`;
        return this.templateLibrary.get(key) || this.getDefaultTemplate(error.category);
    }

    private interpolateTemplate(template: string, error: CrossPlatformAppError): string {
        return template
            .replace(/\{category\}/g, error.category)
            .replace(/\{subcategory\}/g, error.subcategory)
            .replace(/\{severity\}/g, error.severity)
            .replace(/\{code\}/g, error.code)
            .replace(/\{message\}/g, error.message);
    }

    private generateIntroduction(error: CrossPlatformAppError, tone: string): string {
        const introMap: Record<string, string> = {
            formal: 'An error has occurred in the application.',
            casual: "Oops! Something didn't go as planned.",
            empathetic: "We're sorry, but something went wrong.",
            technical: 'System error detected.',
        };
        return introMap[tone] || '';
    }

    private makeConcise(message: string): string {
        // Remove redundant phrases and keep only essential information
        return message
            .split('. ')
            .slice(0, 2)
            .join('. ') + '.';
    }

    private makeComprehensive(message: string, error: CrossPlatformAppError): string {
        // Add additional context and details
        return `${message}\n\nThis ${error.severity} severity error occurred in the ${error.category} category. ${error.retryable ? 'You can try again.' : 'This requires manual intervention.'}`;
    }

    private adjustTone(message: string, tone: string): string {
        // Adjust message tone based on configuration
        switch (tone) {
            case 'empathetic':
                return message.replace(/error/gi, 'issue').replace(/failed/gi, "didn't work");
            case 'technical':
                return message; // Keep technical as-is
            case 'casual':
                return message.replace(/Please/g, 'Just').replace(/cannot/g, "can't");
            default:
                return message;
        }
    }

    private identifyContributingFactors(error: CrossPlatformAppError): string[] {
        const factors: string[] = [];

        if (error.platformContext?.deviceInfo.networkType === 'offline') {
            factors.push('device is offline');
        }

        if (error.platformContext?.deviceInfo.memoryPressure === 'critical') {
            factors.push('low device memory');
        }

        if (error.platformContext?.appState === 'background') {
            factors.push('app was in background');
        }

        return factors;
    }

    private identifyAffectedFeatures(error: CrossPlatformAppError): string[] {
        // Identify which app features are affected by this error
        const features: string[] = [];

        switch (error.category) {
            case CrossPlatformErrorCategory.NETWORK:
                features.push('online features', 'data sync', 'real-time updates');
                break;
            case CrossPlatformErrorCategory.AUTHENTICATION:
                features.push('user login', 'profile access', 'secure features');
                break;
            case CrossPlatformErrorCategory.PAYMENT:
                features.push('checkout', 'subscriptions', 'purchases');
                break;
            case CrossPlatformErrorCategory.STORAGE:
                features.push('data saving', 'file uploads', 'cache');
                break;
        }

        return features;
    }

    private estimateDowntime(error: CrossPlatformAppError): number | undefined {
        // Estimate downtime in seconds based on error type
        if (error.category === CrossPlatformErrorCategory.NETWORK && error.retryable) {
            return 30; // 30 seconds
        }
        if (error.severity === 'critical') {
            return 300; // 5 minutes
        }
        return undefined;
    }

    private assessDataLossRisk(error: CrossPlatformAppError): 'none' | 'low' | 'medium' | 'high' {
        if (error.category === CrossPlatformErrorCategory.STORAGE) {
            return error.severity === 'critical' ? 'high' : 'medium';
        }
        if (error.category === CrossPlatformErrorCategory.CRASH) {
            return 'medium';
        }
        return 'none';
    }

    private assessSecurityRisk(error: CrossPlatformAppError): 'none' | 'low' | 'medium' | 'high' {
        if (error.category === CrossPlatformErrorCategory.AUTHENTICATION) {
            return 'medium';
        }
        if (error.category === CrossPlatformErrorCategory.SYSTEM && error.subcategory === 'permission_denied') {
            return 'low';
        }
        return 'none';
    }

    private assessBusinessImpact(error: CrossPlatformAppError): 'none' | 'low' | 'medium' | 'high' | 'critical' {
        if (error.category === CrossPlatformErrorCategory.PAYMENT) {
            return error.severity === 'critical' ? 'critical' : 'high';
        }
        if (error.severity === 'critical') {
            return 'high';
        }
        if (error.userImpact === 'blocking') {
            return 'medium';
        }
        return 'low';
    }

    private estimateAffectedUsers(error: CrossPlatformAppError): number | 'unknown' {
        // This would typically come from analytics
        // For now, return unknown
        return 'unknown';
    }

    private calculateConfidence(error: CrossPlatformAppError, template: DescriptionTemplate): number {
        // Calculate confidence score for the generated description
        let confidence = 0.8; // Base confidence

        // Increase confidence if we have good template match
        if (template.category === error.category) {
            confidence += 0.1;
        }

        // Decrease confidence if missing context
        if (!error.platformContext) {
            confidence -= 0.2;
        }

        return Math.max(0, Math.min(1, confidence));
    }

    private getCacheKey(error: CrossPlatformAppError): string {
        return `${error.category}_${error.subcategory}_${error.code}`;
    }

    private getDefaultNLGConfig(): NLGConfig {
        return {
            tone: 'empathetic',
            verbosity: 'detailed',
            audienceLevel: 'intermediate',
            includeExamples: true,
            includeAnalogies: false,
            language: 'en',
        };
    }

    private initializeTemplateLibrary(): Map<string, DescriptionTemplate> {
        const library = new Map<string, DescriptionTemplate>();

        // Network error templates
        library.set('network_connection_timeout', {
            category: CrossPlatformErrorCategory.NETWORK,
            naturalLanguage: 'The connection to the server timed out. This usually happens when the server is too slow to respond or your internet connection is unstable.',
            userFriendly: 'Connection timed out. Please check your internet and try again.',
            cause: 'The server took too long to respond, or your network connection is slow.',
            examples: ['Trying to load data on a slow 3G connection'],
            analogy: 'calling someone who takes forever to pick up the phone',
        });

        library.set('network_offline', {
            category: CrossPlatformErrorCategory.NETWORK,
            naturalLanguage: 'Your device appears to be offline. The app needs an internet connection to perform this action.',
            userFriendly: 'No internet connection. Please connect to WiFi or mobile data.',
            cause: 'Your device is not connected to the internet.',
            examples: ['Being in airplane mode or out of cellular range'],
        });

        // Authentication error templates
        library.set('authentication_invalid_credentials', {
            category: CrossPlatformErrorCategory.AUTHENTICATION,
            naturalLanguage: 'The username or password you entered is incorrect. Please verify your credentials and try again.',
            userFriendly: 'Invalid username or password. Please check and try again.',
            cause: 'The credentials provided do not match any account in our system.',
            examples: ['Mistyping your password or using an old password'],
        });

        // Payment error templates
        library.set('payment_card_declined', {
            category: CrossPlatformErrorCategory.PAYMENT,
            naturalLanguage: 'Your card was declined by your bank. This could be due to insufficient funds, incorrect card details, or security restrictions.',
            userFriendly: 'Payment declined. Please check your card details or try a different payment method.',
            cause: 'The payment processor or your bank declined the transaction.',
            examples: ['Insufficient funds or expired card'],
        });

        return library;
    }

    private getDefaultTemplate(category: CrossPlatformErrorCategory): DescriptionTemplate {
        return {
            category,
            naturalLanguage: 'An error occurred in the {category} category. {message}',
            userFriendly: 'Something went wrong. Please try again.',
            cause: 'The exact cause is being investigated.',
        };
    }

    /**
     * Update NLG configuration
     */
    public updateConfig(config: Partial<NLGConfig>): void {
        this.nlgConfig = { ...this.nlgConfig, ...config };
        this.descriptionCache.clear(); // Clear cache when config changes
    }

    /**
     * Clear description cache
     */
    public clearCache(): void {
        this.descriptionCache.clear();
    }
}

/**
 * Description Template
 */
interface DescriptionTemplate {
    category: CrossPlatformErrorCategory;
    naturalLanguage: string;
    userFriendly: string;
    cause: string;
    examples?: string[];
    analogy?: string;
}

// Export singleton instance
export default ContextualDescriptionGenerator.getInstance();