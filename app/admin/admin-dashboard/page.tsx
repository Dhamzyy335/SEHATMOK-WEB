import Link from 'next/link';
import { PageHeader } from '@/components/admin/PageHeader';
import { MetricCard } from '@/components/admin/MetricCard';
import { prisma } from '@/lib/prisma';

interface KPIMetric {
  id: number;
  icon: string;
  label: string;
  value: string;
  trend?: { direction: 'up' | 'down' | 'stable'; percentage: number };
}

interface ChartDataPoint {
  day: string;
  value: number;
  label: string;
  heightPercentage: number;
}

interface SummaryItem {
  label: string;
  value: string;
  detail: string;
  valueClassName: string;
  progress?: number;
  progressClassName?: string;
}

interface TopUser {
  id: string;
  name: string;
  email: string;
  activityCount: number;
  activitySummary: string;
  rank: number;
}

interface TrendingRecipe {
  id: string;
  name: string;
  usageCount: number;
  usageSummary: string;
  label: string;
}

interface TopIngredient {
  id: string;
  name: string;
  trackedCount: number;
  userCount: number;
  percentage: number;
}

const numberFormatter = new Intl.NumberFormat('en-US');
const dayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short' });

const getStartOfDay = (date: Date) => {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const getLastSevenDays = () => {
  const today = getStartOfDay(new Date());

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return date;
  });
};

const formatCount = (value: number) => numberFormatter.format(value);

const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
};

