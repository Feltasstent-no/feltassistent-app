interface HoldProgressProps {
  currentHold: number;
  totalHolds: number;
}

export function HoldProgress({ currentHold, totalHolds }: HoldProgressProps) {
  const progress = totalHolds > 0 ? Math.min(((currentHold + 1) / totalHolds) * 100, 100) : 0;

  return (
    <div className="flex-1 mr-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-slate-900">
          Hold {currentHold + 1} / {totalHolds}
        </span>
        <span className="text-xs text-slate-600">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
