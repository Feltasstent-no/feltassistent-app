/*
# Add vertical variant of the finfelt Stripe figure (environment-portable)

## Summary
The finfelt discipline has the "Stripe (finfelt)" figure only in its horizontal
orientation (225 x 75 mm). In the field the same figure is also used standing up
(vertical). This migration adds a SECOND, separate `field_figures` record for the
vertical orientation, following the "separate record per orientation" pattern
already used by the grovfelt figures.

## Portability
The row is inserted with `INSERT ... SELECT ... FROM field_figures src WHERE
src.code = 'Stripe finfelt'`, so all environment-specific metadata (notably
`category_id`) is INHERITED from the existing horizontal Stripe record in whatever
database the migration runs against:
  - Where `src.category_id` holds a category UUID, the new figure inherits it.
  - Where `src.category_id IS NULL`, the new figure inherits NULL.
No environment-specific UUID is hardcoded, so the same file is correct in every
environment and mirrors that environment's existing Stripe record.

## Inherited from src (code = 'Stripe finfelt')
category, category_id, difficulty, is_active, aim_points, distance_m,
normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, shape_type,
file_type, is_standard.

## Explicitly new / rotated
- code:        'Stripe finfelt vertikal'
- name:        'Stripe vertikal'
- description: 'Finfelt stripe figur (vertikal)'
- short_code:  'Stripe V'
- width_mm  = src.height_mm  and  height_mm = src.width_mm  (225 x 75 -> 75 x 225)
- svg_data: the existing Stripe geometry rotated 90 degrees (viewBox 770.4 x 1800),
  inner scoring geometry rotated with it, no clipping.

## order_index / sort_order (evaluated separately, NOT inherited)
These are NOT copied from src, because reusing the horizontal figure's ordering
values would collide with it and disturb selector sort order. They stay explicit:
  - order_index = 0    (same neutral value the original insert used)
  - sort_order  = 1191 (deliberate value chosen to place the vertical variant
    directly after the horizontal Stripe in the figure selector)

## Safety
1. The existing horizontal "Stripe (finfelt)" record is NOT modified.
2. No columns, tables, types, or policies change. RLS is untouched.
3. Idempotent: guarded by NOT EXISTS on the unique `code`, so re-running makes
   no further changes (0 inserts on re-run).
4. Source-missing safety: the row comes from SELECT ... FROM field_figures WHERE
   code = 'Stripe finfelt'; if that source record is absent the SELECT yields no
   rows and the statement performs 0 inserts. No partial/fake figure is created and
   no hardcoded fallback UUID is used.
5. No ballistic or click-calculation impact: rotation only swaps presentation
   width/height; click math is driven by distance + click table, not dimensions.
*/

INSERT INTO field_figures (
  code, name, description, category, category_id, difficulty, is_active,
  width_mm, height_mm, aim_points, order_index, distance_m, short_code,
  normal_distance_m, max_distance_m, ag3_hk416_max_distance_m, shape_type,
  file_type, is_standard, sort_order, svg_data
)
SELECT
  'Stripe finfelt vertikal',
  'Stripe vertikal',
  'Finfelt stripe figur (vertikal)',
  src.category,
  src.category_id,
  src.difficulty,
  src.is_active,
  src.height_mm,
  src.width_mm,
  src.aim_points,
  0,
  src.distance_m,
  'Stripe V',
  src.normal_distance_m,
  src.max_distance_m,
  src.ag3_hk416_max_distance_m,
  src.shape_type,
  src.file_type,
  src.is_standard,
  1191,
  '<svg xmlns="http://www.w3.org/2000/svg" id="Layer_1" width="770.4" height="1800" data-name="Layer 1" viewBox="0 0 770.4 1800"><defs><style>.cls-1{fill:#fff}</style></defs><g transform="translate(770.4 0) rotate(90)"><path d="M23.12 5.32v759.76h1753.76V5.32zm1737.76 743.76H39.12V21.32h1721.76z" class="cls-1"/><path d="M39.12 21.32h1721.76v727.76H39.12z"/><path d="M1646.67 652H153.33V132.89h1493.33V652ZM169.33 636h1461.33V148.89H169.33z" class="cls-1"/><path d="M1203.11 500H591.92V284.89h611.19zm-595.18-16h579.19V300.89H607.93z" class="cls-1"/></g></svg>'
FROM field_figures src
WHERE src.code = 'Stripe finfelt'
  AND NOT EXISTS (
    SELECT 1 FROM field_figures existing WHERE existing.code = 'Stripe finfelt vertikal'
  );