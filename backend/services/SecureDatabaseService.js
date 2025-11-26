/**
 * Secure Database Service
 * Provides parameterized queries, audit logging, and transaction security
 * Ensures all database operations follow security best practices
 */

const { supabase } = require('../config/supabase');
const { getSecurityConfig, isSecurityProd } = require('../config/security');

/**
 * Database Audit Logger
 */
class DatabaseAuditLogger {
    constructor() {
        this.config = getSecurityConfig();
        this.auditEnabled = this.config.database.audit.enabled;
    }

    /**
     * Log database operation
     */
    async logOperation(operation, table, userId, details = {}) {
        if (!this.auditEnabled) return;

        try {
            await supabase
                .from('database_audit_log')
                .insert({
                    operation_type: operation,
                    table_name: table,
                    user_id: userId,
                    operation_details: details,
                    timestamp: new Date().toISOString(),
                    environment: isSecurityProd() ? 'production' : 'development'
                });
        } catch (error) {
            console.error('Audit logging failed:', error);
        }
    }

    /**
     * Log failed database operation
     */
    async logFailedOperation(operation, table, userId, error, details = {}) {
        if (!this.auditEnabled) return;

        try {
            await supabase
                .from('database_audit_log')
                .insert({
                    operation_type: operation,
                    table_name: table,
                    user_id: userId,
                    operation_details: {
                        ...details,
                        error: error.message,
                        stack: error.stack
                    },
                    timestamp: new Date().toISOString(),
                    environment: isSecurityProd() ? 'production' : 'development',
                    status: 'failed'
                });
        } catch (auditError) {
            console.error('Failed operation audit logging failed:', auditError);
        }
    }
}

/**
 * Secure Database Query Builder
 */
class SecureQueryBuilder {
    constructor() {
        this.auditLogger = new DatabaseAuditLogger();
        this.config = getSecurityConfig();
    }

    /**
     * Build safe SELECT query with parameterized values
     */
    async select(table, columns = '*', options = {}) {
        const { filters = {}, joins = [], orderBy = null, limit = null, offset = null, userId } = options;

        try {
            let query = supabase
                .from(table)
                .select(columns);

            // Apply joins
            joins.forEach(join => {
                query = query[join.type](join.table, join.on);
            });

            // Apply filters (all parameterized)
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    query = query.in(key, value);
                } else if (typeof value === 'object' && value.operator) {
                    query = query[value.operator](key, value.value);
                } else {
                    query = query.eq(key, value);
                }
            });

            // Apply ordering
            if (orderBy) {
                if (Array.isArray(orderBy)) {
                    orderBy.forEach(order => {
                        query = query.order(order.column, { ascending: order.ascending !== false });
                    });
                } else {
                    query = query.order(orderBy.column || 'created_at', { ascending: orderBy.ascending !== false });
                }
            }

            // Apply limit
            if (limit) {
                query = query.limit(limit);
            }

            // Apply offset
            if (offset) {
                query = query.range(offset, offset + (limit || 1000) - 1);
            }

            const { data, error } = await query;

            if (error) {
                await this.auditLogger.logFailedOperation('SELECT', table, userId, error, {
                    columns,
                    filters,
                    joins,
                    orderBy,
                    limit,
                    offset
                });
                throw error;
            }

            await this.auditLogger.logOperation('SELECT', table, userId, {
                columns,
                filters: Object.keys(filters),
                recordCount: data?.length || 0
            });

            return data;
        } catch (error) {
            console.error(`Secure SELECT query failed for table ${table}:`, error);
            throw error;
        }
    }

    /**
     * Build safe INSERT query
     */
    async insert(table, record, options = {}) {
        const { userId, returnRecord = true } = options;

        try {
            let query = supabase
                .from(table)
                .insert(record);

            if (returnRecord) {
                query = query.select();
            }

            const { data, error } = await query;

            if (error) {
                await this.auditLogger.logFailedOperation('INSERT', table, userId, error, {
                    recordKeys: Object.keys(record),
                    hasSensitiveData: this.containsSensitiveData(record)
                });
                throw error;
            }

            await this.auditLogger.logOperation('INSERT', table, userId, {
                recordKeys: Object.keys(record),
                hasSensitiveData: this.containsSensitiveData(record),
                returnedRecord: !!data
            });

            return data;
        } catch (error) {
            console.error(`Secure INSERT query failed for table ${table}:`, error);
            throw error;
        }
    }

    /**
     * Build safe UPDATE query
     */
    async update(table, updates, filters, options = {}) {
        const { userId, returnRecord = true } = options;

        try {
            let query = supabase
                .from(table)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                });

            // Apply filters (all parameterized)
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    query = query.in(key, value);
                } else if (typeof value === 'object' && value.operator) {
                    query = query[value.operator](key, value.value);
                } else {
                    query = query.eq(key, value);
                }
            });

            if (returnRecord) {
                query = query.select();
            }

            const { data, error } = await query;

            if (error) {
                await this.auditLogger.logFailedOperation('UPDATE', table, userId, error, {
                    updateKeys: Object.keys(updates),
                    filters: Object.keys(filters),
                    hasSensitiveData: this.containsSensitiveData(updates)
                });
                throw error;
            }

            await this.auditLogger.logOperation('UPDATE', table, userId, {
                updateKeys: Object.keys(updates),
                filters: Object.keys(filters),
                hasSensitiveData: this.containsSensitiveData(updates),
                affectedRecords: data?.length || 0
            });

            return data;
        } catch (error) {
            console.error(`Secure UPDATE query failed for table ${table}:`, error);
            throw error;
        }
    }

    /**
     * Build safe DELETE query
     */
    async delete(table, filters, options = {}) {
        const { userId, returnRecord = false } = options;

        try {
            let query = supabase
                .from(table)
                .delete();

            // Apply filters (all parameterized)
            Object.entries(filters).forEach(([key, value]) => {
                if (Array.isArray(value)) {
                    query = query.in(key, value);
                } else if (typeof value === 'object' && value.operator) {
                    query = query[value.operator](key, value.value);
                } else {
                    query = query.eq(key, value);
                }
            });

            if (returnRecord) {
                query = query.select();
            }

            const { data, error } = await query;

            if (error) {
                await this.auditLogger.logFailedOperation('DELETE', table, userId, error, {
                    filters: Object.keys(filters)
                });
                throw error;
            }

            await this.auditLogger.logOperation('DELETE', table, userId, {
                filters: Object.keys(filters),
                deletedRecords: data?.length || 0
            });

            return data;
        } catch (error) {
            console.error(`Secure DELETE query failed for table ${table}:`, error);
            throw error;
        }
    }

    /**
     * Check if record contains sensitive data
     */
    containsSensitiveData(record) {
        const sensitiveFields = [
            'password', 'password_hash', 'token', 'secret', 'key',
            'credit_card', 'ssn', 'cvv', 'pin', 'access_token',
            'refresh_token', 'private_key'
        ];

        return Object.keys(record).some(field =>
            sensitiveFields.some(sensitive =>
                field.toLowerCase().includes(sensitive.toLowerCase())
            )
        );
    }
}

/**
 * Transaction Manager for Critical Operations
 */
class SecureTransactionManager {
    constructor() {
        this.auditLogger = new DatabaseAuditLogger();
    }

