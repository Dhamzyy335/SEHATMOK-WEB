import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type SystemLogStatus = "SUCCESS" | "FAILED";

type WriteSystemLogInput = {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  message: string;
  status?: SystemLogStatus;
  metadata?: Prisma.InputJsonValue;
};

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? value.slice(0, maxLength) : value;

export const writeSystemLog = async ({
  actorId,
  action,
  targetType,
  targetId,
  targetLabel,
  message,
  status = "SUCCESS",
  metadata,
}: WriteSystemLogInput) => {
  try {
    const actor = actorId
      ? await prisma.user.findUnique({
          where: { id: actorId },
          select: {
            email: true,
            name: true,
          },
        })
      : null;

    await prisma.systemLog.create({
      data: {
        actorId: actorId ?? null,
        actorEmail: actor?.email ? truncate(actor.email, 191) : null,
        actorName: actor?.name ? truncate(actor.name, 191) : null,
        action: truncate(action, 100),
        targetType: targetType ? truncate(targetType, 100) : null,
        targetId: targetId ? truncate(targetId, 191) : null,
        targetLabel: targetLabel ? truncate(targetLabel, 300) : null,
        message: truncate(message, 1000),
        status,
        metadata,
      },
    });
  } catch (error) {
    console.error("Failed to write system log:", error);
  }
};
