/*
  # Add Wind and Recommendations to Competition Stage Logs

  1. Changes
    - Add `wind_speed` column to store wind speed in m/s
    - Add `wind_direction` column to store wind direction (left/right)
    - Add `recommended_elevation_clicks` to store suggested elevation clicks
    - Add `recommended_windage_clicks` to store suggested windage clicks
    - Rename `recommended_clicks` to clarify it's elevation
    - Rename `used_clicks` to clarify it's elevation

  2. Purpose
    - Support full wind workflow in competition runs
    - Track both recommended and actually used click values
    - Enable better decision support for shooters in the field
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_logs' AND column_name = 'wind_speed'
  ) THEN
    ALTER TABLE competition_stage_logs ADD COLUMN wind_speed numeric(3,1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_logs' AND column_name = 'wind_direction'
  ) THEN
    ALTER TABLE competition_stage_logs ADD COLUMN wind_direction text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_logs' AND column_name = 'recommended_elevation_clicks'
  ) THEN
    ALTER TABLE competition_stage_logs ADD COLUMN recommended_elevation_clicks numeric(5,1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_logs' AND column_name = 'used_elevation_clicks'
  ) THEN
    ALTER TABLE competition_stage_logs ADD COLUMN used_elevation_clicks numeric(5,1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_logs' AND column_name = 'recommended_windage_clicks'
  ) THEN
    ALTER TABLE competition_stage_logs ADD COLUMN recommended_windage_clicks numeric(5,1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_logs' AND column_name = 'used_windage_clicks'
  ) THEN
    ALTER TABLE competition_stage_logs ADD COLUMN used_windage_clicks numeric(5,1);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_logs' AND column_name = 'ballistic_profile_id'
  ) THEN
    ALTER TABLE competition_stage_logs ADD COLUMN ballistic_profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_competition_stage_logs_ballistic_profile_id ON competition_stage_logs(ballistic_profile_id);
