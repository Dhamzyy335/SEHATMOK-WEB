import { LogType } from "@prisma/client";
import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import {
  DEFAULT_TARGET_CALORIES,
  calculateMacroTargets,
  calculateNutritionTargets,
} from "@/lib/nutrition";
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

    const [user, intakeAggregate, outtakeAggregate, mealPlans] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          targetCalories: true,
          age: true,
          weight: true,
          height: true,
          activityLevel: true,
        },
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
      prisma.mealPlan.findMany({
        where: {
          userId,
          date: { gte: start, lt: end },
        },
        select: {
          recipe: {
            select: {
              calories: true,
              protein: true,
              carbs: true,
              fat: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const { tdee } = calculateNutritionTargets({
      age: user.age,
      weight: user.weight,
      height: user.height,
      activityLevel: user.activityLevel,
    });

    const derivedCalories =
      user.targetCalories ?? (tdee === null ? null : Math.round(tdee));
    const targetCalories =
      derivedCalories && derivedCalories > 0
        ? derivedCalories
        : DEFAULT_TARGET_CALORIES;
    const totalIntakeToday = intakeAggregate._sum.calories ?? 0;
    const totalOuttakeToday = outtakeAggregate._sum.calories ?? 0;
    const remainingCalories =
      targetCalories - totalIntakeToday + totalOuttakeToday;

    const macroTargets = calculateMacroTargets(targetCalories);

    const macroCurrent = mealPlans.reduce(
      (totals, item) => {
        const recipe = item.recipe;
        return {
          proteinG: totals.proteinG + (recipe?.protein ?? 0),
          carbsG: totals.carbsG + (recipe?.carbs ?? 0),
          fatsG: totals.fatsG + (recipe?.fat ?? 0),
        };
      },
      { proteinG: 0, carbsG: 0, fatsG: 0 },
    );

    const caloriesCurrent = mealPlans.reduce(
      (total, item) => total + (item.recipe?.calories ?? 0),
      0,
    );

    return NextResponse.json({
      targetCalories,
      totalIntakeToday,
      totalOuttakeToday,
      remainingCalories,
      macroTargets,
      macroCurrent,
      caloriesCurrent,
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
