import { Crosshair, Wind, Clock, Target, ArrowRight, X } from 'lucide-react';
import { FieldFigure } from '../FieldFigure';
import type { MatchHoldWithFigure } from '../../lib/match-service';

interface FirstHoldModalProps {
  hold: MatchHoldWithFigure;
  holdIndex: number;
  isFinfelt: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FirstHoldModal({ hold, holdIndex, isFinfelt, onConfirm, onCancel }: FirstHoldModalProps) {
  const distanceM = hold.distance_m || 0;
  const heightClicks = hold.recommended_clicks || 0;
  const windClicks = hold.recommended_wind_clicks || 0;
  const shootTime = hold.shooting_time_seconds || 60;
  const hasWind = !isFinfelt && windClicks !== 0;
  const isFirst = holdIndex === 0;

  const title = isFirst ? 'Still inn siktet' : `Hold ${holdIndex + 1} - Oppsett`;
  const description = isFirst
    ? 'Kontroller at siktet er stilt inn riktig for første hold.'
    : `Still inn siktet for hold ${holdIndex + 1}.`;
  const confirmLabel = isFirst ? 'Klar \u2013 start hold' : `Klar \u2013 start hold ${holdIndex + 1}`;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-emerald-600 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Crosshair className="w-5 h-5 text-white" />
            <h2 className="text-lg font-bold text-white">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600 leading-snug">{description}</p>

          {hold.field_figure && (
            <div className="flex items-center gap-4 bg-slate-50 rounded-xl p-3">
              <FieldFigure figure={hold.field_figure} size="compact" />
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {hold.field_figure.short_code || hold.field_figure.code || hold.field_figure.name}
                </p>
                <p className="text-xs text-slate-500">Figur for hold {holdIndex + 1}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3 text-center">
              <Target className="w-4 h-4 text-slate-400 mx-auto mb-1" />
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">Avstand</p>
              <p className="text-xl font-bold text-slate-900">{distanceM}m</p>
            </div>

            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3 text-center">
              <Crosshair className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
              <p className="text-[10px] uppercase tracking-wider text-emerald-700 font-semibold mb-0.5">Høyde</p>
              <p className="text-xl font-bold text-emerald-700">
                {heightClicks > 0 ? '+' : ''}{heightClicks}
              </p>
              <p className="text-[10px] text-emerald-600">knepp</p>
            </div>
          </div>

          {hasWind && (
            <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Wind className="w-4 h-4 text-sky-600" />
                <span className="text-[10px] uppercase tracking-wider text-sky-700 font-semibold">Vindkorreksjon</span>
              </div>
              <p className="text-xl font-bold text-sky-800 text-center">
                {Math.abs(windClicks)} knepp {windClicks > 0 ? 'høyre' : 'venstre'}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5">
            <Clock className="w-4 h-4 text-slate-400" />
            <span className="text-xs text-slate-600">Skytetid:</span>
            <span className="text-sm font-bold text-slate-900">{shootTime} sek</span>
          </div>
        </div>

        <div className="px-5 pb-5 space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-base font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            <span>{confirmLabel}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium rounded-xl transition"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
