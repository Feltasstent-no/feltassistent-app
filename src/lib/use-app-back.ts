import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function isSafeInternalPath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('://')
  );
}

export function useAppBack(fallbackRoute: string) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    const from = (location.state as { from?: unknown } | null)?.from;
    navigate(isSafeInternalPath(from) ? from : fallbackRoute);
  }, [navigate, location.state, fallbackRoute]);
}
