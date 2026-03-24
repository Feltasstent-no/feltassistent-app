/*
  # Add barrel lifespan profiles

  1. Changes to weapon_barrels table
    - Add `ammo_lifespan_profile` column for selecting profile type
    - Add `custom_lifespan_limit` column for custom max shots
    - Default to 'field_ammo' profile for existing barrels

  2. Profile types
    - field_ammo: 7500 rounds (default)
    - recruit_ammo: 12000 rounds
    - custom: user-defined limit

  3. Notes
    - These are guideline values, not absolute limits
    - Affects status display and color coding
    - Prepares for future ammunition tracking per shot log
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weapon_barrels' AND column_name = 'ammo_lifespan_profile'
  ) THEN
    ALTER TABLE weapon_barrels
    ADD COLUMN ammo_lifespan_profile text DEFAULT 'field_ammo'
    CHECK (ammo_lifespan_profile IN ('field_ammo', 'recruit_ammo', 'custom'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weapon_barrels' AND column_name = 'custom_lifespan_limit'
  ) THEN
    ALTER TABLE weapon_barrels
    ADD COLUMN custom_lifespan_limit integer;
  END IF;
END $$;

COMMENT ON COLUMN weapon_barrels.ammo_lifespan_profile IS 'Lifespan profile: field_ammo (7500), recruit_ammo (12000), or custom';
COMMENT ON COLUMN weapon_barrels.custom_lifespan_limit IS 'Custom max rounds when ammo_lifespan_profile is custom';