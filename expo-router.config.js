/**
 * Expo Router Configuration
 * Specifies which files and directories should be ignored by the router
 */

module.exports = {
    // Array of glob patterns for files to ignore in the app directory
    // These files won't be treated as routes
    ignore: [
        // Utility and service directories
        '**/hooks/**',
        '**/services/**',
        '**/types/**',
        '**/utils/**',
        '**/contexts/**',
        '**/config/**',
        '**/components/**',
        '**/architecture/**',
        '**/design-system/**',
        '**/native/**',
        '**/gestures/**',
        '**/assets/**',

        // Specific file patterns
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/types.ts',
        '**/index.ts',

        // Other non-route files
        '**/README.md',
        '**/*.md',
        '**/*.json',
        '**/*.js'
    ]
};
