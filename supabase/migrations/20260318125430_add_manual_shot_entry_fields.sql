/*
  # Add Manual Shot Entry Fields
  
  1. Changes
    - Add `entry_date` field to weapons table for manual shot count entries (default: today)
    - Add `entry_comment` field to weapons table for manual shot count comments
    - Add `last_manual_entry_date` field to weapons table to track the last manual entry
    
  2. Details
    - `entry_date` allows users to specify when shots were fired (defaults to current date)
    - `entry_comment` provides context for manual entries
    - Fields support the manual shot counter feature in the weapons page
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weapons' AND column_name = 'last_manual_entry_date'
  ) THEN
    ALTER TABLE weapons ADD COLUMN last_manual_entry_date date;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weapons' AND column_name = 'last_manual_entry_comment'
  ) THEN
    ALTER TABLE weapons ADD COLUMN last_manual_entry_comment text;
  END IF;
END $$;
