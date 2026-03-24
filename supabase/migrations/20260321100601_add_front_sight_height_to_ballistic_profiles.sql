/*
  # Add front sight height (kornhøyde) to ballistic profiles

  1. Modified Tables
    - `ballistic_profiles`
      - `front_sight_height_mm` (numeric, nullable) - Height of front sight post in mm
        Used in DFS Busk sight geometry for click conversion.
        Typical values: 34mm for AG3, varies by weapon.

  2. Notes
    - This field is used together with `sight_radius_cm` (hullavstand) in the
      DFS Busk sight conversion model
    - The combination of hullavstand and kornhøyde determines the angular
      value of each click (knepp)
    - Default value of 34 matches standard AG3/HK416 front sight height
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ballistic_profiles' AND column_name = 'front_sight_height_mm'
  ) THEN
    ALTER TABLE ballistic_profiles ADD COLUMN front_sight_height_mm numeric DEFAULT 34;
  END IF;
END $$;
