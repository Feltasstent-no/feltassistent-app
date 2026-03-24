/*
  # Seed ammo_profiles with predefined ammunition

  1. Data
    Seeds the ammo_profiles table with 9 commonly used precision rifle ammunition types:
    - 4x Lapua Scenar in various weights (6.5mm)
    - 1x Norma Diamond Line (6.5mm)
    - 3x Sierra MatchKing (6.5mm and 7.62mm)

  2. Details
    Each profile includes:
    - Manufacturer name
    - Product name with caliber and bullet weight
    - Ballistic coefficient (G1)
    - Default muzzle velocity in m/s
    - All profiles are active by default

  3. Purpose
    These profiles provide users with quick-start ballistic data for common
    precision ammunition, similar to DFS Kulebanegenerator's ammunition database.
*/

INSERT INTO ammo_profiles (manufacturer, name, caliber, bullet_weight_gr, ballistic_coefficient_g1, default_muzzle_velocity, is_active)
VALUES
  (
    'Norma',
    'Diamond Line 6.5 - 130 gr',
    '6.5',
    130,
    0.548,
    900,
    true
  ),
  (
    'Lapua',
    'Scenar 6.5 - 123 gr',
    '6.5',
    123,
    0.527,
    880,
    true
  ),
  (
    'Lapua',
    'Scenar 6.5 - 108 gr',
    '6.5',
    108,
    0.465,
    920,
    true
  ),
  (
    'Lapua',
    'Scenar 6.5 - 139 gr',
    '6.5',
    139,
    0.578,
    800,
    true
  ),
  (
    'Sierra',
    'MatchKing 6.5 - 123 gr',
    '6.5',
    123,
    0.510,
    880,
    true
  ),
  (
    'Sierra',
    'MatchKing 6.5 - 140 gr',
    '6.5',
    140,
    0.535,
    800,
    true
  ),
  (
    'Sierra',
    'MatchKing 6.5 - 107 gr',
    '6.5',
    107,
    0.430,
    930,
    true
  ),
  (
    'Sierra',
    'MatchKing 7.62 - 150 gr',
    '7.62',
    150,
    0.415,
    820,
    true
  ),
  (
    'Sierra',
    'MatchKing 7.62 - 168 gr',
    '7.62',
    168,
    0.462,
    800,
    true
  )
ON CONFLICT DO NOTHING;