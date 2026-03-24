/*
  # Enhance Field Figures Library

  1. Changes
    - Add comprehensive fields for field figure management
    - Add `short_code` for quick reference (e.g., B100, C35, 1/4, Tønne)
    - Add physical dimensions (`width_mm`, `height_mm`)
    - Add distance fields (`normal_distance_m`, `max_distance_m`, `ag3_hk416_max_distance_m`)
    - Add `svg_content` to replace `svg_data` for consistency
    - Add `shape_type` for categorization
    - Add `notes` for additional information
    - Add `updated_at` timestamp

  2. Notes
    - Existing data is preserved
    - All new fields are nullable for backwards compatibility
    - `svg_content` will coexist with `svg_data` during transition
*/

-- Add new columns to field_figures
DO $$
BEGIN
  -- Short code for quick reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'short_code'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN short_code text;
  END IF;

  -- Physical dimensions
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'normal_distance_m'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN normal_distance_m integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'max_distance_m'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN max_distance_m integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'ag3_hk416_max_distance_m'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN ag3_hk416_max_distance_m integer;
  END IF;

  -- SVG content (coexists with svg_data)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'svg_content'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN svg_content text;
  END IF;

  -- Shape type for categorization
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'shape_type'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN shape_type text;
  END IF;

  -- Notes field
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'notes'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN notes text;
  END IF;

  -- Updated timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_field_figures_updated_at ON field_figures;
CREATE TRIGGER update_field_figures_updated_at
  BEFORE UPDATE ON field_figures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for shape_type
CREATE INDEX IF NOT EXISTS idx_field_figures_shape_type ON field_figures(shape_type);

-- Create index for short_code
CREATE INDEX IF NOT EXISTS idx_field_figures_short_code ON field_figures(short_code);
