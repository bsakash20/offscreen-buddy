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
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../_assets/constants/colors';
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
} from '../_utils/validation';
import { getUserFriendlyError } from '../_utils/ErrorMessageMapper';
import { PremiumButton } from './ui/PremiumButton';
import { PremiumInput } from './ui/PremiumInput';
import { PremiumCard } from './ui/PremiumCard';
import { useTheme } from '../_design-system/providers/ThemeProvider';
import { securityService } from '../_services/SecurityService';

import { useSupabaseAuth } from '../_contexts/SupabaseAuthContext';

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
  onGoogleLogin: () => Promise<void>;
  isLoading?: boolean;
}

interface FieldState {
  value: string;
  isValid: boolean | null; // null = not validated yet, false = invalid, true = valid
  error: string;
  isTouched: boolean;
}

export default function AuthScreen({ onLogin, onSignup, onGoogleLogin, isLoading = false }: AuthScreenProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const { resetPassword } = useSupabaseAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>('login');
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


  const [googleShake] = useState(new Animated.Value(0));

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
    if (mode !== 'forgot-password' && !formValidation?.password.isValid) {
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
      } else if (mode === 'signup') {
        const credentials: RegisterCredentials = {
          email: emailState.value.trim(),
          password: passwordState.value,
          name: nameState.value.trim(),
        };
        await onSignup(credentials);

        // Reset rate limit on successful registration
        resetRateLimit(emailIdentifier);
      } else if (mode === 'forgot-password') {
        await resetPassword(emailState.value.trim());
        setAuthError('Password reset email sent. Please check your inbox.');
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
      <LinearGradient
        colors={[Colors.dark.background, Colors.dark.backgroundSecondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar barStyle="light-content" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[Colors.dark.glassBackground, Colors.dark.glassBorder]}
              style={StyleSheet.absoluteFill}
            />
            <Ionicons name="timer-outline" size={48} color={Colors.dark.accent} />
          </View>
          <Text style={styles.title}>OffScreen Buddy</Text>
          <Text style={styles.subtitle}>
            {mode === 'login' ? 'Welcome back!' : mode === 'signup' ? 'Create your account' : 'Reset Password'}
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
          <Animated.View style={{ transform: [{ translateX: nameShake.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
            <PremiumInput
              label="Full Name"
              placeholder="John Doe"
              value={nameState.value}
              onChangeText={handleNameChange}
              error={shouldShowFieldError(nameState) ? nameState.error : undefined}
              editable={!isLoading && !isSubmitting}
              icon={<Ionicons name="person-outline" size={20} color={Colors.dark.textSecondary} />}
              style={{ color: Colors.dark.text }}
              placeholderTextColor={Colors.dark.textTertiary}
              inputContainerStyle={{ backgroundColor: Colors.dark.glassBackground, borderColor: Colors.dark.glassBorder }}
            />
          </Animated.View>
        )}

        {/* Email Field */}
        <Animated.View style={{ transform: [{ translateX: emailShake.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
          <PremiumInput
            label="Email"
            placeholder="you@example.com"
            value={emailState.value}
            onChangeText={handleEmailChange}
            error={shouldShowFieldError(emailState) ? emailState.error : undefined}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!isLoading && !isSubmitting}
            icon={<Ionicons name="mail-outline" size={20} color={Colors.dark.textSecondary} />}
            style={{ color: Colors.dark.text }}
            placeholderTextColor={Colors.dark.textTertiary}
            inputContainerStyle={{ backgroundColor: Colors.dark.glassBackground, borderColor: Colors.dark.glassBorder }}
          />
        </Animated.View>

        {/* Password Field */}
        {mode !== 'forgot-password' && (
          <Animated.View style={{ transform: [{ translateX: passwordShake.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
            <View>
              <PremiumInput
                label="Password"
                placeholder={mode === 'signup' ? "Create Password" : "Password"}
                value={passwordState.value}
                onChangeText={handlePasswordChange}
                error={shouldShowFieldError(passwordState) ? passwordState.error : undefined}
                secureTextEntry={!showPassword}
                editable={!isLoading && !isSubmitting}
                icon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />}
                style={{ color: Colors.dark.text }}
                placeholderTextColor={Colors.dark.textTertiary}
                inputContainerStyle={{ backgroundColor: Colors.dark.glassBackground, borderColor: Colors.dark.glassBorder }}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: 12, top: 38, padding: 8 }}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Forgot Password Link */}
        {mode === 'login' && (
          <TouchableOpacity onPress={() => setMode('forgot-password')} style={{ alignSelf: 'flex-end', marginBottom: 24 }}>
            <Text style={{ color: Colors.dark.accent, fontWeight: '500', opacity: 0.9 }}>Forgot Password?</Text>
          </TouchableOpacity>
        )}

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

        {/* Confirm Password Field (Signup only) */}
        {mode === 'signup' && (
          <Animated.View style={{ transform: [{ translateX: confirmPasswordShake.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }}>
            <View>
              <PremiumInput
                label="Confirm Password"
                placeholder="Confirm Password"
                value={confirmPasswordState.value}
                onChangeText={handleConfirmPasswordChange}
                error={shouldShowFieldError(confirmPasswordState) ? confirmPasswordState.error : undefined}
                secureTextEntry={!showConfirmPassword}
                editable={!isLoading && !isSubmitting}
                icon={<Ionicons name="lock-closed-outline" size={20} color={Colors.dark.textSecondary} />}
                style={{ color: Colors.dark.text }}
                placeholderTextColor={Colors.dark.textTertiary}
                inputContainerStyle={{ backgroundColor: Colors.dark.glassBackground, borderColor: Colors.dark.glassBorder }}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{ position: 'absolute', right: 12, top: 38, padding: 8 }}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.dark.textSecondary} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* Submit Button */}
        <PremiumButton
          title={isLoading || isSubmitting ? 'Please wait...' : (mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link')}
          onPress={handleSubmit}
          disabled={isLoading || isSubmitting || (mode !== 'forgot-password' && !isFormValid) || (mode === 'forgot-password' && !formValidation?.email.isValid)}
          loading={isLoading || isSubmitting}
          size="lg"
          variant="gold"
          style={{ marginTop: mode === 'login' ? 0 : 24, width: '100%' }}
        />

        <View style={styles.dividerContainer}>
          <View style={[styles.dividerLine, { backgroundColor: Colors.dark.glassBorder }]} />
          <Text style={[styles.dividerText, { color: Colors.dark.textTertiary }]}>OR</Text>
          <View style={[styles.dividerLine, { backgroundColor: Colors.dark.glassBorder }]} />
        </View>

        <PremiumButton
          title="Sign in with Google"
          onPress={onGoogleLogin}
          variant="glass"
          disabled={isLoading || isSubmitting}
          style={{ marginBottom: 24, width: '100%' }}
          textStyle={{ color: Colors.dark.text }}
          icon={<Ionicons name="logo-google" size={20} color={Colors.dark.text} />}
        />

        {/* Toggle Mode */}
        {mode !== 'forgot-password' ? (
          <TouchableOpacity
            style={styles.toggleMode}
            onPress={toggleMode}
            disabled={isLoading || isSubmitting}
            accessibilityLabel="Toggle mode"
          >
            <Text style={styles.toggleModeText}>
              {mode === 'login'
                ? "Don't have an account? Sign up"
                : "Already have an account? Sign in"
              }
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.toggleMode}
            onPress={() => setMode('login')}
            disabled={isLoading || isSubmitting}
            accessibilityLabel="Back to login"
          >
            <Text style={styles.toggleModeText}>
              Back to Login
            </Text>
          </TouchableOpacity>
        )}

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
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.glassBorder,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
    letterSpacing: 0.5,
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
    borderWidth: 1,
    borderColor: Colors.dark.error + '50',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
  },
  errorText: {
    color: Colors.dark.error,
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  strengthContainer: {
    marginTop: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  strengthBar: {
    height: 4,
    backgroundColor: Colors.dark.glassBorder,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  toggleMode: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  toggleModeText: {
    fontSize: 15,
    color: Colors.dark.accent, // Gold/Accent for premium link look
    fontWeight: '600',
  },
  infoContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  infoText: {
    fontSize: 12,
    color: Colors.dark.textTertiary,
    textAlign: 'center',
    lineHeight: 18,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.glassBorder,
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.dark.textTertiary,
    fontSize: 14,
    fontWeight: '500',
  },
});