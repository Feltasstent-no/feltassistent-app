/*
  # Add distance_mode to match_sessions

  1. Modified Tables
    - `match_sessions`
      - `distance_mode` (text, default 'kjent') - Controls whether holds are pre-configured or configured live during the match
        - 'kjent': All holds must be filled with figure and distance before starting (existing behavior)
        - 'ukjent': Holds are configured one-by-one during the match run (new behavior)

  2. Purpose
    - Support unknown-hold matches where figure and distance are not known in advance
    - Known-hold matches continue to work exactly as before
    - The new mode allows a pre-hold configuration step during the active match
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'distance_mode'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN distance_mode text DEFAULT 'kjent';
  END IF;
END $$;
