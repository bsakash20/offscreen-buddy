-- Migration: Enhanced Onboarding System
-- Database schema updates to support enhanced user onboarding with international features

-- Add enhanced onboarding fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS country_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create countries reference table for comprehensive country support
CREATE TABLE IF NOT EXISTS countries (
    id SERIAL PRIMARY KEY,
    country_code VARCHAR(2) UNIQUE NOT NULL, -- ISO 3166-1 alpha-2 codes
    country_name VARCHAR(100) NOT NULL,
    phone_code VARCHAR(10), -- International dialing code
    currency_code VARCHAR(3) DEFAULT 'USD',
    currency_symbol VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert comprehensive list of countries with ISO codes and phone codes
INSERT INTO countries (country_code, country_name, phone_code, currency_code, currency_symbol) VALUES
('US', 'United States', '+1', 'USD', '$'),
('CA', 'Canada', '+1', 'CAD', 'C$'),
('GB', 'United Kingdom', '+44', 'GBP', '£'),
('DE', 'Germany', '+49', 'EUR', '€'),
('FR', 'France', '+33', 'EUR', '€'),
('IT', 'Italy', '+39', 'EUR', '€'),
('ES', 'Spain', '+34', 'EUR', '€'),
('NL', 'Netherlands', '+31', 'EUR', '€'),
('BE', 'Belgium', '+32', 'EUR', '€'),
('CH', 'Switzerland', '+41', 'CHF', 'CHF'),
('AT', 'Austria', '+43', 'EUR', '€'),
('SE', 'Sweden', '+46', 'SEK', 'kr'),
('NO', 'Norway', '+47', 'NOK', 'kr'),
('DK', 'Denmark', '+45', 'DKK', 'kr'),
('FI', 'Finland', '+358', 'EUR', '€'),
('IE', 'Ireland', '+353', 'EUR', '€'),
('PT', 'Portugal', '+351', 'EUR', '€'),
('GR', 'Greece', '+30', 'EUR', '€'),
('PL', 'Poland', '+48', 'PLN', 'zł'),
('CZ', 'Czech Republic', '+420', 'CZK', 'Kč'),
('HU', 'Hungary', '+36', 'HUF', 'Ft'),
('RO', 'Romania', '+40', 'RON', 'lei'),
('BG', 'Bulgaria', '+359', 'BGN', 'лв'),
('HR', 'Croatia', '+385', 'HRK', 'kn'),
('SK', 'Slovakia', '+421', 'EUR', '€'),
('SI', 'Slovenia', '+386', 'EUR', '€'),
('LT', 'Lithuania', '+370', 'EUR', '€'),
('LV', 'Latvia', '+371', 'EUR', '€'),
('EE', 'Estonia', '+372', 'EUR', '€'),
('RU', 'Russia', '+7', 'RUB', '₽'),
('UA', 'Ukraine', '+380', 'UAH', '₴'),
('BY', 'Belarus', '+375', 'BYN', 'Br'),
('MD', 'Moldova', '+373', 'MDL', 'lei'),
('AU', 'Australia', '+61', 'AUD', 'A$'),
('NZ', 'New Zealand', '+64', 'NZD', 'NZ$'),
('JP', 'Japan', '+81', 'JPY', '¥'),
('KR', 'South Korea', '+82', 'KRW', '₩'),
('CN', 'China', '+86', 'CNY', '¥'),
('HK', 'Hong Kong', '+852', 'HKD', 'HK$'),
('TW', 'Taiwan', '+886', 'TWD', 'NT$'),
('SG', 'Singapore', '+65', 'SGD', 'S$'),
('MY', 'Malaysia', '+60', 'MYR', 'RM'),
('TH', 'Thailand', '+66', 'THB', '฿'),
('VN', 'Vietnam', '+84', 'VND', '₫'),
('ID', 'Indonesia', '+62', 'IDR', 'Rp'),
('PH', 'Philippines', '+63', 'PHP', '₱'),
('IN', 'India', '+91', 'INR', '₹'),
('PK', 'Pakistan', '+92', 'PKR', '₨'),
('BD', 'Bangladesh', '+880', 'BDT', '৳'),
('LK', 'Sri Lanka', '+94', 'LKR', 'Rs'),
('NP', 'Nepal', '+977', 'NPR', 'Rs'),
('MV', 'Maldives', '+960', 'MVR', '.ރ'),
('BT', 'Bhutan', '+975', 'BTN', 'Nu.'),
('AE', 'United Arab Emirates', '+971', 'AED', 'د.إ'),
('SA', 'Saudi Arabia', '+966', 'SAR', 'ر.س'),
('QA', 'Qatar', '+974', 'QAR', 'ر.ق'),
('KW', 'Kuwait', '+965', 'KWD', 'د.ك'),
('BH', 'Bahrain', '+973', 'BHD', '.د.ب'),
('OM', 'Oman', '+968', 'OMR', 'ر.ع.'),
('JO', 'Jordan', '+962', 'JOD', 'د.ا'),
('LB', 'Lebanon', '+961', 'LBP', 'ل.ل'),
('SY', 'Syria', '+963', 'SYP', 'ل.س'),
('IQ', 'Iraq', '+964', 'IQD', 'ع.د'),
('IR', 'Iran', '+98', 'IRR', '﷼'),
('AF', 'Afghanistan', '+93', 'AFN', 'Af'),
('EG', 'Egypt', '+20', 'EGP', 'ج.م'),
('MA', 'Morocco', '+212', 'MAD', 'د.م.'),
('DZ', 'Algeria', '+213', 'DZD', 'د.ج'),
('TN', 'Tunisia', '+216', 'TND', 'د.ت'),
('LY', 'Libya', '+218', 'LYD', 'ل.د'),
('SD', 'Sudan', '+249', 'SDG', 'ج.س'),
('SS', 'South Sudan', '+211', 'SSP', '£'),
('ET', 'Ethiopia', '+251', 'ETB', 'Br'),
('KE', 'Kenya', '+254', 'KES', 'KSh'),
('UG', 'Uganda', '+256', 'UGX', 'USh'),
('TZ', 'Tanzania', '+255', 'TZS', 'TSh'),
('RW', 'Rwanda', '+250', 'RWF', 'FRw'),
('BI', 'Burundi', '+257', 'BIF', 'FBu'),
('MG', 'Madagascar', '+261', 'MGA', 'Ar'),
('MU', 'Mauritius', '+230', 'MUR', '₨'),
('SC', 'Seychelles', '+248', 'SCR', '₨'),
('ZA', 'South Africa', '+27', 'ZAR', 'R'),
('NG', 'Nigeria', '+234', 'NGN', '₦'),
('GH', 'Ghana', '+233', 'GHS', '₵'),
('ML', 'Mali', '+223', 'XOF', 'CFA'),
('BF', 'Burkina Faso', '+226', 'XOF', 'CFA'),
('NE', 'Niger', '+227', 'XOF', 'CFA'),
('TD', 'Chad', '+235', 'XOF', 'CFA'),
('CM', 'Cameroon', '+237', 'XAF', 'FCFA'),
('CF', 'Central African Republic', '+236', 'XAF', 'FCFA'),
('CG', 'Republic of the Congo', '+242', 'XAF', 'FCFA'),
('CD', 'Democratic Republic of the Congo', '+243', 'XAF', 'FC'),
('GQ', 'Equatorial Guinea', '+240', 'XAF', 'FCFA'),
('GA', 'Gabon', '+241', 'XAF', 'FCFA'),
('AO', 'Angola', '+244', 'AOA', 'Kz'),
('MZ', 'Mozambique', '+258', 'MZN', 'MT'),
('ZW', 'Zimbabwe', '+263', 'USD', '$'),
('BW', 'Botswana', '+267', 'BWP', 'P'),
('NA', 'Namibia', '+264', 'NAD', '$'),
('LS', 'Lesotho', '+266', 'LSL', 'L'),
('SZ', 'Eswatini', '+268', 'SZL', 'L'),
('MW', 'Malawi', '+265', 'MWK', 'MK'),
('ZM', 'Zambia', '+260', 'ZMW', 'ZK'),
('BR', 'Brazil', '+55', 'BRL', 'R$'),
('AR', 'Argentina', '+54', 'ARS', '$'),
('CL', 'Chile', '+56', 'CLP', '$'),
('CO', 'Colombia', '+57', 'COP', '$'),
('PE', 'Peru', '+51', 'PEN', 'S/'),
('VE', 'Venezuela', '+58', 'VES', 'Bs'),
('UY', 'Uruguay', '+598', 'UYU', '$U'),
('PY', 'Paraguay', '+595', 'PYG', '₲'),
('BO', 'Bolivia', '+591', 'BOB', 'Bs'),
('EC', 'Ecuador', '+593', 'USD', '$'),
('CR', 'Costa Rica', '+506', 'CRC', '₡'),
('PA', 'Panama', '+507', 'PAB', 'B/.'),
('GT', 'Guatemala', '+502', 'GTQ', 'Q'),
('SV', 'El Salvador', '+503', 'USD', '$'),
('HN', 'Honduras', '+504', 'HNL', 'L'),
('NI', 'Nicaragua', '+505', 'NIO', 'C$'),
('MX', 'Mexico', '+52', 'MXN', '$'),
('CU', 'Cuba', '+53', 'CUP', '₱')
ON CONFLICT (country_code) DO NOTHING;

-- Create function to validate and standardize phone numbers
CREATE OR REPLACE FUNCTION validate_and_format_phone(
    phone_number TEXT,
    country_code_input TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
    formatted_phone TEXT;
    clean_phone TEXT;
    country_rec RECORD;
BEGIN
    -- Remove all non-numeric characters except +
    clean_phone := regexp_replace(phone_number, '[^0-9+]', '', 'g');
    
    -- If country code is provided, validate against our countries table
    IF country_code_input IS NOT NULL THEN
        SELECT * INTO country_rec FROM countries WHERE country_code = UPPER(country_code_input);
        IF FOUND AND country_rec.phone_code IS NOT NULL THEN
            -- Ensure phone number starts with country code
            IF NOT clean_phone LIKE country_rec.phone_code || '%' THEN
                clean_phone := country_rec.phone_code || clean_phone;
            END IF;
        END IF;
    END IF;
    
    formatted_phone := clean_phone;
    RETURN formatted_phone;
END;
$$ LANGUAGE plpgsql;

-- Create function to update user's onboarding status
CREATE OR REPLACE FUNCTION update_onboarding_status(
    user_uuid UUID,
    check_phone_verified BOOLEAN DEFAULT FALSE,
    check_country_selected BOOLEAN DEFAULT FALSE,
    check_password_set BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
    onboarding_status BOOLEAN := FALSE;
BEGIN
    -- Check if all required onboarding steps are completed
    IF check_phone_verified AND check_country_selected AND check_password_set THEN
        onboarding_status := TRUE;
    ELSIF check_phone_verified AND check_country_selected THEN
        onboarding_status := TRUE;
    ELSIF check_phone_verified AND check_password_set THEN
        onboarding_status := TRUE;
    END IF;
    
    -- Update the users table
    UPDATE users 
    SET onboarding_completed = onboarding_status,
        updated_at = NOW()
    WHERE id = user_uuid;
    
    RETURN onboarding_status;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user's country information with phone details
CREATE OR REPLACE FUNCTION get_user_country_info(user_uuid UUID)
RETURNS TABLE (
    country_code VARCHAR(2),
    country_name VARCHAR(100),
    phone_code VARCHAR(10),
    currency_code VARCHAR(3),
    currency_symbol VARCHAR(10)
) AS $$
BEGIN
    RETURN QUERY
    SELECT c.country_code, c.country_name, c.phone_code, c.currency_code, c.currency_symbol
    FROM countries c
    JOIN users u ON c.country_code = u.country_code
    WHERE u.id = user_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create view for users with onboarding status
CREATE OR REPLACE VIEW users_onboarding_status AS
SELECT 
    u.id,
    u.email,
    u.name,
    u.phone,
    u.country_code,
    c.country_name,
    c.phone_code,
    u.phone_verified,
    u.onboarding_completed,
    CASE 
        WHEN u.password_hash IS NOT NULL THEN TRUE 
        ELSE FALSE 
    END as has_password,
    u.created_at,
    u.updated_at,
    CASE 
        WHEN u.phone_verified AND u.country_code IS NOT NULL AND u.password_hash IS NOT NULL THEN TRUE
        ELSE FALSE
    END as onboarding_complete
FROM users u
LEFT JOIN countries c ON u.country_code = c.country_code;

-- Update any existing users to have default onboarding status
UPDATE users 
SET 
    phone_verified = COALESCE(phone_verified, FALSE),
    onboarding_completed = CASE 
        WHEN phone_verified AND country_code IS NOT NULL AND password_hash IS NOT NULL THEN TRUE
        ELSE FALSE
    END
WHERE phone_verified IS NULL OR onboarding_completed IS NULL;

-- Add constraint to ensure country_code exists in countries table if provided
ALTER TABLE users 
ADD CONSTRAINT fk_users_country_code 
FOREIGN KEY (country_code) REFERENCES countries(country_code) ON DELETE SET NULL;

-- Create log table for onboarding events
CREATE TABLE IF NOT EXISTS user_onboarding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'phone_verified', 'country_selected', 'password_set', 'onboarding_completed'
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log successful migration
INSERT INTO payment_events (user_id, event_type, amount, currency, provider, provider_event_id, metadata)
VALUES (
    NULL, -- system migration event
    'migration_completed',
    0.00,
    'USD',
    'system',
    'enhanced_onboarding_schema',
    ('{"message": "Enhanced onboarding schema migration completed", "timestamp": "' || NOW() || '", "features_added": ["international_phone_validation", "country_selection", "onboarding_tracking", "password_hash_storage"]}')::jsonb
);

COMMIT;