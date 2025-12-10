/**
 * Voice Control Service - Voice command integration
 * Siri Shortcuts, Google Assistant, and custom voice commands
 */

import { Platform, NativeModules } from 'react-native';
import AccessibilityManager from './AccessibilityManager';
import ScreenReaderService from './ScreenReaderService';

export interface VoiceCommand {
    id: string;
    phrase: string[];
    action: string;
    parameters?: Record<string, any>;
    confirmation?: boolean;
    requiresAuth?: boolean;
}

export interface VoiceCommandResult {
    success: boolean;
    command?: VoiceCommand;
    message?: string;
    error?: string;
}

export type TimerAction = 'start' | 'pause' | 'resume' | 'stop' | 'reset' | 'extend';
export type NavigationAction = 'home' | 'settings' | 'stats' | 'back';

class VoiceControlService {
    private static instance: VoiceControlService;
    private enabled: boolean = false;
    private commands: Map<string, VoiceCommand> = new Map();
    private commandHistory: VoiceCommandResult[] = [];
    private listeners: Map<string, Function[]> = new Map();

    private constructor() {
        this.registerDefaultCommands();
    }

    static getInstance(): VoiceControlService {
        if (!VoiceControlService.instance) {
            VoiceControlService.instance = new VoiceControlService();
        }
        return VoiceControlService.instance;
    }

    /**
     * Initialize voice control service
     */
    async initialize(): Promise<void> {
        try {
            const preferences = AccessibilityManager.getPreferences();
            this.enabled = preferences.voiceControl;

            if (this.enabled) {
                await this.setupVoiceCommands();
                ScreenReaderService.announce({
                    message: 'Voice control enabled. Say "Help" for available commands.',
                    priority: 'normal',
                });
            }
        } catch (error) {
            console.error('[VoiceControlService] Initialization failed:', error);
        }
    }

    /**
     * Register default voice commands
     */
    private registerDefaultCommands(): void {
        // Timer commands
        this.registerCommand({
            id: 'timer_start',
            phrase: ['start timer', 'begin focus', 'start focus session', 'start pomodoro'],
            action: 'timer.start',
            confirmation: true,
        });

        this.registerCommand({
            id: 'timer_pause',
            phrase: ['pause timer', 'pause focus', 'stop timer temporarily'],
            action: 'timer.pause',
            confirmation: true,
        });

        this.registerCommand({
            id: 'timer_resume',
            phrase: ['resume timer', 'continue focus', 'resume focus session'],
            action: 'timer.resume',
            confirmation: true,
        });

        this.registerCommand({
            id: 'timer_stop',
            phrase: ['stop timer', 'end focus', 'cancel timer', 'quit session'],
            action: 'timer.stop',
            confirmation: true,
        });

        this.registerCommand({
            id: 'timer_reset',
            phrase: ['reset timer', 'restart timer', 'start over'],
            action: 'timer.reset',
            confirmation: true,
        });

        this.registerCommand({
            id: 'timer_extend',
            phrase: ['extend timer', 'add time', 'more time'],
            action: 'timer.extend',
            parameters: { minutes: 5 },
            confirmation: true,
        });

        // Navigation commands
        this.registerCommand({
            id: 'nav_home',
            phrase: ['go home', 'home screen', 'main screen'],
            action: 'navigation.home',
        });

        this.registerCommand({
            id: 'nav_settings',
            phrase: ['open settings', 'settings', 'preferences'],
            action: 'navigation.settings',
        });

        this.registerCommand({
            id: 'nav_stats',
            phrase: ['show stats', 'statistics', 'my progress', 'view stats'],
            action: 'navigation.stats',
        });

        this.registerCommand({
            id: 'nav_back',
            phrase: ['go back', 'back', 'previous screen'],
            action: 'navigation.back',
        });

        // Information commands
        this.registerCommand({
            id: 'info_time',
            phrase: ['time remaining', 'how much time', 'time left', 'check time'],
            action: 'info.timeRemaining',
        });

        this.registerCommand({
            id: 'info_status',
            phrase: ['timer status', 'what is my status', 'current status'],
            action: 'info.status',
        });

        this.registerCommand({
            id: 'info_help',
            phrase: ['help', 'what can I say', 'voice commands', 'available commands'],
            action: 'info.help',
        });

        // Accessibility commands
        this.registerCommand({
            id: 'accessibility_read',
            phrase: ['read screen', 'what is on screen', 'describe screen'],
            action: 'accessibility.readScreen',
        });

        this.registerCommand({
            id: 'accessibility_repeat',
            phrase: ['repeat', 'say again', 'repeat last'],
            action: 'accessibility.repeat',
        });
    }

