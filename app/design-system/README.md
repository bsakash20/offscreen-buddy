# Mobile-First Design System

A comprehensive, mobile-optimized design system for React Native/Expo applications, built with TypeScript and following mobile-first design principles.

## Overview

This design system provides a complete foundation for building mobile applications with:

- **Mobile-First Design**: All components optimized for touch interfaces
- **Responsive Layouts**: Breakpoint-based responsive design system
- **Dark/Light Theme Support**: Complete theming system with system theme detection
- **Accessibility**: WCAG 2.1 AA compliant components
- **Performance**: Optimized for 60fps mobile performance
- **Touch-Friendly**: All components meet 44px minimum touch target requirements

## Quick Start

### Installation

The design system is already set up in your project. Import the ThemeProvider and start using components:

```tsx
import { ThemeProvider } from '../design-system/providers/ThemeProvider';
import { Button, Input, Card } from '../design-system/components';

function App() {
  return (
    <ThemeProvider>
      {/* Your app components */}
    </ThemeProvider>
  );
}
```

### Basic Usage

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { Button, Card, Input } from '../design-system/components';

function MyScreen() {
  return (
    <Card variant="elevated" padding="lg">
      <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 16 }}>
        Welcome to OffScreen Buddy
      </Text>
      
      <Input
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        variant="outlined"
        size="md"
      />
      
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleSubmit}
        style={{ marginTop: 16 }}
      >
        Continue
      </Button>
    </Card>
  );
}
```

## Architecture

### File Structure

```
app/design-system/
├── tokens/                    # Design tokens
│   ├── colors.ts             # Color system with light/dark support
│   ├── typography.ts         # Typography scale and text styles
│   ├── spacing.ts            # Spacing system for consistent layout
│   ├── breakpoints.ts        # Responsive breakpoints
│   └── theme.ts              # Theme configuration
├── providers/
│   └── ThemeProvider.tsx     # Theme context provider
├── components/               # UI components
│   ├── Button.tsx           # Touch-optimized buttons
│   ├── Input.tsx            # Mobile keyboard inputs
│   └── Card.tsx             # Content containers
├── utils/                    # Utilities
│   ├── responsive.ts        # Responsive design utilities
│   └── mobile.ts            # Mobile-specific utilities
└── README.md                # This file
```

### Design Tokens

#### Colors

Comprehensive color system with semantic naming and theme support:

```tsx
// Accessing colors
const { colors } = useTheme();

// Brand colors
colors.brand.primary[500]  // Main brand color
colors.brand.accent[600]   // Accent color

// System colors
colors.system.background.primary    // Main background
colors.system.text.primary          // Main text color
colors.system.border.light          // Light borders

// Semantic colors
colors.semantic.success.main        // Success states
colors.semantic.error.main          // Error states
colors.semantic.warning.main        // Warning states
colors.semantic.info.main           // Info states
```

#### Typography

Mobile-optimized typography scale:

```tsx
const { typography } = useTheme();

// Text styles
typography.text.heading.h1    // Large headings
typography.text.heading.h2    // Medium headings
typography.text.body.base     // Standard body text
typography.text.body.sm       // Small body text
typography.text.caption.sm    // Caption text

// Button text
typography.text.button.base   // Standard button text
```

#### Spacing

Consistent spacing system based on 4px grid:

```tsx
const { spacing } = useTheme();

// Scale values
spacing.scale.xs   // 4px
spacing.scale.sm   // 8px
spacing.scale.md   // 16px
spacing.scale.lg   // 24px
spacing.scale.xl   // 32px

// Component spacing
spacing.components.button.height.md    // 44px (touch minimum)
spacing.components.input.padding.horizontal
spacing.navigation.bottomTab.height
```

### Components

#### Button

Touch-optimized button with haptic feedback:

```tsx
import { Button } from '../design-system/components';

// Variants
<Button variant="primary">Primary Button</Button>
<Button variant="secondary">Secondary Button</Button>
<Button variant="outline">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="destructive">Delete Button</Button>

// Sizes
<Button size="sm">Small</Button>      // 36px height
<Button size="md">Medium</Button>    // 44px height (default)
<Button size="lg">Large</Button>     // 52px height
<Button size="xl">Extra Large</Button> // 60px height

