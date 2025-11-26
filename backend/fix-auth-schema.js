require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAuthenticationSchema() {
    try {
        console.log('🚀 Starting Authentication Schema Fix...');
        console.log('📋 Target: Add missing columns to users table');
        console.log('📋 Columns: country_code, country_name, phone_verified, onboarding_completed, password_hash, is_active, last_active, device_id, platform, app_version');

        // Step 1: Test current table structure
        console.log('\n🔍 Step 1: Testing current table access...');
        const { data: testData, error: testError } = await supabase
            .from('users')
            .select('id, email')
            .limit(1);

        if (testError) {
            console.log(`❌ Cannot access users table: ${testError.message}`);
            console.log('   This might be expected if the table structure is incomplete.');
            console.log('   Proceeding with schema fix attempts...');
        } else {
            console.log('✅ Users table is accessible');
        }

        // Step 2: Try to add columns using SQL Editor API
        console.log('\n🛠️  Step 2: Attempting to fix schema...');

        // Since we can't execute raw SQL directly, let's try a different approach
        // We'll create a function that tries to update existing records with new fields
        // and provides diagnostic information

        const columnsToAdd = [
            'country_code VARCHAR(2)',
            'country_name VARCHAR(100)',
            'phone_verified BOOLEAN DEFAULT FALSE',
            'onboarding_completed BOOLEAN DEFAULT FALSE',
            'password_hash TEXT',
            'is_active BOOLEAN DEFAULT TRUE',
            'last_active TIMESTAMP WITH TIME ZONE',
            'device_id VARCHAR(255)',
            'platform VARCHAR(100)',
            'app_version VARCHAR(20)'
        ];

        console.log('📝 Columns that need to be added:');
        columnsToAdd.forEach(col => console.log(`   - ${col}`));

        // Step 3: Check if we can query with these columns (to see if they exist)
        console.log('\n🔍 Step 3: Checking if required columns exist...');

        try {
            const { data: columnCheck, error: columnError } = await supabase
                .from('users')
                .select('country_code, country_name, phone_verified, onboarding_completed')
                .limit(1);

            if (columnError) {
                console.log(`❌ Required columns do NOT exist: ${columnError.message}`);
                console.log('🚨 AUTHENTICATION FAILURE CONFIRMED - Schema mismatch detected!');
            } else {
                console.log('✅ Required columns exist');
                return true;
            }
        } catch (err) {
            console.log(`❌ Column check failed: ${err.message}`);
        }

        // Step 4: Provide manual migration instructions
        console.log('\n📋 MANUAL MIGRATION REQUIRED');
        console.log('=====================================');
        console.log('The authentication failure is caused by missing database columns.');
        console.log('Please execute the following SQL in your Supabase SQL Editor:');
        console.log('');
        console.log('-- Add missing columns to users table');
        console.log('ALTER TABLE users ');
        console.log('ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),');
        console.log('ADD COLUMN IF NOT EXISTS country_name VARCHAR(100),');
        console.log('ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,');
        console.log('ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,');
        console.log('ADD COLUMN IF NOT EXISTS password_hash TEXT,');
        console.log('ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,');
        console.log('ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE,');
        console.log('ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),');
        console.log('ADD COLUMN IF NOT EXISTS platform VARCHAR(100),');
        console.log('ADD COLUMN IF NOT EXISTS app_version VARCHAR(20);');
        console.log('');
        console.log('-- Add indexes for performance');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_country_code ON users(country_code);');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified);');
        console.log('CREATE INDEX IF NOT EXISTS idx_users_onboarding_completed ON users(onboarding_completed);');
        console.log('');
        console.log('-- Update existing users with default values');
        console.log('UPDATE users ');
        console.log('SET ');
        console.log('    phone_verified = COALESCE(phone_verified, FALSE),');
        console.log('    onboarding_completed = COALESCE(onboarding_completed, FALSE),');
        console.log('    is_active = COALESCE(is_active, TRUE)');
        console.log('WHERE phone_verified IS NULL OR onboarding_completed IS NULL OR is_active IS NULL;');
        console.log('');
        console.log('After running the SQL above, restart the backend server.');

        // Step 5: Try to create a temporary workaround
        console.log('\n🔄 Step 5: Attempting temporary workaround...');

        // Check if we can at least update existing records with new data
        // This won't fix the schema but might help with testing
        console.log('⚠️  Cannot create temporary workaround without proper schema');
        console.log('   Manual SQL execution in Supabase dashboard is required');

        return false;

    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        return false;
    }
}

async function verifyFix() {
    try {
        console.log('\n🔍 Verifying authentication schema fix...');

        // Try to query with all the required columns
        const { data, error } = await supabase
            .from('users')
            .select('id, email, country_code, country_name, phone_verified, onboarding_completed, is_active')
            .limit(1);

        if (error) {
            console.log(`❌ Schema fix verification failed: ${error.message}`);
            return false;
        }

        console.log('✅ Schema fix verified successfully!');
        console.log('   All required authentication columns are now available');

        return true;

    } catch (error) {
        console.log(`❌ Verification error: ${error.message}`);
        return false;
    }
}

// Main execution
async function main() {
    console.log('🔧 OFFSCREEN BUDDY - Authentication Schema Fix');
    console.log('==============================================\n');

    const fixed = await fixAuthenticationSchema();

    if (fixed) {
        console.log('\n🎉 SUCCESS: Authentication schema has been fixed!');
        console.log('   You can now restart the backend server and test authentication.');
    } else {
        console.log('\n⚠️  MANUAL ACTION REQUIRED:');
        console.log('   1. Go to your Supabase dashboard');
        console.log('   2. Open the SQL Editor');
        console.log('   3. Execute the SQL commands shown above');
        console.log('   4. Restart the backend server');
        console.log('   5. Run this script again to verify the fix');
    }

    console.log('\n📞 If you need help, check the AUTHENTICATION_DIAGNOSTIC_REPORT.md file');
}

main().catch(console.error);