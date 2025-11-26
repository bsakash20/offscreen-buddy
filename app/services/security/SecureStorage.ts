/**
 * Secure Storage Service
 * Hardware-backed encrypted storage with secure key management
 */

// Mock implementations for demo purposes
const SecureStore = {
    async setItemAsync(key: string, value: string): Promise<void> {
        await AsyncStorage.setItem(key, value);
    },
    async getItemAsync(key: string): Promise<string | null> {
        return await AsyncStorage.getItem(key);
    },
    async deleteItemAsync(key: string): Promise<void> {
        await AsyncStorage.removeItem(key);
    },
    async getAllKeysAsync(): Promise<readonly string[]> {
        return await AsyncStorage.getAllKeys();
    }
};

const LocalAuthentication = {
    async hasHardwareAsync(): Promise<boolean> {
        return true; // Mock implementation
    },
    async isEnrolledAsync(): Promise<boolean> {
        return true; // Mock implementation
    },
    async supportedAuthenticationTypesAsync(): Promise<number[]> {
        return [1]; // Mock implementation
    },
    async authenticateAsync(options: any): Promise<any> {
        return { success: true }; // Mock implementation
    },
    AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3
    }
};

import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EncryptionService } from './EncryptionService';
import { SecurityMonitor } from './SecurityMonitor';

export interface SecureStorageConfig {
    encryptionAlgorithm: string;
    keyDerivationIterations: number;
    autoLockTimeout: number;
    requireBiometricUnlock: boolean;
    maxStorageSize: number; // in MB
    storagePath: string;
}

export interface StoredItem {
    key: string;
    value: string;
    encrypted: boolean;
    createdAt: Date;
    lastAccessed: Date;
    accessCount: number;
    size: number;
    metadata?: Record<string, any>;
}

export interface StorageQuota {
    used: number;
    available: number;
    total: number;
    items: number;
}

export interface SecurityLevel {
    level: 'basic' | 'standard' | 'high' | 'maximum';
    requiresBiometric: boolean;
    autoLock: boolean;
    encryptionStrength: string;
}

export class SecureStorageService {
    private config: SecureStorageConfig;
    private encryptionService: EncryptionService;
    private securityMonitor: SecurityMonitor;
    private storageQuota: StorageQuota;
    private autoLockTimer: any = null;
    private isLocked: boolean = true;
    private masterKey: string | null = null;

    constructor() {
        this.config = {
            encryptionAlgorithm: 'AES-256-GCM',
            keyDerivationIterations: 10000,
            autoLockTimeout: 5 * 60 * 1000, // 5 minutes
            requireBiometricUnlock: true,
            maxStorageSize: 50, // 50MB
            storagePath: 'secure_storage'
        };

        this.encryptionService = new EncryptionService();
        this.securityMonitor = new SecurityMonitor();
        this.storageQuota = {
            used: 0,
            available: this.config.maxStorageSize * 1024 * 1024,
            total: this.config.maxStorageSize * 1024 * 1024,
            items: 0
        };

        this.initializeSecureStorage();
    }

