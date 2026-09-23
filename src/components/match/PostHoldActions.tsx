import { RotateCw, ArrowRight, PlusCircle, CheckCircle2 } from 'lucide-react';

interface PostHoldActionsProps {
  isLast: boolean;
  onNext: () => void;
  onReshoot: () => void;
  onAddHold?: () => void;
  disabled?: boolean;
}

export function PostHoldActions({
  isLast,
  onNext,
  onReshoot,
  onAddHold,
  disabled = false,
}: PostHoldActionsProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Hold fullført</h2>
        <p className="text-sm text-slate-500 mb-6">
          {isLast ? 'Dette var siste hold.' : 'Velg neste handling.'}
        </p>
        <div className="space-y-3">
          <button
            onClick={onNext}
            disabled={disabled}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2"
          >
            {isLast ? (
              'Fullfør stevne'
            ) : (
              <>
                Neste hold <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
          <button
            onClick={onReshoot}
            disabled={disabled}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2"
          >
            <RotateCw className="w-5 h-5" />
            {isLast ? 'Omskyting siste hold' : 'Omskyting'}
          </button>
          {isLast && onAddHold && (
            <button
              onClick={onAddHold}
              disabled={disabled}
              className="w-full py-3 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-semibold rounded-xl transition border-2 border-slate-300 flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5 text-emerald-600" />
              Legg til ekstra hold
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
