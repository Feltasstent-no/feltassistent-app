/*
  # Create focus_points table

  1. New Tables
    - `focus_points`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `text` (text, the improvement note)
      - `source_type` (text: 'felt', 'bane', 'trening')
      - `source_name` (text, name of the match/session)
      - `source_id` (uuid, optional reference to source session)
      - `created_at` (timestamptz)
      - `is_resolved` (boolean, default false - marks as "improved")

  2. Security
    - Enable RLS on `focus_points` table
    - Users can only CRUD their own focus points
*/

CREATE TABLE IF NOT EXISTS focus_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text text NOT NULL,
  source_type text NOT NULL DEFAULT 'trening' CHECK (source_type IN ('felt', 'bane', 'trening')),
  source_name text NOT NULL DEFAULT '',
  source_id uuid,
  created_at timestamptz DEFAULT now(),
  is_resolved boolean NOT NULL DEFAULT false
);

ALTER TABLE focus_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own focus points"
  ON focus_points FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own focus points"
  ON focus_points FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own focus points"
  ON focus_points FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own focus points"
  ON focus_points FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_focus_points_user_id ON focus_points (user_id);
CREATE INDEX idx_focus_points_user_created ON focus_points (user_id, created_at DESC);
