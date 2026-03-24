/*
  # Update competition_type constraint properly

  1. Changes
    - Drop old constraint FIRST
    - Then migrate existing data
    - Then add new constraint
  
  2. Notes
    - This order prevents constraint violations during migration
*/

-- Step 1: Drop old constraint
ALTER TABLE competitions 
DROP CONSTRAINT IF EXISTS competitions_competition_type_check;

-- Step 2: Migrate existing 'felt' entries to 'grovfelt'
UPDATE competitions 
SET competition_type = 'grovfelt' 
WHERE competition_type = 'felt';

-- Step 3: Add new constraint
ALTER TABLE competitions 
ADD CONSTRAINT competitions_competition_type_check 
CHECK (competition_type IN ('bane', 'grovfelt', 'finfelt'));

COMMENT ON COLUMN competitions.competition_type IS 'Competition type: bane (range), grovfelt (rough field with varying distances), finfelt (fine field at 100m)';
