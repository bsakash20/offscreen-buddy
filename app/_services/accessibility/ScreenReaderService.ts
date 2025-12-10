/**
 * Screen Reader Service - Optimized screen reader support
 * Comprehensive VoiceOver (iOS) and TalkBack (Android) integration
 */

import { AccessibilityInfo, Platform, findNodeHandle } from 'react-native';
import AccessibilityManager from './AccessibilityManager';

export interface ScreenReaderAnnouncement {
    message: string;
    priority: 'low' | 'normal' | 'high' | 'assertive';
    interrupt?: boolean;
    delay?: number;
    context?: string;
}

export interface FocusOptions {
    reactTag?: number;
    delay?: number;
    announcement?: string;
}

export interface AriaLiveRegion {
    id: string;
    politeness: 'off' | 'polite' | 'assertive';
    atomic: boolean;
    relevant: 'additions' | 'removals' | 'text' | 'all';
}

class ScreenReaderService {
    private static instance: ScreenReaderService;
    private enabled: boolean = false;
    private announcementQueue: ScreenReaderAnnouncement[] = [];
    private isProcessingQueue: boolean = false;
    private liveRegions: Map<string, AriaLiveRegion> = new Map();
    private focusHistory: number[] = [];

    private constructor() {
        this.initialize();
    }

    static getInstance(): ScreenReaderService {
        if (!ScreenReaderService.instance) {
            ScreenReaderService.instance = new ScreenReaderService();
        }
        return ScreenReaderService.instance;
    }

