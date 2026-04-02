/*
  # Expand source constraint on weapon_shot_logs

  1. Modified Tables
    - `weapon_shot_logs`
      - Updated `source` CHECK constraint to also allow 'match' and 'training'

  2. Important Notes
    - Drops existing constraint and replaces with expanded one
    - No data changes, only constraint update
    - Enables shot logging from match completion and training registration flows
*/

ALTER TABLE weapon_shot_logs DROP CONSTRAINT IF EXISTS weapon_shot_logs_source_check;

ALTER TABLE weapon_shot_logs ADD CONSTRAINT weapon_shot_logs_source_check
  CHECK (source IN ('dashboard', 'weapons_page', 'quick_assistant', 'match', 'training'));
