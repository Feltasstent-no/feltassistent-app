/*
  # Add category field to field_figures

  1. Changes
    - Add `category` column to field_figures table with values 'grovfelt' or 'finfelt'
    - Set default value to 'grovfelt'
    - Update existing records based on their characteristics
  
  2. Notes
    - Finfelt figures are generally smaller and used at closer distances
    - This helps users filter figures when setting up competitions
*/

-- Add category column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'category'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN category text DEFAULT 'grovfelt' CHECK (category IN ('grovfelt', 'finfelt'));
  END IF;
END $$;

-- Update finfelt figures
UPDATE field_figures 
SET category = 'finfelt'
WHERE code IN ('C15', 'TONNE-FINFELT', 'STRIPE-FINFELT', 'HJUL', '1/10', 'PRISME', 'MINISMAEN', 'MINI-1/4', 'SIRKEL-FINFELT', 'MINI-1/3');

-- Update grovfelt figures (set explicitly for clarity)
UPDATE field_figures 
SET category = 'grovfelt'
WHERE code IN ('B100', 'B65', 'B45', 'TONNE', '1/3', '1/4', '1/4V', '1/6', '1/8', 'SMAEN', 'S-25H', 'S-25V', 'STRIPE-13/40', 'STRIPE-30/10', 'SIRKEL', 'C50', 'C40', 'C35', 'C30', 'C25', 'C20');
