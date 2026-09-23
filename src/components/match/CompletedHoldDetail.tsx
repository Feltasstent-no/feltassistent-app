import { useEffect, useRef, useState } from 'react';
import {
  X, Camera, RefreshCw, Trash2, RotateCw, ImageOff, Loader2, Layers,
} from 'lucide-react';
import {
  replaceHoldMonitorImage,
  clearHoldMonitorImage,
  resolveMonitorImageUrl,
  uploadSubHoldImage,
  getSubHoldImages,
  deleteSubHoldImage,
  effectiveElevation,
  getLogicalHoldNumber,
} from '../../lib/match-service';
import type { MatchHoldWithFigure, MatchSubHoldImage } from '../../lib/match-service';
import { compressImage } from '../../lib/image-compression';
import { FieldFigureSvg } from '../FieldFigureSvg';
import { ConfirmDialog } from '../ConfirmDialog';

interface CompletedHoldDetailProps {
  hold: MatchHoldWithFigure;
  holds: MatchHoldWithFigure[];
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}

type Busy = { scope: string; label: string } | null;
type ConfirmTarget =
  | { kind: 'hold' }
  | { kind: 'sub'; subId: string; imageId: string }
  | null;

export function CompletedHoldDetail({ hold, holds, userId, onClose, onChanged }: CompletedHoldDetailProps) {
  const [holdImageUrl, setHoldImageUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);
  const [subImages, setSubImages] = useState<Record<string, MatchSubHoldImage[]>>({});
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget>(null);
  const [pendingSubId, setPendingSubId] = useState<string | null>(null);

  const holdFileRef = useRef<HTMLInputElement>(null);
  const subFileRef = useRef<HTMLInputElement>(null);

  const isComp = hold.is_composite && !!hold.sub_holds && hold.sub_holds.length > 0;
  const isReshoot = !!hold.reshoot_of_hold_id;
  const supersededByReshoot = !isReshoot && holds.some(h => h.reshoot_of_hold_id === hold.id);
  const counts = hold.counts_for_score !== false;
  const showCountsBadge = isReshoot || supersededByReshoot;
  const logicalNo = getLogicalHoldNumber(hold, holds);
  const elev = effectiveElevation(hold);
  const wind = hold.wind_correction_clicks;

  useEffect(() => {
    let cancelled = false;
    setImageFailed(false);
    if (hold.monitor_image_url) {
      resolveMonitorImageUrl(hold.monitor_image_url).then(url => {
        if (!cancelled) setHoldImageUrl(url);
      });
    } else {
      setHoldImageUrl(null);
    }
    if (hold.sub_holds) {
      hold.sub_holds.forEach(sh => {
        getSubHoldImages(sh.id).then(imgs => {
          if (!cancelled) setSubImages(prev => ({ ...prev, [sh.id]: imgs }));
        });
      });
    }
    return () => { cancelled = true; };
  }, [hold.id]);

  const runHoldUpload = async (file: File, replacing: boolean) => {
    if (busy) return;
    setBusy({ scope: 'hold', label: replacing ? 'Bytter bilde…' : 'Laster opp…' });
    setError(null);
    try {
      const compressed = await compressImage(file);
      const { url, error: uploadError } = await replaceHoldMonitorImage(hold.id, userId, compressed);
      if (uploadError || !url) {
        setError('Kunne ikke lagre bildet. Prøv igjen.');
        return;
      }
      const resolved = await resolveMonitorImageUrl(url);
      setHoldImageUrl(resolved);
      setImageFailed(false);
      onChanged();
    } catch {
      setError('Kunne ikke lagre bildet. Prøv igjen.');
    } finally {
      setBusy(null);
    }
  };

  const runHoldDelete = async () => {
    if (busy) return;
    setBusy({ scope: 'hold', label: 'Sletter…' });
    setError(null);
    const { error: delError } = await clearHoldMonitorImage(hold.id);
    if (delError) {
      setError('Kunne ikke slette bildet helt. Prøv igjen.');
    } else {
      setHoldImageUrl(null);
      onChanged();
    }
    setConfirm(null);
    setBusy(null);
  };

  const runSubUpload = async (subId: string, file: File) => {
    if (busy) return;
    setBusy({ scope: `sub-${subId}`, label: 'Laster opp…' });
    setError(null);
    try {
      const compressed = await compressImage(file);
      const { error: uploadError } = await uploadSubHoldImage(subId, userId, compressed);
      if (uploadError) {
        setError('Kunne ikke lagre bildet. Prøv igjen.');
        return;
      }
      const imgs = await getSubHoldImages(subId);
      setSubImages(prev => ({ ...prev, [subId]: imgs }));
      onChanged();
    } catch {
      setError('Kunne ikke lagre bildet. Prøv igjen.');
    } finally {
      setBusy(null);
    }
  };

  const runSubDelete = async (subId: string, imageId: string) => {
    if (busy) return;
    setBusy({ scope: `sub-${subId}`, label: 'Sletter…' });
    setError(null);
    const { error: delError } = await deleteSubHoldImage(imageId);
    if (delError) {
      setError('Kunne ikke slette bildet. Prøv igjen.');
    } else {
      const imgs = await getSubHoldImages(subId);
      setSubImages(prev => ({ ...prev, [subId]: imgs }));
      onChanged();
    }
    setConfirm(null);
    setBusy(null);
  };

  const onHoldFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const replacing = !!holdImageUrl;
    e.target.value = '';
    if (f) runHoldUpload(f, replacing);
  };

  const onSubFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    const subId = pendingSubId;
    e.target.value = '';
    if (f && subId) runSubUpload(subId, f);
  };

  const holdBusy = busy?.scope === 'hold';

  const MetaRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900 text-right">{value}</span>
    </div>
  );

  const holdTitle = isReshoot
    ? `Omskyting av Hold ${logicalNo}`
    : `Hold ${logicalNo}`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            {isComp && <Layers className="w-5 h-5 text-amber-600 flex-shrink-0" />}
            {isReshoot && <RotateCw className="w-4 h-4 text-amber-600 flex-shrink-0" />}
            <h2 className="text-base font-bold text-slate-900 truncate">{holdTitle}</h2>
            {showCountsBadge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${
                counts ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {counts ? 'Tellende' : 'Ikke tellende'}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-700 transition"
            aria-label="Lukk"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Metadata (read-only) */}
          <div className="bg-slate-50 rounded-xl p-4 divide-y divide-slate-200/70">
            <MetaRow
              label="Feltfigur"
              value={isComp ? 'Sammensatt hold' : (hold.field_figure?.name || 'Ukjent figur')}
            />
            {!isComp && <MetaRow label="Avstand" value={`${hold.distance_m || 0} m`} />}
            <MetaRow label="Skudd" value={`${hold.shot_count}`} />
            {!isComp && (
              <MetaRow
                label="Høyde (valgt)"
                value={elev != null && elev !== 0 ? `${elev > 0 ? '+' : ''}${elev} knepp` : '–'}
              />
            )}
            {!isComp && (
              <MetaRow
                label="Vind (valgt)"
                value={wind != null && wind !== 0 ? `${wind > 0 ? '+' : ''}${wind} knepp` : '–'}
              />
            )}
            {hold.notes && (
              <div className="py-2">
                <p className="text-sm text-slate-500 mb-1">Notat</p>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{hold.notes}</p>
              </div>
            )}
          </div>

          {/* Hold-level image / composite overview image */}
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              {isComp ? 'Oversiktsbilde' : 'Bilde'}
            </h3>

            {holdImageUrl && !imageFailed ? (
              <div className="space-y-2">
                <button
                  onClick={() => setLightboxUrl(holdImageUrl)}
                  className="block w-full rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition"
                >
                  <img
                    src={holdImageUrl}
                    alt="Holdbilde"
                    className="w-full h-56 object-cover"
                    onError={() => setImageFailed(true)}
                  />
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => holdFileRef.current?.click()}
                    disabled={!!busy}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Bytt bilde
                  </button>
                  <button
                    onClick={() => setConfirm({ kind: 'hold' })}
                    disabled={!!busy}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-white hover:bg-red-50 disabled:opacity-50 text-red-600 font-semibold rounded-lg border border-red-200 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    Slett bilde
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {imageFailed && (
                  <div className="w-full h-32 rounded-lg border border-slate-200 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                    <ImageOff className="w-6 h-6 mb-1" />
                    <span className="text-xs">Kunne ikke laste bildet</span>
                  </div>
                )}
                <button
                  onClick={() => holdFileRef.current?.click()}
                  disabled={!!busy}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition"
                >
                  <Camera className="w-5 h-5" />
                  Legg til bilde
                </button>
              </div>
            )}

            {holdBusy && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                {busy?.label}
              </div>
            )}
          </div>

          {/* Composite sub-holds */}
          {isComp && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Delhold</h3>
              {hold.sub_holds!.map((sh, si) => {
                const fig = sh.field_figure;
                const imgs = subImages[sh.id] || [];
                const subBusy = busy?.scope === `sub-${sh.id}`;
                return (
                  <div key={sh.id} className="border border-slate-200 rounded-xl p-3">
                    <div className="flex items-center gap-2.5 mb-2">
                      <div className="w-9 h-9 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {fig ? (
                          <FieldFigureSvg
                            svgData={fig.svg_data}
                            imageUrl={fig.image_url}
                            size="xs"
                            fallbackText={fig.short_code || fig.code}
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 font-bold">{si + 1}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {fig?.name || fig?.short_code || fig?.code || `Delhold ${si + 1}`}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{sh.distance_m || 0} m</span>
                          <span>{sh.shot_count} skudd</span>
                        </div>
                      </div>
                    </div>

                    {imgs.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {imgs.map(img => (
                          <div key={img.id} className="relative group">
                            <button
                              onClick={() => img.imageUrl && setLightboxUrl(img.imageUrl)}
                              className="block w-full aspect-[4/3] rounded-md overflow-hidden border border-slate-200 hover:border-blue-400 transition"
                            >
                              <img src={img.imageUrl} alt="Delholdbilde" className="w-full h-full object-cover" />
                            </button>
                            <button
                              onClick={() => setConfirm({ kind: 'sub', subId: sh.id, imageId: img.id })}
                              disabled={!!busy}
                              className="absolute top-1 right-1 p-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-md transition"
                              aria-label="Slett bilde"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => { setPendingSubId(sh.id); subFileRef.current?.click(); }}
                      disabled={!!busy}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
                    >
                      <Camera className="w-4 h-4" />
                      Legg til bilde
                    </button>

                    {subBusy && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {busy?.label}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
              {error}
            </div>
          )}
        </div>
      </div>

      <input ref={holdFileRef} type="file" accept="image/*" onChange={onHoldFile} className="hidden" />
      <input ref={subFileRef} type="file" accept="image/*" onChange={onSubFile} className="hidden" />

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute right-4 p-2 text-white/80 hover:text-white transition"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
            aria-label="Lukk bilde"
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={lightboxUrl}
            alt="Forstørret bilde"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirm}
        title={confirm?.kind === 'hold' ? 'Slett bilde?' : 'Slett bilde?'}
        message="Bildet fjernes permanent. Dette endrer ingen resultater eller registrering for holdet."
        confirmText="Slett bilde"
        isDestructive
        isLoading={!!busy}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === 'hold') runHoldDelete();
          else runSubDelete(confirm.subId, confirm.imageId);
        }}
        onCancel={() => { if (!busy) setConfirm(null); }}
      />
    </div>
  );
}
