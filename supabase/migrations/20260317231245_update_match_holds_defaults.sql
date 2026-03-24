/*
  # Update match holds default values

  1. Changes
    - Change shot_count default from 10 to 6
    - This reflects the standard 6 shots per hold in most DFS competitions

  2. Notes
    - This only affects NEW holds created after this migration
    - Existing holds remain unchanged
*/

-- Update shot_count default to 6
ALTER TABLE match_holds
ALTER COLUMN shot_count SET DEFAULT 6;
