import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import type { ShootingType, CaliberType, UsageIntent, UserMode } from '../types/database';

interface OnboardingState {
  shootingType: ShootingType | null;
  caliberType: CaliberType | null;
  usageIntent: UsageIntent | null;
  shooterClassCode: string | null;
}

interface OnboardingContextType {
  needsOnboarding: boolean;
  onboardingLoading: boolean;
  userMode: UserMode;
  state: OnboardingState;
  setState: (s: Partial<OnboardingState>) => void;
  completeOnboarding: () => Promise<void>;
  skipOnboarding: () => Promise<void>;
  refreshOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

const OnboardingContext = createContext<OnboardingContextType>({
  needsOnboarding: false,
  onboardingLoading: true,
  userMode: 'grovfelt',
  state: { shootingType: null, caliberType: null, usageIntent: null, shooterClassCode: null },
  setState: () => {},
  completeOnboarding: async () => {},
  skipOnboarding: async () => {},
  refreshOnboarding: async () => {},
  resetOnboarding: async () => {},
});

export const useOnboarding = () => useContext(OnboardingContext);

const CACHE_KEY = 'feltassistent_cached_profile_v1';

interface CachedProfile {
  user_id: string;
  onboarding_complete: boolean;
  user_mode: UserMode;
  shooting_type: ShootingType | null;
  caliber_type: CaliberType | null;
  usage_intent: UsageIntent | null;
  shooter_class: string | null;
  cached_at: number;
}

function readCache(userId: string): CachedProfile | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached: CachedProfile = JSON.parse(raw);
    if (cached.user_id !== userId) return null;
    return cached;
  } catch {
    return null;
  }
}

function writeCache(profile: CachedProfile) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(profile));
  } catch { /* storage full or unavailable */ }
}

function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch { /* ignore */ }
}

function deriveUserMode(shootingType: ShootingType | null): UserMode {
  if (shootingType === 'finfelt') return 'finfelt_only';
  return 'grovfelt';
}

function normalizeUserMode(mode: string | null): UserMode {
  if (mode === 'finfelt_only') return 'finfelt_only';
  return 'grovfelt';
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [onboardingLoading, setOnboardingLoading] = useState(true);
  const [userMode, setUserMode] = useState<UserMode>('grovfelt');
  const [state, setStateInternal] = useState<OnboardingState>({
    shootingType: null,
    caliberType: null,
    usageIntent: null,
    shooterClassCode: null,
  });

  const checkOnboarding = async () => {
    if (!user) {
      setNeedsOnboarding(false);
      setOnboardingLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('onboarding_completed, shooting_type, caliber_type, usage_intent, user_mode, shooter_class')
      .eq('id', user.id)
      .maybeSingle();

    if (error) {
      console.error('[Onboarding] Profile fetch failed:', error.message);
      const cached = readCache(user.id);
      if (cached) {
        setNeedsOnboarding(!cached.onboarding_complete);
        setUserMode(cached.user_mode);
        setStateInternal({
          shootingType: cached.shooting_type,
          caliberType: cached.caliber_type,
          usageIntent: cached.usage_intent,
          shooterClassCode: cached.shooter_class || null,
        });
      }
      setOnboardingLoading(false);
      return;
    }

    if (!data || !data.onboarding_completed) {
      setNeedsOnboarding(true);
      if (data) {
        setStateInternal({
          shootingType: data.shooting_type,
          caliberType: data.caliber_type,
          usageIntent: data.usage_intent,
          shooterClassCode: data.shooter_class || null,
        });
      }
    } else {
      setNeedsOnboarding(false);
      const mode = normalizeUserMode(data.user_mode);
      setUserMode(mode);

      writeCache({
        user_id: user.id,
        onboarding_complete: true,
        user_mode: mode,
        shooting_type: data.shooting_type,
        caliber_type: data.caliber_type,
        usage_intent: data.usage_intent,
        shooter_class: data.shooter_class || null,
        cached_at: Date.now(),
      });
    }
    setOnboardingLoading(false);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      clearCache();
    }
    checkOnboarding();
  }, [user, authLoading]);

  const setState = (partial: Partial<OnboardingState>) => {
    setStateInternal(prev => ({ ...prev, ...partial }));
  };

  const saveProfile = async (completed: boolean) => {
    if (!user) return;
    const mode = deriveUserMode(state.shootingType);
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: completed,
        shooting_type: state.shootingType,
        caliber_type: state.caliberType,
        usage_intent: state.usageIntent,
        user_mode: mode,
        shooter_class: state.shooterClassCode || null,
      })
      .eq('id', user.id);
    setUserMode(mode);
    if (completed) {
      setNeedsOnboarding(false);
      writeCache({
        user_id: user.id,
        onboarding_complete: true,
        user_mode: mode,
        shooting_type: state.shootingType,
        caliber_type: state.caliberType,
        usage_intent: state.usageIntent,
        shooter_class: state.shooterClassCode || null,
        cached_at: Date.now(),
      });
    }
  };

  const completeOnboarding = async () => {
    await saveProfile(true);
  };

  const skipOnboarding = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: true,
        user_mode: 'grovfelt',
      })
      .eq('id', user.id);
    setUserMode('grovfelt');
    setNeedsOnboarding(false);
    writeCache({
      user_id: user.id,
      onboarding_complete: true,
      user_mode: 'grovfelt',
      shooting_type: null,
      caliber_type: null,
      usage_intent: null,
      shooter_class: null,
      cached_at: Date.now(),
    });
  };

  const refreshOnboarding = async () => {
    setOnboardingLoading(true);
    await checkOnboarding();
  };

  const resetOnboarding = async () => {
    if (!user) return;
    await supabase
      .from('profiles')
      .update({
        onboarding_completed: false,
        shooting_type: null,
        caliber_type: null,
        usage_intent: null,
        user_mode: 'grovfelt',
      })
      .eq('id', user.id);
    setStateInternal({ shootingType: null, caliberType: null, usageIntent: null, shooterClassCode: null });
    setUserMode('grovfelt');
    setNeedsOnboarding(true);
    clearCache();
  };

  return (
    <OnboardingContext.Provider value={{
      needsOnboarding,
      onboardingLoading,
      userMode,
      state,
      setState,
      completeOnboarding,
      skipOnboarding,
      refreshOnboarding,
      resetOnboarding,
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}
