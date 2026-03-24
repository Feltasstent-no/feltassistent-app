/*
  # Fix field_figures names, is_standard, and sort_order

  This migration corrects the display names for all DFS field figures
  so they are descriptive and unique, marks finfelt figures as standard,
  and assigns proper sort_order values to finfelt figures.

  ## Problem
  - Most grovfelt figures have generic name "Grovfelt skive" making them
    indistinguishable in the picker
  - All finfelt figures have generic name "Finfelt skive" and is_standard = false
  - Finfelt figures all have sort_order = 1000 (no ordering)

  ## Changes

  ### Grovfelt name fixes (21 figures)
  - B45, B65, B100: Keep current descriptive names (already correct)
  - C20-C50: Update from "Grovfelt skive" to "Sirkel Xcm"
  - Stripe-30/10, Stripe-13/40: Update to "Stripe 30x10" / "Stripe 13x40"
  - S-25H, S-25V: Update to "Spalte 25 horisontal" / "Spalte 25 vertikal"
  - 1/8, 1/6: Update to "En åttendedels figur" / "En sjettedels figur"
  - 1/4: Update to "Kvartfigur"
  - 1/4V: Update to "Kvartfigur venstre"
  - 1/3: Update to "Tredjedels figur"
  - Småen: Update to "Småen"
  - Sirkel: Update to "Sirkel 30cm"
  - Tønne: Update to "Tønne"

  ### Finfelt name fixes (10 figures)
  - Each figure gets a unique descriptive name
  - All marked is_standard = true
  - Proper sort_order assigned (1100-1190)

  ## Security
  - No RLS changes
  - No table structure changes
*/

-- ===========================================
-- GROVFELT: Fix generic names to descriptive
-- ===========================================

UPDATE field_figures SET name = 'Sirkel 20cm' WHERE code = 'C20' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Sirkel 25cm' WHERE code = 'C25' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Sirkel 30cm' WHERE code = 'C30' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Sirkel 35cm' WHERE code = 'C35' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Sirkel 40cm' WHERE code = 'C40' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Sirkel 50cm' WHERE code = 'C50' AND name = 'Grovfelt skive';

UPDATE field_figures SET name = 'Stripe 30x10' WHERE code = 'Stripe-30/10' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Stripe 13x40' WHERE code = 'Stripe-13/40' AND name = 'Grovfelt skive';

UPDATE field_figures SET name = 'Spalte 25 horisontal' WHERE code = 'S-25H' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Spalte 25 vertikal' WHERE code = 'S-25V' AND name = 'Grovfelt skive';

UPDATE field_figures SET name = 'En åttendedels figur' WHERE code = '1/8' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'En sjettedels figur' WHERE code = '1/6' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Kvartfigur' WHERE code = '1/4' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Kvartfigur venstre' WHERE code = '1/4V' AND name = 'Grovfelt skive venstre';
UPDATE field_figures SET name = 'Tredjedels figur' WHERE code = '1/3' AND name = 'Grovfelt figur';

UPDATE field_figures SET name = 'Småen' WHERE code = 'Småen' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Sirkel (grovfelt)' WHERE code = 'Sirkel' AND name = 'Grovfelt skive';
UPDATE field_figures SET name = 'Tønne' WHERE code = 'Tønne' AND name = 'Grovfelt skive';

-- ===========================================
-- FINFELT: Fix names, is_standard, sort_order
-- ===========================================

UPDATE field_figures SET
  name = 'Sirkel 15cm',
  is_standard = true,
  sort_order = 1100
WHERE code = 'C15' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Sirkel (finfelt)',
  is_standard = true,
  sort_order = 1110
WHERE code = 'Sirkel Finfelt' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Tønne (finfelt)',
  is_standard = true,
  sort_order = 1120
WHERE code = 'Tønne finfelt' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Hjul',
  is_standard = true,
  sort_order = 1130
WHERE code = 'Hjul' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Prisme',
  is_standard = true,
  sort_order = 1140
WHERE code = 'Prisme' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Mini-kvartfigur',
  is_standard = true,
  sort_order = 1150
WHERE code = 'Mini-1/4' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Mini-tredjedel',
  is_standard = true,
  sort_order = 1160
WHERE code = 'Mini-1/3' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Minismåen',
  is_standard = true,
  sort_order = 1170
WHERE code = 'Minismåen' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'En tiendedels figur',
  is_standard = true,
  sort_order = 1180
WHERE code = '1/10' AND category = 'finfelt';

UPDATE field_figures SET
  name = 'Stripe (finfelt)',
  is_standard = true,
  sort_order = 1190
WHERE code = 'Stripe finfelt' AND category = 'finfelt';
