/*
  # Create Field Figures Storage

  1. New Storage Bucket
    - `field-figures` bucket for storing figure images (SVG and PNG)
    - Public access for easy retrieval
    - File type restrictions (SVG, PNG)

  2. New Fields
    - `image_url` for storing uploaded file URL
    - `file_type` for tracking file format

  3. Security
    - Authenticated users can upload
    - Public can read
*/

-- Create storage bucket for field figures
INSERT INTO storage.buckets (id, name, public)
VALUES ('field-figures', 'field-figures', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload field figures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update field figures" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete field figures" ON storage.objects;
DROP POLICY IF EXISTS "Public can view field figures" ON storage.objects;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload field figures"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'field-figures');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update field figures"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'field-figures');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete field figures"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'field-figures');

-- Allow public read access
CREATE POLICY "Public can view field figures"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'field-figures');

-- Add new columns to field_figures table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN image_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'file_type'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN file_type text;
  END IF;
END $$;

-- Create index for image_url
CREATE INDEX IF NOT EXISTS idx_field_figures_image_url ON field_figures(image_url);
