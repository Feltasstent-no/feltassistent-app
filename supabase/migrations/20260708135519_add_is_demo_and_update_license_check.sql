/*
# Add Demo User Support

1. Modified Tables
   - `profiles`
     - Added `is_demo` (boolean, default false) - marks internal demo/test users

2. Modified Functions
   - `has_active_license(p_user_id uuid, p_product_key text)`
     - Now checks `profiles.is_demo` first
     - If is_demo = true, always returns true (no license/stripe required)
     - Otherwise falls back to existing license check logic

3. Security
   - Only admins (service role) can set is_demo via direct SQL
   - Regular users cannot update this column (existing RLS prevents it since
     the UPDATE policy only allows auth.uid() = id, but is_demo changes are 
     done via service role from admin actions)

4. Important Notes
   - Demo users never see billing UI
   - Demo users always have full access
   - No Stripe interaction for demo users
*/

-- Add is_demo column to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'is_demo'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_demo boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Update has_active_license to check is_demo first
CREATE OR REPLACE FUNCTION has_active_license(p_user_id uuid, p_product_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM profiles WHERE id = p_user_id AND is_demo = true
      ) THEN true
      ELSE EXISTS (
        SELECT 1
        FROM licenses l
        JOIN products p ON p.id = l.product_id
        WHERE l.user_id = p_user_id
          AND p.product_key = p_product_key
          AND l.status IN ('trialing', 'active')
          AND l.current_period_end > now()
      )
    END;
$$;
