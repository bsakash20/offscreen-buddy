const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*", "node_modules/*", ".expo/*", "*.config.js", "app/**"],
    rules: {
      // Add project-specific rules (only using built-in ESLint rules)
      "prefer-const": "error",
      "no-unused-vars": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
]);