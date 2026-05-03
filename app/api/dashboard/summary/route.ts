import { LogType } from "@prisma/client";
import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import {
  DEFAULT_TARGET_CALORIES,
  calculateMacroTargets,
  calculateNutritionTargets,
} from "@/lib/nutrition";
import { prisma } from "@/lib/prisma";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
};

const getExpiryLabel = (expiryDate: Date, todayStart: Date) => {
  const expiryStart = new Date(expiryDate);
  expiryStart.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.round(
    (expiryStart.getTime() - todayStart.getTime()) / ONE_DAY_MS,
  );

  if (daysUntilExpiry < 0) {
    return "Expired";
  }

  if (daysUntilExpiry === 0) {
    return "Expires today";
  }

  if (daysUntilExpiry === 1) {
    return "Expires tomorrow";
  }

  return `Expires in ${daysUntilExpiry} days`;
};

export async function GET() {
  try {
    const userId = await requireUserId();
    const { start, end } = getTodayRange();
    const nearExpiryEnd = new Date(start);
    nearExpiryEnd.setDate(start.getDate() + 3);

    const [
      user,
      intakeAggregate,
      outtakeAggregate,
      mealPlans,
      nearExpiryFridgeItems,
      fridgeItemCount,
      activeGroceryCount,
    ] = await Promise.all([
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
      prisma.fridgeItem.findMany({
        where: {
          userId,
          expiryDate: {
            not: null,
            lt: nearExpiryEnd,
          },
        },
        orderBy: [{ expiryDate: "asc" }, { createdAt: "desc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          category: true,
          quantity: true,
          unit: true,
          expiryDate: true,
        },
      }),
      prisma.fridgeItem.count({
        where: {
          userId,
        },
      }),
      prisma.groceryItem.count({
        where: {
          userId,
          isDone: false,
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

    const nearExpiryItems = nearExpiryFridgeItems.flatMap((item) => {
      if (!item.expiryDate) {
        return [];
      }

      return [
        {
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          unit: item.unit,
          expiryDate: item.expiryDate.toISOString(),
          expiryLabel: getExpiryLabel(item.expiryDate, start),
        },
      ];
    });

    return NextResponse.json({
      targetCalories,
      totalIntakeToday,
      totalOuttakeToday,
      remainingCalories,
      macroTargets,
      macroCurrent,
      caloriesCurrent,
      nearExpiryItems,
      fridgeItemCount,
      activeGroceryCount,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
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
