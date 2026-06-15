import { useSyncExternalStore } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getQueueLength, subscribeToQueue } from '../lib/offline-queue';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const queueLength = useSyncExternalStore(
    subscribeToQueue,
    getQueueLength,
    () => 0
  );

  if (isOnline) return null;

  const message = queueLength === 0
    ? 'Offline-modus aktiv \u2013 stevnedata lagres lokalt og synkroniseres n\u00e5r du f\u00e5r dekning igjen'
    : queueLength === 1
      ? 'Offline-modus aktiv \u2013 1 endring venter p\u00e5 synkronisering'
      : `Offline-modus aktiv \u2013 ${queueLength} endringer venter p\u00e5 synkronisering`;

  return (
    <div className="fixed top-16 left-0 right-0 z-[55] md:ml-64 pointer-events-none">
      <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md pointer-events-auto">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>{message}</span>
      </div>
    </div>
  );
}
