/*
  # Correct grovfelt field figure distances from official reference table

  This migration corrects normal_distance_m, max_distance_m, and ag3_hk416_max_distance_m
  for grovfelt figures based on the official DFS figurutvalg reference table (April 2026).

  ## Figures updated (22 figures):
    - B65: ag3 350->385
    - B45: ag3 250->275
    - Tonne: max 425->475, ag3 300->330
    - 1/3: ag3 280->310
    - 1/4: ag3 225->250
    - 1/4V: ag3 230->255
    - 1/6: ag3 180->200
    - 1/8: ag3 150->165
    - 1/9: normal 185->200, ag3 130->150
    - Mini-1/10-G: normal 140->170, max 190->200, ag3 95->140
    - Smaen: ag3 180->200
    - Stripe-13/40: ag3 130->145
    - Sirkel (grovfelt): ag3 185->205
    - C24 (Sirkel 24cm): normal 200->205, ag3 140->160
    - P-figur: normal 185->180, ag3 130->140
    - D-figur: normal 185->230, max 230->280, ag3 130->160
    - C50: ag3 325->360
    - C40: normal 280->325, ag3 225->250
    - C35: ag3 200->195
    - C25: ag3 140->155
    - C20: ag3 120->155

  ## Figures NOT updated (already correct):
    - B100 (525/600/400)
    - S-25H (280/330/190)
    - S-25V (315/380/210)
    - Stripe-30/10 (145/180/90)
    - C30 (230/295/175)

  ## Figures not in reference table (untouched):
    - Skyteskar, Lesjaskiva, L1, L2, L3, Stripe-10/30

  ## Security
    - No RLS changes
    - No schema changes
    - Data correction only
*/

-- B65: ag3 350 -> 385
UPDATE field_figures SET ag3_hk416_max_distance_m = 385
WHERE code = 'B65' AND category = 'grovfelt';

-- B45: ag3 250 -> 275
UPDATE field_figures SET ag3_hk416_max_distance_m = 275
WHERE code = 'B45' AND category = 'grovfelt';

-- Tonne: max 425 -> 475, ag3 300 -> 330
UPDATE field_figures SET max_distance_m = 475, ag3_hk416_max_distance_m = 330
WHERE code = 'Tønne' AND category = 'grovfelt';

-- 1/3: ag3 280 -> 310
UPDATE field_figures SET ag3_hk416_max_distance_m = 310
WHERE code = '1/3' AND category = 'grovfelt';

-- 1/4: ag3 225 -> 250
UPDATE field_figures SET ag3_hk416_max_distance_m = 250
WHERE code = '1/4' AND category = 'grovfelt';

-- 1/4V: ag3 230 -> 255
UPDATE field_figures SET ag3_hk416_max_distance_m = 255
WHERE code = '1/4V' AND category = 'grovfelt';

-- 1/6: ag3 180 -> 200
UPDATE field_figures SET ag3_hk416_max_distance_m = 200
WHERE code = '1/6' AND category = 'grovfelt';

-- 1/8: ag3 150 -> 165
UPDATE field_figures SET ag3_hk416_max_distance_m = 165
WHERE code = '1/8' AND category = 'grovfelt';

-- 1/9: normal 185 -> 200, ag3 130 -> 150
UPDATE field_figures SET normal_distance_m = 200, ag3_hk416_max_distance_m = 150
WHERE code = '1/9' AND category = 'grovfelt';

-- Mini 1/10 (grovfelt): normal 140 -> 170, max 190 -> 200, ag3 95 -> 140
UPDATE field_figures SET normal_distance_m = 170, max_distance_m = 200, ag3_hk416_max_distance_m = 140
WHERE code = 'Mini-1/10-G' AND category = 'grovfelt';

-- Smaen: ag3 180 -> 200
UPDATE field_figures SET ag3_hk416_max_distance_m = 200
WHERE code = 'Småen' AND category = 'grovfelt';

-- Stripe 13/40: ag3 130 -> 145
UPDATE field_figures SET ag3_hk416_max_distance_m = 145
WHERE code = 'Stripe-13/40' AND category = 'grovfelt';

-- Sirkel (grovfelt): ag3 185 -> 205
UPDATE field_figures SET ag3_hk416_max_distance_m = 205
WHERE code = 'Sirkel' AND category = 'grovfelt';

-- C24 (Sirkel 24cm): normal 200 -> 205, ag3 140 -> 160
UPDATE field_figures SET normal_distance_m = 205, ag3_hk416_max_distance_m = 160
WHERE code = 'C24' AND category = 'grovfelt';

-- P-figur: normal 185 -> 180, ag3 130 -> 140
UPDATE field_figures SET normal_distance_m = 180, ag3_hk416_max_distance_m = 140
WHERE code = 'P-figur' AND category = 'grovfelt';

-- D-figur: normal 185 -> 230, max 230 -> 280, ag3 130 -> 160
UPDATE field_figures SET normal_distance_m = 230, max_distance_m = 280, ag3_hk416_max_distance_m = 160
WHERE code = 'D-figur' AND category = 'grovfelt';

-- C50: ag3 325 -> 360
UPDATE field_figures SET ag3_hk416_max_distance_m = 360
WHERE code = 'C50' AND category = 'grovfelt';

-- C40: normal 280 -> 325, ag3 225 -> 250
UPDATE field_figures SET normal_distance_m = 325, ag3_hk416_max_distance_m = 250
WHERE code = 'C40' AND category = 'grovfelt';

-- C35: ag3 200 -> 195
UPDATE field_figures SET ag3_hk416_max_distance_m = 195
WHERE code = 'C35' AND category = 'grovfelt';

-- C25: ag3 140 -> 155
UPDATE field_figures SET ag3_hk416_max_distance_m = 155
WHERE code = 'C25' AND category = 'grovfelt';

-- C20: ag3 120 -> 155
UPDATE field_figures SET ag3_hk416_max_distance_m = 155
WHERE code = 'C20' AND category = 'grovfelt';
