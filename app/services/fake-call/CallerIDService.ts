/**
 * Caller ID Service for Fake Call System
 * Safe caller ID generation with validation and professional contact database
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

import {
    CallerInfo,
    SafetyValidation,
    PhoneNumberValidation,
    SafeNameDatabase,
    CallerIDSafety,
    FakeCallResult,
    CallErrorType
} from './types';

import { logger } from '../../utils/Logger';
import { hapticManager, HapticType } from '../../utils/HapticManager';

interface ContactProfile {
    id: string;
    name: string;
    phoneNumber: string;
    callerType: 'safe' | 'emergency' | 'business' | 'personal';
    location?: string;
    avatarUrl?: string;
    isVerified: boolean;
    usageCount: number;
    lastUsed: Date;
    userId: string; // For custom contacts
}

interface CallerIDPattern {
    type: 'business' | 'personal' | 'emergency' | 'international';
    region: string;
    format: string;
    example: string;
}

interface GeographicRegion {
    code: string;
    name: string;
    countryCode: string;
    numberLength: number;
    format: string;
    isTollFreeAvailable: boolean;
}

export class CallerIDService {
    private static instance: CallerIDService;
    private safeNameDatabase: SafeNameDatabase = {
        firstNames: {
            male: [],
            female: [],
            neutral: []
        },
        lastNames: [],
        businessNames: [],
        emergencyContacts: [],
        blockedPatterns: [],
        suspiciousPatterns: []
    };
    private customContacts: ContactProfile[] = [];
    private blockedPatterns: string[] = [];
    private suspiciousPatterns: string[] = [];
    private geographicRegions: GeographicRegion[] = [];
    private isInitialized = false;

    // Safety thresholds
    private readonly MAX_DAILY_CALLS = 100;
    private readonly MAX_CUSTOM_CONTACTS = 50;
    private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

    private constructor() {
        this.initializeSafeNameDatabase();
        this.initializeCallerIDPatterns();
    }

    public static getInstance(): CallerIDService {
        if (!CallerIDService.instance) {
            CallerIDService.instance = new CallerIDService();
        }
        return CallerIDService.instance;
    }

    /**
     * Initialize the caller ID service
     */
    public async initialize(): Promise<FakeCallResult<void>> {
        try {
            logger.info('Initializing Caller ID Service...');

            // Load custom contacts from storage
            await this.loadCustomContacts();

            // Load safety patterns
            await this.loadSafetyPatterns();

            // Validate existing contacts
            await this.validateAllContacts();

            this.isInitialized = true;
            logger.info('Caller ID Service initialized successfully');

            return {
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error('Failed to initialize Caller ID Service:', error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.INVALID_CALLER_ID,
                    code: 'INIT_FAILED',
                    message: 'Failed to initialize caller ID service',
                    recoverable: true,
                    suggestedAction: 'Check service dependencies',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId: ''
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Validate caller ID information
     */
    public validateCallerID(callerInfo: CallerInfo): SafetyValidation {
        try {
            const validation: SafetyValidation = {
                isSafe: true,
                riskLevel: 'low',
                reasons: [],
                suggestions: [],
                needsReview: false
            };

            // Check for blocked patterns
            if (this.isBlockedPattern(callerInfo.phoneNumber)) {
                validation.isSafe = false;
                validation.riskLevel = 'high';
                validation.reasons.push('Phone number matches blocked pattern');
                validation.suggestions.push('Use a different phone number format');
            }

            // Check for suspicious patterns
            if (this.isSuspiciousPattern(callerInfo.phoneNumber)) {
                validation.riskLevel = validation.riskLevel === 'high' ? 'high' : 'medium';
                validation.reasons.push('Phone number has suspicious characteristics');
                validation.suggestions.push('Verify number format and origin');
            }

            // Validate phone number format
            const phoneValidation = this.validatePhoneNumber(callerInfo.phoneNumber);
            if (!phoneValidation.isValid) {
                validation.isSafe = false;
                validation.riskLevel = 'high';
                validation.reasons.push('Invalid phone number format');
                validation.suggestions.push('Use proper international or local format');
            }

            // Check emergency number restrictions
            if (phoneValidation.isEmergency && !this.isEmergencyAllowed(callerInfo)) {
                validation.isSafe = false;
                validation.riskLevel = 'high';
                validation.reasons.push('Emergency numbers require special validation');
                validation.suggestions.push('Contact support for emergency call setup');
            }

            // Geographic validation
            if (phoneValidation.region && !this.isValidGeographicRegion(phoneValidation.region)) {
                validation.riskLevel = validation.riskLevel === 'high' ? 'high' : 'medium';
                validation.reasons.push('Phone number from potentially problematic region');
                validation.needsReview = true;
            }

            // Business number validation
            if (callerInfo.callerType === 'business') {
                const businessValidation = this.validateBusinessNumber(callerInfo.phoneNumber);
                if (!businessValidation.isValid) {
                    validation.riskLevel = validation.riskLevel === 'high' ? 'high' : 'medium';
                    validation.reasons.push('Business number format issues detected');
                    validation.suggestions.push('Verify business number authenticity');
                }
            }

            // Content validation for names
            const nameValidation = this.validateCallerName(callerInfo.name, callerInfo.displayName);
            if (!nameValidation.isValid) {
                validation.riskLevel = validation.riskLevel === 'high' ? 'high' : 'medium';
                validation.reasons.push('Caller name contains suspicious content');
                validation.suggestions.push('Use professional business names');
            }

            // Risk level determination
            if (validation.reasons.length === 0) {
                validation.riskLevel = 'low';
            } else if (validation.reasons.some(r => r.includes('high'))) {
                validation.riskLevel = 'high';
            } else if (validation.reasons.some(r => r.includes('medium'))) {
                validation.riskLevel = 'medium';
            }

            // Overall safety check
            validation.isSafe = validation.riskLevel !== 'high' &&
                validation.reasons.filter(r => r.includes('Invalid') || r.includes('blocked')).length === 0;

            logger.debug(`Caller ID validation completed for ${callerInfo.displayName}: ${validation.riskLevel} risk`);
            return validation;
        } catch (error) {
            logger.error('Caller ID validation failed:', error as any);
            return {
                isSafe: false,
                riskLevel: 'high',
                reasons: ['Validation system error'],
                suggestions: ['Contact support if problem persists'],
                needsReview: true
            };
        }
    }

    /**
     * Generate a safe caller ID
     */
    public async generateSafeCallerID(
        options: {
            callerType?: 'safe' | 'emergency' | 'business' | 'personal';
            region?: string;
            useCustomContact?: boolean;
            userId?: string;
        } = {}
    ): Promise<FakeCallResult<CallerInfo>> {
        try {
            if (!this.isInitialized) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.INVALID_CALLER_ID,
                        code: 'NOT_INITIALIZED',
                        message: 'Caller ID service not initialized',
                        recoverable: true,
                        suggestedAction: 'Call initialize() first',
                        timestamp: new Date(),
                        callId: '',
                        userId: ''
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            const callerType = options.callerType || 'safe';
            let callerInfo: CallerInfo;

            // Check if we should use a custom contact
            if (options.useCustomContact && options.userId) {
                const customContact = this.getRandomCustomContact(options.userId);
                if (customContact) {
                    callerInfo = this.createCallerInfoFromContact(customContact);
                } else {
                    callerInfo = await this.generateRandomCallerInfo(callerType, options.region);
                }
            } else {
                callerInfo = await this.generateRandomCallerInfo(callerType, options.region);
            }

            // Validate the generated caller info
            const validation = this.validateCallerID(callerInfo);
            if (!validation.isSafe) {
                // Try again with different parameters
                callerInfo = await this.generateRandomCallerInfo('safe', 'US');
                const retryValidation = this.validateCallerID(callerInfo);

                if (!retryValidation.isSafe) {
                    return {
                        success: false,
                        error: {
                            type: CallErrorType.INVALID_CALLER_ID,
                            code: 'GENERATION_FAILED',
                            message: 'Unable to generate safe caller ID',
                            recoverable: true,
                            suggestedAction: 'Try different caller type or region',
                            technicalDetails: validation,
                            timestamp: new Date(),
                            callId: '',
                            userId: ''
                        },
                        metadata: {
                            timestamp: new Date(),
                            requestId: uuidv4(),
                            duration: 0,
                            platform: Platform.OS as any
                        }
                    };
                }
            }

            // Update usage statistics
            this.updateCallerUsage(callerInfo.id);

            logger.info(`Generated safe caller ID: ${callerInfo.displayName} (${callerInfo.phoneNumber})`);
            return {
                success: true,
                data: callerInfo,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error('Failed to generate safe caller ID:', error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.INVALID_CALLER_ID,
                    code: 'GENERATION_ERROR',
                    message: 'Failed to generate caller ID',
                    recoverable: true,
                    suggestedAction: 'Check service configuration',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId: ''
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Get the safe name database
     */
    public getSafeNameDatabase(): SafeNameDatabase {
        return {
            ...this.safeNameDatabase
        };
    }

    /**
     * Validate phone number format and safety
     */
    public validatePhoneNumber(number: string): PhoneNumberValidation {
        try {
            // Clean the number
            const cleaned = number.replace(/[\s\-\(\)\.]/g, '');

            const validation: PhoneNumberValidation = {
                isValid: false,
                isSafe: true,
                format: 'local',
                region: 'US',
                isEmergency: false,
                isTollFree: false,
                riskFlags: []
            };

            // Emergency number detection
            if (this.isEmergencyNumber(cleaned)) {
                validation.isEmergency = true;
                validation.isValid = true;
                validation.riskFlags.push('emergency');
                return validation;
            }

            // Format validation
            if (cleaned.startsWith('+')) {
                validation.format = 'international';
                validation.region = cleaned.substring(1, 3);
            } else if (cleaned.startsWith('1') && cleaned.length === 11) {
                validation.format = 'national';
                validation.region = 'US';
            } else if (cleaned.length === 10) {
                validation.format = 'local';
                validation.region = 'US';
            } else {
                validation.riskFlags.push('unusual_length');
                return validation;
            }

            // Toll-free detection
            if (this.isTollFreeNumber(cleaned)) {
                validation.isTollFree = true;
                validation.riskFlags.push('toll_free');
            }

            // Suspicious pattern detection
            if (this.hasSuspiciousPattern(cleaned)) {
                validation.riskFlags.push('suspicious_pattern');
                validation.isSafe = false;
            }

            // Validate region
            validation.isValid = this.isValidPhoneRegion(validation.region);

            return validation;
        } catch (error) {
            logger.error('Phone number validation failed:', error as any);
            return {
                isValid: false,
                isSafe: false,
                format: 'local',
                region: 'US',
                isEmergency: false,
                isTollFree: false,
                riskFlags: ['validation_error']
            };
        }
    }

    /**
     * Add custom caller contact (Pro feature)
     */
    public async addCustomContact(
        contact: Omit<ContactProfile, 'id' | 'usageCount' | 'lastUsed'>,
        userId: string
    ): Promise<FakeCallResult<ContactProfile>> {
        try {
            // Check limits
            const userContacts = this.customContacts.filter(c => c.userId === userId);
            if (userContacts.length >= this.MAX_CUSTOM_CONTACTS) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.RESOURCE_EXHAUSTED,
                        code: 'CONTACT_LIMIT_REACHED',
                        message: 'Maximum custom contacts limit reached',
                        recoverable: false,
                        suggestedAction: 'Remove unused contacts to add new ones',
                        timestamp: new Date(),
                        callId: '',
                        userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Create contact
            const newContact: ContactProfile = {
                ...contact,
                id: uuidv4(),
                userId,
                usageCount: 0,
                lastUsed: new Date()
            };

            // Validate contact
            const callerInfo: CallerInfo = {
                id: newContact.id,
                name: newContact.name,
                phoneNumber: newContact.phoneNumber,
                callerType: newContact.callerType,
                location: newContact.location,
                avatarUrl: newContact.avatarUrl,
                riskLevel: 'low',
                isVerified: newContact.isVerified,
                displayName: newContact.name
            };

            const validation = this.validateCallerID(callerInfo);
            if (!validation.isSafe) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.INVALID_CALLER_ID,
                        code: 'CONTACT_VALIDATION_FAILED',
                        message: 'Contact failed safety validation',
                        recoverable: false,
                        suggestedAction: 'Check contact details for safety compliance',
                        technicalDetails: validation,
                        timestamp: new Date(),
                        callId: '',
                        userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            // Add to storage
            this.customContacts.push(newContact);
            await this.saveCustomContacts();

            logger.info(`Added custom contact: ${newContact.name}`);
            return {
                success: true,
                data: newContact,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error('Failed to add custom contact:', error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.INVALID_CALLER_ID,
                    code: 'ADD_CONTACT_FAILED',
                    message: 'Failed to add custom contact',
                    recoverable: true,
                    suggestedAction: 'Check contact format and try again',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Get user's custom contacts
     */
    public getCustomContacts(userId: string): ContactProfile[] {
        return this.customContacts.filter(contact => contact.userId === userId);
    }

    /**
     * Remove custom contact
     */
    public async removeCustomContact(contactId: string, userId: string): Promise<FakeCallResult<void>> {
        try {
            const initialLength = this.customContacts.length;
            this.customContacts = this.customContacts.filter(
                contact => !(contact.id === contactId && contact.userId === userId)
            );

            if (this.customContacts.length === initialLength) {
                return {
                    success: false,
                    error: {
                        type: CallErrorType.ACCESS_DENIED,
                        code: 'CONTACT_NOT_FOUND',
                        message: 'Contact not found or access denied',
                        recoverable: false,
                        suggestedAction: 'Check contact ID and user permissions',
                        timestamp: new Date(),
                        callId: '',
                        userId
                    },
                    metadata: {
                        timestamp: new Date(),
                        requestId: uuidv4(),
                        duration: 0,
                        platform: Platform.OS as any
                    }
                };
            }

            await this.saveCustomContacts();
            logger.info(`Removed custom contact: ${contactId}`);

            return {
                success: true,
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        } catch (error) {
            logger.error('Failed to remove custom contact:', error as any);
            return {
                success: false,
                error: {
                    type: CallErrorType.INVALID_CALLER_ID,
                    code: 'REMOVE_CONTACT_FAILED',
                    message: 'Failed to remove custom contact',
                    recoverable: true,
                    suggestedAction: 'Try again or contact support',
                    technicalDetails: error as any,
                    timestamp: new Date(),
                    callId: '',
                    userId
                },
                metadata: {
                    timestamp: new Date(),
                    requestId: uuidv4(),
                    duration: 0,
                    platform: Platform.OS as any
                }
            };
        }
    }

    /**
     * Get available caller ID patterns
     */
    public getCallerIDPatterns(): CallerIDPattern[] {
        return [
            { type: 'business', region: 'US', format: '(XXX) XXX-XXXX', example: '(555) 123-4567' },
            { type: 'business', region: 'US', format: '+1-XXX-XXX-XXXX', example: '+1-555-123-4567' },
            { type: 'personal', region: 'US', format: '(XXX) XXX-XXXX', example: '(555) 987-6543' },
            { type: 'emergency', region: 'US', format: 'XXX', example: '911' },
            { type: 'international', region: 'UK', format: '+44 XXXX XXXXXX', example: '+44 20 7123 4567' }
        ];
    }

    /**
     * Get usage statistics
     */
    public getUsageStats(userId?: string): {
        totalContacts: number;
        customContacts: number;
        dailyUsage: number;
        riskLevel: 'low' | 'medium' | 'high';
    } {
        const contacts = userId ? this.getCustomContacts(userId) : this.customContacts;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dailyUsage = contacts.reduce((count, contact) => {
            const lastUsed = new Date(contact.lastUsed);
            lastUsed.setHours(0, 0, 0, 0);
            return count + (lastUsed.getTime() === today.getTime() ? 1 : 0);
        }, 0);

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (dailyUsage > this.MAX_DAILY_CALLS * 0.8) {
            riskLevel = 'high';
        } else if (dailyUsage > this.MAX_DAILY_CALLS * 0.5) {
            riskLevel = 'medium';
        }

        return {
            totalContacts: this.customContacts.length,
            customContacts: contacts.length,
            dailyUsage,
            riskLevel
        };
    }

    // Private implementation methods

    private initializeSafeNameDatabase(): void {
        this.safeNameDatabase = {
            firstNames: {
                male: [
                    'James', 'Robert', 'John', 'Michael', 'David', 'William', 'Richard',
                    'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark',
                    'Steven', 'Paul', 'Andrew', 'Joshua', 'Kenneth', 'Kevin', 'Brian'
                ],
                female: [
                    'Mary', 'Patricia', 'Jennifer', 'Linda', 'Elizabeth', 'Barbara',
                    'Susan', 'Jessica', 'Sarah', 'Karen', 'Nancy', 'Lisa', 'Betty',
                    'Sandra', 'Ashley', 'Dorothy', 'Kimberly', 'Emily', 'Donna',
                    'Michelle'
                ],
                neutral: [
                    'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley',
                    'Avery', 'Quinn', 'Sage', 'River', 'Phoenix', 'Drew',
                    'Corey', 'Dylan', 'Logan', 'Mason', 'Reese', 'Rowan'
                ]
            },
            lastNames: [
                'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
                'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
                'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
                'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark'
            ],
            businessNames: [
                'TechCorp Solutions', 'Global Enterprises Inc.', 'Pacific Associates',
                'Metro Consulting Group', 'Summit Business Services', 'Premier Solutions',
                'Advanced Systems LLC', 'Strategic Partners Corp', 'Innovation Group',
                'Professional Services Ltd.', 'Corporate Solutions Inc.', 'Elite Consulting'
            ],
            emergencyContacts: [
                { service: 'Emergency Services', number: '911', description: 'Emergency response' },
                { service: 'Police', number: '911', description: 'Police emergency' },
                { service: 'Fire Department', number: '911', description: 'Fire emergency' }
            ],
            blockedPatterns: [
                '555-0100', '555-0111', '555-0122', '555-0133', '555-0144',
                '000-000-0000', '123-456-7890'
            ],
            suspiciousPatterns: [
                '555-01', '555-09', '999', '666', '123'
            ]
        };

        this.blockedPatterns = this.safeNameDatabase.blockedPatterns;
        this.suspiciousPatterns = this.safeNameDatabase.suspiciousPatterns;
    }

    private initializeCallerIDPatterns(): void {
        this.geographicRegions = [
            {
                code: 'US',
                name: 'United States',
                countryCode: '+1',
                numberLength: 10,
                format: '(XXX) XXX-XXXX',
                isTollFreeAvailable: true
            },
            {
                code: 'UK',
                name: 'United Kingdom',
                countryCode: '+44',
                numberLength: 10,
                format: 'XXXX XXXXXX',
                isTollFreeAvailable: true
            },
            {
                code: 'CA',
                name: 'Canada',
                countryCode: '+1',
                numberLength: 10,
                format: '(XXX) XXX-XXXX',
                isTollFreeAvailable: true
            }
        ];
    }

    private async generateRandomCallerInfo(
        callerType: 'safe' | 'emergency' | 'business' | 'personal',
        region?: string
    ): Promise<CallerInfo> {
        const regionData = region ? this.geographicRegions.find(r => r.code === region) :
            this.geographicRegions[0];

        const phoneNumber = this.generatePhoneNumber(regionData);
        const name = this.generateName(callerType);
        const displayName = this.generateDisplayName(name, callerType);

        return {
            id: uuidv4(),
            name,
            phoneNumber,
            callerType,
            location: regionData?.name,
            riskLevel: 'low',
            isVerified: true,
            displayName
        };
    }

    private generatePhoneNumber(region?: GeographicRegion): string {
        if (!region) {
            // Default US number
            const areaCode = Math.floor(Math.random() * 800) + 200;
            const exchange = Math.floor(Math.random() * 800) + 200;
            const number = Math.floor(Math.random() * 9000) + 1000;
            return `(${areaCode}) ${exchange}-${number}`;
        }

        switch (region.code) {
            case 'US':
            case 'CA':
                const areaCode = Math.floor(Math.random() * 800) + 200;
                const exchange = Math.floor(Math.random() * 800) + 200;
                const number = Math.floor(Math.random() * 9000) + 1000;
                return `(${areaCode}) ${exchange}-${number}`;

            case 'UK':
                const ukArea = Math.floor(Math.random() * 50) + 20;
                const ukNumber = Math.floor(Math.random() * 9000000) + 1000000;
                return `020 ${ukArea} ${ukNumber}`;

            default:
                return `+${region.countryCode} ${Math.floor(Math.random() * 9000000000) + 1000000000}`;
        }
    }

    private generateName(callerType: string): string {
        const { firstNames, lastNames, businessNames } = this.safeNameDatabase;

        switch (callerType) {
            case 'business':
                return businessNames[Math.floor(Math.random() * businessNames.length)];

            case 'personal':
            case 'safe':
                const gender = Math.random() < 0.5 ? 'male' : 'female';
                const firstName = firstNames[gender][Math.floor(Math.random() * firstNames[gender].length)];
                const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
                return `${firstName} ${lastName}`;

            default:
                const neutralFirst = firstNames.neutral[Math.floor(Math.random() * firstNames.neutral.length)];
                const last = lastNames[Math.floor(Math.random() * lastNames.length)];
                return `${neutralFirst} ${last}`;
        }
    }

    private generateDisplayName(name: string, callerType: string): string {
        if (callerType === 'business') {
            // Add title for business
            const titles = ['Dr.', 'Mr.', 'Ms.', 'Mrs.'];
            const title = titles[Math.floor(Math.random() * titles.length)];
            return `${title} ${name}`;
        } else if (callerType === 'emergency') {
            return 'Emergency Services';
        }
        return name;
    }

    private createCallerInfoFromContact(contact: ContactProfile): CallerInfo {
        return {
            id: contact.id,
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            callerType: contact.callerType,
            location: contact.location,
            avatarUrl: contact.avatarUrl,
            riskLevel: 'low',
            isVerified: contact.isVerified,
            displayName: contact.name
        };
    }

    private getRandomCustomContact(userId: string): ContactProfile | null {
        const userContacts = this.customContacts.filter(c => c.userId === userId);
        if (userContacts.length === 0) return null;
        return userContacts[Math.floor(Math.random() * userContacts.length)];
    }

    private updateCallerUsage(callerId: string): void {
        logger.debug(`Updated usage for caller: ${callerId}`);
    }

    // Validation methods

    private isBlockedPattern(phoneNumber: string): boolean {
        return this.blockedPatterns.some(pattern => phoneNumber.includes(pattern));
    }

    private isSuspiciousPattern(phoneNumber: string): boolean {
        return this.suspiciousPatterns.some(pattern => phoneNumber.includes(pattern));
    }

    private hasSuspiciousPattern(phoneNumber: string): boolean {
        const suspiciousSequences = ['123', '456', '789', '000', '111', '222'];
        return suspiciousSequences.some(seq => phoneNumber.includes(seq));
    }

    private isEmergencyNumber(number: string): boolean {
        const emergencyNumbers = ['911', '112', '999', '000', '110'];
        return emergencyNumbers.includes(number) ||
            emergencyNumbers.some(emergency => number.startsWith(emergency));
    }

    private isTollFreeNumber(number: string): boolean {
        const tollFreePatterns = ['800', '888', '877', '866', '855', '844', '833'];
        return tollFreePatterns.some(pattern => number.includes(pattern));
    }

    private isValidPhoneRegion(region: string): boolean {
        return this.geographicRegions.some(r => r.code === region);
    }

    private isValidGeographicRegion(region: string): boolean {
        return this.geographicRegions.some(r => r.code === region);
    }

    private isEmergencyAllowed(callerInfo: CallerInfo): boolean {
        return callerInfo.callerType === 'emergency' && callerInfo.isVerified;
    }

    private validateBusinessNumber(phoneNumber: string): { isValid: boolean; issues: string[] } {
        const issues: string[] = [];

        if (!phoneNumber.match(/[\d\-\(\)\+]/)) {
            issues.push('Invalid business number format');
        }

        const cleaned = phoneNumber.replace(/[\s\-\(\)\.]/g, '');
        if (cleaned.length < 10 || cleaned.length > 15) {
            issues.push('Business number length outside expected range');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    private validateCallerName(name: string, displayName: string): { isValid: boolean; issues: string[] } {
        const issues: string[] = [];

        const inappropriateWords = ['scam', 'spam', 'fraud', 'fake'];
        const nameLower = name.toLowerCase();
        const displayLower = displayName.toLowerCase();

        if (inappropriateWords.some(word => nameLower.includes(word) || displayLower.includes(word))) {
            issues.push('Name contains inappropriate content');
        }

        if (name.length < 2 || name.length > 50) {
            issues.push('Name length outside acceptable range');
        }

        if (!name.match(/^[a-zA-Z\s\.\-']+$/)) {
            issues.push('Name contains invalid characters');
        }

        return {
            isValid: issues.length === 0,
            issues
        };
    }

    private async validateAllContacts(): Promise<void> {
        for (const contact of this.customContacts) {
            const callerInfo: CallerInfo = {
                id: contact.id,
                name: contact.name,
                phoneNumber: contact.phoneNumber,
                callerType: contact.callerType,
                location: contact.location,
                avatarUrl: contact.avatarUrl,
                riskLevel: 'low',
                isVerified: contact.isVerified,
                displayName: contact.name
            };

            const validation = this.validateCallerID(callerInfo);
            if (!validation.isSafe) {
                logger.warn(`Contact ${contact.name} failed validation, marked for review`);
                contact.isVerified = false;
            }
        }
    }

    // Storage methods

    private async loadCustomContacts(): Promise<void> {
        try {
            const contacts = await AsyncStorage.getItem('custom_contacts');
            if (contacts) {
                this.customContacts = JSON.parse(contacts);
                logger.debug(`Loaded ${this.customContacts.length} custom contacts`);
            }
        } catch (error) {
            logger.warn('Failed to load custom contacts from storage:', error as any);
        }
    }

    private async saveCustomContacts(): Promise<void> {
        try {
            await AsyncStorage.setItem('custom_contacts', JSON.stringify(this.customContacts));
        } catch (error) {
            logger.warn('Failed to save custom contacts to storage:', error as any);
        }
    }

    private async loadSafetyPatterns(): Promise<void> {
        logger.debug('Loaded safety patterns');
    }

    /**
     * Cleanup resources
     */
    public async dispose(): Promise<void> {
        try {
            await this.saveCustomContacts();
            this.customContacts = [];
            this.isInitialized = false;
            logger.info('Caller ID Service disposed');
        } catch (error) {
            logger.error('Error during Caller ID Service disposal:', error as any);
        }
    }
}

// Export singleton instance
export const callerIDService = CallerIDService.getInstance();
export default callerIDService;