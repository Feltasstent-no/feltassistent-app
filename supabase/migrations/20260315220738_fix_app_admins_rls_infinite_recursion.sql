/*
  # Fix infinite recursion in app_admins RLS policy

  1. Changes
    - Drop existing RLS policy that causes infinite recursion
    - Create new simplified policy that allows users to check if they themselves are admin
    - This breaks the recursion by only checking the current row

  2. Security
    - Users can only see their own admin status
    - No recursive checking needed
*/

DROP POLICY IF EXISTS "Admins kan lese admin-liste" ON app_admins;

CREATE POLICY "Users can check their own admin status"
  ON app_admins
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
