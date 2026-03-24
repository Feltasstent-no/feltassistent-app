/*
  # Create ammo_profiles table

  1. New Tables
    - `ammo_profiles`
      - `id` (uuid, primary key)
      - `manufacturer` (text) - Ammunition manufacturer name
      - `name` (text) - Full product name
      - `caliber` (text) - Caliber designation (e.g., "6.5", "7.62")
      - `bullet_weight_gr` (integer) - Bullet weight in grains
      - `ballistic_coefficient_g1` (numeric) - G1 ballistic coefficient
      - `default_muzzle_velocity` (integer) - Default muzzle velocity in m/s
      - `is_active` (boolean) - Whether profile is active
      - `notes` (text) - Additional notes about the ammunition
      - `created_at` (timestamptz) - Record creation timestamp
      - `updated_at` (timestamptz) - Record update timestamp

  2. Security
    - Enable RLS on `ammo_profiles` table
    - Add policy for authenticated users to read ammo profiles
    - Add policy for admin users to manage ammo profiles

  3. Purpose
    This table stores predefined ammunition profiles with known ballistic properties.
    Users can select from these profiles to auto-fill BC and muzzle velocity values
    when creating ballistic profiles, similar to DFS Kulebanegenerator functionality.
*/

CREATE TABLE IF NOT EXISTS ammo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer text NOT NULL,
  name text NOT NULL,
  caliber text NOT NULL,
  bullet_weight_gr integer NOT NULL,
  ballistic_coefficient_g1 numeric(6,3) NOT NULL,
  default_muzzle_velocity integer NOT NULL,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ammo_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ammo profiles"
  ON ammo_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can insert ammo profiles"
  ON ammo_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update ammo profiles"
  ON ammo_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete ammo profiles"
  ON ammo_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM app_admins
      WHERE app_admins.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_ammo_profiles_caliber ON ammo_profiles(caliber);
CREATE INDEX IF NOT EXISTS idx_ammo_profiles_active ON ammo_profiles(is_active);