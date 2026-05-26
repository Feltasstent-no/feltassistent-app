import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Lightbulb, CheckCircle, Trash2, Target, Trophy, BookOpen } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface FocusPoint {
  id: string;
  text: string;
  source_type: 'felt' | 'bane' | 'trening';
  source_name: string;
  source_id: string | null;
  created_at: string;
  is_resolved: boolean;
}

const SOURCE_CONFIG = {
  felt: { label: 'FELT', color: 'bg-emerald-100 text-emerald-700', icon: Target },
  bane: { label: 'BANE', color: 'bg-amber-100 text-amber-700', icon: Trophy },
  trening: { label: 'TRENING', color: 'bg-blue-100 text-blue-700', icon: BookOpen },
} as const;

export function FocusPoints() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [points, setPoints] = useState<FocusPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    fetchPoints();
  }, [user]);

  const fetchPoints = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('focus_points')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPoints(data || []);
    setLoading(false);
  };

  const handleToggleResolved = async (point: FocusPoint) => {
    await supabase
      .from('focus_points')
      .update({ is_resolved: !point.is_resolved })
      .eq('id', point.id);
    setPoints(prev => prev.map(p => p.id === point.id ? { ...p, is_resolved: !p.is_resolved } : p));
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    await supabase.from('focus_points').delete().eq('id', deleteConfirm);
    setPoints(prev => prev.filter(p => p.id !== deleteConfirm));
    setDeleteConfirm(null);
  };

  const unresolvedPoints = points.filter(p => !p.is_resolved);
  const resolvedPoints = points.filter(p => p.is_resolved);

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
      <div className="max-w-2xl mx-auto pb-20 md:pb-8">
        <button
          onClick={() => navigate('/match')}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake</span>
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Fokusområder</h1>
        </div>
        <p className="text-slate-500 text-sm mb-8">
          Fokusområder fra stevner og trening
        </p>

        {points.length === 0 ? (
          <div className="text-center py-16">
            <Lightbulb className="w-14 h-14 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600 font-medium mb-1">Ingen fokusområder ennå</p>
            <p className="text-sm text-slate-400">
              Bruk "Lagre som fokusområde" ved notater i serier
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {unresolvedPoints.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Aktive ({unresolvedPoints.length})
                </h2>
                <div className="space-y-2">
                  {unresolvedPoints.map((point) => {
                    const config = SOURCE_CONFIG[point.source_type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={point.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3"
                      >
                        <button
                          onClick={() => handleToggleResolved(point)}
                          className="mt-0.5 w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-500 flex-shrink-0 transition"
                          title="Merk som forbedret"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-900 text-sm font-medium leading-snug mb-1.5">
                            {point.text}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${config.color}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {config.label}
                            </span>
                            {point.source_name && (
                              <span className="text-xs text-slate-400">{point.source_name}</span>
                            )}
                            <span className="text-xs text-slate-400">
                              {new Date(point.created_at).toLocaleDateString('nb-NO')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteConfirm(point.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {resolvedPoints.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Forbedret ({resolvedPoints.length})
                </h2>
                <div className="space-y-2">
                  {resolvedPoints.map((point) => {
                    const config = SOURCE_CONFIG[point.source_type];
                    const Icon = config.icon;
                    return (
                      <div
                        key={point.id}
                        className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-start gap-3 opacity-70"
                      >
                        <button
                          onClick={() => handleToggleResolved(point)}
                          className="mt-0.5 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0 transition hover:bg-emerald-600"
                          title="Merk som ikke forbedret"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-white" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-500 text-sm line-through leading-snug mb-1.5">
                            {point.text}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${config.color}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {config.label}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(point.created_at).toLocaleDateString('nb-NO')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => setDeleteConfirm(point.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 transition flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Slett fokusområde?"
        message="Er du sikker på at du vil slette dette punktet?"
        confirmText="Slett"
        cancelText="Avbryt"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        isDestructive
      />
    </Layout>
  );
}
