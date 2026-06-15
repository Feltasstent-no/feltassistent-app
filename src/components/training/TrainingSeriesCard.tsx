import { useState, useRef } from 'react';
import { Camera, CheckCircle, Trash2, X, ChevronDown, ChevronUp, Lightbulb } from 'lucide-react';
import { updateTrainingSeries, deleteTrainingSeries, uploadSeriesImage, deleteSeriesImage, getImageUrl } from '../../lib/training-session-service';
import { FieldClockTimer } from '../FieldClockTimer';
import { ImageLightbox } from '../ImageLightbox';
import { supabase } from '../../lib/supabase';
import type { TrainingSeries, TrainingSeriesImage } from '../../types/database';

interface TrainingSeriesCardProps {
  series: TrainingSeries;
  images: TrainingSeriesImage[];
  userId: string;
  readOnly?: boolean;
  hideTimer?: boolean;
  isRangeMatch?: boolean;
  sourceType?: 'felt' | 'bane' | 'trening';
  sourceName?: string;
  sourceId?: string;
  onUpdated: () => void;
  onDeleted: () => void;
  onCompleted?: (wasAlreadyCompleted: boolean) => void;
}

export function TrainingSeriesCard({ series, images, userId, readOnly, hideTimer, isRangeMatch, sourceType, sourceName, sourceId, onUpdated, onDeleted, onCompleted }: TrainingSeriesCardProps) {
  const [expanded, setExpanded] = useState(!series.completed);
  const [score, setScore] = useState(series.score != null ? String(series.score) : '');
  const [innerHits, setInnerHits] = useState(series.inner_hits != null ? String(series.inner_hits) : '');
  const [hits, setHits] = useState(series.hits != null ? String(series.hits) : '');
  const [notes, setNotes] = useState(series.notes || '');
  const [saveFocusPoint, setSaveFocusPoint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveResult = async () => {
    if (saving) return;
    setSaving(true);

    const wasAlreadyCompleted = series.completed;

    await updateTrainingSeries({
      seriesId: series.id,
      score: score ? parseInt(score) : null,
      innerHits: innerHits ? parseInt(innerHits) : null,
      hits: hits ? parseInt(hits) : null,
      notes: notes || null,
      completed: true,
    });

    if (saveFocusPoint && notes.trim()) {
      const trimmedText = notes.trim();
      const fpSourceType = sourceType || 'trening';
      const fpSourceId = sourceId && sourceId.length > 0 ? sourceId : null;

      const { data: existing } = await supabase
        .from('focus_points')
        .select('id, text')
        .eq('user_id', userId)
        .eq('source_type', fpSourceType)
        .eq('text', trimmedText)
        .maybeSingle();

      if (!existing) {
        const { data: fpData, error: fpError } = await supabase
          .from('focus_points')
          .insert({
            user_id: userId,
            text: trimmedText,
            source_type: fpSourceType,
            source_name: sourceName || '',
            source_id: fpSourceId,
          })
          .select()
          .single();
        if (fpError) {
          console.error('[FocusPoint] Insert failed:', fpError.message, fpError.details, fpError.code);
        }
      }
      setSaveFocusPoint(false);
    }

    setSaving(false);
    onUpdated();
    onCompleted?.(wasAlreadyCompleted);
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    if (!navigator.onLine) {
      if (fileRef.current) fileRef.current.value = '';
      alert('Du er offline. Ta bildet med telefonens kamera nå, og last det opp fra kamerarullen når du har nett.');
      return;
    }

    setUploading(true);

    try {
      for (const file of Array.from(e.target.files)) {
        await uploadSeriesImage({ seriesId: series.id, userId, file });
      }
    } catch (err) {
      console.error('[TrainingSeriesCard] Photo upload failed:', err);
    }

    setUploading(false);
    if (fileRef.current) fileRef.current.value = '';
    onUpdated();
  };

  const handleDeleteImage = async (img: TrainingSeriesImage) => {
    await deleteSeriesImage(img);
    onUpdated();
  };

  const handleDelete = async () => {
    await deleteTrainingSeries(series.id);
    onDeleted();
  };

  const hasResult = series.score != null || series.hits != null;

  return (
    <div className={`relative bg-white border rounded-xl overflow-hidden transition ${
      series.completed ? 'border-emerald-200' : 'border-slate-200'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 pr-14 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
            series.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}>
            {series.completed ? <CheckCircle className="w-4 h-4" /> : series.order_index + 1}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-900 text-sm">
              Serie {series.order_index + 1}
              {series.distance_m ? ` — ${series.distance_m}m` : ''}
            </p>
            <p className="text-xs text-slate-500">
              {series.shot_count} skudd
              {series.shooting_time_seconds ? ` / ${series.shooting_time_seconds}s` : ''}
              {hasResult && (
                <span className="ml-2 text-emerald-600 font-medium">
                  {series.score != null ? `${series.score}p` : ''}
                  {series.inner_hits != null ? ` (${series.inner_hits}*)` : ''}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {images.length > 0 && (
            <span className="text-xs text-slate-400">{images.length} bilde{images.length > 1 ? 'r' : ''}</span>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {!readOnly && (
        <div className="absolute top-2 right-2 z-10">
          {!confirmDelete ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              aria-label="Slett serie"
              className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1 bg-white rounded-md shadow-sm border border-red-200 p-0.5">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded transition"
              >
                Slett
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setConfirmDelete(false); }}
                className="p-1 text-slate-400 hover:text-slate-600 transition"
                aria-label="Avbryt"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          {!readOnly && !hideTimer && series.shooting_time_seconds && (
            <FieldClockTimer
              shootSeconds={series.shooting_time_seconds}
              compact
            />
          )}

          {!readOnly && (
            <div className={`grid ${isRangeMatch ? 'grid-cols-2' : 'grid-cols-3'} gap-3`}>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Poeng</label>
                <input
                  type="number"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="—"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Inner</label>
                <input
                  type="number"
                  value={innerHits}
                  onChange={(e) => setInnerHits(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="—"
                />
              </div>
              {!isRangeMatch && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Treff</label>
                  <input
                    type="number"
                    value={hits}
                    onChange={(e) => setHits(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-center text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="—"
                  />
                </div>
              )}
            </div>
          )}

          {readOnly && hasResult && (
            <div className="grid grid-cols-3 gap-3">
              {series.score != null && (
                <div className="text-center">
                  <p className="text-xs text-slate-500">Poeng</p>
                  <p className="text-lg font-bold text-emerald-600">{series.score}</p>
                </div>
              )}
              {series.inner_hits != null && (
                <div className="text-center">
                  <p className="text-xs text-slate-500">Inner</p>
                  <p className="text-lg font-bold text-slate-900">{series.inner_hits}</p>
                </div>
              )}
              {!isRangeMatch && series.hits != null && (
                <div className="text-center">
                  <p className="text-xs text-slate-500">Treff</p>
                  <p className="text-lg font-bold text-slate-900">{series.hits}</p>
                </div>
              )}
            </div>
          )}

          {!readOnly && (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Notater</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                placeholder="Observasjoner..."
              />
              {notes.trim() && (
                <label className="flex items-center gap-2 mt-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={saveFocusPoint}
                    onChange={(e) => setSaveFocusPoint(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs text-slate-600">Lagre som fokusområde</span>
                </label>
              )}
            </div>
          )}

          {readOnly && series.notes && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{series.notes}</p>
          )}

          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img) => {
                const url = getImageUrl(img.storage_path);
                return (
                  <div key={img.id} className="relative flex-shrink-0 group">
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(url)}
                      className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                    >
                      <img
                        src={url}
                        alt="Skivebilde"
                        className="w-20 h-20 object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                      />
                    </button>
                    {!readOnly && (
                      <button
                        onClick={() => handleDeleteImage(img)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!readOnly && (
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 transition cursor-pointer">
                <Camera className="w-4 h-4" />
                {uploading ? 'Laster opp...' : 'Bilde'}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoCapture}
                  disabled={uploading}
                  className="hidden"
                />
              </label>

              <button
                onClick={handleSaveResult}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-sm font-semibold rounded-lg transition"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Lagrer...' : series.completed ? 'Oppdater' : 'Fullfør serie'}
              </button>
            </div>
          )}
        </div>
      )}
      <ImageLightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} alt="Skivebilde" />
    </div>
  );
}
