/*
  # Add missing shooter classes

  1. New Entries in `shooter_classes`
    - `hk416_alle` - HK416 - Alle klasser (category: spesial, sort_order: 13)
    - `kikkertklassen` - Kikkertklassen (category: spesial, sort_order: 14)
    - `jegerklassen` - Jegerklassen (category: spesial, sort_order: 15)

  2. Notes
    - These are additional class options used in Norwegian DFS shooting
    - Uses ON CONFLICT to avoid duplicates if run again
*/

INSERT INTO shooter_classes (code, name, category, sort_order, is_active)
VALUES
  ('hk416_alle', 'HK416 - Alle klasser', 'spesial', 13, true),
  ('kikkertklassen', 'Kikkertklassen', 'spesial', 14, true),
  ('jegerklassen', 'Jegerklassen', 'spesial', 15, true)
ON CONFLICT (code) DO NOTHING;