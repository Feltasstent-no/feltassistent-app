/*
  # Add distance_mode to competitions

  1. Modified Tables
    - `competitions`
      - `distance_mode` (text, nullable) - 'kjent', 'ukjent', or 'blandet'. Defaults to 'kjent'.
    - `competition_stages`
      - `is_preconfigured` (boolean, default true) - Whether the hold was configured before the run started

  2. Purpose
    - Support unknown-distance/unknown-figure competitions where holds are configured just before each hold starts
    - Known-distance competitions continue to work exactly as before
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competitions' AND column_name = 'distance_mode'
  ) THEN
    ALTER TABLE competitions ADD COLUMN distance_mode text DEFAULT 'kjent';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stages' AND column_name = 'is_preconfigured'
  ) THEN
    ALTER TABLE competition_stages ADD COLUMN is_preconfigured boolean DEFAULT true;
  END IF;
END $$;
