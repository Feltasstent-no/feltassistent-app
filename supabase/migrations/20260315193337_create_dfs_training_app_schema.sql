/*
  # DFS Treningsapp - Komplett Database Schema
  
  1. Tabeller
    - app_admins: Admin-brukere (må opprettes først)
    - profiles: Brukerprofiler med DFS-info
    - shooter_classes: DFS skytterklasser
    - disciplines: Skytedisipliner
    - training_programs: Treningsprogram per disiplin/klasse
    - training_entries: Treningsøkter
    - training_entry_images: Bilder av skiver
    - field_clock_presets: Forhåndsinnstillinger for feltklokke
  
  2. Sikkerhet
    - RLS aktivert på alle tabeller
    - Brukere kan kun se/endre egne data
    - Oppslagstabeller er lesbare for alle innloggede
    - Kun admins kan endre oppslagstabeller
  
  3. Automatikk
    - Trigger for å opprette profil ved ny bruker
    - Automatisk oppdatering av updated_at
*/

-- Aktiver UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- APP ADMINS (må være først pga policies)
CREATE TABLE IF NOT EXISTS app_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins kan lese admin-liste"
  ON app_admins FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- PROFILES
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  email text,
  dfs_shooter_id text,
  club_name text,
  shooter_class text,
  birth_year int,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egen profil"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Brukere kan oppdatere egen profil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Brukere kan sette inn egen profil"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- SHOOTER CLASSES
CREATE TABLE IF NOT EXISTS shooter_classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  category text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE shooter_classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle innloggede kan lese skytterklasser"
  ON shooter_classes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Kun admins kan oppdatere skytterklasser"
  ON shooter_classes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan sette inn skytterklasser"
  ON shooter_classes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan slette skytterklasser"
  ON shooter_classes FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- DISCIPLINES
CREATE TABLE IF NOT EXISTS disciplines (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE disciplines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle innloggede kan lese disipliner"
  ON disciplines FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Kun admins kan oppdatere disipliner"
  ON disciplines FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan sette inn disipliner"
  ON disciplines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan slette disipliner"
  ON disciplines FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- TRAINING PROGRAMS
CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  discipline_id uuid REFERENCES disciplines(id) ON DELETE CASCADE,
  class_code text,
  name text NOT NULL,
  description text,
  default_shots int,
  default_time_seconds int,
  rule_version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle innloggede kan lese treningsprogram"
  ON training_programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Kun admins kan oppdatere treningsprogram"
  ON training_programs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan sette inn treningsprogram"
  ON training_programs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan slette treningsprogram"
  ON training_programs FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- TRAINING ENTRIES
CREATE TABLE IF NOT EXISTS training_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  discipline_id uuid REFERENCES disciplines(id),
  program_id uuid REFERENCES training_programs(id),
  class_code text,
  location text,
  distance_m int,
  position text,
  shots_total int,
  score int,
  inner_hits int,
  hits int,
  duration_seconds int,
  weather text,
  wind_notes text,
  equipment_notes text,
  mental_notes text,
  technical_notes text,
  general_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE training_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egne treningsøkter"
  ON training_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Brukere kan sette inn egne treningsøkter"
  ON training_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan oppdatere egne treningsøkter"
  ON training_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan slette egne treningsøkter"
  ON training_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- TRAINING ENTRY IMAGES
CREATE TABLE IF NOT EXISTS training_entry_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id uuid REFERENCES training_entries(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE training_entry_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egne bilder"
  ON training_entry_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Brukere kan sette inn egne bilder"
  ON training_entry_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan oppdatere egne bilder"
  ON training_entry_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan slette egne bilder"
  ON training_entry_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- FIELD CLOCK PRESETS
CREATE TABLE IF NOT EXISTS field_clock_presets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  discipline_code text,
  class_code text,
  prep_seconds int DEFAULT 0,
  shoot_seconds int NOT NULL,
  warning_seconds int DEFAULT 0,
  cooldown_seconds int DEFAULT 0,
  rule_reference text,
  rule_version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE field_clock_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle innloggede kan lese feltklokke-presets"
  ON field_clock_presets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Kun admins kan oppdatere feltklokke-presets"
  ON field_clock_presets FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan sette inn feltklokke-presets"
  ON field_clock_presets FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan slette feltklokke-presets"
  ON field_clock_presets FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- FUNKSJONER OG TRIGGERS

-- Funksjon for å oppdatere updated_at automatisk
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for training_entries
DROP TRIGGER IF EXISTS update_training_entries_updated_at ON training_entries;
CREATE TRIGGER update_training_entries_updated_at
  BEFORE UPDATE ON training_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Funksjon for å opprette profil automatisk ved ny bruker
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for å opprette profil ved ny bruker
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- INDEXES for bedre ytelse
CREATE INDEX IF NOT EXISTS idx_training_entries_user_id ON training_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_training_entries_entry_date ON training_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_training_entry_images_entry_id ON training_entry_images(entry_id);
CREATE INDEX IF NOT EXISTS idx_training_entry_images_user_id ON training_entry_images(user_id);