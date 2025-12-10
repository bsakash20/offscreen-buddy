/**
 * Notification Preferences Service for OffScreen Buddy
 * Manages user notification preferences and settings
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    NotificationPreferences,
    NotificationCategory,
    NotificationPriority,
    CategoryPreferences,
    NotificationFrequency,
} from './types';
import { logger } from '../../_utils/Logger';

export class NotificationPreferencesService {
    private static readonly STORAGE_KEY = 'notification_preferences';
    private isInitialized = false;
    private defaultPreferences: NotificationPreferences;

    constructor() {
        this.defaultPreferences = this.getDefaultPreferences();
    }

    async initialize(): Promise<void> {
        try {
            this.isInitialized = true;
            logger.info('NotificationPreferencesService initialized');
        } catch (error: any) {
            logger.error('Failed to initialize NotificationPreferencesService:', error);
            throw error;
        }
    }

    async getUserPreferences(userId: string): Promise<NotificationPreferences> {
        try {
            const stored = await this.getStoredPreferences(userId);
            if (stored) {
                return stored;
            }

            // Return default preferences for new users
            return {
                ...this.defaultPreferences,
                userId,
                updatedAt: new Date(),
            };
        } catch (error: any) {
            logger.error('Failed to get user preferences:', error);
            // Return default preferences as fallback
            return {
                ...this.defaultPreferences,
                userId,
                updatedAt: new Date(),
            };
        }
    }

    async updateUserPreferences(
        userId: string,
        updates: Partial<NotificationPreferences>
    ): Promise<void> {
        try {
            const currentPreferences = await this.getUserPreferences(userId);

            const updatedPreferences: NotificationPreferences = {
                ...currentPreferences,
                ...updates,
                userId,
                updatedAt: new Date(),
            };

            // Validate updated preferences
            this.validatePreferences(updatedPreferences);

            // Store updated preferences
            await this.storePreferences(userId, updatedPreferences);

            logger.info('User preferences updated', { userId });
        } catch (error: any) {
            logger.error('Failed to update user preferences:', error);
            throw error;
        }
    }

    async getCategoryPreferences(
        userId: string,
        category: NotificationCategory
    ): Promise<CategoryPreferences | undefined> {
        try {
            const preferences = await this.getUserPreferences(userId);
            return preferences.categories[category];
        } catch (error: any) {
            logger.error('Failed to get category preferences:', error);
            return undefined;
        }
    }

    async updateCategoryPreferences(
        userId: string,
        category: NotificationCategory,
        preferences: CategoryPreferences
    ): Promise<void> {
        try {
            const currentPreferences = await this.getUserPreferences(userId);

            const updatedPreferences = {
                ...currentPreferences,
                categories: {
                    ...currentPreferences.categories,
                    [category]: preferences,
                },
                updatedAt: new Date(),
            };

            await this.updateUserPreferences(userId, updatedPreferences);

            logger.info('Category preferences updated', { userId, category });
        } catch (error: any) {
            logger.error('Failed to update category preferences:', error);
            throw error;
        }
    }

    async resetToDefaults(userId: string): Promise<void> {
        try {
            const defaultPrefs = {
                ...this.defaultPreferences,
                userId,
                updatedAt: new Date(),
            };

            await this.storePreferences(userId, defaultPrefs);

            logger.info('Preferences reset to defaults', { userId });
        } catch (error: any) {
            logger.error('Failed to reset preferences:', error);
            throw error;
        }
    }

    async exportPreferences(userId: string): Promise<string> {
        try {
            const preferences = await this.getUserPreferences(userId);
            return JSON.stringify(preferences, null, 2);
        } catch (error: any) {
            logger.error('Failed to export preferences:', error);
            throw error;
        }
    }

    async importPreferences(userId: string, preferencesJson: string): Promise<void> {
        try {
            const importedPreferences = JSON.parse(preferencesJson) as NotificationPreferences;

            // Validate imported preferences
            this.validatePreferences(importedPreferences);

            // Update with imported preferences
            await this.updateUserPreferences(userId, {
                ...importedPreferences,
                userId,
            });

            logger.info('Preferences imported successfully', { userId });
        } catch (error: any) {
            logger.error('Failed to import preferences:', error);
            throw error;
        }
    }

    async dispose(): Promise<void> {
        try {
            this.isInitialized = false;
            logger.info('NotificationPreferencesService disposed');
        } catch (error: any) {
            logger.error('Error disposing NotificationPreferencesService:', error);
        }
    }

    // Private methods

    private async getStoredPreferences(userId: string): Promise<NotificationPreferences | null> {
        try {
            const storageKey = `${NotificationPreferencesService.STORAGE_KEY}_${userId}`;
            const stored = await AsyncStorage.getItem(storageKey);
            if (stored) {
                const preferences = JSON.parse(stored) as NotificationPreferences;
                // Convert date strings back to Date objects
                return this.deserializePreferences(preferences);
            }
            return null;
        } catch (error: any) {
            logger.error('Failed to get stored preferences:', error);
            return null;
        }
    }

    private async storePreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
        try {
            const storageKey = `${NotificationPreferencesService.STORAGE_KEY}_${userId}`;
            const serialized = JSON.stringify(this.serializePreferences(preferences));
            await AsyncStorage.setItem(storageKey, serialized);
        } catch (error: any) {
            logger.error('Failed to store preferences:', error);
            throw error;
        }
    }

    private serializePreferences(preferences: NotificationPreferences): any {
        return {
            ...preferences,
            updatedAt: preferences.updatedAt.toISOString(),
        };
    }

    private deserializePreferences(preferences: any): NotificationPreferences {
        return {
            ...preferences,
            updatedAt: new Date(preferences.updatedAt),
        };
    }

    private validatePreferences(preferences: NotificationPreferences): void {
        // Validate required fields
        if (!preferences.userId) {
            throw new Error('User ID is required');
        }

        // Validate do not disturb times
        if (preferences.doNotDisturb.enabled) {
            const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(preferences.doNotDisturb.startTime)) {
                throw new Error('Invalid start time format');
            }
            if (!timeRegex.test(preferences.doNotDisturb.endTime)) {
                throw new Error('Invalid end time format');
            }
        }

        // Validate personalization settings
        if (!['none', 'light', 'moderate', 'heavy'].includes(preferences.personalization.humorLevel)) {
            throw new Error('Invalid humor level');
        }

        if (!['serious', 'motivational', 'humorous', 'mixed'].includes(preferences.personalization.messageTone)) {
            throw new Error('Invalid message tone');
        }

        // Validate category preferences
        if (preferences.categories) {
            Object.entries(preferences.categories).forEach(([category, catPrefs]) => {
                if (!this.isValidCategory(category as NotificationCategory)) {
                    throw new Error(`Invalid category: ${category}`);
                }
                if (catPrefs) {
                    this.validateCategoryPreferences(catPrefs);
                }
            });
        }
    }

    private validateCategoryPreferences(preferences: CategoryPreferences): void {
        if (!['low', 'normal', 'high', 'urgent'].includes(preferences.priority)) {
            throw new Error('Invalid priority');
        }

        if (preferences.frequency) {
            this.validateFrequency(preferences.frequency);
        }
    }

    private validateFrequency(frequency: NotificationFrequency): void {
        if (!['immediate', 'scheduled', 'adaptive', 'batch'].includes(frequency.type)) {
            throw new Error('Invalid frequency type');
        }

        if (frequency.interval !== undefined && frequency.interval < 5) {
            throw new Error('Interval must be at least 5 seconds');
        }

        if (frequency.maxPerDay !== undefined && frequency.maxPerDay < 1) {
            throw new Error('Max per day must be at least 1');
        }
    }

    private isValidCategory(category: string): category is NotificationCategory {
        return Object.values(NotificationCategory).includes(category as NotificationCategory);
    }

    private getDefaultPreferences(): NotificationPreferences {
        return {
            userId: '',
            enabled: true,
            doNotDisturb: {
                enabled: false,
                startTime: '22:00',
                endTime: '07:00',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                allowUrgent: true,
            },
            categories: {
                [NotificationCategory.TIMERS]: {
                    enabled: true,
                    priority: NotificationPriority.NORMAL,
                    frequency: {
                        type: 'immediate',
                        smartBatching: false,
                    },
                    quietHoursOverride: false,
                    customSounds: false,
                    vibrationPattern: true,
                },
                [NotificationCategory.ACHIEVEMENTS]: {
                    enabled: true,
                    priority: NotificationPriority.HIGH,
                    frequency: {
                        type: 'immediate',
                        smartBatching: false,
                    },
                    quietHoursOverride: true, // Achievements can break through DND
                    customSounds: true,
                    vibrationPattern: [0, 250, 100, 250],
                },
                [NotificationCategory.REMINDERS]: {
                    enabled: true,
                    priority: NotificationPriority.NORMAL,
                    frequency: {
                        type: 'scheduled',
                        interval: 300, // 5 minutes
                        smartBatching: true,
                    },
                    quietHoursOverride: false,
                    customSounds: false,
                    vibrationPattern: true,
                },
                [NotificationCategory.MOTIVATIONAL]: {
                    enabled: true,
                    priority: NotificationPriority.LOW,
                    frequency: {
                        type: 'adaptive',
                        smartBatching: true,
                        batchSize: 3,
                        batchInterval: 600, // 10 minutes
                    },
                    quietHoursOverride: false,
                    customSounds: false,
                    vibrationPattern: false,
                },
                [NotificationCategory.URGENT]: {
                    enabled: true,
                    priority: NotificationPriority.URGENT,
                    frequency: {
                        type: 'immediate',
                        smartBatching: false,
                    },
                    quietHoursOverride: true, // Urgent always breaks through
                    customSounds: true,
                    vibrationPattern: [0, 500, 200, 500, 200, 500],
                },
                [NotificationCategory.CUSTOM]: {
                    enabled: false,
                    priority: NotificationPriority.NORMAL,
                    frequency: {
                        type: 'scheduled',
                        smartBatching: false,
                    },
                    quietHoursOverride: false,
                    customSounds: false,
                    vibrationPattern: true,
                },
            },
            platform: {
                ios: {
                    sound: true,
                    badge: true,
                    alert: true,
                    notificationCenter: true,
                    lockScreen: true,
                    carPlay: false,
                    criticalAlerts: false,
                    scheduledDelivery: true,
                },
                android: {
                    sound: true,
                    vibrate: true,
                    lights: true,
                    vibrationPattern: [0, 250, 250, 250],
                    importance: 'default',
                    category: 'reminder',
                    visibility: 'private',
                },
                web: {
                    sound: true,
                    persistent: false,
                    requireInteraction: false,
                    silent: false,
                },
            },
            smartScheduling: {
                enabled: true,
                adaptiveFrequency: true,
                skipDuringMeetings: true,
                skipDuringFocus: true,
                userActivityAware: true,
            },
            personalization: {
                humorLevel: 'moderate',
                messageTone: 'mixed',
                language: 'en',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
            updatedAt: new Date(),
        };
    }
}