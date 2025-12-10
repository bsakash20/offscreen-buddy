# Migration Guide - New Design System

This guide helps you migrate existing components from the current codebase to the new mobile-first design system.

## Overview

The new design system provides:
- Mobile-first components with touch optimization
- Responsive design capabilities
- Dark/light theme support
- Accessibility improvements
- Consistent design tokens
- Performance optimizations

## Migration Steps

### Step 1: Setup Theme Provider

Update your app root to use the new ThemeProvider:

**Before:**
```tsx
// app/_layout.tsx
import { Slot } from 'expo-router';

export default function RootLayout() {
  return <Slot />;
}
```

**After:**
```tsx
// app/_layout.tsx
import { Slot } from 'expo-router';
import { ThemeProvider } from '../design-system/providers/ThemeProvider';

export default function RootLayout() {
  return (
    <ThemeProvider 
      defaultMode="system"
      enableSystemTheme={true}
      enablePersistence={true}
    >
      <Slot />
    </ThemeProvider>
  );
}
```

### Step 2: Update Color Usage

Replace hardcoded colors with design system tokens:

**Before:**
```tsx
// Old color usage
<View style={{ backgroundColor: '#000000', color: '#FFFFFF' }} />
<Text style={{ color: '#3A7BDB' }}>Welcome</Text>
<Button style={{ backgroundColor: '#FF6B6B' }}>Delete</Button>
```

**After:**
```tsx
// Using design system tokens
import { useTheme } from '../design-system/providers/ThemeProvider';

function MyComponent() {
  const { theme } = useTheme();
  const { colors } = theme;

  return (
    <View style={{ backgroundColor: colors.system.background.primary }}>
      <Text style={{ color: colors.system.text.primary }}>
        Welcome
      </Text>
      <Button 
        variant="primary"
        style={{ backgroundColor: colors.semantic.error.main }}
      >
        Delete
      </Button>
    </View>
  );
}
```

### Step 3: Migrate Buttons

Replace custom button implementations with design system buttons:

**Before:**
```tsx
// Old button component
const CustomButton = ({ title, onPress, variant = 'primary' }) => (
  <TouchableOpacity
    style={{
      paddingVertical: 12,
      paddingHorizontal: 24,
      backgroundColor: variant === 'primary' ? '#3A7BDB' : '#FFFFFF',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#3A7BDB',
      minHeight: 44,
    }}
    onPress={onPress}
  >
    <Text style={{ color: variant === 'primary' ? '#FFFFFF' : '#3A7BDB' }}>
      {title}
    </Text>
  </TouchableOpacity>
);
```

**After:**
```tsx
// Using design system Button
import { Button } from '../design-system/components';

const CustomButton = ({ title, onPress, variant = 'primary', size = 'md', ...props }) => (
  <Button
    variant={variant}
    size={size}
    onPress={onPress}
    haptic={true}
    {...props}
  >
    {title}
  </Button>
);

// Usage
<Button variant="primary" size="md" onPress={handlePress}>
  Continue
</Button>

<Button variant="outline" size="lg" fullWidth>
  Cancel
</Button>

<Button variant="destructive" loading>
  Deleting...
</Button>
```

### Step 4: Migrate Input Components

Replace custom input implementations:

**Before:**
```tsx
// Old input component
const CustomInput = ({ label, value, onChangeText, error, placeholder }) => (
  <View>
    {label && <Text>{label}</Text>}
    <TextInput
      style={{
        borderWidth: 1,
        borderColor: error ? '#FF6B6B' : '#E5E5E5',
        borderRadius: 8,
        padding: 16,
        minHeight: 44,
      }}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
    />
    {error && <Text style={{ color: '#FF6B6B' }}>{error}</Text>}
  </View>
);
```

