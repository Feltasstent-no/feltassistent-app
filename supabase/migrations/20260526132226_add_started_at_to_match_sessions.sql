/*
  # Add started_at to match_sessions

  1. Modified Tables
    - `match_sessions`
      - Added `started_at` (timestamptz, nullable) - Records when the shooter actually starts the first hold
  
  2. Purpose
    - Separate session creation time (created_at) from actual execution start time (started_at)
    - Feltstevne sessions are often configured the day before; duration should only measure actual execution time
    - Duration in summary will be calculated as: completed_at - started_at (with fallback to created_at for old data)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'started_at'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN started_at timestamptz;
  END IF;
END $$;
