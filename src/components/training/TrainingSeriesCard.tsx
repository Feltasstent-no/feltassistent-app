import { useState, useRef } from 'react';
import { Camera, CheckCircle, Trash2, X, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { updateTrainingSeries, deleteTrainingSeries, uploadSeriesImage, deleteSeriesImage, getImageUrl } from '../../lib/training-session-service';
import { TrainingSeriesTimer } from './TrainingSeriesTimer';
import type { TrainingSeries, TrainingSeriesImage } from '../../types/database';

interface TrainingSeriesCardProps {
  series: TrainingSeries;
  images: TrainingSeriesImage[];
  userId: string;
  readOnly?: boolean;
  onUpdated: () => void;
  onDeleted: () => void;
}

export function TrainingSeriesCard({ series, images, userId, readOnly, onUpdated, onDeleted }: TrainingSeriesCardProps) {
  const [expanded, setExpanded] = useState(!series.completed);
  const [score, setScore] = useState(series.score != null ? String(series.score) : '');
  const [innerHits, setInnerHits] = useState(series.inner_hits != null ? String(series.inner_hits) : '');
  const [hits, setHits] = useState(series.hits != null ? String(series.hits) : '');
  const [notes, setNotes] = useState(series.notes || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSaveResult = async () => {
    if (saving) return;
    setSaving(true);

    await updateTrainingSeries({
      seriesId: series.id,
      score: score ? parseInt(score) : null,
      innerHits: innerHits ? parseInt(innerHits) : null,
      hits: hits ? parseInt(hits) : null,
      notes: notes || null,
      completed: true,
    });

    setSaving(false);
    onUpdated();
  };

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    for (const file of Array.from(e.target.files)) {
      await uploadSeriesImage({ seriesId: series.id, userId, file });
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
    <div className={`bg-white border rounded-xl overflow-hidden transition ${
      series.completed ? 'border-emerald-200' : 'border-slate-200'
    }`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left"
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

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-100 pt-4">
          {!readOnly && series.shooting_time_seconds && (
            <TrainingSeriesTimer shootingTimeSeconds={series.shooting_time_seconds} />
          )}

          {!readOnly && (
            <div className="grid grid-cols-3 gap-3">
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
              {series.hits != null && (
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
            </div>
          )}

          {readOnly && series.notes && (
            <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">{series.notes}</p>
          )}

          {images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img) => (
                <div key={img.id} className="relative flex-shrink-0 group">
                  <img
                    src={getImageUrl(img.storage_path)}
                    alt="Skivebilde"
                    className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                  />
                  {!readOnly && (
                    <button
                      onClick={() => handleDeleteImage(img)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
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
                  capture="environment"
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

              {!confirmDelete ? (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleDelete}
                  className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition"
                >
                  Slett
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
