/**
 * Form Validation Utilities
 * Provides reusable validation functions for forms
 */

export interface ValidationResult {
    isValid: boolean;
    message: string;
}

export interface PasswordStrength {
    score: number; // 0-4
    label: string;
    color: string;
}

export interface FormValidation {
    email: ValidationResult;
    password: ValidationResult;
    confirmPassword?: ValidationResult;
}

// Email validation
export function validateEmail(email: string): ValidationResult {
    if (!email || email.trim().length === 0) {
        return { isValid: false, message: 'Email is required' };
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email.trim())) {
        return { isValid: false, message: 'Please provide a valid email address' };
    }

    if (email.length > 255) {
        return { isValid: false, message: 'Email address is too long' };
    }

    return { isValid: true, message: '' };
}

// Password validation
export function validatePassword(password: string): ValidationResult {
    if (!password || password.length === 0) {
        return { isValid: false, message: 'Password is required' };
    }

    if (password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (password.length > 128) {
        return { isValid: false, message: 'Password is too long' };
    }

    // Check for complexity: at least 1 uppercase, 1 lowercase, 1 digit
    const complexityPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
    if (!complexityPattern.test(password)) {
        return {
            isValid: false,
            message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
        };
    }

    return { isValid: true, message: '' };
}

// Confirm password validation
export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
    if (!confirmPassword || confirmPassword.length === 0) {
        return { isValid: false, message: 'Please confirm your password' };
    }

    if (password !== confirmPassword) {
        return { isValid: false, message: 'Passwords do not match' };
    }

    return { isValid: true, message: '' };
}

// Password strength calculation
export function calculatePasswordStrength(password: string): PasswordStrength | null {
    if (!password || password.length === 0) return null;

    let score = 0;

    // Length check
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;

    // Character variety checks
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;

    // Map score to strength level
    let strength: PasswordStrength;

    if (score <= 2) {
        strength = { score: 0, label: 'Weak', color: '#FF4444' };
    } else if (score <= 3) {
        strength = { score: 1, label: 'Fair', color: '#FF8800' };
    } else if (score <= 4) {
        strength = { score: 2, label: 'Good', color: '#FFAA00' };
    } else if (score <= 5) {
        strength = { score: 3, label: 'Strong', color: '#00AA00' };
    } else {
        strength = { score: 4, label: 'Very Strong', color: '#006600' };
    }

    return strength;
}

// Input sanitization
export function sanitizeInput(input: string): string {
    return input
        .trim()
        .replace(/[<>]/g, '') // Remove potential HTML tags
        .replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout>;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };

        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Name validation
export function validateName(name: string): ValidationResult {
    if (!name || name.trim().length === 0) {
        return { isValid: false, message: 'Full name is required' };
    }

    if (name.trim().length < 2) {
        return { isValid: false, message: 'Name must be at least 2 characters' };
    }

    if (name.length > 100) {
        return { isValid: false, message: 'Name is too long' };
    }

    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const namePattern = /^[a-zA-ZÀ-ž\s\-']+$/;
    if (!namePattern.test(name.trim())) {
        return {
            isValid: false,
            message: 'Name can only contain letters, spaces, hyphens, and apostrophes'
        };
    }

    return { isValid: true, message: '' };
}

// Phone validation
export function validatePhone(phone: string, countryCode?: string): ValidationResult {
    if (!phone || phone.trim().length === 0) {
        return { isValid: false, message: 'Phone number is required' };
    }

    // Remove all non-digit characters except + and spaces
    const cleanPhone = phone.replace(/[^\d+]/g, '');

    // Basic validation for international format
    if (!cleanPhone.startsWith('+')) {
        return {
            isValid: false,
            message: 'Phone number should include country code (e.g., +1234567890)'
        };
    }

    if (cleanPhone.length < 8 || cleanPhone.length > 20) {
        return { isValid: false, message: 'Phone number should be between 8-20 digits' };
    }

    // If country code is provided, validate phone matches country
    if (countryCode && !cleanPhone.startsWith(countryCode)) {
        return {
            isValid: false,
            message: `Phone number should start with ${countryCode}`
        };
    }

    return { isValid: true, message: '' };
}