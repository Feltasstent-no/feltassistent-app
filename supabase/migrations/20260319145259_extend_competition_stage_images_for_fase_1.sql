/*
  # Extend Competition Stage Images for Fase 1
  
  1. Changes
    - Add `entry_id` column (nullable, FK to competition_entries)
    - Add `stage_number` column (nullable, for Fase 1 tracking)
    - Add `image_url` column (nullable, for easier access)
    - Make `stage_log_id` nullable (for backwards compatibility with Fase 2+)
    - Add constraint: either (stage_log_id) OR (entry_id + stage_number) must be set
    - Add unique constraint for (entry_id, stage_number) when used
    
  2. Migration Strategy
    - Fase 1 uses: entry_id + stage_number
    - Fase 2+ uses: stage_log_id
    - Both models supported in same table
    
  3. Security
    - Extend existing RLS policies to cover entry_id path
*/

-- Add new columns for Fase 1 support
DO $$
BEGIN
  -- Add entry_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'competition_stage_images' AND column_name = 'entry_id'
  ) THEN
    ALTER TABLE competition_stage_images 
    ADD COLUMN entry_id UUID REFERENCES competition_entries(id) ON DELETE CASCADE;
  END IF;

  -- Add stage_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'competition_stage_images' AND column_name = 'stage_number'
  ) THEN
    ALTER TABLE competition_stage_images 
    ADD COLUMN stage_number INTEGER;
  END IF;

  -- Add image_url column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'competition_stage_images' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE competition_stage_images 
    ADD COLUMN image_url TEXT;
  END IF;
END $$;

-- Make stage_log_id nullable for Fase 1 compatibility
ALTER TABLE competition_stage_images ALTER COLUMN stage_log_id DROP NOT NULL;

-- Add check constraint: must have either stage_log_id OR (entry_id + stage_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_image_reference'
  ) THEN
    ALTER TABLE competition_stage_images 
    ADD CONSTRAINT check_image_reference CHECK (
      (stage_log_id IS NOT NULL) OR 
      (entry_id IS NOT NULL AND stage_number IS NOT NULL)
    );
  END IF;
END $$;

-- Add unique constraint for Fase 1 path (entry_id, stage_number)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_entry_stage_image'
  ) THEN
    CREATE UNIQUE INDEX unique_entry_stage_image 
    ON competition_stage_images(entry_id, stage_number) 
    WHERE entry_id IS NOT NULL AND stage_number IS NOT NULL;
  END IF;
END $$;

-- Update RLS policies to support both paths
DROP POLICY IF EXISTS "Brukere kan lese egne hold-bilder" ON competition_stage_images;
DROP POLICY IF EXISTS "Brukere kan sette inn egne hold-bilder" ON competition_stage_images;

-- New SELECT policy supporting both paths
CREATE POLICY "Users can view own stage images"
  ON competition_stage_images FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = user_id) OR
    (entry_id IN (
      SELECT id FROM competition_entries WHERE user_id = auth.uid()
    ))
  );

-- New INSERT policy supporting both paths
CREATE POLICY "Users can insert own stage images"
  ON competition_stage_images FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.uid() = user_id) OR
    (entry_id IN (
      SELECT id FROM competition_entries WHERE user_id = auth.uid()
    ))
  );

-- New UPDATE policy supporting both paths
CREATE POLICY "Users can update own stage images"
  ON competition_stage_images FOR UPDATE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR
    (entry_id IN (
      SELECT id FROM competition_entries WHERE user_id = auth.uid()
    ))
  )
  WITH CHECK (
    (auth.uid() = user_id) OR
    (entry_id IN (
      SELECT id FROM competition_entries WHERE user_id = auth.uid()
    ))
  );

-- New DELETE policy supporting both paths
CREATE POLICY "Users can delete own stage images"
  ON competition_stage_images FOR DELETE
  TO authenticated
  USING (
    (auth.uid() = user_id) OR
    (entry_id IN (
      SELECT id FROM competition_entries WHERE user_id = auth.uid()
    ))
  );

-- Create index for faster lookups on Fase 1 path
CREATE INDEX IF NOT EXISTS idx_stage_images_entry_id ON competition_stage_images(entry_id);
CREATE INDEX IF NOT EXISTS idx_stage_images_entry_stage ON competition_stage_images(entry_id, stage_number);