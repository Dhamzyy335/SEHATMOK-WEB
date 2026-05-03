import { prisma } from '@/lib/prisma';

type SystemLogStatus = 'SUCCESS' | 'FAILED';

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const statusStyles: Record<SystemLogStatus, string> = {
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  FAILED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
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

const getTargetLabel = (log: {
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
}) => {
  const targetType = log.targetType ?? 'Target';
  const targetValue = log.targetLabel ?? log.targetId ?? '-';

  return `${targetType}: ${targetValue}`;
};

export default async function SystemLogsPage() {
  const [logs, totalLogs, failedLogs, successfulLogs] = await Promise.all([
    prisma.systemLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        actorEmail: true,
        actorName: true,
        action: true,
        targetType: true,
        targetId: true,
        targetLabel: true,
        message: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.systemLog.count(),
    prisma.systemLog.count({ where: { status: 'FAILED' } }),
    prisma.systemLog.count({ where: { status: 'SUCCESS' } }),
  ]);

  const latestLog = logs[0] ?? null;
  const failureRate =
    totalLogs > 0 ? Math.round((failedLogs / totalLogs) * 1000) / 10 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">System Logs</h2>
        <p className="text-on-surface-variant">Streams, error breakdowns, and AI insights.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-outline-variant overflow-hidden">
          <div className="border-b border-outline-variant bg-surface-container-low dark:bg-slate-800/50 px-4 py-3">
            <h3 className="font-bold text-on-surface">Admin Activity Stream</h3>
            <p className="text-xs text-on-surface-variant">
              Showing latest {numberFormatter.format(logs.length)} system events.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-lowest dark:bg-slate-800/30 border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Time</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Actor</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Action</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Target</th>
                  <th className="px-4 py-3 text-xs font-semibold uppercase text-on-surface">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {logs.map((log) => (
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
                      <p className="max-w-sm text-xs text-on-surface-variant">{log.message}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-on-surface-variant">
                      {getTargetLabel(log)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusStyles[log.status]}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                      No system logs recorded yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-outline-variant">
          <h3 className="font-bold text-on-surface">Error Breakdown</h3>
          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-on-surface-variant">Success</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {numberFormatter.format(successfulLogs)}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-container">
                <div
                  className="h-2 rounded-full bg-emerald-500"
                  style={{
                    width: totalLogs > 0 ? `${(successfulLogs / totalLogs) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="text-on-surface-variant">Failed</span>
                <span className="font-bold text-error">{numberFormatter.format(failedLogs)}</span>
              </div>
              <div className="h-2 rounded-full bg-surface-container">
                <div
                  className="h-2 rounded-full bg-error"
                  style={{
                    width: totalLogs > 0 ? `${(failedLogs / totalLogs) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
            <div className="rounded-lg bg-surface-container-low p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Failure Rate
              </p>
              <p className="mt-1 text-2xl font-bold text-on-surface">
                {failureRate.toFixed(failureRate % 1 === 0 ? 0 : 1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-outline-variant">
        <p className="font-mono text-sm text-on-surface-variant">
          {latestLog
            ? `$ latest ${formatAction(latestLog.action)} by ${getActorLabel(latestLog)} at ${formatDateTime(latestLog.createdAt)}`
            : '$ waiting for admin activity'}
        </p>
      </div>
    </div>
  );
}
