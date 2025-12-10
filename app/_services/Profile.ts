/**
 * Profile Service
 * Handles user profile data, payment methods, and avatar management
 */

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    phone: string;
    phoneCountryCode: string;
    address: {
        city: string;
        country: string;
    };
    avatarUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface PaymentMethod {
    id: string;
    type: 'card' | 'upi' | 'netbanking';
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
}

export interface ProfileUpdateData {
    name?: string;
    phone?: string;
    phoneCountryCode?: string;
    address?: {
        city: string;
        country: string;
    };
}

export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

class ProfileService {
    private userId: string | null = null;

    initialize(userId: string) {
        this.userId = userId;
    }

    async getProfile(): Promise<ServiceResponse<UserProfile>> {
        return {
            success: true,
            data: {
                id: this.userId || '',
                email: 'user@example.com',
                name: 'Test User',
                phone: '1234567890',
                phoneCountryCode: '+91',
                address: { city: 'Mumbai', country: 'India' },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
    }

    async updateProfile(data: ProfileUpdateData): Promise<ServiceResponse<UserProfile>> {
        return { success: true, data: { ...data } as any };
    }

    async getPaymentMethods(): Promise<ServiceResponse<PaymentMethod[]>> {
        return { success: true, data: [] };
    }

    async setDefaultPaymentMethod(methodId: string): Promise<ServiceResponse<void>> {
        return { success: true };
    }

    async deletePaymentMethod(methodId: string): Promise<ServiceResponse<void>> {
        return { success: true };
    }

    async uploadAvatar(uri: string): Promise<ServiceResponse<string>> {
        return { success: true, data: uri };
    }

    clear() {
        this.userId = null;
    }
}

export const profileService = new ProfileService();
