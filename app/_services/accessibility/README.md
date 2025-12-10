# OffScreen Buddy Accessibility System

## WCAG 2.1 AA Compliant Accessibility Implementation

This comprehensive accessibility system ensures OffScreen Buddy is inclusive and usable by everyone, including users with visual, motor, cognitive, and auditory disabilities.

---

## 🎯 Overview

The accessibility system provides:

- **WCAG 2.1 AA Compliance** - Meets international accessibility standards
- **Screen Reader Optimization** - Full VoiceOver (iOS) and TalkBack (Android) support
- **Voice Control Integration** - Siri Shortcuts and Google Assistant commands
- **Visual Accessibility** - High contrast, color blindness support, dynamic text scaling
- **Motor Accessibility** - Large touch targets, gesture alternatives, switch control
- **Cognitive Accessibility** - Simplified modes, reduced cognitive load, memory aids

---

## 📁 Architecture

### Core Services

```
app/services/accessibility/
├── AccessibilityManager.ts          # Central accessibility coordination
├── ScreenReaderService.ts           # Screen reader announcements and focus
├── VoiceControlService.ts           # Voice command processing
├── VisualAccessibility.ts           # High contrast and color blindness
├── MotorAccessibility.ts            # Touch targets and gesture alternatives
├── CognitiveAccessibility.ts        # Simplified modes and memory aids
└── README.md                        # This file
```

---

## 🚀 Quick Start

### Initialize Accessibility System

```typescript
import AccessibilityManager from '@/services/accessibility/AccessibilityManager';
import ScreenReaderService from '@/services/accessibility/ScreenReaderService';
import VoiceControlService from '@/services/accessibility/VoiceControlService';

// Initialize on app start
await AccessibilityManager.initialize();
await VoiceControlService.initialize();

// Get current preferences
const preferences = AccessibilityManager.getPreferences();
console.log('Screen reader enabled:', preferences.screenReaderEnabled);
```

### Update Accessibility Preferences

```typescript
await AccessibilityManager.updatePreferences({
  highContrastMode: true,
  textScaling: 1.5,
  touchTargetSize: 'large',
  simplifiedMode: true,
});
```

---

## 🎨 Visual Accessibility

### High Contrast Mode

```typescript
import VisualAccessibility from '@/services/accessibility/VisualAccessibility';

// Enable high contrast
await VisualAccessibility.enableHighContrast();

// Get current theme
const theme = VisualAccessibility.getCurrentTheme();
console.log('Background:', theme.colors.background);
console.log('Text:', theme.colors.text);
```

### Color Blindness Support

```typescript
// Set color blindness mode
await VisualAccessibility.setColorBlindnessMode('deuteranopia');

// Apply filter to colors
const color = '#FF0000';
const filtered = VisualAccessibility.applyColorBlindnessFilter(color);
```

### Contrast Checking

```typescript
// Check contrast ratio
const contrast = VisualAccessibility.calculateContrastRatio('#FFFFFF', '#000000');
console.log('Ratio:', contrast.ratio); // 21:1
console.log('Passes AA:', contrast.passes.AA); // true
console.log('Passes AAA:', contrast.passes.AAA); // true

// Ensure accessible contrast
const accessibleColor = VisualAccessibility.ensureAccessibleContrast(
  '#888888', // foreground
  '#FFFFFF', // background
  false      // isLargeText
);
```

---

## 🔊 Screen Reader Support

### Announcements

```typescript
import ScreenReaderService from '@/services/accessibility/ScreenReaderService';

// Basic announcement
ScreenReaderService.announce({
  message: 'Timer started',
  priority: 'normal',
});

// Error announcement
ScreenReaderService.announceError('Connection failed', 'high');

// Success announcement
ScreenReaderService.announceSuccess('Focus session completed');

// Timer state announcement
ScreenReaderService.announceTimerState('started', '25 minutes');
```

### Focus Management

