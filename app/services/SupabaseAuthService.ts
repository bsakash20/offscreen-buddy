export interface AuthState {
    user: any | null;
    session: any | null;
    isLoading: boolean;
    error: string | null;
    // Compatibility fields for context
    isAuthenticated?: boolean;
    subscription?: any;
}

// Internal mock state
let mockState: AuthState = {
    user: null,
    session: null,
    isLoading: false,
    error: null,
    isAuthenticated: false,
    subscription: null,
};

let authStateChangeCallback: ((state: AuthState) => void) | null = null;

export const supabaseAuthService = {
    // Existing mock methods (kept for compatibility)
    signIn: async (email: string, password: string) => ({ data: { user: { id: 'mock-user' }, session: { access_token: 'mock-token' } }, error: null }),
    signUp: async (email: string, password: string) => ({ data: { user: { id: 'mock-user' }, session: null }, error: null }),
    signOut: async () => ({ error: null }),
    getCurrentUser: async () => ({ data: { user: mockState.user }, error: null }),
    getSession: async () => ({ data: { session: mockState.session }, error: null }),

    // New login method used by context
    login: async ({ email, password }: { email: string; password: string }) => {
        mockState = { ...mockState, user: { id: email }, isAuthenticated: true };
        authStateChangeCallback?.(mockState);
        return { data: { user: mockState.user, session: { access_token: 'mock-token' } }, error: null };
    },

    // New register method used by context
    register: async ({ email, password, deviceId }: { email: string; password: string; deviceId?: string }) => {
        mockState = { ...mockState, user: { id: email }, isAuthenticated: true };
        authStateChangeCallback?.(mockState);
        return { data: { user: mockState.user, session: { access_token: 'mock-token' } }, error: null };
    },

    // New logout method used by context
    logout: async () => {
        mockState = { ...mockState, user: null, isAuthenticated: false };
        authStateChangeCallback?.(mockState);
        return { error: null };
    },

    // Feature flags (check subscription state)
    hasProAccess: () => {
        return mockState.subscription?.active === true ||
            mockState.subscription?.plan === 'pro' ||
            mockState.subscription?.tier === 'pro';
    },
    hasFeature: (feature: string) => {
        if (!mockState.subscription?.active) return false;
        return mockState.subscription?.features?.includes(feature) || false;
    },

    // Auth state change subscription
    onAuthStateChange: (callback: (state: AuthState) => void) => {
        authStateChangeCallback = callback;
        // Immediately invoke with current state
        callback(mockState);
        return { data: { subscription: { unsubscribe: () => { authStateChangeCallback = null; } } } };
    },

    // Initialization (mocked, resolves quickly)
    initializeAuth: async () => {
        // Simulate a short async init
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { data: { user: mockState.user, session: mockState.session }, error: null };
    },

    // JWT listener placeholder
    setupAuthListener: () => {
        return { unsubscribe: () => { } };
    },

    // Update subscription state
    updateSubscription: (subscription: any) => {
        mockState = { ...mockState, subscription };
        authStateChangeCallback?.(mockState);
    },
};
