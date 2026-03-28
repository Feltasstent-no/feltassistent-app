import { RotateCcw, ArrowUp, Wind, PlusCircle } from 'lucide-react';

interface ResetReminderProps {
  onConfirm: () => void;
  onAddHold?: () => void;
  previousClicks?: number | null;
  previousWindClicks?: number | null;
  nextWindClicks?: number | null;
  isLastHold?: boolean;
}

export function ResetReminder({
  onConfirm,
  onAddHold,
  previousClicks,
  previousWindClicks,
  nextWindClicks,
  isLastHold = false,
}: ResetReminderProps) {
  const hasHeight = previousClicks != null && previousClicks !== 0;
  const hasWindReset = isLastHold && previousWindClicks != null && previousWindClicks !== 0;

  const prevWind = previousWindClicks || 0;
  const nextWind = nextWindClicks || 0;
  const windDelta = nextWind - prevWind;
  const hasWindDelta = !isLastHold && windDelta !== 0;

  const invertedHeight = hasHeight ? -previousClicks : 0;
  const heightSign = invertedHeight > 0 ? '+' : '';

  const invertedWind = hasWindReset ? -previousWindClicks : 0;
  const windSign = invertedWind > 0 ? '+' : '';
  const windDirection = hasWindReset
    ? (previousWindClicks > 0 ? 'venstre' : 'høyre')
    : '';

  const windDeltaDirection = windDelta > 0 ? 'høyre' : 'venstre';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl">
        <div className="mb-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--instruction-icon-bg)' }}
          >
            <RotateCcw className="w-10 h-10" style={{ color: 'var(--instruction-text-light)' }} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
            TILBAKE TIL NULL
          </h2>

          {hasHeight && (
            <div
              className="rounded-xl px-4 py-3 mb-3 border-2"
              style={{
                backgroundColor: 'var(--instruction-bg)',
                borderColor: 'var(--instruction-border)',
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <ArrowUp className="w-5 h-5" style={{ color: 'var(--instruction-text-light)' }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--instruction-text-light)' }}
                >
                  Høydeknepp
                </span>
              </div>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: 'var(--instruction-text)' }}
              >
                Skru {heightSign}{invertedHeight} knepp tilbake til 0
              </p>
            </div>
          )}

          {hasWindDelta && (
            <div
              className="rounded-xl px-4 py-3 mb-3 border-2"
              style={{
                backgroundColor: 'var(--instruction-bg)',
                borderColor: 'var(--instruction-border)',
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wind className="w-5 h-5" style={{ color: 'var(--instruction-text-light)' }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--instruction-text-light)' }}
                >
                  Vindjustering neste hold
                </span>
              </div>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: 'var(--instruction-text)' }}
              >
                Skru {windDelta > 0 ? '+' : ''}{windDelta} knepp {windDeltaDirection}
              </p>
              <p
                className="text-xs mt-1"
                style={{ color: 'var(--instruction-text-light)' }}
              >
                {prevWind !== 0
                  ? `Fra ${Math.abs(prevWind)} ${prevWind > 0 ? 'H' : 'V'} → ${Math.abs(nextWind)} ${nextWind > 0 ? 'H' : 'V'}`
                  : `Til ${Math.abs(nextWind)} knepp ${nextWind > 0 ? 'høyre' : 'venstre'}`
                }
              </p>
            </div>
          )}

          {hasWindReset && (
            <div
              className="rounded-xl px-4 py-3 mb-3 border-2"
              style={{
                backgroundColor: 'var(--instruction-bg)',
                borderColor: 'var(--instruction-border)',
              }}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <Wind className="w-5 h-5" style={{ color: 'var(--instruction-text-light)' }} />
                <span
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--instruction-text-light)' }}
                >
                  Vindknepp
                </span>
              </div>
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: 'var(--instruction-text)' }}
              >
                Skru {windSign}{invertedWind} knepp {windDirection} til 0
              </p>
            </div>
          )}

          {!hasHeight && !hasWindReset && !hasWindDelta && (
            <div
              className="rounded-xl px-4 py-3 mb-3 border-2"
              style={{
                backgroundColor: 'var(--instruction-bg)',
                borderColor: 'var(--instruction-border)',
              }}
            >
              <p
                className="text-2xl font-bold tabular-nums"
                style={{ color: 'var(--instruction-text)' }}
              >
                Skru tilbake til 0
              </p>
            </div>
          )}

          <p className="text-base text-slate-600">
            {isLastHold
              ? hasWindReset
                ? 'Husk å nullstille både høyde- og vindknepp etter siste hold'
                : 'Husk å skru tilbake til nullpunkt etter siste hold'
              : hasWindDelta
                ? 'Nullstill høyde og juster vind før neste hold'
                : 'Skru siktet tilbake til 0 før neste hold'}
          </p>
        </div>

        <button
          onClick={onConfirm}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xl font-bold rounded-xl transition shadow-lg"
        >
          {isLastHold ? 'Fullfør stevne' : 'Bekreftet -- Neste hold'}
        </button>

        {isLastHold && onAddHold && (
          <button
            onClick={onAddHold}
            className="w-full mt-3 py-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition border-2 border-slate-300 flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            Legg til ekstra hold
          </button>
        )}
      </div>
    </div>
  );
}
