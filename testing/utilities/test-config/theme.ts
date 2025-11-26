/**
 * Test theme configuration for consistent testing across components
 */

import { createTheme, ThemeConfig } from '../../../app/design-system/tokens/theme';
import { colorTokens } from '../../../app/design-system/tokens/colors';
import { typographyTokens } from '../../../app/design-system/tokens/typography';
import { spacingTokens } from '../../../app/design-system/tokens/spacing';
import { breakpointTokens } from '../../../app/design-system/tokens/breakpoints';

// Test theme variants
export const testThemes = {
    light: {
        ...createTheme('light'),
        mode: 'light',
    },
    dark: {
        ...createTheme('dark'),
        mode: 'dark',
    },
    highContrast: {
        // Create high contrast variant based on light theme
        ...createTheme('light'),
        colors: {
            ...createTheme('light').colors,
            system: {
                ...createTheme('light').colors.system,
                background: {
                    primary: '#000000',
                    secondary: '#ffffff',
                    tertiary: '#ffffff',
                    surface: '#ffffff',
                    overlay: 'rgba(0, 0, 0, 0.9)',
                },
                text: {
                    primary: '#ffffff',
                    secondary: '#ffffff',
                    tertiary: '#ffffff',
                    inverse: '#000000',
                    disabled: '#ffffff',
                },
            },
            contrast: {
                high: '#ffffff',
                medium: '#ffffff',
                low: '#ffffff',
            },
        },
        mode: 'high-contrast',
    },
};

// Create test theme function
export function createTestTheme(
    theme: keyof typeof testThemes = 'light'
): ThemeConfig & { mode: string } {
    return testThemes[theme];
}

// Mock theme for snapshots
export const mockTheme = testThemes.light;

// Export common test theme combinations
export const themeVariants = Object.keys(testThemes) as Array<keyof typeof testThemes>;

// Helper for testing responsive behavior
export const testBreakpoints = {
    mobile: { width: 375, height: 667, isTablet: false },
    tablet: { width: 768, height: 1024, isTablet: true },
    desktop: { width: 1440, height: 900, isTablet: false },
};

// Mock device dimensions
export const mockDimensions = {
    width: 375,
    height: 667,
};

// Test theme helper that creates themed components for testing
export const createTestThemeProvider = (theme: keyof typeof testThemes = 'light') => {
    const testTheme = testThemes[theme];
    return {
        theme: testTheme,
        mode: theme,
    };
};