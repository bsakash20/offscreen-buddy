/**
 * Motor Accessibility Enhancements for Fake Call System
 * Alternative interaction methods for users with motor impairments
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, AccessibilityInfo, Alert } from 'react-native';
import { useDynamicType } from '../../components/ui-error-library/accessibility/enhanced-hooks';

// Motor accessibility configuration
export interface MotorAccessibilityConfig {
    enabled: boolean;
    largeTouchTargets: boolean;
    switchControlSupport: boolean;
    eyeTrackingSupport: boolean;
    gestureAlternatives: boolean;
    timeoutExtensions: boolean;
    dwellControlSupport: boolean;
    assistiveTechnologyIntegration: boolean;
}

// Alternative interaction modes
export type InteractionMode =
    | 'standard'
    | 'large_targets'
    | 'switch_control'
    | 'dwell_control'
    | 'voice_control'
    | 'eye_tracking'
    | 'single_switch';

// Switch control configuration
export interface SwitchControlConfig {
    enabled: boolean;
    autoScan: boolean;
    scanSpeed: number;
    highlightFocus: boolean;
    selectionDelay: number;
    reverseScanning: boolean;
}

// Props for the motor accessibility enhancements
export interface MotorAccessibilityEnhancementsProps {
    // Call context
    callState: string;
    onAnswer?: () => void;
    onDecline?: () => void;
    onEndCall?: () => void;
    onToggleMute?: (muted: boolean) => void;
    onToggleSpeaker?: (speakerOn: boolean) => void;
    onToggleVideo?: (videoOn: boolean) => void;

    // Configuration
    config: MotorAccessibilityConfig;
    interactionMode: InteractionMode;
    switchConfig: SwitchControlConfig;

    // Event handlers
    onInteractionModeChange?: (mode: InteractionMode) => void;
    onAlternativeInput?: (action: string, value: any) => void;
    onAccessibilityEvent?: (event: string) => void;

    // Styling
    style?: any;
    theme?: any;
}

export const MotorAccessibilityEnhancements: React.FC<MotorAccessibilityEnhancementsProps> = ({
    callState,
    onAnswer,
    onDecline,
    onEndCall,
    onToggleMute,
    onToggleSpeaker,
    onToggleVideo,
    config,
    interactionMode,
    switchConfig,
    onInteractionModeChange,
    onAlternativeInput,
    onAccessibilityEvent,
    style,
    theme,
}) => {
    // Hooks
    const { getMinimumTouchSize } = useDynamicType();

    // State
    const [currentFocus, setCurrentFocus] = useState<string>('answer_button');
    const [isScanning, setIsScanning] = useState(false);
    const [scanDirection, setScanDirection] = useState<'forward' | 'backward'>('forward');
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [dwellTime, setDwellTime] = useState(0);
    const [interactionHistory, setInteractionHistory] = useState<string[]>([]);

    // Refs
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const dwellTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastInteractionRef = useRef<number>(Date.now());

    // Get available call controls based on call state
    const getAvailableControls = useCallback(() => {
        const controls = [];

        switch (callState) {
            case 'ringing':
                controls.push(
                    { id: 'answer_button', label: 'Answer Call', action: onAnswer },
                    { id: 'decline_button', label: 'Decline Call', action: onDecline }
                );
                break;
            case 'connected':
            case 'on_hold':
                controls.push(
                    { id: 'mute_button', label: isMuted ? 'Unmute' : 'Mute', action: () => onToggleMute?.(!isMuted) },
                    { id: 'speaker_button', label: isSpeakerOn ? 'Speaker Off' : 'Speaker On', action: () => onToggleSpeaker?.(!isSpeakerOn) },
                    { id: 'end_call_button', label: 'End Call', action: onEndCall }
                );
                break;
        }

        return controls;
    }, [callState, onAnswer, onDecline, onEndCall, onToggleMute, onToggleSpeaker, isMuted, isSpeakerOn]);

    // Get minimum touch target size based on accessibility settings
    const getTouchTargetSize = useCallback(() => {
        if (!config.largeTouchTargets && interactionMode !== 'large_targets') {
            return getMinimumTouchSize();
        }

        switch (interactionMode) {
            case 'large_targets':
                return Math.max(getMinimumTouchSize() * 1.5, 64);
            case 'switch_control':
            case 'dwell_control':
                return Math.max(getMinimumTouchSize() * 2, 80);
            default:
                return getMinimumTouchSize();
        }
    }, [config.largeTouchTargets, interactionMode, getMinimumTouchSize]);

    // Calculate interaction timeout based on user preferences
    const getInteractionTimeout = useCallback(() => {
        if (!config.timeoutExtensions) return 5000; // 5 seconds default

        // Extend timeout for motor accessibility users
        return 15000; // 15 seconds for motor accessibility
    }, [config.timeoutExtensions]);

    // Start switch control scanning
    const startSwitchScanning = useCallback(() => {
        if (!switchConfig.autoScan || !config.switchControlSupport) return;

        setIsScanning(true);
        const scanSpeed = switchConfig.scanSpeed || 2000; // 2 seconds default

        scanIntervalRef.current = setInterval(() => {
            const controls = getAvailableControls();
            const currentIndex = controls.findIndex(control => control.id === currentFocus);

            let nextIndex;
            if (scanDirection === 'forward') {
                nextIndex = (currentIndex + 1) % controls.length;
            } else {
                nextIndex = currentIndex === 0 ? controls.length - 1 : currentIndex - 1;
            }

            setCurrentFocus(controls[nextIndex].id);
        }, scanSpeed);
    }, [switchConfig, config.switchControlSupport, scanDirection, currentFocus, getAvailableControls]);

    // Stop switch control scanning
    const stopSwitchScanning = useCallback(() => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        setIsScanning(false);
    }, []);

    // Handle switch activation
    const handleSwitchActivation = useCallback(() => {
        const now = Date.now();
        const timeSinceLastInteraction = now - lastInteractionRef.current;

        if (timeSinceLastInteraction < 500) {
            // Debounce rapid switch activations
            return;
        }

        lastInteractionRef.current = now;

        if (isScanning) {
            // Select current focused element
            setSelectedElement(currentFocus);
            handleElementActivation(currentFocus);
        } else {
            // Single switch - cycle through elements
            const controls = getAvailableControls();
            const currentIndex = controls.findIndex(control => control.id === currentFocus);
            const nextIndex = (currentIndex + 1) % controls.length;
            setCurrentFocus(controls[nextIndex].id);
        }
    }, [isScanning, currentFocus, getAvailableControls]);

    // Handle element activation
    const handleElementActivation = useCallback((elementId: string) => {
        const controls = getAvailableControls();
        const control = controls.find(c => c.id === elementId);

        if (control) {
            try {
                control.action();

                // Announce selection for screen readers
                onAlternativeInput?.('activation', { elementId, action: control.label });
                onAccessibilityEvent?.(`activated_${elementId}`);

                // Add to interaction history
                setInteractionHistory(prev => [...prev.slice(-4), elementId]);

            } catch (error) {
                console.error('Error activating element:', elementId, error);
                onAccessibilityEvent?.(`error_${elementId}`);
            }
        }
    }, [getAvailableControls, onAlternativeInput, onAccessibilityEvent]);

    // Dwell control handling
    const startDwellTimer = useCallback((elementId: string) => {
        if (!config.dwellControlSupport) return;

        const dwellThreshold = switchConfig.selectionDelay || 2000; // 2 seconds default

        dwellTimeoutRef.current = setTimeout(() => {
            handleElementActivation(elementId);
            setDwellTime(0);
        }, dwellThreshold);

        setDwellTime(0);

        // Animate dwell progress
        const interval = setInterval(() => {
            setDwellTime(prev => {
                const newTime = prev + 100;
                if (newTime >= dwellThreshold) {
                    clearInterval(interval);
                    return dwellThreshold;
                }
                return newTime;
            });
        }, 100);
    }, [config.dwellControlSupport, switchConfig.selectionDelay, handleElementActivation]);

    // Cancel dwell timer
    const cancelDwellTimer = useCallback(() => {
        if (dwellTimeoutRef.current) {
            clearTimeout(dwellTimeoutRef.current);
            dwellTimeoutRef.current = null;
        }
        setDwellTime(0);
    }, []);

    // Get alternative interaction method description
    const getAlternativeInteractionDescription = useCallback((elementId: string): string => {
        const descriptions = {
            'answer_button': interactionMode === 'switch_control'
                ? 'Press switch to answer call'
                : 'Point and dwell to answer call',
            'decline_button': interactionMode === 'switch_control'
                ? 'Press switch to decline call'
                : 'Point and dwell to decline call',
            'mute_button': interactionMode === 'switch_control'
                ? 'Press switch to toggle mute'
                : 'Point and dwell to toggle mute',
            'speaker_button': interactionMode === 'switch_control'
                ? 'Press switch to toggle speaker'
                : 'Point and dwell to toggle speaker',
            'end_call_button': interactionMode === 'switch_control'
                ? 'Press switch to end call'
                : 'Point and dwell to end call',
        };

        return descriptions[elementId as keyof typeof descriptions] || 'Alternative interaction available';
    }, [interactionMode]);

    // Effects
    useEffect(() => {
        if (switchConfig.autoScan && config.switchControlSupport) {
            startSwitchScanning();
        }

        return () => {
            stopSwitchScanning();
        };
    }, [switchConfig.autoScan, config.switchControlSupport, startSwitchScanning, stopSwitchScanning]);

    useEffect(() => {
        // Auto-switch to appropriate interaction mode based on system settings
        const checkMotorAccessibilitySettings = async () => {
            try {
                const isSwitchControlEnabled = await AccessibilityInfo.isSwitchControlEnabled();
                const isVoiceControlEnabled = await AccessibilityInfo.isVoiceOverRunning();

                if (isSwitchControlEnabled && config.switchControlSupport) {
                    onInteractionModeChange?.('switch_control');
                } else if (isVoiceControlEnabled) {
                    onInteractionModeChange?.('voice_control');
                }
            } catch (error) {
                console.error('Error checking accessibility settings:', error);
            }
        };

        checkMotorAccessibilitySettings();
    }, [config.switchControlSupport, onInteractionModeChange]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
            if (dwellTimeoutRef.current) clearTimeout(dwellTimeoutRef.current);
        };
    }, []);

    // Render motor accessibility enhanced controls
    const renderEnhancedControls = () => {
        const controls = getAvailableControls();
        const touchTargetSize = getTouchTargetSize();

        return (
            <View style={styles.enhancedControlsContainer}>
                {controls.map((control) => (
                    <TouchableOpacity
                        key={control.id}
                        style={[
                            styles.enhancedControl,
                            {
                                width: touchTargetSize,
                                height: touchTargetSize,
                                backgroundColor: currentFocus === control.id ? '#007AFF' : '#E5E5E7',
                                borderWidth: currentFocus === control.id ? 3 : 1,
                                borderColor: currentFocus === control.id ? '#0056CC' : '#CCCCCC',
                                opacity: selectedElement === control.id ? 0.7 : 1,
                            }
                        ]}
                        onPressIn={() => startDwellTimer(control.id)}
                        onPressOut={cancelDwellTimer}
                        onLongPress={() => handleElementActivation(control.id)}
                        accessibilityRole="button"
                        accessibilityLabel={control.label}
                        accessibilityHint={getAlternativeInteractionDescription(control.id)}
                        accessibilityState={{
                            focused: currentFocus === control.id,
                            selected: selectedElement === control.id,
                            busy: isScanning,
                        }}
                    >
                        <Text style={[
                            styles.controlLabel,
                            {
                                color: currentFocus === control.id ? '#FFFFFF' : '#000000',
                                fontSize: touchTargetSize * 0.15,
                            }
                        ]}>
                            {control.label}
                        </Text>

                        {/* Dwell progress indicator */}
                        {interactionMode === 'dwell_control' && dwellTime > 0 && (
                            <View style={[
                                styles.dwellProgress,
                                {
                                    width: touchTargetSize,
                                    height: Math.max(dwellTime / 2000 * touchTargetSize, 2),
                                }
                            ]} />
                        )}

                        {/* Scanning highlight */}
                        {isScanning && currentFocus === control.id && (
                            <View style={styles.scanningHighlight} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    // Render interaction mode indicator
    const renderModeIndicator = () => (
        <View style={[
            styles.modeIndicator,
            {
                backgroundColor: theme?.colors?.surface || '#F5F5F5',
                borderColor: theme?.colors?.border || '#CCCCCC',
            }
        ]}>
            <Text style={[
                styles.modeText,
                { color: theme?.colors?.text || '#000000' }
            ]}>
                Interaction Mode: {interactionMode.replace('_', ' ').toUpperCase()}
            </Text>

            {isScanning && (
                <Text style={[
                    styles.scanningText,
                    { color: theme?.colors?.primary || '#007AFF' }
                ]}>
                    🔄 Scanning...
                </Text>
            )}

            {interactionHistory.length > 0 && (
                <Text style={[
                    styles.historyText,
                    { color: theme?.colors?.textSecondary || '#666666' }
                ]}>
                    Recent: {interactionHistory.join(', ')}
                </Text>
            )}
        </View>
    );

    return (
        <View style={[
            styles.container,
            style
        ]}>
            {renderEnhancedControls()}
            {renderModeIndicator()}

            {/* Hidden interaction handlers for alternative input methods */}
            <View style={styles.hiddenHandlers}>
                {/* Single switch activation handler */}
                <TouchableOpacity
                    accessibilityLabel="Single switch activation"
                    onPress={handleSwitchActivation}
                    style={{ width: 1, height: 1, opacity: 0 }}
                />
            </View>
        </View>
    );
};

// Styles
const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    enhancedControlsContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 40,
        flexWrap: 'wrap',
    },
    enhancedControl: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        margin: 8,
        position: 'relative',
        overflow: 'hidden',
    },
    controlLabel: {
        fontWeight: '600',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    dwellProgress: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(0, 122, 255, 0.3)',
        borderRadius: 2,
    },
    scanningHighlight: {
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#FFD700',
        borderStyle: 'dashed',
    },
    modeIndicator: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
    },
    modeText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    scanningText: {
        fontSize: 12,
        fontStyle: 'italic',
        marginBottom: 2,
    },
    historyText: {
        fontSize: 10,
    },
    hiddenHandlers: {
        position: 'absolute',
        width: 1,
        height: 1,
        opacity: 0,
    },
});

// Hook for motor accessibility utilities
export const useMotorAccessibility = () => {
    const [isEnabled, setIsEnabled] = useState(false);
    const [preference, setPreference] = useState<InteractionMode>('standard');

    const enable = useCallback(() => setIsEnabled(true), []);
    const disable = useCallback(() => setIsEnabled(false), []);
    const setMode = useCallback((mode: InteractionMode) => setPreference(mode), []);

    return {
        isEnabled,
        preference,
        enable,
        disable,
        setMode,
    };
};

export default MotorAccessibilityEnhancements;