    /**
     * Register a voice command
     */
    registerCommand(command: VoiceCommand): void {
        this.commands.set(command.id, command);
    }

    /**
     * Unregister a voice command
     */
    unregisterCommand(id: string): void {
        this.commands.delete(id);
    }

    /**
     * Process voice input
     */
    async processVoiceInput(input: string): Promise<VoiceCommandResult> {
        if (!this.enabled) {
            return {
                success: false,
                error: 'Voice control is not enabled',
            };
        }

        const normalizedInput = input.toLowerCase().trim();

        // Find matching command
        for (const [id, command] of this.commands) {
            const match = command.phrase.some(phrase =>
                normalizedInput.includes(phrase.toLowerCase())
            );

            if (match) {
                const result = await this.executeCommand(command);
                this.commandHistory.push(result);
                return result;
            }
        }

        // No command matched
        return {
            success: false,
            error: 'Command not recognized. Say "Help" for available commands.',
        };
    }

    /**
     * Execute a voice command
     */
    private async executeCommand(command: VoiceCommand): Promise<VoiceCommandResult> {
        try {
            // Check authentication if required
            if (command.requiresAuth) {
                // Authentication check would go here
            }

            // Announce confirmation if required
            if (command.confirmation) {
                ScreenReaderService.announce({
                    message: `Executing command: ${command.phrase[0]}`,
                    priority: 'normal',
                });
            }

            // Emit command event
            this.emit('commandExecuted', { command });

            return {
                success: true,
                command,
                message: `Command "${command.phrase[0]}" executed successfully`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return {
                success: false,
                command,
                error: errorMessage,
            };
        }
    }

    /**
     * Get available commands
     */
    getAvailableCommands(): VoiceCommand[] {
        return Array.from(this.commands.values());
    }

    /**
     * Get commands by category
     */
    getCommandsByCategory(category: string): VoiceCommand[] {
        return Array.from(this.commands.values()).filter(cmd =>
            cmd.action.startsWith(category)
        );
    }

    /**
     * Announce available commands
     */
    announceAvailableCommands(): void {
        const categories = {
            timer: 'Timer commands',
            navigation: 'Navigation commands',
            info: 'Information commands',
            accessibility: 'Accessibility commands',
        };

        let announcement = 'Available voice commands: ';

        for (const [category, label] of Object.entries(categories)) {
            const commands = this.getCommandsByCategory(category);
            if (commands.length > 0) {
                const examples = commands.slice(0, 2).map(cmd => cmd.phrase[0]).join(', ');
                announcement += `${label}: ${examples}. `;
            }
        }

        ScreenReaderService.announce({
            message: announcement,
            priority: 'high',
        });
    }

    /**
     * Setup platform-specific voice commands
     */
    private async setupVoiceCommands(): Promise<void> {
        if (Platform.OS === 'ios') {
            await this.setupSiriShortcuts();
        } else if (Platform.OS === 'android') {
            await this.setupGoogleAssistant();
        }
    }

    /**
     * Setup Siri Shortcuts (iOS)
     */
    private async setupSiriShortcuts(): Promise<void> {
        try {
            // This would integrate with native Siri Shortcuts API
            // For now, this is a placeholder for the integration point
            console.log('[VoiceControlService] Siri Shortcuts setup initiated');

            // Example shortcuts that would be created:
            const shortcuts = [
                {
                    phrase: 'Start Focus Session',
                    action: 'timer.start',
                },
                {
                    phrase: 'Check Timer',
                    action: 'info.timeRemaining',
                },
                {
                    phrase: 'Pause Focus',
                    action: 'timer.pause',
                },
            ];

            // Native module integration would happen here
        } catch (error) {
            console.error('[VoiceControlService] Siri Shortcuts setup failed:', error);
        }
    }

    /**
     * Setup Google Assistant (Android)
     */
    private async setupGoogleAssistant(): Promise<void> {
        try {
            // This would integrate with Google Assistant Actions
            console.log('[VoiceControlService] Google Assistant setup initiated');

            // Native module integration would happen here
        } catch (error) {
            console.error('[VoiceControlService] Google Assistant setup failed:', error);
        }
    }

    /**
     * Enable voice control
     */
    async enable(): Promise<void> {
        this.enabled = true;
        await AccessibilityManager.updatePreferences({ voiceControl: true });
        await this.setupVoiceCommands();

        ScreenReaderService.announce({
            message: 'Voice control enabled',
            priority: 'normal',
        });
    }

    /**
     * Disable voice control
     */
    async disable(): Promise<void> {
        this.enabled = false;
        await AccessibilityManager.updatePreferences({ voiceControl: false });

        ScreenReaderService.announce({
            message: 'Voice control disabled',
            priority: 'normal',
        });
    }

    /**
     * Check if voice control is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get command history
     */
    getCommandHistory(limit: number = 10): VoiceCommandResult[] {
        return this.commandHistory.slice(-limit);
    }

    /**
     * Clear command history
     */
    clearHistory(): void {
        this.commandHistory = [];
    }

    /**
     * Create voice command for timer action
     */
    createTimerCommand(action: TimerAction, duration?: number): VoiceCommand {
        const commands: Record<TimerAction, Partial<VoiceCommand>> = {
            start: {
                id: 'custom_timer_start',
                phrase: duration
                    ? [`start ${duration} minute timer`, `begin ${duration} minute focus`]
                    : ['start timer', 'begin focus'],
                action: 'timer.start',
                parameters: duration ? { duration } : undefined,
            },
            pause: {
                id: 'custom_timer_pause',
                phrase: ['pause timer'],
                action: 'timer.pause',
            },
            resume: {
                id: 'custom_timer_resume',
                phrase: ['resume timer'],
                action: 'timer.resume',
            },
            stop: {
                id: 'custom_timer_stop',
                phrase: ['stop timer'],
                action: 'timer.stop',
            },
            reset: {
                id: 'custom_timer_reset',
                phrase: ['reset timer'],
                action: 'timer.reset',
            },
            extend: {
                id: 'custom_timer_extend',
                phrase: ['extend timer'],
                action: 'timer.extend',
            },
        };

        return {
            ...commands[action],
            confirmation: true,
        } as VoiceCommand;
    }

    /**
     * Event system
     */
    on(event: string, callback: Function): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    off(event: string, callback: Function): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    private emit(event: string, data?: any): void {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    /**
     * Get voice command suggestions based on context
     */
    getContextualSuggestions(context: 'timer' | 'navigation' | 'settings'): string[] {
        const suggestions: Record<string, string[]> = {
            timer: [
                'Start timer',
                'Pause timer',
                'Check time remaining',
                'Extend timer by 5 minutes',
            ],
            navigation: [
                'Go home',
                'Open settings',
                'Show statistics',
                'Go back',
            ],
            settings: [
                'Enable high contrast',
                'Increase text size',
                'Turn on haptic feedback',
                'Enable simplified mode',
            ],
        };

        return suggestions[context] || [];
    }

    /**
     * Test voice command without executing
     */
    testCommand(input: string): VoiceCommand | null {
        const normalizedInput = input.toLowerCase().trim();

        for (const [id, command] of this.commands) {
            const match = command.phrase.some(phrase =>
                normalizedInput.includes(phrase.toLowerCase())
            );

            if (match) {
                return command;
            }
        }

        return null;
    }
}

export default VoiceControlService.getInstance();