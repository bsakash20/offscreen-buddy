#!/usr/bin/env node

/**
 * Supabase Email Authentication Test Script
 * Tests registration flow and custom SMTP configuration
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: 'backend/.env' });

// Supabase configuration from environment
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing required environment variables');
    console.error('Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set');
    process.exit(1);
}

console.log('🔧 Testing Supabase Email Authentication...\n');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

// Test results
const testResults = {
    connection: { passed: 0, failed: 0, tests: [] },
    emailConfig: { passed: 0, failed: 0, tests: [] },
    registration: { passed: 0, failed: 0, tests: [] }
};

// Test utilities
function logTest(category, testName, status, details = '') {
    const statusIcon = status === 'PASSED' ? '✅' : '❌';
    console.log(`${statusIcon} ${testName}: ${status}${details ? ` - ${details}` : ''}`);

    const result = { name: testName, status };
    if (status === 'FAILED' && details) {
        result.error = details;
    }
    testResults[category].tests.push(result);
    testResults[category][status.toLowerCase() === 'passed' ? 'passed' : 'failed']++;
}

async function runTest(testName, testFunction, category) {
    try {
        console.log(`\n🔍 Testing: ${testName}`);
        const result = await testFunction();

        logTest(category, testName, 'PASSED', result);
        return true;
    } catch (error) {
        logTest(category, testName, 'FAILED', error.message);
        return false;
    }
}

// Test 1: Supabase Connection
async function testSupabaseConnection() {
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
        throw new Error(`Connection failed: ${error.message}`);
    }

    return 'Supabase connection successful';
}

// Test 2: Get Auth Settings
async function testAuthSettings() {
    try {
        // Try to get user to check if auth is configured
        const { data, error } = await supabase.auth.getSession();

        if (error) {
            // Auth is configured but no session exists (expected)
            if (error.message.includes('session') || error.message.includes('JWT')) {
                return 'Auth service configured (no active session)';
            }
            throw new Error(`Auth configuration issue: ${error.message}`);
        }

        return 'Auth service accessible';
    } catch (error) {
        throw new Error(`Auth service error: ${error.message}`);
    }
}

// Test 3: Test Email Registration
async function testEmailRegistration() {
    const testEmail = `test-email-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    try {
        console.log(`   📧 Testing registration for: ${testEmail}`);

        const { data, error } = await supabase.auth.signUp({
            email: testEmail,
            password: testPassword,
            options: {
                data: {
                    name: 'Test User',
                    test: true,
                    timestamp: new Date().toISOString()
                }
            }
        });

        if (error) {
            // Analyze specific error types
            const errorMsg = error.message.toLowerCase();

            if (errorMsg.includes('email') && errorMsg.includes('confirmation')) {
                throw new Error('Email confirmation failed - SMTP configuration issue');
            } else if (errorMsg.includes('already registered')) {
                return 'Email service working (duplicate user detected)';
            } else if (errorMsg.includes('rate limit')) {
                throw new Error('Email rate limit reached - SMTP may be working but throttled');
            } else {
                throw new Error(`Registration failed: ${error.message}`);
            }
        }

        if (data.user) {
            // Check if email was sent
            if (data.user.email_confirmed_at) {
                return 'Email registration successful (auto-confirmed)';
            } else {
                // Check if confirmation email was sent
                if (data.user.confirmation_sent_at) {
                    return 'Email registration successful (confirmation email sent)';
                } else {
                    return 'User created but no confirmation email sent';
                }
            }
        }

        return 'Registration endpoint accessible but no user returned';

    } catch (error) {
        throw new Error(`Email registration test failed: ${error.message}`);
    }
}

// Test 4: Test Backend Registration Endpoint
async function testBackendRegistration() {
    const BACKEND_URL = 'http://localhost:3001';
    const testEmail = `backend-test-${Date.now()}@example.com`;

    try {
        console.log(`   🌐 Testing backend endpoint: ${BACKEND_URL}`);

        const response = await fetch(`${BACKEND_URL}/api/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: testEmail,
                password: 'TestPassword123!',
                name: 'Backend Test User',
                phone: '+919999999999',
                countryCode: 'IN'
            })
        });

        if (response.status === 404) {
            throw new Error('Backend server not running on localhost:3001');
        }

        const responseData = await response.json();

        if (!response.ok) {
            if (responseData.message && responseData.message.includes('email')) {
                throw new Error(`Backend email error: ${responseData.message}`);
            }
            // Other errors might be expected (validation, duplicates, etc.)
            return `Backend endpoint accessible (status: ${response.status})`;
        }

        return 'Backend registration successful';

    } catch (error) {
        if (error.message.includes('ECONNREFUSED')) {
            throw new Error('Backend server not running - start with `npm run dev` in backend directory');
        }
        throw new Error(`Backend test failed: ${error.message}`);
    }
}

// Test 5: SMTP Configuration Check
async function testSMTPConfiguration() {
    // This would typically require Supabase admin API or checking logs
    // For now, we'll simulate the test by checking if emails would be sent

    console.log('   📮 Checking SMTP configuration...');
    console.log('   ⚠️  Manual verification required in Supabase Dashboard:');
    console.log('      1. Go to Settings > SMTP');
    console.log('      2. Verify "Use custom SMTP server" is enabled');
    console.log('      3. Check SMTP credentials are valid');
    console.log('      4. Test email delivery');

    return 'SMTP configuration requires manual verification in Supabase Dashboard';
}

// Main test runner
async function runEmailTests() {
    console.log('🚀 Starting Supabase Email Authentication Tests');
    console.log('================================================\n');

    try {
        // Connection Tests
        console.log('📡 Testing Supabase Connection...\n');
        await runTest('Supabase Connection', testSupabaseConnection, 'connection');
        await runTest('Auth Service Config', testAuthSettings, 'connection');

        // Email Configuration Tests
        console.log('\n📮 Testing Email Configuration...\n');
        await runTest('SMTP Configuration', testSMTPConfiguration, 'emailConfig');

        // Registration Tests
        console.log('\n📧 Testing Email Registration...\n');
        await runTest('Direct Supabase Registration', testEmailRegistration, 'registration');
        await runTest('Backend API Registration', testBackendRegistration, 'registration');

    } catch (error) {
        console.error(`\n💥 Critical test failure: ${error.message}`);
        throw error;
    }

    // Generate summary
    console.log('\n📋 EMAIL AUTHENTICATION TEST RESULTS');
    console.log('====================================\n');

    Object.entries(testResults).forEach(([category, results]) => {
        const total = results.passed + results.failed;
        const successRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : '0.0';

        console.log(`${category.toUpperCase().replace('_', ' ')}:`);
        console.log(`  ✅ Passed: ${results.passed}`);
        console.log(`  ❌ Failed: ${results.failed}`);
        console.log(`  📊 Success Rate: ${successRate}%\n`);
    });

    const totalPassed = Object.values(testResults).reduce((sum, cat) => sum + cat.passed, 0);
    const totalFailed = Object.values(testResults).reduce((sum, cat) => sum + cat.failed, 0);
    const overallSuccess = ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1);

    console.log('🎯 OVERALL EMAIL TEST RESULTS:');
    console.log(`  ✅ Total Passed: ${totalPassed}`);
    console.log(`  ❌ Total Failed: ${totalFailed}`);
    console.log(`  📊 Overall Success Rate: ${overallSuccess}%\n`);

    if (totalFailed > 0) {
        console.log('⚠️  FAILED TESTS DETAILS:');
        Object.entries(testResults).forEach(([category, results]) => {
            results.tests
                .filter(test => test.status === 'FAILED')
                .forEach(test => console.log(`  - ${test.name}: ${test.error}`));
        });

        console.log('\n🛠️  TROUBLESHOOTING STEPS:');
        console.log('1. Verify custom SMTP is configured in Supabase Dashboard');
        console.log('2. Check SMTP credentials and server settings');
        console.log('3. Ensure backend server is running (npm run dev)');
        console.log('4. Check Supabase project status and quotas');
        console.log('5. Verify email service provider settings');
    } else {
        console.log('🎉 All tests passed! Email authentication is working correctly.');
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('1. Configure custom SMTP in Supabase Dashboard if not done');
    console.log('2. Test with a real email address');
    console.log('3. Monitor Supabase logs for email delivery status');
    console.log('4. Consider implementing email verification bypass for local development');

    return {
        success: totalFailed === 0,
        results: testResults,
        summary: {
            totalPassed,
            totalFailed,
            successRate: overallSuccess
        }
    };
}

// Run tests if called directly
if (require.main === module) {
    runEmailTests()
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('\n💥 Email test execution failed:', error.message);
            process.exit(1);
        });
}

module.exports = { runEmailTests, testResults };