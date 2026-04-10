/*
  # Add Mini 1/10 (grovfelt) field figure

  1. New Data
    - New row in `field_figures` table
    - Name: "Mini 1/10 (grovfelt)"
    - Code: "Mini-1/10-G"
    - Short code: "Mini 1/10 G"
    - Category: grovfelt
    - Dimensions: 22mm wide x 16mm tall (as specified)
    - SVG reused from existing finfelt "1/10" figure (id: 2134d15b-f48e-4580-8cc2-cb44dca0e332)
    - sort_order: 570 (after existing grovfelt figures)

  2. Important Notes
    - Does NOT modify or overwrite the existing finfelt "1/10" figure
    - Uses IF NOT EXISTS check on code to prevent duplicates on re-run
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM field_figures WHERE code = 'Mini-1/10-G'
  ) THEN
    INSERT INTO field_figures (
      code,
      name,
      description,
      svg_data,
      category,
      difficulty,
      is_active,
      width_mm,
      height_mm,
      distance_m,
      short_code,
      normal_distance_m,
      max_distance_m,
      ag3_hk416_max_distance_m,
      svg_content,
      shape_type,
      is_standard,
      sort_order
    )
    SELECT
      'Mini-1/10-G',
      'Mini 1/10 (grovfelt)',
      'Grovfelt-variant av 1/10 figur, 22x16 mm',
      svg_data,
      'grovfelt',
      3,
      true,
      22,
      16,
      distance_m,
      'Mini 1/10 G',
      normal_distance_m,
      max_distance_m,
      ag3_hk416_max_distance_m,
      svg_content,
      shape_type,
      true,
      570
    FROM field_figures
    WHERE id = '2134d15b-f48e-4580-8cc2-cb44dca0e332';
  END IF;
END $$;
