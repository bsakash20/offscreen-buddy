/**
 * Module Registry - Central module management system
 * Handles module registration, discovery, and lifecycle management
 */

import { Module, ModuleDefinition, ModuleLoadResult, ModuleError, ModuleHealth, ModuleEvent } from './ModuleTypes';
import { ModuleLoader } from './ModuleLoader';
import { EventBus } from '../communication/EventBus';

export class ModuleRegistry {
    private modules: Map<string, Module> = new Map();
    private definitions: Map<string, ModuleDefinition> = new Map();
    private moduleLoader: ModuleLoader;
    private eventBus: EventBus;
    private loadQueue: string[] = [];
    private healthChecks: Map<string, NodeJS.Timeout> = new Map();
    private initializationOrder: string[] = [];
    private dependencyGraph: Map<string, string[]> = new Map();

    constructor(moduleLoader: ModuleLoader, eventBus: EventBus) {
        this.moduleLoader = moduleLoader;
        this.eventBus = eventBus;
        this.setupEventHandlers();
    }

    /**
     * Register a new module definition
     */
    async registerModule(definition: ModuleDefinition): Promise<void> {
        try {
            const { metadata } = definition;

            // Validate module definition
            this.validateModuleDefinition(metadata);

            // Check for conflicts
            if (this.definitions.has(metadata.id)) {
                throw new ModuleError(`Module ${metadata.id} is already registered`, 'LOAD_ERROR', false);
            }

            // Store definition
            this.definitions.set(metadata.id, definition);

            // Build dependency graph
            this.buildDependencyGraph(metadata.id, metadata.dependencies);

            // Create module instance (not yet loaded)
            const module: Module = {
                ...metadata,
                lifecycle: this.createModuleLifecycle(metadata.id)
            };

            this.modules.set(metadata.id, module);

            // Emit registration event
            this.emitEvent('MODULE_REGISTERED', metadata.id, { definition });

            console.log(`Module ${metadata.name} (${metadata.id}) registered successfully`);

        } catch (error) {
            console.error(`Failed to register module ${definition.metadata.id}:`, error);
            throw error;
        }
    }

    /**
     * Load and initialize a module with its dependencies
     */
    async loadModule(moduleId: string, forceReload: boolean = false): Promise<ModuleLoadResult> {
        try {
            if (!forceReload && this.isModuleLoaded(moduleId)) {
                return {
                    module: this.modules.get(moduleId)!,
                    dependencies: [],
                    warnings: ['Module already loaded'],
                    errors: []
                };
            }

            if (!this.definitions.has(moduleId)) {
                throw new ModuleError(`Module ${moduleId} is not registered`, 'DEPENDENCY_ERROR', false);
            }

            const definition = this.definitions.get(moduleId)!;
            const loadResult: ModuleLoadResult = {
                module: {} as Module,
                dependencies: [],
                warnings: [],
                errors: []
            };

            // Check if already loading
            if (this.loadQueue.includes(moduleId)) {
                loadResult.warnings.push('Module already in load queue');
                return loadResult;
            }

            // Add to load queue
            this.loadQueue.push(moduleId);

            try {
                // Resolve dependencies first
                const dependencyResults = await this.loadDependencies(definition.metadata.dependencies);
                loadResult.dependencies = dependencyResults.map(dep => dep.module.id);
                loadResult.warnings.push(...dependencyResults.flatMap(dep => dep.warnings));
                loadResult.errors.push(...dependencyResults.flatMap(dep => dep.errors));

                if (dependencyResults.some(dep => dep.errors.length > 0)) {
                    throw new ModuleError(`Failed to load dependencies for module ${moduleId}`, 'DEPENDENCY_ERROR', false);
                }

                // Create module context
                const context = this.createModuleContext(moduleId);

                // Initialize and load the module
                const module = await definition.implementation.init(context);

                // Validate loaded module
                this.validateLoadedModule(module);

                // Store loaded module
                this.modules.set(moduleId, module);

                // Add to initialization order
                this.addToInitializationOrder(moduleId);

                // Start health monitoring
                this.startHealthMonitoring(moduleId);

                loadResult.module = module;

                // Emit load event
                this.emitEvent('MODULE_LOADED', moduleId, { module, dependencies: loadResult.dependencies });

                console.log(`Module ${module.name} (${moduleId}) loaded successfully`);

            } finally {
                // Remove from load queue
                const queueIndex = this.loadQueue.indexOf(moduleId);
                if (queueIndex > -1) {
                    this.loadQueue.splice(queueIndex, 1);
                }
            }

            return loadResult;

        } catch (error) {
            const moduleError = error instanceof ModuleError ? error :
                new ModuleError(`Failed to load module ${moduleId}`, 'LOAD_ERROR', true);

            this.emitEvent('MODULE_LOAD_ERROR', moduleId, { error: moduleError });
            throw moduleError;
        }
    }

