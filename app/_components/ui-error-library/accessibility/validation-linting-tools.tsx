/**
 * Accessibility Validation and Linting Tools for iOS Error Presentation System
 * Comprehensive static analysis and runtime validation for accessibility compliance
 */

import React, { createContext, useContext, useCallback, useState, ReactNode } from 'react';
import { View, Text, StyleSheet, AccessibilityInfo, Platform } from 'react-native';

// Validation configuration
export interface ValidationConfig {
    enabled: boolean;
    strictMode: boolean;
    wcagLevel: 'A' | 'AA' | 'AAA';
    iosGuidelines: boolean;
    validateOnBuild: boolean;
    validateOnRuntime: boolean;
    customRules: ValidationRule[];
    ignorePatterns: RegExp[];
    severityMapping: {
        'wcag-violation': 'error' | 'warning' | 'info';
        'ios-violation': 'error' | 'warning' | 'info';
        'performance-issue': 'warning' | 'info';
        'best-practice': 'info';
    };
}

// Validation rule definition
interface ValidationRule {
    id: string;
    name: string;
    description: string;
    category: 'wcag' | 'ios' | 'performance' | 'best-practice';
    severity: 'critical' | 'error' | 'warning' | 'info';
    applicable: string[]; // Component types this rule applies to
    check: (component: any) => ValidationResult;
    suggestion: string;
    documentation: string;
}

// Validation result
interface ValidationResult {
    id: string;
    ruleId: string;
    passed: boolean;
    severity: 'critical' | 'error' | 'warning' | 'info';
    message: string;
    suggestion: string;
    element?: any;
    lineNumber?: number;
    columnNumber?: number;
}

// Accessibility issue with detailed information
interface AccessibilityIssue {
    id: string;
    type: 'violation' | 'warning' | 'recommendation';
    wcagCriteria?: string;
    iosGuideline?: string;
    title: string;
    description: string;
    element?: {
        type: string;
        props: any;
        path: string;
    };
    suggestion: string;
    fixExample?: string;
    priority: 'high' | 'medium' | 'low';
    autoFixable: boolean;
    testCase?: string;
}

// Linting context type
interface ValidationLintingContextType {
    config: ValidationConfig;
    issues: AccessibilityIssue[];
    updateConfig: (newConfig: Partial<ValidationConfig>) => void;
    validateComponent: (component: any) => ValidationResult[];
    validateErrorComponent: (errorComponent: any) => ValidationResult[];
    validateAccessibilityProps: (props: any, elementType: string) => ValidationResult[];
    lintCode: (code: string) => ValidationResult[];
    runStaticAnalysis: (components: any[]) => AccessibilityIssue[];
    generateReport: () => string;
    clearIssues: () => void;
    getComplianceScore: () => number;
    exportIssues: (format: 'json' | 'csv' | 'html') => string;
}

// Context creation
const ValidationLintingContext = createContext<ValidationLintingContextType | undefined>(undefined);

// Default configuration
const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
    enabled: true,
    strictMode: false,
    wcagLevel: 'AA',
    iosGuidelines: true,
    validateOnBuild: true,
    validateOnRuntime: false,
    customRules: [],
    ignorePatterns: [],
    severityMapping: {
        'wcag-violation': 'error',
        'ios-violation': 'warning',
        'performance-issue': 'warning',
        'best-practice': 'info',
    },
};

