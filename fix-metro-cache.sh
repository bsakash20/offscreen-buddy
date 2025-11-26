#!/bin/bash

echo "🔧 Fixing Metro bundler test file error..."
echo ""

# Kill any running Metro bundlers
echo "1. Stopping Metro bundler..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "   No Metro bundler running"

# Clear caches
echo ""
echo "2. Clearing Metro cache..."
rm -rf .expo
rm -rf node_modules/.cache
rm -rf /tmp/metro-* 2>/dev/null
rm -rf /tmp/haste-map-* 2>/dev/null

echo ""
echo "3. Cache cleared!"
echo ""
echo "✅ Done! Now restart your app with:"
echo "   npm start"
echo "   or"
echo "   npx expo start --clear"
echo ""
echo "The metro.config.js has been updated to exclude test files from bundling."
