import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { ShieldOff, LogOut } from 'lucide-react';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isDisabled, signOut } = useAuth();
  const { needsOnboarding, onboardingLoading } = useOnboarding();
  const location = useLocation();
  const isOnline = useOnlineStatus();

  if (loading || onboardingLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Laster...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isDisabled) {
    return <DisabledAccountScreen onSignOut={signOut} />;
  }

  if (needsOnboarding && isOnline && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

function DisabledAccountScreen({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <ShieldOff className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Konto deaktivert</h1>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            Denne kontoen er deaktivert. Kontakt support dersom du mener dette er feil.
          </p>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logg ut
          </button>
        </div>
      </div>
    </div>
  );
}
