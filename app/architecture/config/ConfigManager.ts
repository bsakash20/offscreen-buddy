/**
 * Configuration Management System
 * Handles environment-specific configuration, feature flags, and dynamic updates
 */

import { EnvironmentConfig, FeatureToggle, FeatureCondition, RolloutStrategy } from '../modules/ModuleTypes';

export class ConfigManager {
    private config: Map<string, any> = new Map();
    private schema: Map<string, any> = new Map();
    private featureFlags: Map<string, FeatureToggle> = new Map();
    private environmentConfig: EnvironmentConfig;
    private listeners: Map<string, Function[]> = new Map();
    private persistedKeys: Set<string> = new Set();

    constructor(environmentConfig: Partial<EnvironmentConfig> = {}) {
        this.environmentConfig = {
            environment: environmentConfig.environment || 'development',
            debug: environmentConfig.debug || false,
            featureFlags: environmentConfig.featureFlags || {},
            modules: environmentConfig.modules || {},
            security: environmentConfig.security || {
                sandboxing: true,
                encryption: true,
                permissions: {},
                cors: {
                    origins: ['*'],
                    methods: ['GET', 'POST', 'PUT', 'DELETE'],
                    credentials: true
                }
            }
        };

        this.initializeDefaults();
    }

    /**
     * Get configuration value
     */
    get(key: string, defaultValue?: any): any {
        const value = this.config.get(key);
        return value !== undefined ? value : defaultValue;
    }

    /**
     * Set configuration value
     */
    set(key: string, value: any): void {
        const previousValue = this.config.get(key);

        // Validate if schema exists
        const schema = this.schema.get(key);
        if (schema && !this.validate(schema, value)) {
            throw new Error(`Configuration value for ${key} failed validation`);
        }

        this.config.set(key, value);

        // Persist if key is marked for persistence
        if (this.persistedKeys.has(key)) {
            this.persistKey(key, value);
        }

        // Notify listeners
        this.notifyListeners(key, value, previousValue);
    }

    /**
     * Update multiple configuration values
     */
    update(updates: Record<string, any>): void {
        for (const [key, value] of Object.entries(updates)) {
            this.set(key, value);
        }
    }

    /**
     * Remove configuration value
     */
    delete(key: string): void {
        const previousValue = this.config.get(key);
        this.config.delete(key);

        if (this.persistedKeys.has(key)) {
            this.removePersistedKey(key);
        }

        this.notifyListeners(key, undefined, previousValue);
    }

    /**
     * Validate configuration against schema
     */
    validate(schema: any, config: any): boolean {
        try {
            if (!schema || !config) return true;

            // Simple validation logic - in a real implementation, use a proper validator
            if (schema.type === 'string' && typeof config !== 'string') return false;
            if (schema.type === 'number' && typeof config !== 'number') return false;
            if (schema.type === 'boolean' && typeof config !== 'boolean') return false;
            if (schema.type === 'array' && !Array.isArray(config)) return false;
            if (schema.type === 'object' && (typeof config !== 'object' || Array.isArray(config))) return false;

            if (schema.enum && !schema.enum.includes(config)) return false;
            if (schema.minimum !== undefined && config < schema.minimum) return false;
            if (schema.maximum !== undefined && config > schema.maximum) return false;
            if (schema.minLength !== undefined && config.length < schema.minLength) return false;
            if (schema.maxLength !== undefined && config.length > schema.maxLength) return false;

            return true;
        } catch (error) {
            console.warn('Validation error:', error);
            return false;
        }
    }

    /**
     * Register configuration schema
     */
    registerSchema(key: string, schema: any): void {
        this.schema.set(key, schema);
    }

    /**
     * Get all configuration as object
     */
    getAll(): Record<string, any> {
        return Object.fromEntries(this.config);
    }

    /**
     * Get configuration for specific module
     */
    getModuleConfig(moduleId: string): any {
        return this.get(`module.${moduleId}`, {});
    }

    /**
     * Update configuration for specific module
     */
    setModuleConfig(moduleId: string, config: any): void {
        this.set(`module.${moduleId}`, config);
        this.notifyListeners(`module.${moduleId}`, config, undefined);
    }

