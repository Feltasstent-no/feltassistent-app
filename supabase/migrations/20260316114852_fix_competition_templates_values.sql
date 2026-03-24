/*
  # Korrigere stevnemaler med nøyaktige verdier
  
  1. Endringer
    - Stang: Skytetid endret fra 25 til 30 sekunder
    - Felthurtig: Forbedret beskrivelse, fremstår som egen disiplin
    - Finfelt: Mer nøytral beskrivelse om kjente avstander
    - Alle: Konsistente beskrivelser som understreker at maler er startverdier
  
  2. Standardverdier
    - Alle maler: 15 sek klargjøringstid
    - Alle skytetider: Redigerbare startverdier
    - Beskrivelser: Tydeliggjør fleksibilitet
*/

-- Oppdater Stang – standard
UPDATE competition_templates
SET 
  default_shoot_time = 30,
  default_prep_time = 15,
  description = 'Standard DFS stang med 60 skudd. Skytetid 30 sekunder kan justeres etter behov.'
WHERE name = 'Stang – standard' AND is_active = true;

-- Oppdater Felthurtig – standard
UPDATE competition_templates
SET 
  default_prep_time = 15,
  description = 'Felthurtig bruker kort skytetid og kan justeres ved behov. Egen disiplin med rask gjennomføring.'
WHERE name = 'Felthurtig – standard' AND is_active = true;

-- Oppdater Finfelt – standard
UPDATE competition_templates
SET 
  default_prep_time = 15,
  description = 'Standard finfelt med 10 hold. Normalt brukes kjente avstander og 2 minutter skytetid, men alt kan tilpasses.'
WHERE name = 'Finfelt – standard' AND is_active = true;

-- Oppdater Grovfelt – standard (for konsistens)
UPDATE competition_templates
SET 
  default_prep_time = 15,
  description = 'Standard grovfelt med 10 hold og ukjente avstander. Skytetid 30 sekunder kan justeres etter klasse og stilling.'
WHERE name = 'Grovfelt – standard' AND is_active = true;

-- Oppdater Treningsfelt – 5 hold
UPDATE competition_templates
SET 
  default_prep_time = 15,
  description = 'Kortere treningsløype med 5 hold. Alle verdier kan tilpasses treningsbehov.'
WHERE name = 'Treningsfelt – 5 hold' AND is_active = true;

-- Oppdater Treningsfelt – 8 hold
UPDATE competition_templates
SET 
  default_prep_time = 15,
  description = 'Mellomløype med 8 hold for variert trening. Alle verdier kan tilpasses treningsbehov.'
WHERE name = 'Treningsfelt – 8 hold' AND is_active = true;

-- Oppdater Nasjonal grovfelthelg – 5 hold
UPDATE competition_templates
SET 
  default_prep_time = 15,
  description = 'Nasjonal grovfelthelg med 5 hold (typisk 3 kjente + 2 ukjente avstander). Alle verdier kan tilpasses.'
WHERE name = 'Nasjonal grovfelthelg – 5 hold' AND is_active = true;