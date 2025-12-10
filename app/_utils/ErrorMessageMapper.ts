// Centralized Error Message Mapping System
// Provides user-friendly error messages for authentication-related errors

export interface ErrorMapping {
    message: string;
    action?: 'retry' | 'login' | 'register' | 'support' | 'none';
    retryAfter?: number; // seconds to wait before retry
}

export const ERROR_MESSAGES: Record<string, ErrorMapping> = {
    // Authentication specific errors
    'USER_NOT_FOUND': {
        message: 'No account exists with this email. Please create an account first.',
        action: 'register'
    },
    'INVALID_PASSWORD': {
        message: 'Incorrect password. Please check your password and try again.'
    },
    'RATE_LIMITED': {
        message: 'Too many login attempts. Please wait a few minutes before trying again.',
        action: 'retry',
        retryAfter: 300
    },
    'ACCOUNT_DISABLED': {
        message: 'Your account has been disabled. Please contact support for assistance.',
        action: 'support'
    },
    'EMAIL_NOT_VERIFIED': {
        message: 'Please verify your email address before signing in. Check your inbox for a verification link.',
        action: 'none'
    },
    'EMAIL_ALREADY_EXISTS': {
        message: 'An account with this email already exists. Please sign in instead.',
        action: 'login'
    },
    'PHONE_ALREADY_REGISTERED': {
        message: 'This phone number is already associated with an account. Please sign in instead.',
        action: 'login'
    },
    'INVALID_EMAIL': {
        message: 'Please enter a valid email address.',
        action: 'none'
    },
    'WEAK_PASSWORD': {
        message: 'Password is too weak. Please choose a stronger password with at least 8 characters.',
        action: 'none'
    },
    'PASSWORD_COMPLEXITY_REQUIRED': {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
        action: 'none'
    },

    // Registration specific errors
    'REGISTRATION_FAILED': {
        message: 'Registration failed. Please check your information and try again.',
        action: 'retry'
    },
    'REGISTRATION_VALIDATION_FAILED': {
        message: 'Please check your information. Some fields may be incorrect.',
        action: 'none'
    },
    'REGISTRATION_DUPLICATE_EMAIL': {
        message: 'An account with this email already exists. Please sign in instead.',
        action: 'login'
    },
    'REGISTRATION_INVALID_COUNTRY': {
        message: 'Please select a valid country from the supported list.',
        action: 'none'
    },
    'REGISTRATION_INVALID_PHONE_FORMAT': {
        message: 'Please enter a valid phone number format.',
        action: 'none'
    },

    // Network and connection errors
    'NETWORK_ERROR': {
        message: 'Network error. Please check your internet connection and try again.',
        action: 'retry'
    },
    'NETWORK_CONNECTION_FAILED': {
        message: 'Cannot connect to server. Please check your internet connection.',
        action: 'retry'
    },
    'TIMEOUT_ERROR': {
        message: 'Request timed out. Please check your connection and try again.',
        action: 'retry'
    },

    // Server and unknown errors
    'SERVER_ERROR': {
        message: 'Server error occurred. Please try again later.',
        action: 'retry'
    },
    'INTERNAL_SERVER_ERROR': {
        message: 'Something went wrong on our end. Please try again later.',
        action: 'retry'
    },
    'SERVICE_UNAVAILABLE': {
        message: 'Service is temporarily unavailable. Please try again later.',
        action: 'retry'
    },

    // Generic error codes from backend
    'Validation failed': {
        message: 'Please check your input data and try again.',
        action: 'none'
    },
    'User already exists': {
        message: 'An account with this email already exists. Please sign in instead.',
        action: 'login'
    },
    'Phone already registered': {
        message: 'This phone number is already associated with an account. Please sign in instead.',
        action: 'login'
    },
    'Invalid country': {
        message: 'Please select a valid country from the supported list.',
        action: 'none'
    },
    'Invalid phone format': {
        message: 'Please enter a valid phone number format.',
        action: 'none'
    },
    'Invalid email address format': {
        message: 'Please enter a valid email address.',
        action: 'none'
    },
    'Password must contain at least one uppercase letter, one lowercase letter, and one number': {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number.',
        action: 'none'
    },
    'Password is too weak. Please choose a stronger password.': {
        message: 'Password is too weak. Please choose a stronger password with at least 8 characters.',
        action: 'none'
    },
    'Too many registration attempts. Please wait before trying again.': {
        message: 'Too many registration attempts. Please wait before trying again.',
        action: 'retry',
        retryAfter: 300
    },
    'An account with this email already exists': {
        message: 'An account with this email already exists. Please sign in instead.',
        action: 'login'
    },
    'Unable to create user account. Please try again.': {
        message: 'Unable to create your account. Please check your information and try again.',
        action: 'retry'
    },
    'Could not create user profile. Please try again.': {
        message: 'Could not create your profile. Please try again.',
        action: 'retry'
    }
};

