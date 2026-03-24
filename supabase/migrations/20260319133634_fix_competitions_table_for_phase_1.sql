/*
  # Fix competitions table for Phase 1

  1. Changes to competitions table
    - Rename `created_by` to `user_id` for consistency
    - Rename `description` to `notes` for consistency
    - Add `status` column (draft, configured, active, completed)
    - Add `total_stages` column
    - Add `total_shots` column for summary data
    - Add `shooter_class` column for user's class
  
  2. Notes
    - This aligns the database schema with the TypeScript types
    - Preserves all existing data during column renames
*/

-- Rename columns for consistency
ALTER TABLE competitions 
RENAME COLUMN created_by TO user_id;

ALTER TABLE competitions 
RENAME COLUMN description TO notes;

-- Add new columns
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS total_stages integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_shots integer,
ADD COLUMN IF NOT EXISTS shooter_class text;

-- Add check constraint for status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'competitions_status_check'
  ) THEN
    ALTER TABLE competitions 
    ADD CONSTRAINT competitions_status_check 
    CHECK (status IN ('draft', 'configured', 'active', 'completed'));
  END IF;
END $$;

COMMENT ON COLUMN competitions.status IS 'Competition status: draft (created), configured (holds set up), active (running), completed (finished)';
COMMENT ON COLUMN competitions.total_stages IS 'Total number of holds/stages in the competition';
