/**
 * Service Registry & Dependency Management
 * Centralized service registration and dependency injection
 */

export interface ServiceInstance {
    name: string;
    service: any;
    dependencies: string[];
    singleton: boolean;
    initialized: boolean;
    initializationTime?: Date;
}

export class ServiceRegistry {
    private services: Map<string, ServiceInstance> = new Map();
    private dependencyGraph: Map<string, Set<string>> = new Map();
    private initializationQueue: string[] = [];
    private circularDependencies: Set<string> = new Set();

    constructor() { }

    /**
     * Register a service
     */
    register(
        name: string,
        service: any,
        dependencies: string[] = [],
        singleton: boolean = true
    ): void {
        if (this.services.has(name)) {
            throw new Error(`Service ${name} is already registered`);
        }

        const serviceInstance: ServiceInstance = {
            name,
            service,
            dependencies,
            singleton,
            initialized: false
        };

        this.services.set(name, serviceInstance);
        this.dependencyGraph.set(name, new Set(dependencies));

        console.log(`Service ${name} registered with dependencies: [${dependencies.join(', ')}]`);
    }

    /**
     * Unregister a service
     */
    unregister(name: string): void {
        const service = this.services.get(name);
        if (!service) {
            console.warn(`Service ${name} is not registered`);
            return;
        }

        // Check if other services depend on this service
        const dependents = this.getDependents(name);
        if (dependents.length > 0) {
            throw new Error(`Cannot unregister service ${name} - other services depend on it: ${dependents.join(', ')}`);
        }

        // Remove from dependency graph
        this.dependencyGraph.delete(name);

        // Remove service
        this.services.delete(name);

        console.log(`Service ${name} unregistered`);
    }

    /**
     * Get a service instance
     */
    get<T>(name: string): T | undefined {
        const serviceInstance = this.services.get(name);
        if (!serviceInstance) {
            return undefined;
        }

        // If singleton, ensure it's initialized
        if (serviceInstance.singleton && !serviceInstance.initialized) {
            this.initializeService(name).catch(error => {
                console.error(`Failed to initialize service ${name}:`, error);
            });
        }

        return serviceInstance.service;
    }

    /**
     * Check if a service is registered
     */
    has(name: string): boolean {
        return this.services.has(name);
    }

    /**
     * List all registered services
     */
    list(): string[] {
        return Array.from(this.services.keys());
    }

    /**
     * Initialize all services
     */
    async initializeAll(): Promise<void> {
        const initializationOrder = this.getInitializationOrder();

        console.log(`Initializing services in order: ${initializationOrder.join(' -> ')}`);

        for (const serviceName of initializationOrder) {
            await this.initializeService(serviceName);
        }
    }

    /**
     * Initialize a specific service
     */
    async initializeService(name: string): Promise<void> {
        const serviceInstance = this.services.get(name);
        if (!serviceInstance) {
            throw new Error(`Service ${name} is not registered`);
        }

        if (serviceInstance.initialized) {
            return; // Already initialized
        }

        // Check for circular dependencies
        if (this.hasCircularDependency(name)) {
            throw new Error(`Circular dependency detected for service ${name}`);
        }

        try {
            // Initialize dependencies first
            for (const dependency of serviceInstance.dependencies) {
                await this.initializeService(dependency);
            }

            console.log(`Initializing service ${name}...`);

            // Initialize the service
            if (typeof serviceInstance.service.initialize === 'function') {
                await serviceInstance.service.initialize();
            }

            serviceInstance.initialized = true;
            serviceInstance.initializationTime = new Date();

            console.log(`Service ${name} initialized successfully`);

        } catch (error) {
            console.error(`Failed to initialize service ${name}:`, error);
            throw error;
        }
    }

    /**
     * Shutdown all services
     */
    async shutdownAll(): Promise<void> {
        const shutdownOrder = this.getShutdownOrder();

        console.log(`Shutting down services in order: ${shutdownOrder.join(' -> ')}`);

        for (const serviceName of shutdownOrder) {
            await this.shutdownService(serviceName);
        }
    }

    /**
     * Shutdown a specific service
     */
    async shutdownService(name: string): Promise<void> {
        const serviceInstance = this.services.get(name);
        if (!serviceInstance) {
            return;
        }

        if (!serviceInstance.initialized) {
            return; // Not initialized
        }

        try {
            console.log(`Shutting down service ${name}...`);

            // Shutdown the service
            if (typeof serviceInstance.service.shutdown === 'function') {
                await serviceInstance.service.shutdown();
            }

            serviceInstance.initialized = false;

            console.log(`Service ${name} shut down successfully`);

        } catch (error) {
            console.error(`Failed to shutdown service ${name}:`, error);
            throw error;
        }
    }

