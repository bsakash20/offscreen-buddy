#!/usr/bin/env node

/**
 * Clean iOS build script to resolve Metro bundling issues
 * This script performs a complete clean build process for iOS
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Starting clean iOS build process...');

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
};

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, description) {
    log(`\n🔧 ${description}...`, colors.blue);
    try {
        execSync(command, {
            stdio: 'inherit',
            cwd: process.cwd(),
            env: { ...process.env, FORCE_COLOR: '1' }
        });
        log(`✅ ${description} completed successfully`, colors.green);
    } catch (error) {
        log(`❌ ${description} failed: ${error.message}`, colors.red);
        throw error;
    }
}

function checkFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        log(`⚠️ File not found: ${filePath}`, colors.yellow);
        return false;
    }
    return true;
}

try {
    // Step 1: Clean Metro bundler cache
    log('\n🗑️ Step 1: Cleaning Metro bundler cache...', colors.blue);
    runCommand('npx expo start --clear', 'Clearing Metro cache');

    // Step 2: Clean node_modules
    log('\n🗑️ Step 2: Cleaning node_modules...', colors.blue);
    if (checkFileExists('node_modules')) {
        runCommand('rm -rf node_modules', 'Removing node_modules');
    }

    // Step 3: Clean package-lock.json
    log('\n🗑️ Step 3: Cleaning package-lock.json...', colors.blue);
    if (checkFileExists('package-lock.json')) {
        runCommand('rm package-lock.json', 'Removing package-lock.json');
    }

    // Step 4: Clean Expo build cache
    log('\n🗑️ Step 4: Cleaning Expo build cache...', colors.blue);
    runCommand('npx expo install --fix', 'Fixing Expo dependencies');

    // Step 5: Reinstall dependencies
    log('\n📦 Step 5: Reinstalling dependencies...', colors.blue);
    runCommand('npm install', 'Installing npm dependencies');

    // Step 6: Clean iOS build if it exists
    log('\n🍎 Step 6: Cleaning iOS build...', colors.blue);
    const iosDir = path.join('app', 'ios');
    const xcodeDerivedData = path.join(process.env.HOME || '', 'Library', 'Developer', 'Xcode', 'DerivedData');

    if (checkFileExists(iosDir)) {
        runCommand(`cd ${iosDir} && rm -rf build`, 'Cleaning iOS build directory');
        runCommand(`cd ${iosDir} && xcodebuild clean`, 'Cleaning Xcode project');
    }

    if (checkFileExists(xcodeDerivedData)) {
        runCommand(`rm -rf ${xcodeDerivedData}`, 'Cleaning Xcode DerivedData');
    }

    // Step 7: Verify Metro configuration
    log('\n🔍 Step 7: Verifying Metro configuration...', colors.blue);
    const metroConfig = fs.readFileSync('metro.config.js', 'utf8');
    if (!metroConfig.includes('unstable_enableSymlinkResolution')) {
        log('⚠️ Metro config may need symlink resolution enabled', colors.yellow);
    }

    // Step 8: Test Metro bundler
    log('\n🧪 Step 8: Testing Metro bundler...', colors.blue);
    runCommand('npx expo start --no-dev --minify', 'Testing Metro bundler');

    log('\n🎉 Clean iOS build process completed successfully!', colors.green);
    log('🚀 You can now run: npx expo run:ios', colors.blue);

} catch (error) {
    log(`\n💥 Clean build failed: ${error.message}`, colors.red);
    log('\nTroubleshooting steps:', colors.yellow);
    log('1. Check that you have the latest Node.js version', colors.yellow);
    log('2. Ensure Xcode is up to date', colors.yellow);
    log('3. Run: npx expo install --fix', colors.yellow);
    log('4. Try: npx expo start --clear', colors.yellow);
    process.exit(1);
}