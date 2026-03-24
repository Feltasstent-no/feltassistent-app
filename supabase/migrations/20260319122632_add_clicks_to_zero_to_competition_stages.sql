/*
  # Add clicks_to_zero to competition_stages

  1. Changes
    - Add `clicks_to_zero` column to `competition_stages` table
      - Stores number of clicks needed to return to zero position after a hold
      - Used in grovfelt (rough field) competitions to help shooters reset their scope
      - NULL for finfelt (fine field) competitions where this is not relevant
    
  2. Notes
    - This is part of Phase 1: hold-based competition setup
    - Only applies to grovfelt (rough field) competitions
    - Calculated based on the clicks needed for the hold distance
*/

ALTER TABLE competition_stages
ADD COLUMN IF NOT EXISTS clicks_to_zero integer;

COMMENT ON COLUMN competition_stages.clicks_to_zero IS 'Number of clicks to return to zero position after this hold (grovfelt only)';
