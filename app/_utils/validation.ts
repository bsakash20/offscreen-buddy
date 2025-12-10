// Enhanced Email and Password Validation Utilities with Security Features
import { securityService } from '../_services/SecurityService';

export interface ValidationResult {
  isValid: boolean;
  message: string;
  type?: 'email' | 'password' | 'confirmPassword' | 'name';
  sanitized?: string;
}

export interface EnhancedPasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
  requirements: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
    noCommonPatterns: boolean;
  };
  breachChecked?: boolean;
  isCompromised?: boolean;
}

// Backward compatibility alias
export type PasswordStrength = EnhancedPasswordStrength;

// Enhanced email validation with RFC 5322 compliance
export const validateEmail = (email: string): ValidationResult => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      message: 'Email is required',
      type: 'email'
    };
  }

  const result = securityService.validateEmailEnhanced(email);

  return {
    isValid: result.isValid,
    message: result.message,
    type: 'email',
    sanitized: result.sanitized
  };
};

// Enhanced name validation with international character support
export const validateName = (name: string): ValidationResult => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      message: 'Name is required',
      type: 'name'
    };
  }

  const result = securityService.validateNameEnhanced(name);

  return {
    isValid: result.isValid,
    message: result.message,
    type: 'name',
    sanitized: result.sanitized
  };
};

// Enhanced password validation with breach checking capability
export const validatePassword = async (password: string): Promise<ValidationResult> => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required',
      type: 'password'
    };
  }

  try {
    const result = await securityService.validatePasswordEnhanced(password);

    return {
      isValid: result.isValid,
      message: result.message,
      type: 'password',
      sanitized: password // Passwords aren't sanitized, they're kept as-is for security
    };
  } catch (error) {
    console.warn('Password validation failed:', error);
    // Fallback to basic validation if enhanced validation fails
    const basicResult = calculatePasswordStrengthSync(password);

    return {
      isValid: basicResult.score >= 2,
      message: basicResult.score >= 2 ? 'Password meets basic requirements' : 'Password is too weak',
      type: 'password'
    };
  }
};

// Synchronous password validation for backward compatibility
export const validatePasswordSync = (password: string): ValidationResult => {
  const strength = calculatePasswordStrengthSync(password);

  if (!password || password.length === 0) {
    return {
      isValid: false,
      message: 'Password is required',
      type: 'password'
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      message: 'Password must be at least 8 characters long',
      type: 'password'
    };
  }

  if (strength.score < 2) {
    return {
      isValid: false,
      message: 'Password is too weak. Please use a stronger password.',
      type: 'password'
    };
  }

  return {
    isValid: true,
    message: 'Password meets requirements',
    type: 'password'
  };
};

// Enhanced password strength calculation with breach checking
export const calculatePasswordStrength = async (password: string): Promise<EnhancedPasswordStrength> => {
  try {
    const result = await securityService.validatePasswordEnhanced(password);
    return result.strength;
  } catch (error) {
    console.warn('Password strength calculation failed:', error);
    return calculatePasswordStrengthSync(password);
  }
};

// Synchronous password strength calculation for backward compatibility
export const calculatePasswordStrengthSync = (password: string): EnhancedPasswordStrength => {
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
    noCommonPatterns: !hasCommonPatterns(password)
  };

  let score = 0;

  // Base points for length
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Points for character variety
  if (requirements.hasUppercase) score++;
  if (requirements.hasLowercase) score++;
  if (requirements.hasNumber) score++;
  if (requirements.hasSpecial) score++;

  // Penalty for common patterns
  if (!requirements.noCommonPatterns) score -= 2;

  // Bonus for very long passwords
  if (password.length >= 20) score++;

  // Determine strength label and color
  let label: EnhancedPasswordStrength['label'];
  let color: string;

  if (score < 2) {
    label = 'Very Weak';
    color = '#ff4444';
  } else if (score < 3) {
    label = 'Weak';
    color = '#ff8800';
  } else if (score < 4) {
    label = 'Fair';
    color = '#ffaa00';
  } else if (score < 5) {
    label = 'Good';
    color = '#88cc00';
  } else {
    label = 'Strong';
    color = '#00cc44';
  }

  return {
    score: Math.max(0, Math.min(score, 4)),
    label,
    color,
    requirements
  };
};

