/*
  # Add recommended wind clicks to match_holds

  1. Modified Tables
    - `match_holds`
      - `recommended_wind_clicks` (integer, nullable, default 0) - system-calculated wind correction suggestion
      - `wind_correction_clicks` already exists as the user's active/manual wind correction

  2. Purpose
    - Store the system's wind recommendation alongside the user's chosen correction
    - "Anbefalt vind" vs "Aktiv vindkorreksjon" in the UI
    - Uses the same click table and resolver as ShotAssistant for consistency
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_holds' AND column_name = 'recommended_wind_clicks'
  ) THEN
    ALTER TABLE match_holds ADD COLUMN recommended_wind_clicks integer DEFAULT 0;
  END IF;
END $$;
