/**
 * Fake Call Security Validator
 * Comprehensive input validation, sanitization, and security checks for fake call system
 * 
 * Provides caller ID safety validation, rate limiting, abuse prevention, privacy compliance
 * and content filtering for the fake call notification system
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { securityMonitor } from '../security/SecurityMonitor';
import { privacyManager } from '../security/PrivacyManager';
import { CallerInfo, SafetyValidation, CallerIDSafety, PhoneNumberValidation, FakeCallConfig, CallError, CallErrorType, FakeCallResult } from './types';

export interface SecurityValidationConfig {
    enableInputSanitization: boolean;
    enableRateLimiting: boolean;
    enableAbusePrevention: boolean;
    enableContentFiltering: boolean;
    enableEmergencyProtection: boolean;
    enablePrivacyCompliance: boolean;
    maxValidationTime: number; // ms
    suspiciousPatternThreshold: number;
    maxInputLength: number;
    rateLimitWindow: number; // minutes
    maxRequestsPerWindow: number;
}

export interface ValidationRequest {
    type: 'call_config' | 'caller_id' | 'audio_message' | 'phone_number' | 'user_input';
    data: any;
    userId: string;
    platform: Platform;
    metadata?: Record<string, any>;
}

export interface SecurityValidationResult {
    isValid: boolean;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    sanitizedData?: any;
    violations: SecurityViolation[];
    warnings: string[];
    suggestions: string[];
    privacyCompliance: {
        gdprCompliant: boolean;
        ccpaCompliant: boolean;
        dataMinimization: boolean;
        consentRequired: boolean;
    };
    rateLimitStatus: {
        allowed: boolean;
        remainingRequests: number;
        resetAt: Date;
        violations: number;
    };
}

export interface SecurityViolation {
    type: 'input_sanitization' | 'abuse_prevention' | 'content_filtering' | 'privacy_violation' | 'rate_limiting' | 'emergency_protection';
    severity: 'low' | 'medium' | 'high' | 'critical';
    code: string;
    description: string;
    field?: string;
    blockedContent?: string;
    remediation: string;
}

export interface RateLimitEntry {
    userId: string;
    action: string;
    count: number;
    windowStart: Date;
    violations: number;
    lastViolation: Date | null;
}

export interface SuspiciousPattern {
    pattern: RegExp;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    shouldBlock: boolean;
}

export interface ContentFilterRule {
    category: 'inappropriate' | 'spam' | 'phishing' | 'malicious' | 'privacy' | 'emergency';
    pattern: RegExp;
    action: 'block' | 'warn' | 'sanitize' | 'log';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
}

export class FakeCallSecurityValidator implements CallerIDSafety {
    private config: SecurityValidationConfig;
    private rateLimits: Map<string, RateLimitEntry> = new Map();
    private suspiciousPatterns: SuspiciousPattern[] = [];
    private contentFilters: ContentFilterRule[] = [];
    private emergencyNumbers: Set<string> = new Set();
    private blockedPatterns: string[] = [];
    private privacySettings: any = null;

    constructor(config?: Partial<SecurityValidationConfig>) {
        this.config = {
            enableInputSanitization: true,
            enableRateLimiting: true,
            enableAbusePrevention: true,
            enableContentFiltering: true,
            enableEmergencyProtection: true,
            enablePrivacyCompliance: true,
            maxValidationTime: 5000, // 5 seconds
            suspiciousPatternThreshold: 3,
            maxInputLength: 1000,
            rateLimitWindow: 15, // 15 minutes
            maxRequestsPerWindow: 50,
            ...config
        };

        this.initializeSecurityPatterns();
        this.initializeContentFilters();
        this.initializeEmergencyProtection();
    }

    /**
     * Initialize security validator
     */
    async initialize(): Promise<void> {
        try {
            // Load privacy settings
            this.privacySettings = privacyManager.getPrivacySettings();

            // Load rate limits from storage
            await this.loadRateLimits();

            // Initialize security patterns
            await this.initializeSecurityDatabase();

            // Start periodic cleanup
            this.startPeriodicCleanup();

            await securityMonitor.logSecurityEvent('fake_call_security_validator_initialized', {
                config: this.config,
                patternsLoaded: this.suspiciousPatterns.length,
                filtersLoaded: this.contentFilters.length
            });

            console.log('🛡️ FakeCall Security Validator initialized');
        } catch (error) {
            console.error('Failed to initialize FakeCall Security Validator:', error);
            throw error;
        }
    }

    /**
     * Validate caller ID safety (implements CallerIDSafety interface)
     */
    validateCallerID(callerInfo: CallerInfo): SafetyValidation {
        try {
            const validation = this.performComprehensiveValidation({
                type: 'caller_id',
                data: callerInfo,
                userId: callerInfo.id,
                platform: Platform.OS as unknown as Platform
            });

            return {
                isSafe: validation.isValid && validation.riskLevel !== 'critical',
                riskLevel: validation.riskLevel === 'critical' ? 'high' : validation.riskLevel,
                reasons: validation.violations.map((v: any) => v.description),
                suggestions: validation.suggestions,
                needsReview: validation.violations.some((v: any) => v.severity === 'high' || v.severity === 'critical')
            };
        } catch (error) {
            console.error('Caller ID validation error:', error);
            return {
                isSafe: false,
                riskLevel: 'high' as const,
                reasons: ['Validation system error'],
                suggestions: ['Contact support'],
                needsReview: true
            };
        }
    }

    /**
     * Generate safe caller ID (implements CallerIDSafety interface)
     */
    async generateSafeCallerID(): Promise<CallerInfo> {
        try {
            // Generate safe caller ID from approved database
            const safeDatabase = this.getSafeNameDatabase();
            const firstName = this.getRandomElement(safeDatabase.firstNames.neutral);
            const lastName = this.getRandomElement(safeDatabase.lastNames);
            const phoneNumber = this.generateSafePhoneNumber();

            return {
                id: this.generateSafeId(),
                name: `${firstName} ${lastName}`,
                phoneNumber,
                riskLevel: 'low',
                isVerified: true,
                displayName: `${firstName} ${lastName}`,
                callerType: 'business'
            };
        } catch (error) {
            console.error('Failed to generate safe caller ID:', error);
            throw error;
        }
    }

    /**
     * Get safe name database (implements CallerIDSafety interface)
     */
    getSafeNameDatabase(): any {
        return {
            firstNames: {
                male: ['James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph', 'Thomas', 'Charles'],
                female: ['Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara', 'Susan', 'Jessica', 'Sarah', 'Karen'],
                neutral: ['Alex', 'Sam', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Jamie', 'Chris', 'Pat', 'Robin']
            },
            lastNames: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
            businessNames: ['Tech Solutions', 'Business Services', 'Professional Consulting', 'Customer Support', 'Account Services'],
            emergencyContacts: [
                { service: 'Emergency Services', number: '911', description: 'Emergency services (protected)' },
                { service: 'Fire Department', number: '911', description: 'Fire department (protected)' },
                { service: 'Police', number: '911', description: 'Police (protected)' }
            ],
            blockedPatterns: [
                '911',
                '999',
                '112',
                '000',
                'emergency',
                'police',
                'fire',
                'ambulance'
            ],
            suspiciousPatterns: [
                'admin',
                'root',
                'system',
                'noreply',
                'no-reply',
                'test',
                'fake',
                'spam'
            ]
        };
    }

    /**
     * Validate phone number (implements CallerIDSafety interface)
     */
    validatePhoneNumber(number: string): PhoneNumberValidation {
        try {
            const cleaned = number.replace(/[\s\-\(\)\+\.]/g, '');
            const isEmergency = this.emergencyNumbers.has(cleaned);

            return {
                isValid: this.isValidPhoneFormat(cleaned),
                isSafe: !isEmergency && !this.isSuspiciousPhonePattern(cleaned),
                format: this.determinePhoneFormat(number),
                region: this.detectPhoneRegion(cleaned),
                isEmergency,
                isTollFree: this.isTollFreeNumber(cleaned),
                riskFlags: this.getPhoneRiskFlags(cleaned)
            };
        } catch (error) {
            console.error('Phone number validation error:', error);
            return {
                isValid: false,
                isSafe: false,
                format: 'local',
                region: 'unknown',
                isEmergency: false,
                isTollFree: false,
                riskFlags: ['validation_error']
            };
        }
    }

    /**
     * Perform comprehensive security validation (sync version for interface compatibility)
     */
    performComprehensiveValidation(request: ValidationRequest): SecurityValidationResult {
        try {
            // Check rate limiting first
            const rateLimitStatus = this.checkRateLimitSync(request.userId, request.type);
            if (!rateLimitStatus.allowed) {
                return {
                    isValid: false,
                    riskLevel: 'high',
                    violations: [{
                        type: 'rate_limiting' as const,
                        severity: 'high',
                        code: 'RATE_LIMIT_EXCEEDED',
                        description: 'Too many requests in time window',
                        remediation: 'Wait before making additional requests'
                    }],
                    warnings: ['Rate limit exceeded'],
                    suggestions: ['Reduce request frequency'],
                    privacyCompliance: { gdprCompliant: true, ccpaCompliant: true, dataMinimization: true, consentRequired: false },
                    rateLimitStatus
                };
            }

            // Basic sanitization (sync)
            const sanitizedData = this.sanitizeInputSync(request);

            // Content filtering
            const contentViolations = this.checkContentFilteringSync(request, sanitizedData);

            // Privacy compliance
            const privacyCompliance = this.checkPrivacyComplianceSync(request);

            // Abuse prevention
            const abuseViolations = this.checkAbusePreventionSync(request);

            // Emergency protection
            const emergencyViolations = this.checkEmergencyProtectionSync(request);

            // Combine all violations
            const allViolations = [
                ...contentViolations,
                ...abuseViolations,
                ...emergencyViolations
            ];

            // Calculate overall risk level
            const riskLevel = this.calculateOverallRisk(allViolations);

            // Generate warnings and suggestions
            const { warnings, suggestions } = this.generateWarningsAndSuggestions(allViolations);

            return {
                isValid: allViolations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
                riskLevel,
                sanitizedData,
                violations: allViolations,
                warnings,
                suggestions,
                privacyCompliance,
                rateLimitStatus
            };

        } catch (error) {
            console.error('Security validation error:', error);

            return {
                isValid: false,
                riskLevel: 'high',
                violations: [{
                    type: 'input_sanitization' as const,
                    severity: 'high',
                    code: 'VALIDATION_ERROR',
                    description: 'Security validation system error',
                    remediation: 'Contact technical support'
                }],
                warnings: ['Security validation failed'],
                suggestions: ['Try again later or contact support'],
                privacyCompliance: { gdprCompliant: false, ccpaCompliant: false, dataMinimization: false, consentRequired: false },
                rateLimitStatus: {
                    allowed: false,
                    remainingRequests: 0,
                    resetAt: new Date(),
                    violations: 1
                }
            };
        }
    }

    /**
     * Private helper methods
     */
    private initializeSecurityPatterns(): void {
        this.suspiciousPatterns = [
            {
                pattern: /(admin|root|system|test)/i,
                type: 'suspicious_admin',
                severity: 'medium',
                description: 'Suspicious administrative keywords detected',
                shouldBlock: false
            },
            {
                pattern: /(\d)\1{6,}/,
                type: 'repeated_digits',
                severity: 'high',
                description: 'Excessive repeated digits in input',
                shouldBlock: true
            },
            {
                pattern: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i,
                type: 'xss_attempt',
                severity: 'critical',
                description: 'Cross-site scripting attempt detected',
                shouldBlock: true
            }
        ];
    }

    private initializeContentFilters(): void {
        this.contentFilters = [
            {
                category: 'inappropriate',
                pattern: /(offensive|profanity|harassment)/i,
                action: 'block',
                severity: 'high',
                description: 'Inappropriate language detected'
            },
            {
                category: 'spam',
                pattern: /(click here|buy now|limited time|act fast)/i,
                action: 'warn',
                severity: 'medium',
                description: 'Potential spam content detected'
            },
            {
                category: 'phishing',
                pattern: /(verify account|reset password|suspicious activity)/i,
                action: 'block',
                severity: 'critical',
                description: 'Potential phishing attempt detected'
            }
        ];
    }

    private initializeEmergencyProtection(): void {
        // Initialize emergency numbers (protected from fake call use)
        this.emergencyNumbers.add('911');
        this.emergencyNumbers.add('999');
        this.emergencyNumbers.add('112');
        this.emergencyNumbers.add('000');

        // Common emergency variations
        this.emergencyNumbers.add('+911');
        this.emergencyNumbers.add('+1999');
        this.emergencyNumbers.add('+1112');
    }

    private async initializeSecurityDatabase(): Promise<void> {
        // Load additional security patterns from storage or API
        console.log('📊 Security database initialized with patterns and filters');
    }

    private startPeriodicCleanup(): void {
        // Clean up old rate limit entries
        setInterval(async () => {
            await this.cleanupRateLimits();
        }, 60 * 60 * 1000); // Every hour
    }

    private async cleanupRateLimits(): Promise<void> {
        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

        for (const [key, entry] of this.rateLimits.entries()) {
            if (entry.windowStart < cutoff && entry.violations === 0) {
                this.rateLimits.delete(key);
            }
        }
    }

    private async loadRateLimits(): Promise<void> {
        try {
            const stored = await AsyncStorage.getItem('fake_call_rate_limits');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.rateLimits = new Map(parsed.map(([key, entry]: [string, any]) => [
                    key,
                    {
                        ...entry,
                        windowStart: new Date(entry.windowStart),
                        lastViolation: entry.lastViolation ? new Date(entry.lastViolation) : null
                    }
                ]));
            }
        } catch (error) {
            console.error('Failed to load rate limits:', error);
        }
    }

    private checkRateLimitSync(userId: string, action: string): {
        allowed: boolean;
        remainingRequests: number;
        resetAt: Date;
        violations: number;
    } {
        const key = `${userId}_${action}`;
        const now = new Date();
        const windowStart = new Date(now.getTime() - this.config.rateLimitWindow * 60 * 1000);

        let entry = this.rateLimits.get(key);

        if (!entry || entry.windowStart < windowStart) {
            entry = {
                userId,
                action,
                count: 1,
                windowStart: now,
                violations: 0,
                lastViolation: null
            };
        } else {
            entry.count++;
        }

        this.rateLimits.set(key, entry);
        const remainingRequests = Math.max(0, this.config.maxRequestsPerWindow - entry.count);

        if (entry.count > this.config.maxRequestsPerWindow) {
            entry.violations++;
            entry.lastViolation = now;
            return {
                allowed: false,
                remainingRequests: 0,
                resetAt: new Date(entry.windowStart.getTime() + this.config.rateLimitWindow * 60 * 1000),
                violations: entry.violations
            };
        }

        return {
            allowed: true,
            remainingRequests,
            resetAt: new Date(entry.windowStart.getTime() + this.config.rateLimitWindow * 60 * 1000),
            violations: entry.violations
        };
    }

    private sanitizeInputSync(request: ValidationRequest): any {
        if (!this.config.enableInputSanitization) {
            return request.data;
        }

        const sanitized = { ...request.data };

        if (typeof sanitized === 'string') {
            return this.sanitizeString(sanitized);
        }

        if (typeof sanitized === 'object' && sanitized !== null) {
            const sanitizedObj: any = {};

            for (const [key, value] of Object.entries(sanitized)) {
                if (typeof value === 'string') {
                    sanitizedObj[key] = this.sanitizeString(value);
                } else if (typeof value === 'object' && value !== null) {
                    sanitizedObj[key] = this.sanitizeInputSync({
                        ...request,
                        data: value
                    });
                } else {
                    sanitizedObj[key] = value;
                }
            }

            return sanitizedObj;
        }

        return sanitized;
    }

    private checkContentFilteringSync(request: ValidationRequest, sanitizedData: any): SecurityViolation[] {
        if (!this.config.enableContentFiltering) {
            return [];
        }

        const violations: SecurityViolation[] = [];
        const textContent = this.extractTextContent(sanitizedData);

        for (const filter of this.contentFilters) {
            if (filter.pattern.test(textContent)) {
                violations.push({
                    type: 'content_filtering',
                    severity: filter.severity,
                    code: `CONTENT_FILTER_${filter.category.toUpperCase()}`,
                    description: filter.description,
                    blockedContent: textContent.match(filter.pattern)?.[0] || '',
                    remediation: `Remove or modify ${filter.category} content`
                });
            }
        }

        return violations;
    }

    private checkPrivacyComplianceSync(request: ValidationRequest): {
        gdprCompliant: boolean;
        ccpaCompliant: boolean;
        dataMinimization: boolean;
        consentRequired: boolean;
    } {
        if (!this.config.enablePrivacyCompliance) {
            return {
                gdprCompliant: true,
                ccpaCompliant: true,
                dataMinimization: true,
                consentRequired: false
            };
        }

        const gdprCompliant = this.checkGDPRCompliance(request);
        const ccpaCompliant = this.checkCCPACompliance(request);
        const dataMinimization = this.checkDataMinimization(request);
        const consentRequired = this.checkConsentRequirements(request);

        return {
            gdprCompliant,
            ccpaCompliant,
            dataMinimization,
            consentRequired
        };
    }

    private checkAbusePreventionSync(request: ValidationRequest): SecurityViolation[] {
        if (!this.config.enableAbusePrevention) {
            return [];
        }

        return this.checkSuspiciousPatterns(request);
    }

    private checkEmergencyProtectionSync(request: ValidationRequest): SecurityViolation[] {
        if (!this.config.enableEmergencyProtection) {
            return [];
        }

        const violations: SecurityViolation[] = [];

        if (request.data.phoneNumber || request.data.callerInfo?.phoneNumber) {
            const phoneNumber = request.data.phoneNumber || request.data.callerInfo.phoneNumber;

            if (this.emergencyNumbers.has(phoneNumber)) {
                violations.push({
                    type: 'emergency_protection',
                    severity: 'critical',
                    code: 'EMERGENCY_NUMBER_BLOCKED',
                    description: 'Emergency numbers cannot be used in fake calls',
                    field: 'phoneNumber',
                    remediation: 'Use non-emergency numbers only'
                });
            }
        }

        return violations;
    }

    private sanitizeString(input: string): string {
        if (typeof input !== 'string') {
            return String(input);
        }

        let sanitized = input;

        // Remove potential XSS vectors
        sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        sanitized = sanitized.replace(/<[^>]*>/g, '');

        // Remove SQL injection patterns
        sanitized = sanitized.replace(/('|(\\x27)|(\\x60)|(\\')|(\\x22)|(\\x60)|(\\x23))/g, '');

        // Remove command injection patterns
        sanitized = sanitized.replace(/[;&|`$()]/g, '');

        // Limit length
        if (sanitized.length > this.config.maxInputLength) {
            sanitized = sanitized.substring(0, this.config.maxInputLength);
        }

        // Trim whitespace
        sanitized = sanitized.trim();

        return sanitized;
    }

    private extractTextContent(data: any): string {
        if (typeof data === 'string') return data;
        if (typeof data === 'object' && data !== null) {
            return JSON.stringify(data);
        }
        return String(data || '');
    }

    private calculateOverallRisk(violations: SecurityViolation[]): 'low' | 'medium' | 'high' | 'critical' {
        if (violations.some(v => v.severity === 'critical')) return 'critical';
        if (violations.some(v => v.severity === 'high')) return 'high';
        if (violations.some(v => v.severity === 'medium')) return 'medium';
        return 'low';
    }

    private generateWarningsAndSuggestions(violations: SecurityViolation[]): { warnings: string[]; suggestions: string[] } {
        const warnings: string[] = [];
        const suggestions: string[] = [];

        for (const violation of violations) {
            if (violation.severity === 'low') {
                warnings.push(violation.description);
                suggestions.push(violation.remediation);
            }
        }

        return { warnings, suggestions };
    }

    private checkGDPRCompliance(request: ValidationRequest): boolean {
        // Check GDPR compliance requirements
        return true; // Simplified - would implement full GDPR checks
    }

    private checkCCPACompliance(request: ValidationRequest): boolean {
        // Check CCPA compliance requirements
        return true; // Simplified - would implement full CCPA checks
    }

    private checkDataMinimization(request: ValidationRequest): boolean {
        // Check if only necessary data is being processed
        return true; // Simplified - would implement data minimization checks
    }

    private checkConsentRequirements(request: ValidationRequest): boolean {
        // Check if user consent is required for data processing
        return false; // Simplified - would check against privacy settings
    }

    private checkSuspiciousPatterns(request: ValidationRequest): SecurityViolation[] {
        const violations: SecurityViolation[] = [];
        const textContent = this.extractTextContent(request.data);

        for (const pattern of this.suspiciousPatterns) {
            if (pattern.pattern.test(textContent)) {
                violations.push({
                    type: 'abuse_prevention',
                    severity: pattern.severity,
                    code: `SUSPICIOUS_PATTERN_${pattern.type.toUpperCase()}`,
                    description: pattern.description,
                    remediation: 'Remove suspicious content'
                });
            }
        }

        return violations;
    }

    private isValidPhoneFormat(phone: string): boolean {
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        return phoneRegex.test(phone) && phone.length >= 7;
    }

    private isSuspiciousPhonePattern(phone: string): boolean {
        return /(\d)\1{6,}/.test(phone) || phone.length > 15;
    }

    private determinePhoneFormat(phone: string): 'international' | 'national' | 'local' {
        if (phone.startsWith('+')) return 'international';
        if (phone.length === 10) return 'national';
        return 'local';
    }

    private detectPhoneRegion(phone: string): string {
        // Basic region detection - in production would use comprehensive library
        if (phone.startsWith('+1')) return 'US/CA';
        if (phone.startsWith('+44')) return 'UK';
        if (phone.startsWith('+61')) return 'AU';
        return 'unknown';
    }

    private isTollFreeNumber(phone: string): boolean {
        return /^(800|888|877|866|855|844|833)\d{7}$/.test(phone);
    }

    private getPhoneRiskFlags(phone: string): string[] {
        const flags: string[] = [];

        if (this.isSuspiciousPhonePattern(phone)) {
            flags.push('suspicious_pattern');
        }

        if (this.emergencyNumbers.has(phone)) {
            flags.push('emergency_number');
        }

        return flags;
    }

    private getRandomElement<T>(array: T[]): T {
        return array[Math.floor(Math.random() * array.length)];
    }

    private generateSafePhoneNumber(): string {
        // Generate safe phone number (not real)
        const areaCodes = [555, 556, 557, 558, 559];
        const areaCode = this.getRandomElement(areaCodes);
        const exchange = Math.floor(Math.random() * 800) + 100; // 100-899
        const number = Math.floor(Math.random() * 10000); // 0000-9999

        return `+1-${areaCode}-${exchange.toString().padStart(3, '0')}-${number.toString().padStart(4, '0')}`;
    }

    private generateSafeId(): string {
        return `safe_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    /**
     * Dispose of security validator
     */
    async dispose(): Promise<void> {
        try {
            // Save rate limits
            await this.saveRateLimits();

            // Clear memory
            this.rateLimits.clear();
            this.suspiciousPatterns = [];
            this.contentFilters = [];
            this.emergencyNumbers.clear();

            await securityMonitor.logSecurityEvent('fake_call_security_validator_disposed', {
                rateLimitsCleared: this.rateLimits.size,
                patternsCleared: this.suspiciousPatterns.length,
                filtersCleared: this.contentFilters.length
            });

            console.log('🛡️ FakeCall Security Validator disposed');
        } catch (error) {
            console.error('Error disposing FakeCall Security Validator:', error);
        }
    }

    private async saveRateLimits(): Promise<void> {
        try {
            const serializable = Array.from(this.rateLimits.entries()).map(([key, entry]) => [
                key,
                {
                    ...entry,
                    windowStart: entry.windowStart.toISOString(),
                    lastViolation: entry.lastViolation?.toISOString()
                }
            ]);

            await AsyncStorage.setItem('fake_call_rate_limits', JSON.stringify(serializable));
        } catch (error) {
            console.error('Failed to save rate limits:', error);
        }
    }
}

// Export singleton instance
export const fakeCallSecurityValidator = new FakeCallSecurityValidator();