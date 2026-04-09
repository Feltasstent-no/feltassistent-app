import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { FieldFigurePreview } from '../components/FieldFigurePreview';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getMatchSession,
  getMatchHolds,
  updateMatchHold,
  getSubHoldsForSession,
  type MatchSession,
  type MatchHoldWithFigure,
  type MatchSubHold,
} from '../lib/match-service';
import {
  ArrowLeft, Play, Wind, Target, Focus,
  RotateCcw, FileText, Zap, Pencil, X, Check, RotateCw,
  Package, AlertTriangle, Layers,
} from 'lucide-react';
import { AmmoIcon } from '../components/AmmoIcon';

interface SessionMeta {
  weaponName: string | null;
  barrelSerial: string | null;
  clickTableName: string | null;
  zeroDistance: number | null;
  templateName: string | null;
  ballisticProfileName: string | null;
  ammoName: string | null;
  ammoStock: number | null;
}

interface EditFormData {
  distance_m: number;
  recommended_clicks: number | null;
  wind_clicks: number;
  shooting_time_seconds: number;
  shot_count: number;
}

function formatClicks(value: number | null | undefined): string {
  if (value == null) return '\u2014';
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `${value}`;
}

function formatTime(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} min`;
  return `${seconds}s`;
}

export function MatchPreview() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [session, setSession] = useState<MatchSession | null>(null);
  const [holds, setHolds] = useState<MatchHoldWithFigure[]>([]);
  const [meta, setMeta] = useState<SessionMeta>({
    weaponName: null,
    barrelSerial: null,
    clickTableName: null,
    zeroDistance: null,
    templateName: null,
    ballisticProfileName: null,
    ammoName: null,
    ammoStock: null,
  });
  const [subHoldsMap, setSubHoldsMap] = useState<Record<string, MatchSubHold[]>>({});
  const [loading, setLoading] = useState(true);
  const [editingHoldId, setEditingHoldId] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) fetchData();
  }, [id, user]);

  const fetchData = async () => {
    if (!id || !user) return;

    const [sessionData, holdsData] = await Promise.all([
      getMatchSession(id),
      getMatchHolds(id),
    ]);

    if (!sessionData) {
      navigate('/match');
      return;
    }

    if (sessionData.status === 'setup') {
      navigate(`/match/${id}/configure`);
      return;
    }

    setSession(sessionData);
    setHolds(holdsData);

    const subHolds = await getSubHoldsForSession(id);
    setSubHoldsMap(subHolds);

    const metaResult: SessionMeta = {
      weaponName: null,
      barrelSerial: null,
      clickTableName: null,
      zeroDistance: null,
      templateName: null,
      ballisticProfileName: null,
      ammoName: null,
      ammoStock: null,
    };

    const promises: Promise<any>[] = [];

    if (sessionData.ammo_inventory_id) {
      promises.push(
        supabase.from('ammo_inventory').select('name, stock_quantity').eq('id', sessionData.ammo_inventory_id).maybeSingle()
          .then(res => {
            if (res.data) {
              metaResult.ammoName = res.data.name;
              metaResult.ammoStock = res.data.stock_quantity;
            }
          })
      );
    }

    if (sessionData.template_id) {
      promises.push(
        supabase.from('competition_templates').select('name').eq('id', sessionData.template_id).maybeSingle()
          .then(res => { if (res.data) metaResult.templateName = res.data.name; })
      );
    }

    promises.push(
      supabase.from('user_active_setup')
        .select(`
          weapon:weapons(weapon_name),
          barrel:weapon_barrels(barrel_name, serial_number),
          ballistic_profile:ballistic_profiles(name)
        `)
        .eq('user_id', user.id)
        .maybeSingle()
        .then(res => {
          if (res.data) {
            const w = Array.isArray(res.data.weapon) ? res.data.weapon[0] : res.data.weapon;
            const b = Array.isArray(res.data.barrel) ? res.data.barrel[0] : res.data.barrel;
            const bp = Array.isArray(res.data.ballistic_profile) ? res.data.ballistic_profile[0] : res.data.ballistic_profile;
            metaResult.weaponName = (w as any)?.weapon_name || null;
            metaResult.barrelSerial = (b as any)?.serial_number || (b as any)?.barrel_name || null;
            metaResult.ballisticProfileName = (bp as any)?.name || null;
          }
        })
    );

    if (sessionData.click_table_id) {
      promises.push(
        supabase.from('click_tables').select('name, zero_distance').eq('id', sessionData.click_table_id).maybeSingle()
          .then(res => {
            if (res.data) {
              metaResult.clickTableName = res.data.name;
              metaResult.zeroDistance = res.data.zero_distance;
            }
          })
      );
    }

    await Promise.all(promises);
    setMeta(metaResult);
    setLoading(false);
  };

  const handleSaveHold = async (holdId: string, data: EditFormData) => {
    await updateMatchHold({
      holdId,
      distanceM: data.distance_m,
      recommendedClicks: data.recommended_clicks ?? undefined,
      shootingTimeSeconds: data.shooting_time_seconds,
      shotCount: data.shot_count,
    });

    await supabase
      .from('match_holds')
      .update({
        recommended_wind_clicks: data.wind_clicks,
        wind_correction_clicks: data.wind_clicks,
      })
      .eq('id', holdId);

    setHolds(prev => prev.map(h =>
      h.id === holdId
        ? {
            ...h,
            distance_m: data.distance_m,
            recommended_clicks: data.recommended_clicks,
            recommended_wind_clicks: data.wind_clicks,
            wind_correction_clicks: data.wind_clicks,
            shooting_time_seconds: data.shooting_time_seconds,
            shot_count: data.shot_count,
          }
        : h
    ));

    setEditingHoldId(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
        </div>
      </Layout>
    );
  }

  if (!session) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Stevne ikke funnet</h2>
          <button onClick={() => navigate('/match')} className="text-emerald-600 hover:underline">
            Tilbake til oversikt
          </button>
        </div>
      </Layout>
    );
  }

  const totalShots = holds.reduce((sum, h) => sum + h.shot_count, 0);
  const isFinfelt = session.competition_type === 'finfelt';
  const notEnoughAmmo = meta.ammoStock != null && meta.ammoStock < totalShots;
  const matchDate = new Date(session.match_date || session.created_at);
  const dateStr = matchDate.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Layout>
      <div className="max-w-3xl mx-auto pb-56 md:pb-8">
        <button
          type="button"
          onClick={() => navigate(`/match/${id}/configure`)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 mb-4 py-2 pr-4 -ml-2 pl-2 rounded-lg active:bg-slate-100 transition text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Tilbake og rediger</span>
        </button>

        <SummaryHeader
          session={session}
          meta={meta}
          holdCount={holds.length}
          totalShots={totalShots}
          dateStr={dateStr}
        />

        <div className="mt-6 mb-2">
          <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
            Holdoversikt
          </h2>
        </div>

        <div>
          {holds.map((hold, index) => (
            <div key={hold.id}>
              <HoldCard
                hold={hold}
                index={index}
                isFinfelt={isFinfelt}
                isEditing={editingHoldId === hold.id}
                onEdit={() => setEditingHoldId(hold.id)}
                onCancel={() => setEditingHoldId(null)}
                onSave={(data) => handleSaveHold(hold.id, data)}
                subHolds={subHoldsMap[hold.id]}
              />

              {index < holds.length - 1 && (
                <ResetDivider
                  isFinfelt={isFinfelt}
                  prevElevClicks={hold.recommended_clicks}
                  prevWindClicks={hold.recommended_wind_clicks ?? hold.wind_correction_clicks}
                  nextWindClicks={holds[index + 1]?.recommended_wind_clicks ?? holds[index + 1]?.wind_correction_clicks}
                />
              )}
            </div>
          ))}

          {!isFinfelt && holds.length > 0 && (
            <FinalResetReminder
              lastClicks={holds[holds.length - 1]?.recommended_clicks}
              lastWindClicks={holds[holds.length - 1]?.wind_correction_clicks ?? holds[holds.length - 1]?.recommended_wind_clicks}
            />
          )}
        </div>

        <div
          className="fixed left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-50 md:static md:bg-transparent md:border-0 md:mt-8 md:z-auto md:bottom-0"
          style={{ bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
        >
          <div className="max-w-3xl mx-auto px-4 pt-3 pb-3 md:px-0">
            <p className="text-xs text-center text-slate-500 mb-2">
              Kontroller alle hold før du starter
            </p>
            {notEnoughAmmo && (
              <div className="mb-2 flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2.5 text-sm text-yellow-800">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Lite ammunisjon: {meta.ammoStock} på lager, trenger {totalShots}</span>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => navigate(`/match/${id}/configure`)}
                className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-xl transition text-sm"
              >
                Rediger hold
              </button>
              <button
                type="button"
                onClick={() => navigate(`/match/${id}`)}
                className="w-full sm:flex-1 flex items-center justify-center gap-2.5 py-3.5 text-lg font-bold rounded-xl transition shadow-lg active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Play className="w-5 h-5" />
                Bekreft og start
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function SummaryHeader({
  session,
  meta,
  holdCount,
  totalShots,
  dateStr,
}: {
  session: MatchSession;
  meta: SessionMeta;
  holdCount: number;
  totalShots: number;
  dateStr: string;
}) {
  const hasWind = session.wind_speed_mps > 0;

  const items: { label: string; value: string; icon: React.ReactNode }[] = [
    {
      label: 'Disiplin',
      value: session.competition_type === 'grovfelt' ? 'Grovfelt' : 'Finfelt',
      icon: <Target className="w-4 h-4" />,
    },
    {
      label: 'Hold / Skudd',
      value: `${holdCount} hold / ${totalShots} skudd`,
      icon: <AmmoIcon className="w-5 h-5" />,
    },
  ];

  if (meta.weaponName) {
    items.push({
      label: 'Våpen',
      value: meta.weaponName + (meta.barrelSerial ? ` (#${meta.barrelSerial})` : ''),
      icon: <Zap className="w-4 h-4" />,
    });
  }

  if (meta.ballisticProfileName) {
    items.push({
      label: 'Profil',
      value: meta.ballisticProfileName,
      icon: <FileText className="w-4 h-4" />,
    });
  }

  if (meta.clickTableName) {
    items.push({
      label: 'Knepptabell',
      value: meta.clickTableName,
      icon: <FileText className="w-4 h-4" />,
    });
  }

  if (meta.zeroDistance != null) {
    items.push({
      label: 'Nullpunkt',
      value: `${meta.zeroDistance} m`,
      icon: <Focus className="w-4 h-4" />,
    });
  }

  if (hasWind) {
    items.push({
      label: 'Vind',
      value: `${session.wind_speed_mps} m/s`,
      icon: <Wind className="w-4 h-4" />,
    });
  }

  if (meta.templateName) {
    items.push({
      label: 'Loype',
      value: meta.templateName,
      icon: <FileText className="w-4 h-4" />,
    });
  }

  if (meta.ammoName) {
    items.push({
      label: 'Ammunisjon',
      value: `${meta.ammoName}`,
      icon: <Package className="w-4 h-4" />,
    });

    if (meta.ammoStock != null) {
      items.push({
        label: 'Lager / Behov',
        value: `${meta.ammoStock} stk / trenger ${totalShots}`,
        icon: <Target className="w-4 h-4" />,
      });
    }
  }

  const notEnoughAmmo = meta.ammoStock != null && meta.ammoStock < totalShots;
  const lowAmmo = meta.ammoStock != null && !notEnoughAmmo && meta.ammoStock < totalShots * 1.2;

  return (
    <div className="bg-slate-900 rounded-2xl overflow-hidden">
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-1">
          Briefing
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-white leading-tight">
          {session.match_name}
        </h1>
        <p className="text-sm text-slate-400 mt-0.5">{dateStr}</p>
      </div>

      <div className="bg-slate-800/60 px-5 py-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
        {items.map((item, i) => (
          <div key={i} className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-slate-500">{item.icon}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {item.label}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-200 truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {notEnoughAmmo && (
        <div className="bg-amber-500/20 border-t border-amber-500/30 px-5 py-3 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            <span className="font-semibold">Lite ammunisjon:</span> {meta.ammoStock} på lager, trenger {totalShots} skudd
          </p>
        </div>
      )}

      {lowAmmo && (
        <div className="bg-amber-500/20 border-t border-amber-500/30 px-5 py-3 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            <span className="font-semibold">Lav beholdning:</span> {meta.ammoStock} på lager, vurder å fylle på
          </p>
        </div>
      )}
    </div>
  );
}

