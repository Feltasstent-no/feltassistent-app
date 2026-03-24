import { useState } from 'react';
import { FieldFigure } from '../types/database';
import { FieldFigurePreview } from './FieldFigurePreview';
import { Check } from 'lucide-react';
import { CompactFigureSelector } from './CompactFigureSelector';

interface FieldFigureSelectorProps {
  figures: FieldFigure[];
  selectedFigureId: string | null;
  onSelect: (figureId: string) => void;
  showDistanceInfo?: boolean;
  competitionType?: 'grovfelt' | 'finfelt';
}

export function FieldFigureSelector({
  figures,
  selectedFigureId,
  onSelect,
  showDistanceInfo = false,
  competitionType
}: FieldFigureSelectorProps) {
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'grovfelt' | 'finfelt'>(
    competitionType || 'all'
  );

  console.log('[FieldFigureSelector] ========== RENDER ==========');
  console.log('[FieldFigureSelector] competitionType:', competitionType);
  console.log('[FieldFigureSelector] figures.length:', figures.length);
  console.log('[FieldFigureSelector] selectedFigureId:', selectedFigureId);

  const filteredFigures = figures.filter(figure => {
    if (competitionType) {
      return figure.category === competitionType;
    }
    if (categoryFilter === 'all') return true;
    return figure.category === categoryFilter;
  });

  console.log('[FieldFigureSelector] filteredFigures.length:', filteredFigures.length);
  console.log('[FieldFigureSelector] filteredFigures:', filteredFigures.map(f => ({
    id: f.id,
    code: f.code,
    name: f.name,
    category: f.category
  })));

  if (competitionType === 'finfelt' || competitionType === 'grovfelt') {
    console.log('[FieldFigureSelector] ▶️  Using CompactFigureSelector');
    return (
      <CompactFigureSelector
        figures={filteredFigures}
        selectedFigureId={selectedFigureId}
        onSelect={(figureId) => {
          console.log('[FieldFigureSelector] 🎯 CompactFigureSelector onSelect:', figureId);
          onSelect(figureId);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {!competitionType && (
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition ${
              categoryFilter === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Alle ({figures.length})
          </button>
          <button
            onClick={() => setCategoryFilter('grovfelt')}
            className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition ${
              categoryFilter === 'grovfelt'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Grovfelt ({figures.filter(f => f.category === 'grovfelt').length})
          </button>
          <button
            onClick={() => setCategoryFilter('finfelt')}
            className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition ${
              categoryFilter === 'finfelt'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Finfelt ({figures.filter(f => f.category === 'finfelt').length})
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredFigures.map((figure) => {
          const isSelected = selectedFigureId === figure.id;

          return (
            <button
              key={figure.id}
              type="button"
              onClick={() => onSelect(figure.id)}
              className={`relative p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-emerald-600 bg-emerald-50 shadow-md'
                  : 'border-slate-200 hover:border-emerald-300 bg-white'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center z-10">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}

              <FieldFigurePreview
                figure={figure}
                size="md"
                showDetails={false}
              />

              <div className="mt-3 text-center">
                <div className={`text-base font-bold mb-1 ${
                  isSelected ? 'text-emerald-900' : 'text-slate-900'
                }`}>
                  {figure.short_code || figure.code}
                </div>
                <div className={`text-xs font-medium ${
                  isSelected ? 'text-emerald-700' : 'text-slate-600'
                }`}>
                  {figure.name}
                </div>

                {showDistanceInfo && figure.max_distance_m && (
                  <div className={`text-xs mt-1 ${
                    isSelected ? 'text-emerald-600' : 'text-slate-500'
                  }`}>
                    Maks {figure.max_distance_m}m
                  </div>
                )}
              </div>
            </button>
          );
        })}

        {filteredFigures.length === 0 && (
          <div className="col-span-full text-center py-8 text-slate-500">
            {categoryFilter === 'all'
              ? 'Ingen figurer tilgjengelig'
              : `Ingen ${categoryFilter === 'grovfelt' ? 'grovfelt' : 'finfelt'} figurer tilgjengelig`}
          </div>
        )}
      </div>
    </div>
  );
}