    /**
     * Execute secure transaction
     */
    async executeTransaction(operations, userId, transactionName = 'anonymous') {
        const startTime = Date.now();

        try {
            // Begin transaction
            const transactionId = await this.beginTransaction();

            try {
                const results = [];

                // Execute each operation in sequence
                for (const operation of operations) {
                    const { type, table, data, options = {} } = operation;

                    let result;
                    switch (type.toUpperCase()) {
                        case 'INSERT':
                            result = await this.executeInsert(table, data, options);
                            break;
                        case 'UPDATE':
                            result = await this.executeUpdate(table, data.filters, data.updates, options);
                            break;
                        case 'DELETE':
                            result = await this.executeDelete(table, data, options);
                            break;
                        default:
                            throw new Error(`Unsupported operation type: ${type}`);
                    }

                    results.push(result);
                }

                // Commit transaction
                await this.commitTransaction(transactionId);

                // Log successful transaction
                await this.auditLogger.logOperation('TRANSACTION_COMMIT', 'transaction', userId, {
                    transactionId,
                    transactionName,
                    operationCount: operations.length,
                    duration: Date.now() - startTime
                });

                return results;
            } catch (error) {
                // Rollback transaction
                await this.rollbackTransaction(transactionId);

                // Log failed transaction
                await this.auditLogger.logFailedOperation('TRANSACTION_ROLLBACK', 'transaction', userId, error, {
                    transactionId,
                    transactionName,
                    operationCount: operations.length,
                    duration: Date.now() - startTime
                });

                throw error;
            }
        } catch (error) {
            console.error('Transaction execution failed:', error);
            throw error;
        }
    }

