/*
  # Add debug columns to match_holds and competition_stages

  1. Changes
    - Add `field_figure_code` (text) - snapshot of figure code for debugging
    - Add `field_figure_name` (text) - snapshot of figure name for debugging
  
  2. Purpose
    - These are NOT used for lookups during run
    - Only for debugging and logging to verify correct figure is loaded
    - The field_figure_id is the single source of truth
*/

-- Add debug columns to match_holds
ALTER TABLE match_holds
ADD COLUMN IF NOT EXISTS field_figure_code text,
ADD COLUMN IF NOT EXISTS field_figure_name text;

-- Add debug columns to competition_stages
ALTER TABLE competition_stages
ADD COLUMN IF NOT EXISTS field_figure_code text,
ADD COLUMN IF NOT EXISTS field_figure_name text;

-- Add comments
COMMENT ON COLUMN match_holds.field_figure_code IS 'Debug snapshot - not used for lookups';
COMMENT ON COLUMN match_holds.field_figure_name IS 'Debug snapshot - not used for lookups';
COMMENT ON COLUMN competition_stages.field_figure_code IS 'Debug snapshot - not used for lookups';
COMMENT ON COLUMN competition_stages.field_figure_name IS 'Debug snapshot - not used for lookups';
