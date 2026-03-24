/*
  # Add Wind Calibration to Click Tables

  1. Changes
    - Add `wind_clicks_per_10ms_100m` column to store DFS-calibrated wind factor
    - This represents how many clicks of windage correction are needed per 10 m/s crosswind at 100m
    - Default value of 4.4 is calibrated for typical 6.5mm DFS setup (Busk Standard)
  
  2. Background
    - The existing `click_value_cm_100m` is for ELEVATION only
    - Wind corrections require a separate calibration factor
    - DFS uses different algorithms for elevation vs wind
    - Typical DFS value: ~4.4 clicks per 10 m/s at 100m
  
  3. Formula
    - wind_clicks = (crosswind_ms / 10) * wind_clicks_per_10ms_100m * (distance_m / 100)
    - Example: 10 m/s at 250m = (10/10) * 4.4 * (250/100) = 11 clicks
*/

-- Add wind calibration column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'wind_clicks_per_10ms_100m'
  ) THEN
    ALTER TABLE click_tables 
    ADD COLUMN wind_clicks_per_10ms_100m numeric NOT NULL DEFAULT 4.4
    CHECK (wind_clicks_per_10ms_100m > 0);
  END IF;
END $$;

COMMENT ON COLUMN click_tables.wind_clicks_per_10ms_100m IS 
'Wind correction factor: clicks needed per 10 m/s crosswind at 100m. Typical DFS values: 4.0-5.0 for 6.5mm, 4.5-5.5 for 7.62mm';
