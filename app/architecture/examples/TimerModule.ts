/**
 * Example Module: Timer Module
 * Demonstrates how to create a functional module for the OffScreen Buddy app
 */

import { ModuleDefinition, ModuleContext } from '../../modules/ModuleTypes';

// Timer Module Definition
export const timerModule: ModuleDefinition = {
    metadata: {
        id: 'timer-core',
        name: 'Core Timer Module',
        version: '1.0.0',
        description: 'Core timer functionality for OffScreen Buddy',
        category: 'core',
        dependencies: ['eventbus-core', 'storage-core', 'notification-core'],
        provides: ['timer', 'timer-ui', 'timer-settings'],
        loadOrder: 1,
        enabled: true,
        isolated: false,
        permissions: ['notifications', 'storage', 'background-processing'],
        config: {
            schema: {
                type: 'object',
                properties: {
                    defaultDuration: { type: 'number', minimum: 1, maximum: 1440, default: 25 },
                    soundEnabled: { type: 'boolean', default: true },
                    vibrationEnabled: { type: 'boolean', default: true },
                    autoBreak: { type: 'boolean', default: false }
                }
            },
            environment: {},
            featureFlags: ['smart-timer', 'voice-commands', 'advanced-analytics']
        }
    },

    implementation: {
        init: async (context: ModuleContext) => {
            // Create timer state
            let isRunning = false;
            let currentDuration = 25;
            let timeLeft = 0;
            let intervalId: number | undefined;

            // Timer service implementation
            const timerService = {
                start: (duration?: number) => {
                    const targetDuration = duration || context.configManager.get('timer.defaultDuration', 25);

                    if (isRunning) {
                        throw new Error('Timer is already running');
                    }

                    currentDuration = targetDuration;
                    timeLeft = targetDuration * 60; // Convert to seconds
                    isRunning = true;

                    // Start countdown
                    intervalId = setInterval(() => {
                        timeLeft--;

                        // Emit tick event
                        context.eventBus.publish('timer.tick', {
                            timeLeft,
                            duration: currentDuration,
                            progress: (1 - timeLeft / (currentDuration * 60)) * 100
                        });

                        // Check if timer completed
                        if (timeLeft <= 0) {
                            timerService.stop();
                            context.eventBus.publish('timer.completed', {
                                originalDuration: currentDuration,
                                timestamp: new Date()
                            });

                            // Send notification
                            if (context.configManager.get('timer.soundEnabled', true)) {
                                // Play completion sound
                                console.log('Playing completion sound');
                            }
                        }
                    }, 1000);

                    context.eventBus.publish('timer.started', {
                        duration: currentDuration,
                        timestamp: new Date()
                    });

                    return { success: true, duration: currentDuration };
                },

                stop: () => {
                    if (!isRunning) {
                        return { success: false, message: 'Timer is not running' };
                    }

                    isRunning = false;

                    if (intervalId) {
                        clearInterval(intervalId);
                        intervalId = undefined;
                    }

                    context.eventBus.publish('timer.stopped', {
                        timeLeft,
                        originalDuration: currentDuration,
                        timestamp: new Date()
                    });

                    return { success: true, timeLeft };
                },

                getState: () => ({
                    isRunning,
                    timeLeft,
                    duration: currentDuration,
                    progress: isRunning ? (1 - timeLeft / (currentDuration * 60)) * 100 : 0
                })
            };

            // Register services
            context.serviceRegistry.register('timer', timerService, ['eventbus-core']);

            return {
                id: 'timer-core',
                name: 'Core Timer Module',
                version: '1.0.0',
                description: 'Core timer functionality for OffScreen Buddy',
                category: 'core',
                dependencies: ['eventbus-core', 'storage-core', 'notification-core'],
                provides: ['timer', 'timer-ui', 'timer-settings'],
                loadOrder: 1,
                enabled: true,
                isolated: false,
                permissions: ['notifications', 'storage', 'background-processing'],
                config: {
                    schema: {
                        type: 'object',
                        properties: {
                            defaultDuration: { type: 'number', minimum: 1, maximum: 1440, default: 25 },
                            soundEnabled: { type: 'boolean', default: true },
                            vibrationEnabled: { type: 'boolean', default: true },
                            autoBreak: { type: 'boolean', default: false }
                        }
                    },
                    environment: {},
                    featureFlags: ['smart-timer', 'voice-commands', 'advanced-analytics']
                },
                lifecycle: {
                    initialize: async () => {
                        console.log('Timer module initialized');
                    },
                    start: async () => { },
                    stop: async () => { },
                    destroy: async () => { }
                }
            };
        }
    }
};
