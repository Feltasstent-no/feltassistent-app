/*
  # Update match_sessions to use click tables instead of ballistic profiles

  1. Changes
    - Replace `ballistic_profile_id` column with `click_table_id`
    - Update foreign key reference to point to click_tables
    - Maintain existing data integrity
  
  2. Security
    - No RLS policy changes needed
*/

-- Add click_table_id column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'click_table_id'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN click_table_id uuid REFERENCES click_tables(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Remove ballistic_profile_id column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'ballistic_profile_id'
  ) THEN
    ALTER TABLE match_sessions DROP COLUMN ballistic_profile_id;
  END IF;
END $$;
