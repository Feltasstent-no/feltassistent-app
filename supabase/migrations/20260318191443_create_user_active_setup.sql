/*
  # Create User Active Setup System

  1. New Tables
    - `user_active_setup`
      - `user_id` (uuid, primary key, references auth.users)
      - `weapon_id` (uuid, nullable, references weapons)
      - `barrel_id` (uuid, nullable, references weapon_barrels)
      - `click_table_id` (uuid, nullable, references click_tables)
      - `ballistic_profile_id` (uuid, nullable, references ballistic_profiles)
      - `discipline_id` (uuid, nullable, references disciplines)
      - `mode` (varchar, default 'general')
      - `updated_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `user_active_setup` table
    - Add policy for users to read their own active setup
    - Add policy for users to insert their own active setup
    - Add policy for users to update their own active setup
    - Add policy for users to delete their own active setup

  3. Important Notes
    - Each user can have only ONE active setup (enforced by primary key on user_id)
    - Either click_table_id OR ballistic_profile_id should be set, not both
    - This active setup will be used across Match, Shot Assistant, and Training
    - Mode can be: 'general', 'match', 'training' for future flexibility
*/

CREATE TABLE IF NOT EXISTS user_active_setup (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_id UUID REFERENCES weapons(id) ON DELETE SET NULL,
  barrel_id UUID REFERENCES weapon_barrels(id) ON DELETE SET NULL,
  click_table_id UUID REFERENCES click_tables(id) ON DELETE SET NULL,
  ballistic_profile_id UUID REFERENCES ballistic_profiles(id) ON DELETE SET NULL,
  discipline_id UUID REFERENCES disciplines(id) ON DELETE SET NULL,
  mode VARCHAR(20) DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_active_setup ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own active setup"
  ON user_active_setup
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own active setup"
  ON user_active_setup
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own active setup"
  ON user_active_setup
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own active setup"
  ON user_active_setup
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_active_setup_weapon ON user_active_setup(weapon_id);
CREATE INDEX IF NOT EXISTS idx_user_active_setup_barrel ON user_active_setup(barrel_id);
CREATE INDEX IF NOT EXISTS idx_user_active_setup_click_table ON user_active_setup(click_table_id);
CREATE INDEX IF NOT EXISTS idx_user_active_setup_ballistic_profile ON user_active_setup(ballistic_profile_id);