```typescript
// Set focus to element
ScreenReaderService.setFocus({
  reactTag: elementRef.current,
  delay: 300,
  announcement: 'Start button focused',
});

// Move focus to previous element
ScreenReaderService.moveFocusToPrevious();
```

### Accessibility Labels

```typescript
// Timer display label
const label = ScreenReaderService.getTimerAccessibilityLabel(25, 30);
// "25 minutes and 30 seconds remaining"

// Button with state
const buttonLabel = ScreenReaderService.getButtonAccessibilityLabel(
  'Start Timer',
  'active'
);
// "Start Timer, active"

// Accessibility hint
const hint = ScreenReaderService.getAccessibilityHint('start timer');
// "Double tap to start timer"
```

---

## 🎤 Voice Control

### Voice Commands

```typescript
import VoiceControlService from '@/services/accessibility/VoiceControlService';

// Enable voice control
await VoiceControlService.enable();

// Process voice input
const result = await VoiceControlService.processVoiceInput('start timer');
if (result.success) {
  console.log('Command executed:', result.command?.action);
}

// Get available commands
const commands = VoiceControlService.getAvailableCommands();

// Announce available commands
VoiceControlService.announceAvailableCommands();
```

### Custom Commands

```typescript
// Register custom command
VoiceControlService.registerCommand({
  id: 'custom_break',
  phrase: ['take a break', 'start break'],
  action: 'timer.break',
  confirmation: true,
});

// Listen for command execution
VoiceControlService.on('commandExecuted', ({ command }) => {
  console.log('Command:', command.action);
});
```

---

## 👆 Motor Accessibility

### Touch Targets

```typescript
import MotorAccessibility from '@/services/accessibility/MotorAccessibility';

// Get minimum touch target size
const target = MotorAccessibility.getMinimumTouchTarget();
console.log('Minimum size:', target.minSize); // 44px, 60px, or 72px
console.log('Recommended:', target.recommendedSize);
console.log('Spacing:', target.spacing);

// Calculate touch target dimensions
const dimensions = MotorAccessibility.calculateTouchTargetDimensions(
  32, // content width
  32  // content height
);
console.log('Width:', dimensions.width);
console.log('Height:', dimensions.height);
console.log('Padding:', dimensions.padding);

// Validate touch target
const validation = MotorAccessibility.validateTouchTarget(40, 40);
if (!validation.valid) {
  console.log('Issues:', validation.issues);
  console.log('Recommendations:', validation.recommendations);
}
```

### Gesture Alternatives

```typescript
// Check if gesture needs alternative
if (MotorAccessibility.shouldProvideGestureAlternative('swipe')) {
  const alternative = MotorAccessibility.getGestureAlternatives('swipe');
  console.log('Alternative:', alternative?.description);
  // "Use navigation buttons or voice commands instead of swiping"
}

// Get swipe configuration
const swipeConfig = MotorAccessibility.getSwipeConfiguration();
console.log('Threshold:', swipeConfig.threshold);
console.log('Velocity:', swipeConfig.velocity);
```

### One-Handed Operation

```typescript
// Get one-handed layout
const layout = MotorAccessibility.getOneHandedLayout(screenHeight);
console.log('Thumb reach zone:', layout.thumbReachZone);
console.log('Recommended position:', layout.recommendedPosition);

// Get recommended button position
const position = MotorAccessibility.getRecommendedButtonPosition(
  screenWidth,
  screenHeight
);
console.log('Position:', position.x, position.y);
console.log('Alignment:', position.alignment);
```

---

## 🧠 Cognitive Accessibility

### Simplified Mode

```typescript
import CognitiveAccessibility from '@/services/accessibility/CognitiveAccessibility';

// Set simplification level
await CognitiveAccessibility.setSimplificationLevel('moderate');

// Simplify text
const simplified = CognitiveAccessibility.simplifyText(
  'Please utilize the commence button to initiate the timer',
  'moderate'
);
// "Please use the start button to start the timer"

// Get simplification settings
const level = CognitiveAccessibility.getSimplificationLevel();
console.log('Level:', level.level);
console.log('Features:', level.features);
```

