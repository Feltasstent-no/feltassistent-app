import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-[55] md:ml-64 pointer-events-none">
      <div className="bg-amber-600 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shadow-md pointer-events-auto">
        <WifiOff className="w-4 h-4 flex-shrink-0" />
        <span>Du er offline &ndash; endringer lagres lokalt og synkes nar nettet er tilbake</span>
      </div>
    </div>
  );
}
