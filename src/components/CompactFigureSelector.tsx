import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { FieldFigure } from '../types/database';
import { FieldFigurePreview } from './FieldFigurePreview';

interface CompactFigureSelectorProps {
  figures: FieldFigure[];
  selectedFigureId: string | null;
  onSelect: (figureId: string) => void;
}

export function CompactFigureSelector({
  figures,
  selectedFigureId,
  onSelect,
}: CompactFigureSelectorProps) {
  const [isOpen, setIsOpen] = useState(!selectedFigureId);

  console.log('[CompactFigureSelector] ========== RENDER ==========');
  console.log('[CompactFigureSelector] selectedFigureId:', selectedFigureId);
  console.log('[CompactFigureSelector] figures count:', figures.length);

  const selectedFigure = figures.find((f) => f.id === selectedFigureId);

  console.log('[CompactFigureSelector] selectedFigure:', selectedFigure ? {
    id: selectedFigure.id,
    code: selectedFigure.code,
    name: selectedFigure.name
  } : 'null');

  const handleSelect = (figureId: string) => {
    const clickedFigure = figures.find((f) => f.id === figureId);
    console.log('[CompactFigureSelector] ========== FIGURE CLICKED ==========');
    console.log('[CompactFigureSelector] 🎯 Clicked figure ID:', figureId);
    console.log('[CompactFigureSelector] 🏷️  Clicked figure code:', clickedFigure?.code);
    console.log('[CompactFigureSelector] 📝 Clicked figure name:', clickedFigure?.name);
    console.log('[CompactFigureSelector] 🔄 Previous selectedFigureId:', selectedFigureId);
    console.log('[CompactFigureSelector] 🔄 Previous figure code:', selectedFigure?.code);
    console.log('[CompactFigureSelector] ▶️  Calling onSelect with:', figureId);

    onSelect(figureId);
    setIsOpen(false);
  };

  return (
    <div className="border border-slate-300 rounded-lg bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
      >
        {selectedFigure ? (
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 flex-shrink-0">
              <FieldFigurePreview
                figure={selectedFigure}
                size="sm"
                showDetails={false}
              />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <div className="font-bold text-slate-900 text-lg">
                {selectedFigure.short_code || selectedFigure.code}
              </div>
              <div className="text-sm text-slate-600">{selectedFigure.name}</div>
            </div>
            {selectedFigure.max_distance_m && (
              <div className="text-sm font-medium text-slate-500 mr-2">
                {selectedFigure.max_distance_m}m
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-500">Velg figur...</span>
        )}

        <ChevronDown
          className={`w-5 h-5 text-slate-400 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 max-h-80 overflow-y-auto">
          {figures.map((figure, index) => {
            const isSelected = selectedFigureId === figure.id;

            console.log(`[CompactFigureSelector] Row ${index}:`, {
              id: figure.id,
              code: figure.code,
              name: figure.name,
              isSelected
            });

            return (
              <button
                key={figure.id}
                type="button"
                onClick={() => {
                  console.log(`[CompactFigureSelector] 🖱️  ROW ${index} CLICKED:`, {
                    id: figure.id,
                    code: figure.code,
                    name: figure.name
                  });
                  handleSelect(figure.id);
                }}
                className={`w-full flex items-center gap-3 p-3 border-b border-slate-100 last:border-b-0 transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 hover:bg-emerald-100'
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="w-10 h-10 flex-shrink-0">
                  <FieldFigurePreview
                    figure={figure}
                    size="sm"
                    showDetails={false}
                  />
                </div>

                <div className="flex items-center gap-2 flex-1">
                  <div
                    className={`font-bold text-lg ${
                      isSelected ? 'text-emerald-900' : 'text-slate-900'
                    }`}
                  >
                    {figure.short_code || figure.code}
                  </div>
                  <div
                    className={`text-sm ${
                      isSelected ? 'text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    {figure.name}
                  </div>
                </div>

                {figure.max_distance_m && (
                  <div
                    className={`text-sm font-medium ${
                      isSelected ? 'text-emerald-600' : 'text-slate-500'
                    }`}
                  >
                    {figure.max_distance_m}m
                  </div>
                )}

                {isSelected && (
                  <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
