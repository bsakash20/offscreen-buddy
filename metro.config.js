const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

config.resolver.blockList = [
    // Only exclude actual test files, not utilities
    /.*\.(test|spec)\.(ts|tsx|js|jsx)$/,
    // Exclude test directories
    /.*\/__tests__\/.*/,
    // Keep test utilities and mocks for testing
];

module.exports = config;