import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { createMatchSession } from '../lib/match-service';
import { ArrowLeft, Wind } from 'lucide-react';
import { WindInput } from '../components/WindInput';
import type { ClickTable, CompetitionTemplate } from '../types/database';

export function MatchSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [clickTables, setClickTables] = useState<ClickTable[]>([]);
  const [templates, setTemplates] = useState<CompetitionTemplate[]>([]);

  const [fieldType, setFieldType] = useState<'grovfelt' | 'finfelt'>('grovfelt');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [matchName, setMatchName] = useState('');
  const [windSpeed, setWindSpeed] = useState<number>(0);
  const [windDirection, setWindDirection] = useState<number>(90);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;

    const [tablesRes, templatesRes, lastMatchRes] = await Promise.all([
      supabase
        .from('click_tables')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('competition_templates')
        .select('*')
        .eq('is_active', true)
        .order('sort_order'),
      supabase
        .from('match_sessions')
        .select('click_table_id, template_id, competition_type, wind_speed_mps, wind_direction_degrees')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (tablesRes.data) setClickTables(tablesRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data);

    const lastMatch = lastMatchRes.data;

    if (lastMatch?.competition_type) {
      setFieldType(lastMatch.competition_type as 'grovfelt' | 'finfelt');
    }

    if (lastMatch?.click_table_id && tablesRes.data?.some(t => t.id === lastMatch.click_table_id)) {
      setSelectedTableId(lastMatch.click_table_id);
    } else if (tablesRes.data && tablesRes.data.length > 0) {
      setSelectedTableId(tablesRes.data[0].id);
    }

    if (lastMatch?.template_id && templatesRes.data?.some(t => t.id === lastMatch.template_id)) {
      setSelectedTemplateId(lastMatch.template_id);
      const template = templatesRes.data?.find(t => t.id === lastMatch.template_id);
      if (template) {
        setMatchName(`${template.name} - ${new Date().toLocaleDateString('nb-NO')}`);
      }
    } else if (templatesRes.data && templatesRes.data.length > 0) {
      setSelectedTemplateId(templatesRes.data[0].id);
      const template = templatesRes.data[0];
      setMatchName(`${template.name} - ${new Date().toLocaleDateString('nb-NO')}`);
    }

    if (lastMatch?.wind_speed_mps !== undefined && lastMatch.wind_speed_mps !== null) {
      setWindSpeed(lastMatch.wind_speed_mps);
    }
    if (lastMatch?.wind_direction_degrees !== undefined && lastMatch.wind_direction_degrees !== null) {
      setWindDirection(lastMatch.wind_direction_degrees);
    }

    setLoading(false);
  };

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setMatchName(`${template.name} - ${new Date().toLocaleDateString('nb-NO')}`);
    }
  };

  const handleFieldTypeChange = (newFieldType: 'grovfelt' | 'finfelt') => {
    setFieldType(newFieldType);

    if (newFieldType === 'finfelt') {
      setSelectedTableId('');
      setWindSpeed(0);
      setWindDirection(90);
    } else if (newFieldType === 'grovfelt' && clickTables.length > 0) {
      setSelectedTableId(clickTables[0].id);
    }
  };

  const handleCreateMatch = async () => {
    if (fieldType === 'grovfelt' && !selectedTableId) {
      alert('Vennligst velg en knepptabell for grovfelt');
      return;
    }

    if (!selectedTemplateId || !matchName.trim()) {
      alert('Vennligst fyll ut alle felt');
      return;
    }

    setCreating(true);

    const { session, error } = await createMatchSession({
      ballisticProfileId: fieldType === 'grovfelt' ? selectedTableId : undefined,
      templateId: selectedTemplateId,
      matchName: matchName.trim(),
      windSpeedMps: fieldType === 'grovfelt' ? windSpeed : 0,
      windDirectionDegrees: fieldType === 'grovfelt' ? windDirection : 0,
      fieldType,
    });

    setCreating(false);

    if (error) {
      alert('Feil ved opprettelse: ' + error.message);
      return;
    }

    if (session) {
      navigate(`/match/${session.id}/configure`);
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
      <div className="max-w-2xl mx-auto pb-24 md:pb-8">
        <button
          onClick={() => navigate('/match')}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 mb-6 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Tilbake</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-6">Opprett stevne</h1>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-3">1. Velg felttype</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleFieldTypeChange('grovfelt')}
                className={`p-4 rounded-lg border-2 transition ${
                  fieldType === 'grovfelt'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900 mb-0.5">Grovfelt</div>
                  <div className="text-sm text-slate-600">6 skudd, 60 sek</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleFieldTypeChange('finfelt')}
                className={`p-4 rounded-lg border-2 transition ${
                  fieldType === 'finfelt'
                    ? 'border-emerald-600 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="text-center">
                  <div className="text-xl font-bold text-slate-900 mb-0.5">Finfelt</div>
                  <div className="text-sm text-slate-600">6 skudd, 120 sek</div>
                </div>
              </button>
            </div>
          </div>

          <div className={`bg-white rounded-xl border border-slate-200 p-5 ${fieldType === 'finfelt' ? 'opacity-50' : ''}`}>
            <h2 className="text-lg font-bold text-slate-900 mb-3">
              2. Velg knepptabell
              {fieldType === 'finfelt' && (
                <span className="ml-2 text-sm font-normal text-slate-500">(brukes ikke i finfelt)</span>
              )}
            </h2>
            {fieldType === 'finfelt' ? (
              <div className="py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 text-center">
                  Finfelt bruker fast 100m og ingen knepptabell/vindassistanse i oppsettet
                </p>
              </div>
            ) : clickTables.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-600 mb-3">Du må opprette en knepptabell først</p>
                <button
                  onClick={() => navigate('/click-tables')}
                  className="text-emerald-600 hover:underline font-semibold"
                >
                  Opprett knepptabell
                </button>
              </div>
            ) : (
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {clickTables.map((table) => (
                  <option key={table.id} value={table.id}>
                    {table.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-3">3. Velg stevneløype</h2>
            {templates.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-slate-600">Ingen stevneløyper tilgjengelig</p>
              </div>
            ) : (
              <select
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-lg font-bold text-slate-900 mb-3">4. Stevnedetaljer</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Stevnenavn
              </label>
              <input
                type="text"
                value={matchName}
                onChange={(e) => setMatchName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="DFS Felt 1 - 16. mars"
              />
            </div>
          </div>

          <div className={`bg-white rounded-xl border border-slate-200 p-5 ${fieldType === 'finfelt' ? 'opacity-50' : ''}`}>
            <div className="flex items-center space-x-2 mb-3">
              <Wind className="w-5 h-5 text-slate-600" />
              <h2 className="text-lg font-bold text-slate-900">
                5. Vind (valgfritt)
                {fieldType === 'finfelt' && (
                  <span className="ml-2 text-sm font-normal text-slate-500">(brukes ikke i finfelt)</span>
                )}
              </h2>
            </div>
            {fieldType === 'finfelt' ? (
              <div className="py-3 px-4 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-600 text-center">
                  Finfelt bruker fast 100m og ingen knepptabell/vindassistanse i oppsettet
                </p>
              </div>
            ) : (
              <WindInput
                windSpeed={windSpeed}
                windAngleDeg={windDirection}
                onWindSpeedChange={setWindSpeed}
                onWindAngleChange={setWindDirection}
                compact={true}
              />
            )}
          </div>

          <button
            onClick={handleCreateMatch}
            disabled={
              creating ||
              !selectedTemplateId ||
              (fieldType === 'grovfelt' && (clickTables.length === 0 || !selectedTableId))
            }
            className="w-full mt-2 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xl font-bold rounded-xl transition shadow-lg"
          >
            {creating ? 'Oppretter...' : 'Start stevne'}
          </button>
        </div>
      </div>
    </Layout>
  );
}
