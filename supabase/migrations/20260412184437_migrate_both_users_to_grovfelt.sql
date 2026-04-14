/*
  # Migrate 'both' users to 'grovfelt'

  1. Changes
    - Updates all profiles with `user_mode = 'both'` to `user_mode = 'grovfelt'`
    - Updates all profiles with `shooting_type = 'both'` to `shooting_type = 'grovfelt'`

  2. Reason
    - The 'both' shooting type and user mode are being removed
    - Users who previously selected 'Begge' (both) are mapped to 'grovfelt'
      since they already had access to all grovfelt features
    - This is a safe data migration with no data loss

  3. Important Notes
    - Grovfelt mode includes all features that 'both' mode had
    - Existing users will retain full functionality
*/

UPDATE profiles
SET user_mode = 'grovfelt'
WHERE user_mode = 'both';

UPDATE profiles
SET shooting_type = 'grovfelt'
WHERE shooting_type = 'both';
