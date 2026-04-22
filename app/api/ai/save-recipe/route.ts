import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { recipeSchema, type RecipePayload } from "@/lib/ai-recipe-schema";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const requestSchema = z.object({
  recipe: recipeSchema,
});

type IngredientInput = {
  name: string;
  quantity: number;
  unit: string;
};

const dedupeIngredients = (ingredients: IngredientInput[]): IngredientInput[] => {
  const uniqueMap = new Map<string, IngredientInput>();

  ingredients.forEach((ingredient) => {
    const key = ingredient.name.trim().toLowerCase();
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, ingredient);
    }
  });

  return Array.from(uniqueMap.values());
};

export async function POST(request: Request) {
  try {
    await requireUserId();
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = requestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid save recipe payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const recipePayload: RecipePayload = parsedPayload.data.recipe;

    const createdRecipe = await prisma.recipe.create({
      data: {
        name: recipePayload.name,
        description: recipePayload.description,
        steps: recipePayload.steps,
        calories: Math.round(recipePayload.nutrition.calories),
        protein: recipePayload.nutrition.protein,
        carbs: recipePayload.nutrition.carbs,
        fat: recipePayload.nutrition.fat,
        fiber: recipePayload.nutrition.fiber,
      },
    });

    const ingredientInputs = dedupeIngredients(
      recipePayload.ingredients.map((ingredient) => ({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit,
      })),
    );

    const ingredientRecords = await prisma.$transaction(
      ingredientInputs.map((ingredient) =>
        prisma.ingredient.upsert({
          where: { name: ingredient.name },
          update: {},
          create: { name: ingredient.name },
        }),
      ),
    );

    if (ingredientRecords.length > 0) {
      await prisma.recipeIngredient.createMany({
        data: ingredientRecords.map((ingredient, index) => ({
          recipeId: createdRecipe.id,
          ingredientId: ingredient.id,
          quantity: ingredientInputs[index].quantity,
          unit: ingredientInputs[index].unit,
        })),
      });
    }

    return NextResponse.json({ recipeId: createdRecipe.id });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to save recipe.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
