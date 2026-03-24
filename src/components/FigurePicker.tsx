import { useState } from 'react';
import { X, Target } from 'lucide-react';
import { FieldFigure } from '../types/database';

interface FigurePickerProps {
  figures: FieldFigure[];
  selectedFigure: FieldFigure | null;
  onSelect: (figure: FieldFigure) => void;
}

export function FigurePicker({ figures, selectedFigure, onSelect }: FigurePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (figure: FieldFigure) => {
    onSelect(figure);
    setIsOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-3 border border-slate-300 rounded-md bg-white text-slate-900 text-left flex items-center justify-between hover:border-blue-500 transition-colors"
      >
        <div className="flex items-center space-x-3">
          {selectedFigure ? (
            <>
              {selectedFigure.image_url ? (
                <img
                  src={selectedFigure.image_url}
                  alt={selectedFigure.name}
                  className="w-10 h-10 object-contain rounded"
                />
              ) : (
                <div className="w-10 h-10 bg-slate-200 rounded flex items-center justify-center">
                  <Target className="h-6 w-6 text-slate-500" />
                </div>
              )}
              <div>
                <div className="font-medium">{selectedFigure.name}</div>
                <div className="text-sm text-slate-500">
                  {selectedFigure.short_code && `${selectedFigure.short_code}`}
                  {selectedFigure.normal_distance_m && ` – Maks ${selectedFigure.normal_distance_m}m`}
                </div>
              </div>
            </>
          ) : (
            <span className="text-slate-500">Velg en figur...</span>
          )}
        </div>
        <svg
          className="h-5 w-5 text-slate-500"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />

          <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-lg shadow-xl max-h-[80vh] flex flex-col rounded-t-lg sm:rounded-lg">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                Velg figur
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-3">
                {figures.map((figure) => (
                  <button
                    key={figure.id}
                    onClick={() => handleSelect(figure)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedFigure?.id === figure.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col items-center space-y-2">
                      {figure.image_url ? (
                        <img
                          src={figure.image_url}
                          alt={figure.name}
                          className="w-full h-24 object-contain rounded"
                        />
                      ) : (
                        <div className="w-full h-24 bg-slate-100 rounded flex items-center justify-center">
                          <Target className="h-12 w-12 text-slate-500" />
                        </div>
                      )}
                      <div className="w-full text-center">
                        <div className="font-medium text-sm text-slate-900">
                          {figure.name}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {figure.short_code && `${figure.short_code}`}
                          {figure.normal_distance_m && ` – Maks ${figure.normal_distance_m}m`}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
