/**
 * Module Lifecycle Management
 * Handles module initialization, starting, stopping, and destruction
 */

import { Module, ModuleLifecycle, ModuleError, ModuleContext } from './ModuleTypes';

export class ModuleLifecycleManager {
    private moduleStates: Map<string, ModuleState> = new Map();
    private healthChecks: Map<string, number> = new Map();

    /**
     * Initialize module lifecycle
     */
    async initialize(module: Module, context: ModuleContext): Promise<void> {
        try {
            this.validateModule(module);

            const state = this.moduleStates.get(module.id) || new ModuleState(module.id);

            if (state.initialized) {
                console.warn(`Module ${module.id} is already initialized`);
                return;
            }

            console.log(`Initializing module lifecycle for ${module.name} (${module.id})`);

            // Execute lifecycle hooks
            await this.executeWithErrorHandling(
                () => module.lifecycle.initialize(),
                `initialize`,
                module.id
            );

            // Set up health monitoring if enabled
            if (this.shouldMonitorHealth(module)) {
                this.startHealthMonitoring(module.id, context);
            }

            state.initialized = true;
            state.lastInitialized = new Date();
            this.moduleStates.set(module.id, state);

            console.log(`Module lifecycle initialized for ${module.name}`);

        } catch (error) {
            const moduleError = new ModuleError(
                `Failed to initialize module ${module.id}: ${error instanceof Error ? error.message : String(error)}`,
                'EXECUTION_ERROR',
                true,
                module.id
            );

            console.error(`Module lifecycle initialization failed for ${module.id}:`, moduleError);
            throw moduleError;
        }
    }

    /**
     * Start module lifecycle
     */
    async start(module: Module, context: ModuleContext): Promise<void> {
        try {
            const state = this.moduleStates.get(module.id);
            if (!state || !state.initialized) {
                throw new ModuleError(`Module ${module.id} must be initialized before starting`, 'EXECUTION_ERROR', false, module.id);
            }

            if (state.running) {
                console.warn(`Module ${module.id} is already running`);
                return;
            }

            console.log(`Starting module lifecycle for ${module.name} (${module.id})`);

            // Execute lifecycle hooks
            await this.executeWithErrorHandling(
                () => module.lifecycle.start(),
                `start`,
                module.id
            );

            state.running = true;
            state.lastStarted = new Date();
            this.moduleStates.set(module.id, state);

            console.log(`Module lifecycle started for ${module.name}`);

        } catch (error) {
            const moduleError = new ModuleError(
                `Failed to start module ${module.id}: ${error instanceof Error ? error.message : String(error)}`,
                'EXECUTION_ERROR',
                true,
                module.id
            );

            console.error(`Module lifecycle start failed for ${module.id}:`, moduleError);
            throw moduleError;
        }
    }

    /**
     * Stop module lifecycle
     */
    async stop(module: Module): Promise<void> {
        try {
            const state = this.moduleStates.get(module.id);
            if (!state || !state.running) {
                console.warn(`Module ${module.id} is not running`);
                return;
            }

            console.log(`Stopping module lifecycle for ${module.name} (${module.id})`);

            // Execute lifecycle hooks
            await this.executeWithErrorHandling(
                () => module.lifecycle.stop(),
                `stop`,
                module.id
            );

            state.running = false;
            state.lastStopped = new Date();
            this.moduleStates.set(module.id, state);

            console.log(`Module lifecycle stopped for ${module.name}`);

        } catch (error) {
            const moduleError = new ModuleError(
                `Failed to stop module ${module.id}: ${error instanceof Error ? error.message : String(error)}`,
                'EXECUTION_ERROR',
                true,
                module.id
            );

            console.error(`Module lifecycle stop failed for ${module.id}:`, moduleError);
            throw moduleError;
        }
    }

    /**
     * Destroy module lifecycle
     */
    async destroy(module: Module): Promise<void> {
        try {
            const state = this.moduleStates.get(module.id);
            if (!state) {
                console.warn(`Module ${module.id} has no lifecycle state`);
                return;
            }

            console.log(`Destroying module lifecycle for ${module.name} (${module.id})`);

            // Stop health monitoring
            this.stopHealthMonitoring(module.id);

            // Stop module if running
            if (state.running) {
                await this.stop(module);
            }

            // Execute destroy lifecycle hooks
            await this.executeWithErrorHandling(
                () => module.lifecycle.destroy(),
                `destroy`,
                module.id
            );

            // Clean up state
            this.moduleStates.delete(module.id);

            console.log(`Module lifecycle destroyed for ${module.name}`);

        } catch (error) {
            const moduleError = new ModuleError(
                `Failed to destroy module ${module.id}: ${error instanceof Error ? error.message : String(error)}`,
                'EXECUTION_ERROR',
                true,
                module.id
            );

            console.error(`Module lifecycle destroy failed for ${module.id}:`, moduleError);
            throw moduleError;
        }
    }