// Confirm password validation
export const validateConfirmPassword = (password: string, confirmPassword: string): ValidationResult => {
  if (!confirmPassword || confirmPassword.length === 0) {
    return {
      isValid: false,
      message: 'Please confirm your password',
      type: 'confirmPassword'
    };
  }

  if (password !== confirmPassword) {
    return {
      isValid: false,
      message: 'Passwords do not match',
      type: 'confirmPassword'
    };
  }

  return {
    isValid: true,
    message: 'Passwords match',
    type: 'confirmPassword'
  };
};

// Enhanced XSS prevention utility
export const sanitizeInput = (input: string): string => {
  return securityService.sanitizeInput(input);
};

// Form validation utility with enhanced features
export interface FormValidation {
  name?: ValidationResult;
  email: ValidationResult;
  password: ValidationResult;
  confirmPassword?: ValidationResult;
}

export const validateForm = async (
  email: string,
  password: string,
  confirmPassword?: string,
  isSignup: boolean = false,
  name?: string
): Promise<{ isValid: boolean; errors: FormValidation }> => {
  const emailValidation = validateEmail(email);

  let passwordValidation: ValidationResult;
  try {
    passwordValidation = await validatePassword(password);
  } catch (error) {
    passwordValidation = validatePasswordSync(password);
  }

  const errors: FormValidation = {
    email: emailValidation,
    password: passwordValidation
  };

  if (isSignup) {
    if (name !== undefined) {
      errors.name = validateName(name);
    }
    if (confirmPassword !== undefined) {
      errors.confirmPassword = validateConfirmPassword(password, confirmPassword);
    }
  }

  const isValid = emailValidation.isValid &&
    passwordValidation.isValid &&
    (isSignup ? ((errors.name?.isValid ?? true) && (errors.confirmPassword?.isValid ?? true)) : true);

  return { isValid, errors };
};

// Backward compatible synchronous form validation
export const validateFormSync = (
  email: string,
  password: string,
  confirmPassword?: string,
  isSignup: boolean = false,
  name?: string
): { isValid: boolean; errors: FormValidation } => {
  const emailValidation = validateEmail(email);
  const passwordValidation = validatePasswordSync(password);

  const errors: FormValidation = {
    email: emailValidation,
    password: passwordValidation
  };

  if (isSignup) {
    if (name !== undefined) {
      errors.name = validateName(name);
    }
    if (confirmPassword !== undefined) {
      errors.confirmPassword = validateConfirmPassword(password, confirmPassword);
    }
  }

  const isValid = emailValidation.isValid &&
    passwordValidation.isValid &&
    (isSignup ? ((errors.name?.isValid ?? true) && (errors.confirmPassword?.isValid ?? true)) : true);

  return { isValid, errors };
};

// Debounce utility
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Utility function to check for common password patterns
function hasCommonPatterns(password: string): boolean {
  const commonPatterns = [
    /123456/,
    /qwerty/i,
    /password/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /abc123/i,
    /(?:012|123|234|345|456|567|678|789)/,
    /(?:aa|bb|cc|dd|ee|ff|gg|hh|ii|jj|kk|ll|mm|nn|oo|pp|qq|rr|ss|tt|uu|vv|ww|xx|yy|zz)/i
  ];

  return commonPatterns.some(pattern => pattern.test(password));
}

// Rate limiting utility for client-side protection
export interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  resetTime: number;
  message?: string;
}

export const checkRateLimit = (identifier: string): RateLimitResult => {
  const result = securityService.checkRateLimit(identifier);
  return {
    allowed: result.allowed,
    remainingAttempts: result.remainingAttempts,
    resetTime: result.resetTime,
    message: result.allowed ? undefined : `Too many attempts. Try again in ${Math.ceil(result.resetTime / 60000)} minutes.`
  };
};

// Record failed authentication attempt
export const recordFailedAttempt = (identifier: string): void => {
  securityService.recordFailedAttempt(identifier);
};

// Reset rate limit for successful authentication
export const resetRateLimit = (identifier: string): void => {
  securityService.resetRateLimit(identifier);
};