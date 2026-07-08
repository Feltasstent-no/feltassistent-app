import { useSyncExternalStore, useCallback, useState } from 'react';
import { getQueueLength, subscribeToQueue, syncQueue } from '../lib/offline-queue';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { RefreshCw, Loader2 } from 'lucide-react';

export function SyncStatusIndicator() {
  const isOnline = useOnlineStatus();
  const [syncing, setSyncing] = useState(false);
  const queueLength = useSyncExternalStore(
    subscribeToQueue,
    getQueueLength,
    () => 0
  );

  const handleManualSync = useCallback(async () => {
    if (!isOnline || queueLength === 0 || syncing) return;
    setSyncing(true);
    try {
      await syncQueue();
    } finally {
      setSyncing(false);
    }
  }, [isOnline, queueLength, syncing]);

  if (queueLength === 0 || !isOnline) return null;

  const label = syncing
    ? `Synkroniserer ${queueLength} ${queueLength === 1 ? 'endring' : 'endringer'}\u2026`
    : `${queueLength} ${queueLength === 1 ? 'endring' : 'endringer'} venter på synkronisering`;

  return (
    <button
      onClick={handleManualSync}
      disabled={syncing}
      className={`fixed bottom-[5.5rem] right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 px-3 py-2 rounded-full shadow-lg text-sm font-medium transition-all bg-emerald-600 hover:bg-emerald-700 text-white ${syncing ? 'opacity-75' : ''}`}
      title="Trykk for å synkronisere"
    >
      {syncing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <RefreshCw className="w-4 h-4" />
      )}
      <span>{label}</span>
    </button>
  );
}
