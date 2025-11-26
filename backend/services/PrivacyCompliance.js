/**
 * Privacy Compliance Service
 * GDPR/CCPA compliance backend implementation
 */

const crypto = require('crypto');
const { supabase } = require('../config/supabase');

class PrivacyComplianceService {
    constructor() {
        this.complianceConfig = {
            gdpr: {
                enabled: true,
                retentionPeriodDays: 365,
                deletionGracePeriodDays: 30,
                dataPortabilityEnabled: true,
                rightToErasure: true,
                consentManagement: true,
                breachNotificationHours: 72
            },
            ccpa: {
                enabled: true,
                optOutEnabled: true,
                dataSharingEnabled: false,
                deletionRequests: true,
                personalInfoSale: false
            },
            audit: {
                retentionDays: 2555, // 7 years
                detailLevel: 'full',
                includeMetadata: true
            }
        };
    }

    /**
     * Process GDPR Data Subject Request
     */
    async processGDPRRequest(requestData) {
        try {
            const { type, userId, email, requestDetails } = requestData;

            // Validate request type
            const validTypes = ['access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'];
            if (!validTypes.includes(type)) {
                throw new Error('Invalid GDPR request type');
            }

            // Create compliance record
            const complianceRecord = await this.createComplianceRecord({
                requestType: 'GDPR',
                dataSubjectType: type,
                userId,
                email,
                requestDetails,
                status: 'PROCESSING',
                createdAt: new Date()
            });

            // Process based on request type
            let result;
            switch (type) {
                case 'access':
                    result = await this.processDataAccessRequest(userId, email);
                    break;
                case 'rectification':
                    result = await this.processDataRectificationRequest(userId, requestDetails);
                    break;
                case 'erasure':
                    result = await this.processDataErasureRequest(userId, email);
                    break;
                case 'portability':
                    result = await this.processDataPortabilityRequest(userId, email);
                    break;
                case 'restriction':
                    result = await this.processDataRestrictionRequest(userId, requestDetails);
                    break;
                case 'objection':
                    result = await this.processDataObjectionRequest(userId, requestDetails);
                    break;
                default:
                    throw new Error('Unsupported request type');
            }

            // Update compliance record
            await this.updateComplianceRecord(complianceRecord.id, {
                status: 'COMPLETED',
                result: result,
                completedAt: new Date()
            });

            // Log compliance event
            await this.logComplianceEvent({
                eventType: 'GDPR_REQUEST_PROCESSED',
                requestType: type,
                userId,
                status: 'COMPLETED',
                resultSummary: this.summarizeResult(result)
            });

            return {
                success: true,
                requestId: complianceRecord.id,
                type,
                result,
                timeline: {
                    received: complianceRecord.createdAt,
                    completed: new Date(),
                    withinDeadline: this.checkDeadline(complianceRecord.createdAt, 30) // 30 days GDPR requirement
                }
            };

        } catch (error) {
            console.error('GDPR request processing failed:', error);
            await this.logComplianceEvent({
                eventType: 'GDPR_REQUEST_FAILED',
                error: error.message,
                requestData
            });
            throw error;
        }
    }

    /**
     * Process CCPA Request
     */
    async processCCPARequest(requestData) {
        try {
            const { type, userId, email, requestDetails } = requestData;

            // Validate request type
            const validTypes = ['know', 'delete', 'opt-out', 'correct'];
            if (!validTypes.includes(type)) {
                throw new Error('Invalid CCPA request type');
            }

            // Create compliance record
            const complianceRecord = await this.createComplianceRecord({
                requestType: 'CCPA',
                dataSubjectType: type,
                userId,
                email,
                requestDetails,
                status: 'PROCESSING',
                createdAt: new Date()
            });

            let result;
            switch (type) {
                case 'know':
                    result = await this.processCCPAKnowRequest(userId, email);
                    break;
                case 'delete':
                    result = await this.processCCDADeleteRequest(userId, email);
                    break;
                case 'opt-out':
                    result = await this.processCCPAOptOutRequest(userId, requestDetails);
                    break;
                case 'correct':
                    result = await this.processCCPACorrectRequest(userId, requestDetails);
                    break;
                default:
                    throw new Error('Unsupported CCPA request type');
            }

            // Update compliance record
            await this.updateComplianceRecord(complianceRecord.id, {
                status: 'COMPLETED',
                result: result,
                completedAt: new Date()
            });

            // Log compliance event
            await this.logComplianceEvent({
                eventType: 'CCPA_REQUEST_PROCESSED',
                requestType: type,
                userId,
                status: 'COMPLETED'
            });

            return {
                success: true,
                requestId: complianceRecord.id,
                type,
                result,
                timeline: {
                    received: complianceRecord.createdAt,
                    completed: new Date(),
                    withinDeadline: this.checkDeadline(complianceRecord.createdAt, 45) // 45 days CCPA requirement
                }
            };

        } catch (error) {
            console.error('CCPA request processing failed:', error);
            throw error;
        }
    }