    /**
     * Unload a module and its dependents
     */
    async unloadModule(moduleId: string, force: boolean = false): Promise<void> {
        try {
            const module = this.modules.get(moduleId);
            if (!module) {
                console.warn(`Module ${moduleId} is not loaded`);
                return;
            }

            // Check for dependents
            const dependents = this.getDependents(moduleId);
            if (dependents.length > 0 && !force) {
                throw new ModuleError(
                    `Cannot unload module ${moduleId} - dependent modules: ${dependents.join(', ')}`,
                    'DEPENDENCY_ERROR',
                    false
                );
            }

            // Unload dependents first if forced
            if (force) {
                for (const dependent of dependents) {
                    await this.unloadModule(dependent, true);
                }
            }

            // Execute module lifecycle destroy
            if (module.lifecycle?.destroy) {
                await module.lifecycle.destroy();
            }

            // Stop health monitoring
            this.stopHealthMonitoring(moduleId);

            // Remove from loaded modules
            this.modules.delete(moduleId);
            this.removeFromInitializationOrder(moduleId);

            // Unload from module loader
            await this.moduleLoader.unload(moduleId);

            // Emit unload event
            this.emitEvent('MODULE_UNLOADED', moduleId, { module });

            console.log(`Module ${module.name} (${moduleId}) unloaded successfully`);

        } catch (error) {
            const moduleError = error instanceof ModuleError ? error :
                new ModuleError(`Failed to unload module ${moduleId}`, 'EXECUTION_ERROR', true);

            this.emitEvent('MODULE_UNLOAD_ERROR', moduleId, { error: moduleError });
            throw moduleError;
        }
    }

    /**
     * Enable a module
     */
    async enableModule(moduleId: string): Promise<void> {
        const module = this.modules.get(moduleId);
        if (!module) {
            throw new ModuleError(`Module ${moduleId} is not loaded`, 'EXECUTION_ERROR', false);
        }

        if (module.enabled) {
            console.warn(`Module ${moduleId} is already enabled`);
            return;
        }

        try {
            // Enable lifecycle hook
            if (module.lifecycle?.onEnable) {
                await module.lifecycle.onEnable();
            }

            module.enabled = true;
            this.emitEvent('MODULE_ENABLED', moduleId, { module });

            console.log(`Module ${module.name} (${moduleId}) enabled successfully`);

        } catch (error) {
            const moduleError = error instanceof ModuleError ? error :
                new ModuleError(`Failed to enable module ${moduleId}`, 'EXECUTION_ERROR', true);

            this.emitEvent('MODULE_ENABLE_ERROR', moduleId, { error: moduleError });
            throw moduleError;
        }
    }

