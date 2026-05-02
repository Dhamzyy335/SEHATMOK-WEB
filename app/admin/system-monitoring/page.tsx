'use client';
import React from 'react';

export default function SystemMonitoringPage(){
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-on-surface">System Monitoring</h2>
        <p className="text-on-surface-variant">API and infrastructure health overview.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant">KPI and microservice status placeholder</div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-outline-variant">Anomalous events table placeholder</div>
      </div>
    </div>
  );
}