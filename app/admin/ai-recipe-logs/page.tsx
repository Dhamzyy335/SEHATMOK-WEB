'use client';

import React, { useState } from 'react';

interface LogEntry {
  id: number;
  user: string;
  inputIngredients: string[];
  outputRecipe: string;
  status: 'success' | 'failed';
  generationTime: string;
  errorMessage?: string;
}

const mockLogs: LogEntry[] = [
  {
    id: 1,
    user: 'Sarah Johnson',
    inputIngredients: ['Chicken', 'Spinach', 'Garlic'],
    outputRecipe: 'Grilled Chicken with Spinach and Garlic Sauce',
    status: 'success',
    generationTime: '2024-05-01T10:12:00',
  },
  {
    id: 2,
    user: 'Michael Chen',
    inputIngredients: ['Tofu', 'Soy Sauce', 'Ginger'],
    outputRecipe: 'Stir-fried Tofu with Ginger Soy Glaze',
    status: 'success',
    generationTime: '2024-05-01T10:15:22',
  },
  {
    id: 3,
    user: 'Emma Wilson',
    inputIngredients: ['Quinoa', 'Broccoli', 'Lemon'],
    outputRecipe: '',
    status: 'failed',
    generationTime: '2024-05-01T10:18:45',
    errorMessage: 'Model timeout: No response from AI engine.',
  },
  {
    id: 4,
    user: 'Lisa Anderson',
    inputIngredients: ['Salmon', 'Dill', 'Lemon'],
    outputRecipe: 'Baked Salmon with Lemon Dill Sauce',
    status: 'success',
    generationTime: '2024-05-01T10:20:10',
  },
  {
    id: 5,
    user: 'James Martinez',
    inputIngredients: ['Eggs', 'Spinach', 'Feta'],
    outputRecipe: '',
    status: 'failed',
    generationTime: '2024-05-01T10:22:01',
    errorMessage: 'Input validation error: Missing required ingredient.',
  },
];

function statusBadge(status: 'success' | 'failed') {
  return (
    <span
      className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
        status === 'success'
          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      }`}
    >
      {status === 'success' ? 'Success' : 'Error'}
    </span>
  );
}

export default function AiRecipeLogsPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">AI Recipe Logs</h2>
        <p className="text-on-surface-variant">Monitor AI-generated recipe requests and errors.</p>
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
                <th className="px-6 py-3 text-xs font-semibold uppercase">Error</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {mockLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4">{log.user}</td>
                    <td className="px-6 py-4">
                      <span className="truncate block max-w-xs">{log.inputIngredients.join(', ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="truncate block max-w-xs">
                        {log.status === 'success' ? log.outputRecipe : <span className="text-on-surface-variant">-</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">{statusBadge(log.status)}</td>
                    <td className="px-6 py-4">{formatDateTime(log.generationTime)}</td>
                    <td className="px-6 py-4">
                      {log.status === 'failed' ? (
                        <span className="text-error text-xs">{log.errorMessage}</span>
                      ) : (
                        <span className="text-on-surface-variant">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <button
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
                  {expanded.has(log.id) && (
                    <tr className="bg-surface-container-low dark:bg-slate-800/30">
                      <td colSpan={7} className="px-8 py-4">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <h4 className="font-semibold text-on-surface mb-2">Input Ingredients</h4>
                            <div className="bg-surface-container rounded p-3 text-on-surface">
                              {log.inputIngredients.join(', ')}
                            </div>
                          </div>
                          <div>
                            <h4 className="font-semibold text-on-surface mb-2">Generated Output</h4>
                            <div className="bg-surface-container rounded p-3 text-on-surface">
                              {log.status === 'success' ? log.outputRecipe : <span className="text-on-surface-variant">No output</span>}
                            </div>
                          </div>
                        </div>
                        {log.status === 'failed' && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-error mb-2">Error Message</h4>
                            <div className="bg-error-container rounded p-3 text-error">
                              {log.errorMessage}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}