/*
  # Add order_index and distance_m to field_figures

  1. Changes
    - Add `order_index` column for proper ordering within categories
    - Add `distance_m` column for storing the distance for each figure
  
  2. Notes
    - These fields are needed for match system integration
    - order_index determines the sequence of figures in a course
    - distance_m is the shooting distance for the figure
*/

-- Add order_index column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'order_index'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN order_index integer DEFAULT 0;
  END IF;
END $$;

-- Add distance_m column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'distance_m'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN distance_m integer DEFAULT 100;
  END IF;
END $$;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_field_figures_category_order ON field_figures(category_id, order_index);
