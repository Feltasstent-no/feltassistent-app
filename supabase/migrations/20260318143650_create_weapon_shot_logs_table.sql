/*
  # Create weapon_shot_logs table for dedicated weapon/barrel shot tracking

  1. New Tables
    - `weapon_shot_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `weapon_id` (uuid, references weapons)
      - `barrel_id` (uuid, references weapon_barrels, nullable)
      - `shots_fired` (integer, must be > 0)
      - `shot_date` (date, required)
      - `comment` (text, nullable)
      - `source` (text, tracks where the entry was created)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `weapon_shot_logs` table
    - Add policies for authenticated users to:
      - Read their own shot logs
      - Insert their own shot logs
      - Update their own shot logs
      - Delete their own shot logs

  3. Indexes
    - Index on user_id for efficient queries
    - Index on weapon_id for weapon-specific queries
    - Index on barrel_id for barrel-specific queries
    - Index on shot_date for chronological sorting

  4. Constraints
    - shots_fired must be greater than 0
    - shot_date is required
    - weapon_id is required
    - source must be one of: 'dashboard', 'weapons_page', 'quick_assistant'
*/

-- Create weapon_shot_logs table
CREATE TABLE IF NOT EXISTS weapon_shot_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_id uuid NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
  barrel_id uuid REFERENCES weapon_barrels(id) ON DELETE SET NULL,
  shots_fired integer NOT NULL CHECK (shots_fired > 0),
  shot_date date NOT NULL DEFAULT CURRENT_DATE,
  comment text,
  source text NOT NULL CHECK (source IN ('dashboard', 'weapons_page', 'quick_assistant')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE weapon_shot_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weapon_shot_logs_user_id ON weapon_shot_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_weapon_shot_logs_weapon_id ON weapon_shot_logs(weapon_id);
CREATE INDEX IF NOT EXISTS idx_weapon_shot_logs_barrel_id ON weapon_shot_logs(barrel_id);
CREATE INDEX IF NOT EXISTS idx_weapon_shot_logs_shot_date ON weapon_shot_logs(shot_date DESC);

-- RLS Policies
CREATE POLICY "Users can view own weapon shot logs"
  ON weapon_shot_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weapon shot logs"
  ON weapon_shot_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weapon shot logs"
  ON weapon_shot_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weapon shot logs"
  ON weapon_shot_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_weapon_shot_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_weapon_shot_logs_updated_at
  BEFORE UPDATE ON weapon_shot_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_weapon_shot_logs_updated_at();