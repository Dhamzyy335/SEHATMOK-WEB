import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { verifyJwtFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const requireAdminUserId = async (): Promise<string> => {
  const userId = await verifyJwtFromCookies();

  if (!userId) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      status: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.status !== "ACTIVE") {
    redirect("/login");
  }

  if (user.role !== UserRole.ADMIN) {
    redirect("/");
  }

  return user.id;
};
