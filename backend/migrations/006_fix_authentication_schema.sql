-- Migration: Fix Authentication Schema Mismatch
-- This migration adds the missing columns that are causing 100% authentication failure

-- Add missing authentication columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
ADD COLUMN IF NOT EXISTS country_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS password_hash TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE;

-- Add additional columns needed for enhanced functionality
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS device_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS platform VARCHAR(100),
ADD COLUMN IF NOT EXISTS app_version VARCHAR(20);

-- Update existing users to have default values
UPDATE users 
SET 
    phone_verified = COALESCE(phone_verified, FALSE),
    onboarding_completed = COALESCE(onboarding_completed, FALSE),
    is_active = COALESCE(is_active, TRUE)
WHERE phone_verified IS NULL OR onboarding_completed IS NULL OR is_active IS NULL;

-- Log successful migration
INSERT INTO payment_events (user_id, event_type, amount, currency, provider, provider_event_id, metadata)
VALUES (
    NULL, -- system migration event
    'authentication_schema_fix',
    0.00,
    'USD',
    'system',
    'schema_fix_completed',
    ('{"message": "Authentication schema mismatch fixed", "timestamp": "' || NOW() || '", "columns_added": ["country_code", "country_name", "phone_verified", "onboarding_completed", "password_hash", "is_active", "last_active", "device_id", "platform", "app_version"]}')::jsonb
);

COMMIT;