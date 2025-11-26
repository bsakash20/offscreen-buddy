#!/bin/bash
# iOS Simulator Connection Script
# This script helps connect the React Native app to iOS simulator

echo "🚀 iOS Simulator Connection Helper"
echo "=================================="

# Check if Metro bundler is running
echo "📡 Checking Metro bundler status..."
if curl -s http://localhost:8081/status | grep -q "packager-status:running"; then
    echo "✅ Metro bundler is running correctly"
else
    echo "❌ Metro bundler is not running. Please start it with:"
    echo "   npm start -- --host tunnel"
    exit 1
fi

# Check for iOS simulators
echo "📱 Checking iOS simulators..."
BOOTED_SIMULATORS=$(xcrun simctl list devices | grep "Booted" | grep -v "unavailable")
if [ -z "$BOOTED_SIMULATORS" ]; then
    echo "❌ No iOS simulators are currently booted"
    echo "Please open Simulator app and boot a device"
    exit 1
else
    echo "✅ Found booted iOS simulator(s):"
    echo "$BOOTED_SIMULATORS"
fi

# Get the Expo URL
echo ""
echo "🔗 Connection URLs:"
echo "==================="
echo "Metro Status: http://localhost:8081/status"
echo "iOS Bundle:   http://localhost:8081/index.bundle?platform=ios"
echo ""

# Get local IP for LAN access
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "Unable to detect")
if [ "$LOCAL_IP" != "Unable to detect" ]; then
    echo "LAN URL:       http://$LOCAL_IP:8081"
    echo ""
fi

echo "📋 CONNECTION INSTRUCTIONS:"
echo "=========================="
echo ""
echo "Method 1: Safari Browser (RECOMMENDED)"
echo "1. Open Safari in the iOS simulator"
echo "2. Go to: http://localhost:8081"
echo "3. Look for 'Run on iOS simulator' button"
echo "4. Click it to open the app"
echo ""
echo "Method 2: Expo Go App"
echo "1. Open Expo Go app in the simulator"
echo "2. Enter URL: exp://localhost:8081"
echo "3. Wait for connection"
echo ""
echo "Method 3: Manual QR (if available)"
echo "1. Look for QR code in terminal output"
echo "2. Scan with iOS Camera app"
echo "3. Tap notification to open in Expo Go"
echo ""
echo "🎯 The app should now open without timeout errors!"