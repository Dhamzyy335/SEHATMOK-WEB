import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInactiveAccountMessage, verifyJwtFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const nullableFloat = z.union([z.number().min(0), z.null()]).optional();

const ingredientCreateSchema = z.object({
  name: z.string().trim().min(1).max(191),
  calories: nullableFloat,
  protein: nullableFloat,
  carbs: nullableFloat,
  fat: nullableFloat,
});

const getAdminUserId = async () => {
  const userId = await verifyJwtFromCookies();

  if (!userId) {
    return {
      response: NextResponse.json({ message: "Unauthorized." }, { status: 401 }),
    };
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
    return {
      response: NextResponse.json({ message: "Unauthorized." }, { status: 401 }),
    };
  }

  if (user.status !== "ACTIVE") {
    return {
      response: NextResponse.json(
        { message: getInactiveAccountMessage(user.status) },
        { status: 403 },
      ),
    };
  }

  if (user.role !== UserRole.ADMIN) {
    return {
      response: NextResponse.json({ message: "Forbidden." }, { status: 403 }),
    };
  }

  return { adminUserId: user.id };
};

const adminIngredientSelect = {
  id: true,
  name: true,
  caloriesPer100: true,
  proteinPer100: true,
  carbsPer100: true,
  fatPer100: true,
  _count: {
    select: {
      recipeRelations: true,
    },
  },
} as const;

const mapAdminIngredient = (ingredient: {
  id: string;
  name: string;
  caloriesPer100: number | null;
  proteinPer100: number | null;
  carbsPer100: number | null;
  fatPer100: number | null;
  _count: {
    recipeRelations: number;
  };
}) => ({
  id: ingredient.id,
  name: ingredient.name,
  calories: ingredient.caloriesPer100,
  protein: ingredient.proteinPer100,
  carbs: ingredient.carbsPer100,
  fat: ingredient.fatPer100,
  recipeCount: ingredient._count.recipeRelations,
});

export async function POST(request: Request) {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const payload = await request.json().catch(() => ({}));
    const parsedPayload = ingredientCreateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid ingredient create payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const existingIngredient = await prisma.ingredient.findUnique({
      where: { name: parsedPayload.data.name },
      select: { id: true },
    });

    if (existingIngredient) {
      return NextResponse.json(
        { message: "An ingredient with this name already exists." },
        { status: 409 },
      );
    }

    const createdIngredient = await prisma.ingredient.create({
      data: {
        name: parsedPayload.data.name,
        caloriesPer100: parsedPayload.data.calories,
        proteinPer100: parsedPayload.data.protein,
        carbsPer100: parsedPayload.data.carbs,
        fatPer100: parsedPayload.data.fat,
      },
      select: adminIngredientSelect,
    });

    return NextResponse.json(mapAdminIngredient(createdIngredient), { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { message: "An ingredient with this name already exists." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        message: "Failed to create ingredient.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
