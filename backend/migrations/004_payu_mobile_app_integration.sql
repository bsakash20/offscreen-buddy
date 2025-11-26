-- PayU Mobile App Integration Schema Updates
-- Database schema changes to support PayU mobile app requirements

-- Add PayU-specific transaction tracking table
CREATE TABLE payu_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    txnid VARCHAR(255) UNIQUE NOT NULL, -- PayU transaction ID
    mihpayid VARCHAR(255), -- PayU payment ID
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'success', 'failure', 'cancelled'
    payment_method VARCHAR(100),
    bank_ref_num VARCHAR(255),
    bankcode VARCHAR(50),
    discount VARCHAR(255),
    net_amount DECIMAL(10,2),
    addedon TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add webhook tracking table
CREATE TABLE payu_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES payu_transactions(id),
    webhook_type VARCHAR(50) DEFAULT 'payment_confirmation',
    status VARCHAR(50) DEFAULT 'received',
    raw_payload TEXT,
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    retry_count INTEGER DEFAULT 0
);

-- Create payment_transactions table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES user_subscriptions(id),
    transaction_type VARCHAR(50) DEFAULT 'subscription', -- 'subscription', 'one_time', 'refund'
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed', 'cancelled', 'refunded'
    payment_method VARCHAR(100),
    gateway VARCHAR(50) DEFAULT 'payu', -- 'payu', 'razorpay', 'stripe', etc.
    gateway_transaction_id VARCHAR(255), -- Payment gateway transaction ID
    gateway_response JSONB, -- Raw gateway response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'
);

-- Add PayU-specific fields to payment_transactions
ALTER TABLE payment_transactions
ADD COLUMN IF NOT EXISTS payu_txnid VARCHAR(255),
ADD COLUMN IF NOT EXISTS payu_mihpayid VARCHAR(255),
ADD COLUMN IF NOT EXISTS payu_hash VARCHAR(255),
ADD COLUMN IF NOT EXISTS payu_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS payu_verify_attempts INTEGER DEFAULT 0;

-- Update user_subscriptions for PayU integration
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS payu_merchant_key VARCHAR(255),
ADD COLUMN IF NOT EXISTS payu_product_info TEXT,
ADD COLUMN IF NOT EXISTS payu_subscription_type VARCHAR(50) DEFAULT 'subscription';

-- Add indexes for performance
CREATE INDEX idx_payu_transactions_user_id ON payu_transactions(user_id);
CREATE INDEX idx_payu_transactions_txnid ON payu_transactions(txnid);
CREATE INDEX idx_payu_transactions_status ON payu_transactions(status);
CREATE INDEX idx_payu_webhooks_transaction_id ON payu_webhooks(transaction_id);
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payu_webhooks_status ON payu_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_user_id ON payment_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_subscription_id ON payment_transactions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway ON payment_transactions(gateway);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_created_at ON payment_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_payu_txnid ON payment_transactions(payu_txnid);

-- Update subscription plans to include PayU-specific configuration
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS payu_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS payu_category VARCHAR(100) DEFAULT 'mobile_app',
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- Add mobile app configuration table
CREATE TABLE mobile_app_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform VARCHAR(20) NOT NULL, -- 'ios', 'android'
    app_version VARCHAR(20) NOT NULL,
    payu_sdk_version VARCHAR(20) DEFAULT '4.5.0',
    webview_config JSONB DEFAULT '{}',
    security_config JSONB DEFAULT '{}',
    callback_urls JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, app_version)
);

-- Insert default mobile app configuration
INSERT INTO mobile_app_config (platform, app_version, webview_config, security_config, callback_urls) VALUES
('ios', '1.0.0', 
 '{"enableJavaScript": true, "scalesPageToFit": true, "allowsBackForwardNavigationGestures": false}',
 '{"verifySSL": true, "allowInvalidCertificates": false, "disableMixedContent": true}',
 '{"success": "offscreenbuddy://payment/success", "failure": "offscreenbuddy://payment/failure"}'
),
('android', '1.0.0',
 '{"enableJavaScript": true, "domStorageEnabled": true, "loadWithOverviewMode": true}',
 '{"verifySSL": true, "allowInvalidCertificates": false, "clearSessionCookiesOnExit": true}',
 '{"success": "offscreenbuddy://payment/success", "failure": "offscreenbuddy://payment/failure"}'
);

-- Add PayU verification status tracking
CREATE TABLE payu_verification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES payu_transactions(id),
    verification_type VARCHAR(50) DEFAULT 'payment_status',
    status VARCHAR(50) DEFAULT 'pending',
    response_data TEXT,
    verification_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create function to update transaction status
CREATE OR REPLACE FUNCTION update_payu_transaction_status(
    p_txnid VARCHAR(255),
    p_status VARCHAR(50),
    p_mihpayid VARCHAR(255) DEFAULT NULL,
    p_payment_method VARCHAR(100) DEFAULT NULL,
    p_bank_ref_num VARCHAR(255) DEFAULT NULL,
    p_bankcode VARCHAR(50) DEFAULT NULL,
    p_net_amount DECIMAL(10,2) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    transaction_record payu_transactions%ROWTYPE;
BEGIN
    UPDATE payu_transactions 
    SET 
        status = p_status,
        mihpayid = COALESCE(p_mihpayid, mihpayid),
        payment_method = COALESCE(p_payment_method, payment_method),
        bank_ref_num = COALESCE(p_bank_ref_num, bank_ref_num),
        bankcode = COALESCE(p_bankcode, bankcode),
        net_amount = COALESCE(p_net_amount, net_amount),
        completed_at = CASE WHEN p_status = 'success' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE txnid = p_txnid
    RETURNING * INTO transaction_record;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to verify PayU payment
CREATE OR REPLACE FUNCTION verify_payu_payment(p_txnid VARCHAR(255))
RETURNS JSONB AS $$
DECLARE
    result JSONB;
    transaction_record payu_transactions%ROWTYPE;
BEGIN
    SELECT * INTO transaction_record FROM payu_transactions WHERE txnid = p_txnid;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object('valid', false, 'error', 'Transaction not found');
    END IF;
    
    -- Log verification attempt
    INSERT INTO payu_verification_logs (transaction_id, verification_type, status)
    VALUES (transaction_record.id, 'payment_status', 'attempted');
    
    result := jsonb_build_object(
        'valid', true,
        'transaction_id', transaction_record.id,
        'txnid', transaction_record.txnid,
        'amount', transaction_record.amount,
        'status', transaction_record.status,
        'verified_at', NOW()
    );
    
    -- Update verification log
    UPDATE payu_verification_logs 
    SET status = CASE WHEN transaction_record.status = 'success' THEN 'verified' ELSE 'failed' END,
        response_data = result::text
    WHERE transaction_id = transaction_record.id 
    AND verification_type = 'payment_status'
    AND verification_time = (
        SELECT MAX(verification_time) 
        FROM payu_verification_logs 
        WHERE transaction_id = transaction_record.id 
        AND verification_type = 'payment_status'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;