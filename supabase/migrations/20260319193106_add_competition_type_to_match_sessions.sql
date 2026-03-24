/*
  # Add competition_type to match_sessions

  1. Changes
    - Add `competition_type` column to `match_sessions` table
    - Set default to 'grovfelt' for backwards compatibility
    - Add check constraint to ensure valid values

  2. Notes
    - Existing sessions will default to 'grovfelt'
    - This allows MatchConfigure to determine which UI to show (finfelt vs grovfelt)
*/

-- Add competition_type column to match_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'competition_type'
  ) THEN
    ALTER TABLE match_sessions
    ADD COLUMN competition_type text DEFAULT 'grovfelt' NOT NULL
    CHECK (competition_type IN ('grovfelt', 'finfelt'));
  END IF;
END $$;

-- Add comment
COMMENT ON COLUMN match_sessions.competition_type IS 'Competition type: grovfelt (rough field with varying distances and clicks), finfelt (fine field at 100m without clicks)';

-- Create index for filtering
CREATE INDEX IF NOT EXISTS idx_match_sessions_competition_type ON match_sessions(competition_type);
