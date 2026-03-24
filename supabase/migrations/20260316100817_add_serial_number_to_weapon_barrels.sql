/*
  # Legg til serienummer-felt for løp
  
  1. Endringer
    - Legger til `serial_number` kolonne i `weapon_barrels` tabellen
    - Serienummeret er produsentens unike identifikator for løpet
    - Dette skiller seg fra `barrel_number` som er brukerens interne nummerering
  
  2. Notater
    - Feltet er valgfritt (nullable) siden ikke alle løp har registrert serienummer
    - Eksisterende data påvirkes ikke
*/

-- Legg til serienummer-kolonne til weapon_barrels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'weapon_barrels' AND column_name = 'serial_number'
  ) THEN
    ALTER TABLE weapon_barrels ADD COLUMN serial_number text;
  END IF;
END $$;