/*
  # Create training sessions and series tables

  Transforms the training flow from static post-session logs into active live sessions
  with per-series tracking, images, and timing.

  1. New Tables
    - `training_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `title` (text, session name)
      - `session_date` (date)
      - `discipline_id` (uuid, references disciplines)
      - `location` (text, nullable)
      - `weapon_id` (uuid, nullable, references weapons)
      - `barrel_id` (uuid, nullable, references weapon_barrels)
      - `ammo_inventory_id` (uuid, nullable, references ammo_inventory)
      - `class_code` (text, nullable)
      - `weather` (text, nullable)
      - `wind_notes` (text, nullable)
      - `notes` (text, nullable)
      - `status` (text: active, completed, cancelled)
      - `total_shots` (integer, computed summary)
      - `total_score` (integer, computed summary)
      - `total_inner_hits` (integer, computed summary)
      - `completed_at` (timestamptz, nullable)
      - `created_at` / `updated_at` (timestamptz)

    - `training_series`
      - `id` (uuid, primary key)
      - `session_id` (uuid, references training_sessions)
      - `user_id` (uuid, references auth.users)
      - `order_index` (integer, series order)
      - `shot_count` (integer, number of shots in this series)
      - `shooting_time_seconds` (integer, nullable)
      - `distance_m` (integer, nullable)
      - `score` (integer, nullable)
      - `inner_hits` (integer, nullable)
      - `hits` (integer, nullable)
      - `notes` (text, nullable)
      - `completed` (boolean, default false)
      - `started_at` / `completed_at` (timestamptz, nullable)
      - `created_at` (timestamptz)

    - `training_series_images`
      - `id` (uuid, primary key)
      - `series_id` (uuid, references training_series)
      - `user_id` (uuid, references auth.users)
      - `storage_path` (text)
      - `caption` (text, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all three tables
    - Users can only access their own data
    - Separate policies for SELECT, INSERT, UPDATE, DELETE

  3. Indexes
    - training_sessions: user_id, session_date
    - training_series: session_id, order_index
    - training_series_images: series_id
*/

CREATE TABLE IF NOT EXISTS training_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  discipline_id uuid REFERENCES disciplines(id) ON DELETE SET NULL,
  location text,
  weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL,
  barrel_id uuid REFERENCES weapon_barrels(id) ON DELETE SET NULL,
  ammo_inventory_id uuid REFERENCES ammo_inventory(id) ON DELETE SET NULL,
  class_code text,
  weather text,
  wind_notes text,
  notes text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  total_shots integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  total_inner_hits integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training sessions"
  ON training_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own training sessions"
  ON training_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training sessions"
  ON training_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training sessions"
  ON training_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user_id ON training_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_date ON training_sessions(session_date DESC);

CREATE TABLE IF NOT EXISTS training_series (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  shot_count integer NOT NULL DEFAULT 5,
  shooting_time_seconds integer,
  distance_m integer,
  score integer,
  inner_hits integer,
  hits integer,
  notes text,
  completed boolean NOT NULL DEFAULT false,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training series"
  ON training_series FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own training series"
  ON training_series FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training series"
  ON training_series FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training series"
  ON training_series FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_training_series_session ON training_series(session_id);
CREATE INDEX IF NOT EXISTS idx_training_series_order ON training_series(session_id, order_index);

CREATE TABLE IF NOT EXISTS training_series_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  series_id uuid NOT NULL REFERENCES training_series(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE training_series_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training series images"
  ON training_series_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own training series images"
  ON training_series_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own training series images"
  ON training_series_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_training_series_images_series ON training_series_images(series_id);
