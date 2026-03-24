/*
  # Create Class Defaults Table

  1. New Tables
    - `class_defaults`
      - `id` (uuid, primary key)
      - `name` (text) - Display name for this default configuration
      - `shooter_class` (text) - Reference to shooter class
      - `competition_type` (text) - Type of competition (felt/bane)
      - `default_stages` (integer) - Default number of stages
      - `default_shoot_time` (integer) - Default shooting time in seconds
      - `default_prep_time` (integer) - Default preparation time in seconds
      - `default_warning_time` (integer) - Default warning time in seconds
      - `default_shots_per_stage` (integer) - Default shots per stage
      - `notes` (text, nullable) - Optional notes
      - `is_active` (boolean) - Whether this default is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `class_defaults` table
    - Authenticated users can read active defaults
    - Only admins can insert, update, or delete defaults

  3. Notes
    - This table stores standard configurations for different shooter classes
    - Used to pre-fill competition setup forms with appropriate defaults
    - Admins can manage these through the admin interface
*/

CREATE TABLE IF NOT EXISTS class_defaults (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  shooter_class text,
  competition_type text CHECK (competition_type IN ('felt', 'bane')),
  default_stages integer DEFAULT 10,
  default_shoot_time integer DEFAULT 30,
  default_prep_time integer DEFAULT 15,
  default_warning_time integer DEFAULT 10,
  default_shots_per_stage integer DEFAULT 10,
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE class_defaults ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view active class defaults"
  ON class_defaults
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert class defaults"
  ON class_defaults
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update class defaults"
  ON class_defaults
  FOR UPDATE
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

CREATE POLICY "Admins can delete class defaults"
  ON class_defaults
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE user_id = auth.uid()
    )
  );

-- Seed with common defaults
INSERT INTO class_defaults (name, shooter_class, competition_type, default_stages, default_shoot_time, default_prep_time, default_warning_time, default_shots_per_stage, notes)
VALUES
  ('Felt 1 - Standard', 'Felt 1', 'felt', 10, 30, 15, 10, 10, 'Standard oppsett for Felt 1'),
  ('Felt 2 - Standard', 'Felt 2', 'felt', 10, 30, 15, 10, 10, 'Standard oppsett for Felt 2'),
  ('Felt 3 - Standard', 'Felt 3', 'felt', 10, 45, 15, 10, 10, 'Standard oppsett for Felt 3 med lengre skytetid'),
  ('Bane 1 - Standard', 'Bane 1', 'bane', 15, 60, 0, 0, 5, 'Standard baneoppsett'),
  ('Bane 2 - Standard', 'Bane 2', 'bane', 15, 60, 0, 0, 5, 'Standard baneoppsett'),
  ('Rekrutt Felt - Standard', 'Rekrutt', 'felt', 8, 45, 20, 15, 8, 'Rekruttvennlig oppsett med lengre tider og færre hold')
ON CONFLICT DO NOTHING;
