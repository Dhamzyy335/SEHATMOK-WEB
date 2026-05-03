import { PageHeader } from '@/components/admin/PageHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { prisma } from '@/lib/prisma';

interface KPIMetric {
  id: number;
  icon: string;
  label: string;
  value: string;
  trend?: { direction: 'up' | 'down' | 'stable'; percentage: number; };
}

interface TopUser {
  id: number;
  name: string;
  logins: number;
  engagement: number;
  rank: number;
}

interface TrendingRecipe {
  id: number;
  name: string;
  category: string;
  likes: number;
}

interface Ingredient {
  id: number;
  name: string;
  logs: number;
  percentage: number;
}

const numberFormatter = new Intl.NumberFormat('en-US');

export default async function AdminDashboardPage() {
  const [totalUsers, totalRecipes, totalFridgeItems, totalBookmarkedRecipes] =
    await Promise.all([
      prisma.user.count(),
      prisma.recipe.count(),
      prisma.fridgeItem.count(),
      prisma.bookmark.count(),
      prisma.mealPlan.count(),
    ]);

  const kpis: KPIMetric[] = [
    { id: 1, icon: 'group', label: 'Total Users', value: numberFormatter.format(totalUsers) },
    { id: 2, icon: 'restaurant', label: 'Total Recipes', value: numberFormatter.format(totalRecipes) },
    { id: 3, icon: 'kitchen', label: 'Fridge Items', value: numberFormatter.format(totalFridgeItems) },
    { id: 4, icon: 'bookmark', label: 'Bookmarked Recipes', value: numberFormatter.format(totalBookmarkedRecipes) },
  ];

  const topUsers: TopUser[] = [
    { id: 1, name: 'Sarah Jenkins', logins: 142, engagement: 98, rank: 1 },
    { id: 2, name: 'Michael Chen', logins: 118, engagement: 92, rank: 2 },
    { id: 3, name: 'Emma Johnson', logins: 95, engagement: 88, rank: 3 },
  ];

  const trendingRecipes: TrendingRecipe[] = [
    { id: 1, name: 'Quinoa Power Bowl', category: 'Vegan', likes: 12400 },
    { id: 2, name: 'Lemon Herb Salmon', category: 'Keto', likes: 9800 },
    { id: 3, name: 'Berry Chia Oats', category: 'Breakfast', likes: 8200 },
  ];

  const ingredients: Ingredient[] = [
    { id: 1, name: 'Chicken Breast', logs: 45000, percentage: 85 },
    { id: 2, name: 'Spinach', logs: 38000, percentage: 70 },
    { id: 3, name: 'Eggs', logs: 32000, percentage: 55 },
  ];

  const chartData = [
    { day: 'Mon', value: 40, label: '4.2k' }, { day: 'Tue', value: 60, label: '6.1k' },
    { day: 'Wed', value: 85, label: '8.5k' }, { day: 'Thu', value: 70, label: '7.0k' },
    { day: 'Fri', value: 55, label: '5.5k' }, { day: 'Sat', value: 45, label: '4.5k' },
    { day: 'Sun', value: 65, label: '6.5k' },
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Welcome back! Here's an overview of system performance and activity."
        icon="dashboard"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <MetricCard key={kpi.id} icon={kpi.icon} label={kpi.label} value={kpi.value} trend={kpi.trend} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Daily Active Users</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Last 7 days engagement</p>
            </div>
            <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <span className="material-symbols-outlined text-slate-600 dark:text-slate-400">more_vert</span>
            </button>
          </div>
          <div className="flex items-end justify-between gap-2 h-64 pb-4 border-b border-slate-200 dark:border-slate-700">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t-lg transition-colors cursor-pointer ${
                    data.value === 85 ? 'bg-emerald-500 shadow-lg' : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-400'
                  }`}
                  style={{ height: `${(data.value / 85) * 100}%` }}
                  title={data.label}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-4 text-xs font-medium text-slate-600 dark:text-slate-400">
            {chartData.map((data) => <span key={data.day}>{data.day}</span>)}
          </div>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl p-6 border border-emerald-200 dark:border-emerald-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Summary</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">System Health</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">98%</span>
              </div>
              <div className="w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '98%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">API Uptime</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">99.9%</span>
              </div>
              <div className="w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '99.9%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Storage Usage</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">45%</span>
              </div>
              <div className="w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">military_tech</span> Top Users
            </h3>
            <a href="/admin/user-management" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium">View All</a>
          </div>
          <div className="space-y-4">
            {topUsers.map((user, idx) => (
              <div key={user.id}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                        {user.name.charAt(0)}
                      </div>
                      <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-slate-400' : 'bg-orange-400'
                      }`}>
                        {user.rank}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{user.logins} logins</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{user.engagement}%</span>
                </div>
                {idx < topUsers.length - 1 && <hr className="border-slate-200 dark:border-slate-700" />}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">bookmark_star</span> Trending Recipes
            </h3>
            <a href="/admin/recipe-management" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium">View All</a>
          </div>
          <div className="space-y-3">
            {trendingRecipes.map((recipe) => (
              <div key={recipe.id} className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex justify-between items-start mb-1">
                  <p className="font-medium text-slate-900 dark:text-white">{recipe.name}</p>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(recipe.likes)}</span>
                </div>
                <span className="inline-block text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                  {recipe.category}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500">eco</span> Top Ingredients
          </h3>
          <div className="space-y-4">
            {ingredients.map((ingredient) => (
              <div key={ingredient.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-white">{ingredient.name}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{formatNumber(ingredient.logs)}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full"
                    style={{ width: `${ingredient.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
