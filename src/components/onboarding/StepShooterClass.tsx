import { useEffect, useState } from 'react';
import { Target, Crosshair, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getShooterClassSetup, ShooterClassSetup } from '../../lib/dfs-class-config';
import { getCategoryDisplayName, getFieldTypeDisplayName } from '../../lib/display-names';
import type { ShooterClass } from '../../types/database';

interface Props {
  value: string | null;
  onChange: (classCode: string, setup: ShooterClassSetup) => void;
}

interface GroupedClasses {
  category: string;
  label: string;
  classes: ShooterClass[];
}

const CATEGORY_ORDER = ['ungdom', 'junior', 'senior', 'veteran', 'spesial'];

export function StepShooterClass({ value, onChange }: Props) {
  const [classes, setClasses] = useState<ShooterClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSetup, setSelectedSetup] = useState<ShooterClassSetup | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (value) {
      getShooterClassSetup(value).then(setup => {
        if (setup) setSelectedSetup(setup);
      });
    }
  }, [value]);

  const loadClasses = async () => {
    const { data } = await supabase
      .from('shooter_classes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (data) setClasses(data);
    setLoading(false);
  };

  const handleSelect = async (sc: ShooterClass) => {
    const setup = await getShooterClassSetup(sc.code);
    if (setup) {
      setSelectedSetup(setup);
      onChange(sc.code, setup);
    }
  };

  const grouped: GroupedClasses[] = CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      label: getCategoryDisplayName(cat),
      classes: classes.filter(c => c.category === cat),
    }))
    .filter(g => g.classes.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900">Hvilken skytterklasse?</h2>
        <p className="text-slate-600 mt-2">Velg din klasse for automatisk oppsett</p>
      </div>

      <div className="space-y-2">
        {grouped.map(group => {
          const isExpanded = expandedCategory === group.category || grouped.length <= 3;
          const hasSelection = group.classes.some(c => c.code === value);

          return (
            <div key={group.category}>
              <button
                type="button"
                onClick={() => setExpandedCategory(
                  expandedCategory === group.category ? null : group.category
                )}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors ${
                  hasSelection ? 'bg-emerald-50' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <span className={`text-sm font-semibold ${hasSelection ? 'text-emerald-700' : 'text-slate-600'}`}>
                  {group.label}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="grid grid-cols-2 gap-2 mt-2 px-1">
                  {group.classes.map(sc => {
                    const selected = value === sc.code;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => handleSelect(sc)}
                        className={`relative flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                          selected
                            ? 'border-emerald-500 bg-emerald-50 shadow-md'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <span className={`font-semibold text-sm leading-tight ${
                          selected ? 'text-emerald-900' : 'text-slate-900'
                        }`}>
                          {sc.name}
                        </span>
                        {selected && (
                          <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Setup summary */}
      {selectedSetup && value && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 animate-fade-in">
          <div className="flex items-start gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0 ${
              selectedSetup.field_type === 'finfelt' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {selectedSetup.field_type === 'finfelt'
                ? <Target className="w-5 h-5" />
                : <Crosshair className="w-5 h-5" />
              }
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-slate-900 text-sm">
                {selectedSetup.class_name}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Feltassistent setter opp:
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                <span className="inline-flex items-center text-xs font-medium text-slate-700">
                  {getFieldTypeDisplayName(selectedSetup.field_type)}
                </span>
                {selectedSetup.bane_distances.length > 0 && (
                  <span className="inline-flex items-center text-xs text-slate-600">
                    Bane {selectedSetup.bane_distances.join(' / ')} m
                  </span>
                )}
                {selectedSetup.default_caliber && (
                  <span className="inline-flex items-center text-xs text-slate-600">
                    {selectedSetup.default_caliber}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
