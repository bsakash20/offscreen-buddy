import { authenticationService } from './security/AuthenticationService';

export { authenticationService as authService };

export interface BackendUser {
    id: string;
    email: string;
    name?: string;
    phone?: string;
    avatar_url?: string;
    role?: string;
}

export interface Subscription {
    id: string;
    planId: string;
    status: 'active' | 'inactive' | 'canceled' | 'past_due';
    currentPeriodEnd: Date;
}

export interface OnboardingStatus {
    completed: boolean;
    step: number;
    totalSteps: number;
}

export interface AuthState {
    isLoading: boolean;
    isAuthenticated: boolean;
    user: BackendUser | null;
    subscription: Subscription | null;
    onboarding: OnboardingStatus | null;
    error: string | null;
}
