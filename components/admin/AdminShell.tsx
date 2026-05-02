'use client';

import React, { useState } from 'react';
import AdminSidebarNav from '@/components/admin/AdminSidebarNav';
import AdminTopBar from '@/components/admin/AdminTopBar';

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      <AdminSidebarNav isOpen={sidebarOpen} onClose={closeSidebar} />

      <div className="lg:ml-64 flex flex-col min-h-screen">
        <AdminTopBar onMenuClick={toggleSidebar} />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
