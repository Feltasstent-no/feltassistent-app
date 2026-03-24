/*
  # Fix ammo_inventory_logs FK to match_sessions

  1. Changes
    - Change foreign key `ammo_inventory_logs.match_session_id -> match_sessions.id`
      from `NO ACTION` to `SET NULL`
    - This allows match sessions to be deleted without breaking the constraint
    - Ammo logs are preserved with match_session_id set to NULL

  2. Why
    - Previously, deleting a completed match session that had ammo deductions
      would fail with a foreign key violation
    - With SET NULL, the ammo log entry remains for audit purposes
      but no longer blocks deletion
*/

ALTER TABLE ammo_inventory_logs
  DROP CONSTRAINT ammo_inventory_logs_match_session_id_fkey;

ALTER TABLE ammo_inventory_logs
  ADD CONSTRAINT ammo_inventory_logs_match_session_id_fkey
  FOREIGN KEY (match_session_id) REFERENCES match_sessions(id)
  ON DELETE SET NULL;