**After:**
```tsx
// Using design system Input
import { Input } from '../design-system/components';

const CustomInput = ({ label, value, onChangeText, error, placeholder, ...props }) => (
  <Input
    label={label}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    error={error}
    variant="outlined"
    size="md"
    required
    {...props}
  />
);

// Usage
<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
  error={emailError}
  variant="outlined"
  size="md"
/>

<Input
  label="Password"
  value={password}
  onChangeText={setPassword}
  passwordToggle
  variant="filled"
/>

<SearchInput
  placeholder="Search..."
  value={searchQuery}
  onChangeText={setSearchQuery}
  onSearch={handleSearch}
/>

<Textarea
  label="Description"
  value={description}
  onChangeText={setDescription}
  rows={4}
/>
```

### Step 5: Migrate Card Components

Replace custom card implementations:

**Before:**
```tsx
// Old card component
const CustomCard = ({ title, children, onPress }) => (
  <TouchableOpacity
    style={{
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    }}
    onPress={onPress}
  >
    <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
      {title}
    </Text>
    {children}
  </TouchableOpacity>
);
```

**After:**
```tsx
// Using design system Card
import { Card, ActionCard } from '../design-system/components';

const CustomCard = ({ title, children, onPress, ...props }) => (
  <Card
    variant="elevated"
    padding="md"
    fullWidth
    onPress={onPress}
    header={
      title && (
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          {title}
        </Text>
      )
    }
    {...props}
  >
    {children}
  </Card>
);

// Usage
<Card variant="elevated" padding="lg">
  <Text>Card content</Text>
</Card>

<Card
  variant="outlined"
  header={<Text style={{ fontSize: 16, fontWeight: '600' }}>Settings</Text>}
  footer={<Button size="sm" variant="primary">Save</Button>}
>
  <Text>Card content with header and footer</Text>
</Card>

<ActionCard
  title="Upgrade to Pro"
  description="Unlock premium features"
  actionText="Upgrade"
  onAction={handleUpgrade}
>
  <Text>Additional details</Text>
</ActionCard>
```

### Step 6: Add Responsive Design

Make existing components responsive:

**Before:**
```tsx
// Static layout
const MyComponent = () => (
  <View style={{ flexDirection: 'row', padding: 20 }}>
    <View style={{ flex: 1 }}>
      <Text>Left content</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text>Right content</Text>
    </View>
  </View>
);
```

**After:**
```tsx
// Responsive layout
import { useResponsive } from '../design-system/utils/responsive';

const MyComponent = () => {
  const { isMobile, isTablet } = useResponsive();
  const { spacing } = useTheme();

  return (
    <View style={{
      flexDirection: isMobile ? 'column' : 'row',
      padding: isMobile ? spacing.scale.md : spacing.scale.lg,
      gap: spacing.scale.md,
    }}>
      <View style={{ flex: isMobile ? undefined : 1 }}>
        <Text>Left content</Text>
      </View>
      <View style={{ flex: isMobile ? undefined : 1 }}>
        <Text>Right content</Text>
      </View>
    </View>
  );
};
```

### Step 7: Update Navigation Components

Migrate existing navigation to be touch-optimized:

**Before:**
```tsx
// Old navigation
const OldTabNavigation = () => (
  <View style={{ flexDirection: 'row' }}>
    <TouchableOpacity style={{ flex: 1, padding: 12 }}>
      <Text>Home</Text>
    </TouchableOpacity>
    <TouchableOpacity style={{ flex: 1, padding: 12 }}>
      <Text>Settings</Text>
    </TouchableOpacity>
  </View>
);
```

**After:**
```tsx
// Mobile-optimized navigation
import { Button } from '../design-system/components';

const MobileNavigation = ({ currentTab, onTabChange }) => {
  const { spacing } = useTheme();

  return (
    <View style={{
      flexDirection: 'row',
      paddingHorizontal: spacing.scale.md,
      paddingVertical: spacing.scale.sm,
      backgroundColor: '#FFFFFF',
      borderTopWidth: 1,
      borderTopColor: '#E5E5E5',
    }}>
      <Button
        variant={currentTab === 'home' ? 'primary' : 'ghost'}
        size="sm"
        style={{ flex: 1, marginHorizontal: spacing.scale.xs }}
        onPress={() => onTabChange('home')}
      >
        Home
      </Button>
      <Button
        variant={currentTab === 'settings' ? 'primary' : 'ghost'}
        size="sm"
        style={{ flex: 1, marginHorizontal: spacing.scale.xs }}
        onPress={() => onTabChange('settings')}
      >
        Settings
      </Button>
    </View>
  );
};
```

