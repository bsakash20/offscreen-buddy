module.exports = {
  preset: 'jest-expo',
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-community|expo|expo-.*|@expo|@unimodules|unimodules|react-navigation|@react-navigation|native-base|react-native-svg|uuid|react-native-get-random-values)/)',
  ],
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.js',
  ],
  moduleFileExtensions: [
    'js',
    'jsx',
    'ts',
    'tsx',
    'json',
  ],
  testMatch: [
    '<rootDir>/app/**/__tests__/**/*.{js,jsx,ts,tsx}',
    '<rootDir>/app/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/testing/**/*.{test,spec}.{js,jsx,ts,tsx}',
    '<rootDir>/testing/**/*.{test,spec}.js',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    '!app/**/*.d.ts',
    '!app/**/index.{js,jsx,ts,tsx}',
    '!app/**/types/**',
    '!app/**/*.config.js',
    // Include testing utilities but exclude actual test files
    'testing/utilities/**/*.{js,jsx,ts,tsx}',
    '!testing/**/*.test.{js,jsx,ts,tsx}',
    '!testing/**/*.spec.{js,jsx,ts,tsx}',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    // Specific coverage requirements for different testing categories
    'testing/unit/**': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    'testing/integration/**': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
  },
  moduleNameMapper: {
    // Match TypeScript path mapping pattern: @/* -> ./*
    '^@/(.*)$': '<rootDir>/$1',
    // Specific app path mappings
    '^@/app/(.*)$': '<rootDir>/app/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/assets/(.*)$': '<rootDir>/app/assets/$1',
    '^@/constants/(.*)$': '<rootDir>/app/constants/$1',
    '^@/contexts/(.*)$': '<rootDir>/app/contexts/$1',
    '^@/utils/(.*)$': '<rootDir>/app/utils/$1',
    '^@/services/(.*)$': '<rootDir>/app/services/$1',
    // Testing utilities mapping
    '^@/testing/(.*)$': '<rootDir>/testing/$1',
    '^@/test-utils/(.*)$': '<rootDir>/testing/utilities/test-utils/$1',
    '^@/mock-data/(.*)$': '<rootDir>/testing/utilities/mock-data/$1',
    '^@/test-config/(.*)$': '<rootDir>/testing/utilities/test-configs/$1',
    '\\.(png|jpg|jpeg|svg|gif)$': '<rootDir>/app/__mocks__/fileMock.js',
    '\\.(css|scss|less)$': '<rootDir>/app/__mocks__/styleMock.js'
  },
  testEnvironment: 'jsdom',
  verbose: true,
  // Global test timeout
  testTimeout: 30000,
  // Cache configuration
  cacheDirectory: '<rootDir>/.jest-cache',
  // Maximum workers for parallel testing
  maxWorkers: '50%',
  // Clear mocks between tests
  clearMocks: true,
  // Reset modules between tests to prevent state leakage
  resetModules: true,
};