    /**
     * Feature Flag Management
     */

    /**
     * Enable a feature flag
     */
    enableFeature(flagName: string): void {
        this.setFeatureFlag(flagName, { enabled: true });
    }

    /**
     * Disable a feature flag
     */
    disableFeature(flagName: string): void {
        this.setFeatureFlag(flagName, { enabled: false });
    }

    /**
     * Set feature flag configuration
     */
    setFeatureFlag(flagName: string, toggle: Partial<FeatureToggle>): void {
        const existing = this.featureFlags.get(flagName) || {
            name: flagName,
            enabled: false,
            conditions: [],
            rollout: {
                type: 'percentage',
                value: 100
            }
        };

        const updated: FeatureToggle = {
            ...existing,
            ...toggle
        };

        this.featureFlags.set(flagName, updated);
        this.set(`feature.${flagName}`, updated);

        console.log(`Feature flag ${flagName} updated:`, updated);
    }

    /**
     * Check if a feature is enabled
     */
    isFeatureEnabled(flagName: string): boolean {
        const flag = this.featureFlags.get(flagName);
        if (!flag) {
            // Check environment config for backward compatibility
            return this.environmentConfig.featureFlags[flagName] || false;
        }

        if (!flag.enabled) return false;

        // Check conditions
        if (flag.conditions && !this.evaluateConditions(flag.conditions)) {
            return false;
        }

        // Check rollout strategy
        if (flag.rollout && !this.evaluateRollout(flag.rollout)) {
            return false;
        }

        return true;
    }

    /**
     * Get feature flag information
     */
    getFeatureFlag(flagName: string): FeatureToggle | undefined {
        return this.featureFlags.get(flagName);
    }

    /**
     * List all feature flags
     */
    listFeatureFlags(): FeatureToggle[] {
        return Array.from(this.featureFlags.values());
    }

    /**
     * Environment-specific configuration
     */

    /**
     * Switch environment
     */
    switchEnvironment(environment: 'development' | 'staging' | 'production'): void {
        this.environmentConfig.environment = environment;
        this.set('app.environment', environment);
        this.emit('environment.changed', { environment });
    }

    /**
     * Get current environment
     */
    getEnvironment(): string {
        return this.environmentConfig.environment;
    }

    /**
     * Enable/disable debug mode
     */
    setDebugMode(enabled: boolean): void {
        this.environmentConfig.debug = enabled;
        this.set('app.debug', enabled);
    }

    /**
     * Check if debug mode is enabled
     */
    isDebugMode(): boolean {
        return this.environmentConfig.debug;
    }

    /**
     * Configuration persistence
     */

    /**
     * Mark key for persistence
     */
    persist(key: string): void {
        this.persistedKeys.add(key);
        this.persistKey(key, this.config.get(key));
    }

    /**
     * Remove from persistence
     */
    unpersist(key: string): void {
        this.persistedKeys.delete(key);
        this.removePersistedKey(key);
    }