### Step 8: Add Mobile Optimizations

Add mobile-specific features:

```tsx
// Add safe area handling
import { safeAreaUtils } from '../design-system/utils/mobile';

const SafeAreaComponent = () => {
  const insets = safeAreaUtils.getSafeAreaInsets();
  
  return (
    <View style={safeAreaUtils.createSafeAreaContainer(insets, '#F5F5F5')}>
      {/* Your content */}
    </View>
  );
};

// Add keyboard avoidance
import { keyboardUtils } from '../design-system/utils/mobile';

const KeyboardAwareComponent = () => {
  const keyboardInfo = keyboardUtils.useKeyboard();
  
  return (
    <View style={keyboardUtils.createKeyboardAvoidStyle(keyboardInfo.height)}>
      <Input placeholder="This will avoid keyboard" />
    </View>
  );
};

// Add haptic feedback
import { animationUtils } from '../design-system/utils/mobile';

const TouchableComponent = () => {
  const handlePress = async () => {
    await animationUtils.triggerHaptic('light');
    // Handle press action
  };
  
  return <Button onPress={handlePress}>Tap me!</Button>;
};
```

### Step 9: Update Form Components

Migrate forms to use the new design system:

**Before:**
```tsx
// Old form component
const OldForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  
  return (
    <View style={{ padding: 20 }}>
      <TextInput
        style={{ borderWidth: 1, padding: 12, borderRadius: 8 }}
        placeholder="Name"
        value={formData.name}
        onChangeText={(text) => setFormData({...formData, name: text})}
      />
      {errors.name && <Text style={{ color: 'red' }}>{errors.name}</Text>}
      
      <TouchableOpacity style={{ backgroundColor: '#3A7BDB', padding: 12 }}>
        <Text style={{ color: 'white', textAlign: 'center' }}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};
```

**After:**
```tsx
// Using new design system
import { Input, Button, Card } from '../design-system/components';

const NewForm = () => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    await animationUtils.triggerHaptic('light');
    
    // Handle form submission
    setIsSubmitting(false);
  };
  
  return (
    <Card variant="elevated" padding="lg">
      <Input
        label="Name"
        placeholder="Enter your name"
        value={formData.name}
        onChangeText={(text) => setFormData({...formData, name: text})}
        error={errors.name}
        required
      />
      
      <Input
        label="Email"
        placeholder="Enter your email"
        value={formData.email}
        onChangeText={(text) => setFormData({...formData, email: text})}
        error={errors.email}
        keyboardType="email-address"
        required
      />
      
      <Button
        variant="primary"
        size="lg"
        fullWidth
        onPress={handleSubmit}
        loading={isSubmitting}
        style={{ marginTop: 16 }}
      >
        Submit
      </Button>
    </Card>
  );
};
```

### Step 10: Testing and Validation

After migration, test your components:

```tsx
// Test responsive behavior
const ResponsiveTest = () => {
  const { isMobile, isTablet, currentBreakpoint } = useResponsive();
  
  return (
    <View>
      <Text>Current breakpoint: {currentBreakpoint}</Text>
      <Text>Is mobile: {isMobile ? 'Yes' : 'No'}</Text>
      <Text>Is tablet: {isTablet ? 'Yes' : 'No'}</Text>
    </View>
  );
};

// Test theme switching
const ThemeTest = () => {
  const { theme, isDark, toggleTheme } = useTheme();
  
  return (
    <View style={{ backgroundColor: theme.colors.system.background.primary }}>
      <Text style={{ color: theme.colors.system.text.primary }}>
        Current theme: {isDark ? 'Dark' : 'Light'}
      </Text>
      <Button onPress={toggleTheme}>Toggle Theme</Button>
    </View>
  );
};
```