// With icons
<Button leftIcon={<Icon name="home" />} size="md">
  Home
</Button>

// Loading state
<Button loading variant="primary">
  Loading...
</Button>
```

#### Input

Mobile keyboard optimized input component:

```tsx
import { Input } from '../design-system/components';

// Basic usage
<Input
  label="Email"
  placeholder="Enter email"
  value={email}
  onChangeText={setEmail}
  variant="outlined"    // 'outlined' | 'filled' | 'underlined'
  size="md"            // 'sm' | 'md' | 'lg'
  required
/>

// With icons
<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  leftIcon={<Icon name="lock" />}
  passwordToggle
/>

// With validation
<Input
  label="Username"
  value={username}
  onChangeText={setUsername}
  error={usernameError}
  helperText="Choose a unique username"
  required
/>

// Search input
<SearchInput
  placeholder="Search..."
  value={searchQuery}
  onChangeText={setSearchQuery}
  onSearch={handleSearch}
/>

// Multiline textarea
<Textarea
  label="Description"
  value={description}
  onChangeText={setDescription}
  rows={4}
/>
```

#### Card

Responsive content container:

```tsx
import { Card } from '../design-system/components';

// Basic card
<Card variant="elevated" padding="md">
  <Text>Card content here</Text>
</Card>

// With header and footer
<Card
  variant="outlined"
  header={
    <Text style={{ fontSize: 16, fontWeight: '600' }}>
      Card Title
    </Text>
  }
  footer={
    <Button size="sm" variant="primary">
      Action
    </Button>
  }
>
  <Text>Main content</Text>
</Card>

// Pressable card
<Card variant="elevated" onPress={handleCardPress}>
  <Text>Tap me</Text>
</Card>

// Action card (call-to-action)
<ActionCard
  title="Upgrade to Pro"
  description="Unlock premium features"
  actionText="Upgrade"
  onAction={handleUpgrade}
>
  <Text>Additional details</Text>
</ActionCard>

// Card grid
<CardGrid columns={2} spacing={16}>
  <Card>Item 1</Card>
  <Card>Item 2</Card>
  <Card>Item 3</Card>
  <Card>Item 4</Card>
</CardGrid>
```

### Theme System

#### Theme Provider

The ThemeProvider manages theme state and provides theme context:

```tsx
import { ThemeProvider, useTheme } from '../design-system/providers/ThemeProvider';

function App() {
  return (
    <ThemeProvider
      defaultMode="system"     // 'light' | 'dark' | 'system'
      enableSystemTheme={true} // Auto-detect system theme
      enablePersistence={true} // Persist theme preference
      enableAnimations={true}  // Enable theme transition animations
    >
      <AppContent />
    </ThemeProvider>
  );
}

function AppContent() {
  const { theme, mode, isDark, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.system.background.primary }}>
      <Text style={{ color: theme.colors.system.text.primary }}>
        Current theme: {isDark ? 'Dark' : 'Light'}
      </Text>
      <Button onPress={toggleTheme}>Toggle Theme</Button>
    </View>
  );
}
```

#### Theme Utilities

```tsx
import { useThemeMode, useDarkMode } from '../design-system/providers/ThemeProvider';

function MyComponent() {
  const { mode, toggleTheme, isDark } = useThemeMode();
  const { isSystemMode } = useDarkMode();
  
  // Component logic
}
```

### Responsive Design

#### Responsive Hook

```tsx
import { useResponsive } from '../design-system/utils/responsive';

function ResponsiveComponent() {
  const { 
    window, 
    isMobile, 
    isTablet, 
    isDesktop, 
    currentBreakpoint 
  } = useResponsive();
  
  return (
    <View style={{
      flexDirection: isMobile ? 'column' : 'row',
      padding: isMobile ? 16 : 24,
    }}>
      <Text>
        Current breakpoint: {currentBreakpoint}
      </Text>
      <Text>
        Device type: {isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}
      </Text>
    </View>
  );
}
```

#### Responsive Utilities

```tsx
import { responsiveUtils } from '../design-system/utils/responsive';

