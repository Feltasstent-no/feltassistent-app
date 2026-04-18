/*
  # Omskyting-støtte på match_holds

  1. Nye kolonner
    - `reshoot_of_hold_id` (uuid, nullable)
      - peker til originalt hold dersom raden er en omskyting
      - null for vanlige hold
    - `counts_for_score` (boolean, default true)
      - angir om dette forsøket er det tellende resultatet
      - ved omskyting skal ett forsøk (originalt eller omskyting) ha true

  2. Indeks
    - indeks på `reshoot_of_hold_id` for rask oppslag

  3. Sikkerhet
    - ingen endringer i RLS. Eksisterende policyer på `match_holds` dekker nye kolonner.

  4. Viktige notater
    1. Begge kolonner er bakoverkompatible; eksisterende rader får default og uendret oppførsel.
    2. Ingen data migreres eller slettes.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_holds' AND column_name = 'reshoot_of_hold_id'
  ) THEN
    ALTER TABLE match_holds
      ADD COLUMN reshoot_of_hold_id uuid REFERENCES match_holds(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_holds' AND column_name = 'counts_for_score'
  ) THEN
    ALTER TABLE match_holds
      ADD COLUMN counts_for_score boolean NOT NULL DEFAULT true;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_match_holds_reshoot_of_hold_id
  ON match_holds(reshoot_of_hold_id);
