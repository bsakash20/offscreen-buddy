-- Create payment_events table for logging payment events
CREATE TABLE IF NOT EXISTS public.payment_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  provider TEXT NOT NULL,
  provider_event_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_payment_events_user_id ON public.payment_events(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_events_created_at ON public.payment_events(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_events_event_type ON public.payment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_events_provider ON public.payment_events(provider);