### Progressive Disclosure

```typescript
// Create progressive disclosure
const disclosure = CognitiveAccessibility.createProgressiveDisclosure({
  essential: ['Start Timer', 'Pause Timer'],
  secondary: ['Settings', 'Statistics'],
  advanced: ['Export Data', 'Customize Sounds'],
});

console.log('Current options:', disclosure.current);
console.log('Has more:', disclosure.hasMore);
console.log('Next level:', disclosure.nextLevel);
```

### Memory Aids

```typescript
// Register memory aid
CognitiveAccessibility.registerMemoryAid({
  id: 'session_reminder',
  type: 'reminder',
  content: 'You have a focus session scheduled',
  frequency: 'repeated',
  priority: 'high',
});

// Get active memory aids
const aids = CognitiveAccessibility.getActiveMemoryAids();

// Show memory aid
CognitiveAccessibility.showMemoryAid('session_reminder');
```

### Cognitive Load

```typescript
// Calculate cognitive load
const load = CognitiveAccessibility.calculateCognitiveLoad({
  wordCount: 150,
  interactiveElements: 5,
  visualElements: 8,
  complexity: 'moderate',
});

console.log('Overall load:', load.overallLoad);
console.log('Visual complexity:', load.visualComplexity);
console.log('Interaction complexity:', load.interactionComplexity);
```

### Focus Mode (ADHD Support)

```typescript
// Get focus mode settings
const focusMode = CognitiveAccessibility.getFocusModeSettings();
console.log('Enabled:', focusMode.enabled);
console.log('Hide distractions:', focusMode.hideDistractions);
console.log('Timer visibility:', focusMode.timerVisibility);
```

---

## 🎯 Usage in Components

### Accessible Button Example

```typescript
import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import MotorAccessibility from '@/services/accessibility/MotorAccessibility';
import ScreenReaderService from '@/services/accessibility/ScreenReaderService';

function AccessibleButton({ title, onPress }) {
  const target = MotorAccessibility.getMinimumTouchTarget();
  
  return (
    <TouchableOpacity
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={ScreenReaderService.getAccessibilityHint('activate')}
      style={{
        minWidth: target.minSize,
        minHeight: target.minSize,
        padding: target.spacing,
      }}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
}
```

### Timer Display with Accessibility

```typescript
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import ScreenReaderService from '@/services/accessibility/ScreenReaderService';
import VisualAccessibility from '@/services/accessibility/VisualAccessibility';

function TimerDisplay({ minutes, seconds }) {
  const theme = VisualAccessibility.getCurrentTheme();
  const textSize = VisualAccessibility.getRecommendedTextSize(48);
  
  useEffect(() => {
    // Announce time changes
    if (seconds === 0) {
      ScreenReaderService.announce({
        message: `${minutes} minutes remaining`,
        priority: 'low',
      });
    }
  }, [minutes, seconds]);
  
  return (
    <View
      accessible={true}
      accessibilityRole="timer"
      accessibilityLabel={ScreenReaderService.getTimerAccessibilityLabel(minutes, seconds)}
      accessibilityLiveRegion="polite"
    >
      <Text
        style={{
          fontSize: textSize,
          color: theme.colors.text,
        }}
      >
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </Text>
    </View>
  );
}
```

---

## 📊 WCAG 2.1 AA Compliance

### Compliance Checking

```typescript
// Get compliance status
const compliance = AccessibilityManager.getComplianceStatus();

console.log('Overall:', compliance.overallCompliance); // 'AA', 'AAA', 'A', or 'non-compliant'
console.log('Perceivable:', compliance.perceivable);
console.log('Operable:', compliance.operable);
console.log('Understandable:', compliance.understandable);
console.log('Robust:', compliance.robust);

// Check if theme meets WCAG AA
const meetsAA = VisualAccessibility.meetsWCAGAA();
console.log('Theme meets WCAG AA:', meetsAA);
```

