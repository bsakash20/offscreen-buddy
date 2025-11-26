import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../assets/constants/colors';
import {
  validateEmail,
  validatePasswordSync,
  validateConfirmPassword,
  calculatePasswordStrengthSync,
  sanitizeInput,
  debounce,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  ValidationResult,
  PasswordStrength,
  FormValidation,
} from '../utils/validation';
import { getUserFriendlyError } from '../utils/ErrorMessageMapper';
import { securityService } from '../services/SecurityService';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

const { width } = Dimensions.get('window');

interface AuthScreenProps {
  onLogin: (credentials: LoginCredentials) => Promise<void>;
  onSignup: (credentials: RegisterCredentials) => Promise<void>;
  isLoading?: boolean;
}

interface FieldState {
  value: string;
  isValid: boolean | null; // null = not validated yet, false = invalid, true = valid
  error: string;
  isTouched: boolean;
}

export default function AuthScreen({ onLogin, onSignup, isLoading = false }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);
  const [formValidation, setFormValidation] = useState<FormValidation | null>(null);
  const [authError, setAuthError] = useState<string>('');

  // Animated values for visual feedback
  const [emailShake] = useState(new Animated.Value(0));
  const [passwordShake] = useState(new Animated.Value(0));
  const [confirmPasswordShake] = useState(new Animated.Value(0));
  const [nameShake] = useState(new Animated.Value(0));

  // Field states
  const [nameState, setNameState] = useState<FieldState>({
    value: '',
    isValid: null,
    error: '',
    isTouched: false,
  });

  const [emailState, setEmailState] = useState<FieldState>({
    value: '',
    isValid: null,
    error: '',
    isTouched: false,
  });

  const [passwordState, setPasswordState] = useState<FieldState>({
    value: '',
    isValid: null,
    error: '',
    isTouched: false,
  });

  const [confirmPasswordState, setConfirmPasswordState] = useState<FieldState>({
    value: '',
    isValid: null,
    error: '',
    isTouched: false,
  });

  // Name validation - use the enhanced validation from utils
  const validateName = (name: string): ValidationResult => {
    if (!name || name.trim().length === 0) {
      return { isValid: false, message: 'Full name is required', type: 'name' };
    }

    // Use the enhanced name validation from SecurityService for better international support
    const result = securityService.validateNameEnhanced(name);

    return {
      isValid: result.isValid,
      message: result.message,
      type: 'name',
      sanitized: result.sanitized
    };
  };

  // Debounced validation functions
  const validateNameDebounced = useCallback(
    debounce((name: string) => {
      const result = validateName(name);
      setNameState(prev => ({
        ...prev,
        isValid: result.isValid,
        error: result.isValid ? '' : result.message,
      }));
    }, 500),
    []
  );

  const validateEmailDebounced = useCallback(
    debounce((email: string) => {
      const result = validateEmail(email);
      setEmailState(prev => ({
        ...prev,
        isValid: result.isValid,
        error: result.isValid ? '' : result.message,
      }));
    }, 500),
    []
  );

  const validatePasswordDebounced = useCallback(
    debounce((password: string) => {
      const result = validatePasswordSync(password);
      const strength = calculatePasswordStrengthSync(password);

      setPasswordState(prev => ({
        ...prev,
        isValid: result.isValid,
        error: result.isValid ? '' : result.message,
      }));

      setPasswordStrength(strength);
    }, 300),
    []
  );

  const validateConfirmPasswordDebounced = useCallback(
    debounce((confirmPassword: string) => {
      const result = validateConfirmPassword(passwordState.value, confirmPassword);
      setConfirmPasswordState(prev => ({
        ...prev,
        isValid: result.isValid,
        error: result.isValid ? '' : result.message,
      }));
    }, 300),
    [passwordState.value]
  );

  // Update form validation state
  useEffect(() => {
    const emailValidation = validateEmail(emailState.value);
    const passwordValidation = validatePasswordSync(passwordState.value);

    const validation: FormValidation = {
      email: emailValidation,
      password: passwordValidation,
    };

    if (mode === 'signup') {
      validation.name = validateName(nameState.value);
      validation.confirmPassword = validateConfirmPassword(
        passwordState.value,
        confirmPasswordState.value
      );
    }

    setFormValidation(validation);
  }, [nameState.value, emailState.value, passwordState.value, confirmPasswordState.value, mode]);

  // Clear auth error when mode changes
  useEffect(() => {
    setAuthError('');
  }, [mode]);

  // Handle field changes
  const handleNameChange = (value: string) => {
    const sanitized = sanitizeInput(value);
    setNameState(prev => ({ ...prev, value: sanitized, isTouched: true }));
    validateNameDebounced(sanitized);
  };

  const handleEmailChange = (value: string) => {
    const sanitized = sanitizeInput(value);
    setEmailState(prev => ({ ...prev, value: sanitized, isTouched: true }));
    validateEmailDebounced(sanitized);
  };

  const handlePasswordChange = (value: string) => {
    const sanitized = sanitizeInput(value);
    setPasswordState(prev => ({ ...prev, value: sanitized, isTouched: true }));
    validatePasswordDebounced(sanitized);

    // Re-validate confirm password if it has a value
    if (confirmPasswordState.value) {
      validateConfirmPasswordDebounced(confirmPasswordState.value);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    const sanitized = sanitizeInput(value);
    setConfirmPasswordState(prev => ({ ...prev, value: sanitized, isTouched: true }));
    validateConfirmPasswordDebounced(sanitized);
  };

  // Animation utilities
  const shake = (animatedValue: Animated.Value) => {
    animatedValue.setValue(0);
    Animated.sequence([
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: -1,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(animatedValue, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Field validation helpers
  const isFieldValid = (fieldState: FieldState) => fieldState.isValid === true;
  const isFieldInvalid = (fieldState: FieldState) => fieldState.isValid === false && fieldState.isTouched;
  const shouldShowFieldError = (fieldState: FieldState) => isFieldInvalid(fieldState) && fieldState.error;

  const getFieldBorderColor = (fieldState: FieldState) => {
    if (shouldShowFieldError(fieldState)) return Colors.dark.error;
    if (isFieldValid(fieldState)) return Colors.dark.success;
    return Colors.dark.border;
  };

  const getFieldIcon = (fieldState: FieldState, iconName: 'mail' | 'lock-closed' | 'person') => {
    if (shouldShowFieldError(fieldState)) return 'alert-circle';
    if (isFieldValid(fieldState)) return 'checkmark-circle';
    return iconName;
  };

  const getFieldIconColor = (fieldState: FieldState) => {
    if (shouldShowFieldError(fieldState)) return Colors.dark.error;
    if (isFieldValid(fieldState)) return Colors.dark.success;
    return Colors.dark.textSecondary;
  };

  // Enhanced error handling with user-friendly messages
  const handleAuthError = (error: any) => {
    const context = mode === 'login' ? 'login' : 'register';
    const userFriendlyError = getUserFriendlyError(error, context);

    const errorMessage = userFriendlyError.message;
    let shouldNavigateToSignup = false;

    // Handle specific actions
    if (userFriendlyError.action === 'register' && mode === 'login') {
      shouldNavigateToSignup = true;
    }

    setAuthError(errorMessage);

    // Auto-navigate to signup if user not found
    if (shouldNavigateToSignup) {
      setTimeout(() => {
        setMode('signup');
        setAuthError('');
      }, 2000);
    }
  };

  // Form submission with rate limiting
  const handleSubmit = async () => {
    // Clear previous errors
    setAuthError('');

    // Check rate limiting for the email identifier
    const emailIdentifier = emailState.value.trim().toLowerCase();
    const rateLimitResult = checkRateLimit(emailIdentifier);

    if (!rateLimitResult.allowed) {
      setAuthError(rateLimitResult.message || 'Too many attempts. Please try again later.');
      shake(emailShake);
      return;
    }

    // Trigger validation for all fields
    if (mode === 'signup' && !nameState.isTouched) {
      const nameResult = validateName(nameState.value);
      setNameState(prev => ({
        ...prev,
        isValid: nameResult.isValid,
        error: nameResult.isValid ? '' : nameResult.message,
        isTouched: true,
      }));
      if (!nameResult.isValid) shake(nameShake);
    }

    if (!emailState.isTouched) {
      const emailResult = validateEmail(emailState.value);
      setEmailState(prev => ({
        ...prev,
        isValid: emailResult.isValid,
        error: emailResult.isValid ? '' : emailResult.message,
        isTouched: true,
      }));
      if (!emailResult.isValid) shake(emailShake);
    }

    if (!passwordState.isTouched) {
      const passwordResult = validatePasswordSync(passwordState.value);
      setPasswordState(prev => ({
        ...prev,
        isValid: passwordResult.isValid,
        error: passwordResult.isValid ? '' : passwordResult.message,
        isTouched: true,
      }));
      if (!passwordResult.isValid) shake(passwordShake);
    }

    if (mode === 'signup' && !confirmPasswordState.isTouched) {
      const confirmResult = validateConfirmPassword(passwordState.value, confirmPasswordState.value);
      setConfirmPasswordState(prev => ({
        ...prev,
        isValid: confirmResult.isValid,
        error: confirmResult.isValid ? '' : confirmResult.message,
        isTouched: true,
      }));
      if (!confirmResult.isValid) shake(confirmPasswordShake);
    }

    // Check overall form validity
    if (mode === 'signup' && !formValidation?.name?.isValid) {
      shake(nameShake);
      return;
    }
    if (!formValidation?.email.isValid) {
      shake(emailShake);
      return;
    }
    if (!formValidation?.password.isValid) {
      shake(passwordShake);
      return;
    }
    if (mode === 'signup' && !formValidation?.confirmPassword?.isValid) {
      shake(confirmPasswordShake);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const credentials: LoginCredentials = {
          email: emailState.value.trim(),
          password: passwordState.value,
        };
        await onLogin(credentials);

        // Reset rate limit on successful login
        resetRateLimit(emailIdentifier);
      } else {
        const credentials: RegisterCredentials = {
          email: emailState.value.trim(),
          password: passwordState.value,
          name: nameState.value.trim(),
        };
        await onSignup(credentials);

        // Reset rate limit on successful registration
        resetRateLimit(emailIdentifier);
      }
    } catch (error: any) {
      // Record failed attempt for rate limiting
      recordFailedAttempt(emailIdentifier);
      handleAuthError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setAuthError('');
    // Reset fields
    setNameState({ value: '', isValid: null, error: '', isTouched: false });
    setEmailState({ value: '', isValid: null, error: '', isTouched: false });
    setPasswordState({ value: '', isValid: null, error: '', isTouched: false });
    setConfirmPasswordState({ value: '', isValid: null, error: '', isTouched: false });
    setPasswordStrength(null);
  };

  const isFormValid = (mode === 'login' || formValidation?.name?.isValid) &&
    formValidation?.email.isValid &&
    formValidation?.password.isValid &&
    (mode === 'login' || formValidation?.confirmPassword?.isValid);

  const getPasswordStrengthColor = () => {
    if (!passwordStrength) return Colors.dark.border;
    return passwordStrength.color;
  };

  const getPasswordStrengthText = () => {
    if (!passwordStrength || !passwordState.value) return '';
    return `Password Strength: ${passwordStrength.label}`;
  };

  // Name field validation check
  const isNameValid = mode !== 'signup' || formValidation?.name?.isValid;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Ionicons name="timer" size={48} color={Colors.dark.primary} />
          </View>
          <Text style={styles.title}>OffScreen Buddy</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Welcome back!' : 'Create your account'}
          </Text>
        </View>

        {/* Authentication Error Display */}
        {authError ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color={Colors.dark.error} />
            <Text style={styles.errorText}>{authError}</Text>
          </View>
        ) : null}

        {/* Name Field (Signup only) */}
        {mode === 'signup' && (
          <View style={styles.inputWrapper}>
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  borderColor: getFieldBorderColor(nameState),
                  transform: [
                    {
                      translateX: nameShake.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name={getFieldIcon(nameState, 'person')}
                size={20}
                color={getFieldIconColor(nameState)}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor={Colors.dark.textSecondary}
                value={nameState.value}
                onChangeText={handleNameChange}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!isLoading && !isSubmitting}
                accessibilityLabel="Full Name"
                accessibilityHint={shouldShowFieldError(nameState) ? nameState.error : undefined}
              />
              {isFieldValid(nameState) && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={Colors.dark.success}
                  style={styles.validationIcon}
                />
              )}
            </Animated.View>
            {shouldShowFieldError(nameState) && (
              <Text style={styles.fieldErrorText} accessibilityLabel="Name Error">
                {nameState.error}
              </Text>
            )}
          </View>
        )}

        {/* Email Field */}
        <View style={styles.inputWrapper}>
          <Animated.View
            style={[
              styles.inputContainer,
              {
                borderColor: getFieldBorderColor(emailState),
                transform: [
                  {
                    translateX: emailShake.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons
              name={getFieldIcon(emailState, 'mail')}
              size={20}
              color={getFieldIconColor(emailState)}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor={Colors.dark.textSecondary}
              value={emailState.value}
              onChangeText={handleEmailChange}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading && !isSubmitting}
              accessibilityLabel="Email Address"
              accessibilityHint={shouldShowFieldError(emailState) ? emailState.error : undefined}
            />
            {isFieldValid(emailState) && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.dark.success}
                style={styles.validationIcon}
              />
            )}
          </Animated.View>
          {shouldShowFieldError(emailState) && (
            <Text style={styles.errorText} accessibilityLabel="Email Error">
              {emailState.error}
            </Text>
          )}
        </View>

        {/* Password Field */}
        <View style={styles.inputWrapper}>
          <Animated.View
            style={[
              styles.inputContainer,
              {
                borderColor: getFieldBorderColor(passwordState),
                transform: [
                  {
                    translateX: passwordShake.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                ],
              },
            ]}
          >
            <Ionicons
              name={getFieldIcon(passwordState, 'lock-closed')}
              size={20}
              color={getFieldIconColor(passwordState)}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.passwordInput}
              placeholder={mode === 'signup' ? "Create Password" : "Password"}
              placeholderTextColor={Colors.dark.textSecondary}
              value={passwordState.value}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
              editable={!isLoading && !isSubmitting}
              accessibilityLabel={mode === 'signup' ? "Create Password" : "Password"}
              accessibilityHint={shouldShowFieldError(passwordState) ? passwordState.error : undefined}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
              accessibilityLabel={showPassword ? "Hide password" : "Show password"}
            >
              <Ionicons
                name={showPassword ? 'eye-off' : 'eye'}
                size={20}
                color={Colors.dark.textSecondary}
              />
            </TouchableOpacity>
            {isFieldValid(passwordState) && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.dark.success}
                style={styles.validationIcon}
              />
            )}
          </Animated.View>

          {/* Password Strength Indicator - Signup only */}
          {mode === 'signup' && passwordState.value && passwordStrength && (
            <View style={styles.strengthContainer}>
              <View style={styles.strengthBar}>
                <View
                  style={[
                    styles.strengthFill,
                    {
                      width: `${((passwordStrength.score + 1) / 5) * 100}%`,
                      backgroundColor: getPasswordStrengthColor()
                    }
                  ]}
                />
              </View>
              <Text style={[styles.strengthText, { color: getPasswordStrengthColor() }]}>
                {getPasswordStrengthText()}
              </Text>
            </View>
          )}

          {shouldShowFieldError(passwordState) && (
            <Text style={styles.errorText} accessibilityLabel="Password Error">
              {passwordState.error}
            </Text>
          )}
        </View>

        {/* Confirm Password Field (Signup only) */}
        {mode === 'signup' && (
          <View style={styles.inputWrapper}>
            <Animated.View
              style={[
                styles.inputContainer,
                {
                  borderColor: getFieldBorderColor(confirmPasswordState),
                  transform: [
                    {
                      translateX: confirmPasswordShake.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -10],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Ionicons
                name={getFieldIcon(confirmPasswordState, 'lock-closed')}
                size={20}
                color={getFieldIconColor(confirmPasswordState)}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm Password"
                placeholderTextColor={Colors.dark.textSecondary}
                value={confirmPasswordState.value}
                onChangeText={handleConfirmPasswordChange}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading && !isSubmitting}
                accessibilityLabel="Confirm Password"
                accessibilityHint={shouldShowFieldError(confirmPasswordState) ? confirmPasswordState.error : undefined}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
                accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={20}
                  color={Colors.dark.textSecondary}
                />
              </TouchableOpacity>
              {isFieldValid(confirmPasswordState) && (
                <Ionicons
                  name="checkmark-circle"
                  size={20}
                  color={Colors.dark.success}
                  style={styles.validationIcon}
                />
              )}
            </Animated.View>
            {shouldShowFieldError(confirmPasswordState) && (
              <Text style={styles.errorText} accessibilityLabel="Confirm Password Error">
                {confirmPasswordState.error}
              </Text>
            )}
          </View>
        )}

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: isFormValid && !isLoading && !isSubmitting
                ? Colors.dark.primary
                : Colors.dark.surface
            },
            (isLoading || isSubmitting || !isFormValid) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={isLoading || isSubmitting || !isFormValid}
          activeOpacity={0.8}
          accessibilityLabel={mode === 'login' ? 'Sign In' : 'Create Account'}
          accessibilityRole="button"
        >
          <Text style={styles.submitButtonText}>
            {isLoading || isSubmitting
              ? 'Please wait...'
              : (mode === 'login' ? 'Sign In' : 'Create Account')
            }
          </Text>
        </TouchableOpacity>

        {/* Toggle Mode */}
        <TouchableOpacity
          style={styles.toggleMode}
          onPress={toggleMode}
          disabled={isLoading || isSubmitting}
          accessibilityLabel={mode === 'login' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        >
          <Text style={styles.toggleModeText}>
            {mode === 'login'
              ? "Don't have an account? Sign up"
              : "Already have an account? Sign in"
            }
          </Text>
        </TouchableOpacity>

        {/* Terms and Privacy (Signup only) */}
        {mode === 'signup' && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dark.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: Colors.dark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.error + '20',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
  },
  passwordInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
    paddingRight: 40,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 4,
  },
  validationIcon: {
    marginLeft: 8,
  },
  fieldErrorText: {
    color: Colors.dark.error,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 16,
  },
  strengthContainer: {
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: Colors.dark.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  toggleMode: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  toggleModeText: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '500',
  },
  infoContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});