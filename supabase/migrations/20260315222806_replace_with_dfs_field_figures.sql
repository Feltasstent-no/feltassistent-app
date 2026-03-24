/*
  # Replace with DFS Standard Field Figures

  1. Changes
    - Delete existing generic field figures
    - Add columns for normal_distance and max_distance
    - Insert DFS approved grovfeltfigurer with proper codes and SVG data

  2. New Figures
    - B100 - Silhuett (bear silhouette)
    - B65 - Silhuett
    - B45 - Silhuett
    - C50 - Sirkel
    - C40 - Sirkel
    - C35 - Sirkel
    - C30 - Sirkel
    - C25 - Sirkel
    - C20 - Sirkel
    - S-25 vertikal - Spalte
    - S-25 horisontal - Spalte
    - Stripe 13/40 - Stripe
    - Stripe 30/10 - Stripe
    - 1/3 - Skive
    - 1/4 - Skive
    - 1/4 venstre - Skive
    - Småen - Skive
    - Tønne - Tønne

  3. Notes
    - All figures use standard DFS codes
    - SVG data represents simplified geometric shapes
    - Distances are in meters
*/

-- Delete existing figures
DELETE FROM field_figures;

-- Add distance columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'normal_distance'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN normal_distance integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'field_figures' AND column_name = 'max_distance'
  ) THEN
    ALTER TABLE field_figures ADD COLUMN max_distance integer;
  END IF;
END $$;

-- Insert DFS field figures
INSERT INTO field_figures (code, name, description, category, difficulty, normal_distance, max_distance, svg_data, is_active) VALUES

-- B-series (Silhuett/Bjørn)
('B100', 'Silhuett', 'Stor bjørnesilhuett', 'silhuett', 1, 100, 150, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="10" width="60" height="80" fill="#1f2937" rx="5"/><circle cx="50" cy="20" r="12" fill="#1f2937"/></svg>', 
true),

('B65', 'Silhuett', 'Mellom bjørnesilhuett', 'silhuett', 2, 65, 100, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="25" y="15" width="50" height="70" fill="#1f2937" rx="4"/><circle cx="50" cy="22" r="10" fill="#1f2937"/></svg>', 
true),

('B45', 'Silhuett', 'Liten bjørnesilhuett', 'silhuett', 3, 45, 80, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="20" width="40" height="60" fill="#1f2937" rx="3"/><circle cx="50" cy="26" r="8" fill="#1f2937"/></svg>', 
true),

-- C-series (Sirkel)
('C50', 'Sirkel', 'Sirkel 50cm', 'sirkel', 1, 50, 100, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="none" stroke="#1f2937" stroke-width="3"/><circle cx="50" cy="50" r="25" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="#1f2937"/></svg>', 
true),

('C40', 'Sirkel', 'Sirkel 40cm', 'sirkel', 2, 40, 80, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="38" fill="none" stroke="#1f2937" stroke-width="3"/><circle cx="50" cy="50" r="23" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="50" cy="50" r="9" fill="#1f2937"/></svg>', 
true),

('C35', 'Sirkel', 'Sirkel 35cm', 'sirkel', 3, 35, 70, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="36" fill="none" stroke="#1f2937" stroke-width="3"/><circle cx="50" cy="50" r="21" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="50" cy="50" r="8" fill="#1f2937"/></svg>', 
true),

('C30', 'Sirkel', 'Sirkel 30cm', 'sirkel', 4, 30, 60, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="34" fill="none" stroke="#1f2937" stroke-width="3"/><circle cx="50" cy="50" r="19" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="50" cy="50" r="7" fill="#1f2937"/></svg>', 
true),

('C25', 'Sirkel', 'Sirkel 25cm', 'sirkel', 5, 25, 50, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="32" fill="none" stroke="#1f2937" stroke-width="3"/><circle cx="50" cy="50" r="17" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="50" cy="50" r="6" fill="#1f2937"/></svg>', 
true),

('C20', 'Sirkel', 'Sirkel 20cm', 'sirkel', 6, 20, 40, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30" fill="none" stroke="#1f2937" stroke-width="3"/><circle cx="50" cy="50" r="15" fill="none" stroke="#1f2937" stroke-width="2"/><circle cx="50" cy="50" r="5" fill="#1f2937"/></svg>', 
true),

-- S-series (Spalte)
('S-25V', 'Spalte vertikal', 'Vertikal spalte 25cm', 'spalte', 4, 25, 50, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="40" y="10" width="20" height="80" fill="#1f2937" rx="2"/></svg>', 
true),

('S-25H', 'Spalte horisontal', 'Horisontal spalte 25cm', 'spalte', 4, 25, 50, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="40" width="80" height="20" fill="#1f2937" rx="2"/></svg>', 
true),

-- Stripe series
('STRIPE-13/40', 'Stripe 13/40', 'Stripe 13cm/40cm', 'stripe', 5, 30, 60, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="35" y="10" width="30" height="80" fill="none" stroke="#1f2937" stroke-width="2"/><rect x="42" y="20" width="16" height="60" fill="#1f2937"/></svg>', 
true),

('STRIPE-30/10', 'Stripe 30/10', 'Stripe 30cm/10cm', 'stripe', 6, 20, 40, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect x="30" y="15" width="40" height="70" fill="none" stroke="#1f2937" stroke-width="2"/><rect x="42.5" y="25" width="15" height="50" fill="#1f2937"/></svg>', 
true),

-- Skive series
('1/3', '1/3 Skive', 'En tredjedel skive', 'skive', 3, 40, 80, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" fill="none" stroke="#1f2937" stroke-width="2"/><path d="M 50 50 L 80 35 A 35 35 0 0 1 80 65 Z" fill="#1f2937"/></svg>', 
true),

('1/4', '1/4 Skive', 'En fjerdedel skive', 'skive', 4, 35, 70, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" fill="none" stroke="#1f2937" stroke-width="2"/><path d="M 50 50 L 50 15 A 35 35 0 0 1 85 50 Z" fill="#1f2937"/></svg>', 
true),

('1/4V', '1/4 Skive venstre', 'En fjerdedel skive venstre', 'skive', 4, 35, 70, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="35" fill="none" stroke="#1f2937" stroke-width="2"/><path d="M 50 50 L 15 50 A 35 35 0 0 1 50 15 Z" fill="#1f2937"/></svg>', 
true),

-- Special figures
('SMAEN', 'Småen', 'Småen (liten sirkel)', 'skive', 7, 15, 30, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="25" fill="none" stroke="#1f2937" stroke-width="3"/><circle cx="50" cy="50" r="12" fill="#1f2937"/></svg>', 
true),

('TONNE', 'Tønne', 'Tønne', 'tønne', 3, 40, 80, 
'<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><ellipse cx="50" cy="50" rx="28" ry="38" fill="none" stroke="#1f2937" stroke-width="3"/><ellipse cx="50" cy="30" rx="28" ry="8" fill="none" stroke="#1f2937" stroke-width="2"/><ellipse cx="50" cy="50" rx="28" ry="8" fill="none" stroke="#1f2937" stroke-width="2"/><ellipse cx="50" cy="70" rx="28" ry="8" fill="none" stroke="#1f2937" stroke-width="2"/></svg>', 
true);
