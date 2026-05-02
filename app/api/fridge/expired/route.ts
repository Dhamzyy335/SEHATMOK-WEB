import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export async function DELETE() {
  try {
    const userId = await requireUserId();

    const result = await prisma.fridgeItem.deleteMany({
      where: {
        userId,
        expiryDate: {
          not: null,
          lt: getTodayStart(),
        },
      },
    });

    return NextResponse.json({ deletedCount: result.count });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to delete expired fridge items.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