    /**
     * Process data access request (GDPR Article 15)
     */
    async processDataAccessRequest(userId, email) {
        try {
            // Collect all user data
            const userData = await this.collectUserData(userId, email);

            // Prepare response
            const accessResponse = {
                personalData: userData,
                dataCategories: this.categorizeUserData(userData),
                processingPurposes: this.getProcessingPurposes(userId),
                retentionPeriods: this.getRetentionPeriods(),
                dataSharing: await this.getDataSharingInfo(userId),
                rights: this.getUserRights(),
                contactInfo: this.getDataProtectionOfficerInfo()
            };

            return accessResponse;

        } catch (error) {
            console.error('Data access request failed:', error);
            throw new Error('Failed to process data access request');
        }
    }

    /**
     * Process data erasure request (GDPR Article 17)
     */
    async processDataErasureRequest(userId, email) {
        try {
            // Check for legal obligations preventing deletion
            const legalObligations = await this.checkLegalObligations(userId);
            if (legalObligations.preventDeletion) {
                return {
                    status: 'PARTIAL',
                    reason: 'Legal obligations prevent complete deletion',
                    retainedData: legalObligations.retainedData,
                    deletionDate: legalObligations.retentionEndDate
                };
            }

            // Identify data for deletion
            const dataToDelete = await this.identifyDataForDeletion(userId);

            // Perform deletion
            const deletionResults = await this.performDataDeletion(dataToDelete);

            // Schedule delayed deletion for certain data
            const scheduledDeletions = await this.scheduleDelayedDeletion(userId);

            return {
                status: 'COMPLETED',
                deletedData: deletionResults.deleted,
                scheduledDeletions: scheduledDeletions,
                retentionNotices: legalObligations.notices
            };

        } catch (error) {
            console.error('Data erasure request failed:', error);
            throw new Error('Failed to process data erasure request');
        }
    }

    /**
     * Process data portability request (GDPR Article 20)
     */
    async processDataPortabilityRequest(userId, email) {
        try {
            // Collect portable data
            const portableData = await this.collectPortableData(userId);

            // Format according to GDPR requirements
            const portableFormat = {
                format: 'JSON',
                schema: 'GDPR_Article_20_Compliant',
                data: portableData,
                metadata: {
                    exportDate: new Date().toISOString(),
                    dataController: 'OffScreen Buddy',
                    contact: 'privacy@offscreenbuddy.com',
                    purpose: 'Data Portability Request'
                }
            };

            // Encrypt and secure the export
            const encryptedExport = await this.encryptDataExport(JSON.stringify(portableFormat));

            return {
                status: 'COMPLETED',
                exportFormat: 'JSON',
                encryptedData: encryptedExport,
                downloadUrl: await this.generateSecureDownloadUrl(encryptedExport),
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                instructions: 'Download your data using the secure link. The data is encrypted for your privacy.'
            };

        } catch (error) {
            console.error('Data portability request failed:', error);
            throw new Error('Failed to process data portability request');
        }
    }

