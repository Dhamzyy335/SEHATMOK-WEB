'use client';

import { useMemo, useState } from 'react';

export type FridgeMonitoringStatus = 'Critical' | 'Warning' | 'Monitor' | 'Stable';

export type FridgeMonitoringItem = {
  id: string;
  name: string;
  icon: string;
  category: string;
  usersOwning: number;
  totalItemCount: number;
  nearestExpiryDate: string | null;
  nearestDaysToExpiry: number | null;
  averageDaysToExpiry: number | null;
  status: FridgeMonitoringStatus;
};

type FridgeMonitoringClientProps = {
  items: FridgeMonitoringItem[];
};

const numberFormatter = new Intl.NumberFormat('en-US');
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const statusStyles: Record<FridgeMonitoringStatus, string> = {
  Critical: 'bg-error-container text-error dark:bg-error-container/20 dark:text-error',
  Warning:
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  Monitor:
    'bg-secondary-container text-on-secondary-container dark:bg-secondary-container/20 dark:text-secondary-container',
  Stable:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

const formatExpiry = (days: number | null) => {
  if (days === null) {
    return '-';
  }

  if (days < 0) {
    return 'Expired';
  }

  if (days < 1) {
    return '< 24 Hours';
  }

  if (days === 1) {
    return '1 Day';
  }

  return `${Number.isInteger(days) ? days : days.toFixed(1)} Days`;
};

const formatNearestExpiry = (date: string | null) => {
  if (!date) {
    return 'Nearest: -';
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Nearest: -';
  }

  return `Nearest: ${dateFormatter.format(parsedDate)}`;
};

export default function FridgeMonitoringClient({ items }: FridgeMonitoringClientProps) {
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);

  const filteredItems = useMemo(() => {
    if (filterExpiringSoon) {
      return items.filter(
        (item) => item.nearestDaysToExpiry !== null && item.nearestDaysToExpiry <= 2,
      );
    }

    return items;
  }, [filterExpiringSoon, items]);

  const criticalItemCount = useMemo(
    () => items.filter((item) => item.status === 'Critical').length,
    [items],
  );

  const mostTrackedItem = useMemo(
    () =>
      items.reduce<FridgeMonitoringItem | null>((currentMostTracked, item) => {
        if (!currentMostTracked) {
          return item;
        }

        if (item.usersOwning > currentMostTracked.usersOwning) {
          return item;
        }

        if (
          item.usersOwning === currentMostTracked.usersOwning &&
          item.totalItemCount > currentMostTracked.totalItemCount
        ) {
          return item;
        }

        return currentMostTracked;
      }, null),
    [items],
  );

  return (
    <div className="space-y-6">
      {/* Page Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-on-surface">Fridge Monitoring</h2>
          <p className="text-on-surface-variant mt-1">Track community ingredient freshness and usage patterns.</p>
        </div>
        
        {/* Toggle Filter */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-outline-variant shadow-sm">
          <span className="text-sm font-semibold text-on-surface-variant">Expiring in &lt; 2 Days</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={filterExpiringSoon}
              onChange={() => setFilterExpiringSoon(!filterExpiringSoon)}
            />
            <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-error"></div>
          </label>
        </div>
      </div>

      {/* Bento Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Critical Items</p>
              <h3 className="text-3xl font-bold text-error mt-2">
                {numberFormatter.format(criticalItemCount)}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-error-container/50 flex items-center justify-center text-error">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mt-4 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">schedule</span> Based on nearest expiry date
          </p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Most Tracked</p>
              <h3 className="text-3xl font-bold text-primary mt-2">
                {mostTrackedItem?.name ?? '-'}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-container/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">
                {mostTrackedItem?.icon ?? 'kitchen'}
              </span>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mt-4">
            In {numberFormatter.format(mostTrackedItem?.usersOwning ?? 0)} fridges globally
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant bg-surface-container-lowest dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-on-surface">Global Inventory Status</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low dark:bg-slate-800/50 border-b border-outline-variant">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface w-1/3">Item Name</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface">Category</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface text-right">Users Owning</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface text-right">Total Items</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface">Avg Expiry</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-surface-container-lowest dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-container-low dark:bg-slate-800 flex items-center justify-center text-on-surface-variant">
                        <span className="material-symbols-outlined text-lg">{item.icon}</span>
                      </div>
                      <span className="font-semibold text-on-surface">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant">{item.category}</td>
                  <td className="px-6 py-4 text-right font-semibold text-on-surface">
                    {numberFormatter.format(item.usersOwning)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-on-surface">
                    {numberFormatter.format(item.totalItemCount)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        item.nearestDaysToExpiry !== null && item.nearestDaysToExpiry <= 2
                          ? 'bg-error-container text-error dark:bg-error-container/20 dark:text-error' 
                          : 'bg-surface-variant text-on-surface-variant dark:bg-slate-700 dark:text-slate-300'
                      }`}>
                        <span className="material-symbols-outlined text-[14px]">
                          {item.nearestDaysToExpiry !== null && item.nearestDaysToExpiry <= 2 ? 'timer' : 'schedule'}
                        </span>
                        {formatExpiry(item.averageDaysToExpiry)}
                      </span>
                      <p className="text-xs text-on-surface-variant">
                        {formatNearestExpiry(item.nearestExpiryDate)}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${statusStyles[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant">
                    No items match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
