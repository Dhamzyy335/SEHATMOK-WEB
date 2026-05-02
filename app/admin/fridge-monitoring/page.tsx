'use client';

import React, { useState, useMemo } from 'react';

interface FridgeItem {
  id: number;
  name: string;
  icon: string;
  category: string;
  usersOwning: number;
  daysToExpiry: number;
  status: 'Frequent' | 'Standard' | 'Rare';
}

export default function FridgeMonitoringPage() {
  const [filterExpiringSoon, setFilterExpiringSoon] = useState(false);

  const mockItems: FridgeItem[] = [
    { id: 1, name: 'Organic Eggs', icon: 'egg', category: 'Dairy & Eggs', usersOwning: 34291, daysToExpiry: 0.8, status: 'Frequent' },
    { id: 2, name: 'Whole Milk', icon: 'local_drink', category: 'Dairy & Eggs', usersOwning: 42105, daysToExpiry: 1.5, status: 'Frequent' },
    { id: 3, name: 'Fresh Salmon', icon: 'set_meal', category: 'Meat & Seafood', usersOwning: 12840, daysToExpiry: 0.4, status: 'Standard' },
    { id: 4, name: 'Spinach Leaves', icon: 'eco', category: 'Produce', usersOwning: 28550, daysToExpiry: 4, status: 'Frequent' },
    { id: 5, name: 'Chicken Breast', icon: 'lunch_dining', category: 'Meat & Poultry', usersOwning: 51200, daysToExpiry: 5, status: 'Frequent' },
  ];

  const filteredItems = useMemo(() => {
    if (filterExpiringSoon) {
      return mockItems.filter(item => item.daysToExpiry <= 2);
    }
    return mockItems;
  }, [filterExpiringSoon, mockItems]);

  const formatExpiry = (days: number) => {
    if (days < 1) return '< 24 Hours';
    if (days === 1) return '1 Day';
    return `${days} Days`;
  };

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
              <h3 className="text-3xl font-bold text-error mt-2">1,248</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-error-container/50 flex items-center justify-center text-error">
              <span className="material-symbols-outlined">warning</span>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mt-4 flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span> +12% from last week
          </p>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Most Tracked</p>
              <h3 className="text-3xl font-bold text-primary mt-2">Milk</h3>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary-container/30 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined">local_drink</span>
            </div>
          </div>
          <p className="text-sm text-on-surface-variant mt-4">
            In 42k+ fridges globally
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-outline-variant overflow-hidden">
        <div className="p-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-on-surface">Global Inventory Status</h3>
          <button className="text-sm font-semibold text-primary flex items-center gap-1 hover:text-primary-container transition-colors">
            <span className="material-symbols-outlined text-sm">download</span> Export Data
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-surface-container-low dark:bg-slate-800/50 border-b border-outline-variant">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface w-1/3">Item Name</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface">Category</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase text-on-surface text-right">Users Owning</th>
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
                    {item.usersOwning.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      item.daysToExpiry <= 2 
                        ? 'bg-error-container text-error dark:bg-error-container/20 dark:text-error' 
                        : 'bg-surface-variant text-on-surface-variant dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      <span className="material-symbols-outlined text-[14px]">
                        {item.daysToExpiry <= 2 ? 'timer' : 'schedule'}
                      </span>
                      {formatExpiry(item.daysToExpiry)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 rounded-full bg-secondary-container text-on-secondary-container dark:bg-secondary-container/20 dark:text-secondary-container text-xs font-bold uppercase">
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
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