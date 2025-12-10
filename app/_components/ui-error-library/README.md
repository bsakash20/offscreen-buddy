# iOS Error UI Components Library

A comprehensive, accessible, and user-friendly UI components library for error presentation in iOS simulator applications, built with React Native and TypeScript.

## 📋 Overview

This library provides a complete set of error presentation components following iOS Human Interface Guidelines while maintaining consistency with existing application design systems. It seamlessly integrates with the existing CrossPlatformAppError interface and error handling framework.

## ✨ Features

### Core Components

1. **Toast Notifications System**
   - Responsive toast component with auto-dismiss and manual dismiss
   - Multiple toast types (error, warning, info, success) with appropriate styling
   - Toast queue manager for multiple simultaneous notifications
   - iOS haptic feedback integration
   - VoiceOver-optimized accessibility announcements

2. **Alert Dialog System**
   - Customizable alert dialog components with title, message, and action buttons
   - Different alert styles (critical, warning, confirmation, input required)
   - Modal presentation with proper iOS animations
   - Alert stacking and priority management

3. **Error Screen Components**
   - Full-screen error display components with retry functionality
   - Network offline screen with connection status
   - Server error page with maintenance mode support
   - Empty state screens with helpful guidance
   - Error state recovery screens with step-by-step instructions

4. **Inline Error Components**
   - Form field error indicators with validation messaging
   - Error badges and pill components for compact display
   - Inline warning components for proactive notifications
   - Error state placeholders for loading/failed content
   - Context-aware error hints and suggestions

5. **Accessibility Components**
   - VoiceOver-optimized error announcement components
   - Dynamic Type responsive error text sizing
   - High contrast mode support for all error components
   - Reduced motion alternatives for animations
   - Keyboard navigation support for all interactive elements

6. **iOS Haptic Feedback Integration**
   - Platform-specific haptic feedback patterns
   - Error severity-based vibration patterns
   - Customizable haptic feedback configurations
   - Cross-platform vibration fallbacks

7. **Theme Integration System**
   - Consistent theming and branding across all components
   - Dark mode support with automatic adaptation
   - iOS Human Interface Guidelines compliance
   - Customizable color schemes and typography

## 🚀 Quick Start

### Installation

```bash
npm install @react-native-async-storage/async-storage react-native-haptic-feedback
```

### Basic Setup

```tsx
import React from 'react';
import { ErrorThemeProvider, useToastManager } from './components/ui-error-library';

// Wrap your app with theme provider
function App() {
  return (
    <ErrorThemeProvider>
      <YourApp />
    </ErrorThemeProvider>
  );
}
```

### Toast Notifications

```tsx
import { useToastManager } from './components/ui-error-library/components/toasts';

function YourComponent() {
  const { showError, showSuccess, showWarning, showInfo } = useToastManager();

  const handleSuccess = () => {
    showSuccess('Operation completed successfully!', 'Success');
  };

  const handleError = () => {
    showError({
      category: 'validation',
      message: 'Please check your input',
      severity: 'medium'
    }, 'Validation Error');
  };

  return (
    <Button title="Show Success" onPress={handleSuccess} />
    <Button title="Show Error" onPress={handleError} />
  );
}
```

### Alert Dialogs

```tsx
import { useAlertManager } from './components/ui-error-library/components/alerts';

function YourComponent() {
  const { showError, showConfirmation, showWarning } = useAlertManager();

  const handleDelete = () => {
    showConfirmation(
      'Delete Item',
      'Are you sure you want to delete this item?',
      () => {
        // Confirm action
        console.log('Item deleted');
      },
      () => {
        // Cancel action
        console.log('Delete cancelled');
      }
    );
  };

  const handleNetworkError = () => {
    showError({
      category: 'network',
      message: 'Connection failed. Please check your internet connection.',
      severity: 'high'
    });
  };

  return (
    <Button title="Delete Item" onPress={handleDelete} />
    <Button title="Network Error" onPress={handleNetworkError} />
  );
}
```

### Error Screens

```tsx
import { useErrorScreenManager } from './components/ui-error-library/components/error-screens';

function YourComponent() {
  const { showNetworkOffline, showServerError, showEmptyState } = useErrorScreenManager();

  const handleNetworkOffline = () => {
    showNetworkOffline({
      onRetry: () => {
        // Retry network connection
        console.log('Retrying connection...');
      }
    });
  };

  const handleServerError = () => {
    showServerError({
      onRetry: () => {
        // Retry server request
        console.log('Retrying server request...');
      },
      contactSupport: true
    });
  };

  const handleEmptyState = () => {
    showEmptyState(
      'No Data Found',
      'There\'s nothing to show here right now.',
      {
        onRefresh: () => {
          // Refresh data
          console.log('Refreshing data...');
        }
      }
    );
  };

  return (
    <Button title="Network Offline" onPress={handleNetworkOffline} />
    <Button title="Server Error" onPress={handleServerError} />
    <Button title="Empty State" onPress={handleEmptyState} />
  );
}
```

