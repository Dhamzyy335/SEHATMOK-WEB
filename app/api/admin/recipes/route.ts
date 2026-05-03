import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInactiveAccountMessage, verifyJwtFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const nullableTrimmedString = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

const nullableFloat = z
  .union([z.number().min(0), z.null()])
  .optional();

const recipeCreateSchema = z.object({
  name: z.string().trim().min(1).max(191),
  description: nullableTrimmedString(2000),
  steps: z.array(z.string().trim().min(1).max(1000)).min(1),
  calories: z.union([z.number().int().min(0), z.null()]).optional(),
  protein: nullableFloat,
  carbs: nullableFloat,
  fat: nullableFloat,
  isRecommended: z.boolean().optional(),
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

const toStepArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

const adminRecipeSelect = {
  id: true,
  name: true,
  description: true,
  steps: true,
  imageUrl: true,
  calories: true,
  protein: true,
  carbs: true,
  fat: true,
  isRecommended: true,
  recipeIngredients: {
    select: {
      ingredient: {
        select: {
          name: true,
        },
      },
    },
  },
  _count: {
    select: {
      recipeIngredients: true,
      bookmarks: true,
      histories: true,
      mealPlans: true,
    },
  },
} as const;

const mapAdminRecipe = (recipe: {
  id: string;
  name: string;
  description: string | null;
  steps: unknown;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  isRecommended: boolean;
  recipeIngredients: Array<{ ingredient: { name: string } }>;
  _count: {
    recipeIngredients: number;
    bookmarks: number;
    histories: number;
    mealPlans: number;
  };
}) => ({
  id: recipe.id,
  name: recipe.name,
  description: recipe.description,
  steps: toStepArray(recipe.steps),
  createdBy: {
    id: "system",
    name: "SehatMok",
  },
  source: "System",
  ingredients: recipe.recipeIngredients
    .map((relation) => relation.ingredient.name)
    .sort((firstName, secondName) => firstName.localeCompare(secondName)),
  ingredientCount: recipe._count.recipeIngredients,
  bookmarkCount: recipe._count.bookmarks,
  historyCount: recipe._count.histories,
  mealPlanCount: recipe._count.mealPlans,
  calories: recipe.calories,
  protein: recipe.protein,
  carbs: recipe.carbs,
  fat: recipe.fat,
  isRecommended: recipe.isRecommended,
  matchPercentage: null,
  createdDate: "-",
  image: recipe.imageUrl,
});

export async function POST(request: Request) {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const payload = await request.json().catch(() => ({}));
    const parsedPayload = recipeCreateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid recipe create payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const createdRecipe = await prisma.recipe.create({
      data: {
        name: parsedPayload.data.name,
        description: parsedPayload.data.description,
        steps: parsedPayload.data.steps,
        calories: parsedPayload.data.calories,
        protein: parsedPayload.data.protein,
        carbs: parsedPayload.data.carbs,
        fat: parsedPayload.data.fat,
        isRecommended: parsedPayload.data.isRecommended,
      },
      select: adminRecipeSelect,
    });

    return NextResponse.json(mapAdminRecipe(createdRecipe), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to create recipe.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
