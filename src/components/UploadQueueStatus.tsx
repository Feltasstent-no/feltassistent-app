import { useState, useEffect, useCallback } from 'react';
import { Cloud, CloudOff, Loader2, Check, RefreshCw } from 'lucide-react';
import {
  subscribeToQueue,
  getQueueSnapshot,
  retryAll,
  type QueuedUpload,
} from '../lib/upload-queue';

export function UploadQueueStatus() {
  const [items, setItems] = useState<QueuedUpload[]>([]);

  const refresh = useCallback(async () => {
    const snapshot = await getQueueSnapshot();
    setItems(snapshot);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribeToQueue(refresh);
    return unsub;
  }, [refresh]);

  if (items.length === 0) return null;

  const uploading = items.filter(i => i.status === 'uploading').length;
  const queued = items.filter(i => i.status === 'queued').length;
  const failed = items.filter(i => i.status === 'failed').length;
  const total = items.length;

  if (total === 0) return null;

  const allDone = uploading === 0 && queued === 0 && failed === 0;
  if (allDone) return null;

  const isUploading = uploading > 0;
  const hasFailed = failed > 0 && !isUploading && queued === 0;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      hasFailed
        ? 'bg-amber-50 text-amber-700 border border-amber-200'
        : isUploading
          ? 'bg-blue-50 text-blue-700 border border-blue-200'
          : 'bg-slate-50 text-slate-600 border border-slate-200'
    }`}>
      {isUploading ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
          <span>Laster opp {uploading + queued} bilde{(uploading + queued) > 1 ? 'r' : ''}...</span>
        </>
      ) : hasFailed ? (
        <>
          <CloudOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{failed} bilde{failed > 1 ? 'r' : ''} venter</span>
          <button
            onClick={retryAll}
            className="ml-1 p-0.5 rounded hover:bg-amber-100 transition-colors"
            title="Prøv igjen"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </>
      ) : (
        <>
          <Cloud className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{queued} i kø</span>
        </>
      )}
    </div>
  );
}

export function UploadQueueToast() {
  const [items, setItems] = useState<QueuedUpload[]>([]);
  const [recentlyCompleted, setRecentlyCompleted] = useState(0);
  const prevCountRef = useState(0);

  const refresh = useCallback(async () => {
    const snapshot = await getQueueSnapshot();
    const prevTotal = prevCountRef[0];
    const newTotal = snapshot.length;
    if (prevTotal > newTotal && newTotal >= 0) {
      setRecentlyCompleted(prev => prev + (prevTotal - newTotal));
      setTimeout(() => setRecentlyCompleted(0), 3000);
    }
    prevCountRef[0] = newTotal;
    setItems(snapshot);
  }, []);

  useEffect(() => {
    refresh();
    const unsub = subscribeToQueue(refresh);
    return unsub;
  }, [refresh]);

  if (recentlyCompleted > 0 && items.length === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-bottom-2">
        <Check className="w-4 h-4" />
        <span>{recentlyCompleted} bilde{recentlyCompleted > 1 ? 'r' : ''} lastet opp</span>
      </div>
    );
  }

  return null;
}
