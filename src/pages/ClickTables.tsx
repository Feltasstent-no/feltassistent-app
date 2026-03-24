import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useActiveSetup } from '../contexts/ActiveSetupContext';
import { ClickTable, Weapon, WeaponBarrel } from '../types/database';
import { Plus, Target, Trash2, CreditCard as Edit } from 'lucide-react';
import { TabellIconBadge } from '../components/TabellIconBadge';

type TableWithRelations = ClickTable & {
  weapon?: Weapon | null;
  barrel?: WeaponBarrel | null;
};

export function ClickTables() {
  const { user } = useAuth();
  const { activeSetup, setClickTable } = useActiveSetup();
  const navigate = useNavigate();
  const [tables, setTables] = useState<TableWithRelations[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTables();
  }, [user]);

  const fetchTables = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('click_tables')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      const tablesWithRelations: TableWithRelations[] = await Promise.all(
        data.map(async (table) => {
          const tableWithRelations: TableWithRelations = { ...table };

          if (table.weapon_id) {
            const { data: weaponData } = await supabase
              .from('weapons')
              .select('*')
              .eq('id', table.weapon_id)
              .maybeSingle();
            tableWithRelations.weapon = weaponData;
          }

          if (table.barrel_id) {
            const { data: barrelData } = await supabase
              .from('weapon_barrels')
              .select('*')
              .eq('id', table.barrel_id)
              .maybeSingle();
            tableWithRelations.barrel = barrelData;
          }

          return tableWithRelations;
        })
      );
      setTables(tablesWithRelations);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Er du sikker på at du vil slette denne knepptabellen?')) return;

    const { error } = await supabase
      .from('click_tables')
      .delete()
      .eq('id', id);

    if (error) {
      alert('Feil ved sletting: ' + error.message);
    } else {
      fetchTables();
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

  return (
    <Layout>
      <div className="pb-20 md:pb-8 max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Knepptabeller</h1>
            <p className="text-slate-600 mt-1 text-sm sm:text-base">Administrer dine knepptabeller</p>
          </div>
          <button
            onClick={() => navigate('/click-tables/new')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 px-4 sm:py-3 sm:px-6 rounded-lg transition flex items-center space-x-2 flex-shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Ny tabell</span>
            <span className="sm:hidden">Ny</span>
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 mb-8">
          <h3 className="font-semibold text-amber-900 mb-2 flex items-center">
            <TabellIconBadge size="sm" className="mr-2" />
            Hva er knepptabeller?
          </h3>
          <p className="text-amber-800 text-sm leading-relaxed mb-3">
            Knepptabeller er <strong>manuelt opprettede tabeller</strong> basert på faktiske skytinger med din rifle.
            Du legger inn de faktiske kneppverdiene som fungerer for deg på ulike avstander.
          </p>
          <p className="text-amber-800 text-sm leading-relaxed mb-3">
            Du kan også hente inn grunnverdier fra ballistikk-siden som du videre kan bygge på og tilpasse mot det valgte våpenet.
          </p>
          <div className="text-amber-800 text-sm">
            <p className="font-medium mb-1">Fordeler:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Basert på <strong>dine faktiske resultater</strong> med din rifle</li>
              <li>Tar høyde for spesifikke egenskaper ved ditt våpen</li>
              <li>Enkelt å justere basert på erfaringer i felt</li>
              <li>Kan kobles til spesifikk rifle og løp</li>
            </ul>
          </div>
          <p className="text-amber-700 text-sm mt-3 italic">
            💡 Bruk dette for å dokumentere og bruke testet data fra faktiske skytinger på banen eller i stevne.
          </p>
        </div>

        {tables.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Target className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Ingen knepptabeller enda</h2>
            <p className="text-slate-600 mb-6">
              Opprett din første knepptabell for å få automatiske kneppforslag under feltløyper
            </p>
            <button
              onClick={() => navigate('/click-tables/new')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition inline-flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Opprett knepptabell</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 hover:border-emerald-200 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      <TabellIconBadge size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{table.name}</h3>
                          {activeSetup?.click_table_id === table.id && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              Aktiv
                            </span>
                          )}
                        </div>
                        {table.weapon && (
                          <p className="text-sm text-slate-600 mt-1">
                            <span className="font-medium">Våpen:</span> {table.weapon.weapon_name}
                            {table.barrel && (
                              <>
                                {' • '}
                                <span className="font-medium">Løp:</span> {table.barrel.barrel_number}
                              </>
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {table.caliber && (
                        <div>
                          <p className="text-slate-500">Kaliber</p>
                          <p className="font-medium text-slate-900">{table.caliber}</p>
                        </div>
                      )}
                      {table.ammo && (
                        <div>
                          <p className="text-slate-500">Ammunisjon</p>
                          <p className="font-medium text-slate-900">{table.ammo}</p>
                        </div>
                      )}
                      {table.bullet_weight && (
                        <div>
                          <p className="text-slate-500">Kulevekt</p>
                          <p className="font-medium text-slate-900">{table.bullet_weight}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-slate-500">Nullstilling</p>
                        <p className="font-medium text-slate-900">{table.zero_distance}m</p>
                      </div>
                    </div>

                    {table.notes && (
                      <p className="text-sm text-slate-600 mt-3">{table.notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    {activeSetup?.click_table_id !== table.id && (
                      <button
                        onClick={async () => {
                          await setClickTable(table.id);
                          alert('Knepptabell satt som aktiv');
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        Sett som aktiv
                      </button>
                    )}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/click-tables/${table.id}`)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="Rediger"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(table.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Slett"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
