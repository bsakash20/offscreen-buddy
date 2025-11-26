/**
 * Mobile-First Design System - Input Component
 * Touch-optimized input component with mobile keyboard support and validation
 */

import React, { forwardRef, useState, useRef, useEffect } from 'react';
import {
    TextInput,
    View,
    Text,
    StyleSheet,
    ViewStyle,
    TextStyle,
    TextInputProps,
} from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import Button, { IconButton } from './Button';

export type InputVariant = 'outlined' | 'filled' | 'underlined';
export type InputSize = 'sm' | 'md' | 'lg';
export type InputState = 'default' | 'focused' | 'error' | 'disabled' | 'success';

export interface InputProps extends Omit<TextInputProps, 'style'> {
    // Content
    label?: string;
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;

    // Appearance
    variant?: InputVariant;
    size?: InputSize;
    state?: InputState;

    // Layout
    fullWidth?: boolean;

    // Validation
    error?: string;
    helperText?: string;
    required?: boolean;

    // Actions
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
    clearable?: boolean;
    passwordToggle?: boolean;

    // Style overrides
    containerStyle?: ViewStyle;
    inputStyle?: TextStyle;
    labelStyle?: TextStyle;
    errorStyle?: TextStyle;

    // Accessibility
    accessibilityLabel?: string;
    accessibilityHint?: string;
    testID?: string;
}

