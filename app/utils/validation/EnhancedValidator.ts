import { z } from 'zod';

// Enhanced validation schemas with better error messages and patterns
export const ValidationSchemas = {
    // User authentication schemas
    email: z
        .string()
        .min(1, 'Email is required')
        .email('Please enter a valid email address')
        .max(255, 'Email is too long')
        .transform(email => email.toLowerCase().trim()),

    password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .max(128, 'Password is too long')
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
            'Password must contain at least one uppercase letter, one lowercase letter, and one number')
        .refine(password => !password.includes(' '), 'Password cannot contain spaces'),

    // Form validation schemas
    userProfile: z.object({
        name: z
            .string()
            .min(2, 'Name must be at least 2 characters long')
            .max(100, 'Name is too long')
            .regex(/^[a-zA-Z\s]+$/, 'Name can only contain letters and spaces'),

        email: z.string().email('Invalid email format'),

        phone: z
            .string()
            .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Please enter a valid phone number')
            .optional(),

        country: z
            .string()
            .min(2, 'Please select a country')
            .max(56, 'Invalid country selection')
    }),

    // Timer and productivity schemas
    timerSettings: z.object({
        workDuration: z
            .number()
            .min(1, 'Work duration must be at least 1 minute')
            .max(180, 'Work duration cannot exceed 3 hours'),

        breakDuration: z
            .number()
            .min(1, 'Break duration must be at least 1 minute')
            .max(60, 'Break duration cannot exceed 1 hour'),

        longBreakDuration: z
            .number()
            .min(5, 'Long break must be at least 5 minutes')
            .max(120, 'Long break cannot exceed 2 hours'),

        cyclesBeforeLongBreak: z
            .number()
            .min(2, 'Must have at least 2 cycles')
            .max(10, 'Cannot have more than 10 cycles')
    }),

    // Notification preferences schema
    notificationSettings: z.object({
        workReminders: z.boolean(),
        breakReminders: z.boolean(),
        dailyGoals: z.boolean(),
        achievements: z.boolean(),
        soundEnabled: z.boolean(),
        vibrationEnabled: z.boolean(),
        pushNotifications: z.boolean()
    }),

    // Payment and subscription schemas
    subscriptionPlan: z.object({
        planId: z.string().min(1, 'Plan ID is required'),
        billingCycle: z.enum(['monthly', 'yearly']),
        price: z.number().min(0, 'Price must be positive'),
        currency: z.string().length(3, 'Invalid currency code')
    }),

    // General API response schema
    apiResponse: z.object({
        success: z.boolean(),
        message: z.string().optional(),
        data: z.any().optional(),
        error: z.string().optional(),
        timestamp: z.number()
    })
};

// Validation utility class with enhanced error handling
export class EnhancedValidator {
    /**
     * Validate data against a schema with enhanced error messages
     */
    static async validate<T>(schema: z.ZodSchema<T>, data: any): Promise<{
        success: boolean;
        data?: T;
        errors: ValidationError[];
    }> {
        try {
            const validatedData = await schema.parseAsync(data);
            return {
                success: true,
                data: validatedData,
                errors: []
            };
        } catch (error) {
            if (error instanceof z.ZodError) {
                const errors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: this.formatZodError(err),
                    code: err.code,
                    received: (err as any).received
                }));

                return {
                    success: false,
                    errors
                };
            }

            return {
                success: false,
                errors: [{
                    field: 'general',
                    message: 'Validation failed due to an unexpected error',
                    code: 'unknown_error',
                    received: data
                }]
            };
        }
    }

    /**
     * Format Zod error into user-friendly message
     */
    private static formatZodError(error: z.ZodIssue): string {
        switch (error.code) {
            case 'invalid_string':
                if (error.message.includes('email')) {
                    return 'Please enter a valid email address';
                }
                if (error.message.includes('regex')) {
                    return error.message;
                }
                return error.message;

            case 'too_small':
                const min = (error as any).minimum;
                return `${this.formatFieldName(error.path[0] as string)} must be at least ${min} characters`;

            case 'too_big':
                const max = (error as any).maximum;
                return `${this.formatFieldName(error.path[0] as string)} cannot exceed ${max} characters`;

            case 'invalid_type':
                return `${this.formatFieldName(error.path[0] as string)} is required`;

            case 'custom':
                return error.message;

            default:
                return error.message || 'Validation failed';
        }
    }

    /**
     * Format field name for better user messages
     */
    private static formatFieldName(field: string): string {
        return field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .replace(/email/i, 'Email')
            .replace(/password/i, 'Password')
            .replace(/name/i, 'Name');
    }

    /**
     * Validate multiple schemas in sequence
     */
    static async validateMultiple(validations: Array<{
        schema: z.ZodSchema<any>;
        data: any;
        name: string;
    }>): Promise<{
        success: boolean;
        results: Record<string, any>;
        errors: ValidationError[];
    }> {
        const results: Record<string, any> = {};
        const allErrors: ValidationError[] = [];
        let overallSuccess = true;

        for (const { schema, data, name } of validations) {
            const result = await this.validate(schema, data);

            if (result.success) {
                results[name] = result.data;
            } else {
                overallSuccess = false;
                allErrors.push(...result.errors.map(error => ({
                    ...error,
                    field: `${name}.${error.field}`
                })));
            }
        }

        return {
            success: overallSuccess,
            results,
            errors: allErrors
        };
    }

    /**
     * Create custom validation rules
     */
    static createCustomRule<T>(
        validator: (value: T) => boolean,
        message: string
    ): z.ZodCustomIssue {
        return {
            code: 'custom',
            path: [],
            message,
            params: {}
        } as z.ZodCustomIssue;
    }
}

// Type definitions for validation results
export interface ValidationError {
    field: string;
    message: string;
    code: string;
    received?: any;
}

// Export convenience functions
export const validateEmail = (email: string) =>
    EnhancedValidator.validate(ValidationSchemas.email, email);

export const validatePassword = (password: string) =>
    EnhancedValidator.validate(ValidationSchemas.password, password);

export const validateUserProfile = (profile: any) =>
    EnhancedValidator.validate(ValidationSchemas.userProfile, profile);

export const validateTimerSettings = (settings: any) =>
    EnhancedValidator.validate(ValidationSchemas.timerSettings, settings);