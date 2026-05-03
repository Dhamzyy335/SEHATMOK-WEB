import UserManagementClient, {
  type UserManagementUser,
} from './UserManagementClient';
import { prisma } from '@/lib/prisma';

type UserManagementPageProps = {
  searchParams?: Promise<{
    newUser?: string | string[] | undefined;
  }>;
};

const getNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || 'User';
  const spacedName = localPart.replace(/[._-]+/g, ' ').trim();

  if (!spacedName) {
    return 'User';
  }

  return spacedName.replace(/\b\w/g, (character) => character.toUpperCase());
};

export default async function UserManagementPage({ searchParams }: UserManagementPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const newUserParam = resolvedSearchParams.newUser;
  const initialOpenCreateModal = Array.isArray(newUserParam)
    ? newUserParam.includes('1')
    : newUserParam === '1';

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      _count: {
        select: {
          fridgeItems: true,
          logs: true,
          bookmarks: true,
          histories: true,
          mealPlans: true,
        },
      },
      bookmarks: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          createdAt: true,
          recipe: {
            select: {
              name: true,
            },
          },
        },
      },
      histories: {
        orderBy: { viewedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          viewedAt: true,
          recipe: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const mappedUsers: UserManagementUser[] = users.map((user) => ({
    id: user.id,
    name: user.name ?? getNameFromEmail(user.email),
    email: user.email,
    registerDate: user.createdAt?.toISOString() ?? '-',
    fridgeItems: user._count.fridgeItems,
    mealPlans: user._count.mealPlans,
    bookmarks: user._count.bookmarks,
    histories: user._count.histories,
    logs: user._count.logs,
    role: user.role === 'ADMIN' ? 'admin' : 'user',
    status: user.status.toLowerCase() as UserManagementUser['status'],
    avatar: null,
    bio: '',
    viewedRecipes: user.histories.map((history) => ({
      id: history.id,
      recipeName: history.recipe?.name ?? 'Recipe',
      viewedDate: history.viewedAt?.toISOString() ?? '-',
      category: 'Recipe',
    })),
    bookmarkedRecipes: user.bookmarks.map((bookmark) => ({
      id: bookmark.id,
      recipeName: bookmark.recipe?.name ?? 'Recipe',
      savedDate: bookmark.createdAt?.toISOString() ?? '-',
      category: 'Recipe',
    })),
  }));

  return (
    <UserManagementClient
      users={mappedUsers}
      initialOpenCreateModal={initialOpenCreateModal}
    />
  );
}