    /**
     * Disable a module
     */
    async disableModule(moduleId: string): Promise<void> {
        const module = this.modules.get(moduleId);
        if (!module) {
            throw new ModuleError(`Module ${moduleId} is not loaded`, 'EXECUTION_ERROR', false);
        }

        if (!module.enabled) {
            console.warn(`Module ${moduleId} is already disabled`);
            return;
        }

        try {
            // Disable lifecycle hook
            if (module.lifecycle?.onDisable) {
                await module.lifecycle.onDisable();
            }

            module.enabled = false;
            this.emitEvent('MODULE_DISABLED', moduleId, { module });

            console.log(`Module ${module.name} (${moduleId}) disabled successfully`);

        } catch (error) {
            const moduleError = error instanceof ModuleError ? error :
                new ModuleError(`Failed to disable module ${moduleId}`, 'EXECUTION_ERROR', true);

            this.emitEvent('MODULE_DISABLE_ERROR', moduleId, { error: moduleError });
            throw moduleError;
        }
    }

    /**
     * Get all registered modules
     */
    getRegisteredModules(): Module[] {
        return Array.from(this.modules.values());
    }

    /**
     * Get loaded modules
     */
    getLoadedModules(): Module[] {
        return Array.from(this.modules.values()).filter(module =>
            this.moduleLoader.getLoadedModules().some(loaded => loaded.id === module.id)
        );
    }

    /**
     * Get module by ID
     */
    getModule(moduleId: string): Module | undefined {
        return this.modules.get(moduleId);
    }

    /**
     * Check if module is loaded
     */
    isModuleLoaded(moduleId: string): boolean {
        return this.modules.has(moduleId) &&
            this.moduleLoader.getLoadedModules().some(loaded => loaded.id === moduleId);
    }

    /**
     * Get module health status
     */
    getModuleHealth(moduleId: string): ModuleHealth | undefined {
        const module = this.modules.get(moduleId);
        if (!module) return undefined;

        const loadedModules = this.moduleLoader.getLoadedModules();
        const isLoaded = loadedModules.some(loaded => loaded.id === moduleId);

        return {
            moduleId,
            status: isLoaded ? (module.enabled ? 'healthy' : 'degraded') : 'unknown',
            lastCheck: new Date(),
            metrics: {
                memoryUsage: 0,
                cpuUsage: 0,
                responseTime: 0,
                errorCount: 0,
                requestCount: 0,
                uptime: 0
            },
            dependencies: this.getDependencyHealth(moduleId)
        };
    }

    /**
     * Get initialization order for all loaded modules
     */
    getInitializationOrder(): string[] {
        return [...this.initializationOrder];
    }

    /**
     * Get dependency graph
     */
    getDependencyGraph(): Map<string, string[]> {
        return new Map(this.dependencyGraph);
    }

    /**
     * Find module conflicts
     */
    findConflicts(): { module1: string; module2: string; conflicts: string[] }[] {
        const conflicts: { module1: string; module2: string; conflicts: string[] }[] = [];
        const moduleIds = Array.from(this.modules.keys());

        for (let i = 0; i < moduleIds.length; i++) {
            for (let j = i + 1; j < moduleIds.length; j++) {
                const module1 = this.modules.get(moduleIds[i])!;
                const module2 = this.modules.get(moduleIds[j])!;

                const providerConflicts = module1.provides.filter(service =>
                    module2.provides.includes(service)
                );

                if (providerConflicts.length > 0) {
                    conflicts.push({
                        module1: module1.id,
                        module2: module2.id,
                        conflicts: providerConflicts
                    });
                }
            }
        }

        return conflicts;
    }

    private setupEventHandlers(): void {
        // Handle module events
        this.eventBus.subscribe('MODULE_ERROR', (data) => {
            const { moduleId, error } = data;
            console.error(`Module error in ${moduleId}:`, error);
        });
    }

    private validateModuleDefinition(metadata: any): void {
        if (!metadata.id || !metadata.name || !metadata.version) {
            throw new ModuleError('Module metadata must have id, name, and version', 'LOAD_ERROR', false);
        }

        if (metadata.category && !['core', 'feature', 'integration', 'ui', 'infrastructure', 'plugin'].includes(metadata.category)) {
            throw new ModuleError(`Invalid module category: ${metadata.category}`, 'LOAD_ERROR', false);
        }
    }

