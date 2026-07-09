/*
# Create DFS Class Configs table with seed data

Data-driven DFS class configuration for onboarding, dashboard, and match setup.
Based on DFS Skytterboka Kapittel 7 - Klasser og klassesetting.

1. New Tables
  - `dfs_class_configs`
    - `id` (uuid, primary key)
    - `class_key` (text, unique) - matches shooter_classes.code where applicable
    - `class_name` (text) - display name
    - `sort_order` (int) - ordering in UI
    - `field_type` (text) - 'finfelt' or 'grovfelt'
    - `bane_distances` (int[]) - range distances in meters, e.g. {100} or {200,300}
    - `field_distance_min_m` (int, nullable) - minimum field target distance
    - `field_distance_max_m` (int, nullable) - maximum field target distance
    - `default_caliber` (text, nullable) - default/typical caliber for the class
    - `is_active` (boolean) - whether the class is currently in use
    - `description` (text, nullable) - optional notes
    - `created_at` / `updated_at` (timestamptz)

2. Seed Data
  - 20 DFS classes seeded from Skytterboka 7.100 Klasseoversikt
  - Finfelt (10): Nybegynner ung, Nybegynner voksen, Rekrutt, Eldre rekrutt,
    Junior, Jegerklassen, Skytterklasse 1, Skytterklasse 2, Veteran 65, Veteran 73
  - Grovfelt (10): Eldre junior, Kikkertklassen, Åpen klasse, Klasse 1-5,
    HK416, Veteran 55

3. Security
  - RLS enabled
  - All authenticated users can read (reference data)
  - Only admins can insert/update/delete via app_admins check

4. Notes
  - class_key values align with existing shooter_classes.code where possible
  - V55 is grovfelt per DFS Skytterboka (200m bane)
  - V65 and V73 are finfelt (100m bane)
  - Grovfelt bane_distances include both 200 and 300 per DFS rules
*/

CREATE TABLE IF NOT EXISTS dfs_class_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_key text UNIQUE NOT NULL,
  class_name text NOT NULL,
  sort_order int NOT NULL,
  field_type text NOT NULL CHECK (field_type IN ('finfelt', 'grovfelt')),
  bane_distances int[] NOT NULL DEFAULT '{}',
  field_distance_min_m int,
  field_distance_max_m int,
  default_caliber text,
  is_active boolean NOT NULL DEFAULT true,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE dfs_class_configs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (reference data)
DROP POLICY IF EXISTS "authenticated_select_dfs_class_configs" ON dfs_class_configs;
CREATE POLICY "authenticated_select_dfs_class_configs"
  ON dfs_class_configs FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert
DROP POLICY IF EXISTS "admin_insert_dfs_class_configs" ON dfs_class_configs;
CREATE POLICY "admin_insert_dfs_class_configs"
  ON dfs_class_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- Only admins can update
DROP POLICY IF EXISTS "admin_update_dfs_class_configs" ON dfs_class_configs;
CREATE POLICY "admin_update_dfs_class_configs"
  ON dfs_class_configs FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()));

-- Only admins can delete
DROP POLICY IF EXISTS "admin_delete_dfs_class_configs" ON dfs_class_configs;
CREATE POLICY "admin_delete_dfs_class_configs"
  ON dfs_class_configs FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()));

-- Seed DFS class configs from Skytterboka 7.100
-- Finfelt classes (bane: 100m)
INSERT INTO dfs_class_configs (class_key, class_name, sort_order, field_type, bane_distances, default_caliber, description)
VALUES
  ('nybegynner_ung', 'Nybegynner ung', 1, 'finfelt', '{100}', '.22 LR', '10-15 år'),
  ('nybegynner_voksen', 'Nybegynner voksen', 2, 'finfelt', '{100}', '.22 LR', 'Voksne nybegynnere'),
  ('rekrutt', 'Rekrutt', 3, 'finfelt', '{100}', '.22 LR', '11-13 år'),
  ('eldre_rekrutt', 'Eldre rekrutt', 4, 'finfelt', '{100}', '6.5x55', '14-15 år. 6.5x55 (kun redusert) og .22 LR'),
  ('junior', 'Junior', 5, 'finfelt', '{100}', '6.5x55', '16-17 år. 6.5x55 (kun redusert) og .22 LR'),
  ('jegerklassen', 'Jegerklassen', 6, 'finfelt', '{100}', NULL, '16 år+. Opp til og med 8 mm'),
  ('skytterklasse_1', 'Skytterklasse 1', 7, 'finfelt', '{100}', '.22 LR', '16 år+'),
  ('skytterklasse_2', 'Skytterklasse 2', 8, 'finfelt', '{100}', '.22 LR', '16 år+'),
  ('veteran_65', 'Veteran 65', 9, 'finfelt', '{100}', '.22 LR', '65 år+. .22 LR, 6.5x55 og 7.62x51'),
  ('veteran_73', 'Veteran 73', 10, 'finfelt', '{100}', '.22 LR', '73 år+. .22 LR, 6.5x55 og 7.62x51')
ON CONFLICT (class_key) DO NOTHING;

-- Grovfelt classes (bane: 200m og 300m)
INSERT INTO dfs_class_configs (class_key, class_name, sort_order, field_type, bane_distances, default_caliber, description)
VALUES
  ('eldre_junior', 'Eldre junior', 11, 'grovfelt', '{200,300}', '6.5x55', '18-19 år. .22 LR, 6.5x55 og 7.62x51'),
  ('kikkertklassen', 'Kikkertklassen', 12, 'grovfelt', '{200,300}', NULL, '16 år+. Opp til og med 8 mm'),
  ('aapen_klasse', 'Åpen klasse', 13, 'grovfelt', '{200,300}', '6.5x55', '16 år+. .22 LR, 6.5x55 og 7.62x51'),
  ('klasse_1', 'Klasse 1', 14, 'grovfelt', '{200,300}', '6.5x55', '16 år+. .22 LR, 6.5x55 og 7.62x51'),
  ('klasse_2', 'Klasse 2', 15, 'grovfelt', '{200,300}', '6.5x55', '16 år+. .22 LR, 6.5x55 og 7.62x51'),
  ('klasse_3', 'Klasse 3', 16, 'grovfelt', '{200,300}', '6.5x55', '16 år+. .22 LR, 6.5x55 og 7.62x51'),
  ('klasse_4', 'Klasse 4', 17, 'grovfelt', '{200,300}', '6.5x55', '16 år+. .22 LR, 6.5x55 og 7.62x51'),
  ('klasse_5', 'Klasse 5', 18, 'grovfelt', '{200,300}', '6.5x55', '16 år+. .22 LR, 6.5x55 og 7.62x51'),
  ('hk416_alle', 'HK416', 19, 'grovfelt', '{200,300}', '5.56x45 NATO', '18 år+'),
  ('veteran_55', 'Veteran 55', 20, 'grovfelt', '{200,300}', '6.5x55', '55 år+. .22 LR, 6.5x55 og 7.62x51')
ON CONFLICT (class_key) DO NOTHING;
