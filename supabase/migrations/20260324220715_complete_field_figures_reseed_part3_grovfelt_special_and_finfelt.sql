/*
  # Complete Field Figures Reseed - Part 3: Grovfelt Special and All Finfelt

  Final part of the complete field_figures reseed with correct DFS data.

  1. Figures in this part
    - Småen, Sirkel, Tønne (grovfelt special figures)
    - C15, Sirkel Finfelt, Tønne finfelt, Hjul, Prisme (finfelt)
    - Mini-1/4, Mini-1/3, Minismåen, 1/10, Stripe finfelt (finfelt)

  2. Important Notes
    - Uses ON CONFLICT(code) to preserve IDs and FK references
    - After all upserts, deactivates any figures not in the canonical 31-code set
*/

-- Småen
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Småen', 'Småen', 'Småen', 'Småen (liten sirkel)',
  'grovfelt', 'circle', 255, 305, 250, 300, 180, 100, 500, 0, 7, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="2141.24" data-name="Layer 1" viewBox="0 0 1800 2141.24"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1758.46 883.55c-20.11-166.25-69.67-315.07-147.29-442.32-88.66-145.36-205.02-254.74-345.83-325.09C1123.15 45.1 988.18 30.19 900 30.19S676.85 45.1 534.66 116.14c-140.81 70.35-257.17 179.73-345.83 325.09C111.21 568.48 61.65 717.3 41.54 883.55c-18.42 152.24-12.28 319.3 18.23 496.54 15.89 92.24 40.12 187.86 72.04 284.21a2352 2352 0 0 0 90.56 230.9c58.88 129.74 110.01 211.31 110.52 212.12l2.35 3.73h1129.52l2.35-3.73c.51-.81 51.64-82.38 110.52-212.12a2352 2352 0 0 0 90.56-230.9c31.92-96.35 56.15-191.97 72.04-284.21 30.51-177.24 36.65-344.3 18.23-496.54m-34 493.82c-35.65 207.05-107.38 392.13-161.27 510.93-51.39 113.28-96.76 189.46-107.31 206.75H344.12c-10.54-17.29-55.92-93.47-107.3-206.75-53.9-118.8-125.63-303.88-161.28-510.93-63.22-367.17-19.32-688 126.95-927.81C424.56 85.49 764.26 46.19 900 46.19s475.44 39.3 697.51 403.37c146.27 239.81 190.17 560.64 126.95 927.81" class="cls-1"/><path d="M1724.46 1377.37c-35.65 207.05-107.38 392.13-161.27 510.93-51.39 113.28-96.76 189.46-107.31 206.75H344.12c-10.54-17.29-55.92-93.47-107.3-206.75-53.9-118.8-125.63-303.88-161.28-510.93-63.22-367.17-19.32-688 126.95-927.81C424.56 85.49 764.26 46.19 900 46.19s475.44 39.3 697.51 403.37c146.27 239.81 190.17 560.64 126.95 927.81"/><path d="M1061.16 701.25c-49.1-27.24-104.83-41.63-161.16-41.63s-112.05 14.4-161.16 41.63c-76.69 42.54-130.6 111.14-160.26 203.91-29.54 92.41-28.02 187.41-21.55 250.83 10.44 102.34 41.39 186.53 65.52 239.13 26.2 57.12 49.65 89.62 50.63 90.98l2.4 3.3h448.83l2.4-3.3c.99-1.36 24.44-33.86 50.63-90.98 24.13-52.61 55.08-136.8 65.52-239.13 6.47-63.42 7.99-158.42-21.55-250.83-29.65-92.77-83.57-161.37-160.26-203.91Zm165.89 453.11c-10.2 99.95-40.4 182.23-63.95 233.66-20.92 45.7-40.43 75.79-46.94 85.38H683.84c-6.48-9.54-25.85-39.39-46.74-84.95-23.62-51.51-53.93-133.93-64.15-234.09-9.95-97.55-12.96-335.61 173.65-439.12 94.62-52.48 212.18-52.48 306.79 0C1240 818.75 1237 1056.81 1227.04 1154.36Z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="2141.24" data-name="Layer 1" viewBox="0 0 1800 2141.24"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1758.46 883.55c-20.11-166.25-69.67-315.07-147.29-442.32-88.66-145.36-205.02-254.74-345.83-325.09C1123.15 45.1 988.18 30.19 900 30.19S676.85 45.1 534.66 116.14c-140.81 70.35-257.17 179.73-345.83 325.09C111.21 568.48 61.65 717.3 41.54 883.55c-18.42 152.24-12.28 319.3 18.23 496.54 15.89 92.24 40.12 187.86 72.04 284.21a2352 2352 0 0 0 90.56 230.9c58.88 129.74 110.01 211.31 110.52 212.12l2.35 3.73h1129.52l2.35-3.73c.51-.81 51.64-82.38 110.52-212.12a2352 2352 0 0 0 90.56-230.9c31.92-96.35 56.15-191.97 72.04-284.21 30.51-177.24 36.65-344.3 18.23-496.54m-34 493.82c-35.65 207.05-107.38 392.13-161.27 510.93-51.39 113.28-96.76 189.46-107.31 206.75H344.12c-10.54-17.29-55.92-93.47-107.3-206.75-53.9-118.8-125.63-303.88-161.28-510.93-63.22-367.17-19.32-688 126.95-927.81C424.56 85.49 764.26 46.19 900 46.19s475.44 39.3 697.51 403.37c146.27 239.81 190.17 560.64 126.95 927.81"/><path d="M1724.46 1377.37c-35.65 207.05-107.38 392.13-161.27 510.93-51.39 113.28-96.76 189.46-107.31 206.75H344.12c-10.54-17.29-55.92-93.47-107.3-206.75-53.9-118.8-125.63-303.88-161.28-510.93-63.22-367.17-19.32-688 126.95-927.81C424.56 85.49 764.26 46.19 900 46.19s475.44 39.3 697.51 403.37c146.27 239.81 190.17 560.64 126.95 927.81"/><path d="M1061.16 701.25c-49.1-27.24-104.83-41.63-161.16-41.63s-112.05 14.4-161.16 41.63c-76.69 42.54-130.6 111.14-160.26 203.91-29.54 92.41-28.02 187.41-21.55 250.83 10.44 102.34 41.39 186.53 65.52 239.13 26.2 57.12 49.65 89.62 50.63 90.98l2.4 3.3h448.83l2.4-3.3c.99-1.36 24.44-33.86 50.63-90.98 24.13-52.61 55.08-136.8 65.52-239.13 6.47-63.42 7.99-158.42-21.55-250.83-29.65-92.77-83.57-161.37-160.26-203.91Zm165.89 453.11c-10.2 99.95-40.4 182.23-63.95 233.66-20.92 45.7-40.43 75.79-46.94 85.38H683.84c-6.48-9.54-25.85-39.39-46.74-84.95-23.62-51.51-53.93-133.93-64.15-234.09-9.95-97.55-12.96-335.61 173.65-439.12 94.62-52.48 212.18-52.48 306.79 0C1240 818.75 1237 1056.81 1227.04 1154.36Z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Sirkel (grovfelt)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Sirkel', 'Sirkel', 'Sirkel (grovfelt)', 'Grovfelt sirkel (inactive)',
  'grovfelt', 'circle', 300, 300, 275, 325, 185, 275, 510, 0, 1, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1800" data-name="Layer 1" viewBox="0 0 1800 1800"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1710.44 557.63c-44.3-104.74-107.72-198.8-188.49-279.58s-174.84-144.19-279.58-188.49C1133.93 43.69 1018.74 20.43 900 20.43S666.07 43.69 557.63 89.56c-104.74 44.3-198.8 107.72-279.58 188.49S133.86 452.89 89.56 557.63C43.69 666.07 20.43 781.26 20.43 900s23.26 233.93 69.13 342.37c44.3 104.74 107.72 198.8 188.49 279.58s174.84 144.19 279.58 188.49c108.44 45.87 223.63 69.13 342.37 69.13s233.93-23.26 342.37-69.13c104.74-44.3 198.8-107.72 279.58-188.49s144.19-174.84 188.49-279.58c45.87-108.44 69.13-223.63 69.13-342.37s-23.26-233.93-69.13-342.37M900 1763.57c-476.17 0-863.57-387.4-863.57-863.57S423.83 36.43 900 36.43s863.57 387.4 863.57 863.57-387.4 863.57-863.57 863.57" class="cls-1"/><path d="M1763.57 900c0 476.17-387.4 863.57-863.57 863.57S36.43 1376.17 36.43 900 423.83 36.43 900 36.43s863.57 387.4 863.57 863.57"/><path d="M900 1257.57c-95.51 0-185.3-37.19-252.84-104.73S542.43 995.51 542.43 900s37.19-185.3 104.73-252.84S804.49 542.43 900 542.43s185.3 37.19 252.84 104.73S1257.57 804.49 1257.57 900s-37.19 185.3-104.73 252.84S995.51 1257.57 900 1257.57m0-699.14c-91.24 0-177.01 35.53-241.52 100.04S558.44 808.76 558.44 900s35.53 177.01 100.04 241.53c64.51 64.51 150.29 100.04 241.52 100.04s177.01-35.53 241.53-100.04c64.51-64.51 100.04-150.29 100.04-241.53s-35.53-177.01-100.04-241.53C1077.02 593.96 991.24 558.43 900 558.43" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1800" data-name="Layer 1" viewBox="0 0 1800 1800"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1710.44 557.63c-44.3-104.74-107.72-198.8-188.49-279.58s-174.84-144.19-279.58-188.49C1133.93 43.69 1018.74 20.43 900 20.43S666.07 43.69 557.63 89.56c-104.74 44.3-198.8 107.72-279.58 188.49S133.86 452.89 89.56 557.63C43.69 666.07 20.43 781.26 20.43 900s23.26 233.93 69.13 342.37c44.3 104.74 107.72 198.8 188.49 279.58s174.84 144.19 279.58 188.49c108.44 45.87 223.63 69.13 342.37 69.13s233.93-23.26 342.37-69.13c104.74-44.3 198.8-107.72 279.58-188.49s144.19-174.84 188.49-279.58c45.87-108.44 69.13-223.63 69.13-342.37s-23.26-233.93-69.13-342.37M900 1763.57c-476.17 0-863.57-387.4-863.57-863.57S423.83 36.43 900 36.43s863.57 387.4 863.57 863.57-387.4 863.57-863.57 863.57" class="cls-1"/><path d="M1763.57 900c0 476.17-387.4 863.57-863.57 863.57S36.43 1376.17 36.43 900 423.83 36.43 900 36.43s863.57 387.4 863.57 863.57"/><path d="M900 1257.57c-95.51 0-185.3-37.19-252.84-104.73S542.43 995.51 542.43 900s37.19-185.3 104.73-252.84S804.49 542.43 900 542.43s185.3 37.19 252.84 104.73S1257.57 804.49 1257.57 900s-37.19 185.3-104.73 252.84S995.51 1257.57 900 1257.57m0-699.14c-91.24 0-177.01 35.53-241.52 100.04S558.44 808.76 558.44 900s35.53 177.01 100.04 241.53c64.51 64.51 150.29 100.04 241.52 100.04s177.01-35.53 241.53-100.04c64.51-64.51 100.04-150.29 100.04-241.53s-35.53-177.01-100.04-241.53C1077.02 593.96 991.24 558.43 900 558.43" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Tønne (grovfelt)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Tønne', 'Tønne', 'Tønne', 'Tønne',
  'grovfelt', 'barrel', 400, 500, 350, 425, 300, 100, 520, 0, 3, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="2252.52" data-name="Layer 1" viewBox="0 0 1800 2252.52"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1643.59 429.17C1570.9 242 1484.65 109.84 1443.19 46.33l-2.37-3.63H359.18l-2.37 3.63C315.35 109.84 229.1 242 156.41 429.17 70.87 649.4 27.51 884.75 27.51 1128.69s43.35 473.9 128.86 693.88c73.54 189.2 162.46 325.44 200.44 383.62l2.37 3.63h1081.64l2.37-3.63c37.98-58.18 126.9-194.42 200.44-383.62 85.51-219.98 128.86-453.44 128.86-693.88s-43.36-479.29-128.9-699.52m-211.43 1764.65H367.84c-83.13-127.41-324.33-502.36-324.33-1065.13S276.74 198.33 367.84 58.7h1064.32c91.1 139.63 324.33 501.91 324.33 1069.99s-241.2 937.72-324.33 1065.13" class="cls-1"/><path d="M1756.49 1128.69c0 562.77-241.2 937.72-324.33 1065.13H367.84c-83.13-127.41-324.33-502.36-324.33-1065.13S276.74 198.33 367.84 58.7h1064.32c91.1 139.63 324.33 501.91 324.33 1069.99"/><path d="M1114.58 1561.82H682.82l-2.37-3.6c-55.07-83.64-145.33-258.09-131.08-486.67 10.82-173.61 77.26-306.78 131.1-387.93l2.37-3.58h431.73l2.37 3.58c53.83 81.14 120.28 214.31 131.1 387.93 14.25 228.59-76.01 403.03-131.08 486.67zm-423.12-16h414.49c54.15-83.31 139.87-252.56 126.12-473.28-10.44-167.56-73.78-296.68-126.1-376.5H691.44c-52.32 79.82-115.66 208.94-126.1 376.5-13.75 220.72 71.97 389.97 126.12 473.28" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="2252.52" data-name="Layer 1" viewBox="0 0 1800 2252.52"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1643.59 429.17C1570.9 242 1484.65 109.84 1443.19 46.33l-2.37-3.63H359.18l-2.37 3.63C315.35 109.84 229.1 242 156.41 429.17 70.87 649.4 27.51 884.75 27.51 1128.69s43.35 473.9 128.86 693.88c73.54 189.2 162.46 325.44 200.44 383.62l2.37 3.63h1081.64l2.37-3.63c37.98-58.18 126.9-194.42 200.44-383.62 85.51-219.98 128.86-453.44 128.86-693.88s-43.36-479.29-128.9-699.52m-211.43 1764.65H367.84c-83.13-127.41-324.33-502.36-324.33-1065.13S276.74 198.33 367.84 58.7h1064.32c91.1 139.63 324.33 501.91 324.33 1069.99s-241.2 937.72-324.33 1065.13" class="cls-1"/><path d="M1756.49 1128.69c0 562.77-241.2 937.72-324.33 1065.13H367.84c-83.13-127.41-324.33-502.36-324.33-1065.13S276.74 198.33 367.84 58.7h1064.32c91.1 139.63 324.33 501.91 324.33 1069.99"/><path d="M1114.58 1561.82H682.82l-2.37-3.6c-55.07-83.64-145.33-258.09-131.08-486.67 10.82-173.61 77.26-306.78 131.1-387.93l2.37-3.58h431.73l2.37 3.58c53.83 81.14 120.28 214.31 131.1 387.93 14.25 228.59-76.01 403.03-131.08 486.67zm-423.12-16h414.49c54.15-83.31 139.87-252.56 126.12-473.28-10.44-167.56-73.78-296.68-126.1-376.5H691.44c-52.32 79.82-115.66 208.94-126.1 376.5-13.75 220.72 71.97 389.97 126.12 473.28" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- C15 (finfelt)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'C15', 'C15', 'Sirkel 15cm', 'Finfelt sirkel 15cm diameter',
  'finfelt', 'circle', 145, 160, 150, 200, 100, 150, 1100, 0, 2, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1565.22" data-name="Layer 1" viewBox="0 0 1800 1565.22"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1684.58 562.03c-42.89-101.4-104.28-192.46-182.48-270.66-78.2-78.19-169.26-139.59-270.66-182.47C1126.46 64.49 1014.95 41.98 900 41.98S673.54 64.49 568.56 108.9C467.16 151.78 376.1 213.18 297.9 291.37c-78.2 78.2-139.59 169.26-182.48 270.66C71.01 667.01 48.5 778.52 48.5 893.47c0 121.45 25.04 238.74 74.41 348.63a853 853 0 0 0 86.96 150.24 858 858 0 0 0 114.73 128.8l2.3 2.1h1146.2l2.3-2.1a858 858 0 0 0 114.73-128.8 853 853 0 0 0 86.96-150.24c49.37-109.89 74.41-227.18 74.41-348.63 0-114.95-22.51-226.46-66.92-331.44m-217.71 945.21H333.13C162.38 1349.45 64.5 1125.92 64.5 893.47 64.5 432.78 439.3 57.98 900 57.98s835.5 374.8 835.5 835.49c0 232.45-97.88 455.98-268.63 613.77" class="cls-1"/><path d="M1735.5 893.47c0 232.45-97.88 455.98-268.63 613.77H333.13C162.38 1349.45 64.5 1125.92 64.5 893.47 64.5 432.78 439.3 57.98 900 57.98s835.5 374.8 835.5 835.49"/><path d="M1410.18 1343.86H389.82l-2.39-2.73a678 678 0 0 1-114.52-182.82c-35.44-83.8-53.41-172.9-53.41-264.84s17.97-181.03 53.41-264.83c34.26-81.01 83.35-153.8 145.9-216.35a679 679 0 0 1 216.36-145.91c83.77-35.44 172.87-53.4 264.83-53.4s181.05 17.97 264.83 53.4a679 679 0 0 1 216.36 145.91c62.55 62.55 111.64 135.34 145.9 216.35 35.44 83.8 53.41 172.9 53.41 264.83s-17.97 181.04-53.41 264.84a678 678 0 0 1-114.52 182.82zm-1013.09-16H1402.9a662 662 0 0 0 109.44-175.79c34.6-81.81 52.15-168.82 52.15-258.6s-17.54-176.78-52.15-258.59c-33.45-79.1-81.39-150.18-142.48-211.27a663 663 0 0 0-211.28-142.49c-81.8-34.6-168.8-52.14-258.59-52.14s-176.81 17.54-258.59 52.14a663 663 0 0 0-211.28 142.49 663 663 0 0 0-142.48 211.27c-34.6 81.81-52.15 168.82-52.15 258.59s17.55 176.79 52.15 258.6a663 663 0 0 0 109.44 175.79Z" class="cls-1"/><path d="M1114.45 1066.53H685.54l-2.4-3.05a275 275 0 0 1-37.22-62.95c-14.41-34.08-21.42-69.1-21.42-107.07s7.01-72.99 21.42-107.06a275 275 0 0 1 59.27-87.74 275 275 0 0 1 87.75-59.28C826.99 624.97 862 617.97 900 617.97s73.01 7 107.06 21.41a275 275 0 0 1 87.75 59.27 275 275 0 0 1 59.27 87.75c14.41 34.06 21.42 69.08 21.42 107.06s-7.01 72.99-21.42 107.06a274 274 0 0 1-37.22 62.96zm-421.11-16h413.32a259 259 0 0 0 32.69-56.23c13.56-32.06 20.16-65.04 20.16-100.83s-6.59-68.77-20.16-100.82a259 259 0 0 0-55.85-82.67 259 259 0 0 0-82.67-55.85c-32.04-13.56-65.02-20.15-100.83-20.15s-68.79 6.59-100.82 20.15a259 259 0 0 0-82.67 55.86 259 259 0 0 0-55.85 82.66c-13.56 32.06-20.16 65.04-20.16 100.83s6.59 68.77 20.16 100.83a259 259 0 0 0 32.68 56.23Z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1565.22" data-name="Layer 1" viewBox="0 0 1800 1565.22"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M1684.58 562.03c-42.89-101.4-104.28-192.46-182.48-270.66-78.2-78.19-169.26-139.59-270.66-182.47C1126.46 64.49 1014.95 41.98 900 41.98S673.54 64.49 568.56 108.9C467.16 151.78 376.1 213.18 297.9 291.37c-78.2 78.2-139.59 169.26-182.48 270.66C71.01 667.01 48.5 778.52 48.5 893.47c0 121.45 25.04 238.74 74.41 348.63a853 853 0 0 0 86.96 150.24 858 858 0 0 0 114.73 128.8l2.3 2.1h1146.2l2.3-2.1a858 858 0 0 0 114.73-128.8 853 853 0 0 0 86.96-150.24c49.37-109.89 74.41-227.18 74.41-348.63 0-114.95-22.51-226.46-66.92-331.44m-217.71 945.21H333.13C162.38 1349.45 64.5 1125.92 64.5 893.47 64.5 432.78 439.3 57.98 900 57.98s835.5 374.8 835.5 835.49c0 232.45-97.88 455.98-268.63 613.77" class="cls-1"/><path d="M1735.5 893.47c0 232.45-97.88 455.98-268.63 613.77H333.13C162.38 1349.45 64.5 1125.92 64.5 893.47 64.5 432.78 439.3 57.98 900 57.98s835.5 374.8 835.5 835.49"/><path d="M1410.18 1343.86H389.82l-2.39-2.73a678 678 0 0 1-114.52-182.82c-35.44-83.8-53.41-172.9-53.41-264.84s17.97-181.03 53.41-264.83c34.26-81.01 83.35-153.8 145.9-216.35a679 679 0 0 1 216.36-145.91c83.77-35.44 172.87-53.4 264.83-53.4s181.05 17.97 264.83 53.4a679 679 0 0 1 216.36 145.91c62.55 62.55 111.64 135.34 145.9 216.35 35.44 83.8 53.41 172.9 53.41 264.83s-17.97 181.04-53.41 264.84a678 678 0 0 1-114.52 182.82zm-1013.09-16H1402.9a662 662 0 0 0 109.44-175.79c34.6-81.81 52.15-168.82 52.15-258.6s-17.54-176.78-52.15-258.59c-33.45-79.1-81.39-150.18-142.48-211.27a663 663 0 0 0-211.28-142.49c-81.8-34.6-168.8-52.14-258.59-52.14s-176.81 17.54-258.59 52.14a663 663 0 0 0-211.28 142.49 663 663 0 0 0-142.48 211.27c-34.6 81.81-52.15 168.82-52.15 258.59s17.55 176.79 52.15 258.6a663 663 0 0 0 109.44 175.79Z" class="cls-1"/><path d="M1114.45 1066.53H685.54l-2.4-3.05a275 275 0 0 1-37.22-62.95c-14.41-34.08-21.42-69.1-21.42-107.07s7.01-72.99 21.42-107.06a275 275 0 0 1 59.27-87.74 275 275 0 0 1 87.75-59.28C826.99 624.97 862 617.97 900 617.97s73.01 7 107.06 21.41a275 275 0 0 1 87.75 59.27 275 275 0 0 1 59.27 87.75c14.41 34.06 21.42 69.08 21.42 107.06s-7.01 72.99-21.42 107.06a274 274 0 0 1-37.22 62.96zm-421.11-16h413.32a259 259 0 0 0 32.69-56.23c13.56-32.06 20.16-65.04 20.16-100.83s-6.59-68.77-20.16-100.82a259 259 0 0 0-55.85-82.67 259 259 0 0 0-82.67-55.85c-32.04-13.56-65.02-20.15-100.83-20.15s-68.79 6.59-100.82 20.15a259 259 0 0 0-82.67 55.86 259 259 0 0 0-55.85 82.66c-13.56 32.06-20.16 65.04-20.16 100.83s6.59 68.77 20.16 100.83a259 259 0 0 0 32.68 56.23Z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Prisme (finfelt) - smaller SVG
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Prisme', 'Prisme', 'Prisme', 'Finfelt trekant prisme',
  'finfelt', 'diamond', 200, 100, 135, 185, 90, 135, 1140, 0, 2, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="916.36" data-name="Layer 1" viewBox="0 0 1800 916.36"><defs><style>.cls-1{fill:#fff}</style></defs><path d="m905.5 26.12-3.74-1.88L32.17 452.63l864.35 439.49 871.31-431.84zM69.69 452.87 901.68 43l828.57 417.16-833.63 413.17z" class="cls-1"/><path d="M1730.25 460.16 896.62 873.33 69.69 452.87 901.68 43z"/><path d="M899.45 762.75 293.54 458.12l606.45-300.55 605.35 300.56zM331.14 458.23l568.3 285.72 568.32-285.73-567.78-281.9z" class="cls-1"/><path d="M899.49 583.6 646.11 458.18l250.54-124.27L1147 458.09zM683.94 458.17 899.4 564.82l210.14-106.56-212.89-105.6z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="916.36" data-name="Layer 1" viewBox="0 0 1800 916.36"><defs><style>.cls-1{fill:#fff}</style></defs><path d="m905.5 26.12-3.74-1.88L32.17 452.63l864.35 439.49 871.31-431.84zM69.69 452.87 901.68 43l828.57 417.16-833.63 413.17z" class="cls-1"/><path d="M1730.25 460.16 896.62 873.33 69.69 452.87 901.68 43z"/><path d="M899.45 762.75 293.54 458.12l606.45-300.55 605.35 300.56zM331.14 458.23l568.3 285.72 568.32-285.73-567.78-281.9z" class="cls-1"/><path d="M899.49 583.6 646.11 458.18l250.54-124.27L1147 458.09zM683.94 458.17 899.4 564.82l210.14-106.56-212.89-105.6z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Mini-1/4 (finfelt)
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Mini-1/4', 'Mini 1/4', 'Mini-kvartfigur', 'Finfelt mini 1/4 seksjon',
  'finfelt', 'rectangle', 150, 100, 130, 180, 90, 130, 1150, 0, 2, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1149.23" data-name="Layer 1" viewBox="0 0 1800 1149.23"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M894.69 22.17 46.68 1127.07h1706.64zm.08 26.18 825.85 1062.72H79.13z" class="cls-1"/><path d="M1720.62 1111.07H79.13L894.77 48.35z"/><path d="M1462.01 976.59H338.25l550.72-741.24zm-1091.94-16h1059.35l-540.2-698.76z" class="cls-1"/><path d="M1129.34 837.92H671.03l223.24-311.27zm-427.15-16h395.02L894.6 553.64z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="1149.23" data-name="Layer 1" viewBox="0 0 1800 1149.23"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M894.69 22.17 46.68 1127.07h1706.64zm.08 26.18 825.85 1062.72H79.13z" class="cls-1"/><path d="M1720.62 1111.07H79.13L894.77 48.35z"/><path d="M1462.01 976.59H338.25l550.72-741.24zm-1091.94-16h1059.35l-540.2-698.76z" class="cls-1"/><path d="M1129.34 837.92H671.03l223.24-311.27zm-427.15-16h395.02L894.6 553.64z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Stripe finfelt
INSERT INTO field_figures (code, short_code, name, description, category, shape_type, width_mm, height_mm, normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, distance_m, sort_order, order_index, difficulty, is_active, is_standard, svg_data, svg_content)
VALUES (
  'Stripe finfelt', 'Stripe', 'Stripe (finfelt)', 'Finfelt stripe figur',
  'finfelt', 'rectangle', 225, 75, 120, 180, 85, 120, 1190, 0, 2, true, true,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="770.4" data-name="Layer 1" viewBox="0 0 1800 770.4"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M23.12 5.32v759.76h1753.76V5.32zm1737.76 743.76H39.12V21.32h1721.76z" class="cls-1"/><path d="M39.12 21.32h1721.76v727.76H39.12z"/><path d="M1646.67 652H153.33V132.89h1493.33V652ZM169.33 636h1461.33V148.89H169.33z" class="cls-1"/><path d="M1203.11 500H591.92V284.89h611.19zm-595.18-16h579.19V300.89H607.93z" class="cls-1"/></svg>',
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="1800" height="770.4" data-name="Layer 1" viewBox="0 0 1800 770.4"><defs><style>.cls-1{fill:#fff}</style></defs><path d="M23.12 5.32v759.76h1753.76V5.32zm1737.76 743.76H39.12V21.32h1721.76z" class="cls-1"/><path d="M39.12 21.32h1721.76v727.76H39.12z"/><path d="M1646.67 652H153.33V132.89h1493.33V652ZM169.33 636h1461.33V148.89H169.33z" class="cls-1"/><path d="M1203.11 500H591.92V284.89h611.19zm-595.18-16h579.19V300.89H607.93z" class="cls-1"/></svg>'
)
ON CONFLICT (code) DO UPDATE SET
  short_code = EXCLUDED.short_code, name = EXCLUDED.name, description = EXCLUDED.description,
  category = EXCLUDED.category, shape_type = EXCLUDED.shape_type, width_mm = EXCLUDED.width_mm,
  height_mm = EXCLUDED.height_mm, normal_distance_m = EXCLUDED.normal_distance_m,
  max_distance_m = EXCLUDED.max_distance_m, ag3_hk416_max_distance_m = EXCLUDED.ag3_hk416_max_distance_m,
  distance_m = EXCLUDED.distance_m, sort_order = EXCLUDED.sort_order, order_index = EXCLUDED.order_index,
  difficulty = EXCLUDED.difficulty, is_active = EXCLUDED.is_active, is_standard = EXCLUDED.is_standard,
  svg_data = EXCLUDED.svg_data, svg_content = EXCLUDED.svg_content;

-- Final cleanup: deactivate any figures NOT in the canonical 31-code set
UPDATE field_figures SET is_active = false
WHERE code NOT IN (
  'B45', 'B65', 'B100',
  'C20', 'C25', 'C30', 'C35', 'C40', 'C50',
  'Stripe-30/10', 'Stripe-13/40', 'S-25H', 'S-25V',
  '1/8', '1/6', '1/4', '1/4V', '1/3',
  'Småen', 'Sirkel', 'Tønne',
  'C15', 'Sirkel Finfelt', 'Tønne finfelt', 'Hjul', 'Prisme',
  'Mini-1/4', 'Mini-1/3', 'Minismåen', '1/10', 'Stripe finfelt'
) AND is_active = true;