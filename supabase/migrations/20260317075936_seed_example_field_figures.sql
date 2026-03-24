/*
  # Seed Example Field Figures

  1. Purpose
    - Provides example field figures for testing and development
    - Creates placeholder SVG figures
    - Ready for replacement with real SVG data

  2. Notes
    - This is an example seed that can be replaced with real figure data
    - SVG content is currently placeholder - replace with actual figure SVGs
    - All figures are set to active by default
*/

-- Insert example field figures (replace with real data later)
INSERT INTO field_figures (
  code,
  short_code,
  name,
  description,
  category_id,
  width_mm,
  height_mm,
  normal_distance_m,
  max_distance_m,
  ag3_hk416_max_distance_m,
  shape_type,
  svg_content,
  svg_data,
  notes,
  is_active,
  difficulty,
  order_index,
  distance_m
) VALUES
  (
    'B100',
    'B100',
    'Grovfelt stående, 100 cm bred',
    'Standard grovfelt stående figur',
    (SELECT id FROM field_figure_categories WHERE name = 'Grovfelt' LIMIT 1),
    1000,
    1800,
    525,
    600,
    400,
    'standing',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 180"><rect width="100" height="180" fill="black"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 180"><rect width="100" height="180" fill="black"/></svg>',
    'Placeholder SVG - erstatt med riktig figur',
    true,
    1,
    0,
    525
  ),
  (
    'C35',
    'C35',
    'Sirkel 35 cm diameter',
    'Sirkulær feltfigur',
    (SELECT id FROM field_figure_categories WHERE name = 'Finefelt' LIMIT 1),
    350,
    350,
    300,
    400,
    300,
    'circle',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="black"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="black"/></svg>',
    'Placeholder SVG - erstatt med riktig figur',
    true,
    2,
    1,
    300
  ),
  (
    'EXAMPLE_1',
    '1/4',
    'Kvartfigur',
    'En fjerdedels figur',
    NULL,
    550,
    1000,
    200,
    300,
    200,
    'custom',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 100"><path d="M0,0 L55,0 L55,100 L0,50 Z" fill="black"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 55 100"><path d="M0,0 L55,0 L55,100 L0,50 Z" fill="black"/></svg>',
    'Placeholder SVG - erstatt med riktig figur',
    true,
    3,
    2,
    200
  )
ON CONFLICT (code) DO NOTHING;
