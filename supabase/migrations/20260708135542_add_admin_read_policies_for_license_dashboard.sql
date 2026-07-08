/*
# Add Admin Read Policies for License Dashboard

1. Security Changes
   - `profiles`: Add SELECT policy for admins to read all profiles
   - `profiles`: Add UPDATE policy for admins to update is_demo on any profile
   - `licenses`: Add SELECT policy for admins to read all licenses
   - `billing_events`: Add SELECT policy for admins to read all billing events
   - `stripe_customers`: Add SELECT policy for admins to read all stripe customer records

2. Important Notes
   - Admin check uses EXISTS on app_admins table
   - These policies are additive - they don't remove existing user-scoped policies
   - Only users listed in app_admins can access other users' data
*/

-- Admins can read all profiles
DROP POLICY IF EXISTS "admins_read_all_profiles" ON profiles;
CREATE POLICY "admins_read_all_profiles" ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- Admins can update is_demo on any profile
DROP POLICY IF EXISTS "admins_update_profiles" ON profiles;
CREATE POLICY "admins_update_profiles" ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- Admins can read all licenses
DROP POLICY IF EXISTS "admins_read_all_licenses" ON licenses;
CREATE POLICY "admins_read_all_licenses" ON licenses FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- Admins can read all billing events
DROP POLICY IF EXISTS "admins_read_all_billing_events" ON billing_events;
CREATE POLICY "admins_read_all_billing_events" ON billing_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- Admins can read all stripe customers
DROP POLICY IF EXISTS "admins_read_all_stripe_customers" ON stripe_customers;
CREATE POLICY "admins_read_all_stripe_customers" ON stripe_customers FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );
