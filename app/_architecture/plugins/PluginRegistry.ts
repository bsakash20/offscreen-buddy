/**
 * Plugin Registry - Central plugin management system
 * Handles plugin registration, loading, and lifecycle management
 */

import { Plugin, PluginType, PluginLifecycle, PluginHook, SandboxResult, PluginSandbox } from '../modules/ModuleTypes';
import { SecurePluginSandbox } from './PluginSandbox';
import { EventBus } from '../communication/EventBus';

export class PluginRegistry {
    private plugins: Map<string, Plugin> = new Map();
    private pluginDefinitions: Map<string, any> = new Map();
    private sandbox: SecurePluginSandbox;
    private eventBus: EventBus;
    private enabledPlugins: Set<string> = new Set();

    constructor(eventBus: EventBus, debug: boolean = false) {
        this.sandbox = new SecurePluginSandbox(debug);
        this.eventBus = eventBus;
        this.setupEventHandlers();
    }

    /**
     * Register a new plugin
     */
    async registerPlugin(pluginDefinition: any): Promise<void> {
        try {
            const pluginId = pluginDefinition.id || pluginDefinition.name;

            if (!pluginId) {
                throw new Error('Plugin must have an id or name');
            }

            if (this.plugins.has(pluginId)) {
                throw new Error(`Plugin ${pluginId} is already registered`);
            }

            // Create plugin instance
            const plugin: Plugin = {
                id: pluginId,
                name: pluginDefinition.name || pluginId,
                version: pluginDefinition.version || '1.0.0',
                type: this.normalizePluginType(pluginDefinition.type),
                sandbox: this.sandbox,
                permissions: pluginDefinition.permissions || [],
                hooks: pluginDefinition.hooks || [],
                lifecycle: this.createPluginLifecycle(pluginId)
            };

            // Store plugin
            this.plugins.set(pluginId, plugin);
            this.pluginDefinitions.set(pluginId, pluginDefinition);

            console.log(`Plugin ${plugin.name} (${pluginId}) registered successfully`);

            // Emit registration event
            this.eventBus.emit('plugin.registered', { plugin });

        } catch (error) {
            console.error(`Failed to register plugin:`, error);
            throw error;
        }
    }

