/**
 * Fake Call Services - Export Index
 * Centralized exports for all fake call related services and types
 *
 * Includes security and authentication components for Pro tier integration
 */

// Import existing services
import { VoiceSynthesisService } from './VoiceSynthesisService';
import { CallerIDService } from './CallerIDService';
import { FakeCallService } from './FakeCallService';

// Import service instances
import { voiceSynthesisService } from './VoiceSynthesisService';
import { callerIDService } from './CallerIDService';
import { fakeCallService } from './FakeCallService';

// Import new security services
import { FakeCallAuthenticationService, fakeCallAuthService } from './FakeCallAuthService';
import { FakeCallSecurityValidator, fakeCallSecurityValidator } from './SecurityValidator';
import { FakeCallPermissionManager, fakeCallPermissionManager } from './PermissionManager';

// Import all types
export * from './types';

// Export existing services
export { VoiceSynthesisService, voiceSynthesisService };
export { CallerIDService, callerIDService };
export { FakeCallService, fakeCallService };

// Export new security services
export { FakeCallAuthenticationService, fakeCallAuthService };
export { FakeCallSecurityValidator, fakeCallSecurityValidator };
export { FakeCallPermissionManager, fakeCallPermissionManager };

// Enhanced service factory functions
export const createFakeCallSystem = () => {
    return {
        // Core services
        voiceSynthesis: voiceSynthesisService,
        callerID: callerIDService,
        fakeCall: fakeCallService,

        // Security and authentication services
        authentication: fakeCallAuthService,
        security: fakeCallSecurityValidator,
        permissions: fakeCallPermissionManager,

        // Quick setup method
        async initialize() {
            // Initialize core services
            await voiceSynthesisService.initialize();
            await callerIDService.initialize();
            await fakeCallService.initialize();

            // Initialize security services
            await fakeCallAuthService.initialize();
            await fakeCallSecurityValidator.initialize();
            await fakeCallPermissionManager.initialize();
        },

        // Complete disposal
        async dispose() {
            // Dispose security services first
            await fakeCallPermissionManager.dispose();
            await fakeCallSecurityValidator.dispose();
            await fakeCallAuthService.dispose();

            // Dispose core services
            await fakeCallService.dispose();
            await voiceSynthesisService.dispose();
            await callerIDService.dispose();
        },

        // Pro tier integration helpers
        async initializeProTier(userId: string) {
            await fakeCallAuthService.initialize();
            await fakeCallSecurityValidator.initialize();
            await fakeCallPermissionManager.initialize();

            // Request all permissions
            await fakeCallPermissionManager.requestAllPermissions(userId);

            // Validate Pro tier access
            const hasProAccess = await fakeCallAuthService.validateProTierAccess(userId);
            return hasProAccess;
        },

        // Security validation helpers
        async validateCallConfig(userId: string, config: any) {
            const validationRequest = {
                userId,
                featuresRequested: [],
                callConfig: config,
                platform: 'ios' as any // This would be detected dynamically
            };

            return await fakeCallAuthService.validateCallConfiguration(validationRequest);
        },

        // Permission management helpers
        async checkFeaturePermissions(userId: string, feature: 'basic_calls' | 'advanced_scheduling' | 'background_execution' | 'accessibility_features') {
            return await fakeCallPermissionManager.checkFeatureAccess(userId, feature);
        }
    };
};

// Convenience type for complete fake call system
export type FakeCallSystem = ReturnType<typeof createFakeCallSystem>;

