import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth må brukes innenfor AuthProvider');
  }
  return context;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('🔍 AuthContext: Initializing auth...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 AuthContext: Session retrieved:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email
        });
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await checkAdminStatus(session.user.id);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
      } finally {
        console.log('🔍 AuthContext: Initialization complete');
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        try {
          console.log('🔍 AuthContext: Auth state changed:', {
            event,
            hasSession: !!session,
            userId: session?.user?.id,
            email: session?.user?.email
          });
          setSession(session);
          setUser(session?.user ?? null);

          if (session?.user) {
            await checkAdminStatus(session.user.id);
          } else {
            setIsAdmin(false);
          }
        } catch (error) {
          console.error('❌ Auth state change error:', error);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string) => {
    const { data } = await supabase
      .from('app_admins')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const signOut = async () => {
    setIsAdmin(false);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
