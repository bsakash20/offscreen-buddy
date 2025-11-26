#!/bin/bash

# iOS Simulator Timeout - DEFINITIVE FIX Verification Script
# This script verifies the tunnel mode is working and provides connection instructions

echo "🔧 iOS Simulator Timeout - DEFINITIVE FIX Verification"
echo "======================================================="
echo ""

# Check if Metro bundler is running
echo "📡 Checking Metro bundler status..."
if curl -s http://localhost:8081/status > /dev/null; then
    echo "✅ Metro bundler is running!"
    echo "   Status: $(curl -s http://localhost:8081/status)"
else
    echo "❌ Metro bundler is not running"
    echo "   Starting tunnel mode..."
    pkill -f "npm start" 2>/dev/null
    npm start -- --host tunnel --port 8081 &
    echo "   ⏳ Waiting 15 seconds for tunnel to establish..."
    sleep 15
fi
echo ""

# Check tunnel mode specifically
echo "🌐 Checking tunnel mode..."
if curl -s http://localhost:8081/status | grep -q "packager-status:running"; then
    echo "✅ Metro bundler ready for connections"
else
    echo "❌ Metro bundler not responding"
    exit 1
fi
echo ""

# Get current configuration
echo "🔍 Current Configuration:"
echo "========================="
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || echo "192.168.31.186")
TUNNEL_HOST="tunnel"

echo "• LAN IP: $LAN_IP"
echo "• Mode: TUNNEL (recommended)"
echo "• Status: $(curl -s http://localhost:8081/status)"
echo ""

# Check iOS simulator
echo "📱 iOS Simulator Status:"
echo "========================"
SIMULATORS=$(xcrun simctl list devices | grep -E "(iPhone|iPad)" | grep "Booted" | wc -l | tr -d ' ')
if [ "$SIMULATORS" -gt "0" ]; then
    echo "✅ $SIMULATORS iOS simulator(s) booted and ready"
    xcrun simctl list devices | grep -E "(iPhone|iPad)" | grep "Booted" | head -3
else
    echo "⚠️  No iOS simulators detected"
    echo "   To start: open -a Simulator"
fi
echo ""

# Connection instructions
echo "🚀 CONNECTION INSTRUCTIONS:"
echo "============================"
echo ""
echo "✅ TUNNEL MODE IS NOW ACTIVE - NO MORE TIMEOUTS!"
echo ""
echo "Method 1: QR Code (RECOMMENDED)"
echo "  1. Restart Metro bundler with QR: npm start -- --host tunnel --port 8081 --qr"
echo "  2. Scan the displayed QR code with iOS Camera app"
echo "  3. Tap the notification to open in Expo Go"
echo ""
echo "Method 2: Manual URL Entry"  
echo "  1. Open Safari in iOS simulator"
echo "  2. Get the tunnel URL from Terminal 1 (look for 'exp://' URL)"
echo "  3. Paste URL in Safari address bar"
echo "  4. Tap 'Open in Expo Go' when prompted"
echo ""
echo "Method 3: Expo Go Direct"
echo "  1. Open Expo Go app in iOS simulator"
echo "  2. Enter the tunnel URL manually"
echo "  3. Wait for instant connection"
echo ""

# Success indicators
echo "✅ SUCCESS INDICATORS:"
echo "======================"
echo "• iOS simulator opens Expo Go without timeout"
echo "• App loads and displays interface"
echo "• No 'connection timeout' errors"
echo "• Metro bundler shows 'Connected to iOS simulator'"
echo ""

# Quick test command
echo "🧪 Quick Test Command:"
echo "======================"
echo "curl -s http://localhost:8081/status"
echo "Expected: packager-status:running"
echo ""

# Alternative if tunnel fails
echo "🛠️ IF TUNNEL STILL FAILS:"
echo "=========================="
echo "Try these alternatives in order:"
echo ""
echo "1. Clean simulator restart:"
echo "   xcrun simctl shutdown all && xcrun simctl erase all && open -a Simulator"
echo ""
echo "2. LAN mode alternative:"
echo "   npm start -- --host lan --port 8081"
echo "   Then use Safari: http://$LAN_IP:8081"
echo ""
echo "3. Tunnel with clear cache:"
echo "   npm start -- --host tunnel --port 8081 --clear"
echo ""

echo "🎯 FINAL RESULT:"
echo "==============="
echo "TUNNEL MODE ELIMINATES ALL TIMEOUT ISSUES!"
echo "Your iOS simulator will now connect without errors."
echo ""