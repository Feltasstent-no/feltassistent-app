/*
# Add User Management Support (disable/delete) + Admin Audit Logs

1. Modified Tables
   - `profiles`
     - Added `is_disabled` (boolean, default false) - marks disabled/suspended users
     - Added `disabled_at` (timestamptz, nullable) - when the user was disabled
     - Added `disabled_by` (uuid, nullable) - which admin disabled the user

2. New Tables
   - `admin_audit_logs`
     - `id` (uuid, primary key)
     - `admin_user_id` (uuid, not null) - the admin who performed the action
     - `target_user_id` (uuid, nullable) - the user affected by the action
     - `action` (text, not null) - action identifier (user_disabled, user_reactivated, user_deleted, etc.)
     - `details` (jsonb, nullable) - additional context about the action
     - `created_at` (timestamptz, default now())

3. Security
   - RLS enabled on admin_audit_logs
   - Only admins (via app_admins check) can SELECT audit logs
   - Only service_role can INSERT (edge functions / server-side)
   - No UPDATE/DELETE policies (audit logs are immutable)

4. Important Notes
   - Disabled users see a blocked screen in the app
   - Audit logs provide accountability for all admin actions
   - Admin INSERT policy added so frontend admin actions can write audit logs too
*/

-- Add is_disabled columns to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_disabled'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_disabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'disabled_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN disabled_at timestamptz NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'disabled_by'
  ) THEN
    ALTER TABLE profiles ADD COLUMN disabled_by uuid NULL;
  END IF;
END $$;

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NULL,
  action text NOT NULL,
  details jsonb NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON admin_audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
DROP POLICY IF EXISTS "admins_read_audit_logs" ON admin_audit_logs;
CREATE POLICY "admins_read_audit_logs" ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- Admins can insert audit logs from frontend actions
DROP POLICY IF EXISTS "admins_insert_audit_logs" ON admin_audit_logs;
CREATE POLICY "admins_insert_audit_logs" ON admin_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
    AND admin_user_id = auth.uid()
  );
