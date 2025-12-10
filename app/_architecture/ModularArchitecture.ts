/**
 * Modular Architecture Integration
 * Demonstrates how to integrate and use all modular architecture components
 */

import { ModuleRegistry } from './modules/ModuleRegistry';
import { ModuleLoader } from './modules/ModuleLoader';
import { ModuleLifecycleManager } from './modules/ModuleLifecycle';
import { EventBus } from './communication/EventBus';
import { PluginManager } from './plugins/PluginManager';
import { ServiceRegistry } from './services/ServiceRegistry';
import { ConfigManager } from './config/ConfigManager';
import { timerModule } from './examples/TimerModule';

// Modular Architecture System
export class ModularArchitectureSystem {
    private moduleRegistry: ModuleRegistry;
    private moduleLoader: ModuleLoader;
    private moduleLifecycle: ModuleLifecycleManager;
    private eventBus: EventBus;
    private pluginManager: PluginManager;
    private serviceRegistry: ServiceRegistry;
    private configManager: ConfigManager;
    private initialized: boolean = false;

    constructor() {
        // Initialize components
        this.eventBus = new EventBus(true); // Debug mode
        this.configManager = new ConfigManager({
            environment: 'development',
            debug: true,
            featureFlags: {
                'advanced-timer': false,
                'smart-timer': true,
                'analytics': true
            }
        });

        this.serviceRegistry = new ServiceRegistry();
        this.moduleLoader = new ModuleLoader();
        this.moduleLifecycle = new ModuleLifecycleManager();
        this.moduleRegistry = new ModuleRegistry(this.moduleLoader, this.eventBus);
        this.pluginManager = new PluginManager(this.eventBus, true);

        this.setupEventHandlers();
    }

