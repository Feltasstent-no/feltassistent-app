import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Home, User, BookOpen, Clock, Settings, LogOut, Trophy, Crosshair, ListOrdered, Activity, Compass, Shield, Sun, Moon, Palette, Target } from 'lucide-react';
import { ApertureIconBadge } from './ApertureIconBadge';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const baseNavItems = [
    { path: '/match', icon: Home, label: 'Hjem' },
    { path: '/training', icon: BookOpen, label: 'Trening' },
    { path: '/shot-assistant', icon: Crosshair, label: 'Knepp' },
    { path: '/ballistics', icon: Activity, label: 'Ballistikk' },
    { path: '/click-tables', icon: ListOrdered, label: 'Knepptabell' },
    { path: '/weapons', icon: Target, label: 'Våpen' },
    { path: '/field-clock', icon: Clock, label: 'Klokke' },
  ];

  const sidebarNavItems = [
    ...baseNavItems,
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  const adminNavItem = { path: '/admin', icon: Shield, label: 'Admin' };

  const navItems = isAdmin ? [...baseNavItems, adminNavItem] : baseNavItems;
  const sidebarItems = isAdmin ? [...sidebarNavItems, adminNavItem] : sidebarNavItems;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/match" className="flex items-center space-x-2">
              <ApertureIconBadge size="md" />
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-slate-900">Feltassistent</span>
                {isAdmin && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                    ADMIN
                  </span>
                )}
              </div>
            </Link>

            <div className="flex items-center space-x-2">
              <div className="relative group">
                <button
                  className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                >
                  {theme === 'light' && <Sun className="w-5 h-5" />}
                  {theme === 'dark' && <Moon className="w-5 h-5" />}
                  {theme === 'grey' && <Palette className="w-5 h-5" />}
                </button>
                <div
                  className="absolute right-0 mt-2 w-48 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-default)' }}
                >
                  <button
                    onClick={() => setTheme('light')}
                    className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-slate-100 transition rounded-t-lg text-slate-700"
                  >
                    <Sun className="w-4 h-4" />
                    <span className="text-sm">Light</span>
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-slate-100 transition text-slate-700"
                  >
                    <Moon className="w-4 h-4" />
                    <span className="text-sm">Dark</span>
                  </button>
                  <button
                    onClick={() => setTheme('grey')}
                    className="w-full flex items-center space-x-2 px-4 py-2 hover:bg-slate-100 transition rounded-b-lg text-slate-700"
                  >
                    <Palette className="w-4 h-4" />
                    <span className="text-sm">Dark Grey</span>
                  </button>
                </div>
              </div>
              <Link
                to="/settings"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <Settings className="w-5 h-5" />
              </Link>
              <Link
                to="/profile"
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <User className="w-5 h-5" />
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 md:ml-64">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-40">
        <div className={`grid gap-1 px-2 py-2 ${isAdmin ? 'grid-cols-8' : 'grid-cols-7'}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition active:scale-95 ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-slate-600 active:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="text-[10px] sm:text-xs mt-1 font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <nav className="hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-slate-200 z-30">
        <div className="p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
