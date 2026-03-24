/*
  # Oppdater stevnemal-struktur
  
  1. Endringer
    - Legger til `discipline` kolonne for å spesifisere disiplin
    - Legger til `distance_mode` kolonne (kjent/ukjent/blandet)
    - Legger til `sort_order` kolonne for sortering
    - Oppdaterer description for bedre forklaring
    - Setter opp foreign key til disciplines
  
  2. Nye kolonner
    - discipline_id (uuid, nullable) - kobling til disciplines tabell
    - distance_mode (text, nullable) - kjent/ukjent/blandet
    - sort_order (integer) - for sortering i UI
  
  3. Data migrering
    - Beholder eksisterende maler midlertidig
    - Senere vil vi legge til nye maler og fjerne gamle
*/

-- Legg til nye kolonner
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_templates' AND column_name = 'discipline_id'
  ) THEN
    ALTER TABLE competition_templates ADD COLUMN discipline_id uuid REFERENCES disciplines(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_templates' AND column_name = 'distance_mode'
  ) THEN
    ALTER TABLE competition_templates ADD COLUMN distance_mode text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_templates' AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE competition_templates ADD COLUMN sort_order integer DEFAULT 0;
  END IF;
END $$;

-- Legg til check constraint for distance_mode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'competition_templates_distance_mode_check'
  ) THEN
    ALTER TABLE competition_templates 
    ADD CONSTRAINT competition_templates_distance_mode_check 
    CHECK (distance_mode IN ('kjent', 'ukjent', 'blandet', NULL));
  END IF;
END $$;