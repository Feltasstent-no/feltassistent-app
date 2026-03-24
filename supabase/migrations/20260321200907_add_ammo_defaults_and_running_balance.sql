/*
  # Add smart ammo defaults and running balance to logs

  1. Modified Tables
    - `ammo_inventory`
      - `is_default_felt` (boolean, default false) - Standard ammo for felt/field
      - `is_default_bane` (boolean, default false) - Standard ammo for bane/range
      - `is_default_trening` (boolean, default false) - Standard ammo for training
      - `is_current_active` (boolean, default false) - Currently active ammo setup

    - `ammo_inventory_logs`
      - `running_balance` (integer, nullable) - Stock balance after this transaction

  2. Notes
    - Default flags allow marking one ammo setup per context per weapon
    - is_current_active marks the currently selected ammo for the weapon
    - running_balance makes history display faster without recalculating
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ammo_inventory' AND column_name = 'is_default_felt'
  ) THEN
    ALTER TABLE ammo_inventory ADD COLUMN is_default_felt boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ammo_inventory' AND column_name = 'is_default_bane'
  ) THEN
    ALTER TABLE ammo_inventory ADD COLUMN is_default_bane boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ammo_inventory' AND column_name = 'is_default_trening'
  ) THEN
    ALTER TABLE ammo_inventory ADD COLUMN is_default_trening boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ammo_inventory' AND column_name = 'is_current_active'
  ) THEN
    ALTER TABLE ammo_inventory ADD COLUMN is_current_active boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ammo_inventory_logs' AND column_name = 'running_balance'
  ) THEN
    ALTER TABLE ammo_inventory_logs ADD COLUMN running_balance integer;
  END IF;
END $$;
