/**
 * Mobile-First Design System - Spacing Tokens
 * Consistent spacing system optimized for mobile touch interfaces
 */

export interface SpacingScale {
    // Base spacing unit (4px base for mobile)
    unit: number;
    // Spacing values in pixels
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    '2xl': number;
    '3xl': number;
    '4xl': number;
    '5xl': number;
    '6xl': number;
    // Container max widths
    container: {
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    // Touch-friendly spacing (minimum 44px for touch targets)
    touch: {
        minimum: number;
        comfortable: number;
        spacious: number;
    };
}

// Mobile-optimized spacing scale
const mobileSpacing: SpacingScale = {
    unit: 4, // Base unit for consistent spacing

    // Linear spacing scale (all values are unit * multiplier)
    xs: 4,      // 1 unit
    sm: 8,      // 2 units
    md: 16,     // 4 units
    lg: 24,     // 6 units
    xl: 32,     // 8 units
    '2xl': 48,  // 12 units
    '3xl': 64,  // 16 units
    '4xl': 80,  // 20 units
    '5xl': 96,  // 24 units
    '6xl': 128, // 32 units

    // Container max widths (optimized for mobile screens)
    container: {
        sm: 480,   // Small phones
        md: 768,   // Large phones / small tablets
        lg: 1024,  // Tablets
        xl: 1200,  // Large tablets / small desktop
    },

    // Touch-friendly spacing
    touch: {
        minimum: 44,     // iOS/Android minimum touch target
        comfortable: 48, // Comfortable touch spacing
        spacious: 56,    // Spacious touch layout
    },
};

export interface SpacingTokens {
    scale: SpacingScale;
    // Semantic spacing for different contexts
    layout: {
        // Page-level spacing
        page: {
            padding: {
                horizontal: number;
                vertical: number;
            };
            margin: {
                bottom: number;
            };
        };
        // Section spacing
        section: {
            padding: {
                vertical: number;
            };
            margin: {
                vertical: number;
            };
        };
        // Component group spacing
        group: {
            margin: {
                vertical: number;
                horizontal: number;
            };
        };
    };
    components: {
        // Button spacing
        button: {
            padding: {
                vertical: number;
                horizontal: number;
            };
            margin: {
                between: number;
            };
            height: {
                sm: number;
                md: number;
                lg: number;
            };
        };
        // Input spacing
        input: {
            padding: {
                vertical: number;
                horizontal: number;
            };
            margin: {
                bottom: number;
            };
            height: {
                sm: number;
                md: number;
                lg: number;
            };
        };
        // Card spacing
        card: {
            padding: {
                vertical: number;
                horizontal: number;
            };
            margin: {
                bottom: number;
                between: number;
            };
            borderRadius: {
                sm: number;
                md: number;
                lg: number;
            };
        };
        // Modal spacing
        modal: {
            padding: {
                vertical: number;
                horizontal: number;
            };
            margin: {
                vertical: number;
                horizontal: number;
            };
        };
    };
    navigation: {
        // Bottom tab spacing
        bottomTab: {
            height: number;
            padding: {
                vertical: number;
                horizontal: number;
            };
        };
        // Header spacing
        header: {
            height: number;
            padding: {
                vertical: number;
                horizontal: number;
            };
            margin: {
                bottom: number;
            };
        };
        // Safe area spacing
        safeArea: {
            top: number;
            bottom: number;
            left: number;
            right: number;
        };
    };
    // Grid and layout spacing
    grid: {
        gap: {
            sm: number;
            md: number;
            lg: number;
        };
        columnGap: {
            sm: number;
            md: number;
            lg: number;
        };
        rowGap: {
            sm: number;
            md: number;
            lg: number;
        };
    };
}

export const spacingTokens: SpacingTokens = {
    scale: mobileSpacing,
    layout: {
        page: {
            padding: {
                horizontal: mobileSpacing.md,
                vertical: mobileSpacing.md,
            },
            margin: {
                bottom: mobileSpacing.xl,
            },
        },
        section: {
            padding: {
                vertical: mobileSpacing.lg,
            },
            margin: {
                vertical: mobileSpacing.xl,
            },
        },
        group: {
            margin: {
                vertical: mobileSpacing.md,
                horizontal: mobileSpacing.sm,
            },
        },
    },
    components: {
        button: {
            padding: {
                vertical: mobileSpacing.sm,
                horizontal: mobileSpacing.md,
            },
            margin: {
                between: mobileSpacing.sm,
            },
            height: {
                sm: mobileSpacing.touch.minimum, // 44px
                md: mobileSpacing.touch.comfortable, // 48px
                lg: 56, // Larger buttons
            },
        },
        input: {
            padding: {
                vertical: mobileSpacing.sm,
                horizontal: mobileSpacing.md,
            },
            margin: {
                bottom: mobileSpacing.md,
            },
            height: {
                sm: mobileSpacing.touch.minimum, // 44px
                md: mobileSpacing.touch.comfortable, // 48px
                lg: 56,
            },
        },
        card: {
            padding: {
                vertical: mobileSpacing.lg,
                horizontal: mobileSpacing.lg,
            },
            margin: {
                bottom: mobileSpacing.md,
                between: mobileSpacing.md,
            },
            borderRadius: {
                sm: mobileSpacing.sm,
                md: mobileSpacing.md,
                lg: mobileSpacing.lg,
            },
        },
        modal: {
            padding: {
                vertical: mobileSpacing.xl,
                horizontal: mobileSpacing.lg,
            },
            margin: {
                vertical: mobileSpacing.md,
                horizontal: mobileSpacing.sm,
            },
        },
    },
    navigation: {
        bottomTab: {
            height: 60, // Including safe area
            padding: {
                vertical: mobileSpacing.sm,
                horizontal: mobileSpacing.md,
            },
        },
        header: {
            height: 44, // Standard iOS header height
            padding: {
                vertical: mobileSpacing.sm,
                horizontal: mobileSpacing.md,
            },
            margin: {
                bottom: mobileSpacing.sm,
            },
        },
        safeArea: {
            top: 0, // Will be calculated dynamically
            bottom: 0, // Will be calculated dynamically
            left: mobileSpacing.md,
            right: mobileSpacing.md,
        },
    },
    grid: {
        gap: {
            sm: mobileSpacing.sm,
            md: mobileSpacing.md,
            lg: mobileSpacing.lg,
        },
        columnGap: {
            sm: mobileSpacing.sm,
            md: mobileSpacing.md,
            lg: mobileSpacing.lg,
        },
        rowGap: {
            sm: mobileSpacing.sm,
            md: mobileSpacing.md,
            lg: mobileSpacing.lg,
        },
    },
};

// Spacing utilities
export type SpacingKey = keyof SpacingScale;
export type SpacingUnit = number;

export const getSpacing = (key: keyof typeof mobileSpacing): number => {
    return (mobileSpacing as any)[key];
};

export const createSpacing = (multiplier: number): number => {
    return mobileSpacing.unit * multiplier;
};

// Responsive spacing utilities
export const responsiveSpacing = {
    // Get appropriate spacing based on screen size
    getResponsiveSpacing: (baseSpacing: number, isTablet: boolean, isLandscape: boolean): number => {
        if (isTablet) {
            return baseSpacing * 1.25; // Increase spacing on tablets
        }
        if (isLandscape) {
            return baseSpacing * 1.1; // Slight increase in landscape
        }
        return baseSpacing; // Mobile portrait
    },

    // Get touch-friendly spacing
    getTouchSpacing: (baseSpacing: number): number => {
        return Math.max(baseSpacing, mobileSpacing.touch.minimum);
    },
};

// Common spacing patterns
export const spacingPatterns = {
    // Stack elements vertically
    stackVertical: (spacing: number) => ({
        marginTop: spacing,
        marginBottom: spacing,
    }),

    // Stack elements horizontally
    stackHorizontal: (spacing: number) => ({
        marginLeft: spacing,
        marginRight: spacing,
    }),

    // Create consistent padding
    padding: (vertical: number, horizontal?: number) => ({
        paddingVertical: vertical,
        paddingHorizontal: horizontal || vertical,
    }),

    // Create consistent margin
    margin: (vertical: number, horizontal?: number) => ({
        marginVertical: vertical,
        marginHorizontal: horizontal || vertical,
    }),
};

// Simple spacing export for backward compatibility
export const spacing = mobileSpacing;