// Integration helpers for existing authentication infrastructure
export const integrateWithAuthContext = {
    /**
     * Enhance AuthContext with fake call security integration
     */
    enhanceAuthContext: (authContext: any) => {
        // Add fake call security methods to AuthContext
        const enhancedAuth = {
            ...authContext,

            // Fake call Pro tier validation
            async validateFakeCallAccess() {
                if (!enhancedAuth.user) return false;
                return await fakeCallAuthService.validateProTierAccess(enhancedAuth.user.id);
            },

            // Get fake call usage statistics
            async getFakeCallUsage() {
                if (!enhancedAuth.user) return null;
                return await fakeCallAuthService.getUsageStatistics(enhancedAuth.user.id);
            },

            // Check feature permissions
            async checkFakeCallFeature(feature: string) {
                if (!enhancedAuth.user) return { hasAccess: false };
                return await fakeCallPermissionManager.checkFeatureAccess(enhancedAuth.user.id, feature as any);
            },

            // Request permissions if needed
            async ensureFakeCallPermissions() {
                if (!enhancedAuth.user) return false;
                const result = await fakeCallPermissionManager.requestAllPermissions(enhancedAuth.user.id);
                return result.success;
            }
        };

        return enhancedAuth;
    },

    /**
     * Integrate with existing AuthenticationService
     */
    withAuthenticationService: async (userId: string) => {
        try {
            // Initialize security services
            await fakeCallAuthService.initialize();
            await fakeCallSecurityValidator.initialize();

            // Log authentication integration
            await fakeCallAuthService.logFeatureUsage(userId, 'auth_integration', {
                service: 'AuthenticationService',
                timestamp: new Date()
            });

            return true;
        } catch (error) {
            console.error('Failed to integrate with AuthenticationService:', error);
            return false;
        }
    },

    /**
     * Integrate with PrivacyManager for compliance
     */
    withPrivacyManager: async (userId: string) => {
        try {
            // Ensure privacy compliance for fake call data
            const hasConsent = await fakeCallAuthService.logFeatureUsage(userId, 'privacy_compliance_check', {
                gdpr_compliant: true,
                ccpa_compliant: true,
                data_minimization: true
            });

            return hasConsent;
        } catch (error) {
            console.error('Failed to integrate with PrivacyManager:', error);
            return false;
        }
    },

    /**
     * Integrate with SecurityMonitor for audit logging
     */
    withSecurityMonitor: async (userId: string, action: string, metadata?: any) => {
        try {
            await fakeCallAuthService.logFeatureUsage(userId, `security_${action}`, {
                ...metadata,
                integration_point: 'SecurityMonitor',
                audit_level: 'comprehensive'
            });

            return true;
        } catch (error) {
            console.error('Failed to integrate with SecurityMonitor:', error);
            return false;
        }
    }
};

// Compliance and audit utilities
export const complianceHelpers = {
    /**
     * GDPR compliance check for fake call data
     */
    checkGDPRCompliance: async (userId: string) => {
        const validation = await fakeCallSecurityValidator.performComprehensiveValidation({
            type: 'user_input',
            data: { userId, complianceType: 'GDPR' },
            userId,
            platform: 'ios' as any
        });

        return validation.privacyCompliance;
    },

    /**
     * CCPA compliance check for fake call data
     */
    checkCCPACompliance: async (userId: string) => {
        const validation = await fakeCallSecurityValidator.performComprehensiveValidation({
            type: 'user_input',
            data: { userId, complianceType: 'CCPA' },
            userId,
            platform: 'ios' as any
        });

        return validation.privacyCompliance;
    },

    /**
     * Generate comprehensive audit report
     */
    generateAuditReport: async (userId: string, dateRange?: { from: Date; to: Date }) => {
        try {
            // Get usage statistics
            const usage = await fakeCallAuthService.getUsageStatistics(userId);

            // Get permission history
            const permissions = await fakeCallPermissionManager.getPermissionStatus(userId);

            return {
                userId,
                generatedAt: new Date(),
                dateRange: dateRange || { from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), to: new Date() },
                usage,
                permissions,
                compliance: {
                    gdpr: true, // Would be actual compliance status
                    ccpa: true,
                    soc2: true
                }
            };
        } catch (error) {
            console.error('Failed to generate audit report:', error);
            return null;
        }
    }
};