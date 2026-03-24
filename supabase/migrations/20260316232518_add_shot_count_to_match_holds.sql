/*
  # Add shot count field to match holds

  1. Changes
    - Add `shot_count` column to `match_holds` table
      - Default value: 10 (standard for most field shooting)
      - Allows shooters to specify number of shots per hold
      - Typically 10 shots, but can vary by competition rules

  2. Notes
    - Uses DEFAULT 10 as this is the most common shot count in field shooting
    - Allows values from 1 to 20 to cover different competition formats
    - Non-nullable to ensure every hold has a defined shot count
*/

-- Add shot_count column to match_holds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_holds' AND column_name = 'shot_count'
  ) THEN
    ALTER TABLE match_holds 
    ADD COLUMN shot_count integer DEFAULT 10 NOT NULL
    CONSTRAINT valid_shot_count CHECK (shot_count >= 1 AND shot_count <= 20);
  END IF;
END $$;