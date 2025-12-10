/**
 * Privacy Management Service
 * GDPR/CCPA compliance and privacy-by-design framework
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase } from '../Supabase/supabase';
import { EncryptionService } from './EncryptionService';
import { SecurityMonitor } from './SecurityMonitor';

export interface PrivacySettings {
    analyticsEnabled: boolean;
    marketingEnabled: boolean;
    dataRetentionDays: number;
    consentTimestamp: Date | null;
    withdrawalTimestamp: Date | null;
    region: string;
    gdprCompliant: boolean;
    ccpaCompliant: boolean;
}

export interface ConsentRecord {
    id: string;
    userId: string;
    consentType: 'essential' | 'analytics' | 'marketing' | 'personalization';
    granted: boolean;
    timestamp: Date;
    ipAddress: string;
    userAgent: string;
    purpose: string;
    retentionPeriod: number;
}

export interface DataSubject {
    userId: string;
    email: string;
    personalData: Record<string, any>;
    consentRecords: ConsentRecord[];
    lastProcessed: Date;
    deletionScheduled?: Date;
    exportGenerated?: Date;
}

export interface PrivacyAuditLog {
    id: string;
    timestamp: Date;
    action: 'consent_granted' | 'consent_withdrawn' | 'data_exported' | 'data_deleted' | 'data_accessed';
    userId: string;
    dataTypes: string[];
    complianceStatus: 'compliant' | 'pending' | 'violation';
    auditTrail: any;
}

export class PrivacyManager {
    private privacySettings: PrivacySettings;
    private encryptionService: EncryptionService;
    private securityMonitor: SecurityMonitor;
    private consentRecords: Map<string, ConsentRecord[]> = new Map();
    private auditLogs: PrivacyAuditLog[] = [];

    constructor() {
        this.privacySettings = {
            analyticsEnabled: false,
            marketingEnabled: false,
            dataRetentionDays: 365, // Default 1 year
            consentTimestamp: null,
            withdrawalTimestamp: null,
            region: this.detectRegion(),
            gdprCompliant: true,
            ccpaCompliant: true
        };
        this.encryptionService = new EncryptionService();
        this.securityMonitor = new SecurityMonitor();
    }

    /**
     * Initialize privacy manager and load user settings
     */
    async initialize(userId: string): Promise<void> {
        try {
            // Load privacy settings from storage/database
            await this.loadPrivacySettings(userId);

            // Set up consent management
            await this.initializeConsentManagement(userId);

            // Schedule data cleanup tasks
            await this.scheduleDataCleanup(userId);

            await this.securityMonitor.logSecurityEvent('privacy_manager_initialized', {
                userId,
                region: this.privacySettings.region,
                gdprCompliant: this.privacySettings.gdprCompliant
            });

        } catch (error) {
            console.error('Failed to initialize privacy manager:', error);
            throw new Error('Privacy manager initialization failed');
        }
    }

    /**
     * Record user consent for specific data processing
     */
    async recordConsent(
        userId: string,
        consentData: {
            consentType: 'essential' | 'analytics' | 'marketing' | 'personalization';
            granted: boolean;
            purpose: string;
            retentionPeriod: number;
        }
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Validate consent data
            const validation = this.validateConsentData(consentData);
            if (!validation.valid) {
                return { success: false, error: validation.error };
            }

            // Create consent record
            const consentRecord: ConsentRecord = {
                id: this.generateConsentId(),
                userId,
                consentType: consentData.consentType,
                granted: consentData.granted,
                timestamp: new Date(),
                ipAddress: await this.getDeviceInfo('ip') || 'unknown',
                userAgent: await this.getDeviceInfo('userAgent') || 'unknown',
                purpose: consentData.purpose,
                retentionPeriod: consentData.retentionPeriod
            };

            // Store consent record
            const userConsents = this.consentRecords.get(userId) || [];
            userConsents.push(consentRecord);
            this.consentRecords.set(userId, userConsents);

            // Store securely
            await this.storeConsentRecord(userId, consentRecord);

            // Update privacy settings
            await this.updatePrivacySettingsFromConsent(userId, consentData);

            // Log audit event
            await this.logPrivacyAction('consent_granted', userId, [consentData.consentType]);

            // Update local settings
            this.privacySettings.consentTimestamp = new Date();
            this.privacySettings.marketingEnabled = consentData.consentType === 'marketing' ? consentData.granted : this.privacySettings.marketingEnabled;
            this.privacySettings.analyticsEnabled = consentData.consentType === 'analytics' ? consentData.granted : this.privacySettings.analyticsEnabled;

            await this.securityMonitor.logSecurityEvent('privacy_consent_recorded', {
                userId,
                consentType: consentData.consentType,
                granted: consentData.granted,
                purpose: consentData.purpose
            });

            return { success: true };

        } catch (error) {
            console.error('Failed to record consent:', error);
            await this.securityMonitor.logSecurityEvent('privacy_consent_failed', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return { success: false, error: 'Failed to record consent' };
        }
    }

    /**
     * Withdraw consent for specific data processing
     */
    async withdrawConsent(
        userId: string,
        consentType: 'essential' | 'analytics' | 'marketing' | 'personalization'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Essential consent cannot be withdrawn
            if (consentType === 'essential') {
                return { success: false, error: 'Essential consent cannot be withdrawn' };
            }

            // Create withdrawal record
            const withdrawalRecord: ConsentRecord = {
                id: this.generateConsentId(),
                userId,
                consentType,
                granted: false,
                timestamp: new Date(),
                ipAddress: await this.getDeviceInfo('ip') || 'unknown',
                userAgent: await this.getDeviceInfo('userAgent') || 'unknown',
                purpose: 'Consent withdrawal',
                retentionPeriod: 0
            };

            // Store withdrawal record
            const userConsents = this.consentRecords.get(userId) || [];
            userConsents.push(withdrawalRecord);
            this.consentRecords.set(userId, userConsents);

            await this.storeConsentRecord(userId, withdrawalRecord);

            // Update privacy settings
            if (consentType === 'marketing') {
                this.privacySettings.marketingEnabled = false;
            } else if (consentType === 'analytics') {
                this.privacySettings.analyticsEnabled = false;
            }

            this.privacySettings.withdrawalTimestamp = new Date();

            // Immediately stop data processing for withdrawn consent
            await this.stopDataProcessing(userId, consentType);

            // Log audit event
            await this.logPrivacyAction('consent_withdrawn', userId, [consentType]);

            await this.securityMonitor.logSecurityEvent('privacy_consent_withdrawn', {
                userId,
                consentType
            });

            return { success: true };

        } catch (error) {
            console.error('Failed to withdraw consent:', error);
            return { success: false, error: 'Failed to withdraw consent' };
        }
    }

    /**
     * Export user data for data portability (GDPR Article 20)
     */
    async exportUserData(userId: string): Promise<{
        success: boolean;
        data?: any;
        error?: string;
    }> {
        try {
            // Check if data export is allowed
            const canExport = await this.checkDataExportCompliance(userId);
            if (!canExport.allowed) {
                return { success: false, error: canExport.reason };
            }

            // Collect all user data
            const userData = await this.collectUserData(userId);

            // Create export package
            const exportPackage = {
                userId,
                exportTimestamp: new Date(),
                privacySettings: this.privacySettings,
                consentRecords: await this.getConsentRecords(userId),
                personalData: userData,
                metadata: {
                    exportFormat: 'JSON',
                    schema: 'GDPR_Article_20_Compliant',
                    version: '1.0'
                }
            };

            // Encrypt export data
            const encryptedExport = await this.encryptionService.encrypt(JSON.stringify(exportPackage));

            // Store export record
            await this.storeDataExportRecord(userId, exportPackage);

            // Log audit event
            await this.logPrivacyAction('data_exported', userId, ['all']);

            await this.securityMonitor.logSecurityEvent('privacy_data_exported', {
                userId,
                dataTypes: Object.keys(userData).length
            });

            return {
                success: true,
                data: encryptedExport
            };

        } catch (error) {
            console.error('Data export failed:', error);
            await this.securityMonitor.logSecurityEvent('privacy_data_export_failed', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                success: false,
                error: 'Data export failed'
            };
        }
    }

    /**
     * Delete user data (Right to Erasure - GDPR Article 17)
     */
    async deleteUserData(userId: string, deletionType: 'partial' | 'complete' = 'partial'): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // Check deletion compliance
            const canDelete = await this.checkDataDeletionCompliance(userId, deletionType);
            if (!canDelete.allowed) {
                return { success: false, error: canDelete.reason };
            }

            if (deletionType === 'complete') {
                // Complete data deletion
                await this.performCompleteDataDeletion(userId);
                await this.clearAllUserData(userId);
            } else {
                // Partial deletion (remove only non-essential data)
                await this.performPartialDataDeletion(userId);
            }

            // Log audit event
            await this.logPrivacyAction('data_deleted', userId, [deletionType]);

            await this.securityMonitor.logSecurityEvent('privacy_data_deleted', {
                userId,
                deletionType
            });

            return { success: true };

        } catch (error) {
            console.error('Data deletion failed:', error);
            await this.securityMonitor.logSecurityEvent('privacy_data_deletion_failed', {
                userId,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return { success: false, error: 'Data deletion failed' };
        }
    }

    /**
     * Get current privacy settings
     */
    getPrivacySettings(): PrivacySettings {
        return { ...this.privacySettings };
    }

    /**
     * Update privacy settings
     */
    async updatePrivacySettings(userId: string, updates: Partial<PrivacySettings>): Promise<void> {
        this.privacySettings = { ...this.privacySettings, ...updates };
        await this.storePrivacySettings(userId);
    }

    /**
     * Update privacy settings from consent data
     */
    private async updatePrivacySettingsFromConsent(userId: string, consentData: any): Promise<void> {
        const updates: Partial<PrivacySettings> = {};

        if (consentData.consentType === 'analytics') {
            updates.analyticsEnabled = consentData.granted;
        } else if (consentData.consentType === 'marketing') {
            updates.marketingEnabled = consentData.granted;
        }

        await this.updatePrivacySettings(userId, updates);
    }

    /**
     * Get consent records for user
     */
    async getConsentRecords(userId: string): Promise<ConsentRecord[]> {
        const userConsents = this.consentRecords.get(userId) || [];
        const storedConsents = await this.loadConsentRecords(userId);

        // Merge and deduplicate
        const allConsents = [...userConsents, ...storedConsents];
        const uniqueConsents = allConsents.filter((consent, index, self) =>
            index === self.findIndex(c => c.id === consent.id)
        );

        return uniqueConsents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    }

    /**
     * Generate privacy audit report
     */
    async generateAuditReport(userId: string, dateRange?: { from: Date; to: Date }): Promise<{
        success: boolean;
        report?: any;
        error?: string;
    }> {
        try {
            // Filter audit logs for date range
            let filteredLogs = this.auditLogs.filter(log => log.userId === userId);

            if (dateRange) {
                filteredLogs = filteredLogs.filter(log =>
                    log.timestamp >= dateRange.from && log.timestamp <= dateRange.to
                );
            }

            // Generate compliance status
            const complianceStatus = this.assessComplianceStatus(filteredLogs);

            // Generate report
            const auditReport = {
                userId,
                reportGenerated: new Date(),
                dateRange: dateRange || { from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), to: new Date() },
                auditLogs: filteredLogs,
                complianceStatus,
                summary: {
                    totalActions: filteredLogs.length,
                    consentChanges: filteredLogs.filter(log => log.action.includes('consent')).length,
                    dataExports: filteredLogs.filter(log => log.action === 'data_exported').length,
                    dataDeletions: filteredLogs.filter(log => log.action === 'data_deleted').length
                }
            };

            return { success: true, report: auditReport };

        } catch (error) {
            console.error('Failed to generate audit report:', error);
            return { success: false, error: 'Failed to generate audit report' };
        }
    }

    /**
     * Private helper methods
     */
    private detectRegion(): string {
        // In production, this would detect user's actual region
        // For now, return a default
        return 'EU'; // Default to GDPR jurisdiction
    }

    private validateConsentData(consentData: any): { valid: boolean; error?: string } {
        const validTypes = ['essential', 'analytics', 'marketing', 'personalization'];

        if (!validTypes.includes(consentData.consentType)) {
            return { valid: false, error: 'Invalid consent type' };
        }

        if (typeof consentData.granted !== 'boolean') {
            return { valid: false, error: 'Consent must be boolean' };
        }

        if (!consentData.purpose || consentData.purpose.length < 10) {
            return { valid: false, error: 'Purpose must be clearly stated (min 10 characters)' };
        }

        if (consentData.retentionPeriod <= 0) {
            return { valid: false, error: 'Retention period must be positive' };
        }

        return { valid: true };
    }

    private generateConsentId(): string {
        return `consent_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private async getDeviceInfo(infoType: 'ip' | 'userAgent'): Promise<string | undefined> {
        // In production, get actual device info
        return infoType === 'ip' ? '192.168.1.100' : 'OffScreenBuddy/1.0.0';
    }

    private async initializeConsentManagement(userId: string): Promise<void> {
        // Load existing consent records
        const existingConsents = await this.loadConsentRecords(userId);
        this.consentRecords.set(userId, existingConsents);
    }

    private async scheduleDataCleanup(userId: string): Promise<void> {
        // Schedule automatic data cleanup based on retention policy
        const cleanupInterval = this.privacySettings.dataRetentionDays * 24 * 60 * 60 * 1000;

        setInterval(async () => {
            await this.performScheduledDataCleanup(userId);
        }, cleanupInterval);
    }

    private async loadPrivacySettings(userId: string): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem(`privacy_settings_${userId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.privacySettings = { ...this.privacySettings, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load privacy settings:', error);
        }
    }

    private async storePrivacySettings(userId: string): Promise<void> {
        try {
            await AsyncStorage.setItem(`privacy_settings_${userId}`, JSON.stringify(this.privacySettings));
        } catch (error) {
            console.error('Failed to store privacy settings:', error);
        }
    }

    private async storeConsentRecord(userId: string, record: ConsentRecord): Promise<void> {
        try {
            const records = await this.loadConsentRecords(userId);
            records.push(record);
            await AsyncStorage.setItem(`consent_records_${userId}`, JSON.stringify(records));
        } catch (error) {
            console.error('Failed to store consent record:', error);
        }
    }

    private async loadConsentRecords(userId: string): Promise<ConsentRecord[]> {
        try {
            const stored = await AsyncStorage.getItem(`consent_records_${userId}`);
            if (stored) {
                return JSON.parse(stored).map((record: any) => ({
                    ...record,
                    timestamp: new Date(record.timestamp)
                }));
            }
        } catch (error) {
            console.error('Failed to load consent records:', error);
        }
        return [];
    }

    private async stopDataProcessing(userId: string, consentType: string): Promise<void> {
        // Immediately stop processing data for withdrawn consent
        console.log(`🛑 Stopping ${consentType} data processing for user ${userId}`);

        // In production, would update analytics services, marketing platforms, etc.
    }

    private async collectUserData(userId: string): Promise<Record<string, any>> {
        // Collect all user data from various sources
        const userData: Record<string, any> = {};

        try {
            // Get user profile data
            // const { data: profile } = await supabase.from('users').select('*').eq('id', userId).single();
            // userData.profile = profile;

            // Get session data
            // const { data: sessions } = await supabase.from('user_sessions').select('*').eq('user_id', userId);
            // userData.sessions = sessions;

            // Get analytics data
            // const { data: analytics } = await supabase.from('user_analytics').select('*').eq('user_id', userId);
            // userData.analytics = analytics;

            // Get consent records
            const consentRecords = await this.getConsentRecords(userId);
            userData.consentRecords = consentRecords;

            // Get privacy settings
            userData.privacySettings = this.privacySettings;

        } catch (error) {
            console.error('Failed to collect user data:', error);
        }

        return userData;
    }

    private async checkDataExportCompliance(userId: string): Promise<{ allowed: boolean; reason?: string }> {
        // Check if user has necessary consents for data export
        const consentRecords = await this.getConsentRecords(userId);

        // Data export requires at least essential consent
        const essentialConsent = consentRecords.find(c => c.consentType === 'essential' && c.granted);
        if (!essentialConsent) {
            return { allowed: false, reason: 'Essential consent required for data export' };
        }

        return { allowed: true };
    }

    private async storeDataExportRecord(userId: string, exportData: any): Promise<void> {
        // Store record of data export for audit purposes
        await AsyncStorage.setItem(`data_export_${userId}_${Date.now()}`, JSON.stringify(exportData));
    }

    private async checkDataDeletionCompliance(userId: string, deletionType: string): Promise<{ allowed: boolean; reason?: string }> {
        // Check legal requirements for data deletion
        if (deletionType === 'complete') {
            // Check for ongoing legal obligations
            // In production, would check against legal holds, ongoing investigations, etc.
        }

        return { allowed: true };
    }

    private async performCompleteDataDeletion(userId: string): Promise<void> {
        // Delete all user data
        console.log(`🗑️ Performing complete data deletion for user ${userId}`);

        // Clear local storage
        await AsyncStorage.clear();

        // In production, would delete from all databases and services
    }

    private async performPartialDataDeletion(userId: string): Promise<void> {
        // Delete only non-essential data
        console.log(`🗑️ Performing partial data deletion for user ${userId}`);

        // Keep essential data, remove analytics, marketing data, etc.
        const keysToRemove = [
            `analytics_${userId}`,
            `marketing_${userId}`,
            `personalization_${userId}`
        ];

        for (const key of keysToRemove) {
            await AsyncStorage.removeItem(key);
        }
    }

    private async clearAllUserData(userId: string): Promise<void> {
        // Clear all data for user
        const allKeys = await AsyncStorage.getAllKeys();
        const userKeys = allKeys.filter(key => key.includes(userId));

        for (const key of userKeys) {
            await AsyncStorage.removeItem(key);
        }
    }

    private async performScheduledDataCleanup(userId: string): Promise<void> {
        // Clean up data based on retention policy
        console.log(`🧹 Performing scheduled data cleanup for user ${userId}`);

        const cutoffDate = new Date(Date.now() - this.privacySettings.dataRetentionDays * 24 * 60 * 60 * 1000);

        // Clean up old audit logs
        this.auditLogs = this.auditLogs.filter(log => log.timestamp > cutoffDate);

        // Clean up old consent records
        const userConsents = this.consentRecords.get(userId) || [];
        const validConsents = userConsents.filter(consent => consent.timestamp > cutoffDate);
        this.consentRecords.set(userId, validConsents);
    }

    private async logPrivacyAction(
        action: PrivacyAuditLog['action'],
        userId: string,
        dataTypes: string[]
    ): Promise<void> {
        const auditLog: PrivacyAuditLog = {
            id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            timestamp: new Date(),
            action,
            userId,
            dataTypes,
            complianceStatus: 'compliant',
            auditTrail: {}
        };

        this.auditLogs.push(auditLog);

        // Keep only recent audit logs in memory
        if (this.auditLogs.length > 1000) {
            this.auditLogs = this.auditLogs.slice(-1000);
        }
    }

    private assessComplianceStatus(logs: PrivacyAuditLog[]): string {
        const violations = logs.filter(log => log.complianceStatus === 'violation');
        const pending = logs.filter(log => log.complianceStatus === 'pending');

        if (violations.length > 0) {
            return 'violation';
        } else if (pending.length > 0) {
            return 'pending';
        } else {
            return 'compliant';
        }
    }
}

// Export singleton instance
export const privacyManager = new PrivacyManager();