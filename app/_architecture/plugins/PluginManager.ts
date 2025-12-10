/**
 * Plugin Manager - Main plugin management interface
 * Coordinates plugin lifecycle and provides unified plugin operations
 */

import { PluginManager as IPluginManager, Plugin } from '../modules/ModuleTypes';
import { PluginRegistry } from './PluginRegistry';
import { SecurePluginSandbox as SecurePluginSandbox } from './PluginSandbox';
import { EventBus } from '../communication/EventBus';

export class PluginManager implements IPluginManager {
    private pluginRegistry: PluginRegistry;
    private _sandbox: PluginSandbox;
    private eventBus: EventBus;
    private pluginDirectories: string[] = [];
    private pluginCache: Map<string, any> = new Map();

    constructor(eventBus: EventBus, debug: boolean = false) {
        this.eventBus = eventBus;
        this._sandbox = new SecurePluginSandbox(debug);
        this.pluginRegistry = new PluginRegistry(eventBus, debug);
        this.setupEventHandlers();
    }

    async load(pluginPath: string): Promise<Plugin> {
        try {
            // Check cache first
            if (this.pluginCache.has(pluginPath)) {
                const cachedPlugin = this.pluginCache.get(pluginPath);
                await this.pluginRegistry.registerPlugin(cachedPlugin);
                return this.pluginRegistry.getPlugin(cachedPlugin.id)!;
            }

            // Load plugin from path (placeholder implementation)
            const pluginDefinition = await this.loadPluginDefinition(pluginPath);

            // Cache the plugin definition
            this.pluginCache.set(pluginPath, pluginDefinition);

            // Register with plugin registry
            await this.pluginRegistry.registerPlugin(pluginDefinition);

            // Load and return the plugin
            return await this.pluginRegistry.loadPlugin(pluginDefinition.id);

        } catch (error) {
            console.error(`Failed to load plugin from ${pluginPath}:`, error);
            throw error;
        }
    }

    async unload(pluginId: string): Promise<void> {
        try {
            await this.pluginRegistry.unloadPlugin(pluginId);

            // Clear from cache
            for (const [path, plugin] of this.pluginCache.entries()) {
                if (plugin.id === pluginId) {
                    this.pluginCache.delete(path);
                    break;
                }
            }

        } catch (error) {
            console.error(`Failed to unload plugin ${pluginId}:`, error);
            throw error;
        }
    }

    async enable(pluginId: string): Promise<void> {
        await this.pluginRegistry.enablePlugin(pluginId);
    }

    async disable(pluginId: string): Promise<void> {
        await this.pluginRegistry.disablePlugin(pluginId);
    }

    list(): Plugin[] {
        return this.pluginRegistry.getPlugins();
    }

    get sandbox(): PluginSandbox {
        return this._sandbox;
    }

    /**
     * Execute a plugin hook across all enabled plugins
     */
    async executeHook(hookName: string, data?: any, context?: any): Promise<any[]> {
        return await this.pluginRegistry.executeHook(hookName, data, context);
    }

    /**
     * Install plugin from various sources
     */
    async installPlugin(source: string, options: any = {}): Promise<Plugin> {
        try {
            let pluginPath: string;

            if (source.startsWith('http://') || source.startsWith('https://')) {
                // Download from URL
                pluginPath = await this.downloadPlugin(source);
            } else if (source.includes('npm:')) {
                // Install from npm
                pluginPath = await this.installFromNPM(source.substring(4));
            } else if (source.includes('github:')) {
                // Install from GitHub
                pluginPath = await this.installFromGitHub(source.substring(7));
            } else {
                // Local file path
                pluginPath = source;
            }

            const plugin = await this.load(pluginPath);

            if (options.autoEnable !== false) {
                await this.enable(plugin.id);
            }

            return plugin;

        } catch (error) {
            console.error(`Failed to install plugin from ${source}:`, error);
            throw error;
        }
    }

