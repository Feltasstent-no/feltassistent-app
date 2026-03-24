/*
  # Complete Field Figures Reseed - Part 2: Grovfelt Stripes, Spalter, and Fraction Figures

  Continuation of the complete field_figures reseed with correct DFS data.

  1. Figures in this part
    - Stripe-30/10, Stripe-13/40 (stripe figures)
    - S-25H, S-25V (spalte figures)
    - 1/8, 1/6, 1/4, 1/4V, 1/3 (fraction figures)

  2. Important Notes
    - Uses ON CONFLICT(code) to preserve IDs and FK references
    - All SVGs are professional Layer_1 illustrations
*/

-- Stripe-30/10
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Stripe-30/10', '30/10', 'Stripe 30x10', 'Stripe 30cm/10cm',
  'grovfelt', 'stripe', 300, 100, 145, 180, 90, 100, 300, 0, 6, true, true,
  '<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 586.09">
  <defs>
    <style>
      .cls-1 {
        fill: #fff;
      }
    </style>
  </defs>
  <g>
    <path class="cls-1" d="M47.09,9.94v566.22h1705.82V9.94H47.09ZM1736.91,560.16H63.09V25.94h1673.82v534.22Z"/>
    <rect x="63.09" y="25.94" width="1673.82" height="534.22"/>
  </g>
  <path class="cls-1" d="M1241.33,407.71h-682.67v-229.33h682.67v229.33ZM574.67,391.71h650.67v-197.33h-650.67v197.33Z"/>
</svg>',
  '<?xml version="1.0" encoding="UTF-8"?>
<svg id="Layer_1" data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1800 586.09">
  <defs>
    <style>
      .cls-1 {
        fill: #fff;
      }
    </style>
  </defs>
  <g>
    <path class="cls-1" d="M47.09,9.94v566.22h1705.82V9.94H47.09ZM1736.91,560.16H63.09V25.94h1673.82v534.22Z"/>
    <rect x="63.09" y="25.94" width="1673.82" height="534.22"/>
  </g>
  <path class="cls-1" d="M1241.33,407.71h-682.67v-229.33h682.67v229.33ZM574.67,391.71h650.67v-197.33h-650.67v197.33Z"/>
</svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Stripe-13/40
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Stripe-13/40', '13/40', 'Stripe 13x40', 'Stripe 13cm/40cm',
  'grovfelt', 'stripe', 130, 400, 185, 220, 130, 100, 310, 0, 5, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="5581.59" data-name="Layer 1" viewBox="0 0 1800 5581.59"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M52.11 157.37v5266.86h1695.78V157.37zm1679.78 5250.86H68.11V173.37h1663.78z" class="cls-1"/><path d="M68.11 173.37h1663.78v5234.86H68.11z"/><path d="M1235.89 3845.91H562.11V1735.69h673.78zm-657.78-16h641.78V1751.69H578.11z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="5581.59" data-name="Layer 1" viewBox="0 0 1800 5581.59"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M52.11 157.37v5266.86h1695.78V157.37zm1679.78 5250.86H68.11V173.37h1663.78z" class="cls-1"/><path d="M68.11 173.37h1663.78v5234.86H68.11z"/><path d="M1235.89 3845.91H562.11V1735.69h673.78zm-657.78-16h641.78V1751.69H578.11z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- S-25H
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'S-25H', 'S-25H', 'Spalte 25 horisontal', 'Horisontal spalte 25cm',
  'grovfelt', 'stripe', 625, 250, 280, 330, 190, 100, 320, 0, 4, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="724.77" data-name="Layer 1" viewBox="0 0 1800 724.77"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1734.34 225.42a351 351 0 0 0-75.4-111.84 351 351 0 0 0-111.84-75.4 350 350 0 0 0-136.96-27.66H389.86A350 350 0 0 0 252.9 38.18a351 351 0 0 0-111.84 75.4 351 351 0 0 0-75.4 111.84C47.31 268.8 38 314.88 38 362.38s9.31 93.58 27.66 136.96c17.72 41.9 43.09 79.53 75.4 111.84s69.94 57.68 111.84 75.4a350 350 0 0 0 136.96 27.66h1020.28c47.49 0 93.57-9.3 136.96-27.66 41.9-17.72 79.53-43.09 111.84-75.4s57.68-69.94 75.4-111.84c18.35-43.38 27.66-89.46 27.66-136.96s-9.31-93.58-27.66-136.96m-324.2 472.82H389.86C204.67 698.24 54 547.57 54 362.38S204.67 26.52 389.86 26.52h1020.28c185.19 0 335.86 150.67 335.86 335.86s-150.67 335.86-335.86 335.86" class="cls-1"/><path d="M1746 362.38c0 185.19-150.67 335.86-335.86 335.86H389.86C204.67 698.24 54 547.57 54 362.38S204.67 26.52 389.86 26.52h1020.28c185.19 0 335.86 150.67 335.86 335.86"/><path d="M1096.51 505.86h-408.3c-79.4 0-144-64.6-144-144s64.6-144 144-144h408.3c79.4 0 144 64.6 144 144s-64.6 144-144 144m-408.29-272c-70.58 0-128 57.42-128 128s57.42 128 128 128h408.3c70.58 0 128-57.42 128-128s-57.42-128-128-128z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="724.77" data-name="Layer 1" viewBox="0 0 1800 724.77"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1734.34 225.42a351 351 0 0 0-75.4-111.84 351 351 0 0 0-111.84-75.4 350 350 0 0 0-136.96-27.66H389.86A350 350 0 0 0 252.9 38.18a351 351 0 0 0-111.84 75.4 351 351 0 0 0-75.4 111.84C47.31 268.8 38 314.88 38 362.38s9.31 93.58 27.66 136.96c17.72 41.9 43.09 79.53 75.4 111.84s69.94 57.68 111.84 75.4a350 350 0 0 0 136.96 27.66h1020.28c47.49 0 93.57-9.3 136.96-27.66 41.9-17.72 79.53-43.09 111.84-75.4s57.68-69.94 75.4-111.84c18.35-43.38 27.66-89.46 27.66-136.96s-9.31-93.58-27.66-136.96m-324.2 472.82H389.86C204.67 698.24 54 547.57 54 362.38S204.67 26.52 389.86 26.52h1020.28c185.19 0 335.86 150.67 335.86 335.86s-150.67 335.86-335.86 335.86" class="cls-1"/><path d="M1746 362.38c0 185.19-150.67 335.86-335.86 335.86H389.86C204.67 698.24 54 547.57 54 362.38S204.67 26.52 389.86 26.52h1020.28c185.19 0 335.86 150.67 335.86 335.86"/><path d="M1096.51 505.86h-408.3c-79.4 0-144-64.6-144-144s64.6-144 144-144h408.3c79.4 0 144 64.6 144 144s-64.6 144-144 144m-408.29-272c-70.58 0-128 57.42-128 128s57.42 128 128 128h408.3c70.58 0 128-57.42 128-128s-57.42-128-128-128z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- S-25V
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'S-25V', 'S-25V', 'Spalte 25 vertikal', 'Vertikal spalte 25cm',
  'grovfelt', 'stripe', 250, 625, 315, 380, 210, 100, 330, 0, 4, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="4470.41" data-name="Layer 1" viewBox="0 0 1800 4470.41"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1698.63 622.62c-43.51-102.86-105.8-195.24-185.13-274.57-79.32-79.33-171.7-141.61-274.57-185.12-106.5-45.05-219.63-67.89-336.24-67.89h-5.38c-116.61 0-229.74 22.84-336.24 67.89C458.2 206.44 365.82 268.72 286.5 348.05c-79.33 79.33-141.62 171.71-185.12 274.57-45.05 106.5-67.89 219.63-67.89 336.24v2552.7c0 116.61 22.84 229.74 67.89 336.24 43.5 102.86 105.79 195.24 185.12 274.57 79.32 79.33 171.7 141.61 274.57 185.12 106.5 45.04 219.63 67.89 336.24 67.89h5.38c116.61 0 229.74-22.85 336.24-67.89 102.87-43.51 195.25-105.79 274.57-185.12 79.33-79.33 141.62-171.71 185.13-274.57 45.04-106.5 67.88-219.63 67.88-336.24V958.86c0-116.61-22.84-229.74-67.88-336.24m51.88 2888.94c0 467.49-380.33 847.82-847.82 847.82h-5.38c-467.49 0-847.82-380.33-847.82-847.82V958.86c0-467.49 380.33-847.82 847.82-847.82h5.38c467.49 0 847.82 380.33 847.82 847.82z" class="cls-1"/><rect width="1701.02" height="4248.34" x="49.49" y="111.04" rx="847.82" ry="847.82"/><path d="M1149.6 1460.18a346 346 0 0 0-110.47-74.48c-42.85-18.13-88.37-27.32-135.29-27.32s-92.43 9.19-135.29 27.32a346 346 0 0 0-110.47 74.48 346 346 0 0 0-74.48 110.47 345.5 345.5 0 0 0-27.32 135.29v1023.7c0 46.92 9.19 92.43 27.32 135.29a346 346 0 0 0 74.48 110.47 346 346 0 0 0 110.47 74.48c42.85 18.12 88.37 27.32 135.29 27.32s92.43-9.19 135.29-27.32a347 347 0 0 0 110.47-74.48 346 346 0 0 0 74.48-110.47 345.5 345.5 0 0 0 27.32-135.29v-1023.7c0-46.92-9.19-92.43-27.32-135.29a346 346 0 0 0-74.48-110.47m85.8 1269.47c0 182.82-148.74 331.56-331.55 331.56S572.3 2912.47 572.3 2729.65v-1023.7c0-182.82 148.74-331.56 331.56-331.56s331.55 148.73 331.55 331.56z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="4470.41" data-name="Layer 1" viewBox="0 0 1800 4470.41"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1698.63 622.62c-43.51-102.86-105.8-195.24-185.13-274.57-79.32-79.33-171.7-141.61-274.57-185.12-106.5-45.05-219.63-67.89-336.24-67.89h-5.38c-116.61 0-229.74 22.84-336.24 67.89C458.2 206.44 365.82 268.72 286.5 348.05c-79.33 79.33-141.62 171.71-185.12 274.57-45.05 106.5-67.89 219.63-67.89 336.24v2552.7c0 116.61 22.84 229.74 67.89 336.24 43.5 102.86 105.79 195.24 185.12 274.57 79.32 79.33 171.7 141.61 274.57 185.12 106.5 45.04 219.63 67.89 336.24 67.89h5.38c116.61 0 229.74-22.85 336.24-67.89 102.87-43.51 195.25-105.79 274.57-185.12 79.33-79.33 141.62-171.71 185.13-274.57 45.04-106.5 67.88-219.63 67.88-336.24V958.86c0-116.61-22.84-229.74-67.88-336.24m51.88 2888.94c0 467.49-380.33 847.82-847.82 847.82h-5.38c-467.49 0-847.82-380.33-847.82-847.82V958.86c0-467.49 380.33-847.82 847.82-847.82h5.38c467.49 0 847.82 380.33 847.82 847.82z" class="cls-1"/><rect width="1701.02" height="4248.34" x="49.49" y="111.04" rx="847.82" ry="847.82"/><path d="M1149.6 1460.18a346 346 0 0 0-110.47-74.48c-42.85-18.13-88.37-27.32-135.29-27.32s-92.43 9.19-135.29 27.32a346 346 0 0 0-110.47 74.48 346 346 0 0 0-74.48 110.47 345.5 345.5 0 0 0-27.32 135.29v1023.7c0 46.92 9.19 92.43 27.32 135.29a346 346 0 0 0 74.48 110.47 346 346 0 0 0 110.47 74.48c42.85 18.12 88.37 27.32 135.29 27.32s92.43-9.19 135.29-27.32a347 347 0 0 0 110.47-74.48 346 346 0 0 0 74.48-110.47 345.5 345.5 0 0 0 27.32-135.29v-1023.7c0-46.92-9.19-92.43-27.32-135.29a346 346 0 0 0-74.48-110.47m85.8 1269.47c0 182.82-148.74 331.56-331.55 331.56S572.3 2912.47 572.3 2729.65v-1023.7c0-182.82 148.74-331.56 331.56-331.56s331.55 148.73 331.55 331.56z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- 1/8
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  '1/8', '1/8', 'En åttendedels figur', 'Grovfelt 1/8 seksjon (inactive)',
  'grovfelt', 'rectangle', 370, 210, 215, 280, 150, 215, 400, 0, 1, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1024.25" data-name="Layer 1" viewBox="0 0 1800 1024.25"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1563.01 408.72a568 568 0 0 0-67.12-138.84 548 548 0 0 0-96.47-109.57c-71.08-61.71-158.01-104.85-251.39-124.75S957.69 19.61 867.62 46.99a548 548 0 0 0-132.75 60.72c-43.12 27.19-82.78 60.64-117.9 99.41L45.38 838.33l-2.07 2.29v160.56h1713.38zM59.31 846.79l569.52-628.93C760.3 72.69 953.15 10.39 1144.7 51.21s342.24 176.33 403.1 362.49l186.83 571.48H59.31z" class="cls-1"/><path d="M1734.63 985.18H59.31V846.79l569.52-628.93C760.3 72.69 953.15 10.39 1144.7 51.21s342.24 176.33 403.1 362.49z"/><path d="M632.92 713.67v-70.85l232.44-254.18c54.64-59.75 134.49-85.1 213.58-67.81s141.08 73.64 165.81 150.74l76.45 238.38zm16-64.64v48.55l650.39-3.52-69.79-217.61c-22.96-71.6-80.53-123.94-153.99-139.99s-147.61 7.48-198.35 62.98z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1024.25" data-name="Layer 1" viewBox="0 0 1800 1024.25"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1563.01 408.72a568 568 0 0 0-67.12-138.84 548 548 0 0 0-96.47-109.57c-71.08-61.71-158.01-104.85-251.39-124.75S957.69 19.61 867.62 46.99a548 548 0 0 0-132.75 60.72c-43.12 27.19-82.78 60.64-117.9 99.41L45.38 838.33l-2.07 2.29v160.56h1713.38zM59.31 846.79l569.52-628.93C760.3 72.69 953.15 10.39 1144.7 51.21s342.24 176.33 403.1 362.49l186.83 571.48H59.31z" class="cls-1"/><path d="M1734.63 985.18H59.31V846.79l569.52-628.93C760.3 72.69 953.15 10.39 1144.7 51.21s342.24 176.33 403.1 362.49z"/><path d="M632.92 713.67v-70.85l232.44-254.18c54.64-59.75 134.49-85.1 213.58-67.81s141.08 73.64 165.81 150.74l76.45 238.38zm16-64.64v48.55l650.39-3.52-69.79-217.61c-22.96-71.6-80.53-123.94-153.99-139.99s-147.61 7.48-198.35 62.98z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- 1/6
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  '1/6', '1/6', 'En sjettedels figur', 'Grovfelt 1/6 seksjon (inactive)',
  'grovfelt', 'rectangle', 450, 260, 245, 300, 180, 245, 410, 0, 1, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1033.52" data-name="Layer 1" viewBox="0 0 1800 1033.52"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M617.69 71.88C586.7 48.11 551.77 33.2 513.88 27.57a227.4 227.4 0 0 0-106.61 9.92A227 227 0 0 0 317 95.08c-26.46 27.69-44.89 60.89-54.78 98.69L49.17 1008.35h1701.66V941.1zm1117.14 920.47H69.89L277.7 197.81A209 209 0 0 1 412.46 52.63a209 209 0 0 1 195.49 31.95l1126.88 864.41z" class="cls-1"/><path d="M1734.83 948.99v43.36H69.89L277.7 197.81A209 209 0 0 1 412.46 52.63a209 209 0 0 1 195.49 31.95z"/><path d="M1072.61 753.04H384.04l84.04-323.24a93.7 93.7 0 0 1 60.47-65.23 93.7 93.7 0 0 1 87.77 14.45l456.28 351.42zm-667.88-16h650.23l-448.4-345.35a77.7 77.7 0 0 0-72.82-11.98 77.7 77.7 0 0 0-50.17 54.12z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1033.52" data-name="Layer 1" viewBox="0 0 1800 1033.52"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M617.69 71.88C586.7 48.11 551.77 33.2 513.88 27.57a227.4 227.4 0 0 0-106.61 9.92A227 227 0 0 0 317 95.08c-26.46 27.69-44.89 60.89-54.78 98.69L49.17 1008.35h1701.66V941.1zm1117.14 920.47H69.89L277.7 197.81A209 209 0 0 1 412.46 52.63a209 209 0 0 1 195.49 31.95l1126.88 864.41z" class="cls-1"/><path d="M1734.83 948.99v43.36H69.89L277.7 197.81A209 209 0 0 1 412.46 52.63a209 209 0 0 1 195.49 31.95z"/><path d="M1072.61 753.04H384.04l84.04-323.24a93.7 93.7 0 0 1 60.47-65.23 93.7 93.7 0 0 1 87.77 14.45l456.28 351.42zm-667.88-16h650.23l-448.4-345.35a77.7 77.7 0 0 0-72.82-11.98 77.7 77.7 0 0 0-50.17 54.12z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- 1/4
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  '1/4', '1/4', 'Kvartfigur', 'En fjerdedel skive',
  'grovfelt', 'segment', 490, 330, 280, 350, 225, 100, 420, 0, 4, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1210.74" data-name="Layer 1" viewBox="0 0 1800 1210.74"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1218.23 205.68c-35.96-56.22-83.48-100.18-141.25-130.66-54-28.49-115.2-43.55-176.98-43.55S777.02 46.53 723.02 75.02c-57.77 30.48-105.29 74.44-141.25 130.66L42.4 1048.92l-1.26 1.97v128.38h1717.72v-128.38zm524.63 957.59H57.14v-107.7L595.25 214.3C662.07 109.83 775.99 47.47 900 47.47s237.93 62.36 304.75 166.83l538.11 841.27z" class="cls-1"/><path d="M1742.86 1055.57v107.7H57.14v-107.7L595.25 214.3C662.07 109.83 775.99 47.47 900 47.47s237.93 62.36 304.75 166.83z"/><path d="M1245.97 883.01H545.53v-58.33l218.16-342.14a155.6 155.6 0 0 1 131.68-72.26h.09a155.6 155.6 0 0 1 131.67 72.1l218.83 342.29v58.34Zm-684.44-16h668.44v-37.66L1013.66 491a139.7 139.7 0 0 0-118.19-64.72h-.08a139.7 139.7 0 0 0-118.2 64.86L561.54 829.35z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1210.74" data-name="Layer 1" viewBox="0 0 1800 1210.74"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1218.23 205.68c-35.96-56.22-83.48-100.18-141.25-130.66-54-28.49-115.2-43.55-176.98-43.55S777.02 46.53 723.02 75.02c-57.77 30.48-105.29 74.44-141.25 130.66L42.4 1048.92l-1.26 1.97v128.38h1717.72v-128.38zm524.63 957.59H57.14v-107.7L595.25 214.3C662.07 109.83 775.99 47.47 900 47.47s237.93 62.36 304.75 166.83l538.11 841.27z" class="cls-1"/><path d="M1742.86 1055.57v107.7H57.14v-107.7L595.25 214.3C662.07 109.83 775.99 47.47 900 47.47s237.93 62.36 304.75 166.83z"/><path d="M1245.97 883.01H545.53v-58.33l218.16-342.14a155.6 155.6 0 0 1 131.68-72.26h.09a155.6 155.6 0 0 1 131.67 72.1l218.83 342.29v58.34Zm-684.44-16h668.44v-37.66L1013.66 491a139.7 139.7 0 0 0-118.19-64.72h-.08a139.7 139.7 0 0 0-118.2 64.86L561.54 829.35z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- 1/4V
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  '1/4V', '1/4V', 'Kvartfigur venstre', 'En fjerdedel skive venstre',
  'grovfelt', 'segment', 600, 350, 330, 400, 230, 100, 430, 0, 4, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1044.28" data-name="Layer 1" viewBox="0 0 1800 1044.28"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1740.4 874.96 654.29 78.88c-47.11-34.54-102.03-56.04-158.81-62.19-53.75-5.83-108.99 1.95-159.75 22.49-50.75 20.53-95.86 53.36-130.43 94.93-36.52 43.91-61.03 97.56-70.87 155.14L25.74 925.37a89 89 0 0 0 19.72 72.46 89 89 0 0 0 68.1 31.64h1576.28c37.66 0 69.57-23.13 81.29-58.93 11.71-35.8-.35-73.32-30.73-95.58m15.52 90.61c-7.58 23.16-28.92 47.9-66.08 47.9H113.56c-21.58 0-41.95-9.46-55.87-25.96s-19.82-38.17-16.18-59.45l108.7-636.11c18.44-107.92 90.04-196.87 191.52-237.94A315 315 0 0 1 459.9 30.84c65.41 0 130.02 20.69 184.94 60.94l1086.1 796.08c29.98 21.97 32.56 54.55 24.98 77.71" class="cls-1"/><path d="M1755.92 965.57c-7.58 23.16-28.92 47.9-66.08 47.9H113.56c-21.58 0-41.95-9.46-55.87-25.96s-19.82-38.17-16.18-59.45l108.7-636.11c18.44-107.92 90.04-196.87 191.52-237.94A315 315 0 0 1 459.9 30.84c65.41 0 130.02 20.69 184.94 60.94l1086.1 796.08c29.98 21.97 32.56 54.55 24.98 77.71"/><path d="M997.87 758.44H379.35c-12.98 0-25.17-5.74-33.44-15.75s-11.6-23.06-9.15-35.81l48.6-252.59a133.5 133.5 0 0 1 83.19-99.77 133.6 133.6 0 0 1 128.74 17.36l424.2 315.15a39.05 39.05 0 0 1 13.99 44.24 39.05 39.05 0 0 1-37.61 27.17M517.39 361.3c-14.47 0-29.03 2.68-43.04 8.12a117.6 117.6 0 0 0-73.28 87.88l-48.6 252.59a27.3 27.3 0 0 0 5.77 22.6 27.3 27.3 0 0 0 21.1 9.94h618.52c12.58 0 19.83-8.37 22.42-16.2s1.76-18.87-8.34-26.37l-424.2-315.15a117.8 117.8 0 0 0-70.36-23.41Z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1044.28" data-name="Layer 1" viewBox="0 0 1800 1044.28"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1740.4 874.96 654.29 78.88c-47.11-34.54-102.03-56.04-158.81-62.19-53.75-5.83-108.99 1.95-159.75 22.49-50.75 20.53-95.86 53.36-130.43 94.93-36.52 43.91-61.03 97.56-70.87 155.14L25.74 925.37a89 89 0 0 0 19.72 72.46 89 89 0 0 0 68.1 31.64h1576.28c37.66 0 69.57-23.13 81.29-58.93 11.71-35.8-.35-73.32-30.73-95.58m15.52 90.61c-7.58 23.16-28.92 47.9-66.08 47.9H113.56c-21.58 0-41.95-9.46-55.87-25.96s-19.82-38.17-16.18-59.45l108.7-636.11c18.44-107.92 90.04-196.87 191.52-237.94A315 315 0 0 1 459.9 30.84c65.41 0 130.02 20.69 184.94 60.94l1086.1 796.08c29.98 21.97 32.56 54.55 24.98 77.71" class="cls-1"/><path d="M1755.92 965.57c-7.58 23.16-28.92 47.9-66.08 47.9H113.56c-21.58 0-41.95-9.46-55.87-25.96s-19.82-38.17-16.18-59.45l108.7-636.11c18.44-107.92 90.04-196.87 191.52-237.94A315 315 0 0 1 459.9 30.84c65.41 0 130.02 20.69 184.94 60.94l1086.1 796.08c29.98 21.97 32.56 54.55 24.98 77.71"/><path d="M997.87 758.44H379.35c-12.98 0-25.17-5.74-33.44-15.75s-11.6-23.06-9.15-35.81l48.6-252.59a133.5 133.5 0 0 1 83.19-99.77 133.6 133.6 0 0 1 128.74 17.36l424.2 315.15a39.05 39.05 0 0 1 13.99 44.24 39.05 39.05 0 0 1-37.61 27.17M517.39 361.3c-14.47 0-29.03 2.68-43.04 8.12a117.6 117.6 0 0 0-73.28 87.88l-48.6 252.59a27.3 27.3 0 0 0 5.77 22.6 27.3 27.3 0 0 0 21.1 9.94h618.52c12.58 0 19.83-8.37 22.42-16.2s1.76-18.87-8.34-26.37l-424.2-315.15a117.8 117.8 0 0 0-70.36-23.41Z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- 1/3
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  '1/3', '1/3', 'Tredjedels figur', 'En tredjedel skive',
  'grovfelt', 'segment', 500, 480, 365, 440, 280, 100, 440, 0, 3, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1722.73" data-name="Layer 1" viewBox="0 0 1800 1722.73"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1185.44 192.77c-32.63-49.78-75.4-88.69-127.12-115.65C1009.93 51.9 955.19 38.57 900 38.57S790.06 51.9 741.68 77.12c-51.72 26.96-94.49 65.87-127.12 115.65L43.35 1064.35l-1.31 1.99v617.81h1715.92v-617.81zm556.52 1475.38H58.04v-597.03l569.91-869.58C688.26 109.51 789.96 54.57 900 54.57s211.74 54.94 272.05 146.97l569.91 869.58z" class="cls-1"/><path d="M1741.96 1071.12v597.03H58.04v-597.03l569.91-869.58C688.26 109.51 789.96 54.57 900 54.57s211.74 54.94 272.05 146.97z"/><path d="M1247.33 1274.51H552.66v-247.76l241.31-360.83a127.2 127.2 0 0 1 105.85-56.57h.03c42.59 0 82.15 21.12 105.85 56.51l241.63 360.88zm-678.66-16h662.67v-226.9L992.42 674.77a111.2 111.2 0 0 0-92.55-49.41h-.03c-37.25 0-71.85 18.5-92.56 49.46l-238.61 356.79z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1722.73" data-name="Layer 1" viewBox="0 0 1800 1722.73"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1185.44 192.77c-32.63-49.78-75.4-88.69-127.12-115.65C1009.93 51.9 955.19 38.57 900 38.57S790.06 51.9 741.68 77.12c-51.72 26.96-94.49 65.87-127.12 115.65L43.35 1064.35l-1.31 1.99v617.81h1715.92v-617.81zm556.52 1475.38H58.04v-597.03l569.91-869.58C688.26 109.51 789.96 54.57 900 54.57s211.74 54.94 272.05 146.97l569.91 869.58z" class="cls-1"/><path d="M1741.96 1071.12v597.03H58.04v-597.03l569.91-869.58C688.26 109.51 789.96 54.57 900 54.57s211.74 54.94 272.05 146.97z"/><path d="M1247.33 1274.51H552.66v-247.76l241.31-360.83a127.2 127.2 0 0 1 105.85-56.57h.03c42.59 0 82.15 21.12 105.85 56.51l241.63 360.88zm-678.66-16h662.67v-226.9L992.42 674.77a111.2 111.2 0 0 0-92.55-49.41h-.03c-37.25 0-71.85 18.5-92.56 49.46l-238.61 356.79z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;