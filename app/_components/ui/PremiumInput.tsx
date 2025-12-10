import React, { useState } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps, TextStyle, ViewStyle } from 'react-native';
import { useTheme } from '../../_design-system/providers/ThemeProvider';

interface PremiumInputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerStyle?: ViewStyle;
    inputContainerStyle?: ViewStyle;
    icon?: React.ReactNode;
}

export const PremiumInput: React.FC<PremiumInputProps> = ({
    label,
    error,
    containerStyle,
    inputContainerStyle,
    icon,
    style,
    onFocus,
    onBlur,
    ...props
}) => {
    const { theme } = useTheme();
    const colors = theme.colors;
    const [isFocused, setIsFocused] = useState(false);

    const handleFocus = (e: any) => {
        setIsFocused(true);
        onFocus?.(e);
    };

    const handleBlur = (e: any) => {
        setIsFocused(false);
        onBlur?.(e);
    };

    return (
        <View style={[styles.container, containerStyle]}>
            {label && (
                <Text style={[
                    styles.label,
                    { color: error ? colors.semantic.error.main : isFocused ? colors.brand.primary[400] : colors.system.text.secondary }
                ]}>
                    {label}
                </Text>
            )}
            <View style={[
                styles.inputWrapper,
                {
                    backgroundColor: colors.system.background.input || 'rgba(255,255,255,0.05)',
                    borderColor: error
                        ? colors.semantic.error.main
                        : isFocused
                            ? colors.brand.primary[500]
                            : colors.system.border.main,
                    borderWidth: isFocused ? 1.5 : 1,
                    borderRadius: theme.borderRadius.medium,
                },
                inputContainerStyle
            ]}>
                {icon && <View style={styles.iconContainer}>{icon}</View>}
                <TextInput
                    style={[
                        styles.input,
                        { color: colors.system.text.primary },
                        style
                    ]}
                    placeholderTextColor={colors.system.text.disabled}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    {...props}
                />
            </View>
            {error && (
                <Text style={[styles.errorText, { color: colors.semantic.error.main }]}>
                    {error}
                </Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        height: 50,
    },
    iconContainer: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        height: '100%',
    },
    errorText: {
        fontSize: 12,
        marginTop: 4,
    },
});
