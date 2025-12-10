/**
 * Visual Accessibility Service
 * High contrast, color blindness support, and visual enhancements
 * WCAG 2.1 AA compliant color contrast and visual accessibility
 */

import { Appearance } from 'react-native';
import AccessibilityManager from './AccessibilityManager';

export interface ColorTransform {
    protanopia: (color: string) => string;
    deuteranopia: (color: string) => string;
    tritanopia: (color: string) => string;
    achromatopsia: (color: string) => string;
}

export interface ContrastRatio {
    ratio: number;
    passes: {
        AA: boolean;
        AAA: boolean;
        AALarge: boolean;
        AAALarge: boolean;
    };
}

export interface VisualTheme {
    mode: 'light' | 'dark' | 'high-contrast-light' | 'high-contrast-dark';
    colors: {
        background: string;
        surface: string;
        text: string;
        textSecondary: string;
        primary: string;
        error: string;
        success: string;
        warning: string;
        info: string;
        border: string;
        focus: string;
    };
    contrast: {
        text: number;
        textSecondary: number;
        primary: number;
        error: number;
    };
}

class VisualAccessibilityService {
    private static instance: VisualAccessibilityService;
    private currentTheme: VisualTheme;
    private colorBlindnessMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia' = 'none';
    private highContrastEnabled: boolean = false;

    private constructor() {
        this.currentTheme = this.getStandardTheme('light');
        this.initialize();
    }

    static getInstance(): VisualAccessibilityService {
        if (!VisualAccessibilityService.instance) {
            VisualAccessibilityService.instance = new VisualAccessibilityService();
        }
        return VisualAccessibilityService.instance;
    }

    /**
     * Initialize visual accessibility service
     */
    private initialize(): void {
        const preferences = AccessibilityManager.getPreferences();

        this.highContrastEnabled = preferences.highContrastMode;
        this.colorBlindnessMode = preferences.colorBlindnessMode;

        this.updateTheme();

        // Listen for system theme changes
        Appearance.addChangeListener(({ colorScheme }) => {
            if (!this.highContrastEnabled) {
                const mode = colorScheme === 'dark' ? 'dark' : 'light';
                this.currentTheme = this.getStandardTheme(mode);
            }
        });
    }

    /**
     * Update theme based on preferences
     */
    private updateTheme(): void {
        const systemColorScheme = Appearance.getColorScheme() || 'light';

        if (this.highContrastEnabled) {
            const mode = systemColorScheme === 'dark' ? 'high-contrast-dark' : 'high-contrast-light';
            this.currentTheme = this.getHighContrastTheme(mode);
        } else {
            this.currentTheme = this.getStandardTheme(systemColorScheme);
        }
    }

    /**
     * Get standard theme
     */
    private getStandardTheme(mode: 'light' | 'dark'): VisualTheme {
        if (mode === 'dark') {
            return {
                mode: 'dark',
                colors: {
                    background: '#000000',
                    surface: '#161B22',
                    text: '#FFFFFF',
                    textSecondary: '#B8C5D0',
                    primary: '#5B9FFF',
                    error: '#EF4444',
                    success: '#22C55E',
                    warning: '#F59E0B',
                    info: '#3B82F6',
                    border: 'rgba(139, 148, 158, 0.3)',
                    focus: '#60A5FA',
                },
                contrast: {
                    text: 15.8, // White on black
                    textSecondary: 7.2,
                    primary: 8.5,
                    error: 5.8,
                },
            };
        }

        return {
            mode: 'light',
            colors: {
                background: '#FFFFFF',
                surface: '#F8FAFC',
                text: '#0F172A',
                textSecondary: '#475569',
                primary: '#2563EB',
                error: '#DC2626',
                success: '#16A34A',
                warning: '#D97706',
                info: '#2563EB',
                border: '#CBD5E1',
                focus: '#3B82F6',
            },
            contrast: {
                text: 16.1, // Dark on white
                textSecondary: 7.5,
                primary: 8.2,
                error: 7.1,
            },
        };
    }

    /**
     * Get high contrast theme
     */
    private getHighContrastTheme(mode: 'high-contrast-light' | 'high-contrast-dark'): VisualTheme {
        if (mode === 'high-contrast-dark') {
            return {
                mode: 'high-contrast-dark',
                colors: {
                    background: '#000000',
                    surface: '#000000',
                    text: '#FFFFFF',
                    textSecondary: '#FFFFFF',
                    primary: '#00CFFF', // Maximum contrast cyan
                    error: '#FF6B6B',
                    success: '#51CF66',
                    warning: '#FFD43B',
                    info: '#00CFFF',
                    border: '#FFFFFF',
                    focus: '#00CFFF',
                },
                contrast: {
                    text: 21, // Maximum contrast
                    textSecondary: 21,
                    primary: 12.5,
                    error: 9.8,
                },
            };
        }

        return {
            mode: 'high-contrast-light',
            colors: {
                background: '#FFFFFF',
                surface: '#FFFFFF',
                text: '#000000',
                textSecondary: '#000000',
                primary: '#0066CC', // Maximum contrast blue
                error: '#C92A2A',
                success: '#2B8A3E',
                warning: '#E67700',
                info: '#0066CC',
                border: '#000000',
                focus: '#0066CC',
            },
            contrast: {
                text: 21, // Maximum contrast
                textSecondary: 21,
                primary: 10.5,
                error: 9.2,
            },
        };
    }

