/*
  # Fix competition_stages table for Phase 1

  1. Changes to competition_stages table
    - Rename `figure_id` to `field_figure_id` for consistency
    - Rename `shots_count` to `total_shots` for consistency
    - Rename `shoot_seconds` to `time_limit_seconds` for consistency
    - Add `description` column for hold descriptions
  
  2. Notes
    - This aligns the database schema with the TypeScript types
    - Preserves all existing data during column renames
*/

-- Rename columns for consistency
ALTER TABLE competition_stages 
RENAME COLUMN figure_id TO field_figure_id;

ALTER TABLE competition_stages 
RENAME COLUMN shots_count TO total_shots;

ALTER TABLE competition_stages 
RENAME COLUMN shoot_seconds TO time_limit_seconds;

-- Add description column if it doesn't exist
ALTER TABLE competition_stages
ADD COLUMN IF NOT EXISTS description text;

-- Update comments
COMMENT ON COLUMN competition_stages.field_figure_id IS 'Reference to field_figures table';
COMMENT ON COLUMN competition_stages.total_shots IS 'Total number of shots for this hold';
COMMENT ON COLUMN competition_stages.time_limit_seconds IS 'Time limit in seconds for shooting';
