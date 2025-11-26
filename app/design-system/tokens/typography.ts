/**
 * Mobile-First Design System - Typography Tokens
 * Mobile-optimized typography scale with accessibility and readability focus
 */

export interface FontFamily {
    sans: string;
    mono: string;
    display: string;
}

export interface FontWeight {
    light: number;
    regular: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
}

export interface FontSize {
    xs: number;
    sm: number;
    base: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
    '5xl': number;
    '6xl': number;
}

export interface LineHeight {
    tight: number;
    snug: number;
    normal: number;
    relaxed: number;
    loose: number;
}

export interface LetterSpacing {
    tight: number;
    normal: number;
    wide: number;
}

export interface TypographyScale {
    fontFamily: FontFamily;
    fontWeight: FontWeight;
    fontSize: FontSize;
    lineHeight: LineHeight;
    letterSpacing: LetterSpacing;
}

// Mobile-optimized typography scale
const mobileTypography: TypographyScale = {
    fontFamily: {
        sans: 'SF Pro Display, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        mono: 'SF Mono, Monaco, Inconsolata, Roboto Mono, monospace',
        display: 'SF Pro Display, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    },
    fontWeight: {
        light: 300,
        regular: 400,
        medium: 500,
        semibold: 600,
        bold: 700,
        extrabold: 800,
    },
    // Mobile-optimized font sizes with readability focus
    fontSize: {
        xs: 11,    // Caption text, metadata
        sm: 12,    // Small labels, helper text
        base: 14,  // Base body text
        lg: 16,    // Large body text, input text
        xl: 18,    // Subheadings, emphasis
        '2xl': 20, // Small headings
        '3xl': 24, // Medium headings
        '4xl': 28, // Large headings
        '5xl': 32, // Display text
        '6xl': 36, // Hero text
    },
    // Mobile-optimized line heights
    lineHeight: {
        tight: 1.2,   // Headings
        snug: 1.3,    // Large headings
        normal: 1.4,  // Body text
        relaxed: 1.5, // Long text, paragraphs
        loose: 1.6,   // Reading text, accessibility
    },
    // Mobile-friendly letter spacing
    letterSpacing: {
        tight: -0.01,
        normal: 0,
        wide: 0.01,
    },
};

export interface TypographyTokens {
    scale: TypographyScale;
    // Semantic text styles
    text: {
        // Body text variants
        body: {
            base: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
            };
            sm: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
            };
            lg: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
            };
        };
        // Heading variants
        heading: {
            h1: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            h2: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            h3: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            h4: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            h5: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            h6: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
        };
        // Display text
        display: {
            large: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            medium: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            small: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
        };
        // Utility text styles
        caption: {
            base: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
            };
            sm: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
            };
        };
        label: {
            base: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            sm: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
        };
        button: {
            base: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            sm: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
            lg: {
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
                letterSpacing: number;
            };
        };
        // Code and technical text
        code: {
            base: {
                fontFamily: string;
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
            };
            sm: {
                fontFamily: string;
                fontSize: number;
                lineHeight: number;
                fontWeight: number;
            };
        };
    };
}

export const typographyTokens: TypographyTokens = {
    scale: mobileTypography,
    text: {
        body: {
            base: {
                fontSize: mobileTypography.fontSize.base,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.regular,
            },
            sm: {
                fontSize: mobileTypography.fontSize.sm,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.regular,
            },
            lg: {
                fontSize: mobileTypography.fontSize.lg,
                lineHeight: mobileTypography.lineHeight.relaxed,
                fontWeight: mobileTypography.fontWeight.regular,
            },
        },
        heading: {
            h1: {
                fontSize: mobileTypography.fontSize['5xl'],
                lineHeight: mobileTypography.lineHeight.tight,
                fontWeight: mobileTypography.fontWeight.bold,
                letterSpacing: mobileTypography.letterSpacing.tight,
            },
            h2: {
                fontSize: mobileTypography.fontSize['4xl'],
                lineHeight: mobileTypography.lineHeight.tight,
                fontWeight: mobileTypography.fontWeight.bold,
                letterSpacing: mobileTypography.letterSpacing.tight,
            },
            h3: {
                fontSize: mobileTypography.fontSize['3xl'],
                lineHeight: mobileTypography.lineHeight.snug,
                fontWeight: mobileTypography.fontWeight.semibold,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
            h4: {
                fontSize: mobileTypography.fontSize['2xl'],
                lineHeight: mobileTypography.lineHeight.snug,
                fontWeight: mobileTypography.fontWeight.semibold,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
            h5: {
                fontSize: mobileTypography.fontSize.xl,
                lineHeight: mobileTypography.lineHeight.snug,
                fontWeight: mobileTypography.fontWeight.medium,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
            h6: {
                fontSize: mobileTypography.fontSize.lg,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.medium,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
        },
        display: {
            large: {
                fontSize: mobileTypography.fontSize['6xl'],
                lineHeight: mobileTypography.lineHeight.tight,
                fontWeight: mobileTypography.fontWeight.extrabold,
                letterSpacing: mobileTypography.letterSpacing.wide,
            },
            medium: {
                fontSize: mobileTypography.fontSize['5xl'],
                lineHeight: mobileTypography.lineHeight.tight,
                fontWeight: mobileTypography.fontWeight.bold,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
            small: {
                fontSize: mobileTypography.fontSize['4xl'],
                lineHeight: mobileTypography.lineHeight.snug,
                fontWeight: mobileTypography.fontWeight.bold,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
        },
        caption: {
            base: {
                fontSize: mobileTypography.fontSize.sm,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.regular,
            },
            sm: {
                fontSize: mobileTypography.fontSize.xs,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.regular,
            },
        },
        label: {
            base: {
                fontSize: mobileTypography.fontSize.sm,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.medium,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
            sm: {
                fontSize: mobileTypography.fontSize.xs,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.medium,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
        },
        button: {
            base: {
                fontSize: mobileTypography.fontSize.base,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.medium,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
            sm: {
                fontSize: mobileTypography.fontSize.sm,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.medium,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
            lg: {
                fontSize: mobileTypography.fontSize.lg,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.medium,
                letterSpacing: mobileTypography.letterSpacing.normal,
            },
        },
        code: {
            base: {
                fontFamily: mobileTypography.fontFamily.mono,
                fontSize: mobileTypography.fontSize.sm,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.regular,
            },
            sm: {
                fontFamily: mobileTypography.fontFamily.mono,
                fontSize: mobileTypography.fontSize.xs,
                lineHeight: mobileTypography.lineHeight.normal,
                fontWeight: mobileTypography.fontWeight.regular,
            },
        },
    },
};

// Typography utilities
export type TextStyle = keyof TypographyTokens['text'];
export type BodyVariant = keyof TypographyTokens['text']['body'];
export type HeadingVariant = keyof TypographyTokens['text']['heading'];
export type DisplayVariant = keyof TypographyTokens['text']['display'];

export const getTextStyle = (style: TextStyle, variant?: string) => {
    if (style === 'body' && variant) {
        return typographyTokens.text.body[variant as BodyVariant];
    }
    if (style === 'heading' && variant) {
        return typographyTokens.text.heading[variant as HeadingVariant];
    }
    if (style === 'display' && variant) {
        return typographyTokens.text.display[variant as DisplayVariant];
    }
    return typographyTokens.text.body.base;
};