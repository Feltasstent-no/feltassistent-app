/*
  # Oppdater forberedelsestid til 15 sekunder
  
  1. Endringer
    - Oppdater alle field_clock_presets med prep_seconds = 15
    - Oppdater alle competition_stages med prep_seconds = 15
  
  2. Begrunnelse
    - Standard forberedelsestid skal være 15 sekunder, ikke 30
    - Dette gjelder alle eksisterende presets og hold
*/

-- Oppdater feltklokke-presets
UPDATE field_clock_presets
SET prep_seconds = 15
WHERE prep_seconds = 30 OR prep_seconds = 60;

-- Oppdater competition stages
UPDATE competition_stages
SET prep_seconds = 15
WHERE prep_seconds = 30 OR prep_seconds = 60;