    /**
     * Uninstall a plugin completely
     */
    async uninstallPlugin(pluginId: string): Promise<void> {
        try {
            // Unload if loaded
            await this.unload(pluginId);

            // Remove from plugin directories if it's a local plugin
            // This would involve file system operations in a real implementation

            console.log(`Plugin ${pluginId} uninstalled successfully`);

        } catch (error) {
            console.error(`Failed to uninstall plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Update a plugin to the latest version
     */
    async updatePlugin(pluginId: string): Promise<Plugin> {
        try {
            const plugin = this.getPlugin(pluginId);
            if (!plugin) {
                throw new Error(`Plugin ${pluginId} not found`);
            }

            // Disable the plugin
            await this.disable(pluginId);

            // Unload the plugin
            await this.unload(pluginId);

            // Reload from source (this would need to track the original source)
            // For now, just reload from cache
            const cachedSource = this.findPluginSource(pluginId);
            if (cachedSource) {
                return await this.load(cachedSource);
            } else {
                throw new Error(`Cannot find source for plugin ${pluginId}`);
            }

        } catch (error) {
            console.error(`Failed to update plugin ${pluginId}:`, error);
            throw error;
        }
    }

    /**
     * Get plugin by ID
     */
    getPlugin(pluginId: string): Plugin | undefined {
        return this.pluginRegistry.getPlugin(pluginId);
    }

    /**
     * Get enabled plugins
     */
    getEnabledPlugins(): Plugin[] {
        return this.pluginRegistry.getEnabledPlugins();
    }

    /**
     * Get plugins by type
     */
    getPluginsByType(type: any): Plugin[] {
        return this.pluginRegistry.getPluginsByType(type);
    }

    /**
     * Check if plugin is enabled
     */
    isPluginEnabled(pluginId: string): boolean {
        return this.pluginRegistry.isPluginEnabled(pluginId);
    }

    /**
     * Get plugin statistics
     */
    getStats(): any {
        const registryStats = this.pluginRegistry.getStats();
        return {
            ...registryStats,
            sandbox: this.sandbox.getStats()
        };
    }

    /**
     * Validate plugin package
     */
    async validatePlugin(pluginPath: string): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
        try {
            const errors: string[] = [];
            const warnings: string[] = [];

            const pluginDefinition = await this.loadPluginDefinition(pluginPath);

            // Validate required fields
            if (!pluginDefinition.id) {
                errors.push('Plugin must have an id');
            }
            if (!pluginDefinition.name) {
                errors.push('Plugin must have a name');
            }
            if (!pluginDefinition.version) {
                warnings.push('Plugin should have a version');
            }

            // Validate permissions
            if (pluginDefinition.permissions) {
                for (const permission of pluginDefinition.permissions) {
                    if (!this.isValidPermission(permission)) {
                        warnings.push(`Unknown permission: ${permission}`);
                    }
                }
            }

            // Validate hooks
            if (pluginDefinition.hooks) {
                for (const hook of pluginDefinition.hooks) {
                    if (!hook.name) {
                        errors.push('Hook must have a name');
                    }
                    if (!hook.handler) {
                        errors.push('Hook must have a handler');
                    }
                }
            }

            return {
                valid: errors.length === 0,
                errors,
                warnings
            };

        } catch (error) {
            return {
                valid: false,
                errors: [`Failed to validate plugin: ${error instanceof Error ? error.message : String(error)}`],
                warnings: []
            };
        }
    }

    /**
     * Backup plugin configuration
     */
    async backupPlugin(pluginId: string): Promise<any> {
        const plugin = this.getPlugin(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        // Get plugin configuration
        const config = this.getPluginConfig(pluginId);

        return {
            plugin,
            config,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Restore plugin configuration
     */
    async restorePlugin(pluginId: string, backup: any): Promise<void> {
        const plugin = this.getPlugin(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }

        // Restore configuration
        if (backup.config) {
            this.setPluginConfig(pluginId, backup.config);
        }
    }

    /**
     * Get plugin configuration
     */
    getPluginConfig(pluginId: string): any {
        // This would typically be stored in the configuration manager
        return {}; // Placeholder
    }

    /**
     * Set plugin configuration
     */
    setPluginConfig(pluginId: string, config: any): void {
        // This would typically be stored in the configuration manager
        console.log(`Configuration updated for plugin ${pluginId}:`, config);
    }

    private setupEventHandlers(): void {
        // Handle plugin events
        this.eventBus.subscribe('plugin.loaded', (data) => {
            console.log(`Plugin loaded: ${data.plugin.id}`);
        });

        this.eventBus.subscribe('plugin.enabled', (data) => {
            console.log(`Plugin enabled: ${data.plugin.id}`);
        });

        this.eventBus.subscribe('plugin.disabled', (data) => {
            console.log(`Plugin disabled: ${data.plugin.id}`);
        });

        this.eventBus.subscribe('plugin.error', (data) => {
            console.error(`Plugin error: ${data.pluginId}`, data.error);
        });
    }

    private async loadPluginDefinition(path: string): Promise<any> {
        // Placeholder implementation
        // In a real implementation, this would load and parse plugin.json or similar
        return {
            id: `plugin-${Date.now()}`,
            name: 'Sample Plugin',
            version: '1.0.0',
            type: 'custom',
            permissions: [],
            hooks: []
        };
    }

    private async downloadPlugin(url: string): Promise<string> {
        // Placeholder implementation
        // Would download plugin from URL and save to temporary location
        return `/tmp/downloaded-plugin-${Date.now()}`;
    }

    private async installFromNPM(packageName: string): Promise<string> {
        // Placeholder implementation
        // Would use npm to install package and return installation path
        return `/node_modules/${packageName}`;
    }

    private async installFromGitHub(repo: string): Promise<string> {
        // Placeholder implementation
        // Would clone GitHub repository and return path
        return `/tmp/github-plugin-${repo.replace('/', '-')}`;
    }

    private findPluginSource(pluginId: string): string | null {
        for (const [source, plugin] of this.pluginCache.entries()) {
            if (plugin.id === pluginId) {
                return source;
            }
        }
        return null;
    }

    private isValidPermission(permission: string): boolean {
        const validPermissions = [
            'network',
            'storage',
            'notifications',
            'camera',
            'microphone',
            'location',
            'filesystem',
            'process',
            'timer',
            'analytics'
        ];

        return validPermissions.includes(permission);
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.pluginRegistry.destroy();
        this.sandbox.cleanup();
        this.pluginCache.clear();

        console.log('PluginManager destroyed');
    }
}