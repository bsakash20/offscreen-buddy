const { defineConfig } = require('eslint/config');

module.exports = defineConfig([
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                exports: 'readonly',
                global: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }],
            'no-console': 'warn',
            'prefer-const': 'error',
            'no-var': 'error',
            'object-shorthand': 'error',
            'prefer-template': 'error',
            'template-curly-spacing': ['error', 'never'],
            'arrow-spacing': 'error',
            'comma-dangle': ['error', 'never'],
            'comma-spacing': ['error', { before: false, after: true }],
            'key-spacing': ['error', { beforeColon: false, afterColon: true }],
            'space-before-blocks': 'error',
            'space-in-parens': ['error', 'never'],
            'space-infix-ops': 'error',
            'keyword-spacing': 'error'
        },
        ignores: [
            'node_modules/*',
            'dist/*',
            'logs/*',
            'reports/*',
            'cache/*',
            '*.log',
            'coverage/*'
        ]
    }
]);