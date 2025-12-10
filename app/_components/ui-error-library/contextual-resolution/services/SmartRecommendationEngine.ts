/**
 * Smart Recommendation Engine
 * AI-powered resolution recommendation system with personalization
 */

import { CrossPlatformAppError } from '../../types/ErrorUITypes';
import {
    ResolutionRecommendation,
    ResolutionPath,
    PersonalizationFactor,
    AlternativeRecommendation,
    UserContext,
    ResolutionSuccessPrediction,
    PredictionFactor,
    ErrorPattern,
} from '../types/ContextualResolutionTypes';
import { ResolutionGuidanceEngine } from './ResolutionGuidanceEngine';

/**
 * Smart Recommendation Engine Service
 * Provides intelligent, personalized resolution recommendations
 */
export class SmartRecommendationEngine {
    private static instance: SmartRecommendationEngine;
    private guidanceEngine: ResolutionGuidanceEngine;
    private errorPatterns: Map<string, ErrorPattern>;
    private userSuccessHistory: Map<string, UserSuccessRecord[]>;
    private globalSuccessMetrics: Map<string, SuccessMetrics>;

    private constructor() {
        this.guidanceEngine = ResolutionGuidanceEngine.getInstance();
        this.errorPatterns = new Map();
        this.userSuccessHistory = new Map();
        this.globalSuccessMetrics = new Map();
        this.initializeErrorPatterns();
    }

    public static getInstance(): SmartRecommendationEngine {
        if (!SmartRecommendationEngine.instance) {
            SmartRecommendationEngine.instance = new SmartRecommendationEngine();
        }
        return SmartRecommendationEngine.instance;
    }

