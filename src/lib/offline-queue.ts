import { supabase } from './supabase';

export interface QueuedOperation {
  id: string;
  table: string;
  type: 'insert' | 'update' | 'upsert';
  data: Record<string, unknown>;
  filter?: { column: string; value: string };
  createdAt: string;
  retryCount: number;
  lastError: string | null;
}

const STORAGE_KEY = 'feltassistent_offline_queue_v1';
const MAX_RETRIES = 5;

let listeners: Array<() => void> = [];

function notifyListeners() {
  listeners.forEach(fn => fn());
}

export function subscribeToQueue(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(fn => fn !== callback);
  };
}

export function getQueue(): QueuedOperation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

function saveQueue(queue: QueuedOperation[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    console.error('[offline-queue] Failed to write to localStorage');
  }
  notifyListeners();
}

export function enqueue(op: Omit<QueuedOperation, 'id' | 'createdAt' | 'retryCount' | 'lastError'>): void {
  const queue = getQueue();
  const entry: QueuedOperation = {
    ...op,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    retryCount: 0,
    lastError: null,
  };
  queue.push(entry);
  saveQueue(queue);
  console.warn('[offline-queue] Queued operation:', op.type, op.table);
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter(op => op.id !== id);
  saveQueue(queue);
}

export function getQueueLength(): number {
  return getQueue().length;
}

async function processOperation(op: QueuedOperation): Promise<{ success: boolean; errorMsg: string | null }> {
  try {
    let result;

    if (op.type === 'update' && op.filter) {
      result = await supabase
        .from(op.table)
        .update(op.data)
        .eq(op.filter.column, op.filter.value);
    } else if (op.type === 'insert') {
      result = await supabase
        .from(op.table)
        .insert(op.data);
    } else if (op.type === 'upsert') {
      result = await supabase
        .from(op.table)
        .upsert(op.data);
    } else {
      return { success: false, errorMsg: 'Unknown operation type' };
    }

    if (result.error) {
      return { success: false, errorMsg: result.error.message };
    }

    return { success: true, errorMsg: null };
  } catch (e: any) {
    return { success: false, errorMsg: e?.message || 'Network error' };
  }
}

let isSyncing = false;

export async function syncQueue(): Promise<{ synced: number; failed: number }> {
  if (isSyncing) return { synced: 0, failed: 0 };
  if (!navigator.onLine) return { synced: 0, failed: 0 };

  const queue = getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  isSyncing = true;
  let synced = 0;
  let failed = 0;

  try {
    for (const op of queue) {
      const { success, errorMsg } = await processOperation(op);
      if (success) {
        removeFromQueue(op.id);
        synced++;
      } else {
        const newRetry = op.retryCount + 1;
        const current = getQueue();
        const updated = current.map(q =>
          q.id === op.id
            ? { ...q, retryCount: newRetry, lastError: errorMsg }
            : q
        );

        if (newRetry >= MAX_RETRIES) {
          console.error('[offline-queue] Giving up on operation after', MAX_RETRIES, 'retries:', op.table, op.type, errorMsg);
        }

        saveQueue(updated);
        failed++;
      }
    }

    if (synced > 0) {
      console.warn('[offline-queue] Synced', synced, 'operations');
    }
  } finally {
    isSyncing = false;
  }

  return { synced, failed };
}

export function setupAutoSync() {
  const handleOnline = () => {
    if (getQueueLength() > 0) {
      setTimeout(() => syncQueue(), 1500);
    }
  };

  window.addEventListener('online', handleOnline);

  const interval = setInterval(() => {
    if (navigator.onLine && getQueueLength() > 0) {
      syncQueue();
    }
  }, 30000);

  return () => {
    window.removeEventListener('online', handleOnline);
    clearInterval(interval);
  };
}
