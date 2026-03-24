/*
  # Add is_active column to click_tables

  1. Changes
    - Add `is_active` column to click_tables table
    - Default value is true for existing records
  
  2. Notes
    - Allows soft delete of click tables
    - Existing click tables will be marked as active
*/

-- Add is_active column to click_tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN is_active boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_click_tables_is_active ON click_tables(is_active);
