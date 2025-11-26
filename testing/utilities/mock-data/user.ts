/**
 * Mock user data for testing
 */

export interface MockUser {
    id: string;
    email: string;
    displayName: string;
    avatar?: string;
    preferences: {
        theme: 'light' | 'dark' | 'system';
        notifications: boolean;
        accessibility: {
            screenReaderEnabled: boolean;
            highContrastMode: boolean;
            largeTextMode: boolean;
        };
    };
    profile: {
        firstName: string;
        lastName: string;
        timezone: string;
        language: string;
    };
    focus: {
        totalSessions: number;
        totalMinutes: number;
        currentStreak: number;
        bestStreak: number;
        achievements: string[];
    };
}

// Mock users for different testing scenarios
export const mockUsers = {
    // Standard user with normal preferences
    standard: {
        id: 'user-standard-123',
        email: 'user@example.com',
        displayName: 'John Doe',
        avatar: undefined,
        preferences: {
            theme: 'light',
            notifications: true,
            accessibility: {
                screenReaderEnabled: false,
                highContrastMode: false,
                largeTextMode: false,
            },
        },
        profile: {
            firstName: 'John',
            lastName: 'Doe',
            timezone: 'America/New_York',
            language: 'en',
        },
        focus: {
            totalSessions: 150,
            totalMinutes: 3750,
            currentStreak: 7,
            bestStreak: 21,
            achievements: ['first_session', 'week_streak', '100_sessions'],
        },
    },

    // Accessibility-focused user
    accessibility: {
        id: 'user-accessibility-456',
        email: 'accessibility@example.com',
        displayName: 'Jane Smith',
        avatar: 'https://example.com/avatar2.jpg',
        preferences: {
            theme: 'light',
            notifications: true,
            accessibility: {
                screenReaderEnabled: true,
                highContrastMode: true,
                largeTextMode: true,
            },
        },
        profile: {
            firstName: 'Jane',
            lastName: 'Smith',
            timezone: 'Europe/London',
            language: 'en',
        },
        focus: {
            totalSessions: 75,
            totalMinutes: 1875,
            currentStreak: 3,
            bestStreak: 5,
            achievements: ['first_session', 'accessibility_pioneer'],
        },
    },

    // New user with minimal data
    new: {
        id: 'user-new-789',
        email: 'newuser@example.com',
        displayName: 'New User',
        avatar: undefined,
        preferences: {
            theme: 'system',
            notifications: false,
            accessibility: {
                screenReaderEnabled: false,
                highContrastMode: false,
                largeTextMode: false,
            },
        },
        profile: {
            firstName: 'New',
            lastName: 'User',
            timezone: 'UTC',
            language: 'en',
        },
        focus: {
            totalSessions: 0,
            totalMinutes: 0,
            currentStreak: 0,
            bestStreak: 0,
            achievements: [],
        },
    },

    // Power user with extensive activity
    powerUser: {
        id: 'user-power-012',
        email: 'power@example.com',
        displayName: 'Pro User',
        avatar: 'https://example.com/avatar3.jpg',
        preferences: {
            theme: 'dark',
            notifications: true,
            accessibility: {
                screenReaderEnabled: false,
                highContrastMode: false,
                largeTextMode: false,
            },
        },
        profile: {
            firstName: 'Pro',
            lastName: 'User',
            timezone: 'Asia/Tokyo',
            language: 'en',
        },
        focus: {
            totalSessions: 1000,
            totalMinutes: 25000,
            currentStreak: 365,
            bestStreak: 400,
            achievements: [
                'first_session',
                'week_streak',
                'month_streak',
                '100_sessions',
                '500_sessions',
                '1000_sessions',
                'year_streak',
                'marathon_focus',
                'early_bird',
                'night_owl',
            ],
        },
    },
};

// Create a custom mock user function
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
    return {
        ...mockUsers.standard,
        ...overrides,
        preferences: {
            ...mockUsers.standard.preferences,
            ...overrides.preferences,
        },
        profile: {
            ...mockUsers.standard.profile,
            ...overrides.profile,
        },
        focus: {
            ...mockUsers.standard.focus,
            ...overrides.focus,
        },
    };
}

// User state for testing hooks and contexts
export interface MockUserState {
    user: MockUser | null;
    loading: boolean;
    error: string | null;
    isAuthenticated: boolean;
}

export const mockUserStates = {
    // Initial loading state
    loading: {
        user: null,
        loading: true,
        error: null,
        isAuthenticated: false,
    },

    // Authenticated state
    authenticated: {
        user: mockUsers.standard,
        loading: false,
        error: null,
        isAuthenticated: true,
    },

    // Error state
    error: {
        user: null,
        loading: false,
        error: 'Authentication failed',
        isAuthenticated: false,
    },

    // Unauthenticated state
    unauthenticated: {
        user: null,
        loading: false,
        error: null,
        isAuthenticated: false,
    },
};

// Accessibility scenarios
export const accessibilityUsers = {
    screenReader: {
        ...mockUsers.standard,
        preferences: {
            ...mockUsers.standard.preferences,
            accessibility: {
                screenReaderEnabled: true,
                highContrastMode: false,
                largeTextMode: false,
            },
        },
    },

    highContrast: {
        ...mockUsers.standard,
        preferences: {
            ...mockUsers.standard.preferences,
            accessibility: {
                screenReaderEnabled: false,
                highContrastMode: true,
                largeTextMode: false,
            },
        },
    },

    largeText: {
        ...mockUsers.standard,
        preferences: {
            ...mockUsers.standard.preferences,
            accessibility: {
                screenReaderEnabled: false,
                highContrastMode: false,
                largeTextMode: true,
            },
        },
    },

    fullAccessibility: mockUsers.accessibility,
};

// Device-specific user profiles
export const deviceUsers = {
    mobile: {
        ...mockUsers.standard,
        profile: {
            ...mockUsers.standard.profile,
            deviceType: 'mobile',
            screenSize: { width: 375, height: 667 },
        },
    },

    tablet: {
        ...mockUsers.standard,
        profile: {
            ...mockUsers.standard.profile,
            deviceType: 'tablet',
            screenSize: { width: 768, height: 1024 },
        },
    },

    desktop: {
        ...mockUsers.standard,
        profile: {
            ...mockUsers.standard.profile,
            deviceType: 'desktop',
            screenSize: { width: 1440, height: 900 },
        },
    },
};

// Language-specific users
export const languageUsers = {
    english: mockUsers.standard,
    spanish: {
        ...mockUsers.standard,
        profile: {
            ...mockUsers.standard.profile,
            language: 'es',
            firstName: 'Usuario',
            lastName: 'Ejemplo',
            displayName: 'Usuario Ejemplo',
        },
    },
    french: {
        ...mockUsers.standard,
        profile: {
            ...mockUsers.standard.profile,
            language: 'fr',
            firstName: 'Utilisateur',
            lastName: 'Exemple',
            displayName: 'Utilisateur Exemple',
        },
    },
    japanese: {
        ...mockUsers.standard,
        profile: {
            ...mockUsers.standard.profile,
            language: 'ja',
            firstName: 'ユーザー',
            lastName: '例',
            displayName: 'ユーザー例',
            timezone: 'Asia/Tokyo',
        },
    },
};