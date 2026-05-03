'use client';

import { Fragment, useState } from 'react';

export type AiRecipeLogStatus = 'SUCCESS' | 'FAILED';

export type AiRecipeLogEntry = {
  id: string;
  userName: string;
  userEmail: string;
  inputIngredients: string[];
  outputRecipe: string | null;
  status: AiRecipeLogStatus;
  generationTime: string;
  errorMessage: string | null;
  latencyMs: number | null;
};

export type AiRecipeLogsStats = {
  totalGenerations: number;
  successRate: number;
  averageLatencyMs: number | null;
};

type AiRecipeLogsClientProps = {
  logs: AiRecipeLogEntry[];
  stats: AiRecipeLogsStats;
};

const numberFormatter = new Intl.NumberFormat('en-US');

function statusBadge(status: AiRecipeLogStatus) {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
        status === 'SUCCESS'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }`}
    >
      {status === 'SUCCESS' ? 'Success' : 'Error'}
    </span>
  );
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString();
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

export default function AiRecipeLogsClient({
  logs,
  stats,
}: AiRecipeLogsClientProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">AI Recipe Logs</h2>
        <p className="text-on-surface-variant">Monitor AI-generated recipe requests and errors.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-50 dark:border-slate-800">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            Total Generations
          </p>
          <h3 className="text-3xl font-bold text-on-surface mt-2">
            {numberFormatter.format(stats.totalGenerations)}
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-50 dark:border-slate-800">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            Success Rate
          </p>
          <h3 className="text-3xl font-bold text-primary mt-2">
            {stats.successRate.toFixed(stats.successRate % 1 === 0 ? 0 : 1)}%
          </h3>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-sm border border-slate-50 dark:border-slate-800">
          <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">
            Average Latency
          </p>
          <h3 className="text-3xl font-bold text-on-surface mt-2">
            {formatLatency(stats.averageLatencyMs)}
          </h3>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-50 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low dark:bg-slate-800/50 border-b border-outline-variant">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold uppercase">User</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Input Ingredients</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Output</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Status</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Generation Time</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Latency</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Error</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {logs.map((log) => (
                <Fragment key={log.id}>
                  <tr className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-on-surface">{log.userName}</p>
                        <p className="text-xs text-on-surface-variant">{log.userEmail}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="truncate block max-w-xs">
                        {log.inputIngredients.length > 0
                          ? log.inputIngredients.join(', ')
                          : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="truncate block max-w-xs">
                        {log.status === 'SUCCESS' && log.outputRecipe ? (
                          log.outputRecipe
                        ) : (
                          <span className="text-on-surface-variant">-</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4">{statusBadge(log.status)}</td>
                    <td className="px-6 py-4">{formatDateTime(log.generationTime)}</td>
                    <td className="px-6 py-4">{formatLatency(log.latencyMs)}</td>
                    <td className="px-6 py-4">
                      {log.status === 'FAILED' ? (
                        <span className="text-error text-xs">{log.errorMessage ?? '-'}</span>
                      ) : (
                        <span className="text-on-surface-variant">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        className="p-2 hover:bg-surface-container/30 rounded-md"
                        title={expanded.has(log.id) ? 'Collapse' : 'Expand'}
                      >
                        <span className="material-symbols-outlined">
                          {expanded.has(log.id) ? 'expand_less' : 'expand_more'}
                        </span>
                      </button>
                    </td>
                  </tr>
                  {expanded.has(log.id) ? (
                    <tr className="bg-surface-container-low dark:bg-slate-800/30">
                      <td colSpan={8} className="px-8 py-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-on-surface mb-2">Input Ingredients</h4>
                            <div className="bg-surface-container rounded p-3 text-on-surface">
                              {log.inputIngredients.length > 0
                                ? log.inputIngredients.join(', ')
                                : '-'}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-on-surface mb-2">Generated Output</h4>
                            <div className="bg-surface-container rounded p-3 text-on-surface">
                              {log.status === 'SUCCESS' && log.outputRecipe ? (
                                log.outputRecipe
                              ) : (
                                <span className="text-on-surface-variant">No output</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {log.status === 'FAILED' ? (
                          <div className="mt-4">
                            <h4 className="font-semibold text-error mb-2">Error Message</h4>
                            <div className="bg-error-container rounded p-3 text-error">
                              {log.errorMessage ?? '-'}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-on-surface-variant">
                    No AI recipe logs recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
