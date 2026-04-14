import { useState } from 'react';
import { X, Save, Loader2 } from 'lucide-react';

interface EditMetadataModalProps {
  title: string;
  currentName: string;
  currentNotes: string;
  nameLabel?: string;
  notesLabel?: string;
  onSave: (name: string, notes: string) => Promise<void>;
  onClose: () => void;
}

export function EditMetadataModal({
  title,
  currentName,
  currentNotes,
  nameLabel = 'Stevnenavn',
  notesLabel = 'Merknader',
  onSave,
  onClose,
}: EditMetadataModalProps) {
  const [name, setName] = useState(currentName);
  const [notes, setNotes] = useState(currentNotes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = name !== currentName || notes !== currentNotes;
  const nameValid = name.trim().length > 0;

  const handleSave = async () => {
    if (!nameValid || !hasChanges || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim(), notes.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Kunne ikke lagre endringer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{nameLabel}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900"
              placeholder={nameLabel}
              autoFocus
            />
            {!nameValid && name !== currentName && (
              <p className="text-xs text-red-500 mt-1">Navn kan ikke være tomt</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{notesLabel}</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-slate-900 resize-none"
              rows={3}
              placeholder="Valgfritt..."
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-2 p-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition text-sm"
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || !nameValid || saving}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold rounded-lg transition text-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Lagrer...' : 'Lagre endringer'}
          </button>
        </div>
      </div>
    </div>
  );
}
