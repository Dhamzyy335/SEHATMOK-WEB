import { NextRequest, NextResponse } from "next/server";
import { MealSlot } from "@prisma/client";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type MealPlanItem = {
  id: string;
  slot: MealSlot;
  recipe: {
    id: string;
    name: string;
    imageUrl: string | null;
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
    description: string | null;
  } | null;
};

const mealSlotSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") {
      return value.trim().toUpperCase();
    }

    return value;
  },
  z.nativeEnum(MealSlot),
);

const createMealPlanSchema = z.object({
  date: z.string().trim().min(1),
  slot: mealSlotSchema,
  recipeId: z.string().trim().min(1),
});

const deleteMealPlanSchema = z.object({
  date: z.string().trim().min(1),
  slot: mealSlotSchema,
});

const parseDateRange = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const start = new Date(`${value}T00:00:00`);
  if (Number.isNaN(start.getTime())) {
    return null;
  }

  const end = new Date(start);
  end.setDate(start.getDate() + 1);

  return { start, end };
};

export async function GET(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const dateParam = request.nextUrl.searchParams.get("date");

    if (!dateParam) {
      return NextResponse.json({ message: "Date is required." }, { status: 400 });
    }

    const range = parseDateRange(dateParam);
    if (!range) {
      return NextResponse.json({ message: "Invalid date format." }, { status: 400 });
    }

    const items = await prisma.mealPlan.findMany({
      where: {
        userId,
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
      select: {
        id: true,
        slot: true,
        recipe: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            description: true,
          },
        },
      },
    });

    const responseItems = items.map((item): MealPlanItem => ({
      id: item.id,
      slot: item.slot,
      recipe: item.recipe,
    }));

    return NextResponse.json({
      date: dateParam,
      items: responseItems,
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
        message: "Failed to fetch meal plans.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = createMealPlanSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid meal plan payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const range = parseDateRange(parsedPayload.data.date);
    if (!range) {
      return NextResponse.json({ message: "Invalid date format." }, { status: 400 });
    }

    const { slot, recipeId } = parsedPayload.data;

    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true },
    });

    if (!recipe) {
      return NextResponse.json({ message: "Recipe not found." }, { status: 404 });
    }

    const item = await prisma.mealPlan.upsert({
      where: {
        userId_date_slot: {
          userId,
          date: range.start,
          slot,
        },
      },
      update: {
        recipeId,
      },
      create: {
        userId,
        date: range.start,
        slot,
        recipeId,
      },
      select: {
        id: true,
        slot: true,
        recipe: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            description: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: item.id,
      slot: item.slot,
      recipe: item.recipe,
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
        message: "Failed to create meal plan item.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = deleteMealPlanSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid meal plan delete payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const range = parseDateRange(parsedPayload.data.date);
    if (!range) {
      return NextResponse.json({ message: "Invalid date format." }, { status: 400 });
    }

    const result = await prisma.mealPlan.deleteMany({
      where: {
        userId,
        slot: parsedPayload.data.slot,
        date: {
          gte: range.start,
          lt: range.end,
        },
      },
    });

    if (result.count === 0) {
      return NextResponse.json({ message: "Meal plan slot not found." }, { status: 404 });
    }

    return NextResponse.json({
      date: parsedPayload.data.date,
      slot: parsedPayload.data.slot,
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
        message: "Failed to delete meal plan slot.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
