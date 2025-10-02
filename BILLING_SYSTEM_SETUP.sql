-- ╔════════════════════════════════════════════════════════════════════╗
-- ║              BILLING & SUBSCRIPTION SYSTEM SETUP                   ║
-- ║                                                                    ║
-- ║  Complete database schema for subscription billing                 ║
-- ║  Run this entire file in Supabase SQL Editor                      ║
-- ║                                                                    ║
-- ║  Author: Factory AI Assistant                                     ║
-- ║  Version: 2.0                                                     ║
-- ║  Date: 2025-10-02                                                 ║
-- ╚════════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════
-- SECTION 1: CREATE TABLES
-- ════════════════════════════════════════════════════════════════════

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 1.1 Subscription Plans Table                                   │
-- │ Stores available subscription plans (Pro, Enterprise, etc.)    │
-- └────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'MYR',
  interval_type text NOT NULL DEFAULT 'month' CHECK (interval_type IN ('day', 'week', 'month', 'year')),
  interval_count integer NOT NULL DEFAULT 1 CHECK (interval_count > 0),
  description text,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT subscription_plans_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_plans_name_unique UNIQUE (name)
);

COMMENT ON TABLE public.subscription_plans IS 'Available subscription plans with pricing and features';
COMMENT ON COLUMN public.subscription_plans.interval_count IS 'Number of intervals (e.g., 1 month, 3 months, 1 year)';
COMMENT ON COLUMN public.subscription_plans.features IS 'JSON array of feature strings';

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 1.2 User Subscriptions Table                                   │
-- │ Tracks each user''s subscription status and trial period        │
-- └────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'expired', 'cancelled')),
  plan_id uuid,
  trial_start_date timestamptz,
  trial_end_date timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) 
    REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  CONSTRAINT trial_dates_valid CHECK (
    (trial_start_date IS NULL AND trial_end_date IS NULL) OR 
    (trial_start_date IS NOT NULL AND trial_end_date IS NOT NULL AND trial_end_date > trial_start_date)
  ),
  CONSTRAINT period_dates_valid CHECK (
    (current_period_start IS NULL AND current_period_end IS NULL) OR 
    (current_period_start IS NOT NULL AND current_period_end IS NOT NULL AND current_period_end > current_period_start)
  )
);

COMMENT ON TABLE public.user_subscriptions IS 'User subscription status, trials, and billing periods';
COMMENT ON COLUMN public.user_subscriptions.status IS 'Subscription status: trial, active, expired, or cancelled';
COMMENT ON COLUMN public.user_subscriptions.cancel_at_period_end IS 'If true, subscription will not renew';

-- ┌────────────────────────────────────────────────────────────────┐
-- │ 1.3 Payments Table                                             │
-- │ Records all payment transactions (Billplz, Stripe, etc.)       │
-- └────────────────────────────────────────────────────────────────┘

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  subscription_id uuid,
  amount numeric(10,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'MYR',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded', 'cancelled')),
  payment_method text CHECK (payment_method IN ('billplz', 'stripe', 'manual', 'other')),
  
  -- Billplz specific fields
  billplz_bill_id text,
  billplz_url text,
  
  -- Stripe specific fields
  stripe_payment_intent_id text,
  stripe_charge_id text,
  
  -- Payment completion
  paid_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  
  -- Additional data
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) 
    REFERENCES public.user_subscriptions(id) ON DELETE SET NULL,
  CONSTRAINT payments_billplz_bill_id_unique UNIQUE (billplz_bill_id),
  CONSTRAINT payments_stripe_payment_intent_unique UNIQUE (stripe_payment_intent_id)
);

COMMENT ON TABLE public.payments IS 'Payment transaction records for all payment methods';
COMMENT ON COLUMN public.payments.metadata IS 'Additional payment data (gateway response, customer info, etc.)';
COMMENT ON COLUMN public.payments.failed_at IS 'Timestamp when payment failed';
COMMENT ON COLUMN public.payments.failure_reason IS 'Human-readable failure reason';

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ================================================
-- CREATE RLS POLICIES
-- ================================================

