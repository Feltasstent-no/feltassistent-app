import { useState } from 'react';
import { X, Check, AlertCircle } from 'lucide-react';
import { ShotRecommendation } from '../lib/field-assistant';

interface ShotLogDialogProps {
  recommendation: ShotRecommendation;
  onLog: (data: {
    actual_clicks: number;
    actual_wind_clicks?: number;
    result: 'hit' | 'miss' | 'near_miss';
    notes?: string;
  }) => void;
  onCancel: () => void;
}

export function ShotLogDialog({ recommendation, onLog, onCancel }: ShotLogDialogProps) {
  const [actualClicks, setActualClicks] = useState(recommendation.elevation_clicks);
  const [actualWindClicks, setActualWindClicks] = useState(recommendation.wind_clicks || 0);
  const [result, setResult] = useState<'hit' | 'miss' | 'near_miss'>('hit');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLog({
      actual_clicks: actualClicks,
      actual_wind_clicks: recommendation.wind_clicks !== undefined ? actualWindClicks : undefined,
      result,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Logg skudd</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Result */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Resultat *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setResult('hit')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  result === 'hit'
                    ? 'border-green-600 bg-green-50 text-green-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Check className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">Treff</div>
              </button>
              <button
                type="button"
                onClick={() => setResult('near_miss')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  result === 'near_miss'
                    ? 'border-yellow-600 bg-yellow-50 text-yellow-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <AlertCircle className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">Nesten</div>
              </button>
              <button
                type="button"
                onClick={() => setResult('miss')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  result === 'miss'
                    ? 'border-red-600 bg-red-50 text-red-900'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <X className="w-5 h-5 mx-auto mb-1" />
                <div className="text-xs font-medium">Bom</div>
              </button>
            </div>
          </div>

          {/* Actual clicks used */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Brukt høydekorreksjon (knepp) *
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Anbefalt: {recommendation.elevation_clicks}</span>
              <span className="text-slate-500">→</span>
              <input
                type="number"
                value={actualClicks}
                onChange={(e) => setActualClicks(parseFloat(e.target.value))}
                step="0.5"
                className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Wind clicks if applicable */}
          {recommendation.wind_clicks !== undefined && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Brukt vindkorreksjon (knepp)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-600">Anbefalt: {recommendation.wind_clicks}</span>
                <span className="text-slate-500">→</span>
                <input
                  type="number"
                  value={actualWindClicks}
                  onChange={(e) => setActualWindClicks(parseFloat(e.target.value))}
                  step="0.5"
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notater (valgfritt)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="F.eks. vindforhold, lysforhold, justeringer..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Lagre skudd
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
