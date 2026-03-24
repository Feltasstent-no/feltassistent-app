/*
  # Create Weapons and Barrels System

  1. New Tables
    - `weapons`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `weapon_number` (text) - User's ID for the weapon
      - `weapon_name` (text) - Display name
      - `weapon_type` (text) - e.g., Sauer STR, DFS .22
      - `caliber` (text) - e.g., 6.5x55, .22 LR
      - `sight_type` (text) - Sight/scope information
      - `is_active` (boolean) - Active status
      - `total_shots_fired` (integer) - Total registered shots
      - `notes` (text) - Additional notes
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `weapon_barrels`
      - `id` (uuid, primary key)
      - `weapon_id` (uuid, foreign key to weapons)
      - `barrel_number` (text) - Serial number or user ID
      - `barrel_name` (text) - Display name
      - `installed_date` (date) - When barrel was installed
      - `removed_date` (date) - When barrel was removed (nullable)
      - `total_shots_fired` (integer) - Shots fired with this barrel
      - `is_active` (boolean) - Currently installed
      - `notes` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Updates to Existing Tables
    - Add `weapon_id` to `click_tables`
    - Add `weapon_id` to `competition_entries`
    - Add `weapon_id` to `training_entries`

  3. Security
    - Enable RLS on both new tables
    - Users can only view and modify their own weapons
    - Weapon barrels are accessible if user owns the parent weapon

  4. Indexes
    - Index on user_id for weapons
    - Index on weapon_id for weapon_barrels
    - Index on weapon_id for click_tables, competition_entries, training_entries
*/

-- Create weapons table
CREATE TABLE IF NOT EXISTS weapons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weapon_number text NOT NULL,
  weapon_name text NOT NULL,
  weapon_type text,
  caliber text,
  sight_type text,
  is_active boolean DEFAULT true,
  total_shots_fired integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create weapon_barrels table
CREATE TABLE IF NOT EXISTS weapon_barrels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weapon_id uuid NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
  barrel_number text NOT NULL,
  barrel_name text,
  installed_date date DEFAULT CURRENT_DATE,
  removed_date date,
  total_shots_fired integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add weapon_id to click_tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'weapon_id'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add weapon_id to competition_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_entries' AND column_name = 'weapon_id'
  ) THEN
    ALTER TABLE competition_entries ADD COLUMN weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add weapon_id to training_entries
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_entries' AND column_name = 'weapon_id'
  ) THEN
    ALTER TABLE training_entries ADD COLUMN weapon_id uuid REFERENCES weapons(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weapons_user_id ON weapons(user_id);
CREATE INDEX IF NOT EXISTS idx_weapon_barrels_weapon_id ON weapon_barrels(weapon_id);
CREATE INDEX IF NOT EXISTS idx_click_tables_weapon_id ON click_tables(weapon_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_weapon_id ON competition_entries(weapon_id);
CREATE INDEX IF NOT EXISTS idx_training_entries_weapon_id ON training_entries(weapon_id);

-- Enable RLS
ALTER TABLE weapons ENABLE ROW LEVEL SECURITY;
ALTER TABLE weapon_barrels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for weapons
CREATE POLICY "Users can view own weapons"
  ON weapons FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weapons"
  ON weapons FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weapons"
  ON weapons FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weapons"
  ON weapons FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for weapon_barrels
CREATE POLICY "Users can view barrels of own weapons"
  ON weapon_barrels FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weapons
      WHERE weapons.id = weapon_barrels.weapon_id
      AND weapons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert barrels to own weapons"
  ON weapon_barrels FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weapons
      WHERE weapons.id = weapon_barrels.weapon_id
      AND weapons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update barrels of own weapons"
  ON weapon_barrels FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weapons
      WHERE weapons.id = weapon_barrels.weapon_id
      AND weapons.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weapons
      WHERE weapons.id = weapon_barrels.weapon_id
      AND weapons.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete barrels of own weapons"
  ON weapon_barrels FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weapons
      WHERE weapons.id = weapon_barrels.weapon_id
      AND weapons.user_id = auth.uid()
    )
  );

-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_weapons_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_weapon_barrels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_weapons_updated_at'
  ) THEN
    CREATE TRIGGER update_weapons_updated_at
      BEFORE UPDATE ON weapons
      FOR EACH ROW
      EXECUTE FUNCTION update_weapons_updated_at();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_weapon_barrels_updated_at'
  ) THEN
    CREATE TRIGGER update_weapon_barrels_updated_at
      BEFORE UPDATE ON weapon_barrels
      FOR EACH ROW
      EXECUTE FUNCTION update_weapon_barrels_updated_at();
  END IF;
END $$;