    /**
     * Load persisted configuration
     */
    loadPersisted(): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const persisted = localStorage.getItem('offscreen-buddy-config');
                if (persisted) {
                    const config = JSON.parse(persisted);
                    this.config.set('__persisted__', config);
                    console.log('Persisted configuration loaded');
                }
            } catch (error) {
                console.warn('Failed to load persisted configuration:', error);
            }
        }
    }

    /**
     * Save all persisted configuration
     */
    savePersisted(): void {
        const persisted: Record<string, any> = {};

        for (const key of this.persistedKeys) {
            if (this.config.has(key)) {
                persisted[key] = this.config.get(key);
            }
        }

        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.setItem('offscreen-buddy-config', JSON.stringify(persisted));
                console.log('Persisted configuration saved');
            } catch (error) {
                console.warn('Failed to save persisted configuration:', error);
            }
        }
    }

    /**
     * Event handling
     */

    /**
     * Subscribe to configuration changes
     */
    subscribe(key: string, listener: Function): () => void {
        if (!this.listeners.has(key)) {
            this.listeners.set(key, []);
        }

        const listeners = this.listeners.get(key)!;
        listeners.push(listener);

        // Return unsubscribe function
        return () => {
            const index = listeners.indexOf(listener);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        };
    }

    /**
     * Emit configuration event
     */
    emit(event: string, data: any): void {
        const listeners = this.listeners.get(event);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(data);
                } catch (error) {
                    console.error(`Configuration event listener error for ${event}:`, error);
                }
            }
        }
    }

    /**
     * Reset to defaults
     */
    reset(): void {
        this.config.clear();
        this.featureFlags.clear();
        this.persistedKeys.clear();
        this.initializeDefaults();

        console.log('Configuration reset to defaults');
    }

    /**
     * Export configuration
     */
    export(): { config: Record<string, any>; featureFlags: FeatureToggle[]; environment: EnvironmentConfig } {
        return {
            config: Object.fromEntries(this.config),
            featureFlags: this.listFeatureFlags(),
            environment: { ...this.environmentConfig }
        };
    }

    /**
     * Import configuration
     */
    import(data: { config?: Record<string, any>; featureFlags?: FeatureToggle[]; environment?: Partial<EnvironmentConfig> }): void {
        if (data.config) {
            this.update(data.config);
        }

        if (data.featureFlags) {
            for (const flag of data.featureFlags) {
                this.featureFlags.set(flag.name, flag);
            }
        }

        if (data.environment) {
            this.environmentConfig = { ...this.environmentConfig, ...data.environment };
        }
    }

    private initializeDefaults(): void {
        // Set default configuration
        this.set('app.name', 'OffScreen Buddy');
        this.set('app.version', '1.0.0');
        this.set('app.environment', this.environmentConfig.environment);
        this.set('app.debug', this.environmentConfig.debug);
        this.set('app.features', {
            analytics: true,
            notifications: true,
            offline: true,
            security: true,
            performance: true
        });

        // Initialize default feature flags
        this.setFeatureFlag('new-ui', { enabled: this.environmentConfig.environment === 'development' });
        this.setFeatureFlag('advanced-analytics', { enabled: false });
        this.setFeatureFlag('beta-features', { enabled: false });

        // Load persisted configuration
        this.loadPersisted();
    }

    private evaluateConditions(conditions: FeatureCondition[]): boolean {
        return conditions.every(condition => {
            switch (condition.type) {
                case 'environment':
                    return condition.value === this.environmentConfig.environment;
                case 'user':
                    // User-based conditions would be evaluated here
                    return true; // Placeholder
                case 'percentage':
                    return Math.random() * 100 < (condition.value as number);
                case 'date':
                    const now = new Date();
                    const conditionDate = new Date(condition.value as string);
                    return now >= conditionDate;
                default:
                    return true;
            }
        });
    }

    private evaluateRollout(rollout: RolloutStrategy): boolean {
        switch (rollout.type) {
            case 'percentage':
                return Math.random() * 100 < (rollout.value as number);
            case 'groups':
                // Group-based rollout would be implemented here
                return true; // Placeholder
            case 'progressive':
                // Progressive rollout implementation
                const now = new Date();
                if (rollout.startDate && now < rollout.startDate) return false;
                if (rollout.endDate && now > rollout.endDate) return false;
                return true;
            default:
                return true;
        }
    }

    private notifyListeners(key: string, newValue: any, oldValue: any): void {
        const listeners = this.listeners.get(key);
        if (listeners) {
            for (const listener of listeners) {
                try {
                    listener(newValue, oldValue);
                } catch (error) {
                    console.error(`Configuration change listener error for ${key}:`, error);
                }
            }
        }
    }

    private persistKey(key: string, value: any): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const persisted = this.config.get('__persisted__') || {};
                persisted[key] = value;
                this.config.set('__persisted__', persisted);
            } catch (error) {
                console.warn(`Failed to persist key ${key}:`, error);
            }
        }
    }

    private removePersistedKey(key: string): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                const persisted = this.config.get('__persisted__') || {};
                delete persisted[key];
                this.config.set('__persisted__', persisted);
            } catch (error) {
                console.warn(`Failed to remove persisted key ${key}:`, error);
            }
        }
    }
}