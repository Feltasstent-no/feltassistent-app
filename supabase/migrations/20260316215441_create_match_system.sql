/*
  # Create Match System for Guided Field Course Mode

  1. New Tables
    - `match_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `ballistic_profile_id` (uuid, references ballistic_profiles)
      - `template_id` (uuid, references competition_templates) - which DFS course
      - `match_name` (text) - e.g. "DFS Felt 1 - 16. mars"
      - `match_date` (date) - when the match took place
      - `status` (text) - 'in_progress', 'completed', 'paused'
      - `current_hold_index` (integer) - which hold is active (0-based)
      - `wind_speed_mps` (numeric) - wind set at start
      - `wind_direction_degrees` (integer) - wind direction
      - `notes` (text, optional)
      - `created_at` (timestamptz)
      - `completed_at` (timestamptz, optional)
    
    - `match_holds`
      - `id` (uuid, primary key)
      - `match_session_id` (uuid, references match_sessions)
      - `order_index` (integer) - 0, 1, 2... (0-based)
      - `field_figure_id` (uuid, references field_figures)
      - `distance_m` (integer) - distance for this hold
      - `recommended_clicks` (integer) - calculated elevation
      - `wind_correction_clicks` (integer) - wind correction
      - `monitor_image_url` (text, optional) - photo of monitor after hold
      - `notes` (text, optional)
      - `completed` (boolean) - whether hold is done
      - `started_at` (timestamptz, optional) - when clock started
      - `completed_at` (timestamptz, optional) - when hold finished
      - `created_at` (timestamptz)
    
    - Update `shot_logs` table to link to match holds

  2. Storage
    - Create bucket for monitor photos

  3. Security
    - Enable RLS on all tables
    - Users can only access their own match data
*/

-- Create match_sessions table
CREATE TABLE IF NOT EXISTS match_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ballistic_profile_id uuid REFERENCES ballistic_profiles(id) ON DELETE SET NULL,
  template_id uuid REFERENCES competition_templates(id) ON DELETE SET NULL,
  match_name text NOT NULL,
  match_date date DEFAULT CURRENT_DATE NOT NULL,
  status text DEFAULT 'in_progress' NOT NULL,
  current_hold_index integer DEFAULT 0 NOT NULL,
  wind_speed_mps numeric(4,1) DEFAULT 0,
  wind_direction_degrees integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  completed_at timestamptz,
  CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'paused')),
  CONSTRAINT valid_wind_direction CHECK (wind_direction_degrees >= 0 AND wind_direction_degrees < 360)
);

-- Create match_holds table
CREATE TABLE IF NOT EXISTS match_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_session_id uuid REFERENCES match_sessions(id) ON DELETE CASCADE NOT NULL,
  order_index integer NOT NULL,
  field_figure_id uuid REFERENCES field_figures(id) ON DELETE RESTRICT NOT NULL,
  distance_m integer NOT NULL,
  recommended_clicks integer NOT NULL,
  wind_correction_clicks integer DEFAULT 0 NOT NULL,
  monitor_image_url text,
  notes text,
  completed boolean DEFAULT false NOT NULL,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT valid_distance CHECK (distance_m > 0)
);

-- Add match_hold_id to shot_logs for linking
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'shot_logs' AND column_name = 'match_hold_id'
  ) THEN
    ALTER TABLE shot_logs ADD COLUMN match_hold_id uuid REFERENCES match_holds(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create storage bucket for monitor photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('monitor-photos', 'monitor-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE match_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_holds ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_sessions
CREATE POLICY "Users can view own match sessions"
  ON match_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own match sessions"
  ON match_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own match sessions"
  ON match_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own match sessions"
  ON match_sessions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for match_holds
CREATE POLICY "Users can view own match holds"
  ON match_holds FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_sessions
      WHERE match_sessions.id = match_holds.match_session_id
      AND match_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create match holds for own sessions"
  ON match_holds FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_sessions
      WHERE match_sessions.id = match_holds.match_session_id
      AND match_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own match holds"
  ON match_holds FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_sessions
      WHERE match_sessions.id = match_holds.match_session_id
      AND match_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM match_sessions
      WHERE match_sessions.id = match_holds.match_session_id
      AND match_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own match holds"
  ON match_holds FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM match_sessions
      WHERE match_sessions.id = match_holds.match_session_id
      AND match_sessions.user_id = auth.uid()
    )
  );

-- Storage policies for monitor photos
CREATE POLICY "Users can upload own monitor photos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'monitor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own monitor photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'monitor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own monitor photos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'monitor-photos' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_sessions_user_id ON match_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_match_sessions_status ON match_sessions(status);
CREATE INDEX IF NOT EXISTS idx_match_holds_session_id ON match_holds(match_session_id);
CREATE INDEX IF NOT EXISTS idx_match_holds_order ON match_holds(match_session_id, order_index);
CREATE INDEX IF NOT EXISTS idx_shot_logs_match_hold ON shot_logs(match_hold_id) WHERE match_hold_id IS NOT NULL;