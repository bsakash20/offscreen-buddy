/**
 * Resolution Guidance Engine
 * Generates step-by-step resolution guidance with actionable instructions
 */

import { CrossPlatformAppError, CrossPlatformErrorCategory } from '../../types/ErrorUITypes';
import {
    ResolutionPath,
    ResolutionStep,
    ResolutionStepResult,
    ApplicableCondition,
    UserContext,
} from '../types/ContextualResolutionTypes';

/**
 * Resolution Guidance Engine Service
 * Provides intelligent step-by-step resolution guidance
 */
export class ResolutionGuidanceEngine {
    private static instance: ResolutionGuidanceEngine;
    private resolutionPaths: Map<string, ResolutionPath>;
    private pathCache: Map<string, ResolutionPath[]>;

    private constructor() {
        this.resolutionPaths = new Map();
        this.pathCache = new Map();
        this.initializeResolutionPaths();
    }

    public static getInstance(): ResolutionGuidanceEngine {
        if (!ResolutionGuidanceEngine.instance) {
            ResolutionGuidanceEngine.instance = new ResolutionGuidanceEngine();
        }
        return ResolutionGuidanceEngine.instance;
    }

    /**
     * Get resolution paths for an error
     */
    public async getResolutionPaths(
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<ResolutionPath[]> {
        const cacheKey = this.getCacheKey(error);

        // Check cache
        if (this.pathCache.has(cacheKey)) {
            return this.filterApplicablePaths(this.pathCache.get(cacheKey)!, error, userContext);
        }

        // Find matching paths
        const matchingPaths = this.findMatchingPaths(error);

        // Filter by applicability
        const applicablePaths = this.filterApplicablePaths(matchingPaths, error, userContext);

        // Sort by priority and success rate
        const sortedPaths = this.sortPaths(applicablePaths, userContext);

        // Cache results
        this.pathCache.set(cacheKey, sortedPaths);

        return sortedPaths;
    }

    /**
     * Get a specific resolution path by ID
     */
    public getResolutionPath(pathId: string): ResolutionPath | null {
        return this.resolutionPaths.get(pathId) || null;
    }

    /**
     * Generate custom resolution path for specific error
     */
    public async generateCustomPath(
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<ResolutionPath> {
        const steps = await this.generateStepsForError(error, userContext);

        return {
            id: `custom_${error.id}_${Date.now()}`,
            title: `Resolve ${error.category} Error`,
            description: `Custom resolution path for ${error.userFriendlyMessage}`,
            errorCategory: error.category,
            errorCodes: [error.code],
            steps,
            successRate: 0.7, // Default for custom paths
            averageCompletionTime: this.estimateCompletionTime(steps),
            difficulty: this.assessDifficulty(steps),
            userRating: 0,
            usageCount: 0,
            lastUpdated: new Date(),
            tags: [error.category, 'custom'],
            priority: 5,
        };
    }

    /**
     * Validate resolution step
     */
    public async validateStep(step: ResolutionStep): Promise<boolean> {
        if (step.validation) {
            try {
                return await step.validation();
            } catch (error) {
                console.error('Step validation failed:', error);
                return false;
            }
        }
        return true;
    }

    /**
     * Execute resolution step
     */
    public async executeStep(step: ResolutionStep): Promise<ResolutionStepResult> {
        const startTime = Date.now();

        try {
            if (!step.action) {
                return {
                    success: true,
                    message: 'Step completed (no action required)',
                    completionTime: Date.now() - startTime,
                    attemptCount: 1,
                };
            }

            const result = await step.action();
            return {
                ...result,
                completionTime: Date.now() - startTime,
            };
        } catch (error) {
            return {
                success: false,
                message: `Step failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                error: error instanceof Error ? error : new Error(String(error)),
                completionTime: Date.now() - startTime,
                attemptCount: 1,
            };
        }
    }

    /**
     * Register new resolution path
     */
    public registerResolutionPath(path: ResolutionPath): void {
        this.resolutionPaths.set(path.id, path);
        this.pathCache.clear(); // Clear cache when new path is added
    }

    /**
     * Update resolution path metrics
     */
    public updatePathMetrics(
        pathId: string,
        metrics: {
            successRate?: number;
            averageCompletionTime?: number;
            userRating?: number;
        }
    ): void {
        const path = this.resolutionPaths.get(pathId);
        if (path) {
            const updated = {
                ...path,
                ...metrics,
                usageCount: path.usageCount + 1,
                lastUpdated: new Date(),
            };
            this.resolutionPaths.set(pathId, updated);
            this.pathCache.clear();
        }
    }

    // ==================== Private Methods ====================

    private findMatchingPaths(error: CrossPlatformAppError): ResolutionPath[] {
        const paths: ResolutionPath[] = [];

        for (const path of this.resolutionPaths.values()) {
            // Match by category
            if (path.errorCategory === error.category) {
                // Match by error code if specified
                if (path.errorCodes.length === 0 || path.errorCodes.includes(error.code)) {
                    paths.push(path);
                }
            }
        }

        return paths;
    }

    private filterApplicablePaths(
        paths: ResolutionPath[],
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): ResolutionPath[] {
        return paths.filter(path => {
            if (!path.applicableConditions || path.applicableConditions.length === 0) {
                return true;
            }

            return path.applicableConditions.every(condition =>
                this.evaluateCondition(condition, error, userContext)
            );
        });
    }

    private evaluateCondition(
        condition: ApplicableCondition,
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): boolean {
        let actualValue: any;

        switch (condition.type) {
            case 'platform':
                actualValue = error.platformContext?.platform;
                break;
            case 'version':
                actualValue = error.platformContext?.deviceInfo.appVersion;
                break;
            case 'user_type':
                actualValue = userContext?.expertiseLevel;
                break;
            default:
                return true;
        }

        return this.compareValues(actualValue, condition.operator, condition.value);
    }

    private compareValues(actual: any, operator: string, expected: any): boolean {
        switch (operator) {
            case 'equals':
                return actual === expected;
            case 'not_equals':
                return actual !== expected;
            case 'contains':
                return String(actual).includes(String(expected));
            case 'greater_than':
                return actual > expected;
            case 'less_than':
                return actual < expected;
            default:
                return true;
        }
    }

    private sortPaths(paths: ResolutionPath[], userContext?: UserContext): ResolutionPath[] {
        return paths.sort((a, b) => {
            // Primary sort: priority
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }

            // Secondary sort: success rate
            if (a.successRate !== b.successRate) {
                return b.successRate - a.successRate;
            }

            // Tertiary sort: user rating
            if (a.userRating !== b.userRating) {
                return b.userRating - a.userRating;
            }

            // Quaternary sort: usage count (more popular first)
            return b.usageCount - a.usageCount;
        });
    }

    private async generateStepsForError(
        error: CrossPlatformAppError,
        userContext?: UserContext
    ): Promise<ResolutionStep[]> {
        const steps: ResolutionStep[] = [];

        // Generate category-specific steps
        switch (error.category) {
            case CrossPlatformErrorCategory.NETWORK:
                steps.push(...this.generateNetworkSteps(error));
                break;
            case CrossPlatformErrorCategory.AUTHENTICATION:
                steps.push(...this.generateAuthSteps(error));
                break;
            case CrossPlatformErrorCategory.PAYMENT:
                steps.push(...this.generatePaymentSteps(error));
                break;
            case CrossPlatformErrorCategory.VALIDATION:
                steps.push(...this.generateValidationSteps(error));
                break;
            default:
                steps.push(...this.generateGenericSteps(error));
        }

        return steps;
    }

    private generateNetworkSteps(error: CrossPlatformAppError): ResolutionStep[] {
        return [
            {
                id: 'network_check_connection',
                title: 'Check Internet Connection',
                description: 'Verify that your device is connected to the internet',
                detailedInstructions: 'Open Settings > WiFi or Cellular Data and ensure you are connected. Try loading a website in your browser to confirm.',
                expectedOutcome: 'Your device should be connected to WiFi or have cellular data enabled',
                estimatedDuration: 30,
                difficulty: 'easy',
                order: 1,
                isOptional: false,
                retryable: true,
                helpUrl: 'https://support.example.com/network-troubleshooting',
            },
            {
                id: 'network_toggle_airplane',
                title: 'Toggle Airplane Mode',
                description: 'Turn airplane mode on and off to reset network connection',
                detailedInstructions: 'Swipe down from the top of your screen, tap Airplane Mode to turn it on, wait 5 seconds, then turn it off again.',
                expectedOutcome: 'Network connection should be refreshed',
                estimatedDuration: 20,
                difficulty: 'easy',
                order: 2,
                isOptional: false,
                retryable: true,
            },
            {
                id: 'network_retry_request',
                title: 'Retry the Request',
                description: 'Try the operation again now that connection is restored',
                detailedInstructions: 'Return to the app and retry the action that failed.',
                expectedOutcome: 'The operation should complete successfully',
                estimatedDuration: 10,
                difficulty: 'easy',
                order: 3,
                isOptional: false,
                retryable: true,
            },
        ];
    }

    private generateAuthSteps(error: CrossPlatformAppError): ResolutionStep[] {
        return [
            {
                id: 'auth_verify_credentials',
                title: 'Verify Your Credentials',
                description: 'Double-check your username and password',
                detailedInstructions: 'Make sure Caps Lock is off and you are entering the correct username and password. Check for any typos.',
                expectedOutcome: 'Credentials are correct',
                estimatedDuration: 30,
                difficulty: 'easy',
                order: 1,
                isOptional: false,
                retryable: true,
            },
            {
                id: 'auth_reset_password',
                title: 'Reset Password (if needed)',
                description: 'Use the "Forgot Password" option if you cannot remember your password',
                detailedInstructions: 'Click on "Forgot Password", enter your email, and follow the instructions sent to your email to reset your password.',
                expectedOutcome: 'Password is reset successfully',
                estimatedDuration: 300,
                difficulty: 'medium',
                order: 2,
                isOptional: true,
                retryable: true,
            },
            {
                id: 'auth_retry_login',
                title: 'Try Logging In Again',
                description: 'Attempt to log in with your credentials',
                detailedInstructions: 'Enter your username and password and click "Log In".',
                expectedOutcome: 'Successfully logged in',
                estimatedDuration: 20,
                difficulty: 'easy',
                order: 3,
                isOptional: false,
                retryable: true,
            },
        ];
    }

    private generatePaymentSteps(error: CrossPlatformAppError): ResolutionStep[] {
        return [
            {
                id: 'payment_verify_details',
                title: 'Verify Payment Details',
                description: 'Check that all payment information is correct',
                detailedInstructions: 'Review card number, expiration date, CVV, and billing address. Ensure all fields are filled correctly.',
                expectedOutcome: 'All payment details are accurate',
                estimatedDuration: 60,
                difficulty: 'easy',
                order: 1,
                isOptional: false,
                retryable: true,
            },
            {
                id: 'payment_check_funds',
                title: 'Check Available Funds',
                description: 'Ensure sufficient funds or credit limit',
                detailedInstructions: 'Verify with your bank that you have enough balance or credit available for this transaction.',
                expectedOutcome: 'Sufficient funds available',
                estimatedDuration: 120,
                difficulty: 'medium',
                order: 2,
                isOptional: false,
                retryable: false,
            },
            {
                id: 'payment_try_alternative',
                title: 'Try Alternative Payment Method',
                description: 'Use a different card or payment method',
                detailedInstructions: 'Select a different payment method from the options available or add a new payment method.',
                expectedOutcome: 'Alternative payment method works',
                estimatedDuration: 90,
                difficulty: 'easy',
                order: 3,
                isOptional: true,
                retryable: true,
            },
        ];
    }

    private generateValidationSteps(error: CrossPlatformAppError): ResolutionStep[] {
        return [
            {
                id: 'validation_review_fields',
                title: 'Review All Fields',
                description: 'Check all form fields for errors',
                detailedInstructions: 'Look for red error messages or highlighted fields. Read each error message carefully.',
                expectedOutcome: 'All validation errors identified',
                estimatedDuration: 45,
                difficulty: 'easy',
                order: 1,
                isOptional: false,
                retryable: true,
            },
            {
                id: 'validation_correct_errors',
                title: 'Correct Validation Errors',
                description: 'Fix each identified error',
                detailedInstructions: 'Follow the instructions in each error message to correct the field. Common issues include: invalid email format, missing required fields, or values that are too short/long.',
                expectedOutcome: 'All fields pass validation',
                estimatedDuration: 120,
                difficulty: 'medium',
                order: 2,
                isOptional: false,
                retryable: true,
            },
            {
                id: 'validation_resubmit',
                title: 'Resubmit Form',
                description: 'Submit the form again after corrections',
                detailedInstructions: 'Click the submit button to try again with the corrected information.',
                expectedOutcome: 'Form submits successfully',
                estimatedDuration: 10,
                difficulty: 'easy',
                order: 3,
                isOptional: false,
                retryable: true,
            },
        ];
    }

    private generateGenericSteps(error: CrossPlatformAppError): ResolutionStep[] {
        return [
            {
                id: 'generic_restart_app',
                title: 'Restart the App',
                description: 'Close and reopen the application',
                detailedInstructions: 'Completely close the app (swipe up from multitasking view on iOS/Android) and then reopen it.',
                expectedOutcome: 'App restarts successfully',
                estimatedDuration: 30,
                difficulty: 'easy',
                order: 1,
                isOptional: false,
                retryable: true,
            },
            {
                id: 'generic_check_updates',
                title: 'Check for Updates',
                description: 'Ensure you have the latest app version',
                detailedInstructions: 'Open the App Store (iOS) or Play Store (Android), search for the app, and tap "Update" if available.',
                expectedOutcome: 'App is up to date',
                estimatedDuration: 120,
                difficulty: 'easy',
                order: 2,
                isOptional: true,
                retryable: false,
            },
            {
                id: 'generic_contact_support',
                title: 'Contact Support',
                description: 'Get help from our support team',
                detailedInstructions: 'If the issue persists, contact support with error code: ' + error.code,
                expectedOutcome: 'Support team provides assistance',
                estimatedDuration: 600,
                difficulty: 'easy',
                order: 3,
                isOptional: true,
                retryable: false,
            },
        ];
    }

    private estimateCompletionTime(steps: ResolutionStep[]): number {
        return steps.reduce((total, step) => total + step.estimatedDuration, 0);
    }

    private assessDifficulty(steps: ResolutionStep[]): 'easy' | 'medium' | 'hard' {
        const difficultyScores = { easy: 1, medium: 2, hard: 3 };
        const avgScore = steps.reduce((sum, step) => sum + difficultyScores[step.difficulty], 0) / steps.length;

        if (avgScore <= 1.5) return 'easy';
        if (avgScore <= 2.5) return 'medium';
        return 'hard';
    }

    private getCacheKey(error: CrossPlatformAppError): string {
        return `${error.category}_${error.code}`;
    }

    private initializeResolutionPaths(): void {
        // Network offline path
        this.registerResolutionPath({
            id: 'network_offline_resolution',
            title: 'Fix Internet Connection',
            description: 'Steps to restore internet connectivity',
            errorCategory: CrossPlatformErrorCategory.NETWORK,
            errorCodes: ['NET-OFFLINE-001'],
            steps: this.generateNetworkSteps({} as CrossPlatformAppError),
            successRate: 0.85,
            averageCompletionTime: 60,
            difficulty: 'easy',
            userRating: 4.2,
            usageCount: 1250,
            lastUpdated: new Date(),
            tags: ['network', 'connectivity', 'offline'],
            priority: 10,
        });

        // Authentication failure path
        this.registerResolutionPath({
            id: 'auth_invalid_credentials',
            title: 'Fix Login Issues',
            description: 'Steps to resolve authentication problems',
            errorCategory: CrossPlatformErrorCategory.AUTHENTICATION,
            errorCodes: ['AUTH-CRED-001'],
            steps: this.generateAuthSteps({} as CrossPlatformAppError),
            successRate: 0.78,
            averageCompletionTime: 350,
            difficulty: 'medium',
            userRating: 4.0,
            usageCount: 890,
            lastUpdated: new Date(),
            tags: ['authentication', 'login', 'credentials'],
            priority: 9,
        });

        // Payment declined path
        this.registerResolutionPath({
            id: 'payment_card_declined',
            title: 'Resolve Payment Issues',
            description: 'Steps to fix declined payment',
            errorCategory: CrossPlatformErrorCategory.PAYMENT,
            errorCodes: ['PAY-DECLINED-001'],
            steps: this.generatePaymentSteps({} as CrossPlatformAppError),
            successRate: 0.72,
            averageCompletionTime: 270,
            difficulty: 'medium',
            userRating: 3.8,
            usageCount: 650,
            lastUpdated: new Date(),
            tags: ['payment', 'card', 'transaction'],
            priority: 8,
        });
    }

    /**
     * Clear path cache
     */
    public clearCache(): void {
        this.pathCache.clear();
    }
}

// Export singleton instance
export default ResolutionGuidanceEngine.getInstance();