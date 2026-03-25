/*
  # Clear stale image_url values for active field figures

  1. Changes
    - Sets `image_url` to NULL for all active field figures that already have
      correct inline SVG data in `svg_data` or `svg_content`
    - The storage URLs point to old March 20 SVG files that are outdated
    - The correct SVG data was seeded via migrations on March 24

  2. Safety
    - Only affects `image_url` column (no structural changes)
    - Does NOT delete any rows
    - Does NOT modify `svg_data` or `svg_content`
    - Only targets rows where inline SVG already exists as a replacement
*/

UPDATE field_figures
SET image_url = NULL
WHERE is_active = true
  AND (svg_data IS NOT NULL AND svg_data != '')
  AND image_url IS NOT NULL;