    private validateLoadedModule(module: Module): void {
        if (!module.id || !module.name) {
            throw new ModuleError('Loaded module must have id and name', 'LOAD_ERROR', false);
        }
    }

    private async loadDependencies(dependencies: string[]): Promise<ModuleLoadResult[]> {
        const results: ModuleLoadResult[] = [];

        for (const depId of dependencies) {
            if (!this.isModuleLoaded(depId)) {
                const result = await this.loadModule(depId);
                results.push(result);
            }
        }

        return results;
    }

    private buildDependencyGraph(moduleId: string, dependencies: string[]): void {
        this.dependencyGraph.set(moduleId, dependencies);
    }

    private getDependents(moduleId: string): string[] {
        const dependents: string[] = [];

        for (const [modId, deps] of this.dependencyGraph.entries()) {
            if (deps.includes(moduleId)) {
                dependents.push(modId);
            }
        }

        return dependents;
    }

    private addToInitializationOrder(moduleId: string): void {
        if (!this.initializationOrder.includes(moduleId)) {
            this.initializationOrder.push(moduleId);
        }
    }

    private removeFromInitializationOrder(moduleId: string): void {
        const index = this.initializationOrder.indexOf(moduleId);
        if (index > -1) {
            this.initializationOrder.splice(index, 1);
        }
    }

    private createModuleLifecycle(moduleId: string): any {
        return {
            initialize: async () => {
                console.log(`Initializing module ${moduleId}`);
            },
            start: async () => {
                console.log(`Starting module ${moduleId}`);
            },
            stop: async () => {
                console.log(`Stopping module ${moduleId}`);
            },
            destroy: async () => {
                console.log(`Destroying module ${moduleId}`);
            }
        };
    }

    private createModuleContext(moduleId: string): any {
        // This would be provided by the ModuleLoader
        return {
            moduleId,
            timestamp: new Date()
        };
    }

    private emitEvent(type: string, moduleId: string, data?: any): void {
        const event: ModuleEvent = {
            type: type as any,
            moduleId,
            timestamp: new Date(),
            data
        };

        this.eventBus.publish(`module.${type}`, event);
    }

    private startHealthMonitoring(moduleId: string): void {
        const healthCheck = setInterval(async () => {
            const health = this.getModuleHealth(moduleId);
            if (health && health.status === 'error') {
                this.emitEvent('MODULE_HEALTH_ERROR', moduleId, { health });
            }
        }, 30000); // Check every 30 seconds

        this.healthChecks.set(moduleId, healthCheck);
    }

    private stopHealthMonitoring(moduleId: string): void {
        const healthCheck = this.healthChecks.get(moduleId);
        if (healthCheck) {
            clearInterval(healthCheck);
            this.healthChecks.delete(moduleId);
        }
    }

    private getDependencyHealth(moduleId: string): Record<string, 'healthy' | 'degraded' | 'error'> {
        const dependencies = this.dependencyGraph.get(moduleId) || [];
        const health: Record<string, 'healthy' | 'degraded' | 'error'> = {};

        for (const depId of dependencies) {
            const depHealth = this.getModuleHealth(depId);
            health[depId] = depHealth?.status === 'healthy' ? 'healthy' : 'degraded';
        }

        return health;
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // Stop all health checks
        for (const healthCheck of this.healthChecks.values()) {
            clearInterval(healthCheck);
        }
        this.healthChecks.clear();

        // Unload all modules
        for (const moduleId of Array.from(this.modules.keys())) {
            this.unloadModule(moduleId, true).catch(console.error);
        }

        // Clear all data
        this.modules.clear();
        this.definitions.clear();
        this.loadQueue.length = 0;
        this.initializationOrder.length = 0;
        this.dependencyGraph.clear();

        console.log('ModuleRegistry destroyed');
    }
}