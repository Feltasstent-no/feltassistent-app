import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useAppBack } from '../lib/use-app-back';
import { ArrowLeft, ChevronRight, Target, Package, Beaker } from 'lucide-react';

const HUB_PATH = '/skudd-og-ammo';

interface HubEntry {
  title: string;
  description: string;
  to: string;
  icon: typeof Target;
  accent: string;
  iconBg: string;
  iconColor: string;
}

const entries: HubEntry[] = [
  {
    title: 'Skuddteller',
    description: 'Skudd og løp per våpen',
    to: '/weapons?section=shots',
    icon: Target,
    accent: 'hover:border-emerald-600',
    iconBg: 'bg-emerald-100 group-hover:bg-emerald-600',
    iconColor: 'text-emerald-600 group-hover:text-white',
  },
  {
    title: 'Ammunisjon',
    description: 'Ammunisjonslager og forbruk per våpen',
    to: '/ammo',
    icon: Package,
    accent: 'hover:border-amber-600',
    iconBg: 'bg-amber-100 group-hover:bg-amber-600',
    iconColor: 'text-amber-600 group-hover:text-white',
  },
  {
    title: 'Laddebok',
    description: 'Laddedata og historikk over ladebatcher',
    to: '/reloading-log',
    icon: Beaker,
    accent: 'hover:border-blue-600',
    iconBg: 'bg-blue-100 group-hover:bg-blue-600',
    iconColor: 'text-blue-600 group-hover:text-white',
  },
];

export function ShotsAmmoHub() {
  const navigate = useNavigate();
  const goBack = useAppBack('/match');

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={goBack}
            aria-label="Tilbake"
            className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Skudd & ammo</h1>
            <p className="text-sm text-slate-600">Skuddteller, ammunisjon og laddebok</p>
          </div>
        </div>

        <div className="grid gap-4">
          {entries.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.title}
                onClick={() => navigate(entry.to, { state: { from: HUB_PATH } })}
                className={`bg-white border-2 border-slate-200 ${entry.accent} rounded-xl p-4 sm:p-6 transition group text-left`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-14 h-14 ${entry.iconBg} rounded-xl flex items-center justify-center transition flex-shrink-0`}>
                    <Icon className={`w-7 h-7 ${entry.iconColor} transition`} strokeWidth={2.25} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-bold text-slate-900 mb-1">{entry.title}</h3>
                    <p className="text-sm text-slate-600">{entry.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition flex-shrink-0" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
