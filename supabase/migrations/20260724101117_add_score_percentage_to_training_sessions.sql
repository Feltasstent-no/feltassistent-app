/*
# Add score percentage snapshot to training_sessions

## Summary
Adds max_score_possible and score_percentage columns to training_sessions
for percentage-based ranking of range match (banestevne) results.

## New Columns on training_sessions
- max_score_possible (integer, nullable): total_shots * 10 for range matches
- score_percentage (numeric(7,4), nullable): (total_score / max_score_possible) * 100

## Data Migration
Backfills max_score_possible and score_percentage for all completed range_match sessions
where total_shots > 0.

## Notes
1. Columns are nullable for backwards compatibility
2. No existing data is modified or deleted
3. Only computed snapshot values are added
4. Historical sessions with 0 shots are left as null (no division by zero)
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_sessions' AND column_name = 'max_score_possible'
  ) THEN
    ALTER TABLE training_sessions ADD COLUMN max_score_possible integer;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_sessions' AND column_name = 'score_percentage'
  ) THEN
    ALTER TABLE training_sessions ADD COLUMN score_percentage numeric(7,4);
  END IF;
END $$;

-- Backfill historical completed range_match sessions
UPDATE training_sessions
SET
  max_score_possible = total_shots * 10,
  score_percentage = CASE
    WHEN total_shots > 0 THEN (total_score::numeric / (total_shots * 10)) * 100
    ELSE NULL
  END
WHERE session_type = 'range_match'
  AND status = 'completed'
  AND total_shots > 0
  AND max_score_possible IS NULL;
