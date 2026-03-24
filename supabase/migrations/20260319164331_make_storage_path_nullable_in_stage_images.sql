/*
  # Gjør storage_path nullable i competition_stage_images

  1. Endringer
    - Endre `storage_path` fra NOT NULL til NULL
    - Dette tillater lagring av kun notater uten bilde
  
  2. Notater
    - Nødvendig for Fase 3B der notater kan lagres uavhengig av bilde
    - Eksisterende data påvirkes ikke
*/

-- Gjør storage_path nullable
ALTER TABLE competition_stage_images
ALTER COLUMN storage_path DROP NOT NULL;
