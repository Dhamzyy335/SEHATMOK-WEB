import { prisma } from '@/lib/prisma';

type ServiceStatus = 'Online' | 'Error' | 'Healthy' | 'Warning' | 'Unknown';

type MetricItem = {
  label: string;
  value: string;
  icon: string;
  valueClassName?: string;
};

type QueryResult<T> = {
  value: T | null;
  hasError: boolean;
};

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const statusStyles: Record<ServiceStatus, string> = {
  Online: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  Healthy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  Warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Unknown: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const systemLogStatusStyles: Record<string, string> = {
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const formatCount = (value: number | null) =>
  value === null ? '-' : numberFormatter.format(value);

const formatPercent = (value: number | null) => {
  if (value === null) {
    return '-';
  }

  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
};

const formatLatency = (latencyMs: number | null) => {
  if (latencyMs === null) {
    return '-';
  }

  if (latencyMs >= 1000) {
    return `${(latencyMs / 1000).toFixed(1)}s`;
  }

  return `${numberFormatter.format(latencyMs)}ms`;
};

const formatAction = (action: string) =>
  action
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

const formatDateTime = (date: Date) => dateFormatter.format(date);

const getActorLabel = (log: {
  actorName: string | null;
  actorEmail: string | null;
}) => log.actorName ?? log.actorEmail ?? 'System';

const getUserLabel = (user: {
  name: string | null;
  email: string;
}) => user.name ?? user.email;

const getAiStatus = (totalAiLogs: number | null, successRate: number | null): ServiceStatus => {
  if (!totalAiLogs || successRate === null) {
    return 'Unknown';
  }

  return successRate >= 80 ? 'Healthy' : 'Warning';
};

const getAiStatusDescription = (
  status: ServiceStatus,
  failureRate: number | null,
) => {
  if (status === 'Unknown') {
    return 'No AI generation logs recorded yet.';
  }

  if (status === 'Warning') {
    return `${formatPercent(failureRate)} failure rate from recorded AI generations.`;
  }

  return `${formatPercent(failureRate)} failure rate from recorded AI generations.`;
};

function StatusCard({
  title,
  status,
  description,
  icon,
}: {
  title: string;
  status: ServiceStatus;
  description: string;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            {title}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}>
              {status}
            </span>
          </div>
          <p className="mt-4 text-sm text-on-surface-variant">{description}</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-primary-container/30 flex items-center justify-center text-primary">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
    </div>
  );
}

function MetricTile({ label, value, icon, valueClassName }: MetricItem) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-outline-variant">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            {label}
          </p>
          <h3 className={`text-3xl font-bold mt-2 ${valueClassName ?? 'text-on-surface'}`}>
            {value}
          </h3>
        </div>
        <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 flex items-center justify-center">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
    </div>
  );
}

