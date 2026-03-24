/*
  # Legg til setup-flyt for stevner

  1. Endringer i match_sessions
    - Legger til 'setup' status
    - Legger til shooter_class_id kolonne
    - Oppdaterer status constraint

  2. Endringer i match_holds
    - Legger til shooting_time_seconds kolonne
    - Gjør field_figure_id nullable (fylles ut i setup)
    - Gjør distance_m nullable (fylles ut i setup)
    - Gjør recommended_clicks nullable (beregnes etter setup)

  3. Sikkerhet
    - Ingen endringer i RLS policies
    - Eksisterende policies dekker nye kolonner

  4. Produktflyt
    - MatchSetup: opprett session med status='setup' og tomme holds
    - MatchConfigure: skytter fyller ut figur/avstand/klasse per hold
    - MatchActive: starter kun når status='in_progress' og alle holds er komplette
*/

-- Legg til shooter_class_id i match_sessions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'shooter_class_id'
  ) THEN
    ALTER TABLE match_sessions
    ADD COLUMN shooter_class_id uuid REFERENCES shooter_classes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Oppdater status constraint i match_sessions
ALTER TABLE match_sessions
DROP CONSTRAINT IF EXISTS valid_status;

ALTER TABLE match_sessions
ADD CONSTRAINT valid_status
CHECK (status IN ('setup', 'in_progress', 'completed', 'paused'));

-- Legg til shooting_time_seconds i match_holds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_holds' AND column_name = 'shooting_time_seconds'
  ) THEN
    ALTER TABLE match_holds
    ADD COLUMN shooting_time_seconds integer DEFAULT 30 NOT NULL;
  END IF;
END $$;

-- Gjør field_figure_id nullable (fylles ut under setup)
ALTER TABLE match_holds
ALTER COLUMN field_figure_id DROP NOT NULL;

-- Gjør distance_m nullable (fylles ut under setup)
ALTER TABLE match_holds
ALTER COLUMN distance_m DROP NOT NULL;

-- Gjør recommended_clicks nullable (beregnes etter setup)
ALTER TABLE match_holds
ALTER COLUMN recommended_clicks DROP NOT NULL;

-- Oppdater distance_m constraint til å tillate NULL
ALTER TABLE match_holds
DROP CONSTRAINT IF EXISTS valid_distance;

ALTER TABLE match_holds
ADD CONSTRAINT valid_distance
CHECK (distance_m IS NULL OR distance_m > 0);