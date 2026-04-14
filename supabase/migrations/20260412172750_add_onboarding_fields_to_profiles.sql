/*
  # Add onboarding fields to profiles table

  1. Modified Tables
    - `profiles`
      - `onboarding_completed` (boolean, default false) - whether user has finished onboarding
      - `shooting_type` (text, nullable) - 'finfelt', 'grovfelt', or 'both'
      - `caliber_type` (text, nullable) - '.22 LR', '6.5x55', or 'annet'
      - `usage_intent` (text, nullable) - 'stevne', 'trening', 'knepp_vind', or 'alt'
      - `user_mode` (text, default 'both') - derived mode: 'finfelt_only', 'grovfelt', or 'both'

  2. Important Notes
    - All new columns are nullable or have safe defaults
    - Existing users get onboarding_completed = false and user_mode = 'both'
    - No data is lost or modified for existing users
    - The user_mode field controls UI visibility/emphasis after onboarding
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'onboarding_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN onboarding_completed boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'shooting_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN shooting_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'caliber_type'
  ) THEN
    ALTER TABLE profiles ADD COLUMN caliber_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'usage_intent'
  ) THEN
    ALTER TABLE profiles ADD COLUMN usage_intent text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN user_mode text DEFAULT 'both';
  END IF;
END $$;