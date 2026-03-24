/*
  # Oppdater ballistiske profiler med nye felt

  1. Endringer
    - Legger til `ammo_profile_id` for å koble til ammunisjonsprofil
    - Legger til `min_distance_m` for minimumsavstand
    - Legger til `max_distance_m` for maksimumsavstand
    - Legger til `distance_interval_m` for intervall mellom avstander
    - Legger til `zero_distance_m` for nullpunkt (hvor knepp = 0)
    
  2. Beskrivelse
    - Disse feltene gjør at knepptabellen kan genereres sentrert rundt nullpunktet
    - Støtter både negative knepp (kortere enn zero) og positive (lengre enn zero)
    - Gir brukeren full kontroll over tabellens omfang
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ballistic_profiles' AND column_name = 'ammo_profile_id'
  ) THEN
    ALTER TABLE ballistic_profiles ADD COLUMN ammo_profile_id uuid REFERENCES ammo_profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ballistic_profiles' AND column_name = 'min_distance_m'
  ) THEN
    ALTER TABLE ballistic_profiles ADD COLUMN min_distance_m int DEFAULT 100;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ballistic_profiles' AND column_name = 'max_distance_m'
  ) THEN
    ALTER TABLE ballistic_profiles ADD COLUMN max_distance_m int DEFAULT 600;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ballistic_profiles' AND column_name = 'distance_interval_m'
  ) THEN
    ALTER TABLE ballistic_profiles ADD COLUMN distance_interval_m int DEFAULT 25;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ballistic_profiles' AND column_name = 'zero_distance_m'
  ) THEN
    ALTER TABLE ballistic_profiles ADD COLUMN zero_distance_m int DEFAULT 300;
  END IF;
END $$;