// Jest setup file

// Mock React Native components
jest.mock('react-native', () => ({
  View: ({ children, style, ...props }) =>
    require('react').createElement('div', { style: { ...style, display: 'flex' }, ...props }, children),
  Text: ({ children, style, ...props }) =>
    require('react').createElement('span', { style, ...props }, children),
  TouchableOpacity: ({ children, style, onPress, ...props }) =>
    require('react').createElement('button', { style, onClick: onPress, ...props }, children),
  TextInput: ({ style, value, onChangeText, placeholder, ...props }) =>
    require('react').createElement('input', {
      style,
      value,
      onChange: (e) => onChangeText(e.target.value),
      placeholder,
      ...props
    }),
  ScrollView: ({ children, style, ...props }) =>
    require('react').createElement('div', { style: { ...style, overflow: 'auto' }, ...props }, children),
  SafeAreaView: ({ children, style, ...props }) =>
    require('react').createElement('div', { style, ...props }, children),
  Modal: ({ visible, children, ...props }) =>
    visible ? require('react').createElement('div', { ...props }, children) : null,
  ActivityIndicator: ({ style, ...props }) =>
    require('react').createElement('div', { style: { ...style, animation: 'spin 1s linear infinite' }, ...props }),
  Alert: {
    alert: jest.fn(),
  },
  StyleSheet: {
    create: (styles) => styles,
    flatten: (styles) => styles,
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    Version: 15,
    select: (obj) => obj.ios || obj.default,
  },
  PermissionsAndroid: {
    PERMISSIONS: {
      RECORD_AUDIO: 'android.permission.RECORD_AUDIO',
      POST_NOTIFICATIONS: 'android.permission.POST_NOTIFICATIONS',
      CALL_PHONE: 'android.permission.CALL_PHONE'
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied'
    },
    request: jest.fn(),
    check: jest.fn(),
  },
}));

// Mock Expo modules
jest.mock('expo-font', () => ({
  loadAsync: jest.fn(),
  useFonts: jest.fn(),
  isLoaded: true,
}));

jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
    extras: {},
  },
}));

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  Stack: {
    Screen: ({ children }) => children,
  },
}));

// Mock NativeWind
jest.mock('nativewind', () => ({
  styled: (component) => component,
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  AntDesign: 'AntDesign',
  Entypo: 'Entypo',
  Fontisto: 'Fontisto',
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: true,
  brand: 'Apple',
  manufacturer: 'Apple',
  modelName: 'iPhone',
  modelId: 'iPhone14,2',
  deviceName: 'Test iPhone',
  deviceYearClass: 2021,
  totalMemory: 4000000000,
  supportedCpuArchitectures: ['arm64'],
  osName: 'iOS',
  osVersion: '15.0',
  osBuildId: '19A346',
  osInternalBuildId: '19A346',
  osBuildFingerprint: null,
  platformApiLevel: null,
  deviceType: 1,
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
  dismissNotificationAsync: jest.fn().mockResolvedValue(undefined),
  dismissAllNotificationsAsync: jest.fn().mockResolvedValue(undefined),
  getPresentedNotificationsAsync: jest.fn().mockResolvedValue([]),
  setBadgeCountAsync: jest.fn().mockResolvedValue(undefined),
  getBadgeCountAsync: jest.fn().mockResolvedValue(0),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  AndroidImportance: {
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-1234-5678-90ab-cdef'),
}));

// Mock react-native-get-random-values
jest.mock('react-native-get-random-values', () => {
  // Polyfill crypto.getRandomValues
  if (typeof global.crypto === 'undefined') {
    global.crypto = {};
  }
  global.crypto.getRandomValues = (arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  };
  return {};
});

// Mock Logger to prevent initialization errors
jest.mock('./app/utils/Logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    payment: jest.fn(),
    auth: jest.fn(),
    userAction: jest.fn(),
    performance: jest.fn(),
    security: jest.fn(),
    apiRequest: jest.fn(),
    errorWithStack: jest.fn(),
    getLogs: jest.fn().mockResolvedValue([]),
    clearLogs: jest.fn().mockResolvedValue(undefined),
    flushNow: jest.fn().mockResolvedValue(undefined),
    setUserSession: jest.fn(),
  },
  logError: jest.fn(),
  logWarn: jest.fn(),
  logInfo: jest.fn(),
  logDebug: jest.fn(),
  logPayment: jest.fn(),
  logAuth: jest.fn(),
  logUserAction: jest.fn(),
  logPerformance: jest.fn(),
  logSecurity: jest.fn(),
  logApiRequest: jest.fn(),
  LogLevel: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  }
}));

// Mock create-context-hook
jest.mock('@nkzw/create-context-hook', () => ({
  default: (providerFn) => {
    const Context = require('react').createContext(null);
    const Provider = ({ children }) => {
      const value = providerFn();
      return require('react').createElement(Context.Provider, { value }, children);
    };
    return [Provider, () => require('react').useContext(Context)];
  },
}));

// Mock haptics and sound utilities
jest.mock('./app/utils/HapticManager', () => ({
  HapticUtils: {
    settingToggle: jest.fn(),
    timerStart: jest.fn(),
    timerPause: jest.fn(),
    timerComplete: jest.fn(),
    timerCancel: jest.fn(),
  },
}));

jest.mock('./app/utils/SoundManager', () => ({
  SoundUtils: {
    buttonPress: jest.fn(),
    timerStart: jest.fn(),
    timerPause: jest.fn(),
    completionFanfare: jest.fn(),
    timerCancel: jest.fn(),
  },
}));

// Mock platform-specific modules
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: 13,
  isTV: false,
  isTesting: true,
  select: (obj) => obj.ios || obj.default,
}));

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  Platform: {
    OS: 'ios',
    select: (obj) => obj.ios || obj.default,
  },
  requireNativeModule: () => ({}),
  requireOptionalNativeModule: () => ({}),
  Log: {
    log: () => { },
    warn: () => { },
    error: () => { },
  },
}));

// Mock timers
jest.useFakeTimers();

// Suppress console warnings during tests
const originalWarn = console.warn;
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('useNativeDriver'))
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

// Setup console.log mocking
const originalLog = console.log;
console.log = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Settings pressed')) {
    // This is expected behavior from the upgrade button test
    return;
  }
  originalLog.call(console, ...args);
};