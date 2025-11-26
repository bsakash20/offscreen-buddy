require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(migrationFile) {
    try {
        console.log(`🚀 Running migration: ${migrationFile}`);

        // Read migration file
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        // Execute migration using Supabase RPC
        // Note: Direct SQL execution through Supabase has limitations
        // We'll need to execute the ALTER TABLE statements directly

        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

        let successCount = 0;
        let errorCount = 0;

        for (const statement of statements) {
            if (statement.length === 0) continue;

            try {
                console.log(`  📝 Executing: ${statement.substring(0, 100)}${statement.length > 100 ? '...' : ''}`);

                // Execute using Supabase query
                const { error } = await supabase.rpc('exec', { sql: statement });

                if (error) {
                    console.log(`  ❌ Error: ${error.message}`);

                    // If RPC doesn't exist, try direct table operations
                    if (statement.includes('ALTER TABLE users')) {
                        console.log('  🔧 Attempting direct table operations for users table...');

                        // Execute specific ALTER TABLE statements
                        const alterStatements = [
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code VARCHAR(2)',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS country_name VARCHAR(100)',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS device_id VARCHAR(255)',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS platform VARCHAR(100)',
                            'ALTER TABLE users ADD COLUMN IF NOT EXISTS app_version VARCHAR(20)'
                        ];

                        for (const alterStmt of alterStatements) {
                            try {
                                const { error: alterError } = await supabase.rpc('exec', { sql: alterStmt });
                                if (alterError) {
                                    console.log(`  ⚠️  ALTER error: ${alterError.message}`);
                                } else {
                                    console.log(`  ✅ Success: ${alterStmt}`);
                                    successCount++;
                                }
                            } catch (alterErr) {
                                console.log(`  ⚠️  ALTER failed: ${alterErr.message}`);
                                errorCount++;
                            }
                        }
                    }
                } else {
                    console.log(`  ✅ Success`);
                    successCount++;
                }
            } catch (stmtError) {
                console.log(`  ❌ Statement error: ${stmtError.message}`);
                errorCount++;
            }
        }

        console.log(`\n📊 Migration Summary:`);
        console.log(`   ✅ Successful: ${successCount}`);
        console.log(`   ❌ Errors: ${errorCount}`);

        // Verify schema changes
        await verifySchema();

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

async function verifySchema() {
    try {
        console.log('\n🔍 Verifying schema changes...');

        // Check if columns exist by querying the users table
        const { data, error } = await supabase
            .from('users')
            .select('country_code, country_name, phone_verified, onboarding_completed')
            .limit(1);

        if (error) {
            console.log('  ⚠️  Cannot verify columns (table may not exist or be empty)');
            console.log(`     Error: ${error.message}`);
        } else {
            console.log('  ✅ Users table is accessible');
            console.log('  ✅ Required columns should be available');
        }

        // Also try to get table structure
        const { data: tableInfo, error: tableError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'users')
            .in('column_name', ['country_code', 'country_name', 'phone_verified', 'onboarding_completed']);

        if (tableError) {
            console.log('  ⚠️  Could not verify table structure via information_schema');
        } else {
            console.log('  ✅ Columns verification via information_schema completed');
            console.log(`     Found columns: ${tableInfo?.map(col => col.column_name).join(', ') || 'none'}`);
        }

    } catch (error) {
        console.log('  ⚠️  Schema verification failed:', error.message);
    }
}

// Main execution
async function main() {
    const migrationFile = process.argv[2];

    if (!migrationFile) {
        console.log('Usage: node run-migration.js <migration-file.sql>');
        console.log('Available migrations:');

        const migrationsDir = path.join(__dirname, 'migrations');
        const files = fs.readdirSync(migrationsDir)
            .filter(file => file.endsWith('.sql'))
            .sort();

        files.forEach(file => console.log(`  - ${file}`));

        return;
    }

    await runMigration(migrationFile);
}

main().catch(console.error);