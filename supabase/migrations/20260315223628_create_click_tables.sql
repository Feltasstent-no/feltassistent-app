/*
  # Create Click Tables System

  1. New Tables
    - `click_tables`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Name of the click table
      - `ammo` (text) - Ammunition/load description
      - `caliber` (text) - Caliber
      - `bullet_weight` (text) - Bullet weight
      - `muzzle_velocity` (integer) - Muzzle velocity in m/s
      - `zero_distance` (integer) - Zero distance in meters
      - `click_unit` (text) - Unit per click (e.g., "1/4 MOA", "0.1 mil")
      - `notes` (text) - Additional notes
      - `is_active` (boolean) - Active status
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `click_table_rows`
      - `id` (uuid, primary key)
      - `click_table_id` (uuid, foreign key to click_tables)
      - `distance_m` (integer) - Distance in meters
      - `clicks_up` (integer) - Clicks up from zero
      - `clicks_down` (integer) - Clicks down from zero (optional)
      - `clicks_left` (integer) - Clicks left (for wind, optional)
      - `clicks_right` (integer) - Clicks right (for wind, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only view and modify their own click tables
    - Click table rows are accessible if user owns the parent click table

  3. Indexes
    - Index on user_id for click_tables
    - Index on click_table_id for click_table_rows
    - Index on distance_m for faster lookups
*/

-- Create click_tables table
CREATE TABLE IF NOT EXISTS click_tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  ammo text,
  caliber text,
  bullet_weight text,
  muzzle_velocity integer,
  zero_distance integer DEFAULT 100,
  click_unit text DEFAULT '1/4 MOA',
  notes text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create click_table_rows table
CREATE TABLE IF NOT EXISTS click_table_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  click_table_id uuid NOT NULL REFERENCES click_tables(id) ON DELETE CASCADE,
  distance_m integer NOT NULL,
  clicks_up integer DEFAULT 0,
  clicks_down integer DEFAULT 0,
  clicks_left integer DEFAULT 0,
  clicks_right integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_click_tables_user_id ON click_tables(user_id);
CREATE INDEX IF NOT EXISTS idx_click_table_rows_table_id ON click_table_rows(click_table_id);
CREATE INDEX IF NOT EXISTS idx_click_table_rows_distance ON click_table_rows(distance_m);

-- Enable RLS
ALTER TABLE click_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_table_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for click_tables
CREATE POLICY "Users can view own click tables"
  ON click_tables FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own click tables"
  ON click_tables FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own click tables"
  ON click_tables FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own click tables"
  ON click_tables FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for click_table_rows
CREATE POLICY "Users can view rows of own click tables"
  ON click_table_rows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rows to own click tables"
  ON click_table_rows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rows of own click tables"
  ON click_table_rows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rows of own click tables"
  ON click_table_rows FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

-- Add updated_at trigger for click_tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_click_tables_updated_at'
  ) THEN
    CREATE TRIGGER update_click_tables_updated_at
      BEFORE UPDATE ON click_tables
      FOR EACH ROW
      EXECUTE FUNCTION update_click_tables_updated_at();
  END IF;
END $$;

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_click_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