### Inline Errors (Form Validation)

```tsx
import { useInlineErrorManager } from './components/ui-error-library/components/inline-errors';

function YourForm() {
  const { showFieldError, clearField, focusField } = useInlineErrorManager();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const validateForm = () => {
    let hasErrors = false;

    // Clear previous errors
    clearField('email');
    clearField('password');

    // Validate email
    if (!email || !email.includes('@')) {
      showFieldError('email', 'Please enter a valid email address', 'medium');
      hasErrors = true;
    }

    // Validate password
    if (!password || password.length < 6) {
      showFieldError('password', 'Password must be at least 6 characters', 'medium');
      hasErrors = true;
    }

    if (!hasErrors) {
      console.log('Form is valid!');
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        accessibilityLabel="Email address"
      />
      
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        accessibilityLabel="Password"
      />
      
      <Button title="Submit" onPress={validateForm} />
    </View>
  );
}
```

## 🎨 Theme Customization

### Custom Theme

```tsx
import { ErrorThemeProvider, THEME_PRESETS } from './components/ui-error-library/theme';

function App() {
  return (
    <ErrorThemeProvider
      theme={THEME_PRESETS.ACCESSIBILITY} // or THEME_PRESETS.COMPACT
      customBranding={{
        primaryColor: '#FF6B35', // Your brand color
        secondaryColor: '#004E89',
        companyName: 'Your Company'
      }}
      enableAutoDarkMode={true}
    >
      <YourApp />
    </ErrorThemeProvider>
  );
}
```

### Custom Dark Mode

```tsx
function App() {
  return (
    <ErrorThemeProvider
      theme={{
        colors: {
          error: {
            primary: '#FF5733',
            background: '#FFF0F0',
          }
        },
        darkMode: {
          isEnabled: true,
          overrideColors: {
            error: {
              primary: '#FF8C69',
              background: '#2C1A1A',
            }
          }
        }
      }}
    >
      <YourApp />
    </ErrorThemeProvider>
  );
}
```

## 🔊 Accessibility

### VoiceOver Support

All components include comprehensive VoiceOver support:

```tsx
// Components automatically announce errors for screen readers
<ToastNotification
  config={{
    title: 'Error occurred',
    message: 'Network connection failed',
    accessibility: {
      liveRegion: 'assertive',
      announcements: ['Error: Network connection failed. Please check your connection.'],
      role: 'alert'
    }
  }}
/>
```

### Dynamic Type Support

```tsx
import { DynamicType, useAccessibility } from './components/ui-error-library/components/accessibility';

function YourComponent() {
  const accessibility = useAccessibility();
  
  const textStyle = {
    fontSize: DynamicType.getTextSize(16, accessibility.dynamicTextSize),
    lineHeight: DynamicType.getLineHeight(24, accessibility.dynamicTextSize),
  };

  return <Text style={textStyle}>Error message</Text>;
}
```

## 📱 iOS Haptic Feedback

### Automatic Haptic Feedback

```tsx
import { HapticUtils } from './components/ui-error-library/components/haptics';

// Error occurred
HapticUtils.onError('high');

// Form validation error
HapticUtils.onValidationError();

// Network status change
HapticUtils.onNetworkChange(isConnected);

// Payment result
HapticUtils.onPaymentResult(success);
```

### Manual Haptic Feedback

```tsx
import { useHapticFeedback } from './components/ui-error-library/components/haptics';

function YourComponent() {
  const { trigger, triggerError, triggerPattern } = useHapticFeedback();

  const handleButtonPress = () => {
    triggerPattern('SUCCESS');
  };

  const handleError = () => {
    triggerError('NETWORK_ERROR');
  };

  return (
    <Button title="Success" onPress={handleButtonPress} />
    <Button title="Error" onPress={handleError} />
  );
}
```

## 🔧 Integration with Error Framework

### Automatic Error Handling

```tsx
import { CrossPlatformErrorLogger } from './services/CrossPlatformErrorLogger';

// Initialize with error logger
const { showError } = useToastManager(errorLogger);

// Errors are automatically logged and displayed
try {
  await riskyOperation();
} catch (error) {
  showError(error); // Automatically shows toast and logs error
}
```

### Custom Error Mapping

