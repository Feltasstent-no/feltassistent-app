/*
  # Add shooter_class_id to profiles and create avatars storage bucket

  1. Modified Tables
    - `profiles`
      - Added `shooter_class_id` (uuid, nullable, FK to shooter_classes)
      - This ensures profile and match setup use the same shooter class reference

  2. Storage
    - Create `avatars` public bucket for profile pictures
    - Add RLS policies for authenticated users to manage their own avatars

  3. Security
    - FK constraint links profiles.shooter_class_id to shooter_classes.id
    - Storage policies restrict uploads to user's own folder
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'shooter_class_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN shooter_class_id uuid REFERENCES shooter_classes(id);
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Anyone can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');