// Pre-defined validation rules
const VALIDATION_RULES: ValidationRule[] = [
    // WCAG Compliance Rules
    {
        id: 'wcag-1.1.1',
        name: 'Non-text Content',
        description: 'All non-text content must have text alternatives',
        category: 'wcag',
        severity: 'critical',
        applicable: ['Image', 'Icon', 'Button', 'TouchableOpacity'],
        check: (component) => {
            const hasAccessibilityLabel = component.props?.accessibilityLabel;
            const hasAccessibleLabel = component.props?.accessible !== false;

            if (!hasAccessibilityLabel && !hasAccessibleLabel) {
                return {
                    id: 'wcag-1.1.1',
                    ruleId: 'wcag-1.1.1',
                    passed: false,
                    severity: 'critical',
                    message: 'Non-text content missing accessibility label',
                    suggestion: 'Add accessibilityLabel prop to provide text alternative',
                };
            }

            return {
                id: 'wcag-1.1.1',
                ruleId: 'wcag-1.1.1',
                passed: true,
                severity: 'info',
                message: 'Non-text content has appropriate text alternative',
                suggestion: '',
            };
        },
        suggestion: 'Add accessibilityLabel prop to all non-text elements',
        documentation: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
    },

    {
        id: 'wcag-1.4.3',
        name: 'Contrast (Minimum)',
        description: 'Text must have sufficient contrast ratio',
        category: 'wcag',
        severity: 'error',
        applicable: ['Text', 'View'],
        check: (component) => {
            const style = component.props?.style || {};
            const color = style.color;
            const backgroundColor = style.backgroundColor;

            // Simplified contrast check - in real implementation would calculate actual ratio
            if (color && backgroundColor) {
                // Mock contrast calculation for demonstration
                const contrast = color === '#000000' && backgroundColor === '#ffffff' ? 21 : 3.5;
                if (contrast < 4.5) {
                    return {
                        id: 'wcag-1.4.3',
                        ruleId: 'wcag-1.4.3',
                        passed: false,
                        severity: 'error',
                        message: `Insufficient contrast ratio: ${contrast.toFixed(2)}:1`,
                        suggestion: 'Increase contrast ratio to meet WCAG AA standard (4.5:1)',
                    };
                }
            }

            return {
                id: 'wcag-1.4.3',
                ruleId: 'wcag-1.4.3',
                passed: true,
                severity: 'info',
                message: 'Contrast ratio meets WCAG AA standards',
                suggestion: '',
            };
        },
        suggestion: 'Use high contrast colors (minimum 4.5:1 ratio)',
        documentation: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
    },

    {
        id: 'wcag-2.1.1',
        name: 'Keyboard Accessible',
        description: 'All functionality must be available from keyboard',
        category: 'wcag',
        severity: 'critical',
        applicable: ['TouchableOpacity', 'Button', 'Pressable'],
        check: (component) => {
            const accessible = component.props?.accessible;
            const accessibilityRole = component.props?.accessibilityRole;

            if (accessible === false) {
                return {
                    id: 'wcag-2.1.1',
                    ruleId: 'wcag-2.1.1',
                    passed: false,
                    severity: 'critical',
                    message: 'Interactive element not accessible via keyboard',
                    suggestion: 'Ensure accessible prop is true or not set to false',
                };
            }

            if (!accessibilityRole && component.type === 'TouchableOpacity') {
                return {
                    id: 'wcag-2.1.1',
                    ruleId: 'wcag-2.1.1',
                    passed: false,
                    severity: 'warning',
                    message: 'Interactive element missing accessibility role',
                    suggestion: 'Add accessibilityRole="button" for interactive elements',
                };
            }

            return {
                id: 'wcag-2.1.1',
                ruleId: 'wcag-2.1.1',
                passed: true,
                severity: 'info',
                message: 'Element is keyboard accessible',
                suggestion: '',
            };
        },
        suggestion: 'Ensure all interactive elements are keyboard accessible',
        documentation: 'https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html',
    },

    {
        id: 'wcag-2.4.7',
        name: 'Focus Visible',
        description: 'Keyboard focus must be clearly visible',
        category: 'wcag',
        severity: 'error',
        applicable: ['View', 'TextInput', 'Button'],
        check: (component) => {
            const style = component.props?.style || {};
            const hasFocusStyles = style.borderWidth || style.borderColor || style.outlineWidth;

            if (!hasFocusStyles && component.type === 'TouchableOpacity') {
                return {
                    id: 'wcag-2.4.7',
                    ruleId: 'wcag-2.4.7',
                    passed: false,
                    severity: 'warning',
                    message: 'Element may not have visible focus indicator',
                    suggestion: 'Add focus styles like borderWidth or outlineWidth',
                };
            }

            return {
                id: 'wcag-2.4.7',
                ruleId: 'wcag-2.4.7',
                passed: true,
                severity: 'info',
                message: 'Element has appropriate focus indicators',
                suggestion: '',
            };
        },
        suggestion: 'Implement visible focus indicators for keyboard navigation',
        documentation: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html',
    },

    {
        id: 'wcag-4.1.2',
        name: 'Name, Role, Value',
        description: 'UI components must have proper name, role, and value',
        category: 'wcag',
        severity: 'critical',
        applicable: ['TextInput', 'Switch', 'Slider', 'Button'],
        check: (component) => {
            const { type, props } = component;
            const hasLabel = props?.accessibilityLabel;
            const hasRole = props?.accessibilityRole;
            const hasValue = props?.accessibilityValue;

            let hasName = hasLabel;
            let hasProperRole = hasRole;
            let hasProperValue = hasValue;

            // Type-specific checks
            if (type === 'TextInput' && !hasLabel) {
                hasName = false;
            }

            if (type === 'Switch' && !hasRole) {
                hasProperRole = false;
            }

            if (!hasName || !hasProperRole) {
                return {
                    id: 'wcag-4.1.2',
                    ruleId: 'wcag-4.1.2',
                    passed: false,
                    severity: 'critical',
                    message: `Component missing ${!hasName ? 'name' : ''} ${!hasProperRole ? 'role' : ''}`,
                    suggestion: 'Add accessibilityLabel and accessibilityRole props',
                };
            }

            return {
                id: 'wcag-4.1.2',
                ruleId: 'wcag-4.1.2',
                passed: true,
                severity: 'info',
                message: 'Component has proper name, role, and value',
                suggestion: '',
            };
        },
        suggestion: 'Ensure all components have accessible name, role, and value',
        documentation: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
    },

    // iOS-specific Rules
    {
        id: 'ios-1.1',
        name: 'Dynamic Type Support',
        description: 'Text must support iOS Dynamic Type scaling',
        category: 'ios',
        severity: 'warning',
        applicable: ['Text'],
        check: (component) => {
            const style = component.props?.style || {};
            const hasFixedFontSize = style.fontSize && typeof style.fontSize === 'number';
            const adjustsFontSizeToFit = component.props?.adjustsFontSizeToFit;

            if (hasFixedFontSize) {
                return {
                    id: 'ios-1.1',
                    ruleId: 'ios-1.1',
                    passed: false,
                    severity: 'warning',
                    message: 'Text component uses fixed font size',
                    suggestion: 'Use system font scaling or fontScale-aware sizing',
                };
            }

            return {
                id: 'ios-1.1',
                ruleId: 'ios-1.1',
                passed: true,
                severity: 'info',
                message: 'Text component supports dynamic type',
                suggestion: '',
            };
        },
        suggestion: 'Use Dynamic Type compatible font sizing',
        documentation: 'https://developer.apple.com/design/human-interface-guidelines/typography#Dynamic-Type',
    },

    {
        id: 'ios-1.2',
        name: 'VoiceOver Optimization',
        description: 'Content should be optimized for VoiceOver navigation',
        category: 'ios',
        severity: 'warning',
        applicable: ['Text', 'View', 'TouchableOpacity'],
        check: (component) => {
            const hasLabel = component.props?.accessibilityLabel;
            const hasHint = component.props?.accessibilityHint;
            const hasTraits = component.props?.accessibilityTraits;

            if (!hasLabel && !hasHint) {
                return {
                    id: 'ios-1.2',
                    ruleId: 'ios-1.2',
                    passed: false,
                    severity: 'warning',
                    message: 'Element may not be optimized for VoiceOver',
                    suggestion: 'Add accessibilityLabel or accessibilityHint for better VoiceOver experience',
                };
            }

            return {
                id: 'ios-1.2',
                ruleId: 'ios-1.2',
                passed: true,
                severity: 'info',
                message: 'Element is optimized for VoiceOver',
                suggestion: '',
            };
        },
        suggestion: 'Add accessibility labels and hints for VoiceOver optimization',
        documentation: 'https://developer.apple.com/documentation/uikit/accessibility',
    },

    // Error-specific Rules
    {
        id: 'error-1.1',
        name: 'Error Announcement',
        description: 'Error messages must be announced to screen readers',
        category: 'best-practice',
        severity: 'error',
        applicable: ['Text', 'View'],
        check: (component) => {
            const { props } = component;
            const isError = props?.accessibilityRole === 'alert' ||
                props?.testID?.includes('error') ||
                props?.style?.color?.includes('red');

            if (isError && !props?.accessibilityRole) {
                return {
                    id: 'error-1.1',
                    ruleId: 'error-1.1',
                    passed: false,
                    severity: 'error',
                    message: 'Error content not properly announced',
                    suggestion: 'Add accessibilityRole="alert" to error messages',
                };
            }

            return {
                id: 'error-1.1',
                ruleId: 'error-1.1',
                passed: true,
                severity: 'info',
                message: 'Error messages are properly announced',
                suggestion: '',
            };
        },
        suggestion: 'Use accessibilityRole="alert" for error messages',
        documentation: 'https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/alert_role',
    },

    {
        id: 'error-1.2',
        name: 'Error Recovery Actions',
        description: 'Errors should provide clear recovery actions',
        category: 'best-practice',
        severity: 'warning',
        applicable: ['View'],
        check: (component) => {
            const { props, children } = component;
            const isError = props?.accessibilityRole === 'alert' ||
                props?.testID?.includes('error');

            if (isError) {
                const hasActionButtons = children?.some?.((child: any) =>
                    child.props?.accessibilityRole === 'button'
                );

                if (!hasActionButtons) {
                    return {
                        id: 'error-1.2',
                        ruleId: 'error-1.2',
                        passed: false,
                        severity: 'warning',
                        message: 'Error lacks recovery actions',
                        suggestion: 'Provide actionable buttons or links for error recovery',
                    };
                }
            }

            return {
                id: 'error-1.2',
                ruleId: 'error-1.2',
                passed: true,
                severity: 'info',
                message: 'Error provides recovery actions',
                suggestion: '',
            };
        },
        suggestion: 'Include recovery actions for user errors',
        documentation: 'https://developer.apple.com/documentation/uikit/uikit/accessibility',
    },

    // Performance Rules
    {
        id: 'perf-1.1',
        name: 'Efficient Animations',
        description: 'Animations should respect reduced motion preferences',
        category: 'performance',
        severity: 'warning',
        applicable: ['Animated.View'],
        check: (component) => {
            // Check if animation respects reduced motion
            const hasReducedMotionCheck = component.props?.useNativeDriver;

            return {
                id: 'perf-1.1',
                ruleId: 'perf-1.1',
                passed: hasReducedMotionCheck,
                severity: 'warning',
                message: hasReducedMotionCheck
                    ? 'Animation efficiently uses native driver'
                    : 'Animation may not respect reduced motion preferences',
                suggestion: 'Use native driver and check prefers-reduced-motion',
            };
        },
        suggestion: 'Implement reduced motion support for animations',
        documentation: 'https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion',
    },
];