    /**
     * Initialize the modular architecture system
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            console.warn('Modular architecture system already initialized');
            return;
        }

        console.log('🚀 Initializing Modular Architecture System...');

        try {
            // 1. Initialize core services
            await this.initializeCoreServices();

            // 2. Load core modules
            await this.loadCoreModules();

            // 3. Initialize feature modules
            await this.loadFeatureModules();

            // 4. Load plugins
            await this.loadPlugins();

            // 5. Start all services
            await this.serviceRegistry.initializeAll();

            this.initialized = true;
            console.log('✅ Modular Architecture System initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize modular architecture system:', error);
            throw error;
        }
    }

    /**
     * Shutdown the system
     */
    async shutdown(): Promise<void> {
        if (!this.initialized) {
            return;
        }

        console.log('🔄 Shutting down Modular Architecture System...');

        try {
            // 1. Stop all plugins
            await this.pluginManager.destroy();

            // 2. Unload all modules
            const loadedModules = this.moduleRegistry.getLoadedModules();
            for (const module of loadedModules) {
                await this.moduleRegistry.unloadModule(module.id);
            }

            // 3. Shutdown services
            await this.serviceRegistry.shutdownAll();

            // 4. Cleanup
            this.moduleRegistry.destroy();
            this.pluginManager.destroy();

            this.initialized = false;
            console.log('✅ Modular Architecture System shutdown complete');

        } catch (error) {
            console.error('❌ Error during system shutdown:', error);
        }
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            initialized: this.initialized,
            services: this.serviceRegistry.getAllServiceHealth(),
            modules: {
                registered: this.moduleRegistry.getRegisteredModules().length,
                loaded: this.moduleRegistry.getLoadedModules().length
            },
            plugins: this.pluginManager.getStats(),
            configuration: {
                environment: this.configManager.getEnvironment(),
                debug: this.configManager.isDebugMode(),
                featureFlags: this.configManager.listFeatureFlags()
            }
        };
    }

    private setupEventHandlers(): void {
        // System events
        this.eventBus.subscribe('module.loaded', (data) => {
            console.log(`📦 Module loaded: ${data.module.id}`);
        });

        this.eventBus.subscribe('plugin.enabled', (data) => {
            console.log(`🔌 Plugin enabled: ${data.plugin.id}`);
        });

        this.eventBus.subscribe('timer.completed', (data) => {
            console.log(`⏱️ Timer completed: ${data.originalDuration} minutes`);
        });

        // Error handling
        this.eventBus.subscribe('system.error', (data) => {
            console.error('🚨 System error:', data.error);
        });
    }

    private async initializeCoreServices(): Promise<void> {
        console.log('🔧 Initializing core services...');

        // Event Bus Service
        this.serviceRegistry.register('eventBus', this.eventBus, [], true);

        // Config Manager Service  
        this.serviceRegistry.register('configManager', this.configManager, [], true);

        // Module Registry Service
        this.serviceRegistry.register('moduleRegistry', this.moduleRegistry, ['eventBus'], true);

        // Plugin Manager Service
        this.serviceRegistry.register('pluginManager', this.pluginManager, ['eventBus'], true);

        console.log('✅ Core services initialized');
    }

    private async loadCoreModules(): Promise<void> {
        console.log('📦 Loading core modules...');

        // Register timer module
        await this.moduleRegistry.registerModule(timerModule);

        // Load timer module
        const timerResult = await this.moduleRegistry.loadModule('timer-core');
        console.log('Timer module loaded:', timerResult);

        console.log('✅ Core modules loaded');
    }

    private async loadFeatureModules(): Promise<void> {
        console.log('🎯 Loading feature modules...');

        // Load features based on environment and feature flags
        if (this.configManager.isFeatureEnabled('smart-timer')) {
            try {
                // Would load smart timer module here
                console.log('🎯 Smart timer feature enabled');
            } catch (error) {
                console.warn('Failed to load smart timer module:', error);
            }
        }

        console.log('✅ Feature modules loaded');
    }

    private async loadPlugins(): Promise<void> {
        console.log('🔌 Loading plugins...');

        try {
            // Example plugin installation
            const analyticsPlugin = {
                id: 'analytics-basic',
                name: 'Basic Analytics',
                version: '1.0.0',
                type: 'analytics',
                permissions: ['analytics'],

                install: () => console.log('Installing Basic Analytics plugin'),
                enable: () => console.log('Enabling Basic Analytics plugin'),
                disable: () => console.log('Disabling Basic Analytics plugin'),

                hooks: [
                    {
                        name: 'timer.completed',
                        priority: 10,
                        handler: (data) => {
                            console.log('Analytics: Timer completed event received', data);
                        }
                    }
                ]
            };

            await this.pluginManager.installPlugin(analyticsPlugin);
            await this.pluginManager.enable('analytics-basic');

            console.log('✅ Plugins loaded');
        } catch (error) {
            console.warn('Plugin loading failed:', error);
        }
    }

    /**
     * API for external components to interact with the system
     */

    // Module operations
    async loadModule(moduleId: string): Promise<any> {
        return await this.moduleRegistry.loadModule(moduleId);
    }

    async unloadModule(moduleId: string): Promise<void> {
        await this.moduleRegistry.unloadModule(moduleId);
    }

    async enableModule(moduleId: string): Promise<void> {
        await this.moduleRegistry.enableModule(moduleId);
    }

    async disableModule(moduleId: string): Promise<void> {
        await this.moduleRegistry.disableModule(moduleId);
    }

    // Plugin operations
    async installPlugin(source: string, options?: any): Promise<any> {
        return await this.pluginManager.installPlugin(source, options);
    }

    async enablePlugin(pluginId: string): Promise<void> {
        await this.pluginManager.enable(pluginId);
    }

    async disablePlugin(pluginId: string): Promise<void> {
        await this.pluginManager.disable(pluginId);
    }

    // Service operations
    getService<T>(name: string): T | undefined {
        return this.serviceRegistry.get<T>(name);
    }

    registerService(name: string, service: any, dependencies: string[] = []): void {
        this.serviceRegistry.register(name, service, dependencies);
    }

    // Configuration operations
    getConfig(key: string, defaultValue?: any): any {
        return this.configManager.get(key, defaultValue);
    }

    setConfig(key: string, value: any): void {
        this.configManager.set(key, value);
    }

    isFeatureEnabled(flagName: string): boolean {
        return this.configManager.isFeatureEnabled(flagName);
    }

    // Event operations
    publishEvent(event: string, data?: any): void {
        this.eventBus.publish(event, data);
    }

    subscribeToEvent(event: string, handler: Function): () => void {
        return this.eventBus.subscribe(event, handler);
    }

    /**
     * Utility methods for development and debugging
     */

    getDebugInfo() {
        return {
            timestamp: new Date().toISOString(),
            status: this.getStatus(),
            eventBusEvents: this.eventBus.getRegisteredEvents(),
            serviceDependencies: this.serviceRegistry.getDependencyGraph(),
            moduleConflicts: this.moduleRegistry.findConflicts()
        };
    }

    exportConfiguration() {
        return this.configManager.export();
    }

    importConfiguration(config: any) {
        this.configManager.import(config);
    }

    resetToDefaults() {
        this.configManager.reset();
        this.serviceRegistry.reset();

        // Would reset modules and plugins here
        console.log('🔄 System reset to defaults');
    }
}

// Create global instance
export const modularArchitecture = new ModularArchitectureSystem();

// Export convenience functions
export const {
    loadModule,
    unloadModule,
    enableModule,
    disableModule,
    installPlugin,
    enablePlugin,
    disablePlugin,
    getService,
    registerService,
    getConfig,
    setConfig,
    isFeatureEnabled,
    publishEvent,
    subscribeToEvent
} = modularArchitecture;

// Example usage:
/*
// Initialize the system
await modularArchitecture.initialize();

// Use the timer service
const timerService = modularArchitecture.getService('timer');
if (timerService) {
  timerService.start(25); // 25 minute timer
}

// Subscribe to timer events
modularArchitecture.subscribeToEvent('timer.completed', (data) => {
  console.log('Timer completed! Duration:', data.originalDuration);
});

// Enable a feature flag
modularArchitecture.setConfig('advanced-features', true);

// Check if feature is enabled
if (modularArchitecture.isFeatureEnabled('smart-timer')) {
  console.log('Smart timer is available');
}

// Get system status
const status = modularArchitecture.getStatus();
console.log('System status:', status);

// Shutdown when done
await modularArchitecture.shutdown();
*/