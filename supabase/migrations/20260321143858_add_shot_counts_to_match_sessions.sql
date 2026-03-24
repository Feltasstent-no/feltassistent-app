/*
  # Add calculated and actual shot counts to match_sessions

  1. Modified Tables
    - `match_sessions`
      - `calculated_shot_count` (integer, nullable) - auto-calculated sum from holds
      - `actual_shot_count` (integer, nullable) - manually overridden by user
      - `ammo_inventory_id` (uuid, nullable) - links to the ammo inventory used
      - `ammo_deducted_count` (integer, nullable) - how many shots were deducted from inventory

  2. Purpose
    - calculated_shot_count: always the sum of shot_count from completed holds
    - actual_shot_count: user override when actual usage differs from calculated
    - ammo_inventory_id: tracks which ammo inventory was used (for export/sharing)
    - ammo_deducted_count: exact amount deducted, prevents double-deduction
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'calculated_shot_count'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN calculated_shot_count integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'actual_shot_count'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN actual_shot_count integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'ammo_inventory_id'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN ammo_inventory_id uuid REFERENCES ammo_inventory(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_sessions' AND column_name = 'ammo_deducted_count'
  ) THEN
    ALTER TABLE match_sessions ADD COLUMN ammo_deducted_count integer;
  END IF;
END $$;
