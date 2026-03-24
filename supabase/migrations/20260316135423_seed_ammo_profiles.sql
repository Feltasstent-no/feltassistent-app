/*
  # Seed ammunisjonsprofiler

  1. Data
    Legger til vanlige matchkuler brukt i DFS:
    - Norma Diamond Line 6.5mm 130gr
    - Lapua Scenar 6.5mm 123gr
    - Sierra MatchKing 6.5mm 123gr
    - Lapua Scenar .308 155gr
    - Sierra MatchKing .308 168gr
    
  2. Notater
    - BC (Ballistic Coefficient) G1 verdier er standardiserte
    - V0 (muzzle velocity) er typiske verdier for matchrifler
*/

INSERT INTO ammo_profiles (name, caliber, bullet_weight_gr, ballistic_coefficient_g1, default_muzzle_velocity, manufacturer, is_active)
VALUES
  ('Diamond Line Match 130gr', '6.5mm', 130, 0.548, 900, 'Norma', true),
  ('Scenar 123gr', '6.5mm', 123, 0.527, 870, 'Lapua', true),
  ('MatchKing 123gr', '6.5mm', 123, 0.510, 850, 'Sierra', true),
  ('Scenar 139gr', '6.5mm', 139, 0.615, 820, 'Lapua', true),
  ('Scenar 155gr', '.308', 155, 0.508, 830, 'Lapua', true),
  ('MatchKing 168gr', '.308', 168, 0.462, 800, 'Sierra', true),
  ('MatchKing 175gr', '.308', 175, 0.505, 780, 'Sierra', true)
ON CONFLICT DO NOTHING;