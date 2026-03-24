import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  getUserActiveSetup,
  createOrUpdateActiveSetup,
  setActiveWeapon,
  setActiveClickTable,
  setActiveBallisticProfile,
  ActiveSetupWithDetails,
} from '../lib/active-setup-service';

interface ActiveSetupContextType {
  activeSetup: ActiveSetupWithDetails | null;
  loading: boolean;
  error: string | null;
  refreshActiveSetup: () => Promise<void>;
  updateActiveSetup: (setup: {
    weapon_id?: string | null;
    barrel_id?: string | null;
    click_table_id?: string | null;
    ballistic_profile_id?: string | null;
    discipline_id?: string | null;
    mode?: string;
  }) => Promise<void>;
  setWeapon: (weaponId: string | null, barrelId?: string | null) => Promise<void>;
  setClickTable: (clickTableId: string | null) => Promise<void>;
  setBallisticProfile: (ballisticProfileId: string | null) => Promise<void>;
}

const ActiveSetupContext = createContext<ActiveSetupContextType | undefined>(undefined);

export function ActiveSetupProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeSetup, setActiveSetup] = useState<ActiveSetupWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActiveSetup = async () => {
    if (!user) {
      setActiveSetup(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const setup = await getUserActiveSetup(user.id);
      setActiveSetup(setup);
    } catch (err) {
      console.error('Error loading active setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to load active setup');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveSetup();
  }, [user]);

  const refreshActiveSetup = async () => {
    await loadActiveSetup();
  };

  const updateActiveSetup = async (setup: {
    weapon_id?: string | null;
    barrel_id?: string | null;
    click_table_id?: string | null;
    ballistic_profile_id?: string | null;
    discipline_id?: string | null;
    mode?: string;
  }) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      await createOrUpdateActiveSetup(user.id, setup);
      await refreshActiveSetup();
    } catch (err) {
      console.error('Error updating active setup:', err);
      setError(err instanceof Error ? err.message : 'Failed to update active setup');
      throw err;
    }
  };

  const setWeapon = async (weaponId: string | null, barrelId: string | null = null) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      await setActiveWeapon(user.id, weaponId, barrelId);
      await refreshActiveSetup();
    } catch (err) {
      console.error('Error setting active weapon:', err);
      setError(err instanceof Error ? err.message : 'Failed to set active weapon');
      throw err;
    }
  };

  const setClickTable = async (clickTableId: string | null) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      await setActiveClickTable(user.id, clickTableId);
      await refreshActiveSetup();
    } catch (err) {
      console.error('Error setting active click table:', err);
      setError(err instanceof Error ? err.message : 'Failed to set active click table');
      throw err;
    }
  };

  const setBallisticProfile = async (ballisticProfileId: string | null) => {
    if (!user) throw new Error('User not authenticated');

    try {
      setError(null);
      await setActiveBallisticProfile(user.id, ballisticProfileId);
      await refreshActiveSetup();
    } catch (err) {
      console.error('Error setting active ballistic profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to set active ballistic profile');
      throw err;
    }
  };

  return (
    <ActiveSetupContext.Provider
      value={{
        activeSetup,
        loading,
        error,
        refreshActiveSetup,
        updateActiveSetup,
        setWeapon,
        setClickTable,
        setBallisticProfile,
      }}
    >
      {children}
    </ActiveSetupContext.Provider>
  );
}

export function useActiveSetup() {
  const context = useContext(ActiveSetupContext);
  if (context === undefined) {
    throw new Error('useActiveSetup must be used within an ActiveSetupProvider');
  }
  return context;
}
