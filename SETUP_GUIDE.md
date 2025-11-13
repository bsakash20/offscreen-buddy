# OffScreen Buddy - Complete Setup Guide

This guide explains how to manually transfer the OffScreen Buddy project from the Rork platform to this GitHub repository.

## Project Structure Overview

The complete project structure should look like this:

```
offscreen-buddy/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Tab navigation setup
│   │   ├── index.tsx            # Main timer screen
│   │   └── settings.tsx         # Settings screen
│   ├── _layout.tsx              # Root layout with TimerProvider
│   └── +not-found.tsx           # 404 error page
├── contexts/
│   └── TimerContext.tsx         # Global state management
├── constants/
│   ├── colors.ts                # Color definitions
│   └── notifications.ts         # Notification messages
├── assets/
│   └── images/
│       ├── adaptive-icon.png
│       ├── favicon.png
│       ├── icon.png
│       └── splash-icon.png
├── app.json                     # Expo configuration
├── tsconfig.json                # TypeScript config
├── eslint.config.js             # ESLint configuration
├── package.json                 # Dependencies
├── .gitignore                   # Git ignore file
├── README.md                    # Project documentation
└── SETUP_GUIDE.md               # This file
```

## Manual Transfer Steps

### 1. Clone This Repository

```bash
git clone https://github.com/bsakash20/offscreen-buddy.git
cd offscreen-buddy
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Add Source Files from Rork

You need to manually copy the following files from the Rork project:

#### App Files (app/ directory):
- `app/_layout.tsx` - Root layout with Provider
- `app/(tabs)/_layout.tsx` - Tab navigation
- `app/(tabs)/index.tsx` - Timer screen (618 lines of code)
- `app/(tabs)/settings.tsx` - Settings screen
- `app/+not-found.tsx` - Not found page

#### Context Files (contexts/ directory):
- `contexts/TimerContext.tsx` - State management with hooks

#### Constants (constants/ directory):
- `constants/colors.ts` - Theme colors
- `constants/notifications.ts` - Notification messages

#### Configuration Files:
- `app.json` - Expo app configuration
- `tsconfig.json` - TypeScript configuration
- `eslint.config.js` - ESLint rules

### 4. Create Directories

```bash
mkdir -p app/(tabs) contexts constants assets/images
```

### 5. Copy Files from Rork

The files should be copied from: https://rork.com/p/unqkdmokit9yiypq3u9kq

**Key Implementation Details:**

#### Timer Context (contexts/TimerContext.tsx)
- Manages global timer state
- Handles notifications scheduling
- Implements app state tracking (active/background)
- Provides haptic feedback triggers
- Uses AsyncStorage for persistence

#### Timer Screen (app/(tabs)/index.tsx)
- Apple-style wheel picker interface
- Large animated HH:MM:SS display
- Progress ring animation
- Smooth digit transitions
- Haptic feedback on all interactions
- ~618 lines of complex animation code

#### Settings Screen (app/(tabs)/settings.tsx)
- Theme toggle (Light/Dark)
- Funny mode toggle
- Notification frequency adjustment
- "How it works" section

#### Color Palette (constants/colors.ts)
- Light theme: Cream background (#FBF9F7)
- Dark theme: Deep black (#1A1A1A)
- Primary: Lavender (#B8A7D6)
- Accent: Peachy (#FFB4A2)

#### Notifications (constants/notifications.ts)
15 funny messages and 5 serious messages for notifications

## Running the Project

### Start Development Server

```bash
npm start
# or
npx expo start
```

### Run on Specific Platform

```bash
# iOS Simulator
npm run ios
# or press 'i' in the Expo CLI

# Android Emulator
npm run android
# or press 'a' in the Expo CLI

# Web Browser
npm run web
# or press 'w' in the Expo CLI
```

### Test on Physical Device

1. Install Expo Go app on your phone
2. Run `npm start`
3. Scan the QR code displayed in the terminal

## Key Features Implemented

1. **Apple-style Timer Interface**
   - Wheel picker for time selection
   - Large HH:MM:SS display
   - Smooth animations

2. **Notifications System**
   - Automatic scheduling
   - Funny and serious modes
   - App state awareness

3. **Haptic Feedback**
   - Light impact on start
   - Medium impact on pause
   - Heavy impact on cancel
   - Success haptic on completion

4. **Customizable Settings**
   - Notification frequency (15s to 2min)
   - Theme preference
   - Funny mode toggle

5. **Persistent Storage**
   - Timer state recovery
   - Settings preservation
   - AsyncStorage integration

## Troubleshooting

### Common Issues

1. **Module not found errors**
   - Ensure all import paths are correct
   - Check that all files are in the right directories
   - Verify TypeScript configuration

2. **Expo not starting**
   - Clear cache: `expo r -c`
   - Reinstall dependencies: `rm -rf node_modules && npm install`

3. **Haptic not working**
   - Only works on physical devices
   - Check expo-haptics version compatibility

4. **Notifications not showing**
   - Check app state tracking
   - Verify notification permissions
   - Ensure expo-notifications is properly installed

## Development Tips

1. Use React DevTools for debugging state
2. Enable TypeScript strict mode for better type safety
3. Test on both iOS and Android devices
4. Use Expo's network inspector for performance monitoring
5. Implement error boundaries for production stability

## Next Steps After Setup

1. Test all features on multiple devices
2. Optimize animations for performance
3. Add more notification messages
4. Implement analytics
5. Set up automated testing
6. Deploy to app stores

## Support & Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Rork Platform](https://rork.com/)

## License

MIT License - See README.md for details
