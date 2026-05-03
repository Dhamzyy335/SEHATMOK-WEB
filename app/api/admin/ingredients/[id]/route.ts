import { Prisma, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getInactiveAccountMessage, verifyJwtFromCookies } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeSystemLog } from "@/lib/system-logs";

const nullableFloat = z.union([z.number().min(0), z.null()]).optional();

const ingredientUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(191).optional(),
    calories: nullableFloat,
    protein: nullableFloat,
    carbs: nullableFloat,
    fat: nullableFloat,
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
    const parsedPayload = ingredientUpdateSchema.safeParse(payload);

    if (!parsedPayload.success) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "UPDATE_INGREDIENT",
        targetType: "INGREDIENT",
        targetId: id,
        message: "Failed to update ingredient: invalid payload.",
        status: "FAILED",
      });

      return NextResponse.json(
        {
          message: "Invalid ingredient update payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const existingIngredient = await prisma.ingredient.findUnique({
      where: { id },
      select: { id: true, name: true },
    });

    if (!existingIngredient) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "UPDATE_INGREDIENT",
        targetType: "INGREDIENT",
        targetId: id,
        message: "Failed to update ingredient: ingredient not found.",
        status: "FAILED",
      });

      return NextResponse.json({ message: "Ingredient not found." }, { status: 404 });
    }

    if (parsedPayload.data.name) {
      const ingredientWithSameName = await prisma.ingredient.findUnique({
        where: { name: parsedPayload.data.name },
        select: { id: true },
      });

      if (ingredientWithSameName && ingredientWithSameName.id !== id) {
        await writeSystemLog({
          actorId: authResult.adminUserId,
          action: "UPDATE_INGREDIENT",
          targetType: "INGREDIENT",
          targetId: id,
          targetLabel: existingIngredient.name,
          message: `Failed to update ingredient ${existingIngredient.name}: duplicate name.`,
          status: "FAILED",
        });

        return NextResponse.json(
          { message: "An ingredient with this name already exists." },
          { status: 409 },
        );
      }
    }

    const updatedIngredient = await prisma.ingredient.update({
      where: { id },
      data: {
        name: parsedPayload.data.name,
        caloriesPer100: parsedPayload.data.calories,
        proteinPer100: parsedPayload.data.protein,
        carbsPer100: parsedPayload.data.carbs,
        fatPer100: parsedPayload.data.fat,
      },
      select: adminIngredientSelect,
    });

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action: "UPDATE_INGREDIENT",
      targetType: "INGREDIENT",
      targetId: updatedIngredient.id,
      targetLabel: updatedIngredient.name,
      message: `Updated ingredient ${updatedIngredient.name}.`,
      status: "SUCCESS",
    });

    return NextResponse.json(mapAdminIngredient(updatedIngredient));
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
        message: "Failed to update ingredient.",
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

    const existingIngredient = await prisma.ingredient.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            recipeRelations: true,
          },
        },
      },
    });

    if (!existingIngredient) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "DELETE_INGREDIENT",
        targetType: "INGREDIENT",
        targetId: id,
        message: "Failed to delete ingredient: ingredient not found.",
        status: "FAILED",
      });

      return NextResponse.json({ message: "Ingredient not found." }, { status: 404 });
    }

    if (existingIngredient._count.recipeRelations > 0) {
      await writeSystemLog({
        actorId: authResult.adminUserId,
        action: "DELETE_INGREDIENT",
        targetType: "INGREDIENT",
        targetId: existingIngredient.id,
        targetLabel: existingIngredient.name,
        message: `Failed to delete ingredient ${existingIngredient.name}: ingredient is used by recipes.`,
        status: "FAILED",
        metadata: {
          recipeRelations: existingIngredient._count.recipeRelations,
        },
      });

      return NextResponse.json(
        {
          message:
            "This ingredient is used by recipes and cannot be deleted without breaking recipe data.",
        },
        { status: 409 },
      );
    }

    await prisma.ingredient.delete({
      where: { id },
    });

    await writeSystemLog({
      actorId: authResult.adminUserId,
      action: "DELETE_INGREDIENT",
      targetType: "INGREDIENT",
      targetId: existingIngredient.id,
      targetLabel: existingIngredient.name,
      message: `Deleted ingredient ${existingIngredient.name}.`,
      status: "SUCCESS",
    });

    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to delete ingredient.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
