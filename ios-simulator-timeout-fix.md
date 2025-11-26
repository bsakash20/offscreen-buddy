# iOS Simulator Timeout Fix - Complete Solution

## Problem Diagnosis ✅ COMPLETED
- **Metro Bundler**: ✅ Running correctly on port 8081
- **Network Connectivity**: ✅ Accessible at 192.168.31.186:8081
- **iOS Bundle Generation**: ✅ Working and serving content
- **Issue**: iOS simulator `xcrun simctl openurl` timeout (code 60)

## Root Cause
The iOS simulator timeout when opening `exp://` URLs is typically caused by:
1. Simulator URL scheme handling issues
2. Expo Go app configuration problems
3. Network interface access timeout
4. Missing or incorrect URL scheme registration

## Immediate Solutions

### Solution 1: Restart iOS Simulator with Clean State

```bash
# Stop the current simulator
xcrun simctl shutdown all

# Clear simulator data and restart
xcrun simctl erase all
open -a Simulator

# Wait for simulator to fully boot, then try opening URL again
```

### Solution 2: Use Alternative Expo Host Configurations

Stop current Metro bundler and try different host options:

```bash
# Option A: Use localhost (recommended for simulator)
npm start -- --host localhost

# Option B: Use tunnel (bypasses network issues)
npm start -- --host tunnel

# Option C: Use explicit interface binding
npm start -- --host 192.168.31.186
```

### Solution 3: Manual URL Installation Method

Instead of automatic URL opening:

1. **Copy the Expo URL** from terminal (e.g., `exp://192.168.31.186:8081`)
2. **Open Safari in iOS simulator**
3. **Navigate to Expo Go URL manually**: Paste URL in Safari
4. **Safari will prompt to open in Expo Go** (if installed)

### Solution 4: Expo Go App Verification

Ensure Expo Go is properly installed:

```bash
# Check if Expo Go is available in simulator
xcrun simctl list | grep "Booted"

# If Expo Go not found, install via Expo Go app store
# Or use web-based Expo Go: https://expo.dev/go
```

### Solution 5: QR Code Alternative

Generate QR code for scanning:

```bash
# Start with QR code enabled
npm start -- --host lan --qr

# Scan QR code with iOS camera or Expo Go
```

## Advanced Troubleshooting

### Check Simulator Network Configuration

```bash
# List active simulators
xcrun simctl list devices

# Check simulator network status
xcrun simctl spawn booted ifconfig

# Verify simulator can reach your machine
xcrun simctl spawn booted ping -c 3 192.168.31.186
```

### Metro Bundler Network Verification

```bash
# Test all possible endpoints
curl -I http://localhost:8081/status
curl -I http://192.168.31.186:8081/status
curl -I http://0.0.0.0:8081/status

# Check Metro bundler logs for any errors
# Look for binding interface issues
```

### Alternative URL Schemes to Test

If `exp://` continues to fail, try these manual methods:

1. **HTTP URL Method**: Use `http://` instead of `exp://`
2. **Expo Dev Client**: Test with custom dev client
3. **Web Version**: Use `http://192.168.31.186:8081` in Safari

## Recommended Fix Sequence

1. **First**: Try Solution 2A (localhost host)
2. **Second**: If still failing, use Solution 1 (clean simulator restart)
3. **Third**: Use Solution 3 (manual URL paste in Safari)
4. **Fourth**: Try Solution 4 (QR code method)
5. **Fallback**: Use Solution 2B (tunnel host)

## Success Indicators

You'll know the fix worked when you see:
- Expo app loading in iOS simulator
- Metro bundler shows "Connected to iOS simulator"
- No timeout errors in terminal
- App interface appears and functions correctly

## Prevention Tips

- Always wait for Metro bundler to fully start before opening in simulator
- Use `localhost` host when possible for development
- Keep Expo Go updated in the simulator
- Periodically clean simulator data to prevent corruption