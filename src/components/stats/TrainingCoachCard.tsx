import { Crosshair, Wind, Activity, Target } from 'lucide-react';
import type { TrainingStats } from './useTrainingStats';

interface FocusArea {
  title: string;
  description: string;
  tip: string;
  icon: React.ReactNode;
  color: string;
}

function determineFocus(stats: TrainingStats): FocusArea {
  if (stats.hasWindData) {
    return {
      title: 'Vindjustering',
      description: 'Du trener med vind — hold fokus her',
      tip: 'Tren på lengre hold med sidevind',
      icon: <Wind className="w-5 h-5" />,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    };
  }

  if (stats.scoreSpread != null && stats.scoreSpread > 2) {
    return {
      title: 'Stabilitet',
      description: 'Store variasjoner mellom serier',
      tip: 'Fokuser på lik rytme og pust',
      icon: <Activity className="w-5 h-5" />,
      color: 'text-amber-600 bg-amber-50 border-amber-200',
    };
  }

  if (stats.innerHitRatio != null && stats.innerHitRatio < 30) {
    return {
      title: 'Presisjon',
      description: 'Lav andel innertreff',
      tip: 'Jobb med avtrekk og siktebilde',
      icon: <Crosshair className="w-5 h-5" />,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    };
  }

  return {
    title: 'Mengdetrening',
    description: 'Fortsett å bygge grunnlag',
    tip: 'Flere jevne økter gir progresjon',
    icon: <Target className="w-5 h-5" />,
    color: 'text-slate-600 bg-slate-50 border-slate-200',
  };
}

export function TrainingCoachCard({ stats }: { stats: TrainingStats }) {
  const focus = determineFocus(stats);
  const [iconColor] = focus.color.split(' ');

  return (
    <div className={`mt-3 rounded-xl border p-4 ${focus.color}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
          {focus.icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-0.5">
            Fokusområde
          </p>
          <p className={`text-base font-bold ${iconColor}`}>
            {focus.title}
          </p>
          <p className="text-sm text-slate-600 mt-1">
            {focus.description}
          </p>
          <p className="text-sm text-slate-500 mt-1.5 italic">
            {focus.tip}
          </p>
        </div>
      </div>
    </div>
  );
}
