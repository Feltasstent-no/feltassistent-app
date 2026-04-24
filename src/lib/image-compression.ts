import imageCompression from 'browser-image-compression';

const DEFAULT_OPTIONS = {
  maxWidthOrHeight: 1600,
  maxSizeMB: 0.7,
  initialQuality: 0.7,
  useWebWorker: true,
};

export async function compressImage(file: File): Promise<File> {
  if (!file || !file.type.startsWith('image/')) return file;
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file;

  try {
    const compressed = await imageCompression(file, DEFAULT_OPTIONS);
    if (compressed.size >= file.size) return file;
    if (compressed instanceof File) return compressed;
    return new File([compressed], file.name, {
      type: compressed.type || file.type,
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn('[image-compression] fallback to original', err);
    return file;
  }
}
