import AiRecipeLogsClient, {
  type AiRecipeLogEntry,
  type AiRecipeLogsStats,
} from './AiRecipeLogsClient';
import { prisma } from '@/lib/prisma';

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string');
};

const getNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0] || 'User';
  const spacedName = localPart.replace(/[._-]+/g, ' ').trim();

  if (!spacedName) {
    return 'User';
  }

  return spacedName.replace(/\b\w/g, (character) => character.toUpperCase());
};

export default async function AiRecipeLogsPage() {
  const [logs, totalGenerations, successfulGenerations, latencyStats] =
    await Promise.all([
      prisma.aiRecipeLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          inputIngredients: true,
          outputRecipeTitle: true,
          status: true,
          errorMessage: true,
          latencyMs: true,
          createdAt: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      }),
      prisma.aiRecipeLog.count(),
      prisma.aiRecipeLog.count({
        where: { status: 'SUCCESS' },
      }),
      prisma.aiRecipeLog.aggregate({
        where: {
          latencyMs: {
            not: null,
          },
        },
        _avg: {
          latencyMs: true,
        },
      }),
    ]);

  const mappedLogs: AiRecipeLogEntry[] = logs.map((log) => ({
    id: log.id,
    userName: log.user.name ?? getNameFromEmail(log.user.email),
    userEmail: log.user.email,
    inputIngredients: toStringArray(log.inputIngredients),
    outputRecipe: log.outputRecipeTitle,
    status: log.status,
    generationTime: log.createdAt.toISOString(),
    errorMessage: log.errorMessage,
    latencyMs: log.latencyMs,
  }));

  const stats: AiRecipeLogsStats = {
    totalGenerations,
    successRate:
      totalGenerations > 0
        ? Math.round((successfulGenerations / totalGenerations) * 1000) / 10
        : 0,
    averageLatencyMs:
      latencyStats._avg.latencyMs === null
        ? null
        : Math.round(latencyStats._avg.latencyMs),
  };

  return <AiRecipeLogsClient logs={mappedLogs} stats={stats} />;
}
