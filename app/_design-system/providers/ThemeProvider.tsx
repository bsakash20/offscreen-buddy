/**
 * Mobile-First Design System - Theme Provider
 * Context provider for theme management with system theme detection and persistence
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createTheme, ThemeConfig, ThemeMode, themeUtils } from '../tokens/theme';

interface ThemeContextType {
    // Current theme state
    mode: ThemeMode;
    theme: ThemeConfig;
    isDark: boolean;
    isSystemThemeDark: boolean;

    // Theme actions
    toggleTheme: () => void;
    setTheme: (mode: ThemeMode) => void;

    // Responsive theme utilities
    getResponsiveTheme: (width: number, height: number) => ThemeConfig;

    // Loading state
    isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
    defaultMode?: ThemeMode;
    enableSystemTheme?: boolean;
    enablePersistence?: boolean;
    enableAnimations?: boolean;
}

const THEME_STORAGE_KEY = '@offscreen_buddy_theme_preference';
const SYSTEM_THEME_LISTENER_KEY = 'system_theme_listener';

// Hook to access theme context
export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// Theme provider component
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
    children,
    defaultMode = 'system',
    enableSystemTheme = true,
    enablePersistence = true,
    enableAnimations = true,
}) => {
    // State management
    const [mode, setMode] = useState<ThemeMode>(defaultMode);
    const [systemTheme, setSystemTheme] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTheme, setCurrentTheme] = useState<ThemeConfig>(() => createTheme('light'));

    // Initialize theme system
    useEffect(() => {
        initializeTheme();
    }, []);

    // Listen for system theme changes
    useEffect(() => {
        if (!enableSystemTheme) return;

        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            const newSystemTheme = colorScheme === 'dark';
            setSystemTheme(newSystemTheme);

            // If using system theme, update current theme
            if (mode === 'system') {
                const effectiveTheme = themeUtils.getEffectiveTheme('system', newSystemTheme);
                setCurrentTheme(createTheme(effectiveTheme));
            }
        });

        return () => {
            subscription?.remove();
        };
    }, [mode, enableSystemTheme]);

    // Update theme when mode changes
    useEffect(() => {
        if (!isLoading) {
            updateTheme();
        }
    }, [mode, systemTheme, isLoading]);

    // Initialize theme from storage and system preference
    const initializeTheme = async () => {
        try {
            setIsLoading(true);

            // Get system theme
            const currentSystemTheme = themeUtils.getSystemTheme();
            setSystemTheme(currentSystemTheme);

            // Get stored preference or use default
            let storedMode: ThemeMode = defaultMode;

            if (enablePersistence) {
                const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (stored && ['light', 'dark', 'system'].includes(stored)) {
                    storedMode = stored as ThemeMode;
                    setMode(storedMode);
                }
            }

            // Create initial theme
            const effectiveTheme = themeUtils.getEffectiveTheme(storedMode, currentSystemTheme);
            const initialTheme = createTheme(effectiveTheme);
            setCurrentTheme(initialTheme);

        } catch (error) {
            console.error('Failed to initialize theme:', error);
            // Fallback to default theme
            setCurrentTheme(createTheme('light'));
        } finally {
            setIsLoading(false);
        }
    };

    // Update current theme based on mode
    const updateTheme = async () => {
        try {
            const effectiveTheme = themeUtils.getEffectiveTheme(mode, systemTheme);
            const newTheme = createTheme(effectiveTheme);
            setCurrentTheme(newTheme);

            // Persist preference
            if (enablePersistence) {
                await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            }

        } catch (error) {
            console.error('Failed to update theme:', error);
        }
    };

    // Toggle between light and dark themes
    const toggleTheme = () => {
        if (mode === 'system') {
            // If using system theme, switch to the opposite of current system theme
            const newMode = systemTheme ? 'light' : 'dark';
            setMode(newMode);
        } else {
            // Toggle between light and dark
            setMode(mode === 'light' ? 'dark' : 'light');
        }
    };

    // Set specific theme mode
    const setTheme = (newMode: ThemeMode) => {
        setMode(newMode);
    };

    // Get responsive theme variant
    const getResponsiveTheme = (width: number, height: number): ThemeConfig => {
        return themeUtils.createResponsiveTheme(currentTheme, width, height);
    };

    // Context value
    const contextValue: ThemeContextType = {
        mode,
        theme: currentTheme,
        isDark: mode === 'dark' || (mode === 'system' && systemTheme),
        isSystemThemeDark: systemTheme,
        toggleTheme,
        setTheme,
        getResponsiveTheme,
        isLoading,
    };

    return (
        <ThemeContext.Provider value={contextValue}>
            {children}
        </ThemeContext.Provider>
    );
};

// Theme hook for components
export const useThemeMode = () => {
    const { mode, toggleTheme, setTheme, isDark } = useTheme();
    return { mode, toggleTheme, setTheme, isDark };
};

// Theme colors hook for convenience
export const useThemeColors = () => {
    const { theme } = useTheme();
    return theme.colors;
};

// Theme spacing hook
export const useThemeSpacing = () => {
    const { theme } = useTheme();
    return theme.spacing;
};

// Theme typography hook
export const useThemeTypography = () => {
    const { theme } = useTheme();
    return theme.typography;
};

// Responsive theme hook
export const useResponsiveTheme = () => {
    const { getResponsiveTheme } = useTheme();
    return { getResponsiveTheme };
};

// Theme animation utilities
export const themeAnimations = {
    // Smooth theme transition animation
    getThemeTransitionAnimation: (duration: number = 300) => ({
        duration,
        easing: 'easeInOut',
    }),

    // Background color transition
    getBackgroundTransition: (isDark: boolean, duration: number = 300) => ({
        backgroundColor: isDark ? '#000000' : '#FFFFFF',
        transition: {
            duration,
            easing: 'easeInOut',
        },
    }),

    // Text color transition
    getTextTransition: (isDark: boolean, duration: number = 300) => ({
        color: isDark ? '#FFFFFF' : '#000000',
        transition: {
            duration,
            easing: 'easeInOut',
        },
    }),
};

// Theme validation hook
export const useThemeValidation = () => {
    const { theme } = useTheme();

    const validateCurrentTheme = () => {
        const { validateTheme } = require('../tokens/theme');
        return validateTheme(theme);
    };

    return { validateCurrentTheme };
};

// Dark mode hook
export const useDarkMode = () => {
    const { isDark, mode, isSystemThemeDark } = useTheme();

    return {
        isDark,
        mode,
        isSystemThemeDark,
        isSystemMode: mode === 'system',
        effectiveMode: isDark ? 'dark' as const : 'light' as const,
    };
};

// Theme persistence utilities
export const themePersistence = {
    // Clear stored theme preference
    clearStoredPreference: async (): Promise<void> => {
        try {
            await AsyncStorage.removeItem(THEME_STORAGE_KEY);
        } catch (error) {
            console.error('Failed to clear theme preference:', error);
        }
    },

    // Get stored theme preference
    getStoredPreference: async (): Promise<ThemeMode | null> => {
        try {
            const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
            return stored ? (stored as ThemeMode) : null;
        } catch (error) {
            console.error('Failed to get stored theme preference:', error);
            return null;
        }
    },

    // Set theme preference
    setStoredPreference: async (mode: ThemeMode): Promise<void> => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
        } catch (error) {
            console.error('Failed to set theme preference:', error);
        }
    },
};

// Export provider and hooks
export default ThemeProvider;