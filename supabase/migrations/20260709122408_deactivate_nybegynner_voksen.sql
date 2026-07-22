-- Deactivate "Nybegynner voksen" - replaced by SK1 in the app
UPDATE shooter_classes
SET is_active = false
WHERE code = 'nybegynner_voksen';

UPDATE dfs_class_configs
SET is_active = false
WHERE class_key = 'nybegynner_voksen';
