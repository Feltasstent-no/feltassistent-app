/*
  # Seed nye stevnemaler
  
  1. Endringer
    - Deaktiverer gamle generiske maler
    - Legger til nye tydelige DFS-maler med:
      - Grovfelt – standard
      - Finfelt – standard  
      - Stang – standard
      - Felthurtig – standard
      - Treningsfelt – 5 hold
      - Treningsfelt – 8 hold
      - Nasjonal grovfelthelg – 5 hold
  
  2. Informasjon
    - Hver mal har tydelig navn, disiplin, og avstandstype
    - Sort order setter rekkefølgen i UI
    - Beskrivelser forklarer målets bruk
*/

-- Deaktiver eksisterende maler
UPDATE competition_templates SET is_active = false;

-- Hent discipline IDs
DO $$
DECLARE
  felt_id uuid;
  stang_id uuid;
  felthurtig_id uuid;
BEGIN
  SELECT id INTO felt_id FROM disciplines WHERE code = 'felt' LIMIT 1;
  SELECT id INTO stang_id FROM disciplines WHERE code = 'stang' LIMIT 1;
  SELECT id INTO felthurtig_id FROM disciplines WHERE code = 'felthurtig' LIMIT 1;

  -- Grovfelt – standard (10 hold, ukjente avstander)
  INSERT INTO competition_templates (
    name, competition_type, discipline_id, distance_mode,
    default_stages, default_shots_per_stage, 
    default_shoot_time, default_prep_time,
    description, sort_order, is_active
  ) VALUES (
    'Grovfelt – standard',
    'felt',
    felt_id,
    'ukjent',
    10, 1, 30, 15,
    'Standard DFS grovfelt med 10 hold og ukjente avstander',
    10, true
  );

  -- Finfelt – standard (10 hold, kjente avstander)
  INSERT INTO competition_templates (
    name, competition_type, discipline_id, distance_mode,
    default_stages, default_shots_per_stage,
    default_shoot_time, default_prep_time,
    description, sort_order, is_active
  ) VALUES (
    'Finfelt – standard',
    'felt',
    felt_id,
    'kjent',
    10, 1, 30, 15,
    'Standard DFS finfelt med 10 hold og kjente avstander',
    20, true
  );

  -- Stang – standard (60 skudd)
  INSERT INTO competition_templates (
    name, competition_type, discipline_id, distance_mode,
    default_stages, default_shots_per_stage,
    default_shoot_time, default_prep_time,
    description, sort_order, is_active
  ) VALUES (
    'Stang – standard',
    'bane',
    stang_id,
    'kjent',
    1, 60, 3600, 300,
    'Standard DFS stang med 60 skudd',
    30, true
  );

  -- Felthurtig – standard
  INSERT INTO competition_templates (
    name, competition_type, discipline_id, distance_mode,
    default_stages, default_shots_per_stage,
    default_shoot_time, default_prep_time,
    description, sort_order, is_active
  ) VALUES (
    'Felthurtig – standard',
    'felt',
    felthurtig_id,
    'ukjent',
    10, 1, 25, 10,
    'Standard DFS felthurtig med 10 hold og kortere skytetid',
    40, true
  );

  -- Treningsfelt – 5 hold
  INSERT INTO competition_templates (
    name, competition_type, discipline_id, distance_mode,
    default_stages, default_shots_per_stage,
    default_shoot_time, default_prep_time,
    description, sort_order, is_active
  ) VALUES (
    'Treningsfelt – 5 hold',
    'felt',
    felt_id,
    'ukjent',
    5, 1, 30, 15,
    'Kortere treningsløype med 5 hold for rask trening',
    50, true
  );

  -- Treningsfelt – 8 hold
  INSERT INTO competition_templates (
    name, competition_type, discipline_id, distance_mode,
    default_stages, default_shots_per_stage,
    default_shoot_time, default_prep_time,
    description, sort_order, is_active
  ) VALUES (
    'Treningsfelt – 8 hold',
    'felt',
    felt_id,
    'ukjent',
    8, 1, 30, 15,
    'Mellomløype med 8 hold for variert trening',
    60, true
  );

  -- Nasjonal grovfelthelg – 5 hold (3 kjente + 2 ukjente)
  INSERT INTO competition_templates (
    name, competition_type, discipline_id, distance_mode,
    default_stages, default_shots_per_stage,
    default_shoot_time, default_prep_time,
    description, sort_order, is_active
  ) VALUES (
    'Nasjonal grovfelthelg – 5 hold',
    'felt',
    felt_id,
    'blandet',
    5, 1, 30, 15,
    'Nasjonal grovfelthelg med 5 hold (3 kjente + 2 ukjente avstander)',
    70, true
  );
END $$;