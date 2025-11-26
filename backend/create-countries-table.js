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

async function createCountriesTable() {
    try {
        console.log('🚀 Creating countries table...');

        // First, let's try to create the table using a simple approach
        // Since we can't use RPC exec_sql, we'll create it step by step

        console.log('📝 Creating countries table structure...');

        // The countries table should be created via Supabase dashboard or proper migration
        // For now, let's try to insert some basic data to see if the table exists

        const countries = [
            { country_code: 'US', country_name: 'United States', phone_code: '+1', currency_code: 'USD', currency_symbol: '$' },
            { country_code: 'CA', country_name: 'Canada', phone_code: '+1', currency_code: 'CAD', currency_symbol: 'C$' },
            { country_code: 'GB', country_name: 'United Kingdom', phone_code: '+44', currency_code: 'GBP', currency_symbol: '£' },
            { country_code: 'DE', country_name: 'Germany', phone_code: '+49', currency_code: 'EUR', currency_symbol: '€' },
            { country_code: 'FR', country_name: 'France', phone_code: '+33', currency_code: 'EUR', currency_symbol: '€' },
            { country_code: 'IT', country_name: 'Italy', phone_code: '+39', currency_code: 'EUR', currency_symbol: '€' },
            { country_code: 'ES', country_name: 'Spain', phone_code: '+34', currency_code: 'EUR', currency_symbol: '€' },
            { country_code: 'NL', country_name: 'Netherlands', phone_code: '+31', currency_code: 'EUR', currency_symbol: '€' },
            { country_code: 'BE', country_name: 'Belgium', phone_code: '+32', currency_code: 'EUR', currency_symbol: '€' },
            { country_code: 'CH', country_name: 'Switzerland', phone_code: '+41', currency_code: 'CHF', currency_symbol: 'CHF' },
            { country_code: 'AU', country_name: 'Australia', phone_code: '+61', currency_code: 'AUD', currency_symbol: 'A$' },
            { country_code: 'JP', country_name: 'Japan', phone_code: '+81', currency_code: 'JPY', currency_symbol: '¥' },
            { country_code: 'KR', country_name: 'South Korea', phone_code: '+82', currency_code: 'KRW', currency_symbol: '₩' },
            { country_code: 'CN', country_name: 'China', phone_code: '+86', currency_code: 'CNY', currency_symbol: '¥' },
            { country_code: 'SG', country_name: 'Singapore', phone_code: '+65', currency_code: 'SGD', currency_symbol: 'S$' },
            { country_code: 'IN', country_name: 'India', phone_code: '+91', currency_code: 'INR', currency_symbol: '₹' },
            { country_code: 'BR', country_name: 'Brazil', phone_code: '+55', currency_code: 'BRL', currency_symbol: 'R$' },
            { country_code: 'MX', country_name: 'Mexico', phone_code: '+52', currency_code: 'MXN', currency_symbol: '$' },
            { country_code: 'AR', country_name: 'Argentina', phone_code: '+54', currency_code: 'ARS', currency_symbol: '$' },
            { country_code: 'RU', country_name: 'Russia', phone_code: '+7', currency_code: 'RUB', currency_symbol: '₽' },
            { country_code: 'ZA', country_name: 'South Africa', phone_code: '+27', currency_code: 'ZAR', currency_symbol: 'R' },
            { country_code: 'AE', country_name: 'United Arab Emirates', phone_code: '+971', currency_code: 'AED', currency_symbol: 'د.إ' },
            { country_code: 'SA', country_name: 'Saudi Arabia', phone_code: '+966', currency_code: 'SAR', currency_symbol: 'ر.س' },
            { country_code: 'EG', country_name: 'Egypt', phone_code: '+20', currency_code: 'EGP', currency_symbol: 'ج.م' },
            { country_code: 'NG', country_name: 'Nigeria', phone_code: '+234', currency_code: 'NGN', currency_symbol: '₦' },
            { country_code: 'TH', country_name: 'Thailand', phone_code: '+66', currency_code: 'THB', currency_symbol: '฿' },
            { country_code: 'MY', country_name: 'Malaysia', phone_code: '+60', currency_code: 'MYR', currency_symbol: 'RM' },
            { country_code: 'ID', country_name: 'Indonesia', phone_code: '+62', currency_code: 'IDR', currency_symbol: 'Rp' },
            { country_code: 'PH', country_name: 'Philippines', phone_code: '+63', currency_code: 'PHP', currency_symbol: '₱' }
        ];

        console.log('📊 Attempting to insert countries...');

        // Try to insert countries
        const { data, error } = await supabase
            .from('countries')
            .insert(countries)
            .select();

        if (error) {
            if (error.code === 'PGRST204' || error.message.includes('relation "countries" does not exist')) {
                console.log('❌ Countries table does not exist.');
                console.log('\n📋 MANUAL STEP REQUIRED:');
                console.log('1. Go to your Supabase dashboard');
                console.log('2. Navigate to SQL Editor');
                console.log('3. Run this SQL to create the table:');
                console.log(`
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
);`);
                return false;
            } else {
                console.error('❌ Error inserting countries:', error.message);
                return false;
            }
        }

        console.log(`✅ Successfully inserted ${data.length} countries!`);
        console.log('🎉 Countries table is now populated with data.');
        return true;

    } catch (error) {
        console.error('❌ Failed to create countries table:', error.message);
        return false;
    }
}

// Check if table exists first
async function checkTableExists() {
    try {
        const { data, error } = await supabase
            .from('countries')
            .select('country_code')
            .limit(1);

        if (error && error.code === 'PGRST204') {
            console.log('ℹ️  Countries table exists but is empty.');
            return true;
        } else if (error && error.message.includes('relation "countries" does not exist')) {
            console.log('❌ Countries table does not exist.');
            return false;
        } else if (!error) {
            console.log('✅ Countries table exists with data.');
            return true;
        }
    } catch (error) {
        console.error('❌ Error checking table:', error.message);
        return false;
    }
}

async function main() {
    console.log('🌍 Creating countries table for OffScreen Buddy...\n');

    const tableExists = await checkTableExists();

    if (!tableExists) {
        await createCountriesTable();
    } else {
        // Table exists, let's try to populate it
        await createCountriesTable();
    }
}

main().catch(console.error);