    /**
     * Get personalized resolution recommendations
     */
    public async getRecommendations(
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<ResolutionRecommendation[]> {
        // Get all applicable resolution paths
        const paths = await this.guidanceEngine.getResolutionPaths(error, userContext);

        if (paths.length === 0) {
            // Generate custom path if no matches found
            const customPath = await this.guidanceEngine.generateCustomPath(error, userContext);
            paths.push(customPath);
        }

        // Generate recommendations for each path
        const recommendations = await Promise.all(
            paths.map(path => this.generateRecommendation(path, error, userContext))
        );

        // Sort by confidence and priority
        return recommendations.sort((a, b) => {
            if (a.confidence !== b.confidence) {
                return b.confidence - a.confidence;
            }
            return b.priority - a.priority;
        });
    }

    /**
     * Predict resolution success
     */
    public async predictSuccess(
        resolutionPathId: string,
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<ResolutionSuccessPrediction> {
        const path = this.guidanceEngine.getResolutionPath(resolutionPathId);

        if (!path) {
            throw new Error(`Resolution path ${resolutionPathId} not found`);
        }

        const factors = this.analyzePredictionFactors(path, error, userContext);
        const predictedSuccessRate = this.calculatePredictedSuccess(factors, path);
        const confidence = this.calculatePredictionConfidence(factors);

        return {
            resolutionPathId,
            predictedSuccessRate,
            confidence,
            factors,
            alternativeRecommendations: await this.getAlternativePathIds(error, resolutionPathId),
        };
    }

    /**
     * Learn from resolution outcome
     */
    public async learnFromOutcome(
        userId: string,
        resolutionPathId: string,
        error: CrossPlatformAppError,
        success: boolean,
        completionTime: number
    ): Promise<void> {
        // Record user success history
        const userHistory = this.userSuccessHistory.get(userId) || [];
        userHistory.push({
            resolutionPathId,
            errorCategory: error.category,
            errorCode: error.code,
            success,
            completionTime,
            timestamp: new Date(),
        });
        this.userSuccessHistory.set(userId, userHistory);

        // Update global metrics
        const metrics = this.globalSuccessMetrics.get(resolutionPathId) || {
            totalAttempts: 0,
            successfulAttempts: 0,
            averageCompletionTime: 0,
            lastUpdated: new Date(),
        };

        metrics.totalAttempts++;
        if (success) {
            metrics.successfulAttempts++;
        }
        metrics.averageCompletionTime =
            (metrics.averageCompletionTime * (metrics.totalAttempts - 1) + completionTime) /
            metrics.totalAttempts;
        metrics.lastUpdated = new Date();

        this.globalSuccessMetrics.set(resolutionPathId, metrics);

        // Update path metrics in guidance engine
        this.guidanceEngine.updatePathMetrics(resolutionPathId, {
            successRate: metrics.successfulAttempts / metrics.totalAttempts,
            averageCompletionTime: metrics.averageCompletionTime,
        });
    }

    /**
     * Detect error patterns
     */
    public detectPatterns(errors: CrossPlatformAppError[]): ErrorPattern[] {
        const patterns: ErrorPattern[] = [];
        const errorGroups = this.groupErrors(errors);

        for (const [key, groupErrors] of errorGroups.entries()) {
            if (groupErrors.length >= 3) { // Minimum 3 occurrences to be a pattern
                const pattern = this.createPattern(key, groupErrors);
                patterns.push(pattern);
                this.errorPatterns.set(pattern.id, pattern);
            }
        }

        return patterns;
    }

    /**
     * Get personalized resolution based on user history
     */
    public getPersonalizedPath(
        userId: string,
        error: CrossPlatformAppError
    ): string | null {
        const userHistory = this.userSuccessHistory.get(userId);

        if (!userHistory || userHistory.length === 0) {
            return null;
        }

        // Find successful resolutions for similar errors
        const similarSuccesses = userHistory.filter(record =>
            record.success &&
            record.errorCategory === error.category &&
            (record.errorCode === error.code || record.errorCode.startsWith(error.code.split('-')[0]))
        );

        if (similarSuccesses.length === 0) {
            return null;
        }

        // Return most frequently successful path
        const pathCounts = new Map<string, number>();
        similarSuccesses.forEach(record => {
            pathCounts.set(record.resolutionPathId, (pathCounts.get(record.resolutionPathId) || 0) + 1);
        });

        let maxCount = 0;
        let bestPath: string | null = null;
        pathCounts.forEach((count, pathId) => {
            if (count > maxCount) {
                maxCount = count;
                bestPath = pathId;
            }
        });

        return bestPath;
    }

    // ==================== Private Methods ====================

    private async generateRecommendation(
        path: ResolutionPath,
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<ResolutionRecommendation> {
        const personalizationFactors = this.generatePersonalizationFactors(path, error, userContext);
        const confidence = this.calculateRecommendationConfidence(path, personalizationFactors);
        const alternatives = await this.generateAlternatives(path, error, userContext);

        return {
            resolutionPathId: path.id,
            confidence,
            reasoning: this.generateReasoning(path, personalizationFactors),
            estimatedSuccessRate: this.estimateSuccessRate(path, personalizationFactors),
            estimatedTime: this.estimateTime(path, userContext),
            userEffort: this.assessUserEffort(path, userContext),
            priority: path.priority,
            personalizedFactors: personalizationFactors,
            alternatives,
        };
    }

    private generatePersonalizationFactors(
        path: ResolutionPath,
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): PersonalizationFactor[] {
        const factors: PersonalizationFactor[] = [];

        // User expertise factor
        if (userContext?.expertiseLevel) {
            const expertiseMatch = this.matchExpertiseLevel(path.difficulty, userContext.expertiseLevel);
            factors.push({
                type: 'user_expertise',
                name: 'Expertise Match',
                value: expertiseMatch,
                weight: 0.3,
                description: `Path difficulty (${path.difficulty}) matches user expertise (${userContext.expertiseLevel})`,
            });
        }

        // Past success factor
        if (userContext?.userId && userContext.history) {
            const pastSuccess = this.calculatePastSuccessRate(
                userContext.userId,
                path.id,
                error.category
            );
            factors.push({
                type: 'past_success',
                name: 'Historical Success',
                value: pastSuccess,
                weight: 0.25,
                description: `User has ${(pastSuccess * 100).toFixed(0)}% success rate with this type of resolution`,
            });
        }

        // Device capability factor
        if (userContext?.deviceCapabilities) {
            const capabilityScore = this.assessDeviceCapability(path, userContext.deviceCapabilities);
            factors.push({
                type: 'device_capability',
                name: 'Device Compatibility',
                value: capabilityScore,
                weight: 0.2,
                description: 'Device meets all requirements for this resolution path',
            });
        }

        // User preference factor
        if (userContext?.preferences) {
            const preferenceScore = this.matchUserPreferences(path, userContext.preferences);
            factors.push({
                type: 'preference',
                name: 'User Preferences',
                value: preferenceScore,
                weight: 0.15,
                description: 'Resolution aligns with user preferences',
            });
        }

        // Global success rate factor
        const globalMetrics = this.globalSuccessMetrics.get(path.id);
        if (globalMetrics) {
            factors.push({
                type: 'past_success',
                name: 'Global Success Rate',
                value: globalMetrics.successfulAttempts / globalMetrics.totalAttempts,
                weight: 0.1,
                description: `${globalMetrics.successfulAttempts} of ${globalMetrics.totalAttempts} users succeeded`,
            });
        }

        return factors;
    }

    private calculateRecommendationConfidence(
        path: ResolutionPath,
        factors: PersonalizationFactor[]
    ): number {
        if (factors.length === 0) {
            return path.successRate; // Fallback to path's base success rate
        }

        // Weighted average of all factors
        const weightedSum = factors.reduce((sum, factor) => sum + (factor.value * factor.weight), 0);
        const totalWeight = factors.reduce((sum, factor) => sum + factor.weight, 0);

        return totalWeight > 0 ? weightedSum / totalWeight : path.successRate;
    }

    private generateReasoning(path: ResolutionPath, factors: PersonalizationFactor[]): string {
        const reasons: string[] = [];

        reasons.push(`This solution has a ${(path.successRate * 100).toFixed(0)}% success rate`);

        const topFactors = factors
            .sort((a, b) => (b.value * b.weight) - (a.value * a.weight))
            .slice(0, 2);

        topFactors.forEach(factor => {
            if (factor.value > 0.7) {
                reasons.push(factor.description);
            }
        });

        if (path.usageCount > 100) {
            reasons.push(`Proven effective by ${path.usageCount}+ users`);
        }

        return reasons.join('. ');
    }

    private estimateSuccessRate(path: ResolutionPath, factors: PersonalizationFactor[]): number {
        const baseRate = path.successRate;
        const personalizedConfidence = this.calculateRecommendationConfidence(path, factors);

        // Blend base rate with personalized confidence
        return (baseRate * 0.6) + (personalizedConfidence * 0.4);
    }

    private estimateTime(path: ResolutionPath, userContext?: UserContext): number {
        let time = path.averageCompletionTime;

        // Adjust based on user expertise
        if (userContext?.expertiseLevel) {
            const multipliers = {
                beginner: 1.3,
                intermediate: 1.0,
                advanced: 0.8,
                expert: 0.6,
            };
            time *= multipliers[userContext.expertiseLevel];
        }

        return Math.round(time);
    }

    private assessUserEffort(
        path: ResolutionPath,
        userContext?: UserContext
    ): 'minimal' | 'moderate' | 'significant' {
        const stepCount = path.steps.length;
        const avgDifficulty = path.difficulty;

        if (stepCount <= 2 && avgDifficulty === 'easy') {
            return 'minimal';
        }
        if (stepCount <= 4 && avgDifficulty !== 'hard') {
            return 'moderate';
        }
        return 'significant';
    }

    private async generateAlternatives(
        primaryPath: ResolutionPath,
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<AlternativeRecommendation[]> {
        const allPaths = await this.guidanceEngine.getResolutionPaths(error, userContext);

        return allPaths
            .filter(path => path.id !== primaryPath.id)
            .slice(0, 2) // Top 2 alternatives
            .map(path => ({
                resolutionPathId: path.id,
                reason: this.generateAlternativeReason(path, primaryPath),
                confidence: path.successRate,
                estimatedTime: path.averageCompletionTime,
            }));
    }

    private generateAlternativeReason(alternative: ResolutionPath, primary: ResolutionPath): string {
        if (alternative.difficulty < primary.difficulty) {
            return 'Easier alternative approach';
        }
        if (alternative.averageCompletionTime < primary.averageCompletionTime) {
            return 'Faster resolution option';
        }
        if (alternative.successRate > primary.successRate) {
            return 'Higher success rate';
        }
        return 'Alternative approach';
    }

    private analyzePredictionFactors(
        path: ResolutionPath,
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): PredictionFactor[] {
        const factors: PredictionFactor[] = [];

        // Path success rate
        factors.push({
            name: 'Historical Success Rate',
            impact: (path.successRate - 0.5) * 2, // Normalize to -1 to 1
            description: `Path has ${(path.successRate * 100).toFixed(0)}% success rate`,
            weight: 0.3,
        });

        // Error severity impact
        const severityImpact = this.getSeverityImpact(error.severity);
        factors.push({
            name: 'Error Severity',
            impact: severityImpact,
            description: `${error.severity} severity error`,
            weight: 0.2,
        });

        // User expertise match
        if (userContext?.expertiseLevel) {
            const expertiseImpact = this.getExpertiseImpact(path.difficulty, userContext.expertiseLevel);
            factors.push({
                name: 'User Expertise Match',
                impact: expertiseImpact,
                description: `User expertise ${userContext.expertiseLevel} vs path difficulty ${path.difficulty}`,
                weight: 0.25,
            });
        }

        // Device capability
        if (userContext?.deviceCapabilities) {
            const deviceImpact = this.getDeviceImpact(userContext.deviceCapabilities);
            factors.push({
                name: 'Device Capability',
                impact: deviceImpact,
                description: 'Device meets resolution requirements',
                weight: 0.15,
            });
        }

        // Time of day (some resolutions work better at certain times)
        const timeImpact = this.getTimeImpact();
        factors.push({
            name: 'Optimal Timing',
            impact: timeImpact,
            description: 'Current time is optimal for this resolution',
            weight: 0.1,
        });

        return factors;
    }

    private calculatePredictedSuccess(factors: PredictionFactor[], path: ResolutionPath): number {
        const baseRate = path.successRate;

        // Calculate weighted impact
        const weightedImpact = factors.reduce((sum, factor) =>
            sum + (factor.impact * factor.weight), 0
        );

        // Adjust base rate by weighted impact
        const predicted = baseRate + (weightedImpact * 0.3); // Max 30% adjustment

        return Math.max(0, Math.min(1, predicted));
    }

    private calculatePredictionConfidence(factors: PredictionFactor[]): number {
        // Confidence based on number and quality of factors
        const factorCount = factors.length;
        const avgWeight = factors.reduce((sum, f) => sum + f.weight, 0) / factorCount;

        return Math.min(0.95, 0.5 + (factorCount * 0.08) + (avgWeight * 0.2));
    }

    private async getAlternativePathIds(
        error: CrossPlatformAppError,
        excludePathId: string
    ): Promise<string[]> {
        const paths = await this.guidanceEngine.getResolutionPaths(error);
        return paths
            .filter(p => p.id !== excludePathId)
            .slice(0, 3)
            .map(p => p.id);
    }

    private matchExpertiseLevel(difficulty: string, expertise: string): number {
        const matchMatrix: Record<string, Record<string, number>> = {
            easy: { beginner: 1.0, intermediate: 0.9, advanced: 0.7, expert: 0.6 },
            medium: { beginner: 0.5, intermediate: 1.0, advanced: 0.9, expert: 0.8 },
            hard: { beginner: 0.2, intermediate: 0.6, advanced: 1.0, expert: 1.0 },
        };
        return matchMatrix[difficulty]?.[expertise] || 0.5;
    }

    private calculatePastSuccessRate(userId: string, pathId: string, category: string): number {
        const history = this.userSuccessHistory.get(userId);
        if (!history) return 0.5; // Neutral if no history

        const relevant = history.filter(r =>
            r.resolutionPathId === pathId || r.errorCategory === category
        );

        if (relevant.length === 0) return 0.5;

        const successes = relevant.filter(r => r.success).length;
        return successes / relevant.length;
    }

    private assessDeviceCapability(path: ResolutionPath, capabilities: any): number {
        // Simple capability check - can be enhanced
        let score = 1.0;

        if (!capabilities.hasInternet && path.errorCategory === 'network') {
            score *= 0.3;
        }

        if (capabilities.storage === 'low' && path.steps.length > 5) {
            score *= 0.7;
        }

        return score;
    }

    private matchUserPreferences(path: ResolutionPath, preferences: any): number {
        let score = 1.0;

        // Adjust for animation preferences
        if (!preferences.enableAnimations && path.steps.some(s => s.helpUrl)) {
            score *= 0.9;
        }

        return score;
    }

    private getSeverityImpact(severity: string): number {
        const impacts = { low: 0.2, medium: 0, high: -0.2, critical: -0.4 };
        return impacts[severity as keyof typeof impacts] || 0;
    }

    private getExpertiseImpact(difficulty: string, expertise: string): number {
        const match = this.matchExpertiseLevel(difficulty, expertise);
        return (match - 0.5) * 2; // Normalize to -1 to 1
    }

    private getDeviceImpact(capabilities: any): number {
        let impact = 0;
        if (capabilities.hasInternet) impact += 0.3;
        if (capabilities.storage !== 'low') impact += 0.2;
        return Math.min(0.5, impact);
    }

    private getTimeImpact(): number {
        // Simple time-based impact (can be enhanced with actual usage patterns)
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) return 0.1; // Business hours
        return 0;
    }

    private groupErrors(errors: CrossPlatformAppError[]): Map<string, CrossPlatformAppError[]> {
        const groups = new Map<string, CrossPlatformAppError[]>();

        errors.forEach(error => {
            const key = `${error.category}_${error.subcategory}`;
            const group = groups.get(key) || [];
            group.push(error);
            groups.set(key, group);
        });

        return groups;
    }

    private createPattern(key: string, errors: CrossPlatformAppError[]): ErrorPattern {
        const [category, subcategory] = key.split('_');

        return {
            id: `pattern_${key}_${Date.now()}`,
            pattern: key,
            category: category as any,
            commonCauses: this.extractCommonCauses(errors),
            typicalResolutions: this.extractTypicalResolutions(errors),
            frequency: errors.length,
            lastSeen: new Date(),
            confidence: Math.min(0.95, 0.5 + (errors.length * 0.05)),
        };
    }

    private extractCommonCauses(errors: CrossPlatformAppError[]): string[] {
        // Simplified - would use NLP in production
        return ['Network connectivity', 'Invalid input', 'Server error'];
    }

    private extractTypicalResolutions(errors: CrossPlatformAppError[]): string[] {
        // Simplified - would analyze successful resolutions
        return ['Retry operation', 'Check connection', 'Verify input'];
    }

    private initializeErrorPatterns(): void {
        // Initialize with common patterns
        // This would typically be loaded from a database
    }
}

/**
 * User Success Record
 */
interface UserSuccessRecord {
    resolutionPathId: string;
    errorCategory: string;
    errorCode: string;
    success: boolean;
    completionTime: number;
    timestamp: Date;
}

/**
 * Success Metrics
 */
interface SuccessMetrics {
    totalAttempts: number;
    successfulAttempts: number;
    averageCompletionTime: number;
    lastUpdated: Date;
}

// Export singleton instance
export default SmartRecommendationEngine.getInstance();