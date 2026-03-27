/*
  # Add 13 missing field figures to complete the full DFS standard set

  This migration adds the 13 field figures that were uploaded as source assets
  but never represented as active rows in the field_figures table.

  ## Background
  - 44 figure assets were originally uploaded
  - Only 31 were seeded as active field_figures rows
  - This migration restores the missing 13 to bring the total to 44

  ## New Grovfelt Figures (10)
  - `1/9`: En niendedels figur (B/H: 19/11 cm, Normal: 185m, Maks: 230m)
  - `D-figur`: D-figur (B/H: 18/18 cm, Normal: 185m, Maks: 230m)
  - `P-figur`: P-figur (B/H: 16/21 cm, Normal: 185m, Maks: 230m)
  - `C24`: Sirkel 24cm diameter (B/H: 24/24 cm, Normal: 200m, Maks: 250m)
  - `Skyteskår`: Skyteskår 10x15 (B/H: 10/15 cm, Normal: 110m, Maks: 135m)
  - `Lesjaskiva`: Lesjaskiva innskyting (B/H: 30/30 cm, Normal: 100m, Maks: 200m)
  - `L1`: Svensk feltfigur L1 (B/H: 45/100 cm, Normal: 350m, Maks: 425m)
  - `L2`: Svensk feltfigur L2 (B/H: 50/65 cm, Normal: 300m, Maks: 400m)
  - `L3`: Svensk feltfigur L3 (B/H: 35/45 cm, Normal: 250m, Maks: 350m)
  - `Stripe-10/30`: Stripe 10x30 vertikal variant (B/H: 10/30 cm, Normal: 145m, Maks: 180m)

  ## New Finfelt Figures (3)
  - `Dråpe`: Dråpe (B/H: 11/14.5 cm, Normal: 100m, Maks: 130m)
  - `Mini-1/9`: Mini 1/9 (B/H: 19/11 cm, Normal: 100m, Maks: 130m)
  - `Mini-P`: Mini P (B/H: 16/8.5 cm, Normal: 100m, Maks: 130m)

  ## Security
  - No RLS changes
  - No table structure changes
  - Uses INSERT ... ON CONFLICT to prevent duplicates
*/

-- ==========================================================
-- GROVFELT FIGURES (10 new)
-- ==========================================================

