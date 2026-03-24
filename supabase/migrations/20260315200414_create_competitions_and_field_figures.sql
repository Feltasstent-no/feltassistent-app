/*
  # Stevner og Feltfigurer
  
  1. Nye tabeller
    - field_figures: Katalog med feltfigurer (SVG)
    - click_tables: Brukernes knepptabeller
    - click_table_rows: Rader i knepptabell (avstand -> knepp)
    - competitions: Stevner (både bane og felt)
    - competition_stages: Hold i et stevne
    - competition_entries: Brukers deltakelse i stevne
    - competition_stage_logs: Brukers data per hold
    - competition_stage_images: Bilder av skiver per hold
  
  2. Sikkerhet
    - RLS aktivert på alle tabeller
    - Brukere kan kun se/endre egne data
    - Kun admins kan opprette/endre stevner og feltfigurer
  
  3. Funksjonalitet
    - Støtte for både bane og felt
    - Feltfigurer med SVG-data
    - Knepptabeller per bruker
    - Hold-for-hold tracking
    - Bildeopplasting per hold
*/

-- FIELD FIGURES
CREATE TABLE IF NOT EXISTS field_figures (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  svg_data text NOT NULL,
  category text,
  difficulty int DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE field_figures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle innloggede kan lese feltfigurer"
  ON field_figures FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Kun admins kan oppdatere feltfigurer"
  ON field_figures FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan sette inn feltfigurer"
  ON field_figures FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Kun admins kan slette feltfigurer"
  ON field_figures FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- CLICK TABLES
CREATE TABLE IF NOT EXISTS click_tables (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  ammo_type text,
  caliber text,
  bullet_weight text,
  muzzle_velocity text,
  zero_distance int,
  sight_info text,
  notes text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE click_tables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egne knepptabeller"
  ON click_tables FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Brukere kan sette inn egne knepptabeller"
  ON click_tables FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan oppdatere egne knepptabeller"
  ON click_tables FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan slette egne knepptabeller"
  ON click_tables FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- CLICK TABLE ROWS
CREATE TABLE IF NOT EXISTS click_table_rows (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  click_table_id uuid REFERENCES click_tables(id) ON DELETE CASCADE NOT NULL,
  distance_m int NOT NULL,
  clicks int NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE click_table_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egne knepptabell-rader"
  ON click_table_rows FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

CREATE POLICY "Brukere kan sette inn egne knepptabell-rader"
  ON click_table_rows FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

CREATE POLICY "Brukere kan oppdatere egne knepptabell-rader"
  ON click_table_rows FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

CREATE POLICY "Brukere kan slette egne knepptabell-rader"
  ON click_table_rows FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM click_tables
      WHERE click_tables.id = click_table_rows.click_table_id
      AND click_tables.user_id = auth.uid()
    )
  );

-- COMPETITIONS
CREATE TABLE IF NOT EXISTS competitions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  competition_type text NOT NULL CHECK (competition_type IN ('bane', 'felt')),
  discipline_id uuid REFERENCES disciplines(id),
  location text,
  competition_date date,
  is_public boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle innloggede kan lese aktive stevner"
  ON competitions FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Kun oppretter og admins kan oppdatere stevner"
  ON competitions FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

CREATE POLICY "Innloggede kan opprette stevner"
  ON competitions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Kun oppretter og admins kan slette stevner"
  ON competitions FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid())
  );

-- COMPETITION STAGES
CREATE TABLE IF NOT EXISTS competition_stages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  stage_number int NOT NULL,
  name text,
  figure_id uuid REFERENCES field_figures(id),
  position text,
  prep_seconds int DEFAULT 0,
  shoot_seconds int NOT NULL,
  warning_seconds int DEFAULT 0,
  cooldown_seconds int DEFAULT 0,
  shots_count int DEFAULT 5,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE competition_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle innloggede kan lese hold"
  ON competition_stages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = competition_stages.competition_id
      AND competitions.is_active = true
    )
  );

