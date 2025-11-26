const { supabase } = require('./config/supabase');

/**
 * Comprehensive Supabase Rate Limiting Diagnostic Script
 * Tests different scenarios to identify the exact cause of registration failures
 */

class SupabaseRateLimitDiagnostic {
    constructor() {
        this.testResults = [];
        this.startTime = Date.now();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : '🔍';
        console.log(`[${timestamp}] ${prefix} ${message}`);
    }

    async testBasicConnection() {
        this.log('Testing basic Supabase connection...');
        try {
            const { data, error } = await supabase.from('users').select('id').limit(1);
            if (error) throw error;
            this.log('Basic connection test passed', 'success');
            return true;
        } catch (error) {
            this.log(`Basic connection failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testAuthServiceDirectly() {
        this.log('Testing Supabase Auth service directly...');

        const testEmails = [
            'test1@example.com',
            'test2@example.com',
            'test3@example.com'
        ];

        for (const email of testEmails) {
            try {
                this.log(`Testing signup for: ${email}`);

                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: 'TestPass123!',
                    options: {
                        data: {
                            name: 'Test User',
                            platform: 'diagnostic-script'
                        }
                    }
                });

                if (error) {
                    this.log(`Signup failed for ${email}: ${error.message}`, 'error');
                    this.testResults.push({
                        email,
                        success: false,
                        error: error.message,
                        errorCode: error.code,
                        timestamp: new Date().toISOString()
                    });

                    // Check if it's a rate limit error
                    if (error.message.toLowerCase().includes('rate limit') ||
                        error.message.toLowerCase().includes('email rate limit')) {
                        this.log('🚨 RATE LIMIT DETECTED! This confirms Supabase rate limiting is active', 'error');
                        return false;
                    }
                } else {
                    this.log(`Signup successful for ${email}`, 'success');
                    this.testResults.push({
                        email,
                        success: true,
                        timestamp: new Date().toISOString()
                    });

                    // Clean up - delete test user if created
                    if (data.user) {
                        await supabase.from('users').delete().eq('id', data.user.id);
                    }
                }

                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (error) {
                this.log(`Exception during signup test for ${email}: ${error.message}`, 'error');
                this.testResults.push({
                    email,
                    success: false,
                    error: error.message,
                    exception: true,
                    timestamp: new Date().toISOString()
                });
            }
        }

        return true;
    }

    async testDatabaseQueries() {
        this.log('Testing database query performance...');
        try {
            const startTime = Date.now();

            // Test multiple queries to see if database is the bottleneck
            for (let i = 0; i < 5; i++) {
                const { data, error } = await supabase
                    .from('users')
                    .select('id, email')
                    .limit(10);

                if (error) throw error;
            }

            const duration = Date.now() - startTime;
            this.log(`Database queries completed in ${duration}ms`, 'success');
            return true;
        } catch (error) {
            this.log(`Database query test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async testRateLimitSettings() {
        this.log('Checking if we can access rate limit settings...');

        // Try to get auth settings (this might reveal rate limit info)
        try {
            // This is a试探性检查 - checking if we can get any rate limit info
            const { data, error } = await supabase.auth.getSession();

            if (error) {
                this.log(`Auth session test failed: ${error.message}`, 'error');
            } else {
                this.log('Auth session test passed', 'success');
            }

            return true;
        } catch (error) {
            this.log(`Rate limit settings test failed: ${error.message}`, 'error');
            return false;
        }
    }

    async runDiagnostic() {
        this.log('🚀 Starting Comprehensive Supabase Rate Limit Diagnostic');
        this.log('='.repeat(60));

        // Test 1: Basic connection
        const connectionTest = await this.testBasicConnection();
        if (!connectionTest) {
            this.log('❌ Basic connection failed - aborting diagnostic', 'error');
            return;
        }

        // Test 2: Database performance
        await this.testDatabaseQueries();

        // Test 3: Auth service directly  
        await this.testAuthServiceDirectly();

        // Test 4: Rate limit settings
        await this.testRateLimitSettings();

        // Generate report
        this.generateReport();
    }

    generateReport() {
        this.log('📊 DIAGNOSTIC REPORT');
        this.log('='.repeat(60));

        const totalTests = this.testResults.length;
        const failedTests = this.testResults.filter(r => !r.success).length;
        const rateLimitErrors = this.testResults.filter(r =>
            r.error && (r.error.toLowerCase().includes('rate limit') ||
                r.error.toLowerCase().includes('email rate limit'))
        ).length;

        this.log(`Total signup attempts: ${totalTests}`);
        this.log(`Failed attempts: ${failedTests}`);
        this.log(`Rate limit errors: ${rateLimitErrors}`);
        this.log(`Success rate: ${((totalTests - failedTests) / totalTests * 100).toFixed(1)}%`);

        if (rateLimitErrors > 0) {
            this.log('🚨 CRITICAL FINDING: Supabase rate limiting is active!', 'error');
            this.log('💡 RECOMMENDATION: The issue is NOT in your application code', 'error');
            this.log('   - Supabase is enforcing its own rate limits', 'error');
            this.log('   - Different emails from same IP/client will still be blocked', 'error');
            this.log('   - This is a Supabase infrastructure limitation', 'error');
        }

        // Detailed error analysis
        if (failedTests > 0) {
            this.log('\n📋 DETAILED ERROR ANALYSIS:');
            this.testResults.forEach((result, index) => {
                if (!result.success) {
                    this.log(`Attempt ${index + 1}: ${result.email}`);
                    this.log(`  Error: ${result.error}`);
                    if (result.errorCode) {
                        this.log(`  Error Code: ${result.errorCode}`);
                    }
                }
            });
        }

        const totalTime = Date.now() - this.startTime;
        this.log(`\n⏱️  Total diagnostic time: ${totalTime}ms`);
        this.log('🔍 Diagnostic completed');
    }
}

// Run the diagnostic
const diagnostic = new SupabaseRateLimitDiagnostic();
diagnostic.runDiagnostic().catch(error => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
});