    /**
     * Initialize screen reader service
     */
    private async initialize(): Promise<void> {
        try {
            this.enabled = await AccessibilityInfo.isScreenReaderEnabled();

            // Listen for screen reader state changes
            AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) => {
                this.enabled = enabled;
                if (enabled) {
                    this.announce({
                        message: 'Screen reader enabled. OffScreen Buddy is ready for accessible navigation.',
                        priority: 'normal',
                    });
                }
            });
        } catch (error) {
            console.error('[ScreenReaderService] Initialization failed:', error);
        }
    }

    /**
     * Check if screen reader is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Announce message to screen reader
     */
    announce(announcement: ScreenReaderAnnouncement): void {
        if (!this.enabled) return;

        const { message, priority = 'normal', interrupt = false, delay = 0, context } = announcement;

        // Build full message with context
        let fullMessage = message;
        if (context) {
            fullMessage = `${context}. ${message}`;
        }

        if (interrupt || priority === 'assertive') {
            // Immediate announcement
            if (delay > 0) {
                setTimeout(() => {
                    AccessibilityInfo.announceForAccessibility(fullMessage);
                }, delay);
            } else {
                AccessibilityInfo.announceForAccessibility(fullMessage);
            }
        } else {
            // Queue announcement
            this.announcementQueue.push({ ...announcement, message: fullMessage });
            this.processQueue();
        }
    }

    /**
     * Process announcement queue
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessingQueue || this.announcementQueue.length === 0) return;

        this.isProcessingQueue = true;

        while (this.announcementQueue.length > 0) {
            const announcement = this.announcementQueue.shift();
            if (announcement) {
                AccessibilityInfo.announceForAccessibility(announcement.message);

                // Wait between announcements to avoid overlap
                await this.delay(announcement.delay || 500);
            }
        }

        this.isProcessingQueue = false;
    }

    /**
     * Announce error with appropriate formatting
     */
    announceError(message: string, severity: 'low' | 'medium' | 'high' | 'critical'): void {
        const severityText = {
            low: 'Notice',
            medium: 'Warning',
            high: 'Error',
            critical: 'Critical error',
        };

        this.announce({
            message: `${severityText[severity]}: ${message}`,
            priority: severity === 'critical' ? 'assertive' : 'high',
            interrupt: severity === 'critical',
        });
    }

    /**
     * Announce success message
     */
    announceSuccess(message: string): void {
        this.announce({
            message: `Success: ${message}`,
            priority: 'normal',
        });
    }

    /**
     * Announce timer state for focus sessions
     */
    announceTimerState(state: 'started' | 'paused' | 'resumed' | 'completed', timeRemaining?: string): void {
        const messages = {
            started: `Focus timer started${timeRemaining ? `. ${timeRemaining} remaining` : ''}`,
            paused: 'Focus timer paused',
            resumed: `Focus timer resumed${timeRemaining ? `. ${timeRemaining} remaining` : ''}`,
            completed: 'Focus session completed. Great work!',
        };

        this.announce({
            message: messages[state],
            priority: state === 'completed' ? 'high' : 'normal',
            interrupt: state === 'completed',
        });
    }

    /**
     * Announce navigation change
     */
    announceNavigation(screenName: string, description?: string): void {
        let message = `Navigated to ${screenName}`;
        if (description) {
            message += `. ${description}`;
        }

        this.announce({
            message,
            priority: 'normal',
            delay: 300, // Allow screen transition to complete
        });
    }

    /**
     * Set accessibility focus to element
     */
    setFocus(options: FocusOptions): void {
        if (!this.enabled) return;

        const { reactTag, delay = 0, announcement } = options;

        const setFocusAction = () => {
            if (reactTag) {
                AccessibilityInfo.setAccessibilityFocus(reactTag);
                this.focusHistory.push(reactTag);

                if (announcement) {
                    this.announce({
                        message: announcement,
                        priority: 'normal',
                        delay: 100,
                    });
                }
            }
        };

        if (delay > 0) {
            setTimeout(setFocusAction, delay);
        } else {
            setFocusAction();
        }
    }

    /**
     * Move focus to previous element
     */
    moveFocusToPrevious(): void {
        if (this.focusHistory.length > 1) {
            this.focusHistory.pop(); // Remove current
            const previousTag = this.focusHistory[this.focusHistory.length - 1];
            AccessibilityInfo.setAccessibilityFocus(previousTag);
        }
    }

    /**
     * Register ARIA live region
     */
    registerLiveRegion(region: AriaLiveRegion): void {
        this.liveRegions.set(region.id, region);
    }

    /**
     * Unregister ARIA live region
     */
    unregisterLiveRegion(id: string): void {
        this.liveRegions.delete(id);
    }

    /**
     * Update live region content
     */
    updateLiveRegion(id: string, content: string): void {
        const region = this.liveRegions.get(id);
        if (!region) return;

        const priority = region.politeness === 'assertive' ? 'assertive' : 'normal';

        this.announce({
            message: content,
            priority,
            interrupt: region.politeness === 'assertive',
        });
    }

    /**
     * Create accessible label for timer display
     */
    getTimerAccessibilityLabel(minutes: number, seconds: number): string {
        const minuteText = minutes === 1 ? 'minute' : 'minutes';
        const secondText = seconds === 1 ? 'second' : 'seconds';

        if (minutes > 0 && seconds > 0) {
            return `${minutes} ${minuteText} and ${seconds} ${secondText} remaining`;
        } else if (minutes > 0) {
            return `${minutes} ${minuteText} remaining`;
        } else {
            return `${seconds} ${secondText} remaining`;
        }
    }

    /**
     * Create accessible label for button with state
     */
    getButtonAccessibilityLabel(label: string, state?: 'active' | 'disabled' | 'selected'): string {
        if (!state) return label;

        const stateText = {
            active: 'active',
            disabled: 'disabled',
            selected: 'selected',
        };

        return `${label}, ${stateText[state]}`;
    }

    /**
     * Create accessible hint for action
     */
    getAccessibilityHint(action: string, context?: string): string {
        let hint = `Double tap to ${action}`;
        if (context) {
            hint += `. ${context}`;
        }
        return hint;
    }

    /**
     * Announce form validation errors
     */
    announceFormErrors(errors: { field: string; message: string }[]): void {
        if (errors.length === 0) return;

        if (errors.length === 1) {
            this.announceError(`${errors[0].field}: ${errors[0].message}`, 'high');
        } else {
            const errorCount = errors.length;
            const firstError = errors[0];
            this.announceError(
                `${errorCount} validation errors. First error: ${firstError.field}: ${firstError.message}`,
                'high'
            );
        }
    }

    /**
     * Announce loading state
     */
    announceLoading(isLoading: boolean, context?: string): void {
        if (isLoading) {
            this.announce({
                message: context ? `Loading ${context}` : 'Loading',
                priority: 'normal',
            });
        } else {
            this.announce({
                message: context ? `${context} loaded` : 'Content loaded',
                priority: 'normal',
            });
        }
    }

    /**
     * Announce progress update
     */
    announceProgress(current: number, total: number, unit: string = 'items'): void {
        const percentage = Math.round((current / total) * 100);
        this.announce({
            message: `Progress: ${current} of ${total} ${unit}, ${percentage} percent complete`,
            priority: 'low',
        });
    }

    /**
     * Get semantic role description
     */
    getRoleDescription(role: string): string {
        const descriptions: Record<string, string> = {
            button: 'Button',
            link: 'Link',
            header: 'Heading',
            search: 'Search field',
            menu: 'Menu',
            menuitem: 'Menu item',
            tab: 'Tab',
            tablist: 'Tab list',
            timer: 'Timer',
            alert: 'Alert',
            dialog: 'Dialog',
            navigation: 'Navigation',
            main: 'Main content',
            complementary: 'Complementary content',
            contentinfo: 'Content information',
        };

        return descriptions[role] || role;
    }

    /**
     * Create accessible list announcement
     */
    getListAccessibilityLabel(itemIndex: number, totalItems: number, itemLabel: string): string {
        return `${itemLabel}, item ${itemIndex + 1} of ${totalItems}`;
    }

    /**
     * Announce modal state
     */
    announceModal(isOpen: boolean, title?: string): void {
        if (isOpen) {
            this.announce({
                message: title ? `${title} dialog opened` : 'Dialog opened',
                priority: 'high',
                delay: 300,
            });
        } else {
            this.announce({
                message: 'Dialog closed',
                priority: 'normal',
            });
        }
    }

    /**
     * Clear announcement queue
     */
    clearQueue(): void {
        this.announcementQueue = [];
    }

    /**
     * Utility delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get platform-specific accessibility traits
     */
    getAccessibilityTraits(traits: string[]): string[] {
        if (Platform.OS === 'ios') {
            return traits;
        } else {
            // Map iOS traits to Android equivalents
            return traits.map(trait => {
                const mapping: Record<string, string> = {
                    button: 'button',
                    link: 'link',
                    header: 'header',
                    search: 'search',
                    image: 'image',
                    selected: 'selected',
                    disabled: 'disabled',
                    adjustable: 'adjustable',
                };
                return mapping[trait] || trait;
            });
        }
    }

    /**
     * Check if element should be accessible
     */
    shouldBeAccessible(element: { disabled?: boolean; hidden?: boolean }): boolean {
        return !element.disabled && !element.hidden;
    }
}

export default ScreenReaderService.getInstance();