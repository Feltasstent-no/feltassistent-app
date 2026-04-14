/*
  # Make target-images bucket public

  1. Changes
    - Set `target-images` bucket to public so training session images can be viewed via public URL
    - This matches the same pattern used for the `monitor-photos` bucket

  2. Security
    - Upload (INSERT) still requires authentication and folder ownership
    - Delete still requires authentication and folder ownership  
    - Update still requires authentication and folder ownership
    - Public read is safe since image paths contain user IDs

  3. Notes
    - Fixes broken training session images that were invisible due to private bucket + getPublicUrl() mismatch
    - Existing stored image paths remain compatible (no data changes needed)
*/

UPDATE storage.buckets
SET public = true
WHERE id = 'target-images';
