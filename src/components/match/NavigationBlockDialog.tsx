import { AlertTriangle } from 'lucide-react';

interface NavigationBlockDialogProps {
  onContinue: () => void;
  onExit: () => void;
}

export function NavigationBlockDialog({ onContinue, onExit }: NavigationBlockDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Du er midt i et hold
            </h2>
            <p className="text-slate-600">
              Hvis du forlater nå, vil klokken starte på nytt når du kommer tilbake.
            </p>
          </div>

          <div className="flex flex-col w-full space-y-2 pt-2">
            <button
              onClick={onContinue}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
            >
              Fortsett holdet
            </button>
            <button
              onClick={onExit}
              className="w-full py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition"
            >
              Pause stevne
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
