const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude backend directory from Metro bundler
// The backend is a separate Node.js Express server, not part of the Expo app
config.resolver.blockList = [
    /backend\/.*/,
    /.*\.test\..*/,
    /.*__tests__.*/,
];

// Ensure Metro doesn't watch the backend directory
config.watchFolders = config.watchFolders || [];

// Exclude backend from watch to improve performance
config.resolver.resolverMainFields = ['react-native', 'browser', 'main'];

module.exports = config;