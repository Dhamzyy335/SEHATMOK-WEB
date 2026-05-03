import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInactiveAccountMessage, verifyJwtFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeSystemLog } from "@/lib/system-logs";

const nullableTrimmedString = (maxLength: number) =>
  z
    .union([z.string().trim().max(maxLength), z.null()])
    .optional()
    .transform((value) => (value === "" ? null : value));

const nullableFloat = z
  .union([z.number().min(0), z.null()])
  .optional();

const recipeUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(191).optional(),
    description: nullableTrimmedString(2000),
    steps: z.array(z.string().trim().min(1).max(1000)).optional(),
    calories: z
      .union([z.number().int().min(0), z.null()])
      .optional(),
    protein: nullableFloat,
    carbs: nullableFloat,
    fat: nullableFloat,
    isRecommended: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update.",
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

const getRecipeAction = (data: z.infer<typeof recipeUpdateSchema>) => {
  const updateKeys = Object.entries(data)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key);

  if (updateKeys.length === 1 && updateKeys[0] === "isRecommended") {
    return data.isRecommended ? "RECOMMEND_RECIPE" : "UNRECOMMEND_RECIPE";
  }

  return "UPDATE_RECIPE";
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = recipeUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "UPDATE_RECIPE",
        targetType: "RECIPE",
        targetId: id,
        message: "Failed to update recipe: invalid payload.",
        status: "FAILED",
      });

      return NextResponse.json(
        {
          message: "Invalid recipe update payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingRecipe) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "UPDATE_RECIPE",
        targetType: "RECIPE",
        targetId: id,
        message: "Failed to update recipe: recipe not found.",
        status: "FAILED",
      });

      return NextResponse.json({ message: "Recipe not found." }, { status: 404 });
    }

    const action = getRecipeAction(parsedPayload.data);
    const updatedRecipe = await prisma.recipe.update({
      where: { id },
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

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action,
      targetType: "RECIPE",
      targetId: updatedRecipe.id,
      targetLabel: updatedRecipe.name,
      message:
        action === "RECOMMEND_RECIPE"
          ? `Recommended recipe ${updatedRecipe.name}.`
          : action === "UNRECOMMEND_RECIPE"
            ? `Unrecommended recipe ${updatedRecipe.name}.`
            : `Updated recipe ${updatedRecipe.name}.`,
      status: "SUCCESS",
    });

    return NextResponse.json(mapAdminRecipe(updatedRecipe));
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to update recipe.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await getAdminUserId();
    if (authResult.response) {
      return authResult.response;
    }

    const { id } = await params;

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingRecipe) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "DELETE_RECIPE",
        targetType: "RECIPE",
        targetId: id,
        message: "Failed to delete recipe: recipe not found.",
        status: "FAILED",
      });

      return NextResponse.json({ message: "Recipe not found." }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipeId: id } }),
      prisma.bookmark.deleteMany({ where: { recipeId: id } }),
      prisma.history.deleteMany({ where: { recipeId: id } }),
      prisma.mealPlan.deleteMany({ where: { recipeId: id } }),
      prisma.recipe.delete({ where: { id } }),
    ]);

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action: "DELETE_RECIPE",
      targetType: "RECIPE",
      targetId: existingRecipe.id,
      targetLabel: existingRecipe.name,
      message: `Deleted recipe ${existingRecipe.name}.`,
      status: "SUCCESS",
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to delete recipe.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
