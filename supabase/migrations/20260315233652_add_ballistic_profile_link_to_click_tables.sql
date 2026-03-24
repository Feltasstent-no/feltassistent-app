/*
  # Add Ballistic Profile Link to Click Tables

  1. Changes
    - Add `ballistic_profile_id` column to `click_tables` table
    - Add `generated_from_profile` boolean flag to `click_tables` table
    - Add foreign key constraint to `ballistic_profiles` table

  2. Purpose
    - Enable linking click tables to ballistic profiles
    - Track whether a click table was manually created or generated from a profile
    - Support workflow for generating click tables from ballistic profiles
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'ballistic_profile_id'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN ballistic_profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'generated_from_profile'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN generated_from_profile boolean DEFAULT false;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_click_tables_ballistic_profile_id ON click_tables(ballistic_profile_id);
