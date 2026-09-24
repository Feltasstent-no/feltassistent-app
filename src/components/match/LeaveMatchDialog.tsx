import { Clock } from 'lucide-react';

interface LeaveMatchDialogProps {
  onStay: () => void;
  onLeave: () => void;
  disabled?: boolean;
}

export function LeaveMatchDialog({ onStay, onLeave, disabled = false }: LeaveMatchDialogProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-emerald-600" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Forlat stevnet?</h2>
            <p className="text-slate-600">
              Feltklokken fortsetter å gå. Stevnet ligger klart så du kan fortsette der du slapp.
            </p>
          </div>

          <div className="flex flex-col w-full space-y-2 pt-2">
            <button
              onClick={onStay}
              disabled={disabled}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg transition"
            >
              Bli i stevnet
            </button>
            <button
              onClick={onLeave}
              disabled={disabled}
              className="w-full py-3 bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 font-semibold rounded-lg transition"
            >
              Forlat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
