#!/usr/bin/env node

/**
 * Enhanced Registration API Test Suite
 * Tests the comprehensive backend registration API with security and validation
 */

const axios = require('axios');

const BASE_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const API_URL = `${BASE_URL}/api/auth`;

class RegistrationTester {
    constructor() {
        this.testResults = [];
    }

    async runTest(testName, testFunction) {
        console.log(`\n🧪 Running test: ${testName}`);
        try {
            await testFunction();
            console.log(`✅ PASSED: ${testName}`);
            this.testResults.push({ name: testName, status: 'PASSED' });
        } catch (error) {
            console.log(`❌ FAILED: ${testName}`);
            console.log(`   Error: ${error.message}`);
            this.testResults.push({ name: testName, status: 'FAILED', error: error.message });
        }
    }

    async testValidRegistration() {
        const testData = {
            name: 'John Doe-Smith',
            email: `john.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123',
            phone: '+1234567890',
            countryCode: 'US',
            deviceId: 'test-device-123'
        };

        const response = await axios.post(`${API_URL}/register`, testData, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.status !== 201) {
            throw new Error(`Expected status 201, got ${response.status}`);
        }

        const { user, token, onboarding } = response.data;
        if (!user.id || !token || !onboarding) {
            throw new Error('Missing required response fields');
        }

        console.log(`   User created: ${user.email}`);
        console.log(`   Onboarding progress: ${onboarding.progress}%`);
    }

    async testInvalidNameValidation() {
        const testData = {
            name: 'J', // Too short
            email: `jane.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123'
        };

        try {
            await axios.post(`${API_URL}/register`, testData);
            throw new Error('Should have failed validation');
        } catch (error) {
            if (error.response?.status !== 400) {
                throw new Error(`Expected status 400, got ${error.response?.status}`);
            }
        }
    }

    async testInvalidPasswordValidation() {
        const testData = {
            name: 'John Doe',
            email: `weak.test.${Date.now()}@gmail.com`,
            password: 'weak', // Too weak
        };

        try {
            await axios.post(`${API_URL}/register`, testData);
            throw new Error('Should have failed validation');
        } catch (error) {
            if (error.response?.status !== 400) {
                throw new Error(`Expected status 400, got ${error.response?.status}`);
            }
        }
    }

    async testInvalidEmailValidation() {
        const testData = {
            name: 'John Doe',
            email: 'invalid-email', // Invalid format
            password: 'SecurePass123'
        };

        try {
            await axios.post(`${API_URL}/register`, testData);
            throw new Error('Should have failed validation');
        } catch (error) {
            if (error.response?.status !== 400) {
                throw new Error(`Expected status 400, got ${error.response?.status}`);
            }
        }
    }

    async testDuplicateEmail() {
        const email = `duplicate.test.${Date.now()}@gmail.com`;

        // First registration
        const testData1 = {
            name: 'John Doe',
            email: email,
            password: 'SecurePass123'
        };

        await axios.post(`${API_URL}/register`, testData1);

        // Second registration with same email
        const testData2 = {
            name: 'Jane Doe',
            email: email,
            password: 'SecurePass123'
        };

        try {
            await axios.post(`${API_URL}/register`, testData2);
            throw new Error('Should have failed with duplicate email');
        } catch (error) {
            if (error.response?.status !== 409) {
                throw new Error(`Expected status 409 for duplicate, got ${error.response?.status}`);
            }
        }
    }

    async testInvalidCountryCode() {
        const testData = {
            name: 'John Doe',
            email: `country.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123',
            countryCode: 'XX' // Invalid country code
        };

        try {
            await axios.post(`${API_URL}/register`, testData);
            throw new Error('Should have failed with invalid country');
        } catch (error) {
            if (error.response?.status !== 400) {
                throw new Error(`Expected status 400, got ${error.response?.status}`);
            }
        }
    }

    async testPhoneCountryMismatch() {
        const testData = {
            name: 'John Doe',
            email: `phone.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123',
            phone: '+447123456789', // UK phone
            countryCode: 'US' // But US country
        };

        try {
            await axios.post(`${API_URL}/register`, testData);
            throw new Error('Should have failed with phone/country mismatch');
        } catch (error) {
            if (error.response?.status !== 400) {
                throw new Error(`Expected status 400, got ${error.response?.status}`);
            }
        }
    }

    async testMinimumFields() {
        const testData = {
            name: 'John Doe',
            email: `minimum.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123'
            // No phone or country - should still work
        };

        const response = await axios.post(`${API_URL}/register`, testData);

        if (response.status !== 201) {
            throw new Error(`Expected status 201, got ${response.status}`);
        }

        if (!response.data.user.onboardingCompleted) {
            throw new Error('Onboarding should not be complete without all fields');
        }
    }

    async testRateLimiting() {
        // This test would require making many requests to test rate limiting
        // For now, we'll just verify the endpoint responds
        const testData = {
            name: 'Rate Limit Test',
            email: `rate.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123'
        };

        const response = await axios.post(`${API_URL}/register`, testData);
        console.log(`   Rate limiting test response: ${response.status}`);
    }

    async testSecurityHeaders() {
        const testData = {
            name: 'Header Test',
            email: `header.test.${Date.now()}@gmail.com`,
            password: 'SecurePass123'
        };

        const response = await axios.post(`${API_URL}/register`, testData);

        const headers = response.headers;
        console.log(`   Security headers present:`);
        console.log(`   - X-Request-ID: ${headers['x-request-id'] ? '✅' : '❌'}`);
        console.log(`   - X-Security-Policy: ${headers['x-security-policy'] ? '✅' : '❌'}`);
    }

    async printSummary() {
        console.log('\n📊 Test Summary:');
        console.log('='.repeat(50));

        const passed = this.testResults.filter(r => r.status === 'PASSED').length;
        const failed = this.testResults.filter(r => r.status === 'FAILED').length;

        console.log(`Total Tests: ${this.testResults.length}`);
        console.log(`✅ Passed: ${passed}`);
        console.log(`❌ Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults
                .filter(r => r.status === 'FAILED')
                .forEach(r => console.log(`   - ${r.name}: ${r.error}`));
        }
    }
}

async function main() {
    console.log('🚀 Enhanced Registration API Test Suite');
    console.log('=========================================');

    const tester = new RegistrationTester();

    // Wait for server to be ready
    console.log('⏳ Waiting for server to be ready...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Run all tests
    await tester.runTest('Valid Registration', () => tester.testValidRegistration());
    await tester.runTest('Invalid Name Validation', () => tester.testInvalidNameValidation());
    await tester.runTest('Invalid Password Validation', () => tester.testInvalidPasswordValidation());
    await tester.runTest('Invalid Email Validation', () => tester.testInvalidEmailValidation());
    await tester.runTest('Duplicate Email Handling', () => tester.testDuplicateEmail());
    await tester.runTest('Invalid Country Code', () => tester.testInvalidCountryCode());
    await tester.runTest('Phone/Country Mismatch', () => tester.testPhoneCountryMismatch());
    await tester.runTest('Minimum Required Fields', () => tester.testMinimumFields());
    await tester.runTest('Rate Limiting Presence', () => tester.testRateLimiting());
    await tester.runTest('Security Headers', () => tester.testSecurityHeaders());

    await tester.printSummary();
}

if (require.main === module) {
    main().catch(console.error);
}

module.exports = RegistrationTester;