function MyComponent() {
  const { window } = useResponsive();
  
  // Get responsive spacing
  const spacing = responsiveUtils.getSpacing(16, window.width);
  
  // Get responsive font size
  const fontSize = responsiveUtils.getFontSize(14, window.width);
  
  // Get grid columns
  const columns = responsiveUtils.getGridColumns(window.width);
  
  return <View style={{ padding: spacing }} />;
}
```

### Mobile Utilities

#### Safe Area Handling

```tsx
import { safeAreaUtils } from '../design-system/utils/mobile';

function SafeAreaComponent() {
  const insets = safeAreaUtils.getSafeAreaInsets();
  
  return (
    <View style={safeAreaUtils.createSafeAreaContainer(insets)}>
      <Text>Content safe area aware</Text>
    </View>
  );
}
```

#### Keyboard Handling

```tsx
import { keyboardUtils } from '../design-system/utils/mobile';

function FormComponent() {
  const keyboardInfo = keyboardUtils.useKeyboard();
  
  return (
    <View style={keyboardUtils.createKeyboardAvoidStyle(keyboardInfo.height)}>
      <Input placeholder="Focus me" />
      {keyboardInfo.isVisible && (
        <Text>Keyboard is visible</Text>
      )}
    </View>
  );
}
```

#### Orientation Handling

```tsx
import { orientationUtils } from '../design-system/utils/mobile';

function ResponsiveLayout() {
  const orientation = orientationUtils.useOrientation();
  
  return (
    <View style={orientationUtils.getOrientationStyles(
      { flexDirection: 'column' },  // Portrait
      { flexDirection: 'row' },     // Landscape
      orientation.isPortrait
    )}>
      <Text>Responsive to orientation</Text>
    </View>
  );
}
```

## Best Practices

### Touch Targets

All interactive elements meet the 44px minimum touch target requirement:

```tsx
// ✅ Good - meets touch target
<Button size="md">Button</Button>  // 44px height

// ❌ Avoid - too small for touch
<View style={{ padding: 4, height: 20 }} />
```

### Spacing

Use the design system's spacing scale for consistency:

```tsx
// ✅ Good - uses design system spacing
<View style={{ marginBottom: spacing.scale.md }} />

// ❌ Avoid - arbitrary spacing values
<View style={{ marginBottom: 13 }} />
```

### Typography

Use semantic text styles for consistency and accessibility:

```tsx
// ✅ Good - semantic text styles
<Text style={typography.text.heading.h2}>Title</Text>

// ❌ Avoid - arbitrary font sizes
<Text style={{ fontSize: 20 }}>Title</Text>
```

### Responsive Design

Design mobile-first and enhance for larger screens:

```tsx
function ResponsiveComponent() {
  const { isMobile } = useResponsive();
  
  return (
    <View style={{
      flexDirection: isMobile ? 'column' : 'row',  // Mobile-first
      gap: isMobile ? spacing.scale.sm : spacing.scale.md,
    }}>
      {/* Content */}
    </View>
  );
}
```

## Accessibility

All components are built with accessibility in mind:

- **Screen Reader Support**: Proper accessibility labels and hints
- **Touch Targets**: Minimum 44px for all interactive elements
- **Color Contrast**: WCAG 2.1 AA compliant color combinations
- **Focus Management**: Proper focus states and navigation
- **Text Scaling**: Respects system text size preferences

## Performance

The design system is optimized for mobile performance:

- **Component Memoization**: Expensive calculations are memoized
- **Responsive Hooks**: Efficient dimension listening
- **Haptic Feedback**: Native haptic feedback when available
- **Animation Performance**: 60fps animations using native drivers
- **Bundle Size**: Tree-shakeable components

## Contributing

When adding new components to the design system:

1. Follow the existing patterns in this architecture
2. Use design tokens instead of hardcoded values
3. Ensure accessibility compliance
4. Add responsive variants
5. Include mobile optimization
6. Add TypeScript definitions
7. Document usage examples

## Migration from Legacy Components

See [MIGRATION.md](./MIGRATION.md) for detailed guidance on migrating existing components to the new design system.