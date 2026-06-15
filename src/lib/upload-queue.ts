import { supabase } from './supabase';

const DB_NAME = 'dfs-upload-queue';
const DB_VERSION = 1;
const STORE_NAME = 'pending-uploads';
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 10_000;

export type UploadStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

export interface QueuedUpload {
  id: string;
  blob: Blob;
  storagePath: string;
  bucket: string;
  holdId: string;
  holdType: 'match_hold' | 'competition_stage' | 'sub_hold';
  dbMeta: Record<string, unknown>;
  status: UploadStatus;
  retries: number;
  createdAt: number;
  error?: string;
}

type Listener = () => void;

const listeners = new Set<Listener>();
let processing = false;
let dbPromise: Promise<IDBDatabase> | null = null;
let memoryFallback: QueuedUpload[] | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => {
        memoryFallback = [];
        reject(request.error);
      };
    } catch {
      memoryFallback = [];
      reject(new Error('IndexedDB unavailable'));
    }
  });
  return dbPromise;
}

async function getAllItems(): Promise<QueuedUpload[]> {
  if (memoryFallback !== null) return [...memoryFallback];
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function putItem(item: QueuedUpload): Promise<void> {
  if (memoryFallback !== null) {
    const idx = memoryFallback.findIndex(i => i.id === item.id);
    if (idx >= 0) memoryFallback[idx] = item;
    else memoryFallback.push(item);
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function removeItem(id: string): Promise<void> {
  if (memoryFallback !== null) {
    memoryFallback = memoryFallback.filter(i => i.id !== id);
    return;
  }
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function notify() {
  listeners.forEach(fn => fn());
}

async function ensureAuth(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}

async function prepareBlob(blob: Blob): Promise<Blob> {
  if (blob.size === 0) throw new Error('Empty blob');
  if (blob.type === 'image/jpeg' && blob.size > 0) return blob;
  const buf = await blob.arrayBuffer();
  if (buf.byteLength === 0) throw new Error('Empty blob data');
  return new Blob([buf], { type: 'image/jpeg' });
}

async function uploadOne(item: QueuedUpload): Promise<boolean> {
  const uploadBlob = await prepareBlob(item.blob);

  const { error: uploadError } = await supabase.storage
    .from(item.bucket)
    .upload(item.storagePath, uploadBlob, {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  if (item.holdType === 'match_hold') {
    const { error: dbError } = await supabase
      .from('match_holds')
      .update({ monitor_image_url: item.storagePath })
      .eq('id', item.holdId);
    if (dbError) throw dbError;
  } else if (item.holdType === 'competition_stage') {
    const meta = item.dbMeta;
    if (meta.existingImageId) {
      const { error: dbError } = await supabase
        .from('competition_stage_images')
        .update({
          storage_path: item.storagePath,
          image_url: null,
          uploaded_at: new Date().toISOString(),
        })
        .eq('id', meta.existingImageId);
      if (dbError) throw dbError;
    } else {
      const { error: dbError } = await supabase
        .from('competition_stage_images')
        .insert({
          entry_id: meta.entryId as string,
          stage_number: meta.stageNumber as number,
          user_id: meta.userId as string,
          storage_path: item.storagePath,
          image_url: null,
          uploaded_at: new Date().toISOString(),
        });
      if (dbError) throw dbError;
    }
  } else if (item.holdType === 'sub_hold') {
    const { data: maxSort } = await supabase
      .from('match_sub_hold_images')
      .select('sort_order')
      .eq('match_sub_hold_id', item.holdId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSort = (maxSort?.sort_order ?? -1) + 1;

    const { error: dbError } = await supabase
      .from('match_sub_hold_images')
      .insert({
        match_sub_hold_id: item.holdId,
        storage_path: item.storagePath,
        sort_order: nextSort,
      });
    if (dbError) throw dbError;
  }

  return true;
}

async function processQueue(): Promise<void> {
  if (processing) return;
  if (!navigator.onLine) return;
  processing = true;

  try {
    const authed = await ensureAuth();
    if (!authed) {
      processing = false;
      setTimeout(() => processQueue(), RETRY_DELAY_MS);
      return;
    }

    const items = await getAllItems();
    const pending = items
      .filter(i => i.status === 'queued' || i.status === 'failed')
      .filter(i => i.retries < MAX_RETRIES)
      .sort((a, b) => a.createdAt - b.createdAt);

    for (const item of pending) {
      if (!item.blob || item.blob.size === 0) {
        await removeItem(item.id);
        notify();
        continue;
      }

      item.status = 'uploading';
      item.error = undefined;
      await putItem(item);
      notify();

      try {
        await uploadOne(item);
        await removeItem(item.id);
        notify();
      } catch (err: any) {
        item.status = 'failed';
        item.retries += 1;
        item.error = err?.message || 'Upload feilet';
        await putItem(item);
        notify();
      }
    }
  } finally {
    processing = false;
  }

  const remaining = await getAllItems();
  const retriable = remaining.filter(
    i => (i.status === 'queued' || i.status === 'failed') && i.retries < MAX_RETRIES
  );
  if (retriable.length > 0) {
    setTimeout(() => processQueue(), RETRY_DELAY_MS);
  }
}

export function enqueueUpload(params: {
  blob: Blob;
  storagePath: string;
  bucket?: string;
  holdId: string;
  holdType: QueuedUpload['holdType'];
  dbMeta?: Record<string, unknown>;
}): string {
  const id = `upload_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const item: QueuedUpload = {
    id,
    blob: params.blob,
    storagePath: params.storagePath,
    bucket: params.bucket || 'monitor-photos',
    holdId: params.holdId,
    holdType: params.holdType,
    dbMeta: params.dbMeta || {},
    status: 'queued',
    retries: 0,
    createdAt: Date.now(),
  };

  tryImmediateUpload(item).catch(() => {
    putItem(item).then(() => {
      notify();
      processQueue();
    });
  });

  return id;
}

async function tryImmediateUpload(item: QueuedUpload): Promise<void> {
  if (!navigator.onLine) throw new Error('Offline');

  const authed = await ensureAuth();
  if (!authed) throw new Error('Not authenticated');

  await uploadOne(item);
  notify();
}

export function subscribeToQueue(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function getQueueSnapshot(): Promise<QueuedUpload[]> {
  return getAllItems();
}

export function retryAll(): void {
  processQueue();
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    processQueue();
  });

  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      (async () => {
        processQueue();
      })();
    }
  });
}