export class ErrorMessageMapper {
    /**
     * Maps an error message or code to a user-friendly message
     * @param error - Error object or string
     * @param context - Optional context (login, register, etc.)
     * @returns User-friendly error message with metadata
     */
    static mapError(error: any, context?: string): ErrorMapping & {
        originalError: string;
        context?: string;
    } {
        let errorMessage = 'An unexpected error occurred. Please try again.';
        let errorKey = '';

        // Handle different error formats
        if (typeof error === 'string') {
            errorMessage = error;
            errorKey = error;
        } else if (error?.message) {
            errorMessage = error.message;
            errorKey = error.message;
        } else if (error?.error) {
            errorMessage = error.error;
            errorKey = error.error;
        } else if (error?.code) {
            errorMessage = error.code;
            errorKey = error.code;
        }

        // Try exact match first
        let mapping: ErrorMapping = {
            message: 'An unexpected error occurred. Please try again.',
            action: 'retry'
        };

        if (ERROR_MESSAGES[errorKey]) {
            mapping = ERROR_MESSAGES[errorKey];
        } else {
            // Try partial matches for common patterns
            const normalizedMessage = errorMessage.toLowerCase();

            // Common error patterns
            if (normalizedMessage.includes('network') || normalizedMessage.includes('fetch')) {
                mapping = ERROR_MESSAGES['NETWORK_ERROR'];
            } else if (normalizedMessage.includes('timeout')) {
                mapping = ERROR_MESSAGES['TIMEOUT_ERROR'];
            } else if (normalizedMessage.includes('email') && normalizedMessage.includes('exists')) {
                mapping = ERROR_MESSAGES['EMAIL_ALREADY_EXISTS'];
            } else if (normalizedMessage.includes('phone') && normalizedMessage.includes('exists')) {
                mapping = ERROR_MESSAGES['PHONE_ALREADY_REGISTERED'];
            } else if (normalizedMessage.includes('validation')) {
                mapping = ERROR_MESSAGES['REGISTRATION_VALIDATION_FAILED'];
            } else if (normalizedMessage.includes('password') && normalizedMessage.includes('weak')) {
                mapping = ERROR_MESSAGES['WEAK_PASSWORD'];
            } else if (normalizedMessage.includes('password') && (normalizedMessage.includes('uppercase') || normalizedMessage.includes('lowercase') || normalizedMessage.includes('number'))) {
                mapping = ERROR_MESSAGES['PASSWORD_COMPLEXITY_REQUIRED'];
            } else if (normalizedMessage.includes('rate limit')) {
                mapping = ERROR_MESSAGES['RATE_LIMITED'];
            } else if (normalizedMessage.includes('server error')) {
                mapping = ERROR_MESSAGES['SERVER_ERROR'];
            }
        }

        return {
            ...mapping,
            originalError: errorMessage,
            context
        };
    }

    /**
     * Gets a user-friendly title for the error context
     * @param context - Context of the error (login, register, etc.)
     * @returns Title string
     */
    static getErrorTitle(context?: string): string {
        switch (context) {
            case 'login':
                return 'Sign In Failed';
            case 'register':
                return 'Registration Failed';
            case 'signup':
                return 'Account Creation Failed';
            case 'forgot-password':
                return 'Password Reset Failed';
            default:
                return 'Error';
        }
    }

    /**
     * Gets the appropriate retry delay in milliseconds
     * @param error - Error to check
     * @returns Delay in milliseconds, or null if no delay needed
     */
    static getRetryDelay(error: any): number | null {
        const mapping = this.mapError(error);
        if (mapping.retryAfter) {
            return mapping.retryAfter * 1000;
        }
        return null;
    }
}

// Export convenience function
export const getUserFriendlyError = (error: any, context?: string) => {
    return ErrorMessageMapper.mapError(error, context);
};