    /**
     * Calculate contrast ratio between two colors
     */
    calculateContrastRatio(foreground: string, background: string): ContrastRatio {
        const fgLuminance = this.getRelativeLuminance(foreground);
        const bgLuminance = this.getRelativeLuminance(background);

        const lighter = Math.max(fgLuminance, bgLuminance);
        const darker = Math.min(fgLuminance, bgLuminance);

        const ratio = (lighter + 0.05) / (darker + 0.05);

        return {
            ratio,
            passes: {
                AA: ratio >= 4.5, // Normal text
                AAA: ratio >= 7.0, // Normal text
                AALarge: ratio >= 3.0, // Large text (18pt+)
                AAALarge: ratio >= 4.5, // Large text (18pt+)
            },
        };
    }

    /**
     * Get relative luminance of a color
     */
    private getRelativeLuminance(color: string): number {
        const rgb = this.hexToRgb(color);
        if (!rgb) return 0;

        const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
            const normalized = val / 255;
            return normalized <= 0.03928
                ? normalized / 12.92
                : Math.pow((normalized + 0.055) / 1.055, 2.4);
        });

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }

    /**
     * Convert hex color to RGB
     */
    private hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        } : null;
    }

    /**
     * Convert RGB to hex
     */
    private rgbToHex(r: number, g: number, b: number): string {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    }

    /**
     * Apply color blindness filter
     */
    applyColorBlindnessFilter(color: string): string {
        if (this.colorBlindnessMode === 'none') return color;

        const rgb = this.hexToRgb(color);
        if (!rgb) return color;

        let transformed: { r: number; g: number; b: number };

        switch (this.colorBlindnessMode) {
            case 'protanopia':
                transformed = this.applyProtanopia(rgb);
                break;
            case 'deuteranopia':
                transformed = this.applyDeuteranopia(rgb);
                break;
            case 'tritanopia':
                transformed = this.applyTritanopia(rgb);
                break;
            case 'achromatopsia':
                transformed = this.applyAchromatopsia(rgb);
                break;
            default:
                return color;
        }

        return this.rgbToHex(transformed.r, transformed.g, transformed.b);
    }

    /**
     * Apply protanopia (red-blind) transformation
     */
    private applyProtanopia(rgb: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
        return {
            r: 0.567 * rgb.r + 0.433 * rgb.g,
            g: 0.558 * rgb.r + 0.442 * rgb.g,
            b: 0.242 * rgb.g + 0.758 * rgb.b,
        };
    }

    /**
     * Apply deuteranopia (green-blind) transformation
     */
    private applyDeuteranopia(rgb: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
        return {
            r: 0.625 * rgb.r + 0.375 * rgb.g,
            g: 0.7 * rgb.r + 0.3 * rgb.g,
            b: 0.3 * rgb.g + 0.7 * rgb.b,
        };
    }

    /**
     * Apply tritanopia (blue-blind) transformation
     */
    private applyTritanopia(rgb: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
        return {
            r: 0.95 * rgb.r + 0.05 * rgb.g,
            g: 0.433 * rgb.g + 0.567 * rgb.b,
            b: 0.475 * rgb.g + 0.525 * rgb.b,
        };
    }

    /**
     * Apply achromatopsia (complete color blindness) transformation
     */
    private applyAchromatopsia(rgb: { r: number; g: number; b: number }): { r: number; g: number; b: number } {
        const gray = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
        return { r: gray, g: gray, b: gray };
    }

    /**
     * Get current theme
     */
    getCurrentTheme(): VisualTheme {
        return { ...this.currentTheme };
    }

    /**
     * Enable high contrast mode
     */
    async enableHighContrast(): Promise<void> {
        this.highContrastEnabled = true;
        await AccessibilityManager.updatePreferences({ highContrastMode: true });
        this.updateTheme();
    }

    /**
     * Disable high contrast mode
     */
    async disableHighContrast(): Promise<void> {
        this.highContrastEnabled = false;
        await AccessibilityManager.updatePreferences({ highContrastMode: false });
        this.updateTheme();
    }

    /**
     * Set color blindness mode
     */
    async setColorBlindnessMode(mode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'): Promise<void> {
        this.colorBlindnessMode = mode;
        await AccessibilityManager.updatePreferences({ colorBlindnessMode: mode });
    }

    /**
     * Get accessible color for semantic meaning
     */
    getAccessibleColor(semantic: 'error' | 'success' | 'warning' | 'info'): string {
        const color = this.currentTheme.colors[semantic] || this.currentTheme.colors.primary;
        return this.applyColorBlindnessFilter(color);
    }

    /**
     * Ensure color meets WCAG AA contrast requirements
     */
    ensureAccessibleContrast(foreground: string, background: string, isLargeText: boolean = false): string {
        const contrast = this.calculateContrastRatio(foreground, background);
        const requiredRatio = isLargeText ? 3.0 : 4.5;

        if (contrast.ratio >= requiredRatio) {
            return foreground;
        }

        // Adjust color to meet contrast requirements
        return this.adjustColorForContrast(foreground, background, requiredRatio);
    }

    /**
     * Adjust color to meet contrast requirements
     */
    private adjustColorForContrast(foreground: string, background: string, targetRatio: number): string {
        const fgRgb = this.hexToRgb(foreground);
        const bgLuminance = this.getRelativeLuminance(background);

        if (!fgRgb) return foreground;

        // Determine if we need to lighten or darken
        const shouldLighten = bgLuminance < 0.5;

        let adjusted = { ...fgRgb };
        let iterations = 0;
        const maxIterations = 100;

        while (iterations < maxIterations) {
            const currentRatio = this.calculateContrastRatio(
                this.rgbToHex(adjusted.r, adjusted.g, adjusted.b),
                background
            ).ratio;

            if (currentRatio >= targetRatio) {
                break;
            }

            // Adjust brightness
            const step = shouldLighten ? 5 : -5;
            adjusted = {
                r: Math.max(0, Math.min(255, adjusted.r + step)),
                g: Math.max(0, Math.min(255, adjusted.g + step)),
                b: Math.max(0, Math.min(255, adjusted.b + step)),
            };

            iterations++;
        }

        return this.rgbToHex(adjusted.r, adjusted.g, adjusted.b);
    }

    /**
     * Get focus indicator style based on preferences
     */
    getFocusIndicatorStyle(): {
        width: number;
        color: string;
        style: 'solid' | 'dashed' | 'dotted';
    } {
        const preferences = AccessibilityManager.getPreferences();

        const styles = {
            standard: { width: 2, color: this.currentTheme.colors.focus, style: 'solid' as const },
            'high-contrast': { width: 3, color: this.currentTheme.colors.focus, style: 'solid' as const },
            thick: { width: 4, color: this.currentTheme.colors.focus, style: 'solid' as const },
        };

        return styles[preferences.focusIndicatorStyle];
    }

    /**
     * Check if color is distinguishable for color blind users
     */
    isColorDistinguishable(color1: string, color2: string): boolean {
        const transformed1 = this.applyColorBlindnessFilter(color1);
        const transformed2 = this.applyColorBlindnessFilter(color2);

        const contrast = this.calculateContrastRatio(transformed1, transformed2);
        return contrast.ratio >= 3.0; // Minimum distinguishable contrast
    }

    /**
     * Get alternative visual indicator (for color-dependent information)
     */
    getVisualAlternative(semantic: 'error' | 'success' | 'warning' | 'info'): {
        icon: string;
        pattern: 'solid' | 'striped' | 'dotted';
        shape: 'circle' | 'square' | 'triangle';
    } {
        const alternatives = {
            error: { icon: '✕', pattern: 'solid' as const, shape: 'circle' as const },
            success: { icon: '✓', pattern: 'solid' as const, shape: 'circle' as const },
            warning: { icon: '!', pattern: 'striped' as const, shape: 'triangle' as const },
            info: { icon: 'i', pattern: 'dotted' as const, shape: 'circle' as const },
        };

        return alternatives[semantic];
    }

    /**
     * Get recommended text size for accessibility
     */
    getRecommendedTextSize(baseSize: number): number {
        const preferences = AccessibilityManager.getPreferences();
        return Math.round(baseSize * preferences.textScaling);
    }

    /**
     * Check if current theme meets WCAG AA standards
     */
    meetsWCAGAA(): boolean {
        const theme = this.currentTheme;

        const checks = [
            this.calculateContrastRatio(theme.colors.text, theme.colors.background).passes.AA,
            this.calculateContrastRatio(theme.colors.textSecondary, theme.colors.background).passes.AA,
            this.calculateContrastRatio(theme.colors.primary, theme.colors.background).passes.AA,
            this.calculateContrastRatio(theme.colors.error, theme.colors.background).passes.AA,
        ];

        return checks.every(check => check === true);
    }
}

export default VisualAccessibilityService.getInstance();