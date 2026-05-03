import FridgeMonitoringClient, {
  type FridgeMonitoringItem,
  type FridgeMonitoringStatus,
} from './FridgeMonitoringClient';
import { prisma } from '@/lib/prisma';

const dayInMilliseconds = 24 * 60 * 60 * 1000;

const categoryIconMap: Record<string, string> = {
  dairy: 'local_drink',
  'dairy & eggs': 'egg_alt',
  eggs: 'egg_alt',
  vegetables: 'eco',
  produce: 'eco',
  fruits: 'nutrition',
  proteins: 'lunch_dining',
  protein: 'lunch_dining',
  'meat & seafood': 'set_meal',
  seafood: 'set_meal',
  'meat & poultry': 'lunch_dining',
  grains: 'grain',
};

type FridgeItemGroup = {
  name: string;
  categories: Map<string, number>;
  userIds: Set<string>;
  totalItemCount: number;
  expiryDays: number[];
  nearestExpiryDate: Date | null;
};

const normalizeItemName = (name: string) => name.trim().toLowerCase();

const getDisplayName = (name: string) => {
  const trimmedName = name.trim();
  return trimmedName || 'Unnamed Item';
};

const getCategory = (category: string | null | undefined) => {
  const trimmedCategory = category?.trim();
  return trimmedCategory || 'Uncategorized';
};

const getMostFrequentCategory = (categories: Map<string, number>) => {
  const [category] =
    Array.from(categories.entries()).sort(
      ([firstCategory, firstCount], [secondCategory, secondCount]) =>
        secondCount - firstCount || firstCategory.localeCompare(secondCategory),
    )[0] ?? [];

  return category ?? 'Uncategorized';
};

const getIconForCategory = (category: string) => {
  const normalizedCategory = category.trim().toLowerCase();
  return categoryIconMap[normalizedCategory] ?? 'kitchen';
};

const getDaysToExpiry = (expiryDate: Date, today: Date) => {
  const normalizedExpiryDate = new Date(expiryDate);
  normalizedExpiryDate.setHours(0, 0, 0, 0);

  return Math.ceil(
    (normalizedExpiryDate.getTime() - today.getTime()) / dayInMilliseconds,
  );
};

const getStatusFromExpiry = (nearestDaysToExpiry: number | null): FridgeMonitoringStatus => {
  if (nearestDaysToExpiry === null) {
    return 'Stable';
  }

  if (nearestDaysToExpiry <= 1) {
    return 'Critical';
  }

  if (nearestDaysToExpiry <= 3) {
    return 'Warning';
  }

  if (nearestDaysToExpiry <= 7) {
    return 'Monitor';
  }

  return 'Stable';
};

const statusSortOrder: Record<FridgeMonitoringStatus, number> = {
  Critical: 0,
  Warning: 1,
  Monitor: 2,
  Stable: 3,
};

export default async function FridgeMonitoringPage() {
  const fridgeItems = await prisma.fridgeItem.findMany({
    orderBy: [{ name: 'asc' }, { createdAt: 'desc' }],
    select: {
      id: true,
      userId: true,
      name: true,
      category: true,
      expiryDate: true,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const groups = new Map<string, FridgeItemGroup>();

  for (const item of fridgeItems) {
    const key = normalizeItemName(item.name) || item.id;
    const category = getCategory(item.category);
    const existingGroup = groups.get(key);
    const group =
      existingGroup ??
      {
        name: getDisplayName(item.name),
        categories: new Map<string, number>(),
        userIds: new Set<string>(),
        totalItemCount: 0,
        expiryDays: [],
        nearestExpiryDate: null,
      };

    group.categories.set(category, (group.categories.get(category) ?? 0) + 1);
    group.userIds.add(item.userId);
    group.totalItemCount += 1;

    if (item.expiryDate) {
      group.expiryDays.push(getDaysToExpiry(item.expiryDate, today));

      if (
        !group.nearestExpiryDate ||
        item.expiryDate.getTime() < group.nearestExpiryDate.getTime()
      ) {
        group.nearestExpiryDate = item.expiryDate;
      }
    }

    groups.set(key, group);
  }

  const items: FridgeMonitoringItem[] = Array.from(groups.entries())
    .map(([key, group]) => {
      const category = getMostFrequentCategory(group.categories);
      const nearestDaysToExpiry = group.nearestExpiryDate
        ? getDaysToExpiry(group.nearestExpiryDate, today)
        : null;
      const averageDaysToExpiry =
        group.expiryDays.length > 0
          ? Number(
              (
                group.expiryDays.reduce((total, days) => total + days, 0) /
                group.expiryDays.length
              ).toFixed(1),
            )
          : null;

      return {
        id: key,
        name: group.name,
        icon: getIconForCategory(category),
        category,
        usersOwning: group.userIds.size,
        totalItemCount: group.totalItemCount,
        nearestExpiryDate: group.nearestExpiryDate?.toISOString() ?? null,
        nearestDaysToExpiry,
        averageDaysToExpiry,
        status: getStatusFromExpiry(nearestDaysToExpiry),
      };
    })
    .sort(
      (firstItem, secondItem) =>
        statusSortOrder[firstItem.status] - statusSortOrder[secondItem.status] ||
        secondItem.usersOwning - firstItem.usersOwning ||
        secondItem.totalItemCount - firstItem.totalItemCount ||
        firstItem.name.localeCompare(secondItem.name),
    );

  return <FridgeMonitoringClient items={items} />;
}
