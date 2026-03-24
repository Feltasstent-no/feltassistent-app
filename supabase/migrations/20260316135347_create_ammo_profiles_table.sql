/*
  # Opprett ammunisjonsprofiler for ballistikk

  1. Ny tabell
    - `ammo_profiles` - Lagrer standarddata for vanlige matchkuler
      - `id` (uuid, primærnøkkel)
      - `name` (text) - Navn på ammunisjonen
      - `caliber` (text) - Kaliber (f.eks. "6.5mm", ".308")
      - `bullet_weight_gr` (numeric) - Kuletvekt i grains
      - `ballistic_coefficient_g1` (numeric) - BC G1 koeffisient
      - `default_muzzle_velocity` (int) - Standard V0 i m/s
      - `manufacturer` (text) - Produsent
      - `is_active` (boolean) - Om profilen er aktiv
      - `created_at` (timestamptz) - Opprettelsestidspunkt

  2. Sikkerhet
    - Alle autentiserte brukere kan lese ammunisjonsprofiler
    - Kun administratorer kan opprette/endre profiler
*/

CREATE TABLE IF NOT EXISTS ammo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  caliber text NOT NULL,
  bullet_weight_gr numeric NOT NULL,
  ballistic_coefficient_g1 numeric NOT NULL,
  default_muzzle_velocity int NOT NULL,
  manufacturer text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ammo_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle autentiserte kan lese ammunisjonsprofiler"
  ON ammo_profiles FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Kun admins kan opprette ammunisjonsprofiler"
  ON ammo_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan oppdatere ammunisjonsprofiler"
  ON ammo_profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan slette ammunisjonsprofiler"
  ON ammo_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );