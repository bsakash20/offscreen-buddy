/**
 * Module Architecture System - Core Types
 * Comprehensive type definitions for the modular architecture system
 */

export interface Module {
    id: string;
    name: string;
    version: string;
    description: string;
    category: ModuleCategory;
    dependencies: string[];
    provides: string[];
    loadOrder: number;
    enabled: boolean;
    isolated: boolean;
    permissions: string[];
    config: ModuleConfig;
    lifecycle: ModuleLifecycle;
    resources?: ModuleResources;
}

export type ModuleCategory =
    | 'core'
    | 'feature'
    | 'integration'
    | 'ui'
    | 'infrastructure'
    | 'plugin';

export interface ModuleConfig {
    schema: any;
    environment: Record<string, any>;
    featureFlags: string[];
    secureConfig?: boolean;
    persisted?: boolean;
}

export interface ModuleLifecycle {
    initialize: () => Promise<void>;
    start: () => Promise<void>;
    stop: () => Promise<void>;
    destroy: () => Promise<void>;
    onEnable?: () => Promise<void>;
    onDisable?: () => Promise<void>;
    onConfigChange?: (config: any) => void;
    onError?: (error: Error) => void;
}

export interface ModuleResources {
    memoryLimit?: number;
    cpuLimit?: number;
    networkAccess?: boolean;
    fileSystemAccess?: boolean;
    externalServices?: string[];
}

export interface ModuleDefinition {
    metadata: Omit<Module, 'lifecycle'>;
    implementation: ModuleImplementation;
}

export interface ModuleImplementation {
    init: (context: ModuleContext) => Promise<Module>;
    destroy?: (module: Module) => Promise<void>;
    enable?: (module: Module) => Promise<void>;
    disable?: (module: Module) => Promise<void>;
}

export interface ModuleContext {
    serviceRegistry: ServiceRegistry;
    eventBus: EventBus;
    configManager: ConfigManager;
    pluginManager: PluginManager;
    moduleLoader: ModuleLoader;
    security: SecurityManager;
}

export interface ServiceRegistry {
    register: (name: string, service: any) => void;
    get: <T>(name: string) => T | undefined;
    unregister: (name: string) => void;
    has: (name: string) => boolean;
    list: () => string[];
}

export interface EventBus {
    publish: (event: string, data?: any) => void;
    subscribe: (event: string, handler: Function) => () => void;
    unsubscribe: (event: string, handler: Function) => void;
    emit: (event: string, data?: any) => void;
}

export interface ConfigManager {
    get: (key: string, defaultValue?: any) => any;
    set: (key: string, value: any) => void;
    update: (updates: Record<string, any>) => void;
    validate: (schema: any, config: any) => boolean;
    environment: EnvironmentConfig;
}

export interface PluginManager {
    load: (pluginPath: string) => Promise<Plugin>;
    unload: (pluginId: string) => Promise<void>;
    enable: (pluginId: string) => Promise<void>;
    disable: (pluginId: string) => Promise<void>;
    list: () => Plugin[];
    sandbox: PluginSandbox;
}

export interface ModuleLoader {
    load: (moduleId: string) => Promise<Module>;
    unload: (moduleId: string) => Promise<void>;
    reload: (moduleId: string) => Promise<Module>;
    preload: (moduleId: string) => Promise<void>;
    getLoadedModules: () => Module[];
}

export interface SecurityManager {
    checkPermission: (resource: string, operation: string) => boolean;
    sandbox: (code: string, permissions: string[]) => SandboxResult;
    encrypt: (data: any) => string;
    decrypt: (encrypted: string) => any;
}

export interface Plugin {
    id: string;
    name: string;
    version: string;
    type: PluginType;
    sandbox: PluginSandbox;
    permissions: string[];
    hooks: PluginHook[];
    lifecycle: PluginLifecycle;
}

export type PluginType = 'timer' | 'analytics' | 'notification' | 'payment' | 'theme' | 'custom';

export interface PluginSandbox {
    execute: (code: string) => Promise<any>;
    evaluate: (expression: string) => any;
    import: (module: string) => any;
    console: Console;
    timeout: (fn: Function, ms: number) => Promise<any>;
}

export interface PluginHook {
    name: string;
    handler: Function;
    priority: number;
    filter?: (data: any) => any;
}

export interface PluginLifecycle {
    install: () => Promise<void>;
    enable: () => Promise<void>;
    disable: () => Promise<void>;
    uninstall: () => Promise<void>;
}

export interface SandboxResult {
    success: boolean;
    result?: any;
    error?: Error;
    warnings?: string[];
}

export interface EnvironmentConfig {
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
    featureFlags: Record<string, boolean>;
    modules: Record<string, ModuleConfig>;
    security: SecurityConfig;
}

export interface SecurityConfig {
    sandboxing: boolean;
    encryption: boolean;
    permissions: Record<string, string[]>;
    cors: CORSConfig;
}

export interface CORSConfig {
    origins: string[];
    methods: string[];
    credentials: boolean;
}

export interface ModuleLoadResult {
    module: Module;
    dependencies: string[];
    warnings: string[];
    errors: string[];
}

export class ModuleError extends Error {
    moduleId?: string;
    type: 'LOAD_ERROR' | 'EXECUTION_ERROR' | 'DEPENDENCY_ERROR' | 'SECURITY_ERROR';
    recoverable: boolean;

    constructor(
        message: string,
        type: 'LOAD_ERROR' | 'EXECUTION_ERROR' | 'DEPENDENCY_ERROR' | 'SECURITY_ERROR' = 'EXECUTION_ERROR',
        recoverable: boolean = true,
        moduleId?: string
    ) {
        super(message);
        this.name = 'ModuleError';
        this.type = type;
        this.recoverable = recoverable;
        this.moduleId = moduleId;

        // Maintain proper stack trace for where our error was thrown
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, ModuleError);
        }
    }
}

export interface ModuleHealth {
    moduleId: string;
    status: 'healthy' | 'degraded' | 'error' | 'unknown';
    lastCheck: Date;
    metrics: ModuleMetrics;
    dependencies: Record<string, 'healthy' | 'degraded' | 'error'>;
}

export interface ModuleMetrics {
    memoryUsage: number;
    cpuUsage: number;
    responseTime: number;
    errorCount: number;
    requestCount: number;
    uptime: number;
}

export interface ModuleEvent {
    type: 'MODULE_LOADED' | 'MODULE_UNLOADED' | 'MODULE_ERROR' | 'MODULE_ENABLED' | 'MODULE_DISABLED' | 'MODULE_REGISTERED' | 'MODULE_LOAD_ERROR' | 'MODULE_UNLOAD_ERROR' | 'MODULE_ENABLE_ERROR' | 'MODULE_DISABLE_ERROR' | 'MODULE_HEALTH_ERROR';
    moduleId: string;
    timestamp: Date;
    data?: any;
}

export interface FeatureToggle {
    name: string;
    enabled: boolean;
    conditions?: FeatureCondition[];
    rollout?: RolloutStrategy;
}

export interface FeatureCondition {
    type: 'environment' | 'user' | 'percentage' | 'date';
    value: any;
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
}

export interface RolloutStrategy {
    type: 'percentage' | 'groups' | 'progressive';
    value: number | string[];
    startDate?: Date;
    endDate?: Date;
}