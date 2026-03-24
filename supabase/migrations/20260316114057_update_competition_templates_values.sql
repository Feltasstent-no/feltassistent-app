/*
  # Oppdater standardverdier i stevnemaler
  
  1. Endringer
    - Oppdaterer alle aktive maler med korrekte standardverdier
    - Justerer skytetider og klargjøringstider
    - Sikrer at verdiene er gode utgangspunkt for brukere
  
  2. Nye verdier
    - Grovfelt: 30 sek skytetid (redigerbar)
    - Finfelt: 120 sek skytetid (2 min per hold)
    - Stang: 25 sek per serie
    - Felthurtig: 25 sek skytetid
    - Treningsfelt: 30 sek skytetid
*/

-- Oppdater Grovfelt – standard
UPDATE competition_templates
SET 
  default_prep_time = 15,
  default_shoot_time = 30,
  description = 'Standard DFS grovfelt med 10 hold og ukjente avstander. Skytetid kan justeres etter klasse og stilling.'
WHERE name = 'Grovfelt – standard' AND is_active = true;

-- Oppdater Finfelt – standard
UPDATE competition_templates
SET 
  default_prep_time = 15,
  default_shoot_time = 120,
  description = 'Standard DFS finfelt med 10 hold og kjente avstander. Normalt 2 minutter skytetid per hold.'
WHERE name = 'Finfelt – standard' AND is_active = true;

-- Oppdater Stang – standard
UPDATE competition_templates
SET 
  default_prep_time = 15,
  default_shoot_time = 25,
  default_stages = 1,
  default_shots_per_stage = 60,
  description = 'Standard DFS stang med 60 skudd. Skytetid er per serie og kan justeres.'
WHERE name = 'Stang – standard' AND is_active = true;

-- Oppdater Felthurtig – standard
UPDATE competition_templates
SET 
  default_prep_time = 15,
  default_shoot_time = 25,
  description = 'Standard DFS felthurtig med 10 hold, kortere skytetid og ukjente avstander.'
WHERE name = 'Felthurtig – standard' AND is_active = true;

-- Oppdater Treningsfelt – 5 hold
UPDATE competition_templates
SET 
  default_prep_time = 15,
  default_shoot_time = 30,
  description = 'Kortere treningsløype med 5 hold. Skytetid kan justeres etter behov.'
WHERE name = 'Treningsfelt – 5 hold' AND is_active = true;

-- Oppdater Treningsfelt – 8 hold
UPDATE competition_templates
SET 
  default_prep_time = 15,
  default_shoot_time = 30,
  description = 'Mellomløype med 8 hold for variert trening. Skytetid kan justeres etter behov.'
WHERE name = 'Treningsfelt – 8 hold' AND is_active = true;

-- Oppdater Nasjonal grovfelthelg – 5 hold
UPDATE competition_templates
SET 
  default_prep_time = 15,
  default_shoot_time = 30,
  description = 'Nasjonal grovfelthelg med 5 hold (3 kjente + 2 ukjente avstander). Skytetid kan justeres.'
WHERE name = 'Nasjonal grovfelthelg – 5 hold' AND is_active = true;