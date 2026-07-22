/*
# Harmonize dfs_class_configs with shooter_classes master table

## Purpose
Make shooter_classes the single source of truth for class identity (code, name, category).
dfs_class_configs becomes a pure configuration layer referencing shooter_classes.code via class_key.

## Changes

1. Add missing classes to shooter_classes
  - nybegynner_ung (Nybegynner ung) - ungdom category
  - nybegynner_voksen (Nybegynner voksen) - senior category
  - aapen_klasse (Åpen klasse) - senior category

2. Update dfs_class_configs to align class_key with shooter_classes.code
  - skytterklasse_1 → SK1 (matches existing shooter_classes.code)
  - skytterklasse_2 → SK2 (matches existing shooter_classes.code)

3. No columns dropped, no data deleted.

## Notes
- After this migration, every dfs_class_configs.class_key matches a shooter_classes.code
- The frontend should pull class_name from shooter_classes, not dfs_class_configs
- dfs_class_configs.class_name is kept for backward compatibility but is redundant
*/

-- 1. Add missing classes to shooter_classes
INSERT INTO shooter_classes (code, name, category, sort_order, is_active)
VALUES
  ('nybegynner_ung', 'Nybegynner ung', 'ungdom', 0, true),
  ('nybegynner_voksen', 'Nybegynner voksen', 'senior', 0, true),
  ('aapen_klasse', 'Åpen klasse', 'senior', 6, true)
ON CONFLICT (code) DO NOTHING;

-- 2. Align dfs_class_configs keys to match shooter_classes.code
UPDATE dfs_class_configs
SET class_key = 'SK1', class_name = 'SK1', updated_at = now()
WHERE class_key = 'skytterklasse_1';

UPDATE dfs_class_configs
SET class_key = 'SK2', class_name = 'SK2', updated_at = now()
WHERE class_key = 'skytterklasse_2';
