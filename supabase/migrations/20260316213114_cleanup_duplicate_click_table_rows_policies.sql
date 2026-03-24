/*
  # Rydd opp dupliserte RLS-policies for click_table_rows

  1. Fjerner dupliserte engelskspråklige policies
    - Beholder bare de norske versjonene
    - Dette løser potensielle konflikter
  
  2. Sikkerhet
    - Beholder eksisterende sikkerhetsnivå
    - Brukere kan fortsatt kun administrere rader i egne knepptabeller
*/

-- Fjern dupliserte engelske policies
DROP POLICY IF EXISTS "Users can view rows of own click tables" ON click_table_rows;
DROP POLICY IF EXISTS "Users can insert rows to own click tables" ON click_table_rows;
DROP POLICY IF EXISTS "Users can update rows of own click tables" ON click_table_rows;
DROP POLICY IF EXISTS "Users can delete rows of own click tables" ON click_table_rows;