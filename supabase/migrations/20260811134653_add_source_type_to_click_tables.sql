/*
  # Add source_type column to click_tables

  1. Changes to click_tables
    - Add `source_type` column (varchar, default 'manual')
    - Values: 'manual' (user-created), 'onboarding_reference' (auto-generated Diamond Line table)
  - Existing rows default to 'manual' - no mass data update

  2. Purpose
    - Provides a persistent, name-independent marker for auto-generated reference tables
    - Used by the UI to lock metadata fields (caliber, ammo, velocity, zero distance, sight type)
      while still allowing the user to rename the table and edit click values

  3. Important Notes
    - Default is 'manual' so all existing tables are unaffected
    - Only new onboarding-generated tables will be marked 'onboarding_reference'
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'source_type'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN source_type VARCHAR(30) NOT NULL DEFAULT 'manual';
  END IF;
END $$;

COMMENT ON COLUMN click_tables.source_type IS 'Origin of the table: manual (user-created) or onboarding_reference (auto-generated Diamond Line reference table)';
