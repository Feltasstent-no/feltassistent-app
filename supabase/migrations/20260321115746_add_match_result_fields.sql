/*
  # Add match result fields for field shooting results

  1. Modified Tables
    - `match_sessions`
      - `total_hits` (integer, nullable) - Total number of hits in the match
      - `inner_hits` (integer, nullable) - Number of inner hits (innertreff)
      - `result_notes` (text, nullable) - Optional notes about the result

  2. Important Notes
    - These fields are nullable since results are entered after the match is completed
    - No default values since absence of data is meaningful (not yet entered)
    - No RLS changes needed as match_sessions already has proper policies
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'total_hits'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN total_hits integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'inner_hits'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN inner_hits integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'result_notes'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN result_notes text;
  END IF;
END $$;
