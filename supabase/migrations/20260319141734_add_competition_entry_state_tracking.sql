/*
  # Add Competition Entry State Tracking

  1. New Columns
    - `competition_entries.current_stage_number` (integer) - Hvilket hold brukeren er på
    - `competition_entries.current_stage_state` (text) - State for nåværende hold
    - `competition_entries.status` (text) - Overordnet status for gjennomføringen

  2. Purpose
    - Muliggjør hold-for-hold assistert gjennomføring
    - Track state per hold: 'pre_hold', 'running', 'post_hold', 'completed'
    - Track overordnet status: 'not_started', 'in_progress', 'completed'

  3. States
    Grovfelt:
      - pre_hold: Viser figur, avstand, knepp opp før start
      - running: Feltklokke kjører
      - post_hold: Viser knepp ned til zero
      - completed: Hold ferdig, ready for next

    Finfelt:
      - pre_match_note: Før første hold (en gang)
      - running: Feltklokke kjører
      - completed: Hold ferdig
      - post_match_note: Etter siste hold (en gang)
*/

-- Add state tracking columns to competition_entries
ALTER TABLE competition_entries
ADD COLUMN IF NOT EXISTS current_stage_number integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_stage_state text DEFAULT 'pre_hold',
ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started';

-- Add index for efficient queries
CREATE INDEX IF NOT EXISTS idx_competition_entries_status 
ON competition_entries(status);

CREATE INDEX IF NOT EXISTS idx_competition_entries_user_status 
ON competition_entries(user_id, status);
