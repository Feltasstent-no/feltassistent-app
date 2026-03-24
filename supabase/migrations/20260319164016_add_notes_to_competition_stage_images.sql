/*
  # Legg til notater på hold-bilder

  1. Endringer
    - Legg til `notes` kolonne i `competition_stage_images`
      - Type: text
      - Nullable: true (valgfritt notat)
      - For å lagre brukerens tekstnotat per hold
  
  2. Notater
    - Notater er valgfrie, akkurat som bilder
    - Lagres sammen med bilde-data per hold
    - Brukes som grunnlag for senere AI-analyse
*/

-- Legg til notes-kolonne
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_stage_images' AND column_name = 'notes'
  ) THEN
    ALTER TABLE competition_stage_images
    ADD COLUMN notes text DEFAULT NULL;
  END IF;
END $$;
