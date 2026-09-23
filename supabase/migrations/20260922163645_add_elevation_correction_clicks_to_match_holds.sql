/*
# Add selected/used elevation field to match holds

## Summary
This migration introduces a new, separate field that records the shooter's own
chosen (or actually used) elevation click value for a match hold, keeping it
distinct from the field assistant's calculated recommendation.

## Background
Until now `match_holds.recommended_clicks` served double duty: it held both the
automatically calculated elevation recommendation AND whatever the shooter
manually entered. That made it impossible to change the recommendation (e.g. when
the distance changes) without silently overwriting a value the shooter had chosen
on purpose. Wind already has this separation (`recommended_wind_clicks` vs
`wind_correction_clicks`); this migration brings the same separation to elevation.

## Changes
1. New column on `match_holds`:
   - `elevation_correction_clicks` (integer, NULLABLE, no default)
     - `NULL`  = the shooter has NOT made an explicit elevation choice yet;
                 the UI falls back to `recommended_clicks`.
     - a value = the shooter's explicitly chosen / actually used elevation clicks
                 (0 is a legitimate explicit choice, distinct from NULL).

## Data safety
- Purely additive. No column is dropped, renamed, or retyped.
- `recommended_clicks` and the existing wind columns are left completely untouched.
- No backfill: all existing rows get `elevation_correction_clicks = NULL`, so the
  displayed elevation stays identical to before (via the recommended fallback).

## Security
- No RLS or policy changes. Existing `match_holds` policies continue to govern the
  new column.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'match_holds'
      AND column_name = 'elevation_correction_clicks'
  ) THEN
    ALTER TABLE match_holds ADD COLUMN elevation_correction_clicks integer;
  END IF;
END $$;