-- 1/9 figur - en niendedels figur
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  '1/9', '1/9', 'En niendedels figur', 'DFS godkjent grovfeltfigur 1/9', 'grovfelt', 'rectangle', true, true, 450, 0, 185, 185, 230, 130, 190, 110,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 110"><rect x="0" y="0" width="190" height="110" rx="4" fill="black"/><rect x="20" y="20" width="150" height="70" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 110"><rect x="0" y="0" width="190" height="110" rx="4" fill="black"/><rect x="20" y="20" width="150" height="70" rx="2" fill="none" stroke="white" stroke-width="2"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- D-figur
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'D-figur', 'D', 'D-figur', 'DFS godkjent grovfeltfigur D-figur', 'grovfelt', 'custom', true, true, 460, 0, 185, 185, 230, 130, 180, 180,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><path d="M90 0 C140 0 180 40 180 90 C180 140 140 180 90 180 L0 180 L0 0 Z" fill="black"/><path d="M90 20 C128 20 160 52 160 90 C160 128 128 160 90 160 L20 160 L20 20 Z" fill="none" stroke="white" stroke-width="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180"><path d="M90 0 C140 0 180 40 180 90 C180 140 140 180 90 180 L0 180 L0 0 Z" fill="black"/><path d="M90 20 C128 20 160 52 160 90 C160 128 128 160 90 160 L20 160 L20 20 Z" fill="none" stroke="white" stroke-width="2"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- P-figur
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'P-figur', 'P', 'P-figur', 'DFS godkjent grovfeltfigur P-figur', 'grovfelt', 'custom', true, true, 470, 0, 185, 185, 230, 130, 160, 210,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 210"><rect x="0" y="0" width="160" height="210" rx="4" fill="black"/><path d="M20 20 L140 20 C140 20 140 100 80 100 L20 100 Z" fill="none" stroke="white" stroke-width="2"/><rect x="20" y="100" width="40" height="90" fill="none" stroke="white" stroke-width="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 210"><rect x="0" y="0" width="160" height="210" rx="4" fill="black"/><path d="M20 20 L140 20 C140 20 140 100 80 100 L20 100 Z" fill="none" stroke="white" stroke-width="2"/><rect x="20" y="100" width="40" height="90" fill="none" stroke="white" stroke-width="2"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Sirkel 24 (C24)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'C24', 'C24', 'Sirkel 24cm', 'DFS godkjent grovfeltfigur Sirkel 24cm diameter', 'grovfelt', 'circle', true, true, 215, 0, 200, 200, 250, 140, 240, 240,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><circle cx="120" cy="120" r="118" fill="black" stroke="white" stroke-width="2"/><circle cx="120" cy="120" r="80" fill="none" stroke="white" stroke-width="2"/><circle cx="120" cy="120" r="40" fill="none" stroke="white" stroke-width="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><circle cx="120" cy="120" r="118" fill="black" stroke="white" stroke-width="2"/><circle cx="120" cy="120" r="80" fill="none" stroke="white" stroke-width="2"/><circle cx="120" cy="120" r="40" fill="none" stroke="white" stroke-width="2"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Skyteskår
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'Skyteskår', 'Skår', 'Skyteskår', 'DFS godkjent grovfeltfigur Skyteskår 10x15cm', 'grovfelt', 'rectangle', true, true, 340, 0, 110, 110, 135, 85, 100, 150,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect x="0" y="0" width="100" height="150" fill="black"/><rect x="15" y="15" width="70" height="120" fill="none" stroke="white" stroke-width="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect x="0" y="0" width="100" height="150" fill="black"/><rect x="15" y="15" width="70" height="120" fill="none" stroke="white" stroke-width="2"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Lesjaskiva (innskytingsskive)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'Lesjaskiva', 'Lesja', 'Lesjaskiva innskyting', 'Innskytingsskive for grovfelt', 'grovfelt', 'circle', true, true, 530, 0, 100, 100, 200, 100, 300, 300,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect x="0" y="0" width="300" height="300" fill="white"/><circle cx="150" cy="150" r="140" fill="black"/><circle cx="150" cy="150" r="100" fill="none" stroke="white" stroke-width="2"/><circle cx="150" cy="150" r="60" fill="none" stroke="white" stroke-width="2"/><circle cx="150" cy="150" r="20" fill="white"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><rect x="0" y="0" width="300" height="300" fill="white"/><circle cx="150" cy="150" r="140" fill="black"/><circle cx="150" cy="150" r="100" fill="none" stroke="white" stroke-width="2"/><circle cx="150" cy="150" r="60" fill="none" stroke="white" stroke-width="2"/><circle cx="150" cy="150" r="20" fill="white"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- L1 Svensk feltfigur (largest)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'L1', 'L1', 'Svensk feltfigur L1', 'Svensk feltfigur L1 (stor)', 'grovfelt', 'standing', true, true, 540, 0, 100, 350, 425, 250, 450, 1000,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 1000"><rect x="0" y="0" width="450" height="1000" rx="6" fill="black"/><rect x="75" y="150" width="300" height="700" rx="4" fill="none" stroke="white" stroke-width="3"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 1000"><rect x="0" y="0" width="450" height="1000" rx="6" fill="black"/><rect x="75" y="150" width="300" height="700" rx="4" fill="none" stroke="white" stroke-width="3"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- L2 Svensk feltfigur (medium)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'L2', 'L2', 'Svensk feltfigur L2', 'Svensk feltfigur L2 (mellom)', 'grovfelt', 'standing', true, true, 550, 0, 100, 300, 400, 200, 500, 650,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650"><rect x="0" y="0" width="500" height="650" rx="6" fill="black"/><rect x="75" y="100" width="350" height="450" rx="4" fill="none" stroke="white" stroke-width="3"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 650"><rect x="0" y="0" width="500" height="650" rx="6" fill="black"/><rect x="75" y="100" width="350" height="450" rx="4" fill="none" stroke="white" stroke-width="3"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- L3 Svensk feltfigur (small)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'L3', 'L3', 'Svensk feltfigur L3', 'Svensk feltfigur L3 (liten)', 'grovfelt', 'standing', true, true, 560, 0, 100, 250, 350, 175, 350, 450,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 450"><rect x="0" y="0" width="350" height="450" rx="6" fill="black"/><rect x="50" y="75" width="250" height="300" rx="4" fill="none" stroke="white" stroke-width="3"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 450"><rect x="0" y="0" width="350" height="450" rx="6" fill="black"/><rect x="50" y="75" width="250" height="300" rx="4" fill="none" stroke="white" stroke-width="3"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Stripe 10/30 (vertical variant of Stripe 30/10)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'Stripe-10/30', '10/30', 'Stripe 10x30', 'Stripe 10cm bred x 30cm høy (vertikal variant)', 'grovfelt', 'stripe', true, true, 305, 0, 100, 145, 180, 90, 100, 300,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 300"><rect x="0" y="0" width="100" height="300" fill="black"/><rect x="15" y="15" width="70" height="270" fill="none" stroke="white" stroke-width="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 300"><rect x="0" y="0" width="100" height="300" fill="black"/><rect x="15" y="15" width="70" height="270" fill="none" stroke="white" stroke-width="2"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- ==========================================================
-- FINFELT FIGURES (3 new)
-- ==========================================================

