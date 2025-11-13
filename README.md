# OffScreen Buddy - Digital Discipline Timer

A beautiful, modern mobile app that helps users stay off their phones using smart notifications and elegant design. Built with Expo and React Native.

## Features

- **Apple-style Timer Display**: Clean, centered HH:MM:SS format with smooth animations
- **Smart Notifications**: Sends funny or serious reminders every 30 seconds when the app is active
- **Haptic Feedback**: Tactile responses on all interactions (light, medium, heavy impacts)
- **Dark Mode Aesthetic**: Deep black background with soft pastel accents
- **Customizable Settings**: Toggle funny mode, adjust notification frequency, and switch themes
- **Cross-Platform**: Works on iOS, Android, and Web

## Tech Stack

- **Framework**: Expo with React Native
- **Language**: TypeScript
- **State Management**: React Context API
- **Animations**: React Native Animated API
- **Notifications**: expo-notifications
- **Storage**: AsyncStorage for persistence

## Installation

1. Clone the repository
```bash
git clone https://github.com/bsakash20/offscreen-buddy.git
cd offscreen-buddy
```

2. Install dependencies
```bash
npm install
# or
bun install
```

3. Start the development server
```bash
npx expo start
```

4. Run on your device or emulator
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app for physical device

## Project Structure

```
offscreen-buddy/
├── app/
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Tab navigation
│   │   ├── index.tsx        # Timer screen
│   │   └── settings.tsx     # Settings screen
│   ├── _layout.tsx          # Root layout with provider
│   └── +not-found.tsx       # 404 page
├── contexts/
│   └── TimerContext.tsx     # Global state management
├── constants/
│   ├── colors.ts            # Color palette
│   └── notifications.ts     # Notification messages
├── assets/                  # Images and icons
└── package.json            # Dependencies
```

## Key Components

### Timer Screen (`app/(tabs)/index.tsx`)
- Apple-style wheel picker for time selection
- Large animated digit display
- Progress ring indicator
- Start/Pause/Cancel controls with haptic feedback

### Settings Screen (`app/(tabs)/settings.tsx`)
- Theme toggle (Light/Dark)
- Funny mode toggle
- Notification frequency adjustment
- How it works information

### Timer Context (`contexts/TimerContext.tsx`)
- Global timer state management
- Notification scheduling
- App state tracking
- Haptic feedback triggers

## Design Highlights

- **Soft Pastel Color Palette**: Lavender primary (#B8A7D6), peachy accents (#FFB4A2)
- **Smooth Animations**: Fade and slide transitions on digit changes
- **Optimal Spacing**: Perfectly balanced layout matching iOS Clock app
- **Mobile-First Design**: Optimized for touch interactions

## Notification Messages

### Funny Mode
- "Put me down, human. I'm tired of being touched 😂"
- "Hey! Lock your phone before it locks eyes with you again 👀"
- "Your screen needs a break — and so do you 💤"
- "Discipline mode: ON. Lock me before I start roasting you 🔥"
- And more...

### Serious Mode
- Professional, focused reminders
- Encouragement messages
- Mindfulness prompts

## License

MIT License - feel free to use this project for your own purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

If you encounter any issues, please open an issue on GitHub.
