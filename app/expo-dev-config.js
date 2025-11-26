module.exports = {
  expo: {
    name: 'OffScreen Buddy',
    slug: 'offscreen-buddy',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: [
      '**/*'
    ],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.offscreenbuddy.app'
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.offscreenbuddy.app'
    },
    web: {
      favicon: './assets/images/favicon.png',
      bundler: 'metro'
    },
    plugins: [
      'expo-font',
      'expo-router'
    ],
    experiments: {
      typedRoutes: true
    }
  }
};
