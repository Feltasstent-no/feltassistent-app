/**
 * UI Flow Test Helper
 *
 * Dette scriptet setter opp test-scenarios for manuell UI-verifisering
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Last .env
dotenv.config({ path: join(__dirname, '.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const TEST_USER_ID = '85ea0a3c-c97f-4ad6-b5a9-6906a3d4255d';
const CLICK_TABLE_ID = 'ee728016-1baa-489e-8837-2af2db027fc5';

async function createTestFinfeltMatch() {
  console.log('\n🎯 TEST 1 & 2: Oppretter finfelt-stevne med 2 hold...');

  // Opprett session
  const { data: session, error: sessionError } = await supabase
    .from('match_sessions')
    .insert({
      user_id: TEST_USER_ID,
      click_table_id: CLICK_TABLE_ID,
      competition_type: 'finfelt',
      status: 'active',
      current_hold_index: 0,
      total_holds: 2
    })
    .select()
    .single();

  if (sessionError) {
    console.error('❌ Feil ved opprettelse av session:', sessionError);
    return null;
  }

  console.log('✅ Session opprettet:', session.id);

  // Opprett hold 1
  const { data: hold1 } = await supabase
    .from('match_holds')
    .insert({
      match_session_id: session.id,
      hold_number: 1,
      field_figure_id: '5bbec77d-59cf-45e0-9e8b-d0ac3c8eaeda', // Finfelt figur
      distance_m: 100,
      shot_count: 5,
      shooting_time_seconds: 60,
      recommended_clicks: 0,
      wind_correction_clicks: 0,
      status: 'pending'
    })
    .select()
    .single();

  // Opprett hold 2
  const { data: hold2 } = await supabase
    .from('match_holds')
    .insert({
      match_session_id: session.id,
      hold_number: 2,
      field_figure_id: '5bbec77d-59cf-45e0-9e8b-d0ac3c8eaeda',
      distance_m: 150,
      shot_count: 5,
      shooting_time_seconds: 60,
      recommended_clicks: 0,
      wind_correction_clicks: 0,
      status: 'pending'
    })
    .select()
    .single();

  console.log('✅ Hold opprettet:', hold1?.id, hold2?.id);
  console.log('\n📋 TEST 1 - FINFELT PRE-START:');
  console.log(`   Åpne: http://localhost:5173/match/${session.id}/active`);
  console.log('   Forventet:');
  console.log('   - Klokken er SYNLIG og viser 0:15 (paused)');
  console.log('   - "Knepp opp 0" vises IKKE');
  console.log('   - Figur, avstand, antall skudd vises');
  console.log('   - "Start klokke" knapp vises\n');

  return session.id;
}

async function createTestGrovfeltMatch() {
  console.log('\n🎯 TEST 3 & 4: Oppretter grovfelt-stevne med 2 hold...');

  const { data: session } = await supabase
    .from('match_sessions')
    .insert({
      user_id: TEST_USER_ID,
      click_table_id: CLICK_TABLE_ID,
      competition_type: 'grovfelt',
      status: 'setup',
      current_hold_index: 0,
      total_holds: 2
    })
    .select()
    .single();

  console.log('✅ Session opprettet:', session.id);
  console.log('\n📋 TEST 3 - GROVFELT FIGURVELGER:');
  console.log(`   Åpne: http://localhost:5173/match/${session.id}/configure`);
  console.log('   Forventet:');
  console.log('   - Kun grovfeltfigurer vises');
  console.log('   - Listen kollapser etter valg');
  console.log('   - Valgt figur vises kompakt\n');

  return session.id;
}

async function main() {
  console.log('🚀 UI VERIFIKASJONS-HELPER');
  console.log('='.repeat(50));

  const finfeltId = await createTestFinfeltMatch();
  const grovfeltId = await createTestGrovfeltMatch();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Test-sessions opprettet!');
  console.log('\nNeste steg:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Logg inn som: andor@valuetech.no');
  console.log('3. Åpne URL-ene over og verifiser UI');
  console.log('4. For TEST 2: Fullfør hold 1 og verifiser at hold 2 åpnes direkte');
  console.log('5. For TEST 4: Konfigurer grovfelt, start hold 1, fullfør og gå til hold 2');
}

main().catch(console.error);
