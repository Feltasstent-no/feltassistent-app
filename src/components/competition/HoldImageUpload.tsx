import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CompetitionStageImage } from '../../types/database';
import { Camera, Upload, X, Check, FileText } from 'lucide-react';

function getPublicImageUrl(storagePath: string): string {
  const { data } = supabase.storage
    .from('monitor-photos')
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

function convertToJpeg(file: File, maxWidth = 2048): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round(height * (maxWidth / width));
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            reject(new Error('Bildekonvertering feilet'));
          }
        },
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kunne ikke lese bildet')); };
    img.src = url;
  });
}

interface HoldImageUploadProps {
  entryId: string;
  stageNumber: number;
  existingImage?: CompetitionStageImage | null;
  onImageUploaded?: () => void;
}

export function HoldImageUpload({
  entryId,
  stageNumber,
  existingImage,
  onImageUploaded,
}: HoldImageUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notes, setNotes] = useState(existingImage?.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    setNotes(existingImage?.notes || '');
  }, [existingImage]);

  useEffect(() => {
    if (existingImage?.storage_path) {
      setDisplayUrl(getPublicImageUrl(existingImage.storage_path));
      setLocalPreview(null);
    } else if (!localPreview) {
      setDisplayUrl(null);
    }
  }, [existingImage?.storage_path]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      let uploadBlob: Blob;
      try {
        uploadBlob = await convertToJpeg(file);
        console.log('[HoldImageUpload] JPEG conversion OK, blob size:', uploadBlob.size, 'type:', uploadBlob.type);
      } catch (convErr) {
        console.warn('[HoldImageUpload] JPEG conversion failed, using raw file:', convErr);
        uploadBlob = file;
      }

      const timestamp = Date.now();
      const storagePath = `${user.id}/entries/${entryId}/stage-${stageNumber}-${timestamp}.jpg`;

      console.log('[HoldImageUpload] Uploading to monitor-photos:', storagePath);
      console.log('[HoldImageUpload] Blob size:', uploadBlob.size, 'type:', uploadBlob.type || 'image/jpeg');

      const { error: uploadError } = await supabase.storage
        .from('monitor-photos')
        .upload(storagePath, uploadBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: uploadBlob.type || 'image/jpeg',
        });

      if (uploadError) {
        console.error('[HoldImageUpload] Storage upload FAILED:', uploadError.message, uploadError);
        throw uploadError;
      }

      console.log('[HoldImageUpload] Storage upload SUCCESS:', storagePath);

      const preview = URL.createObjectURL(file);
      setLocalPreview(preview);

      if (existingImage) {
        console.log('[HoldImageUpload] Updating existing record:', existingImage.id);
        const { error: updateError } = await supabase
          .from('competition_stage_images')
          .update({
            storage_path: storagePath,
            image_url: null,
            uploaded_at: new Date().toISOString(),
          })
          .eq('id', existingImage.id);

        if (updateError) {
          console.error('[HoldImageUpload] DB update FAILED:', updateError);
          throw updateError;
        }
        console.log('[HoldImageUpload] DB update SUCCESS');

        if (existingImage.storage_path) {
          await supabase.storage
            .from('monitor-photos')
            .remove([existingImage.storage_path]);
        }
      } else {
        console.log('[HoldImageUpload] Inserting new record for stage:', stageNumber);
        const { error: insertError } = await supabase
          .from('competition_stage_images')
          .insert({
            entry_id: entryId,
            stage_number: stageNumber,
            user_id: user.id,
            storage_path: storagePath,
            image_url: null,
            uploaded_at: new Date().toISOString(),
          });

        if (insertError) {
          console.error('[HoldImageUpload] DB insert FAILED:', insertError);
          throw insertError;
        }
        console.log('[HoldImageUpload] DB insert SUCCESS');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);

      if (onImageUploaded) {
        onImageUploaded();
      }
    } catch (err: any) {
      console.error('[HoldImageUpload] UPLOAD ERROR:', err);
      setLocalPreview(null);
      setError(err.message || 'Kunne ikke laste opp bilde');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteImage = async () => {
    if (!existingImage) return;

    setUploading(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('competition_stage_images')
        .delete()
        .eq('id', existingImage.id);

      if (deleteError) throw deleteError;

      if (existingImage.storage_path) {
        await supabase.storage
          .from('monitor-photos')
          .remove([existingImage.storage_path]);
      }

      setLocalPreview(null);
      setDisplayUrl(null);

      if (onImageUploaded) {
        onImageUploaded();
      }
    } catch (err: any) {
      console.error('Delete error:', err);
      setError(err.message || 'Kunne ikke slette bilde');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!user) return;

    setSavingNotes(true);
    setError(null);

    try {
      if (existingImage) {
        const { error: updateError } = await supabase
          .from('competition_stage_images')
          .update({ notes })
          .eq('id', existingImage.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('competition_stage_images')
          .insert({
            entry_id: entryId,
            stage_number: stageNumber,
            user_id: user.id,
            notes,
          });

        if (insertError) throw insertError;
      }

      if (onImageUploaded) {
        onImageUploaded();
      }
    } catch (err: any) {
      console.error('Save notes error:', err);
      setError(err.message || 'Kunne ikke lagre notater');
    } finally {
      setSavingNotes(false);
    }
  };

  const imageUrl = displayUrl || localPreview;
  const hasImage = (existingImage?.storage_path && imageUrl) || localPreview;

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-5 h-5 text-slate-600" />
        <h3 className="font-medium text-slate-900">
          Gravlapp (valgfritt)
        </h3>
      </div>

      {hasImage && imageUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-200">
            <img
              src={imageUrl}
              alt="Gravlapp"
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                onClick={handleDeleteImage}
                disabled={uploading}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 transition-colors"
                title="Slett bilde"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <Check className="w-4 h-4 text-green-600" />
              Lagret
            </span>
            <span>
              {existingImage?.uploaded_at &&
                new Date(existingImage.uploaded_at).toLocaleTimeString('nb-NO', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
            </span>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-2 px-4 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
          >
            Last opp nytt bilde
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Last opp bilde av måltavle eller gjør notater for senere
          </p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {uploading ? 'Laster opp...' : 'Velg eller ta bilde'}
          </button>

          <p className="text-xs text-center text-slate-500">
            Du kan hoppe over og fortsette til neste hold
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700 flex items-center gap-2">
          <Check className="w-4 h-4" />
          Bilde lagret!
        </div>
      )}

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-slate-600" />
          <h3 className="font-medium text-slate-900">
            Notater (valgfritt)
          </h3>
        </div>

        <p className="text-sm text-slate-600 mb-3">
          Noter observasjoner, vind, eller andre detaljer fra dette holdet
        </p>

        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="F.eks: Sterk motvind, måtte holde venstre, bra treff på figur 3..."
          rows={4}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        {notes !== (existingImage?.notes || '') && (
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="mt-3 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            {savingNotes ? 'Lagrer...' : 'Lagre notater'}
          </button>
        )}

        {notes === (existingImage?.notes || '') && notes && (
          <div className="mt-3 text-sm text-green-600 flex items-center gap-1">
            <Check className="w-4 h-4" />
            Notater lagret
          </div>
        )}
      </div>
    </div>
  );
}