const Input = forwardRef<TextInput, InputProps>(({
    label,
    placeholder,
    value,
    onChangeText,
    variant = 'outlined',
    size = 'md',
    state = 'default',
    fullWidth = false,
    error,
    helperText,
    required = false,
    leftIcon,
    rightIcon,
    clearable = false,
    passwordToggle = false,
    containerStyle,
    inputStyle,
    labelStyle,
    errorStyle,
    accessibilityLabel,
    accessibilityHint,
    testID,
    secureTextEntry,
    keyboardType,
    autoCapitalize,
    autoCorrect,
    ...props
}, ref) => {
    const { theme } = useTheme();
    const { colors, spacing, typography, borderRadius } = theme;
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(!secureTextEntry);
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef<TextInput>(null);

    // Sync with external value changes
    useEffect(() => {
        setCurrentValue(value);
    }, [value]);

    // Handle text change
    const handleChangeText = (text: string) => {
        setCurrentValue(text);
        onChangeText(text);
    };

    // Handle clear
    const handleClear = () => {
        setCurrentValue('');
        onChangeText('');
        inputRef.current?.focus();
    };

    // Toggle password visibility
    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    // Get input state
    const getInputState = (): InputState => {
        if (state !== 'default') return state;
        if (isFocused) return 'focused';
        if (error) return 'error';
        return 'default';
    };

    // Get container styles
    const getContainerStyles = (): ViewStyle => {
        const containerStyleObj: ViewStyle = {
            width: fullWidth ? '100%' : undefined,
        };

        // Variant styles
        switch (variant) {
            case 'outlined':
                containerStyleObj.borderWidth = 1;
                containerStyleObj.borderRadius = borderRadius.medium;
                break;
            case 'filled':
                containerStyleObj.backgroundColor = colors.system.background.secondary;
                containerStyleObj.borderRadius = borderRadius.medium;
                break;
            case 'underlined':
                containerStyleObj.borderBottomWidth = 1;
                break;
        }

        // Size styles
        switch (size) {
            case 'sm':
                containerStyleObj.paddingVertical = spacing.scale.sm;
                containerStyleObj.paddingHorizontal = spacing.scale.md;
                break;
            case 'md':
                containerStyleObj.paddingVertical = spacing.scale.md;
                containerStyleObj.paddingHorizontal = spacing.scale.lg;
                break;
            case 'lg':
                containerStyleObj.paddingVertical = spacing.scale.lg;
                containerStyleObj.paddingHorizontal = spacing.scale.xl;
                break;
        }

        // State styles
        switch (getInputState()) {
            case 'focused':
                containerStyleObj.borderColor = colors.brand.primary[600];
                break;
            case 'error':
                containerStyleObj.borderColor = colors.semantic.error.main;
                break;
            case 'success':
                containerStyleObj.borderColor = colors.semantic.success.main;
                break;
            case 'disabled':
                containerStyleObj.opacity = 0.6;
                break;
            default:
                containerStyleObj.borderColor = colors.system.border.light;
                break;
        }

        if (containerStyle) {
            Object.assign(containerStyleObj, containerStyle);
        }

        return containerStyleObj;
    };

    // Get input styles
    const getInputStyles = (): TextStyle => {
        const inputStyleObj: TextStyle = {
            flex: 1,
            fontSize: typography.text.body.base.fontSize,
            lineHeight: typography.text.body.base.lineHeight,
            fontWeight: typography.text.body.base.fontWeight.toString() as any,
            color: colors.system.text.primary,
            padding: 0, // Remove default padding as we handle it at container level
        };

        // Size adjustments
        switch (size) {
            case 'sm':
                inputStyleObj.fontSize = typography.text.body.sm.fontSize;
                break;
            case 'lg':
                inputStyleObj.fontSize = typography.text.body.lg.fontSize;
                break;
        }

        // State styles
        switch (getInputState()) {
            case 'disabled':
                inputStyleObj.color = colors.system.text.disabled;
                break;
            default:
                inputStyleObj.color = colors.system.text.primary;
                break;
        }

        if (inputStyle) {
            Object.assign(inputStyleObj, inputStyle);
        }

        return inputStyleObj;
    };

    // Get label styles
    const getLabelStyles = (): TextStyle => {
        const labelStyleObj: TextStyle = {
            marginBottom: spacing.scale.sm,
            fontSize: typography.text.label.base.fontSize,
            lineHeight: typography.text.label.base.lineHeight,
            fontWeight: typography.text.label.base.fontWeight.toString() as any,
            color: colors.system.text.primary,
        };

        if (labelStyle) {
            Object.assign(labelStyleObj, labelStyle);
        }

        return labelStyleObj;
    };

    // Get error styles
    const getErrorStyles = (): TextStyle => {
        const errorStyleObj: TextStyle = {
            marginTop: spacing.scale.xs,
            fontSize: typography.text.caption.sm.fontSize,
            lineHeight: typography.text.caption.sm.lineHeight,
            fontWeight: typography.text.caption.sm.fontWeight.toString() as any,
            color: colors.semantic.error.main,
        };

        if (errorStyle) {
            Object.assign(errorStyleObj, errorStyle);
        }

        return errorStyleObj;
    };

    const inputState = getInputState();
    const isDisabled = inputState === 'disabled';

    return (
        <View style={styles.container} testID={testID}>
            {label && (
                <Text style={getLabelStyles()}>
                    {label}
                    {required && <Text style={styles.required}> *</Text>}
                </Text>
            )}

            <View style={getContainerStyles()}>
                {leftIcon && (
                    <View style={styles.iconLeft}>
                        {leftIcon}
                    </View>
                )}

                <TextInput
                    ref={(input) => {
                        if (ref) {
                            if (typeof ref === 'function') {
                                ref(input);
                            } else {
                                ref.current = input;
                            }
                        }
                        inputRef.current = input;
                    }}
                    style={getInputStyles()}
                    value={currentValue}
                    onChangeText={handleChangeText}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder={placeholder}
                    placeholderTextColor={colors.system.text.tertiary}
                    secureTextEntry={secureTextEntry && !showPassword}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    editable={!isDisabled}
                    accessibilityLabel={accessibilityLabel}
                    accessibilityHint={accessibilityHint}
                    {...props}
                />

                <View style={styles.iconRight}>
                    {clearable && currentValue && !isDisabled && (
                        <IconButton
                            icon={<Text style={styles.clearIcon}>×</Text>}
                            size="sm"
                            variant="ghost"
                            onPress={handleClear}
                            accessibilityLabel="Clear input"
                        />
                    )}

                    {passwordToggle && (
                        <IconButton
                            icon={<Text style={styles.toggleIcon}>{showPassword ? '👁️' : '🙈'}</Text>}
                            size="sm"
                            variant="ghost"
                            onPress={togglePassword}
                            accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                        />
                    )}

                    {rightIcon && !passwordToggle && !clearable && (
                        rightIcon
                    )}
                </View>
            </View>

            {(error || helperText) && (
                <Text style={getErrorStyles()}>
                    {error || helperText}
                </Text>
            )}
        </View>
    );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },
    required: {
        color: '#EF4444',
    },
    iconLeft: {
        marginRight: 8,
    },
    iconRight: {
        marginLeft: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    clearIcon: {
        fontSize: 24,
        color: '#666',
    },
    toggleIcon: {
        fontSize: 18,
    },
    searchIcon: {
        fontSize: 16,
        color: '#666',
    },
});

export default Input;

// Textarea component for multiline input
export interface TextareaProps extends Omit<InputProps, 'multiline'> {
    rows?: number;
}

export const Textarea = forwardRef<TextInput, TextareaProps>(({
    rows = 4,
    ...props
}, ref) => {
    const { theme } = useTheme();
    const { spacing } = theme;

    return (
        <Input
            {...props}
            ref={ref}
            multiline
        />
    );
});

Textarea.displayName = 'Textarea';

// Search input component
export interface SearchInputProps extends Omit<InputProps, 'leftIcon'> {
    onSearch?: (query: string) => void;
}

export const SearchInput = forwardRef<TextInput, SearchInputProps>(({
    onSearch,
    onChangeText,
    ...props
}, ref) => {
    const handleChangeText = (text: string) => {
        onChangeText?.(text);
        onSearch?.(text);
    };

    return (
        <Input
            {...props}
            ref={ref}
            leftIcon={<Text style={styles.searchIcon}>🔍</Text>}
            placeholder="Search..."
            onChangeText={handleChangeText}
            clearable
        />
    );
});

SearchInput.displayName = 'SearchInput';