function HoldCard({
  hold,
  index,
  isFinfelt,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  subHolds,
}: {
  hold: MatchHoldWithFigure;
  index: number;
  isFinfelt: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: EditFormData) => void;
  subHolds?: MatchSubHold[];
}) {
  const figure = hold.field_figure;
  const elevClicks = formatClicks(hold.recommended_clicks);
  const windVal = hold.recommended_wind_clicks ?? hold.wind_correction_clicks;
  const windClicks = formatClicks(windVal);
  const hasWindValue = windVal != null && windVal !== 0;
  const isOutOfRange = (hold.distance_m || 0) < 100 || (hold.distance_m || 0) > 600;
  const isComposite = hold.is_composite && subHolds && subHolds.length > 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-stretch">
        <div className="w-14 sm:w-16 bg-slate-50 border-r border-slate-200 flex flex-col items-center justify-center flex-shrink-0 py-3">
          <span className="text-[10px] font-semibold uppercase text-slate-400 leading-none">Hold</span>
          <span className="text-2xl font-bold text-slate-800 leading-none mt-0.5">{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0 p-3 sm:p-4">
          {isEditing ? (
            <HoldEditForm
              hold={hold}
              onCancel={onCancel}
              onSave={onSave}
            />
          ) : (
            <>
              {isComposite ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Sammensatt - {subHolds.length} delhold
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{formatTime(hold.shooting_time_seconds)} samlet</span>
                      <button
                        onClick={onEdit}
                        className="p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition flex-shrink-0"
                        title="Rediger hold"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {subHolds.map((sh, si) => (
                      <div key={sh.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-xs font-bold text-slate-500 w-5">{si + 1}.</span>
                        {sh.field_figure && (
                          <div className="w-8 h-8 flex-shrink-0 bg-white rounded border border-slate-200 p-0.5">
                            <FieldFigurePreview figure={sh.field_figure} size="sm" showDetails={false} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {sh.field_figure?.name || 'Ukjent'}
                          </p>
                          <p className="text-xs text-slate-500">
                            {sh.distance_m}m - {sh.shot_count} skudd
                          </p>
                        </div>
                        {!isFinfelt && sh.elevation_clicks != null && (
                          <div className="text-right flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                              {formatClicks(sh.elevation_clicks)} fra 0
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    {figure && (
                      <div className="w-10 h-10 sm:w-14 sm:h-14 flex-shrink-0 bg-slate-50 rounded-lg border border-slate-200 p-0.5 sm:p-1">
                        <FieldFigurePreview
                          figure={figure}
                          size="sm"
                          showDetails={false}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          {figure?.short_code || figure?.code || '?'}
                        </span>
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {figure?.name || 'Ukjent figur'}
                        </p>
                        <button
                          onClick={onEdit}
                          className="ml-auto p-1.5 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-slate-100 transition flex-shrink-0"
                          title="Rediger hold"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                        <span className={isOutOfRange ? 'text-red-600 font-semibold' : ''}>{hold.distance_m || 0}m</span>
                        <span className="text-slate-300">&middot;</span>
                        <span>{hold.shot_count} skudd</span>
                        <span className="text-slate-300">&middot;</span>
                        <span>{formatTime(hold.shooting_time_seconds)}</span>
                      </div>
                      {isOutOfRange && (
                        <p className="text-[10px] text-red-500 mt-0.5">Utenfor DFS-standard (100{'\u2013'}600m)</p>
                      )}
                    </div>

                    {!isFinfelt && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <ClickBadge
                          label="Hoyde"
                          value={elevClicks}
                          color="emerald"
                        />
                        <ClickBadge
                          label="Vind"
                          value={hasWindValue ? windClicks : '\u2014'}
                          color="sky"
                          dimmed={!hasWindValue}
                        />
                      </div>
                    )}
                  </div>
                </>
              )}

              {hold.notes && (
                <div
                  className="mt-2 flex items-start gap-1.5 border rounded-lg px-2.5 py-1.5"
                  style={{
                    backgroundColor: 'var(--instruction-bg)',
                    borderColor: 'var(--instruction-border)',
                  }}
                >
                  <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: 'var(--instruction-text-light)' }} />
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--instruction-text)' }}>{hold.notes}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function HoldEditForm({
  hold,
  onCancel,
  onSave,
}: {
  hold: MatchHoldWithFigure;
  onCancel: () => void;
  onSave: (data: EditFormData) => void;
}) {
  const [form, setForm] = useState<EditFormData>({
    distance_m: hold.distance_m || 0,
    recommended_clicks: hold.recommended_clicks,
    wind_clicks: hold.recommended_wind_clicks ?? hold.wind_correction_clicks ?? 0,
    shooting_time_seconds: hold.shooting_time_seconds,
    shot_count: hold.shot_count,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-slate-900">Rediger hold</p>
        <button onClick={onCancel} className="p-1 rounded text-slate-400 hover:text-slate-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <EditField
          label="Avstand (m)"
          value={form.distance_m}
          onChange={v => setForm(f => ({ ...f, distance_m: v }))}
        />
        <EditField
          label="Antall skudd"
          value={form.shot_count}
          onChange={v => setForm(f => ({ ...f, shot_count: v }))}
        />
        <EditField
          label="Høydeknepp"
          value={form.recommended_clicks ?? 0}
          onChange={v => setForm(f => ({ ...f, recommended_clicks: v }))}
          allowNegative
        />
        <EditField
          label="Vindknepp"
          value={form.wind_clicks}
          onChange={v => setForm(f => ({ ...f, wind_clicks: v }))}
          allowNegative
        />
        <EditField
          label="Skytetid (sek)"
          value={form.shooting_time_seconds}
          onChange={v => setForm(f => ({ ...f, shooting_time_seconds: v }))}
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
        >
          Avbryt
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
        >
          <Check className="w-3.5 h-3.5" />
          {saving ? 'Lagrer...' : 'Lagre'}
        </button>
      </div>
    </div>
  );
}

function EditField({
  label,
  value,
  onChange,
  allowNegative = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  allowNegative?: boolean;
}) {
  const [str, setStr] = useState(String(value));

  useEffect(() => {
    setStr(String(value));
  }, [value]);

  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase text-slate-500 tracking-wide mb-1">
        {label}
      </label>
      <input
        type="number"
        value={str}
        onChange={e => {
          setStr(e.target.value);
          const v = parseFloat(e.target.value);
          if (!isNaN(v) && (allowNegative || v >= 0)) onChange(v);
        }}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 tabular-nums"
      />
    </div>
  );
}

function ClickBadge({
  label,
  value,
  color,
  dimmed = false,
}: {
  label: string;
  value: string;
  color: 'emerald' | 'sky';
  dimmed?: boolean;
}) {
  const colors = {
    emerald: dimmed
      ? 'bg-slate-50 border-slate-200 text-slate-400'
      : 'bg-emerald-50 border-emerald-200 text-emerald-700',
    sky: dimmed
      ? 'bg-slate-50 border-slate-200 text-slate-400'
      : 'bg-sky-50 border-sky-200 text-sky-700',
  };

  const labelColor = {
    emerald: dimmed ? 'text-slate-400' : 'text-emerald-500',
    sky: dimmed ? 'text-slate-400' : 'text-sky-500',
  };

  return (
    <div className={`border rounded-lg px-2.5 py-1 text-center min-w-[52px] ${colors[color]}`}>
      <p className={`text-sm font-bold tabular-nums leading-none ${dimmed ? 'text-[11px]' : ''}`}>
        {value}
      </p>
      <p className={`text-[9px] font-semibold uppercase mt-0.5 ${labelColor[color]}`}>
        {label}
      </p>
    </div>
  );
}

function ResetDivider({
  isFinfelt,
  prevElevClicks,
  prevWindClicks,
  nextWindClicks,
}: {
  isFinfelt: boolean;
  prevElevClicks: number | null;
  prevWindClicks?: number | null;
  nextWindClicks?: number | null;
}) {
  if (isFinfelt) {
    return <div className="h-2" />;
  }

  let resetText = 'Skru tilbake til 0';
  if (prevElevClicks != null && prevElevClicks !== 0) {
    const inverted = -prevElevClicks;
    const sign = inverted > 0 ? '+' : '';
    resetText = `Skru ${sign}${inverted} tilbake til 0`;
  }

  const prevWind = prevWindClicks || 0;
  const nextWind = nextWindClicks || 0;
  const windDelta = nextWind - prevWind;
  const hasWindDelta = windDelta !== 0;

  return (
    <div className="flex flex-col items-center gap-1 py-3 px-2">
      <div className="flex items-center gap-3 w-full">
        <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--instruction-border)' }} />
        <div
          className="flex items-center gap-2 border-2 rounded-lg px-4 py-2 shadow-sm"
          style={{
            backgroundColor: 'var(--instruction-bg)',
            borderColor: 'var(--instruction-border)',
          }}
        >
          <RotateCcw className="w-4 h-4" style={{ color: 'var(--instruction-text-light)' }} />
          <span
            className="text-xs font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ color: 'var(--instruction-text)' }}
          >
            {resetText}
          </span>
        </div>
        <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--instruction-border)' }} />
      </div>

      {hasWindDelta && (
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--instruction-border)' }} />
          <div
            className="flex items-center gap-2 border-2 rounded-lg px-4 py-2 shadow-sm"
            style={{
              backgroundColor: 'var(--instruction-bg)',
              borderColor: 'var(--instruction-border)',
            }}
          >
            <Wind className="w-4 h-4" style={{ color: 'var(--instruction-text-light)' }} />
            <span
              className="text-xs font-bold uppercase tracking-wider whitespace-nowrap"
              style={{ color: 'var(--instruction-text)' }}
            >
              Vind: Skru {windDelta > 0 ? '+' : ''}{windDelta} knepp {windDelta > 0 ? 'høyre' : 'venstre'}
            </span>
          </div>
          <div className="flex-1 border-t-2 border-dashed" style={{ borderColor: 'var(--instruction-border)' }} />
        </div>
      )}
    </div>
  );
}

function FinalResetReminder({
  lastClicks,
  lastWindClicks,
}: {
  lastClicks: number | null;
  lastWindClicks: number | null;
}) {
  const hasHeight = lastClicks != null && lastClicks !== 0;
  const hasWind = lastWindClicks != null && lastWindClicks !== 0;

  let heightText = 'Skru tilbake til 0 etter siste hold';
  if (hasHeight) {
    const inverted = -lastClicks;
    const sign = inverted > 0 ? '+' : '';
    heightText = `Høyde: Skru ${sign}${inverted} tilbake til 0`;
  }

  let windText = '';
  if (hasWind) {
    const inverted = -lastWindClicks;
    const sign = inverted > 0 ? '+' : '';
    const dir = lastWindClicks > 0 ? 'venstre' : 'høyre';
    windText = `Vind: Skru ${sign}${inverted} knepp ${dir}`;
  }

  return (
    <div className="mt-4 mb-2 space-y-2">
      <div
        className="border p-3 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2"
        style={{
          backgroundColor: 'var(--instruction-bg)',
          borderColor: 'var(--instruction-border)',
          color: 'var(--instruction-text)',
        }}
      >
        <RotateCcw className="w-4 h-4 flex-shrink-0" />
        {heightText}
      </div>
      {hasWind && (
        <div
          className="border p-3 rounded-lg text-sm font-medium text-center flex items-center justify-center gap-2"
          style={{
            backgroundColor: 'var(--instruction-bg)',
            borderColor: 'var(--instruction-border)',
            color: 'var(--instruction-text)',
          }}
        >
          <Wind className="w-4 h-4 flex-shrink-0" />
          {windText}
        </div>
      )}
    </div>
  );
}
