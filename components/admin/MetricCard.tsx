type MetricTrend = {
  direction: 'up' | 'down' | 'stable';
  percentage: number;
};

type MetricCardProps = {
  icon: string;
  label: string;
  value: string;
  trend?: MetricTrend;
};

const trendStyles = {
  up: 'text-emerald-600 dark:text-emerald-400',
  down: 'text-red-600 dark:text-red-400',
  stable: 'text-slate-500 dark:text-slate-400',
};

const trendIcons = {
  up: 'trending_up',
  down: 'trending_down',
  stable: 'trending_flat',
};

export function MetricCard({ icon, label, value, trend }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>

      {trend ? (
        <div className={`mt-4 flex items-center gap-1 text-xs font-semibold ${trendStyles[trend.direction]}`}>
          <span className="material-symbols-outlined text-base">{trendIcons[trend.direction]}</span>
          <span>{trend.percentage}%</span>
        </div>
      ) : null}
    </div>
  );
}
