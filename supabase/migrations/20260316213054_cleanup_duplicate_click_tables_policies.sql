/*
  # Rydd opp dupliserte RLS-policies for click_tables

  1. Fjerner dupliserte engelskspråklige policies
    - Beholder bare de norske versjonene
    - Dette løser potensielle konflikter ved sletting
  
  2. Sikkerhet
    - Beholder eksisterende sikkerhetsnivå
    - Brukere kan fortsatt kun se/redigere/slette egne knepptabeller
*/

-- Fjern dupliserte engelske policies
DROP POLICY IF EXISTS "Users can view own click tables" ON click_tables;
DROP POLICY IF EXISTS "Users can insert own click tables" ON click_tables;
DROP POLICY IF EXISTS "Users can update own click tables" ON click_tables;
DROP POLICY IF EXISTS "Users can delete own click tables" ON click_tables;