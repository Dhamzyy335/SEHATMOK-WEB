import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateCalorieCloseness,
  calculateFinalRecommendationScore,
  calculateIngredientOverlap,
  createRecommendationExplanation,
  normalizeIngredientName,
} from "@/lib/recommendations";

const recommendationRequestSchema = z.object({
  selectedFridgeItemIds: z.array(z.string().trim().min(1)).optional(),
  dietaryPreferences: z.string().trim().max(500).optional().default(""),
  limit: z.coerce.number().int().min(5).max(10).optional(),
});

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = recommendationRequestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid recommendations payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const [user, fridgeItems, recipes] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { targetCalories: true },
      }),
      prisma.fridgeItem.findMany({
        where: { userId },
        select: { id: true, name: true, category: true },
      }),
      prisma.recipe.findMany({
        include: {
          recipeIngredients: {
            include: {
              ingredient: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    const selectedIdSet =
      parsedPayload.data.selectedFridgeItemIds &&
      parsedPayload.data.selectedFridgeItemIds.length > 0
        ? new Set(parsedPayload.data.selectedFridgeItemIds)
        : null;

    const selectedFridgeItems =
      selectedIdSet === null
        ? fridgeItems
        : fridgeItems.filter((item) => selectedIdSet.has(item.id));

    const effectiveFridgeItems =
      selectedFridgeItems.length > 0 ? selectedFridgeItems : fridgeItems;

    const availableIngredients = new Set(
      effectiveFridgeItems.map((item) => normalizeIngredientName(item.name)),
    );

    const scoredRecipes = recipes
      .map((recipe) => {
        const recipeIngredientNames = recipe.recipeIngredients.map(
          (relation) => relation.ingredient.name,
        );

        const overlap = calculateIngredientOverlap(
          availableIngredients,
          recipeIngredientNames,
        );
        const calorieScore = calculateCalorieCloseness(
          recipe.calories,
          user.targetCalories,
        );
        const finalScore = calculateFinalRecommendationScore(
          overlap.score,
          calorieScore,
        );
        const matchPercent = Math.round(finalScore * 100);

        return {
          id: recipe.id,
          name: recipe.name,
          description: recipe.description,
          imageUrl: recipe.imageUrl,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber,
          ingredientScore: overlap.score,
          calorieScore,
          score: finalScore,
          finalScore,
          matchPercent,
          explanation: createRecommendationExplanation({
            overlapCount: overlap.overlapCount,
            totalIngredients: overlap.totalIngredients,
            calorieScore,
            recipeCalories: recipe.calories,
            targetCalories: user.targetCalories,
            dietaryPreferences: parsedPayload.data.dietaryPreferences ?? "",
          }),
          ingredients: recipe.recipeIngredients.map((relation) => ({
            id: relation.ingredient.id,
            name: relation.ingredient.name,
            quantity: relation.quantity,
            unit: relation.unit,
          })),
        };
      })
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.ingredientScore - a.ingredientScore ||
          a.name.localeCompare(b.name),
      );

    const limit = parsedPayload.data.limit ?? 5;

    return NextResponse.json({
      targetCalories: user.targetCalories,
      selectedFridgeItems: effectiveFridgeItems,
      dietaryPreferences: parsedPayload.data.dietaryPreferences ?? "",
      recommendations: scoredRecipes.slice(0, limit),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to generate recommendations.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
