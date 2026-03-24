/*
  # Seed Field Figure Categories

  1. Categories
    - DFS Standard - Standard DFS competition figures
    - DFS Trening - DFS training figures
    - Presisjon - Precision/accuracy targets
    - Annet - Other/custom figures
*/

INSERT INTO field_figure_categories (name, description, display_order) VALUES
  ('DFS Standard', 'Standard DFS konkurransefigurer', 1),
  ('DFS Trening', 'DFS treningsfigurer', 2),
  ('Presisjon', 'Presisjons- og skarpskytingsfigurer', 3),
  ('Annet', 'Andre figurer og mål', 4)
ON CONFLICT (name) DO NOTHING;
