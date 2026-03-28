/*
  # Add log_type column to weapon_shot_logs

  1. Modified Tables
    - `weapon_shot_logs`
      - `log_type` (text, default 'add') - Distinguishes between shot additions ('add') and corrections/subtractions ('correction')

  2. Important Notes
    - The existing check constraint requires shots_fired > 0
    - Corrections (subtractions) will store a positive shots_fired value with log_type = 'correction'
    - Totals are computed as: SUM(add entries) - SUM(correction entries)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weapon_shot_logs' AND column_name = 'log_type'
  ) THEN
    ALTER TABLE weapon_shot_logs ADD COLUMN log_type text NOT NULL DEFAULT 'add';
    ALTER TABLE weapon_shot_logs ADD CONSTRAINT weapon_shot_logs_log_type_check
      CHECK (log_type IN ('add', 'correction'));
  END IF;
END $$;
