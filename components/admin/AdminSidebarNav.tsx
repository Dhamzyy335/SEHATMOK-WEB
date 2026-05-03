'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AdminLogoutButton from '@/components/admin/AdminLogoutButton';

type AdminSidebarNavProps = {
  isOpen: boolean;
  onClose: () => void;
};

const navItems = [
  { label: 'Dashboard', href: '/admin/admin-dashboard', icon: 'dashboard' },
  { label: 'Admin Management', href: '/admin/admin-management', icon: 'admin_panel_settings' },
  { label: 'User Management', href: '/admin/user-management', icon: 'group' },
  { label: 'Recipe Management', href: '/admin/recipe-management', icon: 'restaurant' },
  { label: 'Fridge Monitoring', href: '/admin/fridge-monitoring', icon: 'kitchen' },
  { label: 'Ingredients Library', href: '/admin/ingredients-management', icon: 'restaurant_menu' },
  { label: 'AI Recipe Logs', href: '/admin/ai-recipe-logs', icon: 'history_edu' },
  { label: 'System Logs', href: '/admin/system-logs', icon: 'description' },
  { label: 'System Monitoring', href: '/admin/system-monitoring', icon: 'monitor_heart' },
  { label: 'Settings', href: '/admin/admin-settings', icon: 'settings' },
];

export default function AdminSidebarNav({ isOpen, onClose }: AdminSidebarNavProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 dark:border-slate-800 dark:bg-slate-950 lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-800">
          <Link href="/admin/admin-dashboard" className="flex items-center gap-3" onClick={onClose}>
            <span className="material-symbols-outlined rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              health_and_safety
            </span>
            <div>
              <p className="text-base font-bold text-slate-900 dark:text-white">SehatMok</p>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Admin Panel</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white lg:hidden"
            aria-label="Close admin navigation"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 px-3 py-4 dark:border-slate-800">
          <AdminLogoutButton onLogout={onClose} />
        </div>
      </div>
    </aside>
  );
}
