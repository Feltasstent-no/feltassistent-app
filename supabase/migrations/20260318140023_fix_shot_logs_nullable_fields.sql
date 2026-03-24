/*
  # Fix shot_logs table nullable constraints

  1. Changes
    - Make distance_m, recommended_clicks, actual_clicks, and result nullable
    - These fields are only required when logging competition/training shots with ballistic data
    - For simple weapon shot tracking, only weapon_id, shots_fired, and shot_date are needed

  2. Reasoning
    - The shot_logs table serves two purposes:
      1. Detailed ballistic shot logs (competitions, training with full data)
      2. Simple shot count tracking for weapons (maintenance tracking)
    - Not all fields should be mandatory for all use cases
*/

-- Make fields nullable that are only needed for detailed ballistic logs
ALTER TABLE shot_logs 
  ALTER COLUMN distance_m DROP NOT NULL,
  ALTER COLUMN recommended_clicks DROP NOT NULL,
  ALTER COLUMN actual_clicks DROP NOT NULL,
  ALTER COLUMN result DROP NOT NULL;