-- Dråpe (teardrop shape)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'Dråpe', 'Dråpe', 'Dråpe', 'DFS godkjent finfeltfigur Dråpe', 'finfelt', 'custom', true, true, 1135, 0, 100, 100, 130, 85, 110, 145,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 145"><path d="M55 0 C55 0 110 60 110 90 C110 120 85 145 55 145 C25 145 0 120 0 90 C0 60 55 0 55 0 Z" fill="black"/><path d="M55 20 C55 20 95 68 95 90 C95 112 77 130 55 130 C33 130 15 112 15 90 C15 68 55 20 55 20 Z" fill="none" stroke="white" stroke-width="2"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 145"><path d="M55 0 C55 0 110 60 110 90 C110 120 85 145 55 145 C25 145 0 120 0 90 C0 60 55 0 55 0 Z" fill="black"/><path d="M55 20 C55 20 95 68 95 90 C95 112 77 130 55 130 C33 130 15 112 15 90 C15 68 55 20 55 20 Z" fill="none" stroke="white" stroke-width="2"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Mini 1/9
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'Mini-1/9', 'Mini 1/9', 'Mini-niendedel', 'DFS godkjent finfeltfigur Mini 1/9', 'finfelt', 'rectangle', true, true, 1195, 0, 100, 100, 130, 85, 190, 110,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 110"><rect x="0" y="0" width="190" height="110" rx="3" fill="black"/><rect x="15" y="15" width="160" height="80" rx="2" fill="none" stroke="white" stroke-width="1.5"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 110"><rect x="0" y="0" width="190" height="110" rx="3" fill="black"/><rect x="15" y="15" width="160" height="80" rx="2" fill="none" stroke="white" stroke-width="1.5"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Mini P
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, is_active, is_standard, sort_order, order_index, distance_m, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, width_mm, height_mm, svg_data, svg_content)
VALUES (
  'Mini-P', 'Mini P', 'Mini-P', 'DFS godkjent finfeltfigur Mini P', 'finfelt', 'custom', true, true, 1200, 0, 100, 100, 130, 85, 160, 85,
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 85"><rect x="0" y="0" width="160" height="85" rx="3" fill="black"/><path d="M15 12 L100 12 C120 12 145 25 145 42.5 C145 60 120 73 100 73 L15 73 Z" fill="none" stroke="white" stroke-width="1.5"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 85"><rect x="0" y="0" width="160" height="85" rx="3" fill="black"/><path d="M15 12 L100 12 C120 12 145 25 145 42.5 C145 60 120 73 100 73 L15 73 Z" fill="none" stroke="white" stroke-width="1.5"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, is_active = EXCLUDED.is_active,
  is_standard = EXCLUDED.is_standard, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  distance_m = EXCLUDED.distance_m, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  width_mm = EXCLUDED.width_mm, height_mm = EXCLUDED.height_mm,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;