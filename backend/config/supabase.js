const { createClient } = require('@supabase/supabase-js');
const { getSupabaseConfig, isLocal } = require('./environment');

// Supabase Configuration - Using new environment system
const supabaseConfig = getSupabaseConfig();
const { url, serviceKey, anonKey } = supabaseConfig;

// Validation checks
if (!url) {
  throw new Error('🚨 Supabase URL is required');
}

if (!serviceKey && !anonKey) {
  throw new Error('🚨 Supabase service key or anon key is required');
}

// Check if we're using anon key as fallback
const isUsingAnonAsService = !serviceKey && anonKey;

if (isUsingAnonAsService) {
  console.warn('⚠️  WARNING: Using anon key as service key - some operations may fail');
  console.warn('   For full functionality, set SUPABASE_SERVICE_KEY in your .env file');
  console.warn('   Get your service role key from: https://supabase.com/dashboard/project/[PROJECT]/settings/api');
}

// Create Supabase client with appropriate key for backend operations
const keyToUse = serviceKey || anonKey;
const supabase = createClient(url, keyToUse, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Environment-specific logging
if (isLocal()) {
  console.log('🔧 LOCAL: Supabase client initialized with development configuration');
  console.log(`   URL: ${url}`);
  console.log(`   Using ${serviceKey ? 'service key' : 'anon key'} for operations`);
} else {
  console.log('🚀 PROD: Supabase client initialized with production configuration');
  console.log('   Using service role key for backend operations');
}

// Health check function
async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('users').select('id').limit(1);

    if (error) {
      console.error('Supabase connection check failed:', error.message);
      return false;
    }

    console.log('✓ Supabase connection successful');
    return true;
  } catch (error) {
    console.error('Supabase connection error:', error.message);
    return false;
  }
}

// Test database table existence
async function checkDatabaseTables() {
  const tables = [
    'users',
    'subscription_plans',
    'user_subscriptions',
    'user_settings',
    'user_analytics',
    'timer_sessions',
    'payment_events'
  ];

  console.log('\n📊 Checking database tables...');

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      console.log(`✓ Table '${table}': ${error ? '❌ Error' : '✓ Available'}`);

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found (OK)
        console.error(`  Error: ${error.message}`);
      }
    } catch (error) {
      console.error(`❌ Table '${table}': ${error.message}`);
    }
  }
}

// Database migration helpers
async function createDefaultPlans() {
  try {
    console.log('\n🏗️ Setting up default subscription plans...');

    // Check if plans already exist
    const { data: existingPlans } = await supabase
      .from('subscription_plans')
      .select('*');

    if (existingPlans && existingPlans.length > 0) {
      console.log('✓ Subscription plans already exist');
      return;
    }

    // Create default plans
    const defaultPlans = [
      {
        name: 'Free',
        tier: 'free',
        price_monthly: 0,
        price_yearly: 0,
        features: [
          'Basic Timer',
          'Simple Notifications',
          'Basic Analytics'
        ],
        is_active: true
      },
      {
        name: 'Pro',
        tier: 'pro',
        price_monthly: 499,
        price_yearly: 4999,
        features: [
          'Timer Lock Mode',
          'Smart Notifications',
          'Analytics Dashboard',
          'Smart Automation',
          'Security Features',
          'Team Management',
          'White Label Options'
        ],
        is_active: true
      }
    ];

    const { data, error } = await supabase
      .from('subscription_plans')
      .insert(defaultPlans)
      .select();

    if (error) throw error;

    console.log('✓ Default subscription plans created');
    console.log(`📋 Created ${data.length} plans:`, data.map(p => `${p.name} (${p.tier})`).join(', '));

  } catch (error) {
    console.error('❌ Error creating default plans:', error.message);
  }
}

// Run enhanced onboarding migration
async function runEnhancedOnboardingMigration() {
  try {
    console.log('\n🔄 Checking enhanced onboarding migration...');

    // Check if migration was already applied
    const { data: countryExists } = await supabase
      .from('countries')
      .select('country_code')
      .limit(1);

    if (countryExists && countryExists.length > 0) {
      console.log('✓ Enhanced onboarding migration already applied');
      return;
    }

    // For now, add the countries table manually using SQL
    console.log('📊 Creating countries table...');

    // Create countries table
    const createCountriesSQL = `
      CREATE TABLE IF NOT EXISTS countries (
          id SERIAL PRIMARY KEY,
          country_code VARCHAR(2) UNIQUE NOT NULL,
          country_name VARCHAR(100) NOT NULL,
          phone_code VARCHAR(10),
          currency_code VARCHAR(3) DEFAULT 'USD',
          currency_symbol VARCHAR(10),
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    const { error: tableError } = await supabase.rpc('exec_sql', { sql: createCountriesSQL });
    if (tableError) {
      console.warn('⚠️  Note: Automatic table creation failed. This is expected if the "exec_sql" RPC function is not set up.');
      console.warn('   To fix this, please run the SQL migration manually in the Supabase SQL Editor.');
      console.warn('   You can find the migration SQL in: backend/migrations/enhanced_onboarding.sql');
    }

    // Add columns to users table
    const addColumnsSQL = `
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
      ADD COLUMN IF NOT EXISTS country_name VARCHAR(100),
      ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS password_hash TEXT;
    `;

    const { error: columnsError } = await supabase.rpc('exec_sql', { sql: addColumnsSQL });
    if (columnsError) {
      // Only log if it's a different error than the table creation one to avoid spam
      if (columnsError.message !== tableError?.message) {
        console.warn('⚠️  Note: Automatic column addition failed:', columnsError.message);
      }
    }

    // Insert basic countries if table exists
    try {
      const basicCountries = [
        { country_code: 'US', country_name: 'United States', phone_code: '+1', currency_code: 'USD', currency_symbol: '$' },
        { country_code: 'GB', country_name: 'United Kingdom', phone_code: '+44', currency_code: 'GBP', currency_symbol: '£' },
        { country_code: 'IN', country_name: 'India', phone_code: '+91', currency_code: 'INR', currency_symbol: '₹' },
        { country_code: 'DE', country_name: 'Germany', phone_code: '+49', currency_code: 'EUR', currency_symbol: '€' },
        { country_code: 'FR', country_name: 'France', phone_code: '+33', currency_code: 'EUR', currency_symbol: '€' }
      ];

      const { error: insertError } = await supabase
        .from('countries')
        .insert(basicCountries);

      if (!insertError) {
        console.log('✓ Basic countries inserted');
      }
    } catch (error) {
      console.log('Note: Countries insertion failed (table may not exist yet)');
    }

    console.log('✓ Enhanced onboarding migration completed');

  } catch (error) {
    console.error('❌ Error running enhanced onboarding migration:', error.message);
  }
}

module.exports = {
  supabase,
  checkSupabaseConnection,
  checkDatabaseTables,
  createDefaultPlans,
  runEnhancedOnboardingMigration
};