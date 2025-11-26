/**
 * Fake Call Authentication Service
 * Pro tier authentication and security integration for fake call notification system
 * 
 * Extends existing AuthenticationService and integrates with AuthContext for Pro tier validation
 * Provides feature gating, subscription monitoring, and audit logging for fake call usage
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authenticationService } from '../security/AuthenticationService';
import { securityMonitor } from '../security/SecurityMonitor';
import { privacyManager } from '../security/PrivacyManager';
import { CallError, CallErrorType, FakeCallResult, ProTierSecurity, SubscriptionStatus, FeatureLimitStatus, FakeCallConfig, CallerInfo } from './types';

export interface FakeCallAuthConfig {
    enableProTierValidation: boolean;
    enableSubscriptionMonitoring: boolean;
    enableUsageQuotas: boolean;
    enableAuditLogging: boolean;
    maxDailyCalls: number;
    maxMonthlyCalls: number;
    proTierGracePeriod: number; // hours
    subscriptionCheckInterval: number; // minutes
}

export interface FakeCallAuthSession {
    sessionId: string;
    userId: string;
    isProTier: boolean;
    subscriptionStatus: SubscriptionStatus;
    usageQuota: {
        daily: { used: number; limit: number; resetAt: Date };
        monthly: { used: number; limit: number; resetAt: Date };
    };
    featureAccess: {
        customCallerId: boolean;
        advancedVoices: boolean;
        extendedScheduling: boolean;
        prioritySupport: boolean;
        analytics: boolean;
        teamCollaboration: boolean;
    };
    permissions: {
        microphone: boolean;
        notifications: boolean;
        calls: boolean;
        background: boolean;
        accessibility: boolean;
    };
    lastValidated: Date;
    auditEnabled: boolean;
}

export interface FakeCallAuthResult extends FakeCallResult<FakeCallAuthSession> {
    data?: FakeCallAuthSession;
}

export interface ProTierValidationRequest {
    userId: string;
    featuresRequested: string[];
    callConfig: FakeCallConfig;
    platform: Platform;
}

export interface UsageLimitCheck {
    userId: string;
    action: 'schedule' | 'start' | 'modify';
    feature: string;
    metadata?: Record<string, any>;
}

export class FakeCallAuthenticationService implements ProTierSecurity {
    private config: FakeCallAuthConfig;
    private activeSessions: Map<string, FakeCallAuthSession> = new Map();
    private subscriptionMonitors: Map<string, any> = new Map();
    private auditLogs: Map<string, any[]> = new Map();

    constructor(config?: Partial<FakeCallAuthConfig>) {
        this.config = {
            enableProTierValidation: true,
            enableSubscriptionMonitoring: true,
            enableUsageQuotas: true,
            enableAuditLogging: true,
            maxDailyCalls: 100,
            maxMonthlyCalls: 2000,
            proTierGracePeriod: 24,
            subscriptionCheckInterval: 15,
            ...config
        };
    }

    /**
     * Initialize fake call authentication service
     */
    async initialize(): Promise<void> {
        try {
            // Load existing sessions from storage
            await this.loadActiveSessions();

            // Start subscription monitoring for active Pro users
            this.startSubscriptionMonitoring();

            // Initialize privacy compliance
            await this.initializePrivacyCompliance();

            // Log initialization
            await securityMonitor.logSecurityEvent('fake_call_auth_initialized', {
                config: this.config,
                activeSessions: this.activeSessions.size
            });

            console.log('🔐 FakeCall Authentication Service initialized');
        } catch (error) {
            console.error('Failed to initialize FakeCall Authentication Service:', error);
            throw error;
        }
    }

    /**
     * Validate Pro tier access for fake call features
     */
    async validateProTierAccess(userId: string): Promise<boolean> {
        try {
            const session = await this.getOrCreateAuthSession(userId);

            // Check subscription status
            const isValid = await this.validateSubscriptionStatus(session.subscriptionStatus);

            if (!isValid) {
                await securityMonitor.logSecurityEvent('fake_call_pro_tier_validation_failed', {
                    userId,
                    reason: 'invalid_subscription',
                    subscriptionStatus: session.subscriptionStatus
                });
                return false;
            }

            // Check usage quotas
            if (this.config.enableUsageQuotas) {
                const quotaExceeded = await this.checkUsageQuotas(session);
                if (quotaExceeded) {
                    await securityMonitor.logSecurityEvent('fake_call_quota_exceeded', {
                        userId,
                        dailyUsage: session.usageQuota.daily.used,
                        monthlyUsage: session.usageQuota.monthly.used
                    });
                    return false;
                }
            }

            await securityMonitor.logSecurityEvent('fake_call_pro_tier_validated', {
                userId,
                subscriptionStatus: session.subscriptionStatus
            });

            return true;

        } catch (error) {
            console.error('Pro tier validation error:', error);
            return false;
        }
    }

    /**
     * Get subscription status for user
     */
    async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
        try {
            const session = await this.getOrCreateAuthSession(userId);

            // Update subscription status if monitoring is enabled
            if (this.config.enableSubscriptionMonitoring) {
                await this.updateSubscriptionStatus(session);
            }

            return session.subscriptionStatus;
        } catch (error) {
            console.error('Failed to get subscription status:', error);
            return {
                isActive: false,
                tier: 'free',
                autoRenew: false,
                paymentMethod: 'unknown',
                trialUsed: false
            };
        }
    }

    /**
     * Log feature usage for analytics and quota management
     */
    async logFeatureUsage(userId: string, feature: string, metadata?: Record<string, any>): Promise<void> {
        try {
            if (!this.config.enableAuditLogging) return;

            const session = await this.getOrCreateAuthSession(userId);

            // Add to audit log
            const auditEntry = {
                timestamp: new Date(),
                feature,
                action: 'usage',
                metadata: metadata || {},
                subscriptionStatus: session.subscriptionStatus,
                usageAfter: {
                    daily: session.usageQuota.daily.used + 1,
                    monthly: session.usageQuota.monthly.used + 1
                }
            };

            this.addToAuditLog(userId, auditEntry);

            // Update usage quotas if applicable
            if (this.config.enableUsageQuotas && this.shouldCountTowardsQuota(feature)) {
                await this.incrementUsageCount(session, feature);
            }

            // Log to security monitor
            await securityMonitor.logSecurityEvent('fake_call_feature_used', {
                userId,
                feature,
                metadata,
                subscriptionTier: session.subscriptionStatus.tier
            });

        } catch (error) {
            console.error('Failed to log feature usage:', error);
        }
    }

    /**
     * Check feature limits and quotas
     */
    async checkFeatureLimit(userId: string, feature: string): Promise<FeatureLimitStatus> {
        try {
            const session = await this.getOrCreateAuthSession(userId);

            // Determine limits based on subscription tier
            const limits = this.getFeatureLimits(session.subscriptionStatus.tier);

            let currentUsage = 0;
            let limit = limits[feature] || 0;

            // Get current usage from audit logs
            const auditLog = this.getAuditLog(userId);
            const featureUsage = auditLog.filter(entry =>
                entry.feature === feature &&
                entry.action === 'usage' &&
                this.isWithinCurrentPeriod(entry.timestamp, 'daily')
            );
            currentUsage = featureUsage.length;

            return {
                allowed: currentUsage < limit,
                currentUsage,
                limit,
                resetAt: this.getNextResetTime('daily'),
                overageAllowed: session.subscriptionStatus.tier === 'enterprise'
            };

        } catch (error) {
            console.error('Failed to check feature limit:', error);
            return {
                allowed: false,
                currentUsage: 0,
                limit: 0,
                resetAt: new Date(),
                overageAllowed: false
            };
        }
    }

    /**
     * Validate call configuration and caller ID for Pro tier
     */
    async validateCallConfiguration(request: ProTierValidationRequest): Promise<FakeCallResult<{
        isValid: boolean;
        riskLevel: 'low' | 'medium' | 'high';
        warnings: string[];
        proFeatures: string[];
    }>> {
        try {
            const startTime = Date.now();
            const session = await this.getOrCreateAuthSession(request.userId);

            // Check Pro tier access
            const hasProAccess = await this.validateProTierAccess(request.userId);
            if (!hasProAccess) {
                return {
                    success: false,
                    error: this.createCallError(
                        CallErrorType.PRO_TIER_REQUIRED,
                        'Pro tier subscription required for this feature'
                    ),
                    metadata: {
                        timestamp: new Date(),
                        requestId: this.generateRequestId(),
                        duration: Date.now() - startTime,
                        platform: request.platform
                    }
                };
            }

            // Validate caller ID safety
            const callerValidation = await this.validateCallerIDSafety(request.callConfig.callerInfo);

            // Check Pro tier features availability
            const proFeatures = this.getAvailableProFeatures(session.subscriptionStatus);

            // Risk assessment
            const riskLevel = this.assessCallRisk(request.callConfig, session);

            const warnings: string[] = [];
            if (callerValidation.needsReview) {
                warnings.push('Caller ID requires manual review');
            }
            if (riskLevel === 'high') {
                warnings.push('High risk call configuration detected');
            }

            const result = {
                isValid: callerValidation.isSafe && riskLevel !== 'high',
                riskLevel,
                warnings,
                proFeatures
            };

            // Log validation
            await securityMonitor.logSecurityEvent('fake_call_config_validated', {
                userId: request.userId,
                callId: request.callConfig.callerInfo.id,
                riskLevel,
                proFeatures: proFeatures.length,
                warnings: warnings.length
            });

            return {
                success: true,
                data: result,
                metadata: {
                    timestamp: new Date(),
                    requestId: this.generateRequestId(),
                    duration: Date.now() - startTime,
                    platform: request.platform
                }
            };

        } catch (error) {
            console.error('Call configuration validation error:', error);
            return {
                success: false,
                error: this.createCallError(
                    CallErrorType.UNKNOWN_ERROR,
                    'Configuration validation failed'
                ),
                metadata: {
                    timestamp: new Date(),
                    requestId: this.generateRequestId(),
                    duration: Date.now() - Date.now(),
                    platform: request.platform
                }
            };
        }
    }

    /**
     * Get current usage statistics for user
     */
    async getUsageStatistics(userId: string): Promise<FakeCallResult<{
        dailyUsage: number;
        monthlyUsage: number;
        totalUsage: number;
        featureUsage: Record<string, number>;
        remainingQuota: {
            daily: number;
            monthly: number;
        };
    }>> {
        try {
            const session = await this.getOrCreateAuthSession(userId);
            const auditLog = this.getAuditLog(userId);

            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

            const dailyUsage = auditLog.filter(entry =>
                entry.timestamp >= startOfDay && this.shouldCountTowardsQuota(entry.feature)
            ).length;

            const monthlyUsage = auditLog.filter(entry =>
                entry.timestamp >= startOfMonth && this.shouldCountTowardsQuota(entry.feature)
            ).length;

            const totalUsage = auditLog.filter(entry =>
                this.shouldCountTowardsQuota(entry.feature)
            ).length;

            // Calculate feature usage breakdown
            const featureUsage: Record<string, number> = {};
            const usageEntries = auditLog.filter(entry =>
                this.shouldCountTowardsQuota(entry.feature) &&
                entry.timestamp >= startOfDay
            );

            for (const entry of usageEntries) {
                featureUsage[entry.feature] = (featureUsage[entry.feature] || 0) + 1;
            }

            return {
                success: true,
                data: {
                    dailyUsage,
                    monthlyUsage,
                    totalUsage,
                    featureUsage,
                    remainingQuota: {
                        daily: Math.max(0, session.usageQuota.daily.limit - dailyUsage),
                        monthly: Math.max(0, session.usageQuota.monthly.limit - monthlyUsage)
                    }
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: this.generateRequestId(),
                    duration: 0,
                    platform: Platform.OS
                }
            };

        } catch (error) {
            console.error('Failed to get usage statistics:', error);
            return {
                success: false,
                error: this.createCallError(
                    CallErrorType.UNKNOWN_ERROR,
                    'Failed to get usage statistics'
                ),
                metadata: {
                    timestamp: new Date(),
                    requestId: this.generateRequestId(),
                    duration: 0,
                    platform: Platform.OS
                }
            };
        }
    }

    /**
     * Dispose of authentication service
     */
    async dispose(): Promise<void> {
        try {
            // Clear subscription monitors
            this.subscriptionMonitors.forEach(interval => clearInterval(interval));
            this.subscriptionMonitors.clear();

            // Save active sessions
            await this.saveActiveSessions();

            // Clear memory
            this.activeSessions.clear();
            this.auditLogs.clear();

            await securityMonitor.logSecurityEvent('fake_call_auth_disposed', {
                sessionsClosed: this.activeSessions.size,
                auditLogsCleared: this.auditLogs.size
            });

            console.log('🔐 FakeCall Authentication Service disposed');
        } catch (error) {
            console.error('Error disposing FakeCall Authentication Service:', error);
        }
    }

    /**
     * Private helper methods
     */
    private async getOrCreateAuthSession(userId: string): Promise<FakeCallAuthSession> {
        let session = this.activeSessions.get(userId);

        if (!session) {
            // Create new session
            const subscriptionStatus = await this.getSubscriptionFromStorage(userId);
            session = await this.createAuthSession(userId, subscriptionStatus);

            this.activeSessions.set(userId, session);
            await this.saveSessionToStorage(session);
        }

        // Update last validated time
        session.lastValidated = new Date();

        return session;
    }

    private async createAuthSession(userId: string, subscriptionStatus: SubscriptionStatus): Promise<FakeCallAuthSession> {
        const usageLimits = this.getUsageLimits(subscriptionStatus.tier);

        return {
            sessionId: this.generateSessionId(),
            userId,
            isProTier: subscriptionStatus.tier !== 'free',
            subscriptionStatus,
            usageQuota: {
                daily: {
                    used: 0,
                    limit: usageLimits.daily,
                    resetAt: this.getNextResetTime('daily')
                },
                monthly: {
                    used: 0,
                    limit: usageLimits.monthly,
                    resetAt: this.getNextResetTime('monthly')
                }
            },
            featureAccess: {
                customCallerId: subscriptionStatus.tier !== 'free',
                advancedVoices: subscriptionStatus.tier === 'pro' || subscriptionStatus.tier === 'enterprise',
                extendedScheduling: subscriptionStatus.tier === 'pro' || subscriptionStatus.tier === 'enterprise',
                prioritySupport: subscriptionStatus.tier === 'pro' || subscriptionStatus.tier === 'enterprise',
                analytics: subscriptionStatus.tier === 'enterprise',
                teamCollaboration: subscriptionStatus.tier === 'enterprise'
            },
            permissions: {
                microphone: true,
                notifications: true,
                calls: true,
                background: true,
                accessibility: true
            },
            lastValidated: new Date(),
            auditEnabled: this.config.enableAuditLogging
        };
    }

    private async validateSubscriptionStatus(status: SubscriptionStatus): Promise<boolean> {
        // Check if subscription is active
        if (!status.isActive) {
            return false;
        }

        // Check expiration
        if (status.expiresAt && new Date() > status.expiresAt) {
            // Check grace period
            const now = new Date();
            const graceEnd = new Date(status.gracePeriod || now);
            return now <= graceEnd;
        }

        return true;
    }

    private getUsageLimits(tier: 'free' | 'pro' | 'enterprise'): { daily: number; monthly: number } {
        switch (tier) {
            case 'pro':
                return {
                    daily: 50,
                    monthly: 1000
                };
            case 'enterprise':
                return {
                    daily: 200,
                    monthly: 5000
                };
            default:
                return {
                    daily: 5,
                    monthly: 50
                };
        }
    }

    private getFeatureLimits(tier: 'free' | 'pro' | 'enterprise'): Record<string, number> {
        const base = {
            daily_calls: this.getUsageLimits(tier).daily,
            custom_voice_profiles: tier === 'free' ? 1 : tier === 'pro' ? 5 : -1, // unlimited
            scheduled_calls: this.getUsageLimits(tier).daily,
            caller_id_customization: tier === 'free' ? 0 : 1
        };

        return base;
    }

    private getAvailableProFeatures(status: SubscriptionStatus): string[] {
        const features: string[] = [];

        if (status.tier !== 'free') {
            features.push('custom_caller_id');
            features.push('voice_profiles');
            features.push('advanced_scheduling');
        }

        if (status.tier === 'pro' || status.tier === 'enterprise') {
            features.push('extended_limits');
            features.push('priority_support');
            features.push('analytics');
        }

        if (status.tier === 'enterprise') {
            features.push('team_collaboration');
            features.push('custom_integrations');
            features.push('white_label');
        }

        return features;
    }

    private async validateCallerIDSafety(callerInfo: CallerInfo): Promise<{
        isSafe: boolean;
        needsReview: boolean;
        riskLevel: 'low' | 'medium' | 'high';
        reasons: string[];
    }> {
        // Check if caller ID is from safe database
        const isFromSafeDatabase = await this.checkSafeDatabase(callerInfo.name, callerInfo.phoneNumber);

        // Check for suspicious patterns
        const suspiciousPatterns = await this.checkSuspiciousPatterns(callerInfo);

        // Validate phone number format
        const phoneValidation = await this.validatePhoneNumber(callerInfo.phoneNumber);

        const reasons: string[] = [];
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        let needsReview = false;

        if (!isFromSafeDatabase) {
            reasons.push('Caller ID not in verified database');
            riskLevel = 'medium';
        }

        if (suspiciousPatterns.length > 0) {
            reasons.push(`Suspicious patterns detected: ${suspiciousPatterns.join(', ')}`);
            riskLevel = 'high';
            needsReview = true;
        }

        if (!phoneValidation.isValid) {
            reasons.push('Invalid phone number format');
            riskLevel = 'high';
        }

        return {
            isSafe: riskLevel !== 'high' && phoneValidation.isValid,
            needsReview,
            riskLevel,
            reasons
        };
    }

    private assessCallRisk(config: FakeCallConfig, session: FakeCallAuthSession): 'low' | 'medium' | 'high' {
        let riskScore = 0;

        // Check caller type
        if (config.callerInfo.callerType === 'emergency') {
            riskScore += 30;
        }

        // Check auto-answer setting
        if (config.autoAnswer) {
            riskScore += 20;
        }

        // Check duration
        if (config.callDuration > 300) { // 5 minutes
            riskScore += 15;
        }

        // Check for custom caller ID
        if (!session.featureAccess.customCallerId) {
            riskScore += 25;
        }

        // Convert score to risk level
        if (riskScore >= 50) return 'high';
        if (riskScore >= 25) return 'medium';
        return 'low';
    }

    private shouldCountTowardsQuota(feature: string): boolean {
        const quotaFeatures = [
            'schedule_call',
            'answer_call',
            'custom_caller_id',
            'voice_synthesis',
            'advanced_scheduling'
        ];
        return quotaFeatures.includes(feature);
    }

    private async incrementUsageCount(session: FakeCallAuthSession, feature: string): Promise<void> {
        if (!this.shouldCountTowardsQuota(feature)) return;

        session.usageQuota.daily.used++;
        session.usageQuota.monthly.used++;
    }

    private async checkUsageQuotas(session: FakeCallAuthSession): Promise<boolean> {
        return session.usageQuota.daily.used >= session.usageQuota.daily.limit ||
            session.usageQuota.monthly.used >= session.usageQuota.monthly.limit;
    }

    private getNextResetTime(period: 'daily' | 'monthly'): Date {
        const now = new Date();

        if (period === 'daily') {
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            return tomorrow;
        } else {
            const nextMonth = new Date(now);
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            nextMonth.setHours(0, 0, 0, 0);
            return nextMonth;
        }
    }

    private isWithinCurrentPeriod(timestamp: Date, period: 'daily' | 'monthly'): boolean {
        const now = new Date();

        if (period === 'daily') {
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            return timestamp >= startOfDay;
        } else {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            return timestamp >= startOfMonth;
        }
    }

    private addToAuditLog(userId: string, entry: any): void {
        const userLog = this.auditLogs.get(userId) || [];
        userLog.push(entry);

        // Keep only last 1000 entries per user
        if (userLog.length > 1000) {
            userLog.splice(0, userLog.length - 1000);
        }

        this.auditLogs.set(userId, userLog);
    }

    private getAuditLog(userId: string): any[] {
        return this.auditLogs.get(userId) || [];
    }

    private async checkSafeDatabase(name: string, phoneNumber: string): Promise<boolean> {
        // In production, would check against comprehensive safe database
        // For now, basic validation
        return name.length > 0 && phoneNumber.length > 0;
    }

    private async checkSuspiciousPatterns(callerInfo: CallerInfo): Promise<string[]> {
        const patterns: string[] = [];

        // Check for obviously fake patterns
        if (callerInfo.name.match(/\d/)) {
            patterns.push('name_contains_numbers');
        }

        if (callerInfo.phoneNumber.match(/(\d)\1{6,}/)) {
            patterns.push('repeated_digits');
        }

        return patterns;
    }

    private async validatePhoneNumber(phoneNumber: string): Promise<{ isValid: boolean }> {
        // Basic phone number validation
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

        return {
            isValid: phoneRegex.test(cleaned) && cleaned.length >= 7
        };
    }

    private async getSubscriptionFromStorage(userId: string): Promise<SubscriptionStatus> {
        try {
            const stored = await AsyncStorage.getItem(`subscription_${userId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                // Convert date strings back to Date objects
                if (parsed.expiresAt) parsed.expiresAt = new Date(parsed.expiresAt);
                if (parsed.gracePeriod) parsed.gracePeriod = new Date(parsed.gracePeriod);
                return parsed;
            }
        } catch (error) {
            console.error('Failed to load subscription from storage:', error);
        }

        // Default subscription (free tier)
        return {
            isActive: false,
            tier: 'free',
            autoRenew: false,
            paymentMethod: 'unknown',
            trialUsed: false
        };
    }

    private async updateSubscriptionStatus(session: FakeCallAuthSession): Promise<void> {
        // In production, would fetch fresh status from subscription service
        // For now, just validate existing status
        session.isProTier = await this.validateSubscriptionStatus(session.subscriptionStatus);
    }

    private startSubscriptionMonitoring(): void {
        // Monitor all active Pro users for subscription changes
        this.activeSessions.forEach((session, userId) => {
            if (session.subscriptionStatus.isActive && session.subscriptionStatus.tier !== 'free') {
                const monitor = setInterval(async () => {
                    await this.updateSubscriptionStatus(session);

                    if (!session.isProTier) {
                        await securityMonitor.logSecurityEvent('fake_call_subscription_expired', {
                            userId,
                            subscriptionStatus: session.subscriptionStatus
                        });
                    }
                }, this.config.subscriptionCheckInterval * 60 * 1000);

                this.subscriptionMonitors.set(userId, monitor);
            }
        });
    }

    private async initializePrivacyCompliance(): Promise<void> {
        // Initialize privacy manager for GDPR/CCPA compliance
        try {
            const privacySettings = privacyManager.getPrivacySettings();
            console.log('🔒 Privacy settings loaded:', privacySettings);
        } catch (error) {
            console.error('Failed to initialize privacy compliance:', error);
        }
    }

    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private generateSessionId(): string {
        return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private createCallError(type: CallErrorType, message: string): CallError {
        return {
            type,
            code: type,
            message,
            recoverable: false,
            suggestedAction: 'Contact support if issue persists',
            timestamp: new Date(),
            callId: '',
            userId: ''
        };
    }

    private async loadActiveSessions(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('fake_call_active_sessions');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.activeSessions = new Map(parsed.map(([userId, session]: [string, any]) => [
                    userId,
                    {
                        ...session,
                        lastValidated: new Date(session.lastValidated),
                        usageQuota: {
                            daily: { ...session.usageQuota.daily, resetAt: new Date(session.usageQuota.daily.resetAt) },
                            monthly: { ...session.usageQuota.monthly, resetAt: new Date(session.usageQuota.monthly.resetAt) }
                        }
                    }
                ]));
            }
        } catch (error) {
            console.error('Failed to load active sessions:', error);
        }
    }

    private async saveActiveSessions(): Promise<void> {
        try {
            const sessionsArray = Array.from(this.activeSessions.entries());
            const serializable = sessionsArray.map(([userId, session]) => [
                userId,
                {
                    ...session,
                    lastValidated: session.lastValidated.toISOString(),
                    usageQuota: {
                        daily: { ...session.usageQuota.daily, resetAt: session.usageQuota.daily.resetAt.toISOString() },
                        monthly: { ...session.usageQuota.monthly, resetAt: session.usageQuota.monthly.resetAt.toISOString() }
                    }
                }
            ]);

            await AsyncStorage.setItem('fake_call_active_sessions', JSON.stringify(serializable));
        } catch (error) {
            console.error('Failed to save active sessions:', error);
        }
    }

    private async saveSessionToStorage(session: FakeCallAuthSession): Promise<void> {
        try {
            const key = `fake_call_session_${session.userId}`;
            const serializable = {
                ...session,
                lastValidated: session.lastValidated.toISOString(),
                usageQuota: {
                    daily: { ...session.usageQuota.daily, resetAt: session.usageQuota.daily.resetAt.toISOString() },
                    monthly: { ...session.usageQuota.monthly, resetAt: session.usageQuota.monthly.resetAt.toISOString() }
                }
            };

            await AsyncStorage.setItem(key, JSON.stringify(serializable));
        } catch (error) {
            console.error('Failed to save session to storage:', error);
        }
    }
}

// Export singleton instance
export const fakeCallAuthService = new FakeCallAuthenticationService();