## Common Migration Patterns

### Pattern 1: Touch Target Size

Ensure all interactive elements meet the 44px minimum:

```tsx
// ✅ Good
<Button size="md">Action</Button>  // 44px height

// ❌ Bad
<TouchableOpacity style={{ padding: 8, height: 32 }}>
  Action
</TouchableOpacity>
```

### Pattern 2: Color Usage

Always use design system colors instead of hardcoded values:

```tsx
// ✅ Good
const { colors } = useTheme();
<View style={{ backgroundColor: colors.system.background.primary }} />

// ❌ Bad
<View style={{ backgroundColor: '#FFFFFF' }} />
```

### Pattern 3: Spacing

Use design system spacing tokens:

```tsx
// ✅ Good
const { spacing } = useTheme();
<View style={{ marginBottom: spacing.scale.md }} />

// ❌ Bad
<View style={{ marginBottom: 16 }} />
```

### Pattern 4: Typography

Use semantic text styles:

```tsx
// ✅ Good
const { typography } = useTheme();
<Text style={typography.text.heading.h2}>Title</Text>

// ❌ Bad
<Text style={{ fontSize: 20, fontWeight: '600' }}>Title</Text>
```

### Pattern 5: Component Composition

Build complex components from simple ones:

```tsx
// ✅ Good - compose design system components
<Card variant="elevated" padding="lg">
  <Text style={typography.text.heading.h3}>Card Title</Text>
  <Input
    label="Email"
    value={email}
    onChangeText={setEmail}
    variant="outlined"
    style={{ marginTop: spacing.scale.md }}
  />
  <Button
    variant="primary"
    fullWidth
    onPress={handleSubmit}
    style={{ marginTop: spacing.scale.lg }}
  >
    Submit
  </Button>
</Card>

// ❌ Bad - custom implementations
<View style={styles.customCard}>
  <Text style={styles.customTitle}>Card Title</Text>
  <TextInput style={styles.customInput} />
  <TouchableOpacity style={styles.customButton}>
    <Text>Submit</Text>
  </TouchableOpacity>
</View>
```

## Rollback Plan

If you need to rollback during migration:

1. **Keep original components** alongside new ones temporarily
2. **Use feature flags** to control which components are used
3. **Test incrementally** - migrate one component at a time
4. **Monitor performance** during migration

## Performance Considerations

After migration, monitor these metrics:

- **Bundle size**: Ensure new components don't bloat the bundle
- **Render performance**: Check for 60fps during animations
- **Memory usage**: Monitor for memory leaks
- **Theme switching**: Ensure smooth theme transitions
- **Responsive behavior**: Test on different screen sizes

## Troubleshooting

### Common Issues

1. **Theme not applying**
   - Ensure ThemeProvider wraps your app
   - Check that you're using `useTheme()` hook correctly

2. **Components not responsive**
   - Import and use `useResponsive()` hook
   - Ensure responsive utilities are imported correctly

3. **Touch targets too small**
   - Use appropriate size prop: `sm`, `md`, `lg`, `xl`
   - Minimum 44px for touch targets

4. **Colors not matching**
   - Use semantic color tokens: `colors.semantic.error.main`
   - Avoid hardcoded color values

### Getting Help

- Check the main [README.md](./README.md) for usage examples
- Review component documentation in the codebase
- Test with the responsive utilities
- Ensure all design tokens are being used consistently

## Next Steps

After migration:

1. **Test thoroughly** on different devices and screen sizes
2. **Verify accessibility** compliance with screen readers
3. **Optimize performance** for your specific use case
4. **Document any custom patterns** you develop
5. **Consider contributing** improvements back to the design system

Remember: Migration is an iterative process. Start with the most commonly used components and gradually migrate others as needed.