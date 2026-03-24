/*
  # Create Ballistic Profiles System

  1. New Tables
    - `ballistic_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `weapon_id` (uuid, references weapons, nullable)
      - `barrel_id` (uuid, references weapon_barrels, nullable)
      - `name` (text)
      - `bullet_name` (text, nullable)
      - `ballistic_coefficient` (numeric)
      - `muzzle_velocity` (integer, m/s)
      - `zero_distance_m` (integer)
      - `temperature_c` (numeric, default 15)
      - `humidity_percent` (numeric, default 50)
      - `pressure_mm` (numeric, default 760)
      - `altitude_m` (integer, default 0)
      - `sight_type` (text, default 'scope')
      - `sight_height_mm` (numeric)
      - `sight_radius_cm` (numeric, nullable)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ballistic_distance_table`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references ballistic_profiles)
      - `distance_m` (integer)
      - `click_value` (numeric)
      - `bullet_drop_mm` (numeric)

    - `ballistic_click_table`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references ballistic_profiles)
      - `click` (integer)
      - `distance_m` (integer)

    - `ballistic_wind_table`
      - `id` (uuid, primary key)
      - `profile_id` (uuid, references ballistic_profiles)
      - `distance_m` (integer)
      - `wind_speed` (numeric)
      - `wind_clicks` (numeric)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own ballistic profiles and related data
    
  3. Notes
    - Profiles are linked to weapons and barrels for precision
    - Tables are auto-generated based on ballistic calculations
    - All measurements use metric system
*/

-- Create ballistic_profiles table
CREATE TABLE IF NOT EXISTS ballistic_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL,
  barrel_id uuid REFERENCES weapon_barrels(id) ON DELETE SET NULL,
  name text NOT NULL,
  bullet_name text,
  ballistic_coefficient numeric NOT NULL,
  muzzle_velocity integer NOT NULL,
  zero_distance_m integer NOT NULL DEFAULT 100,
  temperature_c numeric DEFAULT 15,
  humidity_percent numeric DEFAULT 50,
  pressure_mm numeric DEFAULT 760,
  altitude_m integer DEFAULT 0,
  sight_type text DEFAULT 'scope',
  sight_height_mm numeric NOT NULL,
  sight_radius_cm numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ballistic_distance_table
CREATE TABLE IF NOT EXISTS ballistic_distance_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE NOT NULL,
  distance_m integer NOT NULL,
  click_value numeric NOT NULL,
  bullet_drop_mm numeric NOT NULL
);

-- Create ballistic_click_table
CREATE TABLE IF NOT EXISTS ballistic_click_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE NOT NULL,
  click integer NOT NULL,
  distance_m integer NOT NULL
);

-- Create ballistic_wind_table
CREATE TABLE IF NOT EXISTS ballistic_wind_table (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE CASCADE NOT NULL,
  distance_m integer NOT NULL,
  wind_speed numeric NOT NULL,
  wind_clicks numeric NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ballistic_profiles_user_id ON ballistic_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_ballistic_profiles_weapon_id ON ballistic_profiles(weapon_id);
CREATE INDEX IF NOT EXISTS idx_ballistic_profiles_barrel_id ON ballistic_profiles(barrel_id);
CREATE INDEX IF NOT EXISTS idx_ballistic_distance_table_profile_id ON ballistic_distance_table(profile_id);
CREATE INDEX IF NOT EXISTS idx_ballistic_click_table_profile_id ON ballistic_click_table(profile_id);
CREATE INDEX IF NOT EXISTS idx_ballistic_wind_table_profile_id ON ballistic_wind_table(profile_id);

-- Enable RLS
ALTER TABLE ballistic_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballistic_distance_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballistic_click_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE ballistic_wind_table ENABLE ROW LEVEL SECURITY;

-- RLS Policies for ballistic_profiles
CREATE POLICY "Users can view own ballistic profiles"
  ON ballistic_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ballistic profiles"
  ON ballistic_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ballistic profiles"
  ON ballistic_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ballistic profiles"
  ON ballistic_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for ballistic_distance_table
CREATE POLICY "Users can view own distance tables"
  ON ballistic_distance_table FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_distance_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own distance tables"
  ON ballistic_distance_table FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_distance_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own distance tables"
  ON ballistic_distance_table FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_distance_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_distance_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own distance tables"
  ON ballistic_distance_table FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_distance_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for ballistic_click_table
CREATE POLICY "Users can view own click tables"
  ON ballistic_click_table FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_click_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own click tables"
  ON ballistic_click_table FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_click_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own click tables"
  ON ballistic_click_table FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_click_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_click_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own click tables"
  ON ballistic_click_table FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_click_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for ballistic_wind_table
CREATE POLICY "Users can view own wind tables"
  ON ballistic_wind_table FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_wind_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own wind tables"
  ON ballistic_wind_table FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_wind_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own wind tables"
  ON ballistic_wind_table FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_wind_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_wind_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own wind tables"
  ON ballistic_wind_table FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ballistic_profiles
      WHERE ballistic_profiles.id = ballistic_wind_table.profile_id
      AND ballistic_profiles.user_id = auth.uid()
    )
  );

-- Add check constraint for barrel requires weapon
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ballistic_profiles_barrel_requires_weapon'
  ) THEN
    ALTER TABLE ballistic_profiles ADD CONSTRAINT ballistic_profiles_barrel_requires_weapon 
    CHECK (barrel_id IS NULL OR weapon_id IS NOT NULL);
  END IF;
END $$;
