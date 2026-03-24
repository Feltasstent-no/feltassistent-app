/*
  # Legg til våpen skuddtelling kolonner til shot_logs

  1. Endringer
    - Legger til `weapon_id` kolonne til shot_logs tabellen
    - Legger til `barrel_id` kolonne til shot_logs tabellen
    - Legger til `shots_fired` kolonne til shot_logs tabellen
    - Legger til `shot_date` kolonne til shot_logs tabellen
    - Legger til foreign key constraints til weapons og weapon_barrels
    
  2. Formål
    - Tillater logging av skudd direkte på våpen og løp
    - Støtter skuddteller-funksjonen på QuickAssistant og Weapons sider
*/

-- Legg til weapon_id kolonne hvis den ikke eksisterer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shot_logs' AND column_name = 'weapon_id'
  ) THEN
    ALTER TABLE shot_logs ADD COLUMN weapon_id uuid REFERENCES weapons(id);
  END IF;
END $$;

-- Legg til barrel_id kolonne hvis den ikke eksisterer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shot_logs' AND column_name = 'barrel_id'
  ) THEN
    ALTER TABLE shot_logs ADD COLUMN barrel_id uuid REFERENCES weapon_barrels(id);
  END IF;
END $$;

-- Legg til shots_fired kolonne hvis den ikke eksisterer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shot_logs' AND column_name = 'shots_fired'
  ) THEN
    ALTER TABLE shot_logs ADD COLUMN shots_fired integer DEFAULT 1;
  END IF;
END $$;

-- Legg til shot_date kolonne hvis den ikke eksisterer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shot_logs' AND column_name = 'shot_date'
  ) THEN
    ALTER TABLE shot_logs ADD COLUMN shot_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;