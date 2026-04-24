/*
  # Add session_type to training_sessions

  1. Changes
    - Add column `session_type` (text, default 'training') to `training_sessions`
      - Used to distinguish regular training from "banestevne" (range match) mode
      - Only used for UI badging; data model and flow are otherwise identical

  2. Security
    - No RLS changes; existing policies already protect this table
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'training_sessions' AND column_name = 'session_type'
  ) THEN
    ALTER TABLE training_sessions ADD COLUMN session_type text NOT NULL DEFAULT 'training';
  END IF;
END $$;
