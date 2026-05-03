import { PageHeader } from '@/components/admin/PageHeader';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';

interface ManagementCard {
  id: number;
  title: string;
  description: string;
  icon: string;
  href: string;
  color: string;
  count: string;
}

const numberFormatter = new Intl.NumberFormat('en-US');
const normalizeFridgeItemName = (name: string) => name.trim().toLowerCase();

export default async function AdminManagementPage() {
  const [
    totalUsers,
    totalRecipes,
    fridgeItems,
    totalIngredients,
    totalAiRecipeLogs,
    totalSystemLogs,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.fridgeItem.findMany({
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.ingredient.count(),
    prisma.aiRecipeLog.count(),
    prisma.systemLog.count(),
  ]);
  const totalFridgeItemTypes = new Set(
    fridgeItems.map((item) => normalizeFridgeItemName(item.name) || item.id),
  ).size;

  const managementCards: ManagementCard[] = [
    { id: 1, title: 'User Management', description: 'Manage user accounts, roles, and permissions', icon: 'group', href: '/admin/user-management', color: 'from-blue-500 to-blue-600', count: numberFormatter.format(totalUsers) },
    { id: 2, title: 'Recipe Management', description: 'Create, edit, and manage recipes', icon: 'restaurant', href: '/admin/recipe-management', color: 'from-orange-500 to-orange-600', count: numberFormatter.format(totalRecipes) },
    { id: 3, title: 'Fridge Monitoring', description: 'Monitor and manage fridge systems', icon: 'kitchen', href: '/admin/fridge-monitoring', color: 'from-cyan-500 to-cyan-600', count: numberFormatter.format(totalFridgeItemTypes) },
    { id: 4, title: 'Ingredients', description: 'Manage ingredient database', icon: 'restaurant_menu', href: '/admin/ingredients-management', color: 'from-green-500 to-green-600', count: numberFormatter.format(totalIngredients) },
    { id: 5, title: 'AI Recipe Logs', description: 'View AI-generated recipe logs', icon: 'history_edu', href: '/admin/ai-recipe-logs', color: 'from-purple-500 to-purple-600', count: numberFormatter.format(totalAiRecipeLogs) },
    { id: 6, title: 'System Logs', description: 'View system activity and errors', icon: 'description', href: '/admin/system-logs', color: 'from-slate-600 to-slate-700', count: numberFormatter.format(totalSystemLogs) },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Management"
        description="Manage all administrative functions and system settings"
        icon="admin_panel_settings"
      />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {managementCards.map((card) => (
          <Link key={card.id} href={card.href} className="group relative">
            <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all duration-300 h-full">
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${card.color} opacity-10 group-hover:opacity-20 transition-opacity rounded-full blur-3xl -mr-8 -mt-8`} />
              <div className="p-6 relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{card.count}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{card.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{card.description}</p>
                <div className="flex items-center text-slate-600 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  <span className="text-sm font-medium">Access &rarr;</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl p-8 border border-emerald-200 dark:border-emerald-900">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/admin/user-management?newUser=1" className="bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg p-4 transition-colors text-left">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">add_circle</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">Create New User</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Open user management</p>
              </div>
            </div>
          </Link>
          <button
            type="button"
            disabled
            className="cursor-not-allowed bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 rounded-lg p-4 text-left opacity-70"
            aria-disabled="true"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">assessment</span>
              <div>
                <p className="font-semibold text-slate-500 dark:text-slate-400">Generate Report</p>
                <p className="text-xs text-slate-500 dark:text-slate-500">Report feature not available yet</p>
              </div>
            </div>
          </button>
          <Link href="/admin/admin-settings" className="bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg p-4 transition-colors text-left">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">settings</span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">System Settings</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">Manage admin profile and password</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
