-- Migration: Add User Profile Columns
-- Description: Adds name and phone columns to users table for PayU service compatibility
-- Date: 2025-11-21
-- Version: 1.0.0

-- This migration safely adds the missing name and phone columns to the users table
-- for backward compatibility with PayU service integration

-- Add name column (user's full name, nullable for backward compatibility)
ALTER TABLE users 
ADD COLUMN name VARCHAR(100);

-- Add phone column (user's phone number, nullable for backward compatibility)  
ALTER TABLE users 
ADD COLUMN phone VARCHAR(20);

-- Add comments for documentation
COMMENT ON COLUMN users.name IS 'User''s full name (nullable for backward compatibility)';
COMMENT ON COLUMN users.phone IS 'User''s phone number (nullable for backward compatibility)';

-- Create indexes for performance if needed
-- Note: These are optional since columns are nullable and may have low selectivity
-- CREATE INDEX idx_users_name ON users(name) WHERE name IS NOT NULL;
-- CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;

-- Verification query to ensure columns were added successfully
DO $$
BEGIN
    -- Verify name column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'name'
    ) THEN
        RAISE EXCEPTION 'Failed to add name column to users table';
    END IF;

    -- Verify phone column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone'
    ) THEN
        RAISE EXCEPTION 'Failed to add phone column to users table';
    END IF;

    RAISE NOTICE 'Successfully added name and phone columns to users table';
END $$;

-- Log migration completion
INSERT INTO migration_log (version, description, executed_at) 
VALUES ('001', 'Add user profile columns (name, phone)', NOW())
ON CONFLICT (version) DO UPDATE SET 
    description = EXCLUDED.description,
    executed_at = EXCLUDED.executed_at;