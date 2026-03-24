/*
  # Seed Data for DFS Treningsapp
  
  1. Skytterklasser
    - Alle DFS-klasser fra Rekrutt til Veteran 73
  
  2. Disipliner
    - Bane, Felt, 15m, Stang, Felthurtig
  
  3. Feltklokke Presets
    - Standard tider for forskjellige disipliner og klasser
*/

-- SKYTTERKLASSER
INSERT INTO shooter_classes (code, name, category, sort_order, is_active) VALUES
  ('rekrutt', 'Rekrutt', 'ungdom', 1, true),
  ('eldre_rekrutt', 'Eldre rekrutt', 'ungdom', 2, true),
  ('junior', 'Junior', 'ungdom', 3, true),
  ('eldre_junior', 'Eldre junior', 'ungdom', 4, true),
  ('klasse_1', 'Klasse 1', 'senior', 5, true),
  ('klasse_2', 'Klasse 2', 'senior', 6, true),
  ('klasse_3', 'Klasse 3', 'senior', 7, true),
  ('klasse_4', 'Klasse 4', 'senior', 8, true),
  ('klasse_5', 'Klasse 5', 'senior', 9, true),
  ('veteran_55', 'Veteran 55', 'veteran', 10, true),
  ('veteran_65', 'Veteran 65', 'veteran', 11, true),
  ('veteran_73', 'Veteran 73', 'veteran', 12, true)
ON CONFLICT (code) DO NOTHING;

-- DISIPLINER
INSERT INTO disciplines (code, name, is_active) VALUES
  ('bane', 'Bane', true),
  ('felt', 'Felt', true),
  ('15m', '15m', true),
  ('stang', 'Stang', true),
  ('felthurtig', 'Felthurtig', true)
ON CONFLICT (code) DO NOTHING;

-- FELTKLOKKE PRESETS

-- Bane - standard tider
INSERT INTO field_clock_presets (name, discipline_code, class_code, prep_seconds, shoot_seconds, warning_seconds, cooldown_seconds, rule_reference, rule_version, is_active) VALUES
  ('Bane - 25 skudd liggende', 'bane', NULL, 15, 1500, 60, 30, 'DFS Banereglement', '2024', true),
  ('Bane - 25 skudd stående', 'bane', NULL, 15, 1800, 60, 30, 'DFS Banereglement', '2024', true),
  ('Bane - 15 skudd knestående', 'bane', NULL, 15, 900, 60, 30, 'DFS Banereglement', '2024', true)
ON CONFLICT DO NOTHING;

-- Felt - standard tider
INSERT INTO field_clock_presets (name, discipline_code, class_code, prep_seconds, shoot_seconds, warning_seconds, cooldown_seconds, rule_reference, rule_version, is_active) VALUES
  ('Felt - Serie A/B (5 skudd liggende)', 'felt', NULL, 15, 150, 30, 30, 'DFS Feltreglement', '2024', true),
  ('Felt - Serie C/D (5 skudd knestående)', 'felt', NULL, 15, 180, 30, 30, 'DFS Feltreglement', '2024', true),
  ('Felt - Serie E/F (5 skudd stående)', 'felt', NULL, 15, 210, 30, 30, 'DFS Feltreglement', '2024', true)
ON CONFLICT DO NOTHING;

-- Felthurtig
INSERT INTO field_clock_presets (name, discipline_code, class_code, prep_seconds, shoot_seconds, warning_seconds, cooldown_seconds, rule_reference, rule_version, is_active) VALUES
  ('Felthurtig - 5 skudd liggende', 'felthurtig', NULL, 15, 25, 5, 15, 'DFS Felthurtigreglement', '2024', true),
  ('Felthurtig - 5 skudd stående', 'felthurtig', NULL, 15, 35, 5, 15, 'DFS Felthurtigreglement', '2024', true)
ON CONFLICT DO NOTHING;

-- 15m
INSERT INTO field_clock_presets (name, discipline_code, class_code, prep_seconds, shoot_seconds, warning_seconds, cooldown_seconds, rule_reference, rule_version, is_active) VALUES
  ('15m - 20 skudd', '15m', NULL, 15, 1200, 60, 30, 'DFS 15m reglement', '2024', true)
ON CONFLICT DO NOTHING;

-- Stang
INSERT INTO field_clock_presets (name, discipline_code, class_code, prep_seconds, shoot_seconds, warning_seconds, cooldown_seconds, rule_reference, rule_version, is_active) VALUES
  ('Stang - Standard', 'stang', NULL, 15, 300, 30, 30, 'DFS Stangreglement', '2024', true)
ON CONFLICT DO NOTHING;