### Compliance Criteria

The system ensures:

#### Perceivable
- ✅ Text alternatives for all images
- ✅ Captions and alternatives for audio
- ✅ Adaptable content (text scaling, reflow)
- ✅ Distinguishable (contrast ratios, color alternatives)

#### Operable
- ✅ Keyboard accessible (all functionality)
- ✅ Enough time (extended timeouts available)
- ✅ Seizure-safe (reduced motion)
- ✅ Navigable (skip links, focus indicators)
- ✅ Input modalities (gesture alternatives)

#### Understandable
- ✅ Readable (text scaling, simplified language)
- ✅ Predictable (consistent navigation)
- ✅ Input assistance (error identification, suggestions)

#### Robust
- ✅ Compatible with assistive technologies
- ✅ Valid semantic markup
- ✅ Proper ARIA labels and roles

---

## 🔧 Configuration

### Accessibility Preferences

All preferences are persisted in AsyncStorage:

```typescript
interface AccessibilityPreferences {
  // Visual
  highContrastMode: boolean;
  colorBlindnessMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';
  textScaling: number; // 1.0 to 2.0
  reducedMotion: boolean;
  largeText: boolean;
  boldText: boolean;
  
  // Motor
  touchTargetSize: 'standard' | 'large' | 'extra-large';
  gestureAlternatives: boolean;
  voiceControl: boolean;
  switchControl: boolean;
  interactionTimeout: number;
  
  // Cognitive
  simplifiedMode: boolean;
  reducedCognitiveLoad: boolean;
  extendedTimeouts: boolean;
  memoryAids: boolean;
  
  // Audio
  soundEnabled: boolean;
  hapticFeedback: boolean;
  visualAlternatives: boolean;
  
  // Screen Reader
  screenReaderEnabled: boolean;
  announcementVerbosity: 'minimal' | 'standard' | 'verbose';
  
  // Focus
  focusIndicatorStyle: 'standard' | 'high-contrast' | 'thick';
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Enable VoiceOver/TalkBack and navigate entire app
- [ ] Test with different text scaling (100% to 200%)
- [ ] Verify all touch targets meet minimum size
- [ ] Test with high contrast mode
- [ ] Verify color blindness filters
- [ ] Test voice commands
- [ ] Verify gesture alternatives
- [ ] Test with switch control
- [ ] Verify cognitive simplification modes
- [ ] Test timeout extensions

### Automated Testing

Testing framework available in `/testing/accessibility/`

---

## 📱 Platform Support

- **iOS**: Full VoiceOver, Siri Shortcuts, Dynamic Type
- **Android**: Full TalkBack, Google Assistant, Font Scaling
- **Cross-platform**: All core accessibility features

---

## 🎓 Best Practices

1. **Always provide text alternatives** for images and icons
2. **Use semantic roles** (button, header, timer, etc.)
3. **Announce state changes** to screen readers
4. **Ensure minimum touch targets** (44px iOS, 48px Android)
5. **Provide gesture alternatives** for all interactions
6. **Use high contrast colors** (4.5:1 minimum for text)
7. **Support text scaling** up to 200%
8. **Reduce motion** when requested
9. **Provide clear focus indicators**
10. **Test with real assistive technologies**

---

## 📚 Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [iOS Human Interface Guidelines - Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility)
- [Material Design - Accessibility](https://material.io/design/usability/accessibility.html)
- [React Native Accessibility](https://reactnative.dev/docs/accessibility)

---

## 🤝 Contributing

When adding new features:

1. Ensure WCAG 2.1 AA compliance
2. Add screen reader announcements
3. Provide gesture alternatives
4. Support text scaling
5. Test with assistive technologies
6. Update documentation

---

## 📄 License

Part of OffScreen Buddy - Focus Timer Application

---

**Built with ❤️ for accessibility and inclusion**