CREATE POLICY "Kun oppretter og admins kan oppdatere hold"
  ON competition_stages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = competition_stages.competition_id
      AND (competitions.created_by = auth.uid() OR EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Kun oppretter og admins kan sette inn hold"
  ON competition_stages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = competition_stages.competition_id
      AND (competitions.created_by = auth.uid() OR EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()))
    )
  );

CREATE POLICY "Kun oppretter og admins kan slette hold"
  ON competition_stages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE competitions.id = competition_stages.competition_id
      AND (competitions.created_by = auth.uid() OR EXISTS (SELECT 1 FROM app_admins WHERE user_id = auth.uid()))
    )
  );

-- COMPETITION ENTRIES
CREATE TABLE IF NOT EXISTS competition_entries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  click_table_id uuid REFERENCES click_tables(id),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  total_score int,
  total_inner_hits int,
  total_hits int,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE competition_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egne stevne-deltakelser"
  ON competition_entries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Brukere kan sette inn egne stevne-deltakelser"
  ON competition_entries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan oppdatere egne stevne-deltakelser"
  ON competition_entries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan slette egne stevne-deltakelser"
  ON competition_entries FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- COMPETITION STAGE LOGS
CREATE TABLE IF NOT EXISTS competition_stage_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id uuid REFERENCES competition_entries(id) ON DELETE CASCADE NOT NULL,
  stage_id uuid REFERENCES competition_stages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  actual_distance_m int,
  recommended_clicks int,
  used_clicks int,
  reset_to_zero boolean DEFAULT false,
  score int,
  inner_hits int,
  hits int,
  duration_seconds int,
  notes text,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE competition_stage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egne hold-logger"
  ON competition_stage_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Brukere kan sette inn egne hold-logger"
  ON competition_stage_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan oppdatere egne hold-logger"
  ON competition_stage_logs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan slette egne hold-logger"
  ON competition_stage_logs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- COMPETITION STAGE IMAGES
CREATE TABLE IF NOT EXISTS competition_stage_images (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage_log_id uuid REFERENCES competition_stage_logs(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  storage_path text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE competition_stage_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brukere kan lese egne hold-bilder"
  ON competition_stage_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Brukere kan sette inn egne hold-bilder"
  ON competition_stage_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan oppdatere egne hold-bilder"
  ON competition_stage_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Brukere kan slette egne hold-bilder"
  ON competition_stage_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- TRIGGERS

DROP TRIGGER IF EXISTS update_click_tables_updated_at ON click_tables;
CREATE TRIGGER update_click_tables_updated_at
  BEFORE UPDATE ON click_tables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_competitions_updated_at ON competitions;
CREATE TRIGGER update_competitions_updated_at
  BEFORE UPDATE ON competitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_competition_entries_updated_at ON competition_entries;
CREATE TRIGGER update_competition_entries_updated_at
  BEFORE UPDATE ON competition_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_competition_stage_logs_updated_at ON competition_stage_logs;
CREATE TRIGGER update_competition_stage_logs_updated_at
  BEFORE UPDATE ON competition_stage_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_click_tables_user_id ON click_tables(user_id);
CREATE INDEX IF NOT EXISTS idx_click_table_rows_table_id ON click_table_rows(click_table_id);
CREATE INDEX IF NOT EXISTS idx_competitions_created_by ON competitions(created_by);
CREATE INDEX IF NOT EXISTS idx_competitions_date ON competitions(competition_date DESC);
CREATE INDEX IF NOT EXISTS idx_competition_stages_competition_id ON competition_stages(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_user_id ON competition_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_entries_competition_id ON competition_entries(competition_id);
CREATE INDEX IF NOT EXISTS idx_competition_stage_logs_entry_id ON competition_stage_logs(entry_id);
CREATE INDEX IF NOT EXISTS idx_competition_stage_logs_user_id ON competition_stage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_competition_stage_images_stage_log_id ON competition_stage_images(stage_log_id);