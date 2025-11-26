import { EnhancedPasswordStrength } from '../utils/validation';

/**
 * Security Service
 * Centralized security service for validation, rate limiting, and input sanitization.
 */
export class SecurityService {
    private rateLimits: Map<string, { count: number; firstAttempt: number; lockedUntil?: number }> = new Map();
    private readonly MAX_ATTEMPTS = 5;
    private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
    private readonly WINDOW_DURATION = 30 * 60 * 1000; // 30 minutes

    /**
     * Enhanced name validation
     */
    validateNameEnhanced(name: string): { isValid: boolean; message: string; sanitized: string } {
        const sanitized = this.sanitizeInput(name);

        if (sanitized.length < 2) {
            return { isValid: false, message: 'Name must be at least 2 characters long', sanitized };
        }

        if (sanitized.length > 50) {
            return { isValid: false, message: 'Name must be less than 50 characters long', sanitized };
        }

        // Allow letters, spaces, hyphens, and apostrophes (for names like O'Connor)
        const nameRegex = /^[a-zA-Z\s\-\']+$/;
        if (!nameRegex.test(sanitized)) {
            return { isValid: false, message: 'Name contains invalid characters', sanitized };
        }

        return { isValid: true, message: 'Valid name', sanitized };
    }

    /**
     * Enhanced email validation
     */
    validateEmailEnhanced(email: string): { isValid: boolean; message: string; sanitized: string } {
        const sanitized = this.sanitizeInput(email).toLowerCase();

        // RFC 5322 compliant regex
        const emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

        if (!emailRegex.test(sanitized)) {
            return { isValid: false, message: 'Invalid email address format', sanitized };
        }

        return { isValid: true, message: 'Valid email', sanitized };
    }

    /**
     * Enhanced password validation
     */
    async validatePasswordEnhanced(password: string): Promise<{ isValid: boolean; message: string; strength: EnhancedPasswordStrength }> {
        // Calculate strength
        const strength = this.calculatePasswordStrength(password);

        if (password.length < 8) {
            return { isValid: false, message: 'Password must be at least 8 characters long', strength };
        }

        if (strength.score < 2) {
            return { isValid: false, message: 'Password is too weak', strength };
        }

        // In a real app, we might check against a compromised password database here

        return { isValid: true, message: 'Password is secure', strength };
    }

    /**
     * Input sanitization to prevent XSS and injection
     */
    sanitizeInput(input: string): string {
        if (!input) return '';
        return input
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .trim();
    }

    /**
     * Rate limiting check
     */
    checkRateLimit(identifier: string): { allowed: boolean; remainingAttempts: number; resetTime: number } {
        const now = Date.now();
        const record = this.rateLimits.get(identifier);

        if (!record) {
            return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS, resetTime: 0 };
        }

        if (record.lockedUntil && now < record.lockedUntil) {
            return {
                allowed: false,
                remainingAttempts: 0,
                resetTime: record.lockedUntil - now
            };
        }

        // Reset if window expired
        if (now - record.firstAttempt > this.WINDOW_DURATION) {
            this.rateLimits.delete(identifier);
            return { allowed: true, remainingAttempts: this.MAX_ATTEMPTS, resetTime: 0 };
        }

        const remaining = Math.max(0, this.MAX_ATTEMPTS - record.count);
        return {
            allowed: remaining > 0,
            remainingAttempts: remaining,
            resetTime: 0
        };
    }

    /**
     * Record a failed attempt
     */
    recordFailedAttempt(identifier: string): void {
        const now = Date.now();
        const record = this.rateLimits.get(identifier) || { count: 0, firstAttempt: now };

        record.count++;

        if (record.count >= this.MAX_ATTEMPTS) {
            record.lockedUntil = now + this.LOCKOUT_DURATION;
        }

        this.rateLimits.set(identifier, record);
    }

    /**
     * Reset rate limit
     */
    resetRateLimit(identifier: string): void {
        this.rateLimits.delete(identifier);
    }

    /**
     * Internal password strength calculation
     */
    private calculatePasswordStrength(password: string): EnhancedPasswordStrength {
        if (!password) {
            return {
                score: 0,
                label: 'Very Weak',
                color: '#ff4444',
                requirements: {
                    minLength: false,
                    hasUppercase: false,
                    hasLowercase: false,
                    hasNumber: false,
                    hasSpecial: false,
                    noCommonPatterns: false
                }
            };
        }

        const requirements = {
            minLength: password.length >= 8,
            hasUppercase: /[A-Z]/.test(password),
            hasLowercase: /[a-z]/.test(password),
            hasNumber: /\d/.test(password),
            hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
            noCommonPatterns: !/123456|password|qwerty|admin/i.test(password)
        };

        let score = 0;
        if (requirements.minLength) score++;
        if (requirements.hasUppercase) score++;
        if (requirements.hasLowercase) score++;
        if (requirements.hasNumber) score++;
        if (requirements.hasSpecial) score++;
        if (requirements.noCommonPatterns) score++;

        // Normalize score to 0-4
        const normalizedScore = Math.min(4, Math.max(0, Math.floor(score / 1.5)));

        const labels: EnhancedPasswordStrength['label'][] = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const colors = ['#ff4444', '#ff8800', '#ffaa00', '#88cc00', '#00cc44'];

        return {
            score: normalizedScore,
            label: labels[normalizedScore],
            color: colors[normalizedScore],
            requirements
        };
    }
}

export const securityService = new SecurityService();