    /**
     * Get dependency graph
     */
    getDependencyGraph(): Map<string, Set<string>> {
        return new Map(this.dependencyGraph);
    }

    /**
     * Detect circular dependencies
     */
    detectCircularDependencies(): { service: string; path: string[] }[] {
        const circularDependencies: { service: string; path: string[] }[] = [];

        for (const serviceName of this.services.keys()) {
            const path: string[] = [];
            if (this.hasCircularDependency(serviceName, new Set(), path)) {
                circularDependencies.push({ service: serviceName, path: [...path] });
            }
        }

        return circularDependencies;
    }

    /**
     * Get service health status
     */
    getServiceHealth(name: string): {
        service: string;
        registered: boolean;
        initialized: boolean;
        dependencies: string[];
        dependents: string[];
        initializationTime?: Date;
    } {
        const service = this.services.get(name);
        if (!service) {
            return {
                service: name,
                registered: false,
                initialized: false,
                dependencies: [],
                dependents: []
            };
        }

        return {
            service: name,
            registered: true,
            initialized: service.initialized,
            dependencies: service.dependencies,
            dependents: this.getDependents(name),
            initializationTime: service.initializationTime
        };
    }

    /**
     * Get all services health status
     */
    getAllServiceHealth(): Record<string, ReturnType<typeof this.getServiceHealth>> {
        const health: Record<string, ReturnType<typeof this.getServiceHealth>> = {};

        for (const serviceName of this.services.keys()) {
            health[serviceName] = this.getServiceHealth(serviceName);
        }

        return health;
    }

    private getDependents(serviceName: string): string[] {
        const dependents: string[] = [];

        for (const [name, dependencies] of this.dependencyGraph.entries()) {
            if (dependencies.has(serviceName)) {
                dependents.push(name);
            }
        }

        return dependents;
    }

    private getInitializationOrder(): string[] {
        const visited = new Set<string>();
        const visiting = new Set<string>();
        const order: string[] = [];

        const visit = (serviceName: string) => {
            if (visited.has(serviceName)) {
                return;
            }

            if (visiting.has(serviceName)) {
                throw new Error(`Circular dependency detected: ${serviceName}`);
            }

            visiting.add(serviceName);

            const dependencies = this.dependencyGraph.get(serviceName);
            if (dependencies) {
                for (const dependency of dependencies) {
                    visit(dependency);
                }
            }

            visiting.delete(serviceName);
            visited.add(serviceName);
            order.push(serviceName);
        };

        for (const serviceName of this.services.keys()) {
            visit(serviceName);
        }

        return order;
    }

    private getShutdownOrder(): string[] {
        // Reverse of initialization order
        return this.getInitializationOrder().reverse();
    }

    private hasCircularDependency(
        serviceName: string,
        visited: Set<string> = new Set(),
        path: string[] = []
    ): boolean {
        if (visited.has(serviceName)) {
            return true;
        }

        visited.add(serviceName);
        path.push(serviceName);

        const dependencies = this.dependencyGraph.get(serviceName);
        if (dependencies) {
            for (const dependency of dependencies) {
                if (this.hasCircularDependency(dependency, new Set(visited), [...path])) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Reset all services
     */
    reset(): void {
        for (const serviceName of this.services.keys()) {
            this.shutdownService(serviceName).catch(console.error);
        }

        this.services.clear();
        this.dependencyGraph.clear();
        this.initializationQueue.length = 0;
        this.circularDependencies.clear();

        console.log('ServiceRegistry reset complete');
    }

    /**
     * Get statistics
     */
    getStats(): {
        total: number;
        initialized: number;
        uninitialized: number;
        dependencies: Record<string, number>;
        circularDependencies: number;
    } {
        const dependencies: Record<string, number> = {};
        let totalDependencies = 0;

        for (const [name, deps] of this.dependencyGraph.entries()) {
            dependencies[name] = deps.size;
            totalDependencies += deps.size;
        }

        const circularDependencies = this.detectCircularDependencies().length;

        return {
            total: this.services.size,
            initialized: Array.from(this.services.values()).filter(s => s.initialized).length,
            uninitialized: Array.from(this.services.values()).filter(s => !s.initialized).length,
            dependencies,
            circularDependencies
        };
    }
}