```tsx
import { CrossPlatformAppError } from './components/ui-error-library/types';

function handleError(error: CrossPlatformAppError) {
  // Show appropriate UI based on error category and severity
  if (error.category === 'network' && error.severity === 'high') {
    showErrorScreen({
      type: 'server_error',
      title: 'Connection Error',
      message: error.userFriendlyMessage,
      autoRetry: true,
      retryInterval: 5000,
    });
  } else if (error.userImpact === 'minor') {
    showError(error);
  } else {
    showCriticalAlert(error.title, error.message);
  }
}
```

## 🎯 Component APIs

### Toast Notification API

```typescript
interface ToastConfig {
  id?: string;
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info' | 'success';
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration?: number; // Auto-dismiss duration
  persistent?: boolean; // Don't auto-dismiss
  position?: 'top' | 'center' | 'bottom';
  actions?: ToastAction[];
  haptic?: boolean;
  dismissible?: boolean;
  accessibility?: AccessibilityConfig;
}
```

### Alert Dialog API

```typescript
interface AlertConfig {
  id?: string;
  title: string;
  message: string;
  type: 'critical' | 'warning' | 'confirmation' | 'input_required';
  style: 'default' | 'sheet' | 'card';
  buttons: AlertButton[];
  defaultButton?: string;
  cancelButton?: string;
  destructiveButton?: string;
  modal?: boolean;
  blurBackground?: boolean;
  haptic?: boolean;
  accessibility?: AccessibilityConfig;
}
```

### Error Screen API

```typescript
interface ErrorScreenConfig {
  id?: string;
  type: 'network_offline' | 'server_error' | 'maintenance_mode' | 'empty_state' | 'recovery';
  title: string;
  message: string;
  emoji?: string;
  primaryAction?: ErrorScreenAction;
  secondaryAction?: ErrorScreenAction;
  illustration?: string;
  steps?: RecoveryStep[];
  autoRetry?: boolean;
  retryInterval?: number;
  maxRetries?: number;
  fullScreen?: boolean;
  accessibility?: AccessibilityConfig;
}
```

### Inline Error API

```typescript
interface InlineErrorConfig {
  id?: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  type: 'field' | 'badge' | 'pill' | 'hint' | 'placeholder';
  fieldId?: string;
  dismissible?: boolean;
  autoHide?: boolean;
  autoHideDelay?: number;
  actions?: InlineErrorAction[];
  styling?: InlineErrorStyling;
  accessibility?: AccessibilityConfig;
}
```

## 🧪 Testing

### Unit Tests

```tsx
import { render, fireEvent } from '@testing-library/react-native';
import { ToastNotification } from './components/ui-error-library/components/toasts';

describe('ToastNotification', () => {
  it('should display error message correctly', () => {
    const mockConfig = {
      title: 'Error',
      message: 'Something went wrong',
      type: 'error' as const,
      severity: 'medium' as const,
    };

    const { getByText } = render(
      <ToastNotification config={mockConfig} onDismiss={jest.fn()} theme={{}} />
    );

    expect(getByText('Error')).toBeTruthy();
    expect(getByText('Something went wrong')).toBeTruthy();
  });
});
```

### Integration Tests

```tsx
import { createTestRunner } from './components/ui-error-library/__tests__';

const testRunner = createTestRunner();

test('complete error handling flow', async () => {
  await testRunner.runTest('Network Error Handling', async () => {
    // Simulate network error
    const error = createNetworkError();
    
    // Should show error screen
    const errorScreen = await waitFor(() => 
      getByTestId('error-screen')
    );
    
    expect(errorScreen.props.type).toBe('network_offline');
    
    // Retry should clear error screen
    fireEvent.press(getByText('Try Again'));
    
    await waitFor(() => {
      expect(queryByTestId('error-screen')).toBeNull();
    });
  });
});
```

## 📚 Best Practices

### Error Message Guidelines

1. **Be specific and actionable**
   - ❌ "Error occurred"
   - ✅ "Unable to save changes. Please check your internet connection and try again."

2. **Use user-friendly language**
   - ❌ "HTTP 500 Internal Server Error"
   - ✅ "We're experiencing technical difficulties. Please try again later."

3. **Provide context and next steps**
   - ❌ "Invalid input"
   - ✅ "Email address is invalid. Please enter a valid email like user@example.com"

### Component Selection Guidelines

| Component | Use Case | Severity | User Impact |
|-----------|----------|----------|-------------|
| Toast | Minor notifications, quick feedback | Low-Medium | Minor |
| Alert | Important decisions, blocking errors | Medium-High | Disruptive |
| Error Screen | Complete failure, offline states | High-Critical | Blocking |
| Inline Error | Form validation, field-specific issues | Low-Medium | Minor |

### Accessibility Best Practices

