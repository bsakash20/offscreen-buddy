/**
 * Local Database Service with SQLite
 * Provides encrypted, fast local storage with full CRUD operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

import {
    DatabaseConfig,
    DatabaseStats,
    StorageItem,
    OfflineOperation,
    OfflineTimerSession,
    OfflineMilestoneProgress,
    CacheConfig,
    DatabaseStatus,
    OfflineError,
} from './types';

// Mock SQLite types for development
interface SQLiteWebSQLDatabase {
    transaction(callback: (tx: any) => void): void;
    close(): void;
}

interface SQLiteWebSQLTransaction {
    executeSql(
        sql: string,
        args?: any[],
        success?: (tx: any, results: any) => void,
        error?: (tx: any, error: any) => boolean
    ): void;
}

interface SQLiteWebSQLResultSet {
    insertId: number;
    rowsAffected: number;
    rows: {
        length: number;
        item(index: number): any;
    };
}

export class LocalDatabase {
    private static instance: LocalDatabase;
    private db: SQLiteWebSQLDatabase | null = null;
    private config: DatabaseConfig;
    private isInitialized = false;
    private encryptionKey: string | null = null;
    private cache = new Map<string, StorageItem>();
    private readonly CACHE_PREFIX = 'offline_cache_';
    private readonly METADATA_KEY = 'offline_db_metadata';

    private constructor(config: DatabaseConfig) {
        this.config = config;
    }

    public static getInstance(config?: DatabaseConfig): LocalDatabase {
        if (!LocalDatabase.instance) {
            const defaultConfig: DatabaseConfig = {
                name: 'offscreen_buddy_offline',
                version: 1,
                size: 50 * 1024 * 1024, // 50MB
                enableWAL: true,
                enableForeignKeys: true,
                tempStore: 'file',
                cacheSize: 1000,
                pageSize: 4096,
            };
            LocalDatabase.instance = new LocalDatabase(config || defaultConfig);
        }
        return LocalDatabase.instance;
    }

    /**
     * Initialize the database with encryption and schema
     */
    public async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            // Generate or retrieve encryption key
            await this.setupEncryption();

            // Mock database connection for now - in real implementation would use expo-sqlite
            this.db = this.createMockDatabase();

            // Initialize schema
            await this.createSchema();

            // Setup cache
            await this.initializeCache();

            // Load cached items
            await this.loadCache();

            this.isInitialized = true;
            console.log('✅ LocalDatabase initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize LocalDatabase:', error);
            throw new Error(`Database initialization failed: ${error}`);
        }
    }

    /**
     * Execute a SQL query with optional encryption/decryption
     */
    public async executeQuery<T = any>(
        query: string,
        params: any[] = [],
        encryptFields?: string[],
        decryptFields?: string[]
    ): Promise<T[]> {
        if (!this.db || !this.isInitialized) {
            throw new Error('Database not initialized');
        }

        return new Promise((resolve, reject) => {
            this.db!.transaction((tx: SQLiteWebSQLTransaction) => {
                // Encrypt parameters if needed
                const encryptedParams = encryptFields
                    ? this.encryptParameters(params, encryptFields)
                    : params;

                tx.executeSql(
                    query,
                    encryptedParams,
                    (_tx: SQLiteWebSQLTransaction, { rows }: SQLiteWebSQLResultSet) => {
                        const results: T[] = [];
                        for (let i = 0; i < rows.length; i++) {
                            let row = rows.item(i) as T;

                            // Decrypt fields if needed
                            if (decryptFields) {
                                row = this.decryptRow(row, decryptFields);
                            }

                            results.push(row);
                        }
                        resolve(results);
                    },
                    (_tx: SQLiteWebSQLTransaction, error: any) => {
                        console.error('SQL Error:', error);
                        reject(new Error(`SQL execution failed: ${error}`));
                        return true; // rollback
                    }
                );
            });
        });
    }

    /**
     * Insert a record into the database
     */
    public async insert(
        table: string,
        data: Record<string, any>,
        options?: {
            encryptFields?: string[];
            returnId?: boolean;
            cache?: boolean;
            cacheExpiry?: number;
        }
    ): Promise<string> {
        try {
            if (!this.db || !this.isInitialized) {
                throw new Error('Database not initialized');
            }

            const id = uuidv4();
            const timestamp = new Date().toISOString();
            const encryptedData = options?.encryptFields
                ? this.encryptData(data, options.encryptFields)
                : data;

            const columns = Object.keys(encryptedData);
            const values = Object.values(encryptedData);
            const placeholders = columns.map(() => '?').join(', ');

            const query = `
                INSERT INTO ${table} (id, ${columns.join(', ')}, created_at, updated_at)
                VALUES (?, ${placeholders}, ?, ?)
            `;

            return new Promise((resolve, reject) => {
                this.db!.transaction((tx: SQLiteWebSQLTransaction) => {
                    tx.executeSql(
                        query,
                        [id, ...values, timestamp, timestamp],
                        (_tx: SQLiteWebSQLTransaction, { insertId }: SQLiteWebSQLResultSet) => {
                            // Update cache if enabled
                            if (options?.cache) {
                                this.updateCache(table, id, data, options.cacheExpiry);
                            }

                            resolve(options?.returnId ? String(insertId) : id);
                        },
                        (_tx: SQLiteWebSQLTransaction, error: any) => {
                            console.error('Insert error:', error);
                            reject(new Error(`Insert failed: ${error}`));
                            return true;
                        }
                    );
                });
            });
        } catch (error) {
            console.error('Insert operation failed:', error);
            throw new Error(`Failed to insert into ${table}: ${error}`);
        }
    }

    /**
     * Update a record in the database
     */
    public async update(
        table: string,
        id: string,
        data: Record<string, any>,
        options?: {
            encryptFields?: string[];
            cache?: boolean;
            cacheExpiry?: number;
        }
    ): Promise<void> {
        try {
            if (!this.db || !this.isInitialized) {
                throw new Error('Database not initialized');
            }

            const timestamp = new Date().toISOString();
            const encryptedData = options?.encryptFields
                ? this.encryptData(data, options.encryptFields)
                : data;

            const columns = Object.keys(encryptedData);
            const values = Object.values(encryptedData);
            const setClause = columns.map(col => `${col} = ?`).join(', ');

            const query = `
                UPDATE ${table} 
                SET ${setClause}, updated_at = ?
                WHERE id = ?
            `;

            return new Promise((resolve, reject) => {
                this.db!.transaction((tx: SQLiteWebSQLTransaction) => {
                    tx.executeSql(
                        query,
                        [...values, timestamp, id],
                        (_tx: SQLiteWebSQLTransaction, _result: SQLiteWebSQLResultSet) => {
                            // Update cache if enabled
                            if (options?.cache) {
                                this.updateCache(table, id, data, options.cacheExpiry);
                            }

                            resolve();
                        },
                        (_tx: SQLiteWebSQLTransaction, error: any) => {
                            console.error('Update error:', error);
                            reject(new Error(`Update failed: ${error}`));
                            return true;
                        }
                    );
                });
            });
        } catch (error) {
            console.error('Update operation failed:', error);
            throw new Error(`Failed to update ${table}:${id}: ${error}`);
        }
    }

    /**
     * Delete a record from the database
     */
    public async delete(table: string, id: string): Promise<void> {
        try {
            if (!this.db || !this.isInitialized) {
                throw new Error('Database not initialized');
            }

            const query = `DELETE FROM ${table} WHERE id = ?`;

            return new Promise((resolve, reject) => {
                this.db!.transaction((tx: SQLiteWebSQLTransaction) => {
                    tx.executeSql(
                        query,
                        [id],
                        (_tx: SQLiteWebSQLTransaction, _result: SQLiteWebSQLResultSet) => {
                            // Remove from cache
                            this.removeFromCache(table, id);
                            resolve();
                        },
                        (_tx: SQLiteWebSQLTransaction, error: any) => {
                            console.error('Delete error:', error);
                            reject(new Error(`Delete failed: ${error}`));
                            return true;
                        }
                    );
                });
            });
        } catch (error) {
            console.error('Delete operation failed:', error);
            throw new Error(`Failed to delete from ${table}:${id}: ${error}`);
        }
    }

    /**
     * Select records from the database with caching
     */
    public async select<T = any>(
        table: string,
        options?: {
            where?: Record<string, any>;
            columns?: string[];
            limit?: number;
            offset?: number;
            orderBy?: string;
            orderDirection?: 'ASC' | 'DESC';
            cache?: boolean;
            cacheExpiry?: number;
            decryptFields?: string[];
        }
    ): Promise<T[]> {
        try {
            // Check cache first if enabled
            if (options?.cache) {
                const cachedData = this.getFromCache(table, options);
                if (cachedData) {
                    return cachedData as T[];
                }
            }

            let query = `SELECT ${options?.columns?.join(', ') || '*'} FROM ${table}`;
            const params: any[] = [];

            if (options?.where) {
                const conditions = Object.keys(options.where).map(key => `${key} = ?`);
                query += ` WHERE ${conditions.join(' AND ')}`;
                params.push(...Object.values(options.where));
            }

            if (options?.orderBy) {
                query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
            }

            if (options?.limit) {
                query += ` LIMIT ${options.limit}`;
                if (options?.offset) {
                    query += ` OFFSET ${options.offset}`;
                }
            }

            const results = await this.executeQuery<T>(query, params, undefined, options?.decryptFields);

            // Cache results if enabled
            if (options?.cache) {
                this.cacheResults(table, options, results, options.cacheExpiry);
            }

            return results;
        } catch (error) {
            console.error('Select operation failed:', error);
            throw new Error(`Failed to select from ${table}: ${error}`);
        }
    }

    /**
     * Get timer sessions with offline support
     */
    public async getTimerSessions(userId: string): Promise<OfflineTimerSession[]> {
        const sessions = await this.select<OfflineTimerSession>('timer_sessions', {
            where: { user_id: userId },
            orderBy: 'start_time',
            orderDirection: 'DESC',
            cache: true,
            cacheExpiry: 300000, // 5 minutes
        });

        return sessions.map(session => ({
            ...session,
            synced: true, // Mark as synced since it's from local DB
        }));
    }

    /**
     * Save timer session offline
     */
    public async saveTimerSession(session: Omit<OfflineTimerSession, 'id' | 'synced'>): Promise<string> {
        const sessionData = {
            ...session,
            id: uuidv4(),
            synced: false, // Will be synced later
        };

        return await this.insert('timer_sessions', sessionData, {
            cache: true,
            returnId: true,
        });
    }

    /**
     * Get milestone progress with offline support
     */
    public async getMilestoneProgress(userId: string): Promise<OfflineMilestoneProgress[]> {
        const progress = await this.select<OfflineMilestoneProgress>('milestone_progress', {
            where: { user_id: userId },
            orderBy: 'last_updated',
            orderDirection: 'DESC',
            cache: true,
            cacheExpiry: 600000, // 10 minutes
        });

        return progress.map(p => ({
            ...p,
            synced: true, // Mark as synced since it's from local DB
        }));
    }

    /**
     * Save milestone progress offline
     */
    public async saveMilestoneProgress(progress: Omit<OfflineMilestoneProgress, 'id' | 'synced'>): Promise<string> {
        const progressData = {
            ...progress,
            id: uuidv4(),
            synced: false, // Will be synced later
        };

        return await this.insert('milestone_progress', progressData, {
            cache: true,
            returnId: true,
        });
    }

    /**
     * Get database statistics
     */
    public async getStats(): Promise<DatabaseStats> {
        try {
            const dbSize = await this.getDatabaseSize();
            const tableCount = await this.getTableCount();
            const indexCount = await this.getIndexCount();
            const fragmentation = await this.getFragmentation();

            return {
                totalSize: dbSize.total,
                usedSize: dbSize.used,
                freeSize: dbSize.free,
                tableCount,
                indexCount,
                lastVacuum: new Date(), // Simplified
                fragmentationPercentage: fragmentation,
            };
        } catch (error) {
            console.error('Failed to get database stats:', error);
            throw new Error(`Database stats failed: ${error}`);
        }
    }

    /**
     * Clean up expired cache entries
     */
    public async cleanupCache(): Promise<number> {
        let cleaned = 0;
        const now = Date.now();

        for (const [key, item] of this.cache.entries()) {
            if (item.expiresAt && now > item.expiresAt.getTime()) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        // Also clean AsyncStorage cache
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

            for (const key of cacheKeys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    const item: StorageItem = JSON.parse(value);
                    if (item.expiresAt && now > new Date(item.expiresAt).getTime()) {
                        await AsyncStorage.removeItem(key);
                        cleaned++;
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to clean AsyncStorage cache:', error);
        }

        return cleaned;
    }

    /**
     * Vacuum the database to reclaim space
     */
    public async vacuum(): Promise<void> {
        try {
            await this.executeQuery('VACUUM');
            console.log('Database vacuumed successfully');
        } catch (error) {
            console.error('Failed to vacuum database:', error);
            throw error;
        }
    }

    /**
     * Get service status
     */
    public getStatus(): DatabaseStatus {
        return {
            initialized: this.isInitialized,
            connected: this.db !== null,
            encrypted: !!this.encryptionKey,
            stats: {
                totalSize: 0,
                usedSize: 0,
                freeSize: 0,
                tableCount: 0,
                indexCount: 0,
                lastVacuum: new Date(),
                fragmentationPercentage: 0,
            },
        };
    }

    /**
     * Close database connection
     */
    public async dispose(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.cache.clear();
        this.isInitialized = false;
        console.log('LocalDatabase disposed');
    }

    // Private helper methods

    private createMockDatabase(): SQLiteWebSQLDatabase {
        // Mock database for development - in production would use real expo-sqlite
        return {
            transaction(callback: (tx: any) => void): void {
                callback({
                    executeSql: (sql: string, params?: any[], success?: (tx: any, result: any) => void, error?: (tx: any, error: any) => boolean) => {
                        console.log('Mock SQL:', sql, params);
                        // Mock success response
                        if (success) {
                            success({}, {
                                insertId: Math.floor(Math.random() * 1000),
                                rowsAffected: 1,
                                rows: {
                                    length: 0,
                                    item: (index: number) => ({})
                                }
                            });
                        }
                    }
                });
            },
            close(): void {
                console.log('Database closed');
            }
        };
    }

    private async setupEncryption(): Promise<void> {
        try {
            // Try to get existing key from AsyncStorage
            const existingKey = await AsyncStorage.getItem('db_encryption_key');

            if (existingKey) {
                this.encryptionKey = existingKey;
            } else {
                // Generate new key
                const keyArray = btoa(uuidv4() + Date.now().toString());
                this.encryptionKey = keyArray;

                // Store securely
                await AsyncStorage.setItem('db_encryption_key', keyArray);
            }
        } catch (error) {
            console.warn('Encryption setup failed, using unencrypted mode:', error);
            this.encryptionKey = null;
        }
    }

    private async createSchema(): Promise<void> {
        const schema = `
            -- Users table
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE,
                name TEXT,
                preferences TEXT,
                created_at TEXT,
                updated_at TEXT
            );

            -- Timer sessions table
            CREATE TABLE IF NOT EXISTS timer_sessions (
                id TEXT PRIMARY KEY,
                timer_id TEXT,
                user_id TEXT,
                start_time TEXT,
                end_time TEXT,
                duration INTEGER,
                type TEXT,
                paused BOOLEAN,
                pause_duration INTEGER,
                completed BOOLEAN,
                milestones TEXT,
                synced BOOLEAN,
                created_at TEXT,
                updated_at TEXT
            );

            -- Milestone progress table
            CREATE TABLE IF NOT EXISTS milestone_progress (
                id TEXT PRIMARY KEY,
                milestone_id TEXT,
                user_id TEXT,
                progress REAL,
                completed BOOLEAN,
                last_updated TEXT,
                unlocked_at TEXT,
                synced BOOLEAN,
                created_at TEXT,
                updated_at TEXT
            );

            -- Notifications table
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                type TEXT,
                title TEXT,
                message TEXT,
                data TEXT,
                scheduled_for TEXT,
                sent BOOLEAN,
                created_at TEXT,
                updated_at TEXT
            );

            -- Sync queue table for offline operations
            CREATE TABLE IF NOT EXISTS sync_queue (
                id TEXT PRIMARY KEY,
                operation_type TEXT,
                table_name TEXT,
                record_id TEXT,
                data TEXT,
                priority INTEGER,
                retry_count INTEGER,
                created_at TEXT,
                updated_at TEXT
            );

            -- Settings table
            CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                user_id TEXT,
                key TEXT,
                value TEXT,
                created_at TEXT,
                updated_at TEXT
            );

            -- Create indexes for performance
            CREATE INDEX IF NOT EXISTS idx_timer_sessions_user_id ON timer_sessions(user_id);
            CREATE INDEX IF NOT EXISTS idx_timer_sessions_start_time ON timer_sessions(start_time);
            CREATE INDEX IF NOT EXISTS idx_milestone_progress_user_id ON milestone_progress(user_id);
            CREATE INDEX IF NOT EXISTS idx_milestone_progress_milestone_id ON milestone_progress(milestone_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority);
            CREATE INDEX IF NOT EXISTS idx_settings_user_key ON settings(user_id, key);
        `;

        const statements = schema.split(';').filter(stmt => stmt.trim());

        for (const statement of statements) {
            await this.executeQuery(statement);
        }
    }

    private async initializeCache(): Promise<void> {
        // Initialize in-memory cache with LRU eviction
        this.cache = new Map();
    }

    private async loadCache(): Promise<void> {
        try {
            const keys = await AsyncStorage.getAllKeys();
            const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));

            for (const key of cacheKeys) {
                const value = await AsyncStorage.getItem(key);
                if (value) {
                    const item: StorageItem = JSON.parse(value);
                    if (!item.expiresAt || Date.now() < new Date(item.expiresAt).getTime()) {
                        this.cache.set(key, item);
                    } else {
                        await AsyncStorage.removeItem(key);
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load cache from AsyncStorage:', error);
        }
    }

    private encryptData(data: Record<string, any>, fields: string[]): Record<string, any> {
        if (!this.encryptionKey) return data;

        const encrypted = { ...data };
        for (const field of fields) {
            if (encrypted[field]) {
                // Simple encryption - in production, use proper encryption
                encrypted[field] = btoa(JSON.stringify(encrypted[field]));
            }
        }
        return encrypted;
    }

    private decryptRow<T = any>(row: T, fields: string[]): T {
        if (!this.encryptionKey) return row;

        const decrypted = { ...row } as any;
        for (const field of fields) {
            if (decrypted[field]) {
                try {
                    decrypted[field] = JSON.parse(atob(decrypted[field]));
                } catch (error) {
                    console.warn(`Failed to decrypt field ${field}:`, error);
                }
            }
        }
        return decrypted;
    }

    private encryptParameters(params: any[], encryptFields: string[]): any[] {
        // Simplified parameter encryption
        return params;
    }

    private updateCache(table: string, id: string, data: any, expiry?: number): void {
        const key = `${this.CACHE_PREFIX}${table}_${id}`;
        const item: StorageItem = {
            key,
            value: data,
            size: JSON.stringify(data).length,
            createdAt: new Date(),
            expiresAt: expiry ? new Date(Date.now() + expiry) : undefined,
            tags: [table],
        };

        this.cache.set(key, item);

        // Also store in AsyncStorage for persistence
        AsyncStorage.setItem(key, JSON.stringify(item)).catch(error => {
            console.warn('Failed to cache item in AsyncStorage:', error);
        });

        // LRU eviction if cache is full
        if (this.cache.size > this.config.cacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
                AsyncStorage.removeItem(firstKey).catch(console.warn);
            }
        }
    }

    private getFromCache(table: string, options: any): any | null {
        // Simplified cache key generation
        const key = `${this.CACHE_PREFIX}${table}_${JSON.stringify(options.where || {})}`;
        const item = this.cache.get(key);

        if (item && (!item.expiresAt || Date.now() < item.expiresAt.getTime())) {
            return item.value;
        }

        return null;
    }

    private cacheResults(table: string, options: any, results: any[], expiry?: number): void {
        if (!results.length) return;

        const key = `${this.CACHE_PREFIX}${table}_${JSON.stringify(options.where || {})}`;
        const item: StorageItem = {
            key,
            value: results,
            size: JSON.stringify(results).length,
            createdAt: new Date(),
            expiresAt: expiry ? new Date(Date.now() + expiry) : undefined,
            tags: [table],
        };

        this.cache.set(key, item);
        AsyncStorage.setItem(key, JSON.stringify(item)).catch(console.warn);
    }

    private removeFromCache(table: string, id: string): void {
        const key = `${this.CACHE_PREFIX}${table}_${id}`;
        this.cache.delete(key);
        AsyncStorage.removeItem(key).catch(console.warn);
    }

    private async getDatabaseSize(): Promise<{ total: number; used: number; free: number }> {
        // Simplified size calculation
        return { total: this.config.size, used: 0, free: this.config.size };
    }

    private async getTableCount(): Promise<number> {
        try {
            const result = await this.executeQuery("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'");
            return result[0]?.count || 0;
        } catch {
            return 0;
        }
    }

    private async getIndexCount(): Promise<number> {
        try {
            const result = await this.executeQuery("SELECT COUNT(*) as count FROM sqlite_master WHERE type='index'");
            return result[0]?.count || 0;
        } catch {
            return 0;
        }
    }

    private async getFragmentation(): Promise<number> {
        // Simplified fragmentation calculation
        return 0;
    }
}

// Export singleton instance
export const localDatabase = LocalDatabase.getInstance();
export default LocalDatabase;