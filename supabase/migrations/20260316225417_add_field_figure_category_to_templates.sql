/*
  # Add field_figure_category_id to competition_templates

  1. Changes
    - Add field_figure_category_id column to competition_templates
    - Set default category for existing templates
    - Add foreign key constraint

  2. Notes
    - Sets "DFS Standard" category as default for existing templates
*/

-- Add the column
ALTER TABLE competition_templates 
ADD COLUMN IF NOT EXISTS field_figure_category_id uuid REFERENCES field_figure_categories(id);

-- Set default category (DFS Standard) for all existing templates
UPDATE competition_templates
SET field_figure_category_id = (
  SELECT id FROM field_figure_categories WHERE name = 'DFS Standard' LIMIT 1
)
WHERE field_figure_category_id IS NULL;