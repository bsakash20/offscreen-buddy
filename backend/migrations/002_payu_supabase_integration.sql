-- Migration: PayU Supabase Integration
-- This migration adds necessary tables and columns for PayU payment integration

-- Add missing columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS name VARCHAR(255),
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add missing columns to subscription_plans table
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create payment_events table for PayU event logging
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- 'transaction_created', 'payment_verified', 'payment_success', 'payment_failure'
    amount DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'INR',
    provider VARCHAR(50), -- 'payu', 'razorpay', 'stripe'
    provider_event_id VARCHAR(255), -- PayU transaction ID, mihpayid, etc.
    metadata JSONB DEFAULT '{}', -- Additional event data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint for user_subscriptions to prevent multiple active subscriptions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'unique_active_subscription_per_user'
        AND table_name = 'user_subscriptions'
    ) THEN
        ALTER TABLE user_subscriptions
        ADD CONSTRAINT unique_active_subscription_per_user
        EXCLUDE USING btree (
            user_id WITH =,
            status WITH =
        ) WHERE (status IN ('active', 'trial'));
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider ON payment_events(provider);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON payment_events(created_at);

-- Update existing subscription plans to be active
UPDATE subscription_plans SET is_active = true WHERE is_active IS NULL;

-- Ensure default plans are properly configured for PayU
-- Delete existing plans and recreate with proper structure
DELETE FROM subscription_plans;

INSERT INTO subscription_plans (name, tier, price_monthly, price_yearly, features, is_active) VALUES
('Free', 'free', 0.00, 0.00, 
 '["Basic Timer", "Standard Notifications", "Dark Theme", "Basic Analytics"]', 
 true),
('Pro Monthly', 'pro', 499.00, 4999.00, 
 '["Timer Lock Mode", "Smart Notifications", "Analytics Dashboard", "Smart Automation", "Security Features", "Team Management", "White Label Options"]', 
 true);

-- Create function to handle subscription activation with proper error handling
CREATE OR REPLACE FUNCTION activate_user_subscription(
    user_uuid UUID,
    plan_tier VARCHAR(50),
    provider VARCHAR(50),
    provider_subscription_id VARCHAR(255)
) RETURNS BOOLEAN AS $$
DECLARE
    plan_record RECORD;
    subscription_record RECORD;
BEGIN
    -- Find the plan
    SELECT * INTO plan_record 
    FROM subscription_plans 
    WHERE tier = plan_tier AND is_active = true 
    LIMIT 1;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Plan not found or inactive: %', plan_tier;
    END IF;
    
    -- Cancel existing active subscriptions
    UPDATE user_subscriptions 
    SET status = 'cancelled', expires_at = NOW() 
    WHERE user_id = user_uuid AND status IN ('active', 'trial');
    
    -- Create new subscription
    INSERT INTO user_subscriptions (
        user_id, 
        plan_id, 
        status, 
        starts_at, 
        payment_provider, 
        provider_subscription_id, 
        auto_renew
    ) VALUES (
        user_uuid, 
        plan_record.id, 
        'active', 
        NOW(), 
        provider, 
        provider_subscription_id, 
        true
    ) ON CONFLICT (user_id) 
    DO UPDATE SET
        plan_id = plan_record.id,
        status = 'active',
        starts_at = NOW(),
        payment_provider = provider,
        provider_subscription_id = provider_subscription_id,
        auto_renew = true;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Log successful migration (using NULL user_id to avoid foreign key issues)
INSERT INTO payment_events (user_id, event_type, amount, currency, provider, provider_event_id, metadata)
VALUES (
    NULL, -- system migration event
    'migration_completed',
    0.00,
    'INR',
    'system',
    'payu_supabase_integration',
    ('{"message": "PayU Supabase integration migration completed", "timestamp": "' || NOW() || '"}')::jsonb
);

COMMIT;