/**
 * Event Bus - Simple event system for module communication
 * Handles pub/sub patterns for inter-module communication
 */

export class EventBus {
    private handlers: Map<string, Function[]> = new Map();
    private debug: boolean = false;

    constructor(debug: boolean = false) {
        this.debug = debug;
    }

    publish(event: string, data?: any): void {
        if (this.debug) {
            console.log(`[EventBus] Publishing event: ${event}`, data);
        }

        const eventHandlers = this.handlers.get(event);
        if (!eventHandlers) {
            if (this.debug) {
                console.log(`[EventBus] No handlers found for event: ${event}`);
            }
            return;
        }

        // Create a copy to avoid issues if handlers modify the handlers array
        const handlers = [...eventHandlers];

        for (const handler of handlers) {
            try {
                handler(data);
            } catch (error) {
                console.error(`[EventBus] Error in event handler for ${event}:`, error);
            }
        }
    }

    subscribe(event: string, handler: Function): () => void {
        if (this.debug) {
            console.log(`[EventBus] Subscribing to event: ${event}`);
        }

        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }

        const handlers = this.handlers.get(event)!;
        handlers.push(handler);

        // Return unsubscribe function
        return () => {
            this.unsubscribe(event, handler);
        };
    }

    unsubscribe(event: string, handler: Function): void {
        const handlers = this.handlers.get(event);
        if (!handlers) {
            return;
        }

        const index = handlers.indexOf(handler);
        if (index > -1) {
            handlers.splice(index, 1);

            if (handlers.length === 0) {
                this.handlers.delete(event);
            }
        }
    }

    emit(event: string, data?: any): void {
        // Alias for publish
        this.publish(event, data);
    }

    // Check if there are handlers for an event
    hasHandlers(event: string): boolean {
        const handlers = this.handlers.get(event);
        return handlers ? handlers.length > 0 : false;
    }

    // Get all registered events
    getRegisteredEvents(): string[] {
        return Array.from(this.handlers.keys());
    }

    // Remove all handlers for an event
    clearEvent(event: string): void {
        this.handlers.delete(event);
    }

    // Remove all handlers
    clearAll(): void {
        this.handlers.clear();
    }

    // Debug method to inspect handlers
    debugHandlers(): void {
        console.log('[EventBus] Registered events:', this.getRegisteredEvents());
        for (const [event, handlers] of this.handlers.entries()) {
            console.log(`[EventBus] ${event}: ${handlers.length} handler(s)`);
        }
    }
}