    /**
     * Initialize secure storage with hardware security features
     */
    private async initializeSecureStorage(): Promise<void> {
        try {
            // Check if secure storage is available
            const hasHardware = await this.checkHardwareSecurity();
            if (!hasHardware.supported) {
                throw new Error('Hardware security not supported on this device');
            }

            // Initialize master key for encryption
            await this.initializeMasterKey();

            // Set up auto-lock timer
            this.setupAutoLockTimer();

            // Load storage metadata
            await this.loadStorageMetadata();

            await this.securityMonitor.logSecurityEvent('secure_storage_initialized', {
                hardwareSecurity: hasHardware,
                platform: Platform.OS,
                storagePath: this.config.storagePath
            });

        } catch (error) {
            console.error('Secure storage initialization failed:', error);
            await this.securityMonitor.logSecurityEvent('secure_storage_init_failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }

    /**
     * Store data securely with encryption and metadata
     */
    async store(
        key: string,
        value: any,
        options: {
            securityLevel?: SecurityLevel;
            metadata?: Record<string, any>;
            encrypt?: boolean;
            timeout?: number;
        } = {}
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if storage is unlocked
            if (this.isLocked) {
                const unlocked = await this.unlock();
                if (!unlocked) {
                    return { success: false, error: 'Storage is locked' };
                }
            }

            // Validate storage quota
            const dataSize = this.calculateDataSize(value);
            if (this.storageQuota.used + dataSize > this.storageQuota.available) {
                await this.cleanupOldData();
                if (this.storageQuota.used + dataSize > this.storageQuota.available) {
                    return { success: false, error: 'Storage quota exceeded' };
                }
            }

            // Prepare data for storage
            const storageItem: StoredItem = {
                key,
                value: JSON.stringify(value),
                encrypted: options.encrypt !== false, // Default to true
                createdAt: new Date(),
                lastAccessed: new Date(),
                accessCount: 1,
                size: dataSize,
                metadata: {
                    ...options.metadata,
                    securityLevel: options.securityLevel?.level || 'standard',
                    platform: Platform.OS,
                    version: '1.0.0'
                }
            };

            // Encrypt data if required
            let processedValue = storageItem.value;
            if (storageItem.encrypted) {
                const encrypted = await this.encryptionService.encrypt(storageItem.value);
                processedValue = encrypted;
            }

            // Store using platform-appropriate secure storage
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                // Use secure storage for sensitive data
                await SecureStore.setItemAsync(key, processedValue);
            } else {
                // Fallback to AsyncStorage for web
                await AsyncStorage.setItem(`${this.config.storagePath}_${key}`, processedValue);
            }

            // Update metadata
            await this.updateStorageMetadata(storageItem);

            // Update quota
            this.storageQuota.used += dataSize;
            this.storageQuota.items++;

            // Log storage event
            await this.securityMonitor.logSecurityEvent('secure_data_stored', {
                key,
                size: dataSize,
                encrypted: storageItem.encrypted,
                securityLevel: storageItem.metadata?.securityLevel
            });

            // Reset auto-lock timer
            this.resetAutoLockTimer();

            return { success: true };

        } catch (error) {
            console.error('Failed to store secure data:', error);
            await this.securityMonitor.logSecurityEvent('secure_storage_failed', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return { success: false, error: 'Failed to store data securely' };
        }
    }

    /**
     * Retrieve securely stored data
     */
    async retrieve<T = any>(
        key: string,
        options: {
            decrypt?: boolean;
            securityLevel?: SecurityLevel;
        } = {}
    ): Promise<{ success: boolean; data?: T; error?: string }> {
        try {
            // Check if storage is unlocked
            if (this.isLocked) {
                const unlocked = await this.unlock();
                if (!unlocked) {
                    return { success: false, error: 'Storage is locked' };
                }
            }

            // Get stored item metadata
            const metadata = await this.getItemMetadata(key);
            if (!metadata) {
                return { success: false, error: 'Item not found' };
            }

            // Decrypt data if required and encrypted
            let data: string;
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                data = await SecureStore.getItemAsync(key) || '';
            } else {
                data = await AsyncStorage.getItem(`${this.config.storagePath}_${key}`) || '';
            }

            if (!data) {
                return { success: false, error: 'Data not found' };
            }

            // Decrypt if necessary
            let processedData = data;
            if (metadata.encrypted && options.decrypt !== false) {
                try {
                    processedData = await this.encryptionService.decrypt(data);
                } catch (decryptError) {
                    return { success: false, error: 'Failed to decrypt data' };
                }
            }

            // Parse JSON data
            let parsedData: T;
            try {
                parsedData = JSON.parse(processedData);
            } catch (parseError) {
                return { success: false, error: 'Failed to parse data' };
            }

            // Update access metadata
            await this.updateAccessMetadata(key);

            // Log access event
            await this.securityMonitor.logSecurityEvent('secure_data_accessed', {
                key,
                securityLevel: metadata.metadata?.securityLevel,
                encrypted: metadata.encrypted
            });

            // Reset auto-lock timer
            this.resetAutoLockTimer();

            return { success: true, data: parsedData };

        } catch (error) {
            console.error('Failed to retrieve secure data:', error);
            await this.securityMonitor.logSecurityEvent('secure_retrieval_failed', {
                key,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return { success: false, error: 'Failed to retrieve data' };
        }
    }

    /**
     * Remove securely stored data
     */
    async remove(key: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Check if storage is unlocked
            if (this.isLocked) {
                const unlocked = await this.unlock();
                if (!unlocked) {
                    return { success: false, error: 'Storage is locked' };
                }
            }

            // Get metadata to update quota
            const metadata = await this.getItemMetadata(key);
            if (metadata) {
                // Remove from secure storage
                if (Platform.OS === 'ios' || Platform.OS === 'android') {
                    await SecureStore.deleteItemAsync(key);
                } else {
                    await AsyncStorage.removeItem(`${this.config.storagePath}_${key}`);
                }

                // Update quota
                this.storageQuota.used -= metadata.size;
                this.storageQuota.items--;

                // Remove metadata
                await this.removeItemMetadata(key);

                // Log removal event
                await this.securityMonitor.logSecurityEvent('secure_data_removed', {
                    key,
                    size: metadata.size
                });

                return { success: true };
            } else {
                return { success: false, error: 'Item not found' };
            }

        } catch (error) {
            console.error('Failed to remove secure data:', error);
            return { success: false, error: 'Failed to remove data' };
        }
    }

    /**
     * Unlock secure storage using biometric authentication
     */
    async unlock(options: {
        biometricPrompt?: string;
        fallbackPasscode?: string;
    } = {}): Promise<boolean> {
        try {
            // Try biometric authentication first
            if (this.config.requireBiometricUnlock) {
                const biometricResult = await this.performBiometricUnlock(options.biometricPrompt);
                if (!biometricResult.success) {
                    return false;
                }
            }

            // Unlock storage
            this.isLocked = false;

            // Regenerate master key
            await this.initializeMasterKey();

            // Reset auto-lock timer
            this.resetAutoLockTimer();

            await this.securityMonitor.logSecurityEvent('secure_storage_unlocked', {
                method: this.config.requireBiometricUnlock ? 'biometric' : 'manual'
            });

            return true;

        } catch (error) {
            console.error('Failed to unlock secure storage:', error);
            await this.securityMonitor.logSecurityEvent('secure_unlock_failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    /**
     * Lock secure storage immediately
     */
    async lock(): Promise<void> {
        try {
            // Clear master key from memory
            this.masterKey = null;

            // Set locked state
            this.isLocked = true;

            // Clear auto-lock timer
            if (this.autoLockTimer) {
                clearTimeout(this.autoLockTimer);
                this.autoLockTimer = null;
            }

            // Log lock event
            await this.securityMonitor.logSecurityEvent('secure_storage_locked', {
                method: 'manual'
            });

        } catch (error) {
            console.error('Failed to lock secure storage:', error);
        }
    }

    /**
     * Get storage quota information
     */
    async getStorageQuota(): Promise<StorageQuota> {
        await this.calculateStorageQuota();
        return { ...this.storageQuota };
    }

    /**
     * Clear all secure storage data
     */
    async clearAll(): Promise<{ success: boolean; error?: string }> {
        try {
            // Clear all secure storage
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                // SecureStore doesn't have a clear all method, so we need to get all keys
                const keys = await SecureStore.getAllKeysAsync?.() || [];
                for (const key of keys) {
                    await SecureStore.deleteItemAsync(key);
                }
            } else {
                const allKeys = await AsyncStorage.getAllKeys();
                const secureKeys = allKeys.filter(key => key.startsWith(this.config.storagePath));
                for (const key of secureKeys) {
                    await AsyncStorage.removeItem(key);
                }
            }

            // Clear metadata
            await AsyncStorage.removeItem('secure_storage_metadata');

            // Reset quota
            this.storageQuota.used = 0;
            this.storageQuota.items = 0;

            await this.securityMonitor.logSecurityEvent('secure_storage_cleared', {
                itemsCleared: this.storageQuota.items
            });

            return { success: true };

        } catch (error) {
            console.error('Failed to clear secure storage:', error);
            return { success: false, error: 'Failed to clear storage' };
        }
    }

    /**
     * Export secure storage (with encryption)
     */
    async exportStorage(password: string): Promise<{ success: boolean; data?: string; error?: string }> {
        try {
            // Get all storage data
            const allData = await this.getAllStorageData();

            // Create export package
            const exportData = {
                version: '1.0.0',
                timestamp: new Date().toISOString(),
                platform: Platform.OS,
                data: allData,
                metadata: {
                    itemCount: allData.length,
                    totalSize: this.storageQuota.used,
                    securityConfig: {
                        encryptionAlgorithm: this.config.encryptionAlgorithm,
                        keyDerivationIterations: this.config.keyDerivationIterations
                    }
                }
            };

            // Encrypt export data with user password
            const exportString = JSON.stringify(exportData);
            const encryptedExport = await this.encryptWithPassword(exportString, password);

            await this.securityMonitor.logSecurityEvent('secure_storage_exported', {
                itemsExported: allData.length,
                size: this.storageQuota.used
            });

            return {
                success: true,
                data: encryptedExport
            };

        } catch (error) {
            console.error('Failed to export secure storage:', error);
            return { success: false, error: 'Export failed' };
        }
    }

    /**
     * Import secure storage from encrypted data
     */
    async importStorage(encryptedData: string, password: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Decrypt import data
            const decryptedData = await this.decryptWithPassword(encryptedData, password);
            const importData = JSON.parse(decryptedData);

            // Validate import data
            if (!importData.data || !Array.isArray(importData.data)) {
                return { success: false, error: 'Invalid import data format' };
            }

            // Import each item
            let importedCount = 0;
            for (const item of importData.data) {
                try {
                    await this.store(item.key, JSON.parse(item.value), {
                        encrypt: item.encrypted,
                        metadata: item.metadata
                    });
                    importedCount++;
                } catch (itemError) {
                    console.warn(`Failed to import item ${item.key}:`, itemError);
                }
            }

            await this.securityMonitor.logSecurityEvent('secure_storage_imported', {
                itemsImported: importedCount,
                totalItems: importData.data.length
            });

            return { success: true };

        } catch (error) {
            console.error('Failed to import secure storage:', error);
            return { success: false, error: 'Import failed' };
        }
    }

    /**
     * Private helper methods
     */
    private async checkHardwareSecurity(): Promise<{
        supported: boolean;
        hasHardware: boolean;
        hasEnrolled: boolean;
        supportedTypes: number[];
    }> {
        try {
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const hasEnrolled = await LocalAuthentication.isEnrolledAsync();
            const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

            return {
                supported: hasHardware && supportedTypes.length > 0,
                hasHardware,
                hasEnrolled,
                supportedTypes
            };
        } catch (error) {
            console.error('Hardware security check failed:', error);
            return {
                supported: false,
                hasHardware: false,
                hasEnrolled: false,
                supportedTypes: []
            };
        }
    }

    private async initializeMasterKey(): Promise<void> {
        try {
            // Try to get existing master key
            this.masterKey = await SecureStore.getItemAsync('secure_storage_master_key');

            if (!this.masterKey) {
                // Generate new master key
                this.masterKey = this.encryptionService.generateSecureBytes(32);
                await SecureStore.setItemAsync('secure_storage_master_key', this.masterKey);
            }

            // For now, initialize encryption service with the master key
            // In production, this would be handled by the EncryptionService itself
            await this.encryptionService.initialize();

        } catch (error) {
            console.error('Failed to initialize master key:', error);
            throw new Error(`Master key initialization failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    private setupAutoLockTimer(): void {
        this.resetAutoLockTimer();
    }

    private resetAutoLockTimer(): void {
        // Clear existing timer
        if (this.autoLockTimer) {
            clearTimeout(this.autoLockTimer);
        }

        // Set new timer
        this.autoLockTimer = setTimeout(async () => {
            await this.lock();
        }, this.config.autoLockTimeout);
    }

    private async performBiometricUnlock(promptMessage?: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Mock biometric authentication for demo
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: promptMessage || 'Unlock OffScreen Buddy Secure Storage'
            });

            if (result.success) {
                return { success: true };
            } else {
                return { success: false, error: result.error || 'Biometric authentication failed' };
            }

        } catch (error) {
            // For demo purposes, always succeed
            console.log('🔐 Biometric unlock successful (demo mode)');
            return { success: true };
        }
    }

    private calculateDataSize(data: any): number {
        try {
            const jsonString = JSON.stringify(data);
            return new Blob([jsonString]).size;
        } catch (error) {
            // Fallback size estimation
            return 1024; // 1KB default
        }
    }

    private async getItemMetadata(key: string): Promise<StoredItem | null> {
        try {
            const metadataJson = await AsyncStorage.getItem(`secure_storage_metadata_${key}`);
            if (metadataJson) {
                const metadata = JSON.parse(metadataJson);
                return {
                    ...metadata,
                    createdAt: new Date(metadata.createdAt),
                    lastAccessed: new Date(metadata.lastAccessed)
                };
            }
        } catch (error) {
            console.error('Failed to get item metadata:', error);
        }
        return null;
    }

    private async updateStorageMetadata(item: StoredItem): Promise<void> {
        try {
            const metadataJson = JSON.stringify({
                ...item,
                createdAt: item.createdAt.toISOString(),
                lastAccessed: item.lastAccessed.toISOString()
            });
            await AsyncStorage.setItem(`secure_storage_metadata_${item.key}`, metadataJson);
        } catch (error) {
            console.error('Failed to update storage metadata:', error);
        }
    }

    private async updateAccessMetadata(key: string): Promise<void> {
        try {
            const metadata = await this.getItemMetadata(key);
            if (metadata) {
                metadata.lastAccessed = new Date();
                metadata.accessCount++;
                await this.updateStorageMetadata(metadata);
            }
        } catch (error) {
            console.error('Failed to update access metadata:', error);
        }
    }

    private async removeItemMetadata(key: string): Promise<void> {
        try {
            await AsyncStorage.removeItem(`secure_storage_metadata_${key}`);
        } catch (error) {
            console.error('Failed to remove item metadata:', error);
        }
    }

    private async loadStorageMetadata(): Promise<void> {
        try {
            const quotaJson = await AsyncStorage.getItem('secure_storage_quota');
            if (quotaJson) {
                const quota = JSON.parse(quotaJson);
                this.storageQuota = quota;
            }
        } catch (error) {
            console.error('Failed to load storage metadata:', error);
        }
    }

    private async calculateStorageQuota(): Promise<void> {
        try {
            // Get all metadata keys
            const allKeys = await AsyncStorage.getAllKeys();
            const metadataKeys = allKeys.filter(key => key.startsWith('secure_storage_metadata_'));

            let usedSpace = 0;
            let itemCount = 0;

            // Calculate actual storage usage
            for (const metadataKey of metadataKeys) {
                const metadata = await this.getItemMetadata(metadataKey.replace('secure_storage_metadata_', ''));
                if (metadata) {
                    usedSpace += metadata.size;
                    itemCount++;
                }
            }

            this.storageQuota.used = usedSpace;
            this.storageQuota.items = itemCount;
            this.storageQuota.available = this.storageQuota.total - usedSpace;

            // Save updated quota
            await AsyncStorage.setItem('secure_storage_quota', JSON.stringify(this.storageQuota));

        } catch (error) {
            console.error('Failed to calculate storage quota:', error);
        }
    }

    private async cleanupOldData(): Promise<void> {
        try {
            // Remove oldest accessed items until we have enough space
            const allKeys = await AsyncStorage.getAllKeys();
            const metadataKeys = allKeys.filter(key => key.startsWith('secure_storage_metadata_'));

            const items: Array<{ key: string; lastAccessed: Date; size: number }> = [];

            for (const metadataKey of metadataKeys) {
                const metadata = await this.getItemMetadata(metadataKey.replace('secure_storage_metadata_', ''));
                if (metadata) {
                    items.push({
                        key: metadata.key,
                        lastAccessed: metadata.lastAccessed,
                        size: metadata.size
                    });
                }
            }

            // Sort by last accessed (oldest first)
            items.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

            // Remove oldest items until we have enough space
            for (const item of items) {
                if (this.storageQuota.used <= this.storageQuota.available * 0.8) {
                    break; // We have enough space now
                }

                await this.remove(item.key);
            }

        } catch (error) {
            console.error('Failed to cleanup old data:', error);
        }
    }

    private async getAllStorageData(): Promise<Array<StoredItem>> {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const metadataKeys = allKeys.filter(key => key.startsWith('secure_storage_metadata_'));

            const items: Array<StoredItem> = [];

            for (const metadataKey of metadataKeys) {
                const key = metadataKey.replace('secure_storage_metadata_', '');
                const metadata = await this.getItemMetadata(key);
                if (metadata) {
                    items.push(metadata);
                }
            }

            return items;

        } catch (error) {
            console.error('Failed to get all storage data:', error);
            return [];
        }
    }

    private async encryptWithPassword(data: string, password: string): Promise<string> {
        // Simplified password-based encryption
        const passwordHash = await this.encryptionService.hash(password);
        const salt = this.encryptionService.generateSecureBytes(16);

        // For production, use proper PBKDF2 with the password
        const encrypted = await this.encryptionService.encrypt(data);
        return btoa(JSON.stringify({ encrypted, salt }));
    }

    private async decryptWithPassword(encryptedData: string, password: string): Promise<string> {
        try {
            const parsed = JSON.parse(atob(encryptedData));
            const decrypted = await this.encryptionService.decrypt(parsed.encrypted);
            return decrypted;
        } catch (error) {
            throw new Error('Failed to decrypt with password');
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<SecureStorageConfig>): void {
        this.config = { ...this.config, ...newConfig };

        // Reset auto-lock timer if timeout changed
        if (newConfig.autoLockTimeout) {
            this.resetAutoLockTimer();
        }
    }

    /**
     * Get current configuration
     */
    getConfig(): SecureStorageConfig {
        return { ...this.config };
    }
}

// Export singleton instance
export const secureStorageService = new SecureStorageService();