    /**
     * Enable module lifecycle hooks
     */
    async enable(module: Module): Promise<void> {
        try {
            const state = this.moduleStates.get(module.id);
            if (!state) {
                throw new ModuleError(`Module ${module.id} must be initialized before enabling`, 'EXECUTION_ERROR', false, module.id);
            }

            if (module.lifecycle.onEnable) {
                console.log(`Enabling module lifecycle hooks for ${module.name} (${module.id})`);
                await this.executeWithErrorHandling(
                    () => module.lifecycle.onEnable!(),
                    `enable`,
                    module.id
                );
            }

            state.enabled = true;
            this.moduleStates.set(module.id, state);

        } catch (error) {
            const moduleError = new ModuleError(
                `Failed to enable module ${module.id}: ${error instanceof Error ? error.message : String(error)}`,
                'EXECUTION_ERROR',
                true,
                module.id
            );

            console.error(`Module lifecycle enable failed for ${module.id}:`, moduleError);
            throw moduleError;
        }
    }

    /**
     * Disable module lifecycle hooks
     */
    async disable(module: Module): Promise<void> {
        try {
            const state = this.moduleStates.get(module.id);
            if (!state) {
                throw new ModuleError(`Module ${module.id} must be initialized before disabling`, 'EXECUTION_ERROR', false, module.id);
            }

            if (module.lifecycle.onDisable) {
                console.log(`Disabling module lifecycle hooks for ${module.name} (module.id)`);
                await this.executeWithErrorHandling(
                    () => module.lifecycle.onDisable!(),
                    `disable`,
                    module.id
                );
            }

            state.enabled = false;
            this.moduleStates.set(module.id, state);

        } catch (error) {
            const moduleError = new ModuleError(
                `Failed to disable module ${module.id}: ${error instanceof Error ? error.message : String(error)}`,
                'EXECUTION_ERROR',
                true,
                module.id
            );

            console.error(`Module lifecycle disable failed for ${module.id}:`, moduleError);
            throw moduleError;
        }
    }

    /**
     * Handle configuration changes
     */
    onConfigChange(module: Module, config: any): void {
        try {
            if (module.lifecycle.onConfigChange) {
                module.lifecycle.onConfigChange(config);
            }
        } catch (error) {
            console.error(`Failed to handle config change for module ${module.id}:`, error);
        }
    }

    /**
     * Handle module errors
     */
    onError(module: Module, error: Error): void {
        try {
            if (module.lifecycle.onError) {
                module.lifecycle.onError(error);
            }
        } catch (error) {
            console.error(`Failed to handle error for module ${module.id}:`, error);
        }
    }

    /**
     * Get module lifecycle state
     */
    getModuleState(moduleId: string): ModuleState | undefined {
        return this.moduleStates.get(moduleId);
    }

    /**
     * Check if module is healthy
     */
    isModuleHealthy(moduleId: string): boolean {
        const state = this.moduleStates.get(moduleId);
        return state ? state.healthy : false;
    }

    /**
     * Get all module states
     */
    getAllModuleStates(): Map<string, ModuleState> {
        return new Map(this.moduleStates);
    }

    private validateModule(module: Module): void {
        if (!module.id || !module.name) {
            throw new ModuleError('Module must have id and name', 'EXECUTION_ERROR', false, module.id);
        }

        if (!module.lifecycle) {
            throw new ModuleError('Module must have lifecycle', 'EXECUTION_ERROR', false, module.id);
        }
    }

    private async executeWithErrorHandling(
        operation: () => Promise<void>,
        operationName: string,
        moduleId: string
    ): Promise<void> {
        try {
            await operation();
        } catch (error) {
            const errorMessage = `${operationName} operation failed for module ${moduleId}`;
            console.error(errorMessage, error);

            // Call error handler if available
            const module = this.getModuleById(moduleId);
            if (module?.lifecycle.onError) {
                module.lifecycle.onError(error as Error);
            }

            throw error;
        }
    }

    private getModuleById(moduleId: string): Module | undefined {
        // This would need to be implemented based on how modules are stored
        // For now, return undefined as we don't have access to the module store
        return undefined;
    }

    private shouldMonitorHealth(module: Module): boolean {
        // Enable health monitoring for core and infrastructure modules
        return module.category === 'core' || module.category === 'infrastructure' || module.isolated;
    }

    private startHealthMonitoring(moduleId: string, context: ModuleContext): void {
        const healthCheck = setInterval(() => {
            this.performHealthCheck(moduleId, context);
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

    private async performHealthCheck(moduleId: string, context: ModuleContext): Promise<void> {
        try {
            // Simple health check - in a real implementation, this would be more sophisticated
            const state = this.moduleStates.get(moduleId);
            if (!state) {
                return;
            }

            // Update health status
            state.healthy = state.initialized && (state.running || !state.enabled);
            this.moduleStates.set(moduleId, state);

        } catch (error) {
            console.error(`Health check failed for module ${moduleId}:`, error);
        }
    }

    /**
     * Cleanup all resources
     */
    cleanup(): void {
        // Stop all health checks
        for (const healthCheck of this.healthChecks.values()) {
            clearInterval(healthCheck);
        }
        this.healthChecks.clear();

        // Clear all module states
        this.moduleStates.clear();

        console.log('ModuleLifecycleManager cleaned up');
    }
}

/**
 * Module State Tracking
 */
class ModuleState {
    moduleId: string;
    initialized: boolean = false;
    running: boolean = false;
    enabled: boolean = true;
    healthy: boolean = false;
    lastInitialized?: Date;
    lastStarted?: Date;
    lastStopped?: Date;
    errorCount: number = 0;

    constructor(moduleId: string) {
        this.moduleId = moduleId;
    }
}