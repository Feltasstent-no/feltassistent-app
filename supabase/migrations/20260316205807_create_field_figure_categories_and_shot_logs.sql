/*
  # Field Figure Categories and Shot Logging System

  1. New Tables
    - `field_figure_categories` - Categories for organizing field figures
    - `shot_logs` - Individual shot records for learning and analysis

  2. Updates
    - Add category_id to existing field_figures table

  3. Security
    - Enable RLS on all tables
    - Categories readable by all authenticated users
    - Shot logs are private per user
*/

-- Field Figure Categories
CREATE TABLE IF NOT EXISTS field_figure_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE field_figure_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view field figure categories"
  ON field_figure_categories FOR SELECT
  TO authenticated
  USING (true);

-- Update field_figures to add category reference
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'category_id'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN category_id uuid REFERENCES field_figure_categories(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'width_mm'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN width_mm integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'height_mm'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN height_mm integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'aim_points'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN aim_points jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'usage_notes'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN usage_notes text;
  END IF;
END $$;

-- Shot Logs
CREATE TABLE IF NOT EXISTS shot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Context
  ballistic_profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE SET NULL,
  field_figure_id uuid REFERENCES field_figures(id) ON DELETE SET NULL,
  competition_id uuid REFERENCES competitions(id) ON DELETE SET NULL,
  training_entry_id uuid REFERENCES training_entries(id) ON DELETE SET NULL,

  -- Shot parameters
  distance_m integer NOT NULL,
  recommended_clicks numeric(5,1) NOT NULL,
  actual_clicks numeric(5,1) NOT NULL,

  -- Wind
  wind_direction text,
  wind_speed_ms numeric(4,1),
  recommended_wind_clicks numeric(5,1),
  actual_wind_clicks numeric(5,1),

  -- Result
  result text NOT NULL,
  impact_offset_x_mm integer,
  impact_offset_y_mm integer,

  -- Conditions
  temperature_c integer,
  light_conditions text,

  -- Notes
  notes text,
  tags text[],

  -- Timestamps
  shot_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shot_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shot logs"
  ON shot_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own shot logs"
  ON shot_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own shot logs"
  ON shot_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shot logs"
  ON shot_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shot_logs_user ON shot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_shot_logs_profile ON shot_logs(ballistic_profile_id);
CREATE INDEX IF NOT EXISTS idx_shot_logs_figure ON shot_logs(field_figure_id);
CREATE INDEX IF NOT EXISTS idx_shot_logs_shot_at ON shot_logs(shot_at);
CREATE INDEX IF NOT EXISTS idx_field_figures_category ON field_figures(category_id);
