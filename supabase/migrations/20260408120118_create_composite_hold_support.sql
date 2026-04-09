/*
  # Add composite (sammensatt) hold support

  1. Modified Tables
    - `match_holds`
      - Added `is_composite` (boolean, default false) - flags holds with sub-holds

  2. New Tables
    - `match_sub_holds`
      - `id` (uuid, primary key)
      - `match_hold_id` (uuid, FK -> match_holds, cascade delete)
      - `order_index` (integer) - ordering within the parent hold
      - `field_figure_id` (uuid, FK -> field_figures, nullable)
      - `distance_m` (integer, nullable)
      - `shot_count` (integer, default 3)
      - `elevation_clicks` (integer, nullable)
      - `wind_clicks` (integer, nullable)
      - `wind_direction` (text, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `match_sub_hold_images`
      - `id` (uuid, primary key)
      - `match_sub_hold_id` (uuid, FK -> match_sub_holds, cascade delete)
      - `storage_path` (text) - path in monitor-photos bucket
      - `caption` (text, nullable)
      - `sort_order` (integer, default 0)
      - `created_at` (timestamptz)

  3. Security
    - RLS enabled on both new tables
    - Policies restrict access to authenticated users who own the parent match session

  4. Important Notes
    - Composite holds use ONE shared clock (the parent hold's shooting_time_seconds)
    - The parent hold's shot_count should equal the sum of sub-hold shot_counts
    - Non-composite holds are completely unaffected
*/

-- Add is_composite flag to match_holds
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_holds' AND column_name = 'is_composite'
  ) THEN
    ALTER TABLE match_holds ADD COLUMN is_composite boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create match_sub_holds table
CREATE TABLE IF NOT EXISTS match_sub_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_hold_id uuid NOT NULL REFERENCES match_holds(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  field_figure_id uuid REFERENCES field_figures(id) ON DELETE SET NULL,
  distance_m integer,
  shot_count integer NOT NULL DEFAULT 3 CHECK (shot_count >= 1 AND shot_count <= 20),
  elevation_clicks integer,
  wind_clicks integer,
  wind_direction text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_sub_hold_distance CHECK (distance_m IS NULL OR distance_m > 0)
);

ALTER TABLE match_sub_holds ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_match_sub_holds_hold_id ON match_sub_holds(match_hold_id);
CREATE INDEX IF NOT EXISTS idx_match_sub_holds_order ON match_sub_holds(match_hold_id, order_index);

CREATE POLICY "Users can view own sub holds"
  ON match_sub_holds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_holds mh
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE mh.id = match_sub_holds.match_hold_id
      AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sub holds"
  ON match_sub_holds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_holds mh
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE mh.id = match_sub_holds.match_hold_id
      AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sub holds"
  ON match_sub_holds FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_holds mh
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE mh.id = match_sub_holds.match_hold_id
      AND ms.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_holds mh
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE mh.id = match_sub_holds.match_hold_id
      AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sub holds"
  ON match_sub_holds FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_holds mh
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE mh.id = match_sub_holds.match_hold_id
      AND ms.user_id = auth.uid()
    )
  );

-- Create match_sub_hold_images table
CREATE TABLE IF NOT EXISTS match_sub_hold_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_sub_hold_id uuid NOT NULL REFERENCES match_sub_holds(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE match_sub_hold_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_match_sub_hold_images_sub_hold ON match_sub_hold_images(match_sub_hold_id);

CREATE POLICY "Users can view own sub hold images"
  ON match_sub_hold_images FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_sub_holds msh
      JOIN match_holds mh ON mh.id = msh.match_hold_id
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE msh.id = match_sub_hold_images.match_sub_hold_id
      AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own sub hold images"
  ON match_sub_hold_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_sub_holds msh
      JOIN match_holds mh ON mh.id = msh.match_hold_id
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE msh.id = match_sub_hold_images.match_sub_hold_id
      AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own sub hold images"
  ON match_sub_hold_images FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_sub_holds msh
      JOIN match_holds mh ON mh.id = msh.match_hold_id
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE msh.id = match_sub_hold_images.match_sub_hold_id
      AND ms.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_sub_holds msh
      JOIN match_holds mh ON mh.id = msh.match_hold_id
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE msh.id = match_sub_hold_images.match_sub_hold_id
      AND ms.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own sub hold images"
  ON match_sub_hold_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_sub_holds msh
      JOIN match_holds mh ON mh.id = msh.match_hold_id
      JOIN match_sessions ms ON ms.id = mh.match_session_id
      WHERE msh.id = match_sub_hold_images.match_sub_hold_id
      AND ms.user_id = auth.uid()
    )
  );

-- Trigger for updated_at on match_sub_holds
CREATE OR REPLACE FUNCTION update_match_sub_holds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_match_sub_holds_updated_at
  BEFORE UPDATE ON match_sub_holds
  FOR EACH ROW
  EXECUTE FUNCTION update_match_sub_holds_updated_at();
