/*
  # Link existing field figures to categories

  1. Changes
    - Update all existing field figures to link to DFS Standard category
    - This ensures templates can find figures to use

  2. Notes
    - All existing figures are competition-ready so they go to DFS Standard
*/

-- Link all existing field figures to DFS Standard category
UPDATE field_figures
SET category_id = (
  SELECT id FROM field_figure_categories WHERE name = 'DFS Standard' LIMIT 1
)
WHERE category_id IS NULL;