import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Competition, CompetitionStage, ClickTable, FieldFigure, Weapon, WeaponBarrel } from '../types/database';
import { ArrowLeft, Play, Target, Clock, CreditCard, Crosshair } from 'lucide-react';

export function CompetitionStart() {
  const navigate = useNavigate();
  const { competitionId } = useParams<{ competitionId: string }>();
  const { user } = useAuth();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [stages, setStages] = useState<CompetitionStage[]>([]);
  const [clickTables, setClickTables] = useState<ClickTable[]>([]);
  const [weapons, setWeapons] = useState<Weapon[]>([]);
  const [barrels, setBarrels] = useState<{ [weaponId: string]: WeaponBarrel[] }>({});
  const [figures, setFigures] = useState<FieldFigure[]>([]);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string>('');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [competitionId, user]);

  const fetchData = async () => {
    if (!competitionId || !user) return;

    const [compRes, stagesRes, weaponsRes, tablesRes, figuresRes] = await Promise.all([
      supabase
        .from('competitions')
        .select('*')
        .eq('id', competitionId)
        .maybeSingle(),
      supabase
        .from('competition_stages')
        .select('*')
        .eq('competition_id', competitionId)
        .order('stage_number'),
      supabase
        .from('weapons')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('weapon_name'),
      supabase
        .from('click_tables')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('field_figures')
        .select('*')
        .eq('is_active', true),
    ]);

    if (compRes.data) setCompetition(compRes.data);
    if (stagesRes.data) setStages(stagesRes.data);
    if (weaponsRes.data) {
      setWeapons(weaponsRes.data);

      const barrelsByWeapon: { [weaponId: string]: WeaponBarrel[] } = {};
      for (const weapon of weaponsRes.data) {
        const { data: barrelData } = await supabase
          .from('weapon_barrels')
          .select('*')
          .eq('weapon_id', weapon.id)
          .order('installed_date', { ascending: false });
        if (barrelData) barrelsByWeapon[weapon.id] = barrelData;
      }
      setBarrels(barrelsByWeapon);
    }
    if (tablesRes.data) setClickTables(tablesRes.data);
    if (figuresRes.data) setFigures(figuresRes.data);

    setLoading(false);
  };

  const getFigure = (figureId: string | null) => {
    if (!figureId) return null;
    return figures.find(f => f.id === figureId);
  };

  const getFilteredClickTables = () => {
    if (!selectedWeaponId) return clickTables;

    const weaponBarrelTables = clickTables.filter(
      t => t.weapon_id === selectedWeaponId && t.barrel_id
    );

    const weaponOnlyTables = clickTables.filter(
      t => t.weapon_id === selectedWeaponId && !t.barrel_id
    );

    const generalTables = clickTables.filter(t => !t.weapon_id);

    return [...weaponBarrelTables, ...weaponOnlyTables, ...generalTables];
  };

  const handleStart = async () => {
    if (!user || !competitionId) return;

    setStarting(true);

    const { data, error } = await supabase
      .from('competition_entries')
      .insert({
        competition_id: competitionId,
        user_id: user.id,
        weapon_id: selectedWeaponId || null,
        click_table_id: selectedTableId || null,
        current_stage_number: 1,
        current_stage_state: 'pre_hold',
        status: 'not_started',
      })
      .select()
      .single();

    if (error) {
      alert('Kunne ikke starte stevne');
      setStarting(false);
    } else if (data) {
      navigate(`/competitions/${competitionId}/run/${data.id}`);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
      </Layout>
    );
  }

  if (!competition) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-slate-600">Stevne ikke funnet</p>
          <Link to="/competitions" className="text-emerald-600 hover:text-emerald-700 mt-4 inline-block">
            Tilbake til stevner
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl pb-20 md:pb-8">
        <div className="mb-6">
          <button
            onClick={() => navigate('/competitions')}
            className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Tilbake</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{competition.name}</h1>
          <p className="text-slate-600 mt-1">Start stevnet</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Crosshair className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Velg våpen</h2>
            </div>

            {weapons.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">Du har ingen våpen registrert</p>
                <Link
                  to="/weapons"
                  className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Registrer våpen
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
                    selectedWeaponId === ''
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="weapon"
                    value=""
                    checked={selectedWeaponId === ''}
                    onChange={(e) => setSelectedWeaponId(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="ml-3 flex-1">
                    <p className="font-medium text-slate-900">Ingen våpen valgt</p>
                  </div>
                </label>
                {weapons.map((weapon) => (
                  <label
                    key={weapon.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedWeaponId === weapon.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="weapon"
                      value={weapon.id}
                      checked={selectedWeaponId === weapon.id}
                      onChange={(e) => setSelectedWeaponId(e.target.value)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="ml-3 flex-1">
                      <p className="font-medium text-slate-900">{weapon.weapon_name}</p>
                      <p className="text-sm text-slate-600">
                        {weapon.weapon_type} {weapon.caliber && `• ${weapon.caliber}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Velg knepptabell</h2>
            </div>

            {clickTables.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">Du har ingen knepptabeller</p>
                <Link
                  to="/click-tables"
                  className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                >
                  Opprett knepptabell
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {getFilteredClickTables().map((table) => {
                  const isWeaponBarrelSpecific = table.weapon_id === selectedWeaponId && table.barrel_id && selectedWeaponId !== '';
                  const isWeaponSpecific = table.weapon_id === selectedWeaponId && !table.barrel_id && selectedWeaponId !== '';
                  const barrel = table.barrel_id && table.weapon_id ?
                    barrels[table.weapon_id]?.find(b => b.id === table.barrel_id) : null;

                  return (
                  <label
                    key={table.id}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedTableId === table.id
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="clickTable"
                      value={table.id}
                      checked={selectedTableId === table.id}
                      onChange={(e) => setSelectedTableId(e.target.value)}
                      className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="ml-3 flex-1">
                      <div className="flex items-center space-x-2 flex-wrap">
                        <p className="font-medium text-slate-900">{table.name}</p>
                        {isWeaponBarrelSpecific && (
                          <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                            For våpen + løp
                          </span>
                        )}
                        {isWeaponSpecific && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                            For våpen
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-600">
                        {table.caliber && <span>{table.caliber}</span>}
                        {barrel && (
                          <span className="ml-2">• Løp: {barrel.barrel_number}</span>
                        )}
                      </div>
                    </div>
                  </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Target className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">Hold oversikt</h2>
            </div>

            <div className="space-y-3">
              {stages.map((stage) => {
                const figure = getFigure(stage.field_figure_id);
                return (
                  <div key={stage.id} className="p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-emerald-600 text-white text-sm font-bold rounded">
                            {stage.stage_number}
                          </span>
                          <h3 className="font-semibold text-slate-900">
                            Hold {stage.stage_number}
                            {stage.name && stage.name.trim() !== '' && ` – ${stage.name}`}
                          </h3>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm text-slate-600">
                          {figure && (
                            <div className="flex items-center space-x-1">
                              <Target className="w-4 h-4" />
                              <span className="font-semibold">{figure.code}</span>
                              <span className="text-slate-500">–</span>
                              <span>{figure.name}</span>
                            </div>
                          )}
                          {stage.distance_m && (
                            <div className="flex items-center space-x-1">
                              <span>{stage.distance_m}m</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{stage.time_limit_seconds}s skytetid</span>
                          </div>
                          {stage.total_shots && (
                            <div>
                              <span>{stage.total_shots} skudd</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {stages.length === 0 && (
              <p className="text-center text-slate-600 py-8">Ingen hold definert for dette stevnet</p>
            )}
          </div>

          <button
            onClick={handleStart}
            disabled={starting || !selectedTableId || clickTables.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-lg"
          >
            <Play className="w-6 h-6" />
            <span>{starting ? 'Starter...' : 'Start stevne'}</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
