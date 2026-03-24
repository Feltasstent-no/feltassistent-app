/*
  # Opprett Storage Bucket for Skivebilder
  
  1. Ny Bucket
    - target-images: For å lagre bilder av skiver
  
  2. Sikkerhet
    - Brukere kan kun laste opp egne bilder
    - Brukere kan kun lese egne bilder
    - Bilder lagres i struktur: user_id/entry_id/filnavn
  
  3. Konfigurasjoner
    - Maksimal filstørrelse: 5MB
    - Tillatte filtyper: image/jpeg, image/png, image/webp
*/

-- Opprett bucket hvis den ikke eksisterer
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'target-images',
  'target-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: Brukere kan laste opp egne bilder
CREATE POLICY "Brukere kan laste opp egne bilder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'target-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Brukere kan lese egne bilder
CREATE POLICY "Brukere kan lese egne bilder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'target-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Brukere kan oppdatere egne bilder
CREATE POLICY "Brukere kan oppdatere egne bilder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'target-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Policy: Brukere kan slette egne bilder
CREATE POLICY "Brukere kan slette egne bilder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'target-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );