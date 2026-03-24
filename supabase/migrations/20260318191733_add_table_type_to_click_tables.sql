/*
  # Add Table Type and Reference Fields to Click Tables

  1. Changes to click_tables
    - Add `table_type` column ('full' | 'reference')
      - 'full' = traditional click table with rows for each distance
      - 'reference' = single reference point with interpolation
    - Add `reference_distance_m` for reference-type tables
    - Add `reference_clicks` for reference-type tables

  2. Purpose
    - Support different shooting disciplines:
      - DFS felt 6,5x55: full click table
      - .22 LR to 100m: reference point (e.g., +8 clicks @ 100m)
      - 6,5x55 finfelt: reference point with fixed offset
    - Allow users to define simpler profiles without full tables

  3. Important Notes
    - Default table_type is 'full' for backward compatibility
    - Reference fields are nullable and only used when table_type = 'reference'
    - Full tables continue to use click_table_rows as before
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'table_type'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN table_type VARCHAR(20) DEFAULT 'full';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'reference_distance_m'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN reference_distance_m INTEGER;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'reference_clicks'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN reference_clicks INTEGER;
  END IF;
END $$;

COMMENT ON COLUMN click_tables.table_type IS 'Type of click table: full (traditional with rows) or reference (single reference point with interpolation)';
COMMENT ON COLUMN click_tables.reference_distance_m IS 'Reference distance in meters for reference-type tables';
COMMENT ON COLUMN click_tables.reference_clicks IS 'Number of clicks at reference distance for reference-type tables';