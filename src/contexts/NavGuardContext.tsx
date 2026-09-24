import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';

export interface NavGuard {
  isActive: () => boolean;
  confirmLeave: (destination: string) => void;
  pauseNow: () => Promise<void>;
}

interface NavGuardContextValue {
  registerGuard: (guard: NavGuard | null) => void;
  requestLeave: (destination: string) => boolean;
  runPauseIfActive: () => Promise<void>;
}

const NavGuardContext = createContext<NavGuardContextValue | null>(null);

export function useNavGuard(): NavGuardContextValue {
  const context = useContext(NavGuardContext);
  if (!context) {
    throw new Error('useNavGuard må brukes innenfor NavGuardProvider');
  }
  return context;
}

export function NavGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<NavGuard | null>(null);

  const registerGuard = useCallback((guard: NavGuard | null) => {
    guardRef.current = guard;
  }, []);

  const requestLeave = useCallback((destination: string) => {
    const guard = guardRef.current;
    if (guard && guard.isActive()) {
      guard.confirmLeave(destination);
      return true;
    }
    return false;
  }, []);

  const runPauseIfActive = useCallback(async () => {
    const guard = guardRef.current;
    if (guard && guard.isActive()) {
      await guard.pauseNow();
    }
  }, []);

  return (
    <NavGuardContext.Provider value={{ registerGuard, requestLeave, runPauseIfActive }}>
      {children}
    </NavGuardContext.Provider>
  );
}
