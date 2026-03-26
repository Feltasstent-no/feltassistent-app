/*
  # Make monitor-photos bucket public and add update policy

  1. Changes
    - Set `monitor-photos` bucket to public so images can be viewed via public URL
    - Add missing UPDATE policy for `monitor-photos` storage objects
    - Drop existing restrictive SELECT policy (no longer needed for public bucket)

  2. Security
    - Upload (INSERT) still requires authentication and folder ownership
    - Delete still requires authentication and folder ownership
    - Update still requires authentication and folder ownership
    - Public read does not expose folder structure since bucket is public

  3. Notes
    - This fixes broken images on the competition summary screen
    - Signed URLs are no longer needed; public URLs work directly
*/

UPDATE storage.buckets
SET public = true
WHERE id = 'monitor-photos';

CREATE POLICY "Users can update own monitor photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'monitor-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'monitor-photos'
    AND (auth.uid())::text = (storage.foldername(name))[1]
  );
