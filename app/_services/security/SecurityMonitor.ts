/**
 * Security Monitor and Event Logging Service
 * Enterprise-grade security monitoring and audit logging
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../Supabase/supabase';
import { EncryptionService } from './EncryptionService';

export interface SecurityEvent {
    id: string;
    timestamp: Date;
    eventType: string;
    userId?: string;
    deviceId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    details: any;
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    riskScore?: number;
    mitigated?: boolean;
}

export interface SecurityMetrics {
    totalEvents: number;
    criticalEvents: number;
    recentEvents: number;
    averageRiskScore: number;
    topThreatTypes: string[];
    lastUpdated: Date;
}

export interface ThreatPattern {
    pattern: RegExp;
    threatType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}

export class SecurityMonitor {
    private events: SecurityEvent[] = [];
    private encryptionService: EncryptionService;
    private maxEvents: number = 1000;
    private isInitialized: boolean = false;

    constructor() {
        this.encryptionService = new EncryptionService();
        this.initializeMonitor();
    }

    /**
     * Initialize security monitoring
     */
    private async initializeMonitor(): Promise<void> {
        try {
            // Load existing events from storage
            await this.loadEventsFromStorage();

            // Set up periodic cleanup
            this.setupPeriodicCleanup();

            this.isInitialized = true;
            console.log('🔒 Security Monitor initialized');
            this.logSecurityEvent('monitor_initialized', { timestamp: new Date() });
        } catch (error) {
            console.error('Failed to initialize Security Monitor:', error);
        }
    }

    /**
     * Log security event with comprehensive data
     */
    async logSecurityEvent(
        eventType: string,
        details: any = {},
        options: {
            severity?: 'low' | 'medium' | 'high' | 'critical';
            userId?: string;
            deviceId?: string;
            riskScore?: number;
        } = {}
    ): Promise<void> {
        try {
            if (!this.isInitialized) {
                await this.initializeMonitor();
            }

            const event: SecurityEvent = {
                id: this.generateEventId(),
                timestamp: new Date(),
                eventType,
                severity: options.severity || this.determineSeverity(eventType, details),
                details: await this.sanitizeDetails(details),
                userId: options.userId,
                deviceId: options.deviceId,
                riskScore: options.riskScore || this.calculateRiskScore(eventType, details),
                ipAddress: await this.getDeviceInfo('ip'),
                userAgent: await this.getDeviceInfo('userAgent'),
                sessionId: details.sessionId
            };

            // Add to local events
            this.events.push(event);

            // Limit event storage
            if (this.events.length > this.maxEvents) {
                this.events = this.events.slice(-this.maxEvents);
            }

            // Store locally
            await this.storeEventLocally(event);

            // Upload to backend if critical
            if (event.severity === 'critical' || (event.riskScore && event.riskScore > 80)) {
                await this.uploadEventToBackend(event);
            }

            // Handle immediate threats
            await this.handleImmediateThreat(event);

            console.log(`🔒 Security Event: ${eventType} [${event.severity.toUpperCase()}]`);

        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * Get security events with filtering
     */
    async getSecurityEvents(options: {
        eventType?: string;
        severity?: string;
        userId?: string;
        limit?: number;
        since?: Date;
    } = {}): Promise<SecurityEvent[]> {
        try {
            let filteredEvents = [...this.events];

            // Apply filters
            if (options.eventType) {
                filteredEvents = filteredEvents.filter(e => e.eventType === options.eventType);
            }

            if (options.severity) {
                filteredEvents = filteredEvents.filter(e => e.severity === options.severity);
            }

            if (options.userId) {
                filteredEvents = filteredEvents.filter(e => e.userId === options.userId);
            }

            if (options.since) {
                filteredEvents = filteredEvents.filter(e => e.timestamp >= options.since!);
            }

            // Sort by timestamp (newest first)
            filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            // Apply limit
            if (options.limit) {
                filteredEvents = filteredEvents.slice(0, options.limit);
            }

            return filteredEvents;

        } catch (error) {
            console.error('Failed to get security events:', error);
            return [];
        }
    }

    /**
     * Get security metrics and analytics
     */
    async getSecurityMetrics(): Promise<SecurityMetrics> {
        try {
            const now = new Date();
            const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

            const recentEvents = this.events.filter(e => e.timestamp >= twentyFourHoursAgo);
            const lastHourEvents = this.events.filter(e => e.timestamp >= lastHour);
            const criticalEvents = this.events.filter(e => e.severity === 'critical');

            const validRiskScores = this.events
                .filter(e => e.riskScore !== undefined)
                .map(e => e.riskScore!);

            const averageRiskScore = validRiskScores.length > 0
                ? validRiskScores.reduce((a, b) => a + b, 0) / validRiskScores.length
                : 0;

            // Calculate top threat types
            const threatCounts = recentEvents.reduce((acc, event) => {
                acc[event.eventType] = (acc[event.eventType] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            const topThreatTypes = Object.entries(threatCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([type]) => type);

            return {
                totalEvents: this.events.length,
                criticalEvents: criticalEvents.length,
                recentEvents: recentEvents.length,
                averageRiskScore: Math.round(averageRiskScore),
                topThreatTypes,
                lastUpdated: now
            };

        } catch (error) {
            console.error('Failed to get security metrics:', error);
            return {
                totalEvents: 0,
                criticalEvents: 0,
                recentEvents: 0,
                averageRiskScore: 0,
                topThreatTypes: [],
                lastUpdated: new Date()
            };
        }
    }

    /**
     * Detect suspicious patterns in events
     */
    async detectSuspiciousActivity(): Promise<{
        threats: Array<{ type: string; severity: string; events: SecurityEvent[]; description: string }>;
        shouldAlert: boolean;
    }> {
        try {
            const threats: Array<{
                type: string;
                severity: string;
                events: SecurityEvent[];
                description: string;
            }> = [];

            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            const recentEvents = this.events.filter(e => e.timestamp >= oneHourAgo);

            // Detect rapid failed login attempts
            const failedLogins = recentEvents.filter(e =>
                e.eventType.includes('login') && e.eventType.includes('failed')
            );
            if (failedLogins.length >= 5) {
                threats.push({
                    type: 'rapid_failed_logins',
                    severity: 'high',
                    events: failedLogins,
                    description: `${failedLogins.length} failed login attempts in the last hour`
                });
            }

            // Detect multiple IP addresses
            const ipAddresses = Array.from(new Set(recentEvents.map(e => e.ipAddress))).filter((ip): ip is string => !!ip);
            if (ipAddresses.length >= 3) {
                threats.push({
                    type: 'multiple_ip_addresses',
                    severity: 'medium',
                    events: recentEvents.filter(e => e.ipAddress),
                    description: `User accessed from ${ipAddresses.length} different IP addresses`
                });
            }

            // Detect unusual event patterns
            const biometricFailures = recentEvents.filter(e =>
                e.eventType === 'biometric_auth_failed'
            );
            if (biometricFailures.length >= 3) {
                threats.push({
                    type: 'biometric_failures',
                    severity: 'medium',
                    events: biometricFailures,
                    description: `${biometricFailures.length} biometric authentication failures`
                });
            }

            const shouldAlert = threats.some(t => t.severity === 'high' || t.severity === 'critical');

            return { threats, shouldAlert };

        } catch (error) {
            console.error('Failed to detect suspicious activity:', error);
            return { threats: [], shouldAlert: false };
        }
    }

    /**
     * Clear security events (for testing or privacy compliance)
     */
    async clearEvents(options: {
        eventType?: string;
        beforeDate?: Date;
        severity?: string;
    } = {}): Promise<number> {
        try {
            let eventsToRemove = 0;

            if (options.eventType) {
                const removed = this.events.filter(e => e.eventType === options.eventType);
                eventsToRemove += removed.length;
                this.events = this.events.filter(e => e.eventType !== options.eventType);
            }

            if (options.beforeDate) {
                const removed = this.events.filter(e => e.timestamp < options.beforeDate!);
                eventsToRemove += removed.length;
                this.events = this.events.filter(e => e.timestamp >= options.beforeDate!);
            }

            if (options.severity) {
                const removed = this.events.filter(e => e.severity === options.severity);
                eventsToRemove += removed.length;
                this.events = this.events.filter(e => e.severity !== options.severity);
            }

            if (!options.eventType && !options.beforeDate && !options.severity) {
                eventsToRemove = this.events.length;
                this.events = [];
            }

            // Update storage
            await this.storeEventsToStorage();

            if (eventsToRemove > 0) {
                console.log(`🗑️ Cleared ${eventsToRemove} security events`);
            }

            return eventsToRemove;

        } catch (error) {
            console.error('Failed to clear events:', error);
            return 0;
        }
    }

    /**
     * Export security events for compliance reporting
     */
    async exportEvents(format: 'json' | 'csv' = 'json'): Promise<string> {
        try {
            const eventsData = this.events.map(event => ({
                id: event.id,
                timestamp: event.timestamp.toISOString(),
                eventType: event.eventType,
                severity: event.severity,
                userId: event.userId,
                deviceId: event.deviceId,
                riskScore: event.riskScore,
                ipAddress: event.ipAddress,
                details: event.details
            }));

            if (format === 'json') {
                return JSON.stringify(eventsData, null, 2);
            } else {
                // CSV format
                const headers = ['ID', 'Timestamp', 'Type', 'Severity', 'User ID', 'Device ID', 'Risk Score', 'IP Address', 'Details'];
                const csvRows = [
                    headers.join(','),
                    ...eventsData.map(event => [
                        event.id,
                        event.timestamp,
                        event.eventType,
                        event.severity,
                        event.userId || '',
                        event.deviceId || '',
                        event.riskScore?.toString() || '',
                        event.ipAddress || '',
                        JSON.stringify(event.details).replace(/,/g, ';')
                    ].join(','))
                ];
                return csvRows.join('\n');
            }

        } catch (error) {
            console.error('Failed to export events:', error);
            throw new Error('Failed to export security events');
        }
    }

    /**
     * Private helper methods
     */
    private generateEventId(): string {
        return `sec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    private determineSeverity(eventType: string, details: any): 'low' | 'medium' | 'high' | 'critical' {
        const criticalEvents = [
            'authentication_bypass',
            'unauthorized_access',
            'data_breach',
            'system_compromise',
            'encryption_failure'
        ];

        const highEvents = [
            'biometric_auth_failed',
            'device_security_violation',
            'suspicious_login',
            'multiple_failed_attempts',
            'session_hijacking_attempt'
        ];

        const mediumEvents = [
            'login_failed',
            'device_binding_failed',
            'mfa_failed',
            'weak_password_attempt'
        ];

        if (criticalEvents.includes(eventType)) return 'critical';
        if (highEvents.includes(eventType)) return 'high';
        if (mediumEvents.includes(eventType)) return 'medium';
        return 'low';
    }

    private calculateRiskScore(eventType: string, details: any): number {
        let score = 0;

        // Base score by event type
        switch (eventType) {
            case 'authentication_bypass':
            case 'unauthorized_access':
                score += 90;
                break;
            case 'biometric_auth_failed':
            case 'suspicious_login':
                score += 70;
                break;
            case 'login_failed':
                score += 40;
                break;
            default:
                score += 20;
        }

        // Adjust based on details
        if (details.attempts && details.attempts > 3) {
            score += 20;
        }

        if (details.ip && details.ip !== details.previousIP) {
            score += 15;
        }

        return Math.min(score, 100);
    }

    private async sanitizeDetails(details: any): Promise<any> {
        // Remove sensitive information from details
        const sanitized = { ...details };

        // Remove or mask sensitive fields
        const sensitiveFields = ['password', 'token', 'secret', 'key', 'biometricData'];
        for (const field of sensitiveFields) {
            if (sanitized[field]) {
                if (typeof sanitized[field] === 'string' && sanitized[field].length > 4) {
                    sanitized[field] = sanitized[field].substring(0, 4) + '***';
                } else {
                    sanitized[field] = '[REDACTED]';
                }
            }
        }

        return sanitized;
    }

    private async getDeviceInfo(infoType: 'ip' | 'userAgent'): Promise<string | undefined> {
        try {
            // In a real app, this would get actual device information
            // For now, returning mock data
            switch (infoType) {
                case 'ip':
                    return '192.168.1.100'; // Mock IP
                case 'userAgent':
                    return 'OffScreenBuddy/1.0.0'; // Mock user agent
                default:
                    return undefined;
            }
        } catch (error) {
            return undefined;
        }
    }

    private async handleImmediateThreat(event: SecurityEvent): Promise<void> {
        if (event.severity === 'critical' && event.riskScore && event.riskScore > 90) {
            // Log critical threat
            await this.logSecurityEvent('critical_threat_detected', {
                threat: event.eventType,
                riskScore: event.riskScore,
                userId: event.userId,
                recommendedAction: 'immediate_action_required'
            });
        }
    }

    private async uploadEventToBackend(event: SecurityEvent): Promise<void> {
        try {
            // In production, this would upload to secure backend
            console.log('📤 Uploading security event to backend:', event.eventType);

            // Mock upload - in real app would use Supabase
            // await supabase.from('security_events').insert(event);

        } catch (error) {
            console.error('Failed to upload event to backend:', error);
        }
    }

    private async loadEventsFromStorage(): Promise<void> {
        try {
            const storedEvents = await AsyncStorage.getItem('security_events');
            if (storedEvents) {
                const parsedEvents = JSON.parse(storedEvents);
                this.events = parsedEvents.map((e: any) => ({
                    ...e,
                    timestamp: new Date(e.timestamp)
                }));
            }
        } catch (error) {
            console.error('Failed to load events from storage:', error);
        }
    }

    private async storeEventLocally(event: SecurityEvent): Promise<void> {
        try {
            // For efficiency, store in batches
            if (this.events.length % 10 === 0) {
                await this.storeEventsToStorage();
            }
        } catch (error) {
            console.error('Failed to store event locally:', error);
        }
    }

    private async storeEventsToStorage(): Promise<void> {
        try {
            const eventsToStore = this.events.map(event => ({
                ...event,
                timestamp: event.timestamp.toISOString()
            }));
            await AsyncStorage.setItem('security_events', JSON.stringify(eventsToStore));
        } catch (error) {
            console.error('Failed to store events to storage:', error);
        }
    }

    private setupPeriodicCleanup(): void {
        // Clean up old events every hour
        setInterval(async () => {
            const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
            await this.clearEvents({ beforeDate: cutoffDate });
        }, 60 * 60 * 1000); // Every hour
    }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();