import { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CompetitionStageImage } from '../../types/database';
import { Camera, Upload, X, Check, FileText } from 'lucide-react';

async function getSignedImageUrl(storagePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('monitor-photos')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
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
        (blob) => blob ? resolve(blob) : reject(new Error('Conversion failed')),
        'image/jpeg',
        0.85,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
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

  useEffect(() => {
    setNotes(existingImage?.notes || '');
  }, [existingImage]);

  useEffect(() => {
    let cancelled = false;
    if (existingImage?.storage_path) {
      getSignedImageUrl(existingImage.storage_path).then((url) => {
        if (!cancelled) setDisplayUrl(url);
      });
    } else {
      setDisplayUrl(null);
    }
    return () => { cancelled = true; };
  }, [existingImage?.storage_path]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith('image/')) {
      setError('Vennligst velg en bildefil');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const jpegBlob = await convertToJpeg(file);
      const timestamp = Date.now();
      const storagePath = `${user.id}/entries/${entryId}/stage-${stageNumber}-${timestamp}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('monitor-photos')
        .upload(storagePath, jpegBlob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      if (existingImage) {
        const { error: updateError } = await supabase
          .from('competition_stage_images')
          .update({
            storage_path: storagePath,
            image_url: null,
            uploaded_at: new Date().toISOString(),
          })
          .eq('id', existingImage.id);

        if (updateError) throw updateError;

        if (existingImage.storage_path) {
          await supabase.storage
            .from('monitor-photos')
            .remove([existingImage.storage_path]);
        }
      } else {
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

        if (insertError) throw insertError;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);

      if (onImageUploaded) {
        onImageUploaded();
      }
    } catch (err: any) {
      console.error('Error uploading image:', err);
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

      if (onImageUploaded) {
        onImageUploaded();
      }
    } catch (err: any) {
      console.error('Error deleting image:', err);
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
      console.error('Error saving notes:', err);
      setError(err.message || 'Kunne ikke lagre notater');
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-4 border border-slate-200">
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-5 h-5 text-slate-600" />
        <h3 className="font-medium text-slate-900">
          Gravlapp (valgfritt)
        </h3>
      </div>

      {existingImage && existingImage.storage_path && displayUrl ? (
        <div className="space-y-3">
          <div className="relative rounded-lg overflow-hidden border border-slate-200">
            <img
              src={displayUrl}
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
              {existingImage.uploaded_at &&
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
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
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
          Notér observasjoner, vind, eller andre detaljer fra dette holdet
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
