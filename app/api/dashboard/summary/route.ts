import { LogType } from "@prisma/client";
import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

export async function GET() {
  try {
    const userId = await requireUserId();
    const { start, end } = getTodayRange();

    const [user, intakeAggregate, outtakeAggregate] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { targetCalories: true },
      }),
      prisma.userLog.aggregate({
        _sum: { calories: true },
        where: {
          userId,
          type: LogType.INTAKE,
          createdAt: { gte: start, lt: end },
        },
      }),
      prisma.userLog.aggregate({
        _sum: { calories: true },
        where: {
          userId,
          type: LogType.OUTTAKE,
          createdAt: { gte: start, lt: end },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const targetCalories = user.targetCalories ?? 0;
    const totalIntakeToday = intakeAggregate._sum.calories ?? 0;
    const totalOuttakeToday = outtakeAggregate._sum.calories ?? 0;
    const remainingCalories =
      targetCalories - totalIntakeToday + totalOuttakeToday;

    return NextResponse.json({
      targetCalories,
      totalIntakeToday,
      totalOuttakeToday,
      remainingCalories,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to fetch dashboard summary.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
