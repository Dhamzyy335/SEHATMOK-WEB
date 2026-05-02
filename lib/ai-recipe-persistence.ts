import "server-only";

import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import type { RecipePayload } from "@/lib/ai-recipe-schema";
import { prisma } from "@/lib/prisma";
import { normalizeName } from "@/lib/recommendations";

type IngredientInput = {
  name: string;
  quantity: number;
  unit: string;
};

type SaveAiRecipeResult = {
  recipeId: string;
  reused: boolean;
};

const roundNullableNumber = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 10) / 10;
};

const dedupeIngredients = (ingredients: IngredientInput[]): IngredientInput[] => {
  const uniqueMap = new Map<string, IngredientInput>();

  ingredients.forEach((ingredient) => {
    const normalizedName = normalizeName(ingredient.name);
    if (!normalizedName || uniqueMap.has(normalizedName)) {
      return;
    }

    uniqueMap.set(normalizedName, {
      name: ingredient.name.trim(),
      quantity: ingredient.quantity,
      unit: ingredient.unit.trim(),
    });
  });

  return Array.from(uniqueMap.values());
};

const createIngredientSignature = (ingredientNames: string[]): string => {
  return Array.from(
    new Set(
      ingredientNames
        .map((name) => normalizeName(name))
        .filter((name) => name.length > 0),
    ),
  )
    .sort()
    .join("|");
};

const createRecipeFingerprint = (
  recipePayload: RecipePayload,
  ingredientInputs: IngredientInput[],
): string => {
  const fingerprintPayload = {
    name: normalizeName(recipePayload.name),
    ingredients: createIngredientSignature(
      ingredientInputs.map((ingredient) => ingredient.name),
    ),
    calories: Math.round(recipePayload.nutrition.calories),
    protein: roundNullableNumber(recipePayload.nutrition.protein),
    carbs: roundNullableNumber(recipePayload.nutrition.carbs),
    fat: roundNullableNumber(recipePayload.nutrition.fat),
  };

  return createHash("sha256")
    .update(JSON.stringify(fingerprintPayload))
    .digest("hex");
};

const createDeterministicRecipeId = (fingerprint: string): string => {
  return `ai_${fingerprint.slice(0, 32)}`;
};

const findExistingRecipeBySignature = async (
  recipePayload: RecipePayload,
  ingredientInputs: IngredientInput[],
): Promise<string | null> => {
  const targetName = normalizeName(recipePayload.name);
  const targetIngredientSignature = createIngredientSignature(
    ingredientInputs.map((ingredient) => ingredient.name),
  );

  if (!targetName || !targetIngredientSignature) {
    return null;
  }

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      recipeIngredients: {
        select: {
          ingredient: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const duplicate = recipes.find((recipe) => {
    const recipeName = normalizeName(recipe.name);
    const ingredientSignature = createIngredientSignature(
      recipe.recipeIngredients.map((relation) => relation.ingredient.name),
    );

    return (
      recipeName === targetName &&
      ingredientSignature === targetIngredientSignature
    );
  });

  return duplicate?.id ?? null;
};

const isUniqueConstraintError = (error: unknown): boolean => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

export const saveOrReuseAiRecipe = async (
  recipePayload: RecipePayload,
): Promise<SaveAiRecipeResult> => {
  const ingredientInputs = dedupeIngredients(
    recipePayload.ingredients.map((ingredient) => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
    })),
  );

  const existingRecipeId = await findExistingRecipeBySignature(
    recipePayload,
    ingredientInputs,
  );

  if (existingRecipeId) {
    return { recipeId: existingRecipeId, reused: true };
  }

  const fingerprint = createRecipeFingerprint(recipePayload, ingredientInputs);
  const deterministicRecipeId = createDeterministicRecipeId(fingerprint);

  const existingDeterministicRecipe = await prisma.recipe.findUnique({
    where: { id: deterministicRecipeId },
    select: { id: true },
  });

  if (existingDeterministicRecipe) {
    return { recipeId: existingDeterministicRecipe.id, reused: true };
  }

  try {
    const createdRecipe = await prisma.$transaction(async (tx) => {
      const recipe = await tx.recipe.create({
        data: {
          id: deterministicRecipeId,
          name: recipePayload.name,
          description: recipePayload.description,
          steps: recipePayload.steps,
          calories: Math.round(recipePayload.nutrition.calories),
          protein: recipePayload.nutrition.protein,
          carbs: recipePayload.nutrition.carbs,
          fat: recipePayload.nutrition.fat,
          fiber: recipePayload.nutrition.fiber,
        },
        select: { id: true },
      });

      const ingredientRecords = await Promise.all(
        ingredientInputs.map((ingredient) =>
          tx.ingredient.upsert({
            where: { name: ingredient.name },
            update: {},
            create: { name: ingredient.name },
            select: { id: true },
          }),
        ),
      );

      if (ingredientRecords.length > 0) {
        await tx.recipeIngredient.createMany({
          data: ingredientRecords.map((ingredient, index) => ({
            recipeId: recipe.id,
            ingredientId: ingredient.id,
            quantity: ingredientInputs[index].quantity,
            unit: ingredientInputs[index].unit,
          })),
        });
      }

      return recipe;
    });

    return { recipeId: createdRecipe.id, reused: false };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id: deterministicRecipeId },
      select: { id: true },
    });

    if (!existingRecipe) {
      throw error;
    }

    return { recipeId: existingRecipe.id, reused: true };
  }
};