1. **Always provide accessibility labels and hints**
2. **Use appropriate accessibility roles** (`alert`, `status`, `button`)
3. **Implement live regions** for dynamic error announcements
4. **Support Dynamic Type** for text sizing
5. **Consider reduced motion** preferences
6. **Test with VoiceOver** enabled

### Performance Optimization

1. **Use appropriate component types** for the severity level
2. **Implement lazy loading** for heavy error screens
3. **Cache error states** to avoid re-renders
4. **Use useMemo** for expensive theme calculations
5. **Implement virtual scrolling** for long error lists

## 🔧 Advanced Configuration

### Custom Error Categories

```typescript
// Extend the error handling framework
import { CrossPlatformErrorCategory } from './components/ui-error-library/types';

const CUSTOM_ERRORS = {
  CUSTOM_ERROR_001: {
    category: CrossPlatformErrorCategory.BUSINESS_LOGIC,
    severity: 'medium',
    userImpact: 'minor',
    uiComponent: 'inline_error',
  }
} as const;
```

### Custom Animations

```typescript
const customAnimationConfig = {
  animations: {
    duration: {
      fast: 150,
      normal: 250,
      slow: 400,
    },
    easing: {
      entrance: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      exit: 'cubic-bezier(0.55, 0.085, 0.68, 0.53)',
      interaction: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    },
  },
};
```

### Platform-Specific Configuration

```typescript
const platformConfig = {
  ios: {
    hapticFeedback: true,
    blurEffects: true,
    nativeAnimations: true,
  },
  android: {
    vibrationPatterns: true,
    elevationShadows: true,
    systemAlerts: true,
  },
};
```

## 📖 API Reference

### Hooks

#### `useToastManager(theme, errorLogger?)`
- `show(config: ToastConfig): string` - Show toast notification
- `showError(error, options?): string` - Show error toast
- `showSuccess(message, title?, options?): string` - Show success toast
- `showWarning(message, title?, options?): string` - Show warning toast
- `showInfo(message, title?, options?): string` - Show info toast
- `hide(id: string): void` - Hide specific toast
- `hideAll(): void` - Hide all toasts

#### `useAlertManager(theme, errorLogger?)`
- `show(config: AlertConfig): string` - Show alert
- `showError(error, options?): string` - Show error alert
- `showCritical(title, message, options?): string` - Show critical alert
- `showWarning(title, message, options?): string` - Show warning alert
- `showConfirmation(title, message, onConfirm, onCancel?, options?): string` - Show confirmation
- `hide(id: string): void` - Hide specific alert
- `hideAll(): void` - Hide all alerts

#### `useErrorScreenManager(theme, errorLogger?)`
- `show(config: ErrorScreenConfig): string` - Show error screen
- `showNetworkOffline(options?): string` - Show network offline screen
- `showServerError(options?): string` - Show server error screen
- `showMaintenanceMode(options?): string` - Show maintenance mode screen
- `showEmptyState(title?, message?, options?): string` - Show empty state
- `hide(id: string): void` - Hide specific error screen
- `retry(id: string): void` - Retry error screen action

#### `useInlineErrorManager(theme, errorLogger?)`
- `show(config: InlineErrorConfig): string` - Show inline error
- `showFieldError(fieldId, message, severity?, options?): string` - Show field error
- `showValidationError(error, fieldId?, options?): string` - Show validation error
- `hide(id: string): void` - Hide specific inline error
- `clearField(fieldId): void` - Clear all errors for a field
- `clearAll(): void` - Clear all inline errors
- `focusField(fieldId): void` - Focus field with errors

### Context Providers

#### `ErrorThemeProvider`
```typescript
interface ErrorThemeProviderProps {
  children: ReactNode;
  theme?: Partial<ErrorTheme>;
  darkMode?: boolean;
  enableAutoDarkMode?: boolean;
  customBranding?: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    companyName?: string;
  };
}
```

#### `AccessibilityProvider`
```typescript
interface AccessibilityProviderProps {
  children: ReactNode;
  errorComponents?: React.ComponentType<any>[];
  enableAnnouncements?: boolean;
  defaultLanguage?: string;
}
```

#### `HapticProvider`
```typescript
interface HapticProviderProps {
  children: ReactNode;
}
```

## 🤝 Contributing

1. Follow the existing code style and conventions
2. Add TypeScript types for all new props and APIs
3. Include accessibility features (VoiceOver, Dynamic Type, etc.)
4. Add unit tests for new components and hooks
5. Update documentation for new features
6. Test on both iOS and Android platforms
7. Ensure haptic feedback works on iOS devices

## 📄 License

This library is part of the OffScreen Buddy project and follows the same licensing terms.

## 🆘 Support

For issues, questions, or feature requests, please refer to the project documentation or create an issue in the repository.