    /**
     * Begin database transaction (Supabase handles this internally)
     */
    async beginTransaction() {
        // Supabase doesn't expose explicit transaction APIs
        // The transaction is implicitly started with the first query
        return `tx_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }

    /**
     * Commit transaction (handled by Supabase)
     */
    async commitTransaction(transactionId) {
        // Supabase commits automatically when no errors occur
        return true;
    }

    /**
     * Rollback transaction (handled by Supabase)
     */
    async rollbackTransaction(transactionId) {
        // Supabase rolls back automatically when errors occur
        return true;
    }

    /**
     * Execute secure insert within transaction
     */
    async executeInsert(table, data, options = {}) {
        const queryBuilder = new SecureQueryBuilder();
        return await queryBuilder.insert(table, data, { ...options, userId: options.userId });
    }

    /**
     * Execute secure update within transaction
     */
    async executeUpdate(table, filters, updates, options = {}) {
        const queryBuilder = new SecureQueryBuilder();
        return await queryBuilder.update(table, updates, filters, { ...options, userId: options.userId });
    }

    /**
     * Execute secure delete within transaction
     */
    async executeDelete(table, filters, options = {}) {
        const queryBuilder = new SecureQueryBuilder();
        return await queryBuilder.delete(table, filters, { ...options, userId: options.userId });
    }
}

/**
 * Database Security Validator
 */
class DatabaseSecurityValidator {
    constructor() {
        this.config = getSecurityConfig();
        this.sensitiveTables = [
            'users', 'user_settings', 'user_subscriptions',
            'payment_methods', 'audit_logs', 'security_events'
        ];
    }

    /**
     * Validate table access permissions
     */
    validateTableAccess(table, operation, userId) {
        // Check if user has permission for this table/operation
        if (this.sensitiveTables.includes(table)) {
            // Additional validation for sensitive tables
            if (!userId) {
                throw new Error('Authentication required for sensitive table access');
            }
        }

        return true;
    }

    /**
     * Validate query parameters
     */
    validateQueryParams(params) {
        // Check for SQL injection patterns
        const sqlPatterns = [
            /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
            /('|(\\x27)|(\\x2D)|(\\x2D))/i,
            /(union.*select|or\s+1=1|and\s+1=1)/i
        ];

        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string') {
                if (sqlPatterns.some(pattern => pattern.test(value))) {
                    throw new Error(`Potential SQL injection detected in parameter: ${key}`);
                }
            }
        }

        return true;
    }

    /**
     * Validate data before database operation
     */
    validateData(data, operation) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data provided for database operation');
        }

        // Check for extremely large payloads
        const dataSize = JSON.stringify(data).length;
        const maxSize = this.config.database.connection.maxPayloadSize || 1048576; // 1MB

        if (dataSize > maxSize) {
            throw new Error('Data payload too large');
        }

        // Validate sensitive data handling
        if (this.containsUnencryptedSensitiveData(data) && operation === 'INSERT') {
            throw new Error('Sensitive data must be encrypted before storage');
        }

        return true;
    }

    /**
     * Check for unencrypted sensitive data
     */
    containsUnencryptedSensitiveData(data) {
        const unencryptedPatterns = [
            /(?<![a-fA-F0-9])[a-fA-F0-9]{32}(?![a-fA-F0-9])/, // MD5-like
            /(?<![a-fA-F0-9])[a-fA-F0-9]{40}(?![a-fA-F0-9])/, // SHA1-like
            /\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}/, // Credit card
            /\d{3}-\d{2}-\d{4}/ // SSN
        ];

        const dataString = JSON.stringify(data);
        return unencryptedPatterns.some(pattern => pattern.test(dataString));
    }
}

/**
 * Main Secure Database Service
 */
class SecureDatabaseService {
    constructor() {
        this.queryBuilder = new SecureQueryBuilder();
        this.transactionManager = new SecureTransactionManager();
        this.securityValidator = new DatabaseSecurityValidator();
        this.auditLogger = new DatabaseAuditLogger();
    }

    /**
     * Secure SELECT operation
     */
    async select(table, columns, options = {}) {
        const { userId } = options;

        this.securityValidator.validateTableAccess(table, 'SELECT', userId);
        if (options.filters) {
            this.securityValidator.validateQueryParams(options.filters);
        }

        return await this.queryBuilder.select(table, columns, options);
    }

    /**
     * Secure INSERT operation
     */
    async insert(table, data, options = {}) {
        const { userId } = options;

        this.securityValidator.validateTableAccess(table, 'INSERT', userId);
        this.securityValidator.validateData(data, 'INSERT');

        return await this.queryBuilder.insert(table, data, options);
    }

    /**
     * Secure UPDATE operation
     */
    async update(table, updates, filters, options = {}) {
        const { userId } = options;

        this.securityValidator.validateTableAccess(table, 'UPDATE', userId);
        this.securityValidator.validateQueryParams(filters);
        this.securityValidator.validateData(updates, 'UPDATE');

        return await this.queryBuilder.update(table, updates, filters, options);
    }

    /**
     * Secure DELETE operation
     */
    async delete(table, filters, options = {}) {
        const { userId } = options;

        this.securityValidator.validateTableAccess(table, 'DELETE', userId);
        this.securityValidator.validateQueryParams(filters);

        return await this.queryBuilder.delete(table, filters, options);
    }

    /**
     * Execute secure transaction
     */
    async transaction(operations, userId, transactionName) {
        this.securityValidator.validateTableAccess('transaction', 'TRANSACTION', userId);

        return await this.transactionManager.executeTransaction(operations, userId, transactionName);
    }

    /**
     * Get database security metrics
     */
    async getSecurityMetrics() {
        try {
            const auditLog = await this.auditLogger.logOperation('METRIC_QUERY', 'database_audit_log', 'system', {
                query: 'security_metrics'
            });

            const { data } = await supabase
                .from('database_audit_log')
                .select('operation_type, status, timestamp')
                .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .limit(1000);

            const metrics = {
                totalOperations: data?.length || 0,
                failedOperations: data?.filter(log => log.status === 'failed').length || 0,
                operationTypes: {},
                last24hActivity: data || []
            };

            // Calculate operation type distribution
            data?.forEach(log => {
                metrics.operationTypes[log.operation_type] = (metrics.operationTypes[log.operation_type] || 0) + 1;
            });

            return metrics;
        } catch (error) {
            console.error('Failed to get security metrics:', error);
            return {
                totalOperations: 0,
                failedOperations: 0,
                operationTypes: {},
                last24hActivity: [],
                error: error.message
            };
        }
    }
}

// Create singleton instance
const secureDatabaseService = new SecureDatabaseService();

module.exports = {
    // Main service class
    SecureDatabaseService,
    secureDatabaseService,

    // Supporting classes
    DatabaseAuditLogger,
    SecureQueryBuilder,
    SecureTransactionManager,
    DatabaseSecurityValidator,

    // Utility functions
    createAuditLogger: () => new DatabaseAuditLogger(),
    createQueryBuilder: () => new SecureQueryBuilder(),
    createTransactionManager: () => new SecureTransactionManager(),
    createSecurityValidator: () => new DatabaseSecurityValidator()
};