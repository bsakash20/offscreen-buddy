module.exports = {
    testEnvironment: 'node',
    verbose: true,
    setupFilesAfterEnv: ['./tests/setup.js'],
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: [
        '/node_modules/',
        '/migrations/'
    ],
    testMatch: [
        "**/tests/**/*.test.js",
        "**/tests/**/*.spec.js"
    ]
};
