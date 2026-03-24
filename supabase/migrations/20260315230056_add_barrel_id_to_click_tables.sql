/*
  # Add barrel_id to click_tables

  1. Changes
    - Add `barrel_id` column to `click_tables` table
    - Links click tables to specific weapon barrels for precise tracking
    
  2. Relationships
    - `click_tables.barrel_id` → `weapon_barrels.id` (nullable)
    - A click table can be:
      - General (no weapon_id, no barrel_id)
      - Weapon-specific (weapon_id, no barrel_id)
      - Weapon + Barrel specific (weapon_id + barrel_id)
    
  3. Notes
    - If barrel_id is set, weapon_id should also be set for data integrity
    - This allows users to maintain different click tables for different barrels
*/

-- Add barrel_id column to click_tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'click_tables' AND column_name = 'barrel_id'
  ) THEN
    ALTER TABLE click_tables ADD COLUMN barrel_id uuid REFERENCES weapon_barrels(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for barrel_id
CREATE INDEX IF NOT EXISTS idx_click_tables_barrel_id ON click_tables(barrel_id);

-- Add check constraint to ensure barrel_id requires weapon_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'click_tables_barrel_requires_weapon'
  ) THEN
    ALTER TABLE click_tables ADD CONSTRAINT click_tables_barrel_requires_weapon 
    CHECK (barrel_id IS NULL OR weapon_id IS NOT NULL);
  END IF;
END $$;