    /**
     * Load and initialize a plugin
     */
    async loadPlugin(pluginId: string): Promise<Plugin> {
        try {
            const plugin = this.plugins.get(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} is not registered`);
            }

            const pluginDefinition = this.pluginDefinitions.get(pluginId);
            if (!pluginDefinition) {
                throw new Error(`Plugin definition for ${pluginId} not found`);
            }

            // Execute plugin installation
            if (pluginDefinition.install) {
                const installResult = await plugin.sandbox.execute(`
          (${pluginDefinition.install.toString()})();
        `);

                if (!installResult.success) {
                    throw new Error(`Plugin installation failed: ${installResult.error?.message}`);
                }
            }

            console.log(`Plugin ${plugin.name} loaded successfully`);

            // Emit load event
            this.eventBus.emit('plugin.loaded', { plugin });

            return plugin;

        } catch (error) {
            console.error(`Failed to load plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Enable a plugin
     */
    async enablePlugin(pluginId: string): Promise<void> {
        try {
            const plugin = this.plugins.get(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} is not registered`);
            }

            if (this.enabledPlugins.has(pluginId)) {
                console.warn(`Plugin ${pluginId} is already enabled`);
                return;
            }

            const pluginDefinition = this.pluginDefinitions.get(pluginId);
            if (!pluginDefinition) {
                throw new Error(`Plugin definition for ${pluginId} not found`);
            }

            // Execute plugin enable lifecycle
            if (pluginDefinition.enable) {
                const enableResult = await plugin.sandbox.execute(`
          (${pluginDefinition.enable.toString()})();
        `);

                if (!enableResult.success) {
                    throw new Error(`Plugin enable failed: ${enableResult.error?.message}`);
                }
            }

            // Register hooks
            await this.registerPluginHooks(plugin, pluginDefinition);

            this.enabledPlugins.add(pluginId);

            console.log(`Plugin ${plugin.name} enabled successfully`);

            // Emit enable event
            this.eventBus.emit('plugin.enabled', { plugin });

        } catch (error) {
            console.error(`Failed to enable plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Disable a plugin
     */
    async disablePlugin(pluginId: string): Promise<void> {
        try {
            const plugin = this.plugins.get(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} is not registered`);
            }

            if (!this.enabledPlugins.has(pluginId)) {
                console.warn(`Plugin ${pluginId} is already disabled`);
                return;
            }

            const pluginDefinition = this.pluginDefinitions.get(pluginId);

            // Unregister hooks
            this.unregisterPluginHooks(plugin);

            // Execute plugin disable lifecycle
            if (pluginDefinition?.disable) {
                const disableResult = await plugin.sandbox.execute(`
          (${pluginDefinition.disable.toString()})();
        `);

                if (!disableResult.success) {
                    console.warn(`Plugin disable failed: ${disableResult.error?.message}`);
                }
            }

            this.enabledPlugins.delete(pluginId);

            console.log(`Plugin ${plugin.name} disabled successfully`);

            // Emit disable event
            this.eventBus.emit('plugin.disabled', { plugin });

        } catch (error) {
            console.error(`Failed to disable plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Unload a plugin
     */
    async unloadPlugin(pluginId: string): Promise<void> {
        try {
            const plugin = this.plugins.get(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} is not registered`);
            }

            // Disable if enabled
            if (this.enabledPlugins.has(pluginId)) {
                await this.disablePlugin(pluginId);
            }

            // Execute plugin uninstall
            const pluginDefinition = this.pluginDefinitions.get(pluginId);
            if (pluginDefinition?.uninstall) {
                const uninstallResult = await plugin.sandbox.execute(`
          (${pluginDefinition.uninstall.toString()})();
        `);

                if (!uninstallResult.success) {
                    console.warn(`Plugin uninstall failed: ${uninstallResult.error?.message}`);
                }
            }

            // Remove from registry
            this.plugins.delete(pluginId);
            this.pluginDefinitions.delete(pluginId);

            console.log(`Plugin ${plugin.name} unloaded successfully`);

            // Emit unload event
            this.eventBus.emit('plugin.unloaded', { pluginId });

        } catch (error) {
            console.error(`Failed to unload plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Execute a plugin hook
     */
    async executeHook(hookName: string, data: any, context?: any): Promise<any> {
        try {
            const enabledPlugins = Array.from(this.enabledPlugins);
            const hookResults: any[] = [];

            for (const pluginId of enabledPlugins) {
                const plugin = this.plugins.get(pluginId);
                if (!plugin) continue;

                const hooks = plugin.hooks.filter(h => h.name === hookName);

                for (const hook of hooks) {
                    try {
                        // Filter data if filter function is provided
                        let filteredData = data;
                        if (hook.filter) {
                            filteredData = await plugin.sandbox.execute(`
                (${hook.filter.toString()})(${JSON.stringify(data)});
              `);
                        }

                        // Execute hook handler
                        const hookResult = await plugin.sandbox.execute(`
              (${hook.handler.toString()})(${JSON.stringify(filteredData)}, ${JSON.stringify(context || {})});
            `);

                        if (hookResult.success) {
                            hookResults.push({
                                pluginId,
                                result: hookResult.result,
                                priority: hook.priority
                            });
                        }
                    } catch (error) {
                        console.warn(`Hook ${hookName} failed for plugin ${pluginId}:`, error);
                    }
                }
            }

            // Sort by priority and return results
            hookResults.sort((a, b) => b.priority - a.priority);

            return hookResults.map(result => result.result);

        } catch (error) {
            console.error(`Failed to execute hook ${hookName}:`, error);
            throw error;
        }
    }

    /**
     * Get all registered plugins
     */
    getPlugins(): Plugin[] {
        return Array.from(this.plugins.values());
    }

    /**
     * Get enabled plugins
     */
    getEnabledPlugins(): Plugin[] {
        return Array.from(this.enabledPlugins)
            .map(id => this.plugins.get(id))
            .filter(Boolean) as Plugin[];
    }

    /**
     * Get plugin by ID
     */
    getPlugin(pluginId: string): Plugin | undefined {
        return this.plugins.get(pluginId);
    }

    /**
     * Check if plugin is enabled
     */
    isPluginEnabled(pluginId: string): boolean {
        return this.enabledPlugins.has(pluginId);
    }

    /**
     * Get plugins by type
     */
    getPluginsByType(type: PluginType): Plugin[] {
        return Array.from(this.plugins.values()).filter(plugin => plugin.type === type);
    }

    /**
     * Get plugin statistics
     */
    getStats(): {
        total: number;
        enabled: number;
        byType: Record<PluginType, number>;
        byCategory: Record<string, number>;
    } {
        const byType: Record<PluginType, number> = {
            timer: 0,
            analytics: 0,
            notification: 0,
            payment: 0,
            theme: 0,
            custom: 0
        };

        const byCategory: Record<string, number> = {};

        for (const plugin of this.plugins.values()) {
            byType[plugin.type]++;

            // Category would be determined by plugin metadata
            const category = plugin.id.split('-')[0] || 'uncategorized';
            byCategory[category] = (byCategory[category] || 0) + 1;
        }

        return {
            total: this.plugins.size,
            enabled: this.enabledPlugins.size,
            byType,
            byCategory
        };
    }

    private setupEventHandlers(): void {
        // Handle plugin errors
        this.eventBus.subscribe('plugin.error', (data) => {
            const { pluginId, error } = data;
            console.error(`Plugin error in ${pluginId}:`, error);
        });
    }

    private normalizePluginType(type: any): PluginType {
        const validTypes: PluginType[] = ['timer', 'analytics', 'notification', 'payment', 'theme', 'custom'];
        return validTypes.includes(type) ? type : 'custom';
    }

    private createPluginLifecycle(pluginId: string): PluginLifecycle {
        return {
            install: async () => {
                console.log(`Installing plugin ${pluginId}`);
            },
            enable: async () => {
                console.log(`Enabling plugin ${pluginId}`);
            },
            disable: async () => {
                console.log(`Disabling plugin ${pluginId}`);
            },
            uninstall: async () => {
                console.log(`Uninstalling plugin ${pluginId}`);
            }
        };
    }

    private async registerPluginHooks(plugin: Plugin, pluginDefinition: any): Promise<void> {
        if (pluginDefinition.hooks) {
            for (const hook of pluginDefinition.hooks) {
                // Register hook with the event system
                this.eventBus.subscribe(`hook.${hook.name}`, (data) => {
                    // This would be handled by the executeHook method
                });
            }
        }
    }

    private unregisterPluginHooks(plugin: Plugin): void {
        for (const hook of plugin.hooks) {
            this.eventBus.unsubscribe(`hook.${hook.name}`, () => {
                // Hook cleanup would happen here
            });
        }
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        // Disable all enabled plugins
        for (const pluginId of Array.from(this.enabledPlugins)) {
            this.disablePlugin(pluginId).catch(console.error);
        }

        // Clear all data
        this.plugins.clear();
        this.pluginDefinitions.clear();
        this.enabledPlugins.clear();

        // Cleanup sandbox
        this.sandbox.cleanup();

        console.log('PluginRegistry destroyed');
    }
}