export default async function SystemMonitoringPage() {
  const safeQuery = async <T,>(label: string, query: PromiseLike<T>): Promise<QueryResult<T>> => {
    try {
      return {
        value: await query,
        hasError: false,
      };
    } catch (error) {
      console.error(`Failed to read ${label}:`, error);
      return {
        value: null,
        hasError: true,
      };
    }
  };

  const [
    databaseProbeResult,
    totalUsersResult,
    totalRecipesResult,
    totalFridgeItemsResult,
    totalIngredientsResult,
    totalAiLogsResult,
    failedAiLogsResult,
    successfulAiLogsResult,
    totalSystemLogsResult,
    recentSystemLogsResult,
    recentAiFailuresResult,
  ] = await Promise.all([
    safeQuery('database status', prisma.$queryRaw`SELECT 1`),
    safeQuery('total users', prisma.user.count()),
    safeQuery('total recipes', prisma.recipe.count()),
    safeQuery('total fridge items', prisma.fridgeItem.count()),
    safeQuery('total ingredients', prisma.ingredient.count()),
    safeQuery('total AI recipe logs', prisma.aiRecipeLog.count()),
    safeQuery('failed AI recipe logs', prisma.aiRecipeLog.count({ where: { status: 'FAILED' } })),
    safeQuery('successful AI recipe logs', prisma.aiRecipeLog.count({ where: { status: 'SUCCESS' } })),
    safeQuery('total system logs', prisma.systemLog.count()),
    safeQuery(
      'recent system logs',
      prisma.systemLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          actorEmail: true,
          actorName: true,
          action: true,
          message: true,
          status: true,
          createdAt: true,
        },
      }),
    ),
    safeQuery(
      'recent AI failures',
      prisma.aiRecipeLog.findMany({
        where: { status: 'FAILED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          errorMessage: true,
          latencyMs: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
    ),
  ]);

  const queryResults = [
    databaseProbeResult,
    totalUsersResult,
    totalRecipesResult,
    totalFridgeItemsResult,
    totalIngredientsResult,
    totalAiLogsResult,
    failedAiLogsResult,
    successfulAiLogsResult,
    totalSystemLogsResult,
    recentSystemLogsResult,
    recentAiFailuresResult,
  ];
  const hasDatabaseError = queryResults.some((result) => result.hasError);
  const databaseProbe = databaseProbeResult.value;
  const totalUsers = totalUsersResult.value;
  const totalRecipes = totalRecipesResult.value;
  const totalFridgeItems = totalFridgeItemsResult.value;
  const totalIngredients = totalIngredientsResult.value;
  const totalAiLogs = totalAiLogsResult.value;
  const failedAiLogs = failedAiLogsResult.value;
  const successfulAiLogs = successfulAiLogsResult.value;
  const totalSystemLogs = totalSystemLogsResult.value;
  const databaseStatus: ServiceStatus = databaseProbe !== null && !hasDatabaseError ? 'Online' : 'Error';
  const recentSystemLogs = recentSystemLogsResult.value ?? [];
  const recentAiFailures = recentAiFailuresResult.value ?? [];
  const aiSuccessRate =
    totalAiLogs && successfulAiLogs !== null
      ? Math.round((successfulAiLogs / totalAiLogs) * 1000) / 10
      : null;
  const aiFailureRate =
    totalAiLogs && failedAiLogs !== null
      ? Math.round((failedAiLogs / totalAiLogs) * 1000) / 10
      : null;
  const aiStatus = getAiStatus(totalAiLogs, aiSuccessRate);

  const metrics: MetricItem[] = [
    { label: 'Total Users', value: formatCount(totalUsers), icon: 'group' },
    { label: 'Total Recipes', value: formatCount(totalRecipes), icon: 'restaurant' },
    { label: 'Fridge Items', value: formatCount(totalFridgeItems), icon: 'kitchen' },
    { label: 'Ingredients', value: formatCount(totalIngredients), icon: 'restaurant_menu' },
    { label: 'AI Generations', value: formatCount(totalAiLogs), icon: 'auto_awesome' },
    {
      label: 'Successful AI',
      value: formatCount(successfulAiLogs),
      icon: 'check_circle',
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Failed AI',
      value: formatCount(failedAiLogs),
      icon: 'error',
      valueClassName: 'text-error',
    },
    {
      label: 'AI Success Rate',
      value: formatPercent(aiSuccessRate),
      icon: 'monitoring',
      valueClassName: aiStatus === 'Warning' ? 'text-amber-600 dark:text-amber-400' : 'text-primary',
    },
    { label: 'System Logs', value: formatCount(totalSystemLogs), icon: 'description' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">System Monitoring</h2>
        <p className="text-on-surface-variant">API and infrastructure health overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatusCard
          title="Database Status"
          status={databaseStatus}
          description={
            databaseStatus === 'Online'
              ? 'Latest Prisma database queries completed successfully.'
              : 'One or more Prisma database queries failed.'
          }
          icon="database"
        />
        <StatusCard
          title="AI Service Status"
          status={aiStatus}
          description={getAiStatusDescription(aiStatus, aiFailureRate)}
          icon="psychology"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <MetricTile key={metric.label} {...metric} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="border-b border-outline-variant bg-surface-container-low dark:bg-slate-800/50 px-4 py-3">
            <h3 className="font-bold text-on-surface">Recent System Logs</h3>
            <p className="text-xs text-on-surface-variant">
              Showing latest {numberFormatter.format(recentSystemLogs.length)} events.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest dark:bg-slate-800/30 border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Actor</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentSystemLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-on-surface">{getActorLabel(log)}</p>
                      {log.actorEmail ? (
                        <p className="text-xs text-on-surface-variant">{log.actorEmail}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-on-surface">{formatAction(log.action)}</p>
                      <p className="max-w-xs text-xs text-on-surface-variant">{log.message}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${systemLogStatusStyles[log.status] ?? statusStyles.Unknown}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentSystemLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                      No system logs recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-outline-variant overflow-hidden shadow-sm">
          <div className="border-b border-outline-variant bg-surface-container-low dark:bg-slate-800/50 px-4 py-3">
            <h3 className="font-bold text-on-surface">Recent AI Failures</h3>
            <p className="text-xs text-on-surface-variant">
              Showing latest {numberFormatter.format(recentAiFailures.length)} failed generations.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest dark:bg-slate-800/30 border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">User</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Error</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Latency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {recentAiFailures.map((log) => (
                  <tr key={log.id} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-semibold text-on-surface">{getUserLabel(log.user)}</p>
                      <p className="text-xs text-on-surface-variant">{log.user.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="max-w-sm text-xs text-error">{log.errorMessage ?? '-'}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-on-surface-variant whitespace-nowrap">
                      {formatLatency(log.latencyMs)}
                    </td>
                  </tr>
                ))}
                {recentAiFailures.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                      No failed AI generations recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
