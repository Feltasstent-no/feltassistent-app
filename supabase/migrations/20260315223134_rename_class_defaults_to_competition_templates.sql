/*
  # Rename class_defaults to competition_templates

  1. Changes
    - Rename class_defaults table to competition_templates
    - Remove shooter_class column (no longer needed)
    - Remove default_warning_time column (not used)
    - Rename notes to description for consistency
    - Update structure to focus on templates instead of shooter classes

  2. New Template Structure
    - name: Template name (e.g., "Standard grovfelt", "Rekruttfelt")
    - competition_type: Type of competition (felt or bane)
    - default_stages: Default number of stages
    - default_shots_per_stage: Default shots per stage
    - default_shoot_time: Default shooting time in seconds
    - default_prep_time: Default preparation time in seconds
    - description: Optional description of the template

  3. Security
    - Allow authenticated users to read templates
    - Only admins can create, update, or delete templates

  4. Sample Templates
    - Standard grovfelt (10 stages, 1 shot, 30s shoot, 15s prep)
    - Rekruttfelt (6 stages, 1 shot, 45s shoot, 20s prep)
    - Treningsfelt (8 stages, 1 shot, 30s shoot, 15s prep)
    - Minifelt (5 stages, 1 shot, 25s shoot, 10s prep)
*/

-- Rename the table
ALTER TABLE IF EXISTS class_defaults RENAME TO competition_templates;

-- Remove shooter_class column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_templates' AND column_name = 'shooter_class'
  ) THEN
    ALTER TABLE competition_templates DROP COLUMN shooter_class;
  END IF;
END $$;

-- Remove default_warning_time column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_templates' AND column_name = 'default_warning_time'
  ) THEN
    ALTER TABLE competition_templates DROP COLUMN default_warning_time;
  END IF;
END $$;

-- Rename notes to description if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_templates' AND column_name = 'notes'
  ) THEN
    ALTER TABLE competition_templates RENAME COLUMN notes TO description;
  END IF;
END $$;

-- Update table comment
COMMENT ON TABLE competition_templates IS 'Competition templates with default values for creating new competitions';

-- Delete existing data and insert new templates
DELETE FROM competition_templates;

INSERT INTO competition_templates (name, competition_type, default_stages, default_shots_per_stage, default_shoot_time, default_prep_time, description, is_active) VALUES
('Standard grovfelt', 'felt', 10, 1, 30, 15, 'Standard DFS grovfelt med 10 hold', true),
('Rekruttfelt', 'felt', 6, 1, 45, 20, 'Forenklet feltløype for rekrutter med lengre skytetid', true),
('Treningsfelt', 'felt', 8, 1, 30, 15, 'Treningsløype med 8 hold', true),
('Minifelt', 'felt', 5, 1, 25, 10, 'Kort feltløype for rask trening', true);

-- Update RLS policies to be more permissive for reading
DROP POLICY IF EXISTS "Admins can view class defaults" ON competition_templates;
DROP POLICY IF EXISTS "Admins can insert class defaults" ON competition_templates;
DROP POLICY IF EXISTS "Admins can update class defaults" ON competition_templates;
DROP POLICY IF EXISTS "Admins can delete class defaults" ON competition_templates;

-- Allow all authenticated users to read templates
CREATE POLICY "Authenticated users can view competition templates"
  ON competition_templates FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert templates
CREATE POLICY "Admins can insert competition templates"
  ON competition_templates FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can update templates
CREATE POLICY "Admins can update competition templates"
  ON competition_templates FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

-- Only admins can delete templates
CREATE POLICY "Admins can delete competition templates"
  ON competition_templates FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );
