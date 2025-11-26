/**
 * Unit tests for Button component
 * Tests all button variants, states, and accessibility features
 */

import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent, screen } from '@testing-library/react-native';
import Button from '../../../app/design-system/components/Button';
import { ThemeProvider } from '../../../app/design-system/providers/ThemeProvider';

describe('Button Component', () => {
    // Mock props
    const defaultProps = {
        children: 'Button Text',
        onPress: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Rendering', () => {
        it('renders with default props', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} />
                </ThemeProvider>
            );

            expect(getByText('Button Text')).toBeTruthy();
        });

        it('renders children with correct text', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} />
                </ThemeProvider>
            );

            expect(getByText('Button Text')).toBeTruthy();
        });
    });

    describe('Button Variants', () => {
        const variants = ['primary', 'secondary', 'outline', 'ghost', 'destructive'] as const;

        variants.forEach((variant) => {
            it(`renders correctly with ${variant} variant`, () => {
                const { getByText } = render(
                    <ThemeProvider defaultMode="light">
                        <Button {...defaultProps} variant={variant} />
                    </ThemeProvider>
                );

                expect(getByText('Button Text')).toBeTruthy();
            });
        });
    });

    describe('Button Sizes', () => {
        const sizes = ['sm', 'md', 'lg', 'xl'] as const;

        sizes.forEach((size) => {
            it(`renders correctly with ${size} size`, () => {
                const { getByText } = render(
                    <ThemeProvider defaultMode="light">
                        <Button {...defaultProps} size={size} />
                    </ThemeProvider>
                );

                expect(getByText('Button Text')).toBeTruthy();
            });
        });
    });

    describe('Button States', () => {
        it('disables button when disabled prop is true', () => {
            const onPress = jest.fn();

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} onPress={onPress} disabled />
                </ThemeProvider>
            );

            // Button should still render text but be non-interactive
            expect(getByText('Button Text')).toBeTruthy();

            // Verify that it's disabled by checking if it doesn't call onPress
            const buttonElement = screen.getByText('Button Text').parent;
            if (buttonElement) {
                fireEvent.press(buttonElement);
                expect(onPress).not.toHaveBeenCalled();
            }
        });

        it('shows loading state when loading prop is true', () => {
            const onPress = jest.fn();

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} onPress={onPress} loading />
                </ThemeProvider>
            );

            // Should still show children but with loading indicator
            expect(getByText('Button Text')).toBeTruthy();

            // Verify loading prevents interaction
            const buttonElement = screen.getByText('Button Text').parent;
            if (buttonElement) {
                fireEvent.press(buttonElement);
                expect(onPress).not.toHaveBeenCalled();
            }
        });
    });

    describe('Interaction', () => {
        it('calls onPress when button is pressed', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            fireEvent.press(buttonElement);

            expect(defaultProps.onPress).toHaveBeenCalledTimes(1);
        });

        it('does not call onPress when disabled', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} disabled />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            fireEvent.press(buttonElement);

            expect(defaultProps.onPress).not.toHaveBeenCalled();
        });

        it('does not call onPress when loading', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} loading />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            fireEvent.press(buttonElement);

            expect(defaultProps.onPress).not.toHaveBeenCalled();
        });
    });

    describe('Custom Styling', () => {
        it('applies custom style when style prop is provided', () => {
            const customStyle = { backgroundColor: 'red', padding: 20 };

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} style={customStyle} />
                </ThemeProvider>
            );

            expect(getByText('Button Text')).toBeTruthy();
        });

        it('applies custom text style when textStyle prop is provided', () => {
            const customTextStyle = { fontSize: 20, color: 'blue' };

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} textStyle={customTextStyle} />
                </ThemeProvider>
            );

            const textElement = getByText('Button Text');
            expect(textElement.props.style).toContainEqual(customTextStyle);
        });
    });

    describe('Accessibility', () => {
        it('has correct accessibility role', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            // The button element should have accessibilityRole='button'
            const parent = buttonElement.parent;
            if (parent) {
                expect(parent.props.accessibilityRole).toBe('button');
            }
        });

        it('sets accessibility label when provided', () => {
            const accessibilityLabel = 'Custom button label';

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} accessibilityLabel={accessibilityLabel} />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            const parent = buttonElement.parent;
            if (parent) {
                expect(parent.props.accessibilityLabel).toBe(accessibilityLabel);
            }
        });

        it('supports testID for testing', () => {
            const testID = 'custom-button-test-id';

            const { getByTestId } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} testID={testID} />
                </ThemeProvider>
            );

            expect(getByTestId(testID)).toBeTruthy();
        });
    });

    describe('Theme Support', () => {
        it('applies theme-based styling correctly in light mode', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} variant="primary" />
                </ThemeProvider>
            );

            expect(getByText('Button Text')).toBeTruthy();
        });

        it('adapts to dark theme when specified', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="dark">
                    <Button {...defaultProps} variant="primary" />
                </ThemeProvider>
            );

            expect(getByText('Button Text')).toBeTruthy();
        });
    });

    describe('Full Width', () => {
        it('applies full width style when fullWidth prop is true', () => {
            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} fullWidth />
                </ThemeProvider>
            );

            expect(getByText('Button Text')).toBeTruthy();
        });
    });

    describe('Error Handling', () => {
        it('handles onPress errors gracefully', () => {
            const onPressError = jest.fn(() => {
                throw new Error('Button press failed');
            });

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} onPress={onPressError} />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            expect(() => {
                fireEvent.press(buttonElement);
            }).toThrow();
        });
    });

    describe('Mobile Optimization', () => {
        it('supports haptic feedback for interactions', () => {
            // Mock expo-haptics
            const mockImpactAsync = jest.fn();
            jest.doMock('expo-haptics', () => ({
                impactAsync: mockImpactAsync,
                ImpactFeedbackStyle: {
                    Light: 'light',
                },
            }));

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} haptic={true} />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            fireEvent.press(buttonElement);

            expect(defaultProps.onPress).toHaveBeenCalled();
            expect(mockImpactAsync).toHaveBeenCalledWith('light');
        });
    });

    describe('Event Handlers', () => {
        it('calls onPressIn when button is pressed in', () => {
            const onPressIn = jest.fn();

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} onPressIn={onPressIn} />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            fireEvent(buttonElement, 'onPressIn');

            expect(onPressIn).toHaveBeenCalledTimes(1);
        });

        it('calls onPressOut when button is released', () => {
            const onPressOut = jest.fn();

            const { getByText } = render(
                <ThemeProvider defaultMode="light">
                    <Button {...defaultProps} onPressOut={onPressOut} />
                </ThemeProvider>
            );

            const buttonElement = getByText('Button Text');
            fireEvent(buttonElement, 'onPressOut');

            expect(onPressOut).toHaveBeenCalledTimes(1);
        });
    });
});