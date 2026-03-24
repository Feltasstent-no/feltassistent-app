/*
  # Add Wind Click Value to Click Tables

  1. Changes
    - Add `click_value_cm_100m` column to `click_tables`
      - Represents cm per click at 100 meters
      - Used for wind drift calculations
      - Default value: 1.0 cm (typical for many sights)
      - Cannot be zero or negative

  2. Purpose
    - Enable wind correction calculations for click tables
    - Allows field assistant to calculate wind clicks based on:
      - Wind speed and direction
      - Distance to target
      - Click value (cm per click at 100m)

  3. Notes
    - This field was defined in TypeScript but missing from database
    - Essential for wind calculations to work correctly
    - Default 1.0 cm is reasonable starting point (can be adjusted per table)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'click_value_cm_100m'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN click_value_cm_100m NUMERIC DEFAULT 1.0 NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN click_tables.click_value_cm_100m IS 'Centimeters per click at 100 meters (for wind drift calculations)';

-- Add check constraint to ensure positive value
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'click_tables_click_value_positive'
  ) THEN
    ALTER TABLE click_tables ADD CONSTRAINT click_tables_click_value_positive 
    CHECK (click_value_cm_100m > 0);
  END IF;
END $$;
