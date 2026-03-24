/*
  # Add field figures management columns

  1. Changes to field_figures table
    - Add `shape_type` (text) - describes the visual type (person, circle, stripe, segment, barrel, etc)
    - Add `is_active` (boolean) - only active figures shown in picker
    - Add `is_standard` (boolean) - marks official DFS standard figures
    - Add `sort_order` (integer) - controls display order in picker
  
  2. Data integrity
    - Set all existing figures as active by default
    - Set standard DFS figures (B-series, C-series, Stripe-series) as is_standard = true
    - Add sensible sort order based on code/distance
  
  This establishes field_figures as the single source of truth for figure data.
  No runtime mapping needed - holds store field_figure_id directly.
*/

-- Add new columns to field_figures
ALTER TABLE field_figures
ADD COLUMN IF NOT EXISTS shape_type text,
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS is_standard boolean DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 1000 NOT NULL;

-- Create index for active figures filtering
CREATE INDEX IF NOT EXISTS idx_field_figures_active ON field_figures(is_active) WHERE is_active = true;

-- Create index for standard figures
CREATE INDEX IF NOT EXISTS idx_field_figures_standard ON field_figures(is_standard) WHERE is_standard = true;

-- Set shape_type based on existing SVG content
UPDATE field_figures
SET shape_type = CASE
  WHEN svg_data LIKE '%<ellipse%' AND svg_data LIKE '%<line%' THEN 'person'
  WHEN svg_data LIKE '%<rect%' AND svg_data NOT LIKE '%<ellipse%' AND code LIKE 'S-%' THEN 'stripe'
  WHEN svg_data LIKE '%<rect%' AND svg_data NOT LIKE '%<ellipse%' AND code LIKE 'Stripe-%' THEN 'stripe'
  WHEN svg_data LIKE '%<path%' AND svg_data LIKE '%A %' THEN 'segment'
  WHEN svg_data LIKE '%<ellipse%' AND code = 'Tønne' THEN 'barrel'
  WHEN svg_data LIKE '%<circle%' THEN 'circle'
  ELSE 'other'
END
WHERE shape_type IS NULL;

-- Mark all existing figures as active
UPDATE field_figures
SET is_active = true
WHERE category = 'grovfelt';

-- Mark standard DFS figures
UPDATE field_figures
SET is_standard = true
WHERE code IN (
  'B45', 'B65', 'B100',
  'C20', 'C25', 'C30', 'C35', 'C40', 'C50',
  'Stripe-30/10', 'Stripe-13/40',
  'S-25H', 'S-25V',
  '1/3', '1/4', '1/4V', '1/6', '1/8',
  'Tønne', 'Småen', 'Sirkel'
);

-- Set sort order for logical grouping
UPDATE field_figures
SET sort_order = CASE
  -- B-series (persons) sorted by size
  WHEN code = 'B45' THEN 100
  WHEN code = 'B65' THEN 110
  WHEN code = 'B100' THEN 120
  
  -- C-series (circles) sorted by distance
  WHEN code = 'C20' THEN 200
  WHEN code = 'C25' THEN 210
  WHEN code = 'C30' THEN 220
  WHEN code = 'C35' THEN 230
  WHEN code = 'C40' THEN 240
  WHEN code = 'C50' THEN 250
  
  -- Stripe series
  WHEN code = 'Stripe-30/10' THEN 300
  WHEN code = 'Stripe-13/40' THEN 310
  WHEN code = 'S-25H' THEN 320
  WHEN code = 'S-25V' THEN 330
  
  -- Segments
  WHEN code = '1/8' THEN 400
  WHEN code = '1/6' THEN 410
  WHEN code = '1/4' THEN 420
  WHEN code = '1/4V' THEN 430
  WHEN code = '1/3' THEN 440
  
  -- Special figures
  WHEN code = 'Småen' THEN 500
  WHEN code = 'Sirkel' THEN 510
  WHEN code = 'Tønne' THEN 520
  
  ELSE 1000
END
WHERE category = 'grovfelt';

-- Add comment
COMMENT ON COLUMN field_figures.shape_type IS 'Visual type: person, circle, stripe, segment, barrel, other';
COMMENT ON COLUMN field_figures.is_active IS 'Only active figures shown in picker';
COMMENT ON COLUMN field_figures.is_standard IS 'Official DFS standard figure';
COMMENT ON COLUMN field_figures.sort_order IS 'Display order in picker (lower = first)';
