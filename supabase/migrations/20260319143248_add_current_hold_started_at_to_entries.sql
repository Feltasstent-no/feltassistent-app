/*
  # Add timer persistence to competition entries

  1. Changes
    - Add `current_hold_started_at` column to `competition_entries` table
      - Type: timestamptz (nullable)
      - Purpose: Track when the current hold's running state began
      - Used to calculate remaining time after refresh/reconnect
  
  2. Behavior
    - Set to NOW() when current_stage_state changes to 'running'
    - Set to NULL when leaving 'running' state
    - Allows accurate time calculation: remaining = time_limit - (now - started_at)
  
  3. Security
    - No RLS changes needed (inherits from existing policies)
*/

-- Add current_hold_started_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'competition_entries' AND column_name = 'current_hold_started_at'
  ) THEN
    ALTER TABLE competition_entries 
    ADD COLUMN current_hold_started_at timestamptz;
  END IF;
END $$;
