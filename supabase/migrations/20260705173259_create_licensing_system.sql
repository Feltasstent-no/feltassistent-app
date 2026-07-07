/*
# Create Licensing System Foundation

Prepares Feltassistenten for annual Stripe subscriptions. Does NOT connect Stripe yet.

1. New Tables
   - `products`
     - `id` (uuid, primary key)
     - `product_key` (text, unique) - machine-readable identifier
     - `name` (text) - display name
     - `description` (text, nullable)
     - `is_active` (boolean, default true)
     - `created_at` (timestamptz)

   - `plans`
     - `id` (uuid, primary key)
     - `product_id` (uuid, FK to products)
     - `plan_key` (text, unique) - machine-readable identifier
     - `name` (text) - display name
     - `price_nok` (integer) - price in NOK (ore-free, whole kroner)
     - `billing_interval` (text) - 'month' or 'year'
     - `trial_days` (integer, default 0)
     - `is_active` (boolean, default true)
     - `stripe_price_id` (text, nullable) - for future Stripe integration
     - `created_at` (timestamptz)

   - `licenses`
     - `id` (uuid, primary key)
     - `user_id` (uuid, FK to auth.users)
     - `product_id` (uuid, FK to products)
     - `plan_id` (uuid, FK to plans)
     - `status` (text) - trialing, active, past_due, canceled, expired
     - `current_period_start` (timestamptz)
     - `current_period_end` (timestamptz)
     - `trial_start` (timestamptz, nullable)
     - `trial_end` (timestamptz, nullable)
     - `cancel_at_period_end` (boolean, default false)
     - `stripe_customer_id` (text, nullable)
     - `stripe_subscription_id` (text, nullable)
     - `created_at` (timestamptz)
     - `updated_at` (timestamptz)

   - `stripe_customers`
     - `id` (uuid, primary key)
     - `user_id` (uuid, FK to auth.users, unique)
     - `stripe_customer_id` (text, unique)
     - `email` (text, nullable)
     - `created_at` (timestamptz)

   - `billing_events`
     - `id` (uuid, primary key)
     - `user_id` (uuid, FK to auth.users)
     - `license_id` (uuid, FK to licenses, nullable)
     - `event_type` (text) - e.g. 'trial_started', 'payment_succeeded', etc.
     - `stripe_event_id` (text, nullable)
     - `metadata` (jsonb, nullable)
     - `created_at` (timestamptz)

2. Security
   - RLS enabled on all tables.
   - products & plans: readable by all authenticated users (reference data).
   - licenses: users can SELECT own rows only. No INSERT/UPDATE/DELETE by users.
   - stripe_customers: users can SELECT own row only. No INSERT/UPDATE/DELETE by users.
   - billing_events: users can SELECT own rows only. No INSERT/UPDATE/DELETE by users.
   - Service role bypasses RLS, so edge functions can manage all writes.

3. Helper Function
   - `has_active_license(p_user_id uuid, p_product_key text)` returns boolean.
   - Returns true if user has a license with status 'trialing' or 'active'
     AND current_period_end is in the future.

4. Seed Data
   - Product: feltassistent / "Feltassistenten"
   - Plan: full / "Full tilgang" / 299 NOK / year / 90 trial days

5. Important Notes
   - Stripe is NOT connected yet. stripe_* columns are nullable placeholders.
   - No features are gated yet. This is purely the data model.
   - The helper function can be used in future RLS policies to gate features.
*/

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_products" ON products;
CREATE POLICY "authenticated_read_products" ON products FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- PLANS
-- ============================================================
CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_key text UNIQUE NOT NULL,
  name text NOT NULL,
  price_nok integer NOT NULL,
  billing_interval text NOT NULL CHECK (billing_interval IN ('month', 'year')),
  trial_days integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  stripe_price_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_read_plans" ON plans;
CREATE POLICY "authenticated_read_plans" ON plans FOR SELECT
  TO authenticated USING (true);

-- ============================================================
-- LICENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'trialing' CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'expired')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL,
  trial_start timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licenses_user_id ON licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_user_product ON licenses(user_id, product_id);

ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_licenses" ON licenses;
CREATE POLICY "users_read_own_licenses" ON licenses FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies for authenticated users.
-- Only service_role (edge functions) can write to licenses.

-- ============================================================
-- STRIPE CUSTOMERS
-- ============================================================
CREATE TABLE IF NOT EXISTS stripe_customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE NOT NULL,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_stripe_customer" ON stripe_customers;
CREATE POLICY "users_read_own_stripe_customer" ON stripe_customers FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- BILLING EVENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_id uuid REFERENCES licenses(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  stripe_event_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_user_id ON billing_events(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_license_id ON billing_events(license_id);

ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_read_own_billing_events" ON billing_events;
CREATE POLICY "users_read_own_billing_events" ON billing_events FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- HELPER FUNCTION: has_active_license
-- ============================================================
CREATE OR REPLACE FUNCTION has_active_license(p_user_id uuid, p_product_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM licenses l
    JOIN products p ON p.id = l.product_id
    WHERE l.user_id = p_user_id
      AND p.product_key = p_product_key
      AND l.status IN ('trialing', 'active')
      AND l.current_period_end > now()
  );
$$;

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO products (product_key, name, description)
VALUES ('feltassistent', 'Feltassistenten', 'Komplett feltassistent for DFS-skyttere')
ON CONFLICT (product_key) DO NOTHING;

INSERT INTO plans (product_id, plan_key, name, price_nok, billing_interval, trial_days)
SELECT p.id, 'full', 'Full tilgang', 299, 'year', 90
FROM products p
WHERE p.product_key = 'feltassistent'
ON CONFLICT (plan_key) DO NOTHING;
