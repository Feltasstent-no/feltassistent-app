import { X } from 'lucide-react';
import { SeriesEditor, SeriesValues } from '../inputs/SeriesEditor';

interface AddSeriesModalProps {
  defaultShotCount?: number;
  defaultShootingTime?: number;
  defaultDistance?: number;
  isRangeMatch?: boolean;
  isEditing?: boolean;
  onAdd: (params: { shotCount: number; shootingTimeSeconds: number | null; distanceM: number | null }) => Promise<void>;
  onClose: () => void;
}

export function AddSeriesModal({ defaultShotCount = 5, defaultShootingTime, defaultDistance, isRangeMatch = false, isEditing = false, onAdd, onClose }: AddSeriesModalProps) {
  const initialShootingTime = defaultShootingTime
    ? defaultShootingTime
    : isRangeMatch
      ? 60
      : undefined;

  const handleSave = async (values: SeriesValues) => {
    await onAdd({
      shotCount: values.shotCount,
      shootingTimeSeconds: values.shootingTimeSeconds,
      distanceM: values.distanceM,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-lg font-bold text-slate-900">{isEditing ? 'Rediger serie' : 'Ny serie'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <SeriesEditor
            mode={isEditing ? 'edit' : 'create'}
            initialValues={{
              shotCount: defaultShotCount,
              shootingTimeSeconds: initialShootingTime ?? null,
              distanceM: defaultDistance ?? null,
            }}
            features={{
              shootingTime: 'optional',
              distance: 'optional',
            }}
            submitLabel={isEditing ? 'Lagre endringer' : 'Legg til serie'}
            onSave={handleSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
