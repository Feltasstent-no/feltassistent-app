/*
  # Create ammo inventory table

  1. New Tables
    - `ammo_inventory`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `weapon_id` (uuid, references weapons, required)
      - `barrel_id` (uuid, references weapon_barrels, optional)
      - `name` (text, required) - e.g. "Lapua Scenar 6.5x55 - Felt"
      - `usage_type` (text) - felt, bane, trening, annet
      - `caliber` (text, optional)
      - `ammo_name` (text, optional) - bullet/ammo product name
      - `bullet_weight_gr` (numeric, optional)
      - `stock_quantity` (integer, default 0)
      - `track_stock` (boolean, default true) - track inventory
      - `auto_deduct_after_match` (boolean, default false) - auto deduct after match
      - `notes` (text, optional)
      - `is_active` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ammo_inventory_logs`
      - `id` (uuid, primary key)
      - `ammo_inventory_id` (uuid, references ammo_inventory)
      - `user_id` (uuid, references auth.users)
      - `quantity_change` (integer) - positive = added, negative = deducted
      - `reason` (text) - match, manual, purchase, adjustment
      - `match_session_id` (uuid, optional, references match_sessions)
      - `notes` (text, optional)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own inventory data
*/

CREATE TABLE IF NOT EXISTS ammo_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  weapon_id uuid NOT NULL REFERENCES weapons(id),
  barrel_id uuid REFERENCES weapon_barrels(id),
  name text NOT NULL,
  usage_type text NOT NULL DEFAULT 'felt' CHECK (usage_type IN ('felt', 'bane', 'trening', 'annet')),
  caliber text,
  ammo_name text,
  bullet_weight_gr numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  track_stock boolean NOT NULL DEFAULT true,
  auto_deduct_after_match boolean NOT NULL DEFAULT false,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ammo_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ammo inventory"
  ON ammo_inventory FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ammo inventory"
  ON ammo_inventory FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ammo inventory"
  ON ammo_inventory FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ammo inventory"
  ON ammo_inventory FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ammo_inventory_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ammo_inventory_id uuid NOT NULL REFERENCES ammo_inventory(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  quantity_change integer NOT NULL,
  reason text NOT NULL DEFAULT 'manual' CHECK (reason IN ('match', 'manual', 'purchase', 'adjustment')),
  match_session_id uuid REFERENCES match_sessions(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ammo_inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ammo inventory logs"
  ON ammo_inventory_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own ammo inventory logs"
  ON ammo_inventory_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ammo inventory logs"
  ON ammo_inventory_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ammo inventory logs"
  ON ammo_inventory_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