-- Subscription Plans Policies (read-only for users)
DROP POLICY IF EXISTS "Anyone can view active subscription plans" ON public.subscription_plans;
CREATE POLICY "Anyone can view active subscription plans" ON public.subscription_plans
  FOR SELECT USING (is_active = true);

-- User Subscriptions Policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.user_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can insert their own subscription" ON public.user_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can update their own subscription" ON public.user_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- Payments Policies
DROP POLICY IF EXISTS "Users can view their own payments" ON public.payments;
CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON public.payments;
CREATE POLICY "Users can insert their own payments" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ================================================
-- CREATE INDEXES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription_id ON public.payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_billplz_bill_id ON public.payments(billplz_bill_id);

-- ================================================
-- CREATE FUNCTIONS
-- ================================================

-- Function to create trial subscription for new users
CREATE OR REPLACE FUNCTION public.create_trial_subscription(p_user_id uuid)
RETURNS uuid AS $$
DECLARE
  v_subscription_id uuid;
BEGIN
  -- Check if user already has a subscription
  IF EXISTS (SELECT 1 FROM public.user_subscriptions WHERE user_id = p_user_id) THEN
    RETURN NULL;
  END IF;

  -- Create 7-day trial subscription
  INSERT INTO public.user_subscriptions (
    user_id,
    status,
    trial_start_date,
    trial_end_date,
    current_period_start,
    current_period_end
  ) VALUES (
    p_user_id,
    'trial',
    now(),
    now() + interval '7 days',
    now(),
    now() + interval '7 days'
  ) RETURNING id INTO v_subscription_id;

  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can make calls (has active subscription)
CREATE OR REPLACE FUNCTION public.can_user_make_calls(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_subscription record;
BEGIN
  -- Get user's subscription
  SELECT * INTO v_subscription
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- No subscription found
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Check if trial is active
  IF v_subscription.status = 'trial' THEN
    RETURN (v_subscription.trial_end_date > now());
  END IF;

  -- Check if subscription is active
  IF v_subscription.status = 'active' THEN
    RETURN (v_subscription.current_period_end > now());
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update subscription to active after payment
CREATE OR REPLACE FUNCTION public.activate_subscription(
  p_subscription_id uuid,
  p_plan_id uuid
)
RETURNS boolean AS $$
BEGIN
  UPDATE public.user_subscriptions
  SET 
    status = 'active',
    plan_id = p_plan_id,
    current_period_start = now(),
    current_period_end = now() + interval '30 days',
    updated_at = now()
  WHERE id = p_subscription_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- INSERT DEFAULT SUBSCRIPTION PLANS
-- ================================================

-- Insert Pro Plan (RM 1/month)
INSERT INTO public.subscription_plans (name, price, currency, interval_type, description, features, is_active)
VALUES (
  'Pro Plan',
  1.00,
  'MYR',
  'month',
  'Unlock all premium features',
  '[
    "Unlimited projects",
    "Custom domains",
    "Priority support",
    "Advanced analytics",
    "Remove branding"
  ]'::jsonb,
  true
) ON CONFLICT DO NOTHING;

-- ================================================
-- CREATE TRIGGERS
-- ================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS subscription_updated_at ON public.user_subscriptions;
CREATE TRIGGER subscription_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_updated_at();

DROP TRIGGER IF EXISTS plans_updated_at ON public.subscription_plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_subscription_updated_at();

-- ================================================
-- VERIFICATION QUERIES
-- ================================================

-- Check if all tables were created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('subscription_plans', 'user_subscriptions', 'payments')
ORDER BY table_name;

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('subscription_plans', 'user_subscriptions', 'payments')
ORDER BY tablename;

-- Check subscription plans
SELECT * FROM public.subscription_plans;

-- ================================================
-- END OF SETUP
-- ================================================
