import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open?: boolean;
  isOpen?: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning';
  isDestructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'danger',
  isDestructive,
  isLoading = false,
}: ConfirmDialogProps) {
  const isDialogOpen = open ?? isOpen ?? false;
  const confirmButtonText = confirmText ?? confirmLabel ?? 'Bekreft';
  const cancelButtonText = cancelText ?? cancelLabel ?? 'Avbryt';
  const dialogVariant = isDestructive ? 'danger' : variant;

  if (!isDialogOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onCancel}
        />

        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start space-x-4">
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                dialogVariant === 'danger' ? 'bg-red-100' : 'bg-amber-100'
              }`}
            >
              <AlertTriangle
                className={`w-6 h-6 ${
                  dialogVariant === 'danger' ? 'text-red-600' : 'text-amber-600'
                }`}
              />
            </div>

            <div className="flex-1 pt-1">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-600 text-sm">{message}</p>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelButtonText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`flex-1 font-semibold py-2 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed ${
                dialogVariant === 'danger'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-amber-600 hover:bg-amber-700 text-white'
              }`}
            >
              {isLoading ? 'Sletter...' : confirmButtonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
