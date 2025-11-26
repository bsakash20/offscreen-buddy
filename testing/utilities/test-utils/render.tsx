/**
 * Custom render utilities for React Native components with testing library
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { ThemeProvider } from '../../../app/design-system/providers/ThemeProvider';

// Mock router
jest.mock('expo-router', () => ({
    router: {
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
    },
}));

// Custom render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    themeMode?: 'light' | 'dark' | 'system';
    withThemeProvider?: boolean;
    withRouter?: boolean;
    withAccessibilityProvider?: boolean;
}

// Mock accessibility provider
function AccessibilityProvider({ children }: { children: ReactNode }) {
    return (
        <div role="application" aria-label="Test Application">
            {children}
        </div>
    );
}

// Create wrapper component based on options
function createWrapper(
    themeMode: 'light' | 'dark' | 'system' = 'light',
    withThemeProvider = true,
    withAccessibilityProvider = false
) {
    return function Wrapper({ children }: { children: ReactNode }) {
        let content = children;

        if (withAccessibilityProvider) {
            content = <AccessibilityProvider>{content}</AccessibilityProvider>;
        }

        if (withThemeProvider) {
            content = (
                <ThemeProvider
                    defaultMode={themeMode}
                    enableSystemTheme={false}
                    enablePersistence={false}
                    enableAnimations={false}
                >
                    {content}
                </ThemeProvider>
            );
        }

        return content;
    };
}

// Custom render function
function customRender(
    ui: ReactElement,
    {
        themeMode = 'light',
        withThemeProvider = true,
        withRouter = true,
        withAccessibilityProvider = false,
        ...renderOptions
    }: CustomRenderOptions = {}
) {
    const Wrapper = createWrapper(themeMode, withThemeProvider, withAccessibilityProvider);

    return render(ui, {
        wrapper: Wrapper,
        ...renderOptions,
    });
}

// Re-export everything from testing library
export * from '@testing-library/react-native';

// Override render method
export { customRender as render };