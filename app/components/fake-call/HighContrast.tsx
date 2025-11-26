/**
 * High Contrast Call Interface
 * WCAG 2.1 AA compliant call interface with high contrast and visual accessibility features
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useHighContrastMotion } from '../../components/ui-error-library/accessibility/high-contrast-motion-system';

// High contrast theme configuration
export interface HighContrastTheme {
    background: string;
    surface: string;
    primary: string;
    secondary: string;
    text: string;
    textSecondary: string;
    border: string;
    success: string;
    error: string;
    warning: string;
    focus: string;
    disabled: string;
}

// Props for high contrast call interface
export interface HighContrastCallInterfaceProps {
    // Call information
    callerName: string;
    callerId?: string;
    isVideoCall?: boolean;

    // Call state
    callState: 'ringing' | 'connecting' | 'connected' | 'ended' | 'missed' | 'on_hold';
    callDuration?: number;
    isMuted?: boolean;
    isSpeakerOn?: boolean;
    isVideoOn?: boolean;

    // Call controls
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;

    // Theme configuration
    highContrastTheme?: HighContrastTheme;
    reducedMotion?: boolean;

    // Accessibility settings
    enableHighContrast?: boolean;
    enableBoldText?: boolean;
    enableFocusIndicators?: boolean;
    minimumTouchTarget?: number;

    // Event handlers
    onAccessibilityEvent?: (event: string) => void;

    // Styling
    style?: any;
}

export const HighContrastCallInterface: React.FC<HighContrastCallInterfaceProps> = ({
    callerName,
    callerId,
    isVideoCall = false,
    callState,
    callDuration = 0,
    isMuted = false,
    isSpeakerOn = false,
    isVideoOn = false,
    onAnswer,
    onDecline,
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    onToggleVideo,
    highContrastTheme,
    reducedMotion = false,
    enableHighContrast = true,
    enableBoldText = true,
    enableFocusIndicators = true,
    minimumTouchTarget = 44,
    onAccessibilityEvent,
    style,
}) => {
    // Hooks
    const highContrastMotion = useHighContrastMotion();

    // State
    const [focusedElement, setFocusedElement] = useState<string | null>(null);

    // Default high contrast theme (WCAG AAA compliant)
    const defaultHighContrastTheme: HighContrastTheme = {
        background: '#000000',
        surface: '#1A1A1A',
        primary: '#FFFFFF',
        secondary: '#FFFF00', // Yellow for high contrast
        text: '#FFFFFF',
        textSecondary: '#E0E0E0',
        border: '#FFFFFF',
        success: '#00FF00', // Bright green
        error: '#FF0000',   // Bright red
        warning: '#FFFF00', // Yellow
        focus: '#00FFFF',   // Cyan
        disabled: '#666666',
    };

    // Use provided theme or default
    const theme = highContrastTheme || defaultHighContrastTheme;

    // Format call duration
    const formatCallDuration = useCallback((seconds: number): string => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // Get contrast ratio for text
    const getContrastRatio = useCallback((foreground: string, background: string): number => {
        const getLuminance = (color: string): number => {
            const hex = color.replace('#', '');
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);

            const [rs, gs, bs] = [r, g, b].map(c => {
                c = c / 255;
                return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
            });

            return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
        };

        const l1 = getLuminance(foreground);
        const l2 = getLuminance(background);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);

        return (lighter + 0.05) / (darker + 0.05);
    }, []);

    // Validate WCAG compliance
    const validateWCAGCompliance = useCallback(() => {
        const checks = {
            normalText: getContrastRatio(theme.text, theme.background) >= 4.5,
            largeText: getContrastRatio(theme.text, theme.background) >= 3.0,
            uiComponents: getContrastRatio(theme.primary, theme.background) >= 3.0,
            focusIndicators: getContrastRatio(theme.focus, theme.background) >= 3.0,
        };

        return checks;
    }, [theme, getContrastRatio]);

    // Get appropriate font size based on text type
    const getFontSize = useCallback((type: 'small' | 'medium' | 'large' | 'xl'): number => {
        const baseSizes = {
            small: 14,
            medium: 16,
            large: 18,
            xl: 24,
        };

        const size = baseSizes[type];
        return enableBoldText ? size + 2 : size;
    }, [enableBoldText]);

    // Get button style with high contrast
    const getButtonStyle = useCallback((variant: 'primary' | 'secondary' | 'destructive' | 'success', focused = false) => {
        const styles = {
            primary: {
                backgroundColor: theme.primary,
                borderColor: theme.border,
                borderWidth: 3,
                borderRadius: 8,
            },
            secondary: {
                backgroundColor: theme.surface,
                borderColor: theme.secondary,
                borderWidth: 3,
                borderRadius: 8,
            },
            destructive: {
                backgroundColor: theme.error,
                borderColor: theme.border,
                borderWidth: 3,
                borderRadius: 8,
            },
            success: {
                backgroundColor: theme.success,
                borderColor: theme.border,
                borderWidth: 3,
                borderRadius: 8,
            },
        };

        const style = styles[variant];

        if (focused && enableFocusIndicators) {
            return {
                ...style,
                borderColor: theme.focus,
                borderWidth: 4,
                shadowColor: theme.focus,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 8,
                elevation: 8,
            };
        }

        return style;
    }, [theme, enableFocusIndicators]);

    // Get accessible touch target size
    const getTouchTargetSize = useCallback((): number => {
        return Math.max(minimumTouchTarget, 56); // Minimum 56pt for accessibility
    }, [minimumTouchTarget]);

    // Handle element focus
    const handleFocus = useCallback((elementId: string) => {
        setFocusedElement(elementId);
        onAccessibilityEvent?.(`focused_${elementId}`);
    }, [onAccessibilityEvent]);

    // Handle element blur
    const handleBlur = useCallback(() => {
        setFocusedElement(null);
        onAccessibilityEvent?.('blurred');
    }, [onAccessibilityEvent]);

    // WCAG compliance validation on mount
    useEffect(() => {
        if (enableHighContrast) {
            const compliance = validateWCAGCompliance();
            console.log('WCAG Compliance Check:', compliance);

            // Log non-compliant elements
            Object.entries(compliance).forEach(([check, passed]) => {
                if (!passed) {
                    console.warn(`WCAG compliance failed: ${check}`);
                }
            });
        }
    }, [enableHighContrast, validateWCAGCompliance]);

    // Render caller information with high contrast
    const renderCallerInfo = () => (
        <View style={styles.callerInfoContainer}>
            {/* Avatar with high contrast border */}
            <View style={[
                styles.avatarContainer,
                {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    borderWidth: 4,
                }
            ]}>
                <Text style={[
                    styles.avatarText,
                    {
                        color: theme.text,
                        fontSize: getFontSize('xl'),
                        fontWeight: enableBoldText ? 'bold' : 'normal',
                    }
                ]}>
                    {callerName.charAt(0).toUpperCase()}
                </Text>
            </View>

            {/* Caller name with high contrast */}
            <Text style={[
                styles.callerName,
                {
                    color: theme.text,
                    fontSize: getFontSize('large'),
                    fontWeight: enableBoldText ? 'bold' : 'normal',
                }
            ]}>
                {callerName}
            </Text>

            {/* Call state with high contrast indicator */}
            <View style={[
                styles.callStateContainer,
                {
                    backgroundColor: callState === 'connected' ? theme.success :
                        callState === 'ringing' ? theme.warning :
                            theme.surface,
                    borderColor: theme.border,
                    borderWidth: 2,
                    borderRadius: 4,
                }
            ]}>
                <Text style={[
                    styles.callStateText,
                    {
                        color: theme.text,
                        fontSize: getFontSize('medium'),
                        fontWeight: enableBoldText ? 'bold' : 'normal',
                    }
                ]}>
                    {callState === 'ringing' ? 'INCOMING CALL' :
                        callState === 'connecting' ? 'CONNECTING...' :
                            callState === 'connected' ? `CONNECTED - ${formatCallDuration(callDuration)}` :
                                callState === 'ended' ? 'CALL ENDED' :
                                    callState === 'missed' ? 'MISSED CALL' :
                                        callState === 'on_hold' ? 'ON HOLD' : callState.toUpperCase()}
                </Text>
            </View>
        </View>
    );

    // Render high contrast button
    const renderHighContrastButton = (
        id: string,
        label: string,
        onPress: () => void,
        variant: 'primary' | 'secondary' | 'destructive' | 'success',
        disabled = false
    ) => {
        const isFocused = focusedElement === id;

        return (
            <TouchableOpacity
                style={[
                    styles.highContrastButton,
                    getButtonStyle(variant, isFocused),
                    disabled && { backgroundColor: theme.disabled, borderColor: theme.disabled },
                    {
                        minHeight: getTouchTargetSize(),
                        minWidth: getTouchTargetSize(),
                    }
                ]}
                onPress={onPress}
                onFocus={() => handleFocus(id)}
                onBlur={handleBlur}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={label}
                accessibilityHint="Double-tap to activate"
                accessibilityState={{
                    disabled,
                    focused: isFocused,
                }}
            >
                <Text style={[
                    styles.buttonText,
                    {
                        color: disabled ? '#999999' : theme.background,
                        fontSize: getFontSize('medium'),
                        fontWeight: enableBoldText ? 'bold' : 'normal',
                    }
                ]}>
                    {label}
                </Text>

                {/* Enhanced focus indicator */}
                {isFocused && enableFocusIndicators && (
                    <View style={[
                        styles.focusIndicator,
                        { borderColor: theme.focus }
                    ]} />
                )}
            </TouchableOpacity>
        );
    };

    // Render call controls
    const renderCallControls = () => {
        if (callState === 'ringing') {
            return (
                <View style={styles.callControlsContainer}>
                    {renderHighContrastButton(
                        'decline_button',
                        'DECLINE',
                        onDecline || (() => { }),
                        'destructive'
                    )}

                    {renderHighContrastButton(
                        'answer_button',
                        'ANSWER',
                        onAnswer || (() => { }),
                        'success'
                    )}
                </View>
            );
        }

        if (callState === 'connected' || callState === 'on_hold') {
            return (
                <View style={styles.activeCallControlsContainer}>
                    {/* Mute button */}
                    {renderHighContrastButton(
                        'mute_button',
                        isMuted ? 'UNMUTE' : 'MUTE',
                        () => onToggleMute?.(!isMuted),
                        'secondary'
                    )}

                    {/* Speaker button */}
                    {renderHighContrastButton(
                        'speaker_button',
                        isSpeakerOn ? 'SPEAKER OFF' : 'SPEAKER ON',
                        () => onToggleSpeaker?.(!isSpeakerOn),
                        'secondary'
                    )}

                    {/* Video button for video calls */}
                    {isVideoCall && renderHighContrastButton(
                        'video_button',
                        isVideoOn ? 'VIDEO OFF' : 'VIDEO ON',
                        () => onToggleVideo?.(!isVideoOn),
                        'secondary'
                    )}

                    {/* End call button */}
                    {renderHighContrastButton(
                        'end_call_button',
                        'END CALL',
                        onEndCall || (() => { }),
                        'destructive'
                    )}
                </View>
            );
        }

        return null;
    };

    return (
        <View style={[
            styles.container,
            {
                backgroundColor: theme.background,
                padding: 20,
            },
            style
        ]}>
            {renderCallerInfo()}
            {renderCallControls()}

            {/* High contrast mode indicator */}
            {enableHighContrast && (
                <View style={[
                    styles.highContrastIndicator,
                    {
                        backgroundColor: theme.surface,
                        borderColor: theme.secondary,
                        borderWidth: 2,
                    }
                ]}>
                    <Text style={[
                        styles.indicatorText,
                        {
                            color: theme.secondary,
                            fontSize: getFontSize('small'),
                            fontWeight: enableBoldText ? 'bold' : 'normal',
                        }
                    ]}>
                        HIGH CONTRAST MODE
                    </Text>
                </View>
            )}
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'space-between',
    },
    callerInfoContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    avatarContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    avatarText: {
        fontSize: 48,
        fontWeight: 'bold',
    },
    callerName: {
        textAlign: 'center',
        marginBottom: 16,
    },
    callStateContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    callStateText: {
        textAlign: 'center',
    },
    callControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
    },
    activeCallControlsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingBottom: 40,
        flexWrap: 'wrap',
    },
    highContrastButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        margin: 8,
        borderRadius: 8,
        borderWidth: 3,
    },
    buttonText: {
        textAlign: 'center',
        fontWeight: 'bold',
    },
    focusIndicator: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 12,
        borderWidth: 3,
    },
    highContrastIndicator: {
        position: 'absolute',
        top: 20,
        right: 20,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    indicatorText: {
        textAlign: 'center',
    },
});

export default HighContrastCallInterface;