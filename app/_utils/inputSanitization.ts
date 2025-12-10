/**
 * Comprehensive Input Sanitization and Security Utilities
 * Provides robust sanitization for all user inputs to prevent XSS and injection attacks
 */

// Global type declarations for React Native/Expo environment
declare global {
    var inputValidationStore: Map<string, number[]> | undefined;
}

export interface SanitizationConfig {
    allowHTML: boolean;
    maxLength: number;
    allowSpecialChars: boolean;
    strictMode: boolean;
}

export interface SanitizationResult {
    sanitized: string;
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

// Default sanitization configuration
const DEFAULT_CONFIG: SanitizationConfig = {
    allowHTML: false,
    maxLength: 1000,
    allowSpecialChars: true,
    strictMode: false
};

/**
 * HTML Entity Mapping for Encoding/Decoding
 */
const HTML_ENTITIES: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
};

const HTML_ENTITIES_REVERSE: Record<string, string> = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '='
};

/**
 * XSS Prevention Patterns
 */
const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!>)<[^<]*)*>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    /javascript:/gi,
    /vbscript:/gi,
    /data:/gi,
    /onload\s*=/gi,
    /onerror\s*=/gi,
    /onclick\s*=/gi,
    /onmouseover\s*=/gi,
    /onfocus\s*=/gi,
    /onblur\s*=/gi
];

/**
 * SQL Injection Patterns
 */
const SQL_INJECTION_PATTERNS = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
    /(\b(OR|AND)\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?\b)/i,
    /(\b(UNION|SELECT)\s+.*\b(FROM|INTO|WHERE)\b)/i,
    /('|(\\x27)|(\\x2D)|(\\x2D))/i,
    /(\b(union|select|insert|update|delete|drop|create|alter|exec|script)\b)/i
];

/**
 * Control Characters and Dangerous Characters
 */
const DANGEROUS_CHARACTERS = [
    '\x00', '\x01', '\x02', '\x03', '\x04', '\x05', '\x06', '\x07',
    '\x08', '\x0B', '\x0C', '\x0E', '\x0F', '\x10', '\x11', '\x12',
    '\x13', '\x14', '\x15', '\x16', '\x17', '\x18', '\x19', '\x1A',
    '\x1B', '\x1C', '\x1D', '\x1E', '\x1F', '\x7F'
];

/**
 * Sanitize string input with comprehensive protection
 */
export function sanitizeString(
    input: string,
    config: Partial<SanitizationConfig> = {}
): SanitizationResult {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof input !== 'string') {
        return {
            sanitized: '',
            isValid: false,
            errors: ['Input must be a string'],
            warnings
        };
    }

    if (!input) {
        return {
            sanitized: '',
            isValid: true,
            errors: [],
            warnings
        };
    }

    let sanitized = input;

    // Remove null bytes and control characters
    DANGEROUS_CHARACTERS.forEach(char => {
        if (sanitized.includes(char)) {
            sanitized = sanitized.replace(new RegExp(char, 'g'), '');
            warnings.push(`Removed dangerous character: ${char.charCodeAt(0)}`);
        }
    });

    // Remove or encode HTML based on configuration
    if (!finalConfig.allowHTML) {
        // Remove all HTML tags
        sanitized = sanitized.replace(/<[^>]*>/g, '');
        warnings.push('Removed HTML tags');
    }

    // Encode HTML entities
    Object.entries(HTML_ENTITIES).forEach(([char, entity]) => {
        sanitized = sanitized.replace(new RegExp(char, 'g'), entity);
    });

    // Check for XSS patterns
    const xssMatches = XSS_PATTERNS.filter(pattern => pattern.test(sanitized));
    if (xssMatches.length > 0) {
        if (finalConfig.strictMode) {
            errors.push('Potential XSS attack detected');
            sanitized = '';
        } else {
            warnings.push('Potential XSS content detected and encoded');
        }
    }

    // Check for SQL injection patterns
    const sqlMatches = SQL_INJECTION_PATTERNS.filter(pattern => pattern.test(sanitized));
    if (sqlMatches.length > 0) {
        if (finalConfig.strictMode) {
            errors.push('Potential SQL injection attempt detected');
            sanitized = '';
        } else {
            warnings.push('Potential SQL injection content detected and sanitized');
        }
    }

    // Enforce length limits
    if (sanitized.length > finalConfig.maxLength) {
        sanitized = sanitized.substring(0, finalConfig.maxLength);
        warnings.push(`Input truncated to ${finalConfig.maxLength} characters`);
    }

    // Validate special characters if not allowed
    if (!finalConfig.allowSpecialChars) {
        const allowedPattern = /^[a-zA-Z0-9\s\-_.@]+$/;
        if (!allowedPattern.test(sanitized)) {
            warnings.push('Special characters were removed');
            sanitized = sanitized.replace(/[^a-zA-Z0-9\s\-_.@]/g, '');
        }
    }

    // Trim whitespace
    sanitized = sanitized.trim();

    return {
        sanitized,
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * HTML Entity Encoding
 */
export function encodeHTML(input: string): string {
    return input.replace(/[&<>"'`=\/]/g, char => HTML_ENTITIES[char]);
}

/**
 * HTML Entity Decoding
 */
export function decodeHTML(input: string): string {
    let decoded = input;
    Object.entries(HTML_ENTITIES_REVERSE).forEach(([entity, char]) => {
        decoded = decoded.replace(new RegExp(entity, 'g'), char);
    });
    return decoded;
}

/**
 * Sanitize Name Input
 */
export function sanitizeName(input: string): SanitizationResult {
    const config: Partial<SanitizationConfig> = {
        maxLength: 100,
        allowSpecialChars: true,
        strictMode: true
    };

    const result = sanitizeString(input, config);

    if (result.isValid && result.sanitized) {
        // Name-specific validation
        const namePattern = /^[a-zA-ZÀ-ž\s\-']{2,100}$/;
        if (!namePattern.test(result.sanitized)) {
            result.errors.push('Name can only contain letters, spaces, hyphens, and apostrophes (2-100 characters)');
            result.isValid = false;
        }
    }

    return result;
}

/**
 * Sanitize Email Input
 */
export function sanitizeEmail(input: string): SanitizationResult {
    const config: Partial<SanitizationConfig> = {
        maxLength: 255,
        allowSpecialChars: false,
        strictMode: true
    };

    const result = sanitizeString(input, config);

    if (result.isValid && result.sanitized) {
        // Email-specific validation
        const emailPattern = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailPattern.test(result.sanitized)) {
            result.errors.push('Invalid email format');
            result.isValid = false;
        }

        // Check for disposable email domains
        const disposableDomains = [
            '10minutemail.com', 'tempmail.com', 'guerrillamail.com',
            'mailinator.com', 'throwaway.email', 'yopmail.com',
            'getnada.com', 'maildrop.cc', 'fakeinbox.com', 'tempmailaddress.com'
        ];

        const domain = result.sanitized.split('@')[1]?.toLowerCase();
        if (domain && disposableDomains.includes(domain)) {
            result.errors.push('Disposable email addresses are not allowed');
            result.isValid = false;
        }
    }

    return result;
}

/**
 * Sanitize Phone Number Input
 */
export function sanitizePhone(input: string, countryCode?: string): SanitizationResult {
    const config: Partial<SanitizationConfig> = {
        maxLength: 20,
        allowSpecialChars: false,
        strictMode: true
    };

    const result = sanitizeString(input, config);

    if (result.isValid && result.sanitized) {
        // Phone-specific validation
        const cleanPhone = result.sanitized.replace(/[^\d+]/g, '');

        // Check international format
        if (!cleanPhone.startsWith('+')) {
            result.errors.push('Phone number should include country code (e.g., +1234567890)');
            result.isValid = false;
        }

        // Check length
        if (cleanPhone.length < 8 || cleanPhone.length > 20) {
            result.errors.push('Phone number should be between 8-20 digits');
            result.isValid = false;
        }

        // Update sanitized value to clean format
        result.sanitized = cleanPhone;

        // Validate against country code if provided
        if (countryCode && !cleanPhone.startsWith(countryCode)) {
            result.errors.push(`Phone number should start with ${countryCode}`);
            result.isValid = false;
        }
    }

    return result;
}

/**
 * Sanitize Country Code Input
 */
export function sanitizeCountryCode(input: string): SanitizationResult {
    const config: Partial<SanitizationConfig> = {
        maxLength: 2,
        allowSpecialChars: false,
        strictMode: true
    };

    const result = sanitizeString(input, config);

    if (result.isValid && result.sanitized) {
        // Country code validation (2-letter ISO code)
        const countryPattern = /^[A-Z]{2}$/;
        if (!countryPattern.test(result.sanitized)) {
            result.errors.push('Country code must be a valid 2-letter ISO code');
            result.isValid = false;
        }
    }

    return result;
}

/**
 * Sanitize Password Input (specialized handling)
 */
export function sanitizePassword(input: string): SanitizationResult {
    const config: Partial<SanitizationConfig> = {
        maxLength: 128,
        allowSpecialChars: true,
        strictMode: true
    };

    const result = sanitizeString(input, config);

    if (result.isValid && result.sanitized) {
        // Password length validation
        if (result.sanitized.length < 8) {
            result.errors.push('Password must be at least 8 characters long');
            result.isValid = false;
        }

        if (result.sanitized.length > 128) {
            result.errors.push('Password is too long');
            result.isValid = false;
        }

        // Password complexity check
        const complexityPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
        if (!complexityPattern.test(result.sanitized)) {
            result.errors.push('Password must contain at least one uppercase letter, one lowercase letter, and one number');
            result.isValid = false;
        }

        // Check for common weak passwords
        const weakPasswords = [
            'password', '123456', 'qwerty', 'abc123', 'password123',
            'admin', 'letmein', 'welcome', 'monkey', '1234567890'
        ];

        if (weakPasswords.includes(result.sanitized.toLowerCase())) {
            result.errors.push('Password is too common. Please choose a stronger password.');
            result.isValid = false;
        }
    }

    return result;
}

/**
 * Sanitize URL Input
 */
export function sanitizeURL(input: string): SanitizationResult {
    const config: Partial<SanitizationConfig> = {
        maxLength: 2048,
        allowSpecialChars: true,
        strictMode: true
    };

    const result = sanitizeString(input, config);

    if (result.isValid && result.sanitized) {
        try {
            // Validate URL format
            const url = new URL(result.sanitized);

            // Check for dangerous protocols
            const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
            if (dangerousProtocols.includes(url.protocol)) {
                result.errors.push('Dangerous URL protocol detected');
                result.isValid = false;
            }
        } catch {
            result.errors.push('Invalid URL format');
            result.isValid = false;
        }
    }

    return result;
}

/**
 * Batch sanitize multiple inputs
 */
export function sanitizeBatch(
    inputs: Record<string, any>,
    rules: Record<string, {
        type: 'string' | 'name' | 'email' | 'phone' | 'password' | 'country' | 'url';
        required?: boolean;
        maxLength?: number;
        config?: Partial<SanitizationConfig>;
    }>
): { sanitized: Record<string, any>; isValid: boolean; errors: Record<string, string[]> } {
    const sanitized: Record<string, any> = {};
    const errors: Record<string, string[]> = {};
    let isValid = true;

    Object.entries(rules).forEach(([key, rule]) => {
        const input = inputs[key];

        if (rule.required && (input === undefined || input === null || input === '')) {
            errors[key] = [`${key} is required`];
            isValid = false;
            return;
        }

        if (input === undefined || input === null) {
            sanitized[key] = input;
            return;
        }

        let result: SanitizationResult;

        switch (rule.type) {
            case 'name':
                result = sanitizeName(String(input));
                break;
            case 'email':
                result = sanitizeEmail(String(input));
                break;
            case 'phone':
                const phoneInput = String(input);
                const countryCode = inputs.phoneCountryCode;
                result = sanitizePhone(phoneInput, countryCode);
                break;
            case 'password':
                result = sanitizePassword(String(input));
                break;
            case 'country':
                result = sanitizeCountryCode(String(input));
                break;
            case 'url':
                result = sanitizeURL(String(input));
                break;
            case 'string':
            default:
                result = sanitizeString(String(input), {
                    maxLength: rule.maxLength,
                    ...rule.config
                });
                break;
        }

        if (!result.isValid) {
            errors[key] = result.errors;
            isValid = false;
        }

        if (result.warnings.length > 0) {
            console.warn(`Sanitization warnings for ${key}:`, result.warnings);
        }

        sanitized[key] = result.sanitized;
    });

    return { sanitized, isValid, errors };
}

/**
 * CSRF Token Generation and Validation
 */
export class CSRFProtection {
    private static tokens = new Map<string, { token: string; expiresAt: number }>();

    /**
     * Generate CSRF token for session
     */
    static generateToken(sessionId: string): string {
        const token = `${sessionId}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
        const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour

        this.tokens.set(sessionId, { token, expiresAt });
        return token;
    }

    /**
     * Validate CSRF token
     */
    static validateToken(sessionId: string, token: string): boolean {
        const tokenData = this.tokens.get(sessionId);
        if (!tokenData) return false;

        // Check if token has expired
        if (Date.now() > tokenData.expiresAt) {
            this.tokens.delete(sessionId);
            return false;
        }

        return tokenData.token === token;
    }

    /**
     * Clear tokens for session
     */
    static clearToken(sessionId: string): void {
        this.tokens.delete(sessionId);
    }

    /**
     * Clean up expired tokens
     */
    static cleanup(): void {
        const now = Date.now();
        for (const [sessionId, tokenData] of this.tokens.entries()) {
            if (now > tokenData.expiresAt) {
                this.tokens.delete(sessionId);
            }
        }
    }
}

/**
 * Advanced Input Validation with Regex Patterns
 */
export class InputValidator {
    /**
     * Validate against whitelist patterns
     */
    static validateWhitelist(input: string, allowedPatterns: RegExp[]): boolean {
        return allowedPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Validate against blacklist patterns
     */
    static validateBlacklist(input: string, blockedPatterns: RegExp[]): boolean {
        return !blockedPatterns.some(pattern => pattern.test(input));
    }

    /**
     * Rate limiting for input validation attempts
     */
    static checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
        // Initialize store if needed
        if (typeof globalThis.inputValidationStore === 'undefined') {
            globalThis.inputValidationStore = new Map();
        }

        const now = Date.now();
        const key = identifier;
        const windowStart = now - windowMs;

        if (!globalThis.inputValidationStore.has(key)) {
            globalThis.inputValidationStore.set(key, []);
        }

        const attempts = globalThis.inputValidationStore.get(key) || [];

        // Remove old attempts outside the window
        const validAttempts = attempts.filter((timestamp: number) => timestamp > windowStart);

        if (validAttempts.length >= maxAttempts) {
            return false; // Rate limited
        }

        // Add current attempt
        validAttempts.push(now);
        globalThis.inputValidationStore.set(key, validAttempts);

        return true;
    }
}

/**
 * Security headers generation for frontend
 */
export function generateSecurityHeaders(): Record<string, string> {
    return {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self'",
            "connect-src 'self' https://*.supabase.co",
            "frame-src 'none'",
            "object-src 'none'",
            "media-src 'self'"
        ].join('; ')
    };
}

/**
 * Input sanitization middleware for API calls
 */
export function sanitizeApiInput(data: any): any {
    if (typeof data === 'string') {
        return sanitizeString(data).sanitized;
    }

    if (Array.isArray(data)) {
        return data.map(sanitizeApiInput);
    }

    if (data && typeof data === 'object') {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(data)) {
            sanitized[key] = sanitizeApiInput(value);
        }
        return sanitized;
    }

    return data;
}

/**
 * Detect and prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
        return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
}

/**
 * Secure random string generation
 */
export function generateSecureRandom(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const randomBytes = new Uint8Array(length);

    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(randomBytes);
    } else {
        // Fallback for non-browser environments
        for (let i = 0; i < length; i++) {
            randomBytes[i] = Math.floor(Math.random() * 256);
        }
    }

    for (let i = 0; i < length; i++) {
        result += chars.charAt(randomBytes[i] % chars.length);
    }

    return result;
}

export default {
    sanitizeString,
    sanitizeName,
    sanitizeEmail,
    sanitizePhone,
    sanitizeCountryCode,
    sanitizePassword,
    sanitizeURL,
    sanitizeBatch,
    sanitizeApiInput,
    encodeHTML,
    decodeHTML,
    CSRFProtection,
    InputValidator,
    generateSecurityHeaders,
    constantTimeCompare,
    generateSecureRandom
};