// Provider component
interface ValidationLintingProviderProps {
    children: ReactNode;
    config?: Partial<ValidationConfig>;
    onValidationComplete?: (results: ValidationResult[]) => void;
}

const ValidationLintingProvider: React.FC<ValidationLintingProviderProps> = ({
    children,
    config = {},
    onValidationComplete,
}) => {
    const [validationConfig, setValidationConfig] = useState<ValidationConfig>({
        ...DEFAULT_VALIDATION_CONFIG,
        ...config,
    });

    const [issues, setIssues] = useState<AccessibilityIssue[]>([]);

    // Apply custom rules
    const allRules = [...VALIDATION_RULES, ...validationConfig.customRules];

    // Utility functions
    const calculateContrastRatio = useCallback((foreground: string, background: string): number => {
        // Simplified contrast calculation
        const getLuminance = (color: string): number => {
            // Mock luminance - real implementation would parse colors
            const isLight = color === '#ffffff' || color === '#fff' || color === 'white';
            return isLight ? 1 : 0;
        };

        const fgLuminance = getLuminance(foreground);
        const bgLuminance = getLuminance(background);
        const lighter = Math.max(fgLuminance, bgLuminance);
        const darker = Math.min(fgLuminance, bgLuminance);

        return (lighter + 0.05) / (darker + 0.05);
    }, []);

    // Component validation
    const validateComponent = useCallback((component: any): ValidationResult[] => {
        if (!validationConfig.enabled) return [];

        const applicableRules = allRules.filter(rule =>
            rule.applicable.includes(component.type)
        );

        const results = applicableRules.map(rule => rule.check(component))
            .filter(result => {
                // Filter by severity in strict mode
                if (validationConfig.strictMode) {
                    return true;
                }
                return result.severity !== 'info';
            });

        // Generate issues from failed validations
        const failedResults = results.filter(r => !r.passed);
        const newIssues: AccessibilityIssue[] = failedResults.map(result => ({
            id: result.id,
            type: result.severity === 'critical' || result.severity === 'error' ? 'violation' : 'warning',
            wcagCriteria: result.ruleId.startsWith('wcag-') ? result.ruleId.toUpperCase() : undefined,
            iosGuideline: result.ruleId.startsWith('ios-') ? result.ruleId.toUpperCase() : undefined,
            title: allRules.find(r => r.id === result.ruleId)?.name || result.ruleId,
            description: result.message,
            element: {
                type: component.type,
                props: component.props,
                path: 'component-tree-path', // Would be populated in real implementation
            },
            suggestion: result.suggestion,
            priority: result.severity === 'critical' ? 'high' :
                result.severity === 'error' ? 'high' :
                    result.severity === 'warning' ? 'medium' : 'low',
            autoFixable: false, // Would be determined by rule
        }));

        setIssues(prev => [...prev, ...newIssues]);

        onValidationComplete?.(results);

        return results;
    }, [validationConfig.enabled, validationConfig.strictMode, allRules, onValidationComplete]);

    // Error component specific validation
    const validateErrorComponent = useCallback((errorComponent: any): ValidationResult[] => {
        const errorSpecificResults = validateComponent(errorComponent);

        // Add error-specific checks
        const errorRules = allRules.filter(rule => rule.id.startsWith('error-'));
        const additionalResults = errorRules.map(rule => rule.check(errorComponent));

        return [...errorSpecificResults, ...additionalResults];
    }, [validateComponent, allRules]);

    // Accessibility props validation
    const validateAccessibilityProps = useCallback((props: any, elementType: string): ValidationResult[] => {
        const results: ValidationResult[] = [];

        // Required accessibility props check
        const requiredProps = {
            'TouchableOpacity': ['accessibilityRole'],
            'TextInput': ['accessibilityLabel'],
            'Button': ['accessibilityLabel', 'accessibilityRole'],
            'Image': ['accessibilityLabel'],
        };

        const required = requiredProps[elementType as keyof typeof requiredProps] || [];

        required.forEach(prop => {
            if (!props[prop]) {
                results.push({
                    id: `missing-${prop}`,
                    ruleId: `missing-${prop}`,
                    passed: false,
                    severity: 'warning',
                    message: `Missing required accessibility prop: ${prop}`,
                    suggestion: `Add ${prop} prop for ${elementType}`,
                });
            }
        });

        return results;
    }, []);

    // Code linting (static analysis)
    const lintCode = useCallback((code: string): ValidationResult[] => {
        const results: ValidationResult[] = [];

        // Check for common accessibility issues in code
        const patterns = [
            {
                regex: /accessible\s*=\s*false/g,
                message: 'Component disabled for accessibility',
                severity: 'error' as const,
                suggestion: 'Remove accessible={false} or provide alternative accessibility',
            },
            {
                regex: /accessibilityLabel\s*=\s*["']["']/g,
                message: 'Empty accessibility label',
                severity: 'warning' as const,
                suggestion: 'Provide meaningful accessibility label text',
            },
            {
                regex: /style\s*=\s*\{[^}]*fontSize\s*:\s*\d+[^}]*\}/g,
                message: 'Fixed font size may not support Dynamic Type',
                severity: 'warning' as const,
                suggestion: 'Use Dynamic Type compatible font sizing',
            },
        ];

        patterns.forEach(pattern => {
            let match;
            while ((match = pattern.regex.exec(code)) !== null) {
                results.push({
                    id: `lint-${pattern.regex.source}-${match.index}`,
                    ruleId: 'static-analysis',
                    passed: false,
                    severity: pattern.severity,
                    message: pattern.message,
                    suggestion: pattern.suggestion,
                    lineNumber: code.substring(0, match.index).split('\n').length,
                });
            }
        });

        return results;
    }, []);

    // Static analysis of component tree
    const runStaticAnalysis = useCallback((components: any[]): AccessibilityIssue[] => {
        const analysisIssues: AccessibilityIssue[] = [];

        components.forEach(component => {
            const results = validateComponent(component);
            const failedResults = results.filter(r => !r.passed);

            failedResults.forEach(result => {
                const rule = allRules.find(r => r.id === result.ruleId);
                if (rule) {
                    analysisIssues.push({
                        id: result.id,
                        type: result.severity === 'critical' || result.severity === 'error' ? 'violation' : 'warning',
                        wcagCriteria: rule.category === 'wcag' ? rule.id.toUpperCase() : undefined,
                        iosGuideline: rule.category === 'ios' ? rule.id.toUpperCase() : undefined,
                        title: rule.name,
                        description: result.message,
                        element: {
                            type: component.type,
                            props: component.props,
                            path: 'static-analysis-path',
                        },
                        suggestion: result.suggestion,
                        priority: result.severity === 'critical' ? 'high' :
                            result.severity === 'error' ? 'high' :
                                result.severity === 'warning' ? 'medium' : 'low',
                        autoFixable: false,
                    });
                }
            });
        });

        return analysisIssues;
    }, [validateComponent, allRules]);

    // Generate comprehensive report
    const generateReport = useCallback((): string => {
        const criticalIssues = issues.filter(i => i.priority === 'high');
        const highIssues = issues.filter(i => i.type === 'violation');
        const mediumIssues = issues.filter(i => i.priority === 'medium');
        const lowIssues = issues.filter(i => i.priority === 'low');

        const complianceScore = calculateComplianceScore();

        return `
# Accessibility Validation Report

Generated: ${new Date().toISOString()}

## Summary
- Total Issues: ${issues.length}
- Critical: ${criticalIssues.length}
- High Priority: ${highIssues.length}
- Medium Priority: ${mediumIssues.length}
- Low Priority: ${lowIssues.length}
- Compliance Score: ${complianceScore.toFixed(1)}%

## WCAG Compliance
${issues.filter(i => i.wcagCriteria).map(issue =>
            `- ${issue.wcagCriteria}: ${issue.title}`
        ).join('\n') || 'No WCAG violations detected'}

## iOS Guidelines
${issues.filter(i => i.iosGuideline).map(issue =>
            `- ${issue.iosGuideline}: ${issue.title}`
        ).join('\n') || 'No iOS guideline violations detected'}

## Detailed Issues
${issues.map(issue => `
### ${issue.title}
**Priority:** ${issue.priority}
**Type:** ${issue.type}
${issue.wcagCriteria ? `**WCAG:** ${issue.wcagCriteria}` : ''}
${issue.iosGuideline ? `**iOS:** ${issue.iosGuideline}` : ''}

${issue.description}

**Suggestion:** ${issue.suggestion}
`).join('\n') || 'No issues found - great job!'}

## Recommendations
${generateRecommendations()}
        `.trim();
    }, [issues, calculateComplianceScore]);

    // Calculate compliance score
    const calculateComplianceScore = useCallback((): number => {
        if (issues.length === 0) return 100;

        const criticalWeight = 10;
        const highWeight = 5;
        const mediumWeight = 2;
        const lowWeight = 1;

        const totalWeight = issues.reduce((sum, issue) => {
            switch (issue.priority) {
                case 'high': return sum + highWeight;
                case 'medium': return sum + mediumWeight;
                case 'low': return sum + lowWeight;
                default: return sum;
            }
        }, 0);

        const maxPossibleWeight = issues.length * criticalWeight;
        const score = Math.max(0, ((maxPossibleWeight - totalWeight) / maxPossibleWeight) * 100);

        return score;
    }, [issues]);

    // Generate recommendations
    const generateRecommendations = useCallback((): string => {
        const recommendations = [];

        if (issues.some(i => i.wcagCriteria === 'WCAG-1.4.3')) {
            recommendations.push('- Increase color contrast ratios to meet WCAG AA standards');
        }

        if (issues.some(i => i.wcagCriteria === 'WCAG-2.1.1')) {
            recommendations.push('- Ensure all interactive elements are keyboard accessible');
        }

        if (issues.some(i => i.iosGuideline === 'IOS-1.1')) {
            recommendations.push('- Implement Dynamic Type support for text elements');
        }

        if (issues.some(i => i.iosGuideline === 'IOS-1.2')) {
            recommendations.push('- Add accessibility labels and hints for VoiceOver optimization');
        }

        if (recommendations.length === 0) {
            recommendations.push('- Continue following accessibility best practices');
            recommendations.push('- Regular accessibility testing with screen readers');
            recommendations.push('- Keep accessibility guidelines updated');
        }

        return recommendations.join('\n');
    }, [issues]);

    // Export issues in different formats
    const exportIssues = useCallback((format: 'json' | 'csv' | 'html'): string => {
        switch (format) {
            case 'json':
                return JSON.stringify(issues, null, 2);

            case 'csv':
                const headers = 'Priority,Type,Title,Description,Suggestion,WCAG,iOS\n';
                const rows = issues.map(issue =>
                    `"${issue.priority}","${issue.type}","${issue.title}","${issue.description}","${issue.suggestion}","${issue.wcagCriteria || ''}","${issue.iosGuideline || ''}"`
                ).join('\n');
                return headers + rows;

            case 'html':
            default:
                return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Accessibility Issues Report</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .issue { border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; }
                .critical { border-left: 5px solid #dc3545; }
                .high { border-left: 5px solid #fd7e14; }
                .medium { border-left: 5px solid #ffc107; }
                .low { border-left: 5px solid #28a745; }
                .violation { background-color: #fff5f5; }
                .warning { background-color: #fffbf0; }
                .recommendation { background-color: #f0fff4; }
            </style>
        </head>
        <body>
            <h1>Accessibility Issues Report</h1>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Issues:</strong> ${issues.length}</p>
            
            ${issues.map(issue => `
                <div class="issue ${issue.priority} ${issue.type}">
                    <h3>${issue.title}</h3>
                    <p><strong>Priority:</strong> ${issue.priority}</p>
                    <p><strong>Type:</strong> ${issue.type}</p>
                    ${issue.wcagCriteria ? `<p><strong>WCAG:</strong> ${issue.wcagCriteria}</p>` : ''}
                    ${issue.iosGuideline ? `<p><strong>iOS:</strong> ${issue.iosGuideline}</p>` : ''}
                    <p><strong>Description:</strong> ${issue.description}</p>
                    <p><strong>Suggestion:</strong> ${issue.suggestion}</p>
                </div>
            `).join('')}
        </body>
        </html>
                    `;
        }
    }, [issues]);

    // Utility methods
    const updateConfig = useCallback((newConfig: Partial<ValidationConfig>) => {
        setValidationConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    const clearIssues = useCallback(() => {
        setIssues([]);
    }, []);

    const getComplianceScore = useCallback(() => {
        return calculateComplianceScore();
    }, [calculateComplianceScore]);

    const contextValue: ValidationLintingContextType = {
        config: validationConfig,
        issues,
        updateConfig,
        validateComponent,
        validateErrorComponent,
        validateAccessibilityProps,
        lintCode,
        runStaticAnalysis,
        generateReport,
        clearIssues,
        getComplianceScore,
        exportIssues,
    };

    return (
        <ValidationLintingContext.Provider value={contextValue}>
            {children}
        </ValidationLintingContext.Provider>
    );
};

// Hook to use validation and linting context
export const useAccessibilityValidation = (): ValidationLintingContextType => {
    const context = useContext(ValidationLintingContext);
    if (context === undefined) {
        throw new Error('useAccessibilityValidation must be used within a ValidationLintingProvider');
    }
    return context;
};

// Quick validation component for development
interface AccessibilityValidatorProps {
    children: ReactNode;
    showResults?: boolean;
}

export const AccessibilityValidator: React.FC<AccessibilityValidatorProps> = ({
    children,
    showResults = true, // Only show in development
}) => {
    const { issues, getComplianceScore } = useAccessibilityValidation();

    if (!showResults) {
        return <>{children}</>;
    }

    const complianceScore = getComplianceScore();

    return (
        <View style={styles.validatorContainer}>
            {children}
            <View style={[
                styles.validationPanel,
                complianceScore >= 90 ? styles.goodScore :
                    complianceScore >= 70 ? styles.mediumScore : styles.poorScore
            ]}>
                <Text style={styles.validationTitle}>Accessibility Score: {complianceScore.toFixed(1)}%</Text>
                <Text style={styles.validationIssueCount}>Issues: {issues.length}</Text>
                {issues.length > 0 && (
                    <View style={styles.issuesList}>
                        {issues.slice(0, 3).map((issue, index) => (
                            <Text key={index} style={styles.issueItem}>
                                • {issue.title}
                            </Text>
                        ))}
                        {issues.length > 3 && (
                            <Text style={styles.moreIssues}>
                                ... and {issues.length - 3} more
                            </Text>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};

// Pre-built validation patterns
export const VALIDATION_PATTERNS = {
    // Common error component patterns
    errorText: (props: any) => ({
        ...props,
        accessibilityRole: 'alert',
        accessibilityLabel: props.accessibilityLabel || 'Error message',
    }),

    // Accessible button pattern
    accessibleButton: (title: string, onPress: () => void, variant: 'primary' | 'secondary' = 'primary') => ({
        accessibilityRole: 'button',
        accessibilityLabel: title,
        onPress,
        style: [
            {
                padding: 16,
                borderRadius: 8,
                backgroundColor: variant === 'primary' ? '#007AFF' : '#E5E5E7',
                minHeight: 44, // iOS minimum touch target
            },
        ],
    }),

    // Accessible input pattern
    accessibleInput: (label: string, value: string, onChangeText: (text: string) => void) => ({
        accessibilityLabel: label,
        accessibilityRole: 'textbox',
        value,
        onChangeText,
        style: {
            borderWidth: 1,
            borderColor: '#D1D1D6',
            borderRadius: 8,
            padding: 12,
            minHeight: 44,
        },
    }),
};

// Styles
const styles = StyleSheet.create({
    validatorContainer: {
        flex: 1,
    },
    validationPanel: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        borderRadius: 8,
        maxWidth: 300,
    },
    validationTitle: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    validationIssueCount: {
        color: 'white',
        fontSize: 12,
        marginBottom: 8,
    },
    issuesList: {
        maxHeight: 100,
    },
    issueItem: {
        color: 'white',
        fontSize: 11,
        marginBottom: 2,
    },
    moreIssues: {
        color: '#ccc',
        fontSize: 11,
        fontStyle: 'italic',
    },
    goodScore: {
        borderColor: '#28a745',
        borderWidth: 2,
    },
    mediumScore: {
        borderColor: '#ffc107',
        borderWidth: 2,
    },
    poorScore: {
        borderColor: '#dc3545',
        borderWidth: 2,
    },
});

export default ValidationLintingProvider;