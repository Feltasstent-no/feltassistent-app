/*
# Create ammunition_batches table

1. New Tables
   - `ammunition_batches`
     - `id` (uuid, primary key)
     - `user_id` (uuid, FK to auth.users, CASCADE)
     - `ammo_inventory_id` (uuid, FK to ammo_inventory, NO ACTION)
     - Identity: batch_number, ammo_origin (factory/reloaded), production_date, quantity_produced, status
     - Bullet: manufacturer, model, type, weight_gr, lot_number
     - Powder: manufacturer, type, charge_gr, lot_number
     - Primer: manufacturer, type, lot_number
     - Case: manufacturer, lot_number, reload_count, batch_reference, marking_color, marking_note
     - Dimensions: col_mm, cbto_mm, case_length_mm, sizing_method, crimp, load_data_source
     - General: notes, created_at, updated_at

2. Indexes
   - idx_ammunition_batches_user_id
   - idx_ammunition_batches_ammo_inventory_id
   - idx_ammunition_batches_status

3. Trigger
   - updated_at auto-update via public.update_updated_at_column()

4. Security
   - RLS enabled
   - 4 separate policies (select/insert/update/delete) scoped to authenticated
   - INSERT and UPDATE verify ownership of referenced ammo_inventory row

5. Data quality CHECKs
   - quantity_produced >= 0, case_reload_count >= 0
   - bullet_weight_gr > 0, powder_charge_gr > 0
   - col_mm > 0, cbto_mm > 0, case_length_mm > 0
   - ammo_origin IN ('factory','reloaded')
   - status IN ('test_batch','in_use','blocked','depleted','archived')
   - case_marking_color IN ('none','red','blue','green','black','yellow','other')
*/

CREATE TABLE IF NOT EXISTS public.ammunition_batches (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ammo_inventory_id     uuid NOT NULL REFERENCES public.ammo_inventory(id) ON DELETE NO ACTION,

  -- Identity
  batch_number          text,
  ammo_origin           text NOT NULL
                        CHECK (ammo_origin IN ('factory', 'reloaded')),
  production_date       date,
  quantity_produced     integer
                        CHECK (quantity_produced IS NULL OR quantity_produced >= 0),
  status                text NOT NULL DEFAULT 'in_use'
                        CHECK (status IN ('test_batch', 'in_use', 'blocked', 'depleted', 'archived')),

  -- Bullet
  bullet_manufacturer   text,
  bullet_model          text,
  bullet_type           text,
  bullet_weight_gr      numeric
                        CHECK (bullet_weight_gr IS NULL OR bullet_weight_gr > 0),
  bullet_lot_number     text,

  -- Powder
  powder_manufacturer   text,
  powder_type           text,
  powder_charge_gr      numeric(5,2)
                        CHECK (powder_charge_gr IS NULL OR powder_charge_gr > 0),
  powder_lot_number     text,

  -- Primer
  primer_manufacturer   text,
  primer_type           text,
  primer_lot_number     text,

  -- Case
  case_manufacturer     text,
  case_lot_number       text,
  case_reload_count     integer
                        CHECK (case_reload_count IS NULL OR case_reload_count >= 0),
  case_batch_reference  text,
  case_marking_color    text
                        CHECK (case_marking_color IN ('none', 'red', 'blue', 'green', 'black', 'yellow', 'other')),
  case_marking_note     text,

  -- Cartridge dimensions / loading process
  col_mm                numeric(6,2)
                        CHECK (col_mm IS NULL OR col_mm > 0),
  cbto_mm               numeric(6,2)
                        CHECK (cbto_mm IS NULL OR cbto_mm > 0),
  case_length_mm        numeric(6,2)
                        CHECK (case_length_mm IS NULL OR case_length_mm > 0),
  sizing_method         text,
  crimp                 text,
  load_data_source      text,

  -- General
  notes                 text,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ammunition_batches_user_id
  ON public.ammunition_batches(user_id);

CREATE INDEX IF NOT EXISTS idx_ammunition_batches_ammo_inventory_id
  ON public.ammunition_batches(ammo_inventory_id);

CREATE INDEX IF NOT EXISTS idx_ammunition_batches_status
  ON public.ammunition_batches(status);

-- updated_at trigger (reuses existing generic function in public schema)
DROP TRIGGER IF EXISTS update_ammunition_batches_updated_at ON public.ammunition_batches;
CREATE TRIGGER update_ammunition_batches_updated_at
  BEFORE UPDATE ON public.ammunition_batches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Row Level Security
ALTER TABLE public.ammunition_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_batches" ON public.ammunition_batches;
CREATE POLICY "select_own_batches"
  ON public.ammunition_batches
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_batches" ON public.ammunition_batches;
CREATE POLICY "insert_own_batches"
  ON public.ammunition_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ammo_inventory AS ai
      WHERE ai.id = ammunition_batches.ammo_inventory_id
        AND ai.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_batches" ON public.ammunition_batches;
CREATE POLICY "update_own_batches"
  ON public.ammunition_batches
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.ammo_inventory AS ai
      WHERE ai.id = ammunition_batches.ammo_inventory_id
        AND ai.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_batches" ON public.ammunition_batches;
CREATE POLICY "delete_own_batches"
  ON public.ammunition_batches
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);