import { useEffect } from 'react';
import { X } from 'lucide-react';

interface ImageLightboxProps {
  url: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageLightbox({ url, alt = 'Bilde', onClose }: ImageLightboxProps) {
  useEffect(() => {
    if (!url) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [url, onClose]);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Lukk"
        className="absolute top-4 right-4 p-2 text-white/90 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition z-10"
      >
        <X className="w-6 h-6" />
      </button>
      <img
        src={url}
        alt={alt}
        className="max-w-full max-h-[90vh] object-contain rounded-lg select-none"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
