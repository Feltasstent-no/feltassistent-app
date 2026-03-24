/*
  # Legg til avstand og knepp til stevnehold

  1. Endringer
    - Legger til `distance_m` (avstand i meter) til `competition_stages` tabellen
    - Legger til `clicks` (antall knepp) til `competition_stages` tabellen
    
  2. Beskrivelse
    - `distance_m` lagrer avstanden til målet i meter for hvert hold
    - `clicks` lagrer antall knepp skytteren skal stille for dette holdet
    - Begge felt er valgfrie (nullable) siden de ikke alltid er kjente på forhånd
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stages' AND column_name = 'distance_m'
  ) THEN
    ALTER TABLE competition_stages ADD COLUMN distance_m int;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stages' AND column_name = 'clicks'
  ) THEN
    ALTER TABLE competition_stages ADD COLUMN clicks int;
  END IF;
END $$;