const formatPercent = (value: number | null) => {
  if (value === null) {
    return 'No data';
  }

  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`;
};

const pluralize = (value: number, singular: string, plural = `${singular}s`) =>
  value === 1 ? singular : plural;

const getNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || 'User';
  const spacedName = localPart.replace(/[._-]+/g, ' ').trim();

  if (!spacedName) {
    return 'User';
  }

  return spacedName.replace(/\b\w/g, (character) => character.toUpperCase());
};

const getInitials = (name: string) => {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || 'U';
};

const normalizeItemName = (name: string) => name.trim().toLowerCase();

const getDisplayItemName = (name: string) => {
  const trimmedName = name.trim();
  return trimmedName || 'Unnamed Item';
};

export default async function AdminDashboardPage() {
  const lastSevenDays = getLastSevenDays();
  const activityStartDate = lastSevenDays[0];
  const recentSystemLogStartDate = lastSevenDays[6];

  const [
    databaseIsOnline,
    totalUsers,
    totalRecipes,
    totalFridgeItems,
    totalBookmarkedRecipes,
    totalAiLogs,
    successfulAiLogs,
    failedAiLogs,
    totalSystemLogs,
    recentSystemLogCount,
    usersForRanking,
    recipesForRanking,
    fridgeItemsForRanking,
    libraryIngredients,
    recentUserLogs,
    recentAiLogs,
    recentSystemLogs,
    recentHistories,
    recentBookmarks,
    recentFridgeItems,
  ] = await Promise.all([
    prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch((error) => {
        console.error('Failed to probe database status:', error);
        return false;
      }),
    prisma.user.count(),
    prisma.recipe.count(),
    prisma.fridgeItem.count(),
    prisma.bookmark.count(),
    prisma.aiRecipeLog.count(),
    prisma.aiRecipeLog.count({ where: { status: 'SUCCESS' } }),
    prisma.aiRecipeLog.count({ where: { status: 'FAILED' } }),
    prisma.systemLog.count(),
    prisma.systemLog.count({ where: { createdAt: { gte: recentSystemLogStartDate } } }),
    prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        _count: {
          select: {
            fridgeItems: true,
            bookmarks: true,
            mealPlans: true,
            histories: true,
            logs: true,
            aiRecipeLogs: true,
          },
        },
      },
    }),
    prisma.recipe.findMany({
      select: {
        id: true,
        name: true,
        isRecommended: true,
        _count: {
          select: {
            bookmarks: true,
            histories: true,
            mealPlans: true,
          },
        },
      },
    }),
    prisma.fridgeItem.findMany({
      select: {
        id: true,
        name: true,
        userId: true,
      },
    }),
    prisma.ingredient.findMany({
      orderBy: { name: 'asc' },
      take: 3,
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.userLog.findMany({
      where: { createdAt: { gte: activityStartDate } },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
    prisma.aiRecipeLog.findMany({
      where: { createdAt: { gte: activityStartDate } },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
    prisma.systemLog.findMany({
      where: {
        createdAt: { gte: activityStartDate },
        actorId: { not: null },
      },
      select: {
        actorId: true,
        createdAt: true,
      },
    }),
    prisma.history.findMany({
      where: { viewedAt: { gte: activityStartDate } },
      select: {
        userId: true,
        viewedAt: true,
      },
    }),
    prisma.bookmark.findMany({
      where: { createdAt: { gte: activityStartDate } },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
    prisma.fridgeItem.findMany({
      where: { createdAt: { gte: activityStartDate } },
      select: {
        userId: true,
        createdAt: true,
      },
    }),
  ]);

  const kpis: KPIMetric[] = [
    { id: 1, icon: 'group', label: 'Total Users', value: formatCount(totalUsers) },
    { id: 2, icon: 'restaurant', label: 'Total Recipes', value: formatCount(totalRecipes) },
    { id: 3, icon: 'kitchen', label: 'Fridge Items', value: formatCount(totalFridgeItems) },
    { id: 4, icon: 'bookmark', label: 'Bookmarked Recipes', value: formatCount(totalBookmarkedRecipes) },
  ];

  const dailyActiveUsers = new Map(
    lastSevenDays.map((date) => [getDateKey(date), new Set<string>()]),
  );

  const recordActivity = (userId: string | null, date: Date) => {
    if (!userId) {
      return;
    }

    const bucket = dailyActiveUsers.get(getDateKey(date));
    bucket?.add(userId);
  };

  for (const log of recentUserLogs) recordActivity(log.userId, log.createdAt);
  for (const log of recentAiLogs) recordActivity(log.userId, log.createdAt);
  for (const log of recentSystemLogs) recordActivity(log.actorId, log.createdAt);
  for (const history of recentHistories) recordActivity(history.userId, history.viewedAt);
  for (const bookmark of recentBookmarks) recordActivity(bookmark.userId, bookmark.createdAt);
  for (const item of recentFridgeItems) recordActivity(item.userId, item.createdAt);

  const activeUserCounts = lastSevenDays.map(
    (date) => dailyActiveUsers.get(getDateKey(date))?.size ?? 0,
  );
  const maxActiveUsers = Math.max(...activeUserCounts);
  const hasActivityData = maxActiveUsers > 0;
  const chartData: ChartDataPoint[] = lastSevenDays.map((date, index) => {
    const value = activeUserCounts[index];

    return {
      day: dayFormatter.format(date),
      value,
      label: `${formatCount(value)} ${pluralize(value, 'active user')}`,
      heightPercentage: hasActivityData ? Math.max((value / maxActiveUsers) * 100, value > 0 ? 8 : 0) : 0,
    };
  });

  const aiSuccessRate =
    totalAiLogs > 0 ? Math.round((successfulAiLogs / totalAiLogs) * 1000) / 10 : null;
  const aiFailureRate =
    totalAiLogs > 0 ? Math.round((failedAiLogs / totalAiLogs) * 1000) / 10 : null;
  const databaseStatusLabel = databaseIsOnline ? 'Online' : 'Error';

  const quickSummaryItems: SummaryItem[] = [
    {
      label: 'Database',
      value: databaseStatusLabel,
      detail: databaseIsOnline
        ? 'Latest Prisma query completed successfully.'
        : 'Latest Prisma query failed.',
      valueClassName: databaseIsOnline
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-600 dark:text-red-400',
    },
    {
      label: 'AI Success Rate',
      value: formatPercent(aiSuccessRate),
      detail: totalAiLogs > 0
        ? `${formatCount(totalAiLogs)} recorded ${pluralize(totalAiLogs, 'generation')}`
        : 'No AI generation logs yet.',
      valueClassName: aiSuccessRate === null || aiSuccessRate >= 80
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-amber-600 dark:text-amber-400',
      progress: aiSuccessRate ?? 0,
      progressClassName: aiSuccessRate === null || aiSuccessRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500',
    },
    {
      label: 'Failed AI Logs',
      value: formatCount(failedAiLogs),
      detail: aiFailureRate === null
        ? 'No AI generation logs yet.'
        : `${formatPercent(aiFailureRate)} failure rate`,
      valueClassName: failedAiLogs > 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-emerald-600 dark:text-emerald-400',
      progress: aiFailureRate ?? 0,
      progressClassName: failedAiLogs > 0 ? 'bg-red-500' : 'bg-emerald-500',
    },
    {
      label: 'System Logs Today',
      value: formatCount(recentSystemLogCount),
      detail: `${formatCount(totalSystemLogs)} total ${pluralize(totalSystemLogs, 'system log')}`,
      valueClassName: 'text-emerald-600 dark:text-emerald-400',
    },
  ];

  const topUsers: TopUser[] = usersForRanking
    .map((user) => {
      const activityCount =
        user._count.fridgeItems +
        user._count.bookmarks +
        user._count.mealPlans +
        user._count.histories +
        user._count.logs +
        user._count.aiRecipeLogs;

      return {
        id: user.id,
        name: user.name ?? getNameFromEmail(user.email),
        email: user.email,
        activityCount,
        activitySummary: [
          `${formatCount(user._count.fridgeItems)} fridge`,
          `${formatCount(user._count.bookmarks)} bookmarks`,
          `${formatCount(user._count.mealPlans)} plans`,
        ].join(' · '),
        rank: 0,
      };
    })
    .sort(
      (firstUser, secondUser) =>
        secondUser.activityCount - firstUser.activityCount ||
        firstUser.name.localeCompare(secondUser.name),
    )
    .slice(0, 3)
    .map((user, index) => ({ ...user, rank: index + 1 }));

  const allRecipeUsageIsEmpty = recipesForRanking.every(
    (recipe) =>
      recipe._count.bookmarks + recipe._count.histories + recipe._count.mealPlans === 0,
  );
  const trendingRecipes: TrendingRecipe[] = recipesForRanking
    .map((recipe) => {
      const usageCount =
        recipe._count.bookmarks + recipe._count.histories + recipe._count.mealPlans;

      return {
        id: recipe.id,
        name: recipe.name,
        usageCount,
        usageSummary: [
          `${formatCount(recipe._count.bookmarks)} bookmarks`,
          `${formatCount(recipe._count.histories)} views`,
          `${formatCount(recipe._count.mealPlans)} plans`,
        ].join(' · '),
        label: allRecipeUsageIsEmpty
          ? recipe.isRecommended
            ? 'Recommended fallback'
            : 'Recipe fallback'
          : 'Usage',
        isRecommended: recipe.isRecommended,
      };
    })
    .sort((firstRecipe, secondRecipe) => {
      if (allRecipeUsageIsEmpty) {
        return (
          Number(secondRecipe.isRecommended) - Number(firstRecipe.isRecommended) ||
          firstRecipe.name.localeCompare(secondRecipe.name)
        );
      }

      return (
        secondRecipe.usageCount - firstRecipe.usageCount ||
        Number(secondRecipe.isRecommended) - Number(firstRecipe.isRecommended) ||
        firstRecipe.name.localeCompare(secondRecipe.name)
      );
    })
    .slice(0, 3);

  const ingredientGroups = new Map<
    string,
    { id: string; name: string; trackedCount: number; userIds: Set<string> }
  >();

  for (const item of fridgeItemsForRanking) {
    const key = normalizeItemName(item.name) || item.id;
    const existingGroup = ingredientGroups.get(key);
    const group =
      existingGroup ??
      {
        id: key,
        name: getDisplayItemName(item.name),
        trackedCount: 0,
        userIds: new Set<string>(),
      };

    group.trackedCount += 1;
    group.userIds.add(item.userId);
    ingredientGroups.set(key, group);
  }

  const trackedIngredients = Array.from(ingredientGroups.values()).sort(
    (firstIngredient, secondIngredient) =>
      secondIngredient.trackedCount - firstIngredient.trackedCount ||
      secondIngredient.userIds.size - firstIngredient.userIds.size ||
      firstIngredient.name.localeCompare(secondIngredient.name),
  );
  const maxTrackedIngredientCount =
    trackedIngredients.length > 0 ? trackedIngredients[0].trackedCount : 0;
  const topIngredients: TopIngredient[] =
    trackedIngredients.length > 0
      ? trackedIngredients.slice(0, 3).map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          trackedCount: ingredient.trackedCount,
          userCount: ingredient.userIds.size,
          percentage:
            maxTrackedIngredientCount > 0
              ? (ingredient.trackedCount / maxTrackedIngredientCount) * 100
              : 0,
        }))
      : libraryIngredients.map((ingredient) => ({
          id: ingredient.id,
          name: ingredient.name,
          trackedCount: 0,
          userCount: 0,
          percentage: 0,
        }));

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
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Last 7 days recorded activity</p>
            </div>
          </div>
          {hasActivityData ? (
            <>
              <div className="flex items-end justify-between gap-2 h-64 pb-4 border-b border-slate-200 dark:border-slate-700">
                {chartData.map((data) => (
                  <div key={data.day} className="flex-1 flex flex-col items-center">
                    <div
                      className={`w-full rounded-t-lg transition-colors ${
                        data.value === maxActiveUsers
                          ? 'bg-emerald-500 shadow-lg'
                          : 'bg-slate-100 dark:bg-slate-800 hover:bg-emerald-400'
                      }`}
                      style={{ height: `${data.heightPercentage}%` }}
                      title={data.label}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                {chartData.map((data) => <span key={data.day}>{data.day}</span>)}
              </div>
            </>
          ) : (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
              No activity data available yet
            </div>
          )}
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950 dark:to-teal-950 rounded-xl p-6 border border-emerald-200 dark:border-emerald-900">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Quick Summary</h3>
          <div className="space-y-4">
            {quickSummaryItems.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between gap-3 mb-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{item.label}</span>
                  <span className={`text-sm font-bold ${item.valueClassName}`}>{item.value}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{item.detail}</p>
                {typeof item.progress === 'number' ? (
                  <div className="mt-2 w-full bg-slate-300 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className={`${item.progressClassName ?? 'bg-emerald-500'} h-2 rounded-full`}
                      style={{ width: `${Math.min(Math.max(item.progress, 0), 100)}%` }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">military_tech</span> Top Users
            </h3>
            <Link href="/admin/user-management" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium">View All</Link>
          </div>
          <div className="space-y-4">
            {topUsers.length > 0 ? topUsers.map((user, index) => (
              <div key={user.id}>
                <div className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-sm">
                        {getInitials(user.name)}
                      </div>
                      <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        index === 0 ? 'bg-amber-400' : index === 1 ? 'bg-slate-400' : 'bg-orange-400'
                      }`}>
                        {user.rank}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{user.email}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-500 truncate">{user.activitySummary}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCompactNumber(user.activityCount)}
                  </span>
                </div>
                {index < topUsers.length - 1 && <hr className="border-slate-200 dark:border-slate-700" />}
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No users available yet.
              </p>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">bookmark_star</span> Trending Recipes
            </h3>
            <Link href="/admin/recipe-management" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium">View All</Link>
          </div>
          <div className="space-y-3">
            {trendingRecipes.length > 0 ? trendingRecipes.map((recipe) => (
              <div key={recipe.id} className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                <div className="flex justify-between gap-3 items-start mb-1">
                  <p className="font-medium text-slate-900 dark:text-white">{recipe.name}</p>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatCompactNumber(recipe.usageCount)}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded">
                    {recipe.label}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-500">{recipe.usageSummary}</span>
                </div>
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No recipes available yet.
              </p>
            )}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500">eco</span> Top Ingredients
            </h3>
            <Link href="/admin/fridge-monitoring" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 text-sm font-medium">View All</Link>
          </div>
          <div className="space-y-4">
            {topIngredients.length > 0 ? topIngredients.map((ingredient) => (
              <div key={ingredient.id}>
                <div className="flex justify-between gap-3 mb-1">
                  <span className="text-sm font-medium text-slate-900 dark:text-white truncate">{ingredient.name}</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {formatCompactNumber(ingredient.trackedCount)}
                  </span>
                </div>
                <p className="mb-2 text-xs text-slate-500 dark:text-slate-500">
                  {formatCount(ingredient.userCount)} {pluralize(ingredient.userCount, 'user')} tracking
                </p>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2 rounded-full"
                    style={{ width: `${ingredient.percentage}%` }}
                  />
                </div>
              </div>
            )) : (
              <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No ingredient data available yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