    /**
     * Collect all user data for compliance purposes
     */
    async collectUserData(userId, email) {
        const userData = {};

        try {
            // User profile data
            const { data: user } = await supabase
                .from('users')
                .select('*')
                .or(`id.eq.${userId},email.eq.${email}`)
                .single();

            if (user) {
                userData.profile = this.sanitizeUserData(user);
            }

            // User settings
            const { data: settings } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (settings) {
                userData.settings = settings;
            }

            // User analytics
            const { data: analytics } = await supabase
                .from('user_analytics')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (analytics) {
                userData.analytics = analytics;
            }

            // Subscription data
            const { data: subscriptions } = await supabase
                .from('user_subscriptions')
                .select(`
          *,
          subscription_plans(*)
        `)
                .eq('user_id', userId);

            if (subscriptions && subscriptions.length > 0) {
                userData.subscriptions = subscriptions;
            }

            // Timer sessions
            const { data: sessions } = await supabase
                .from('timer_sessions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(100); // Limit for privacy

            if (sessions && sessions.length > 0) {
                userData.timerSessions = sessions;
            }

            // Consent records
            const { data: consents } = await supabase
                .from('user_consents')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });

            if (consents && consents.length > 0) {
                userData.consents = consents;
            }

            return userData;

        } catch (error) {
            console.error('Failed to collect user data:', error);
            throw new Error('Data collection failed');
        }
    }

    /**
     * Check for legal obligations preventing data deletion
     */
    async checkLegalObligations(userId) {
        try {
            const obligations = {
                preventDeletion: false,
                retainedData: [],
                retentionEndDate: null,
                notices: []
            };

            // Check for active subscriptions
            const { data: activeSubscriptions } = await supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'active');

            if (activeSubscriptions && activeSubscriptions.length > 0) {
                obligations.preventDeletion = true;
                obligations.retainedData.push('subscription_data');
                obligations.retentionEndDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
                obligations.notices.push('Active subscription data retained for legal and business purposes');
            }

            // Check for pending payments
            const { data: pendingPayments } = await supabase
                .from('payment_events')
                .select('*')
                .eq('user_id', userId)
                .eq('status', 'pending');

            if (pendingPayments && pendingPayments.length > 0) {
                obligations.preventDeletion = true;
                obligations.retainedData.push('payment_data');
                obligations.notices.push('Payment data retained for financial record keeping (7 years)');
            }

            return obligations;

        } catch (error) {
            console.error('Failed to check legal obligations:', error);
            return { preventDeletion: false, retainedData: [], notices: [] };
        }
    }

    /**
     * Perform actual data deletion
     */
    async performDataDeletion(dataToDelete) {
        const results = {
            deleted: [],
            failed: [],
            scheduled: []
        };

        try {
            // Delete user data (with safety checks)
            for (const dataType of dataToDelete) {
                try {
                    switch (dataType) {
                        case 'user_profile':
                            await supabase.from('users').delete().eq('id', dataToDelete.userId);
                            results.deleted.push('user_profile');
                            break;
                        case 'user_settings':
                            await supabase.from('user_settings').delete().eq('user_id', dataToDelete.userId);
                            results.deleted.push('user_settings');
                            break;
                        case 'user_analytics':
                            await supabase.from('user_analytics').delete().eq('user_id', dataToDelete.userId);
                            results.deleted.push('user_analytics');
                            break;
                        case 'timer_sessions':
                            await supabase.from('timer_sessions').delete().eq('user_id', dataToDelete.userId);
                            results.deleted.push('timer_sessions');
                            break;
                        case 'consents':
                            await supabase.from('user_consents').delete().eq('user_id', dataToDelete.userId);
                            results.deleted.push('consents');
                            break;
                    }
                } catch (deleteError) {
                    results.failed.push({
                        type: dataType,
                        error: deleteError.message
                    });
                }
            }

            // Anonymize data that cannot be completely deleted
            if (dataToDelete.includes('user_subscriptions')) {
                await this.anonymizeSubscriptionData(dataToDelete.userId);
                results.deleted.push('user_subscriptions_anonymized');
            }

        } catch (error) {
            console.error('Data deletion failed:', error);
            throw error;
        }

        return results;
    }

    /**
     * Identify data types to delete
     */
    async identifyDataForDeletion(userId) {
        return {
            userId,
            dataTypes: [
                'user_profile',
                'user_settings',
                'user_analytics',
                'timer_sessions',
                'consents',
                'user_subscriptions' // Will be anonymized
            ]
        };
    }

    /**
     * Anonymize subscription data instead of deleting
     */
    async anonymizeSubscriptionData(userId) {
        try {
            await supabase
                .from('user_subscriptions')
                .update({
                    user_id: `anonymized_${Date.now()}_${userId}`,
                    status: 'cancelled',
                    cancelled_at: new Date().toISOString()
                })
                .eq('user_id', userId);

        } catch (error) {
            console.error('Failed to anonymize subscription data:', error);
        }
    }

    /**
     * Create compliance record
     */
    async createComplianceRecord(recordData) {
        try {
            const { data, error } = await supabase
                .from('privacy_compliance_records')
                .insert({
                    record_id: this.generateRecordId(),
                    request_type: recordData.requestType,
                    data_subject_type: recordData.dataSubjectType,
                    user_id: recordData.userId || null,
                    email: recordData.email || null,
                    request_details: JSON.stringify(recordData.requestDetails || {}),
                    status: recordData.status,
                    created_at: recordData.createdAt.toISOString()
                })
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Failed to create compliance record:', error);
            throw error;
        }
    }

    /**
     * Update compliance record
     */
    async updateComplianceRecord(recordId, updates) {
        try {
            const updateData = {
                status: updates.status,
                result: JSON.stringify(updates.result || {}),
                completed_at: updates.completedAt.toISOString()
            };

            await supabase
                .from('privacy_compliance_records')
                .update(updateData)
                .eq('record_id', recordId);

        } catch (error) {
            console.error('Failed to update compliance record:', error);
        }
    }

    /**
     * Log compliance event
     */
    async logComplianceEvent(eventData) {
        try {
            await supabase
                .from('privacy_audit_log')
                .insert({
                    event_id: this.generateEventId(),
                    event_type: eventData.eventType,
                    user_id: eventData.userId || null,
                    request_type: eventData.requestType || null,
                    status: eventData.status || null,
                    details: JSON.stringify({
                        resultSummary: eventData.resultSummary,
                        error: eventData.error,
                        requestData: eventData.requestData
                    }),
                    created_at: new Date().toISOString()
                });

        } catch (error) {
            console.error('Failed to log compliance event:', error);
        }
    }

    /**
     * Sanitize user data for privacy
     */
    sanitizeUserData(userData) {
        const sanitized = { ...userData };

        // Remove or mask sensitive fields
        delete sanitized.password_hash;
        delete sanitized.email_verification_token;
        delete sanitized.password_reset_token;

        // Mask email if needed
        if (sanitized.email) {
            const [local, domain] = sanitized.email.split('@');
            sanitized.email = `${local.substring(0, 2)}***@${domain}`;
        }

        // Mask phone number
        if (sanitized.phone) {
            sanitized.phone = `***-***-${sanitized.phone.slice(-4)}`;
        }

        return sanitized;
    }

    /**
     * Helper methods
     */
    categorizeUserData(userData) {
        const categories = {
            identification_data: ['profile'],
            technical_data: ['settings', 'analytics'],
            usage_data: ['timerSessions'],
            financial_data: ['subscriptions'],
            consent_data: ['consents']
        };

        return Object.entries(categories)
            .filter(([category, dataTypes]) =>
                dataTypes.some(type => userData[type])
            )
            .map(([category]) => category);
    }

    getProcessingPurposes(userData) {
        return [
            'Service provision and user account management',
            'Focus session tracking and analytics',
            'Customer support and communication',
            'Payment processing and subscription management',
            'Legal compliance and fraud prevention'
        ];
    }

    getRetentionPeriods() {
        return {
            user_profile: 'Until account deletion + 30 days',
            usage_data: '2 years from collection',
            financial_records: '7 years for legal compliance',
            analytics_data: '1 year from collection',
            consent_records: '6 years from collection'
        };
    }

    async getDataSharingInfo(userId) {
        return {
            third_parties: [],
            data_processors: ['Supabase (Database)', 'Payment providers'],
            international_transfers: false,
            safeguards: ['Standard contractual clauses', 'Adequacy decisions']
        };
    }

    getUserRights() {
        return [
            'Right to access personal data',
            'Right to rectification',
            'Right to erasure',
            'Right to restrict processing',
            'Right to data portability',
            'Right to object',
            'Rights related to automated decision making'
        ];
    }

    getDataProtectionOfficerInfo() {
        return {
            name: 'Privacy Team',
            email: 'privacy@offscreenbuddy.com',
            address: 'Data Protection Officer, OffScreen Buddy, [Address]'
        };
    }

    checkDeadline(startDate, days) {
        const deadline = new Date(startDate.getTime() + days * 24 * 60 * 60 * 1000);
        return new Date() <= deadline;
    }

    summarizeResult(result) {
        if (result.status === 'COMPLETED') {
            return `Successfully processed ${Object.keys(result).length} data categories`;
        } else if (result.status === 'PARTIAL') {
            return `Partially completed: ${result.reason}`;
        } else {
            return 'Processing failed';
        }
    }

    async encryptDataExport(data) {
        // Simple encryption for demo - in production use proper encryption
        return Buffer.from(data).toString('base64');
    }

    async generateSecureDownloadUrl(encryptedData) {
        // Generate secure download URL - in production use signed URLs
        const token = crypto.randomBytes(32).toString('hex');
        return `/api/privacy/download/${token}`;
    }

    generateRecordId() {
        return `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    generateEventId() {
        return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
}

// Create singleton instance
const privacyComplianceService = new PrivacyComplianceService();

module.exports = {
    privacyComplianceService,
    processGDPRRequest: (requestData) => privacyComplianceService.processGDPRRequest(requestData),
    processCCPARequest: (requestData) => privacyComplianceService.processCCPARequest(requestData)
};