/*
  # Remove restrictive file limits on target-images bucket

  1. Changes
    - Remove file_size_limit (was 5MB, too small for phone camera photos)
    - Remove allowed_mime_types restriction (was blocking HEIC and other formats)
    - This matches the monitor-photos bucket which has no restrictions

  2. Notes
    - Phone cameras can produce files >5MB in HEIC, JPEG, or PNG
    - The client-side code converts to JPEG before upload where needed
    - Keeping the bucket unrestricted prevents silent upload failures
*/

UPDATE storage.buckets
SET file_size_limit = NULL,
    allowed_mime_types = NULL
WHERE id = 'target-images';
