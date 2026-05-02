import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  calculateCalorieScore,
  calculateFinalRecommendationScore,
  calculateIngredientScore,
  createRecommendationExplanation,
} from "@/lib/recommendations";

const recommendationRequestSchema = z.object({
  selectedFridgeItemIds: z.array(z.string().trim().min(1)),
  dietaryPreferences: z.string().trim().max(500).optional(),
});

const createFridgeMatchExplanation = (
  matchedCount: number,
  totalRequiredCount: number,
): string => {
  return `Matches ${matchedCount}/${totalRequiredCount} required ingredients from your fridge.`;
};

export async function GET() {
  try {
    const userId = await requireUserId();

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

    const fridgeIngredientNames = fridgeItems.map((item) => item.name);

    const scoredRecipes = recipes
      .map((recipe) => {
        const recipeIngredientNames = recipe.recipeIngredients.map(
          (relation) => relation.ingredient.name,
        );

        const ingredientScoreResult = calculateIngredientScore(
          fridgeIngredientNames,
          recipeIngredientNames,
        );
        const calorieScore = calculateCalorieScore(
          recipe.calories,
          user.targetCalories,
        );
        const finalScore = calculateFinalRecommendationScore(
          ingredientScoreResult.ingredientScore,
          calorieScore,
        );

        return {
          id: recipe.id,
          name: recipe.name,
          imageUrl: recipe.imageUrl,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          matchPercent: ingredientScoreResult.matchPercent,
          ingredientScore: ingredientScoreResult.ingredientScore,
          calorieScore,
          finalScore,
          explanation: createFridgeMatchExplanation(
            ingredientScoreResult.matchedCount,
            ingredientScoreResult.totalRequiredCount,
          ),
        };
      })
      .filter((recipe) => recipe.ingredientScore > 0)
      .sort(
        (a, b) =>
          b.ingredientScore - a.ingredientScore ||
          b.calorieScore - a.calorieScore ||
          a.name.localeCompare(b.name),
      );

    return NextResponse.json({
      targetCalories: user.targetCalories,
      selectedFridgeItems: fridgeItems,
      dietaryPreferences: "",
      recommendations: scoredRecipes.slice(0, 10),
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to fetch fridge-based recommendations.",
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

    if (parsedPayload.data.selectedFridgeItemIds.length === 0) {
      return NextResponse.json(
        {
          message: "selectedFridgeItemIds must contain at least one item.",
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

    const selectedIdSet = new Set(parsedPayload.data.selectedFridgeItemIds);
    const selectedFridgeItems = fridgeItems.filter((item) =>
      selectedIdSet.has(item.id),
    );
    const selectedIngredientNames = selectedFridgeItems.map((item) => item.name);

    const scoredRecipes = recipes
      .map((recipe) => {
        const recipeIngredientNames = recipe.recipeIngredients.map(
          (relation) => relation.ingredient.name,
        );

        const ingredientScoreResult = calculateIngredientScore(
          selectedIngredientNames,
          recipeIngredientNames,
        );
        const calorieScore = calculateCalorieScore(
          recipe.calories,
          user.targetCalories,
        );
        const finalScore = calculateFinalRecommendationScore(
          ingredientScoreResult.ingredientScore,
          calorieScore,
        );

        return {
          id: recipe.id,
          name: recipe.name,
          imageUrl: recipe.imageUrl,
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          matchPercent: ingredientScoreResult.matchPercent,
          ingredientScore: ingredientScoreResult.ingredientScore,
          calorieScore,
          finalScore,
          explanation: createRecommendationExplanation({
            matchedCount: ingredientScoreResult.matchedCount,
            totalRequiredCount: ingredientScoreResult.totalRequiredCount,
            calorieScore,
            recipeCalories: recipe.calories,
            targetCalories: user.targetCalories,
          }),
        };
      })
      .sort(
        (a, b) =>
          b.finalScore - a.finalScore ||
          b.ingredientScore - a.ingredientScore ||
          a.name.localeCompare(b.name),
      );

    return NextResponse.json({
      targetCalories: user.targetCalories,
      selectedFridgeItems,
      dietaryPreferences: parsedPayload.data.dietaryPreferences ?? "",
      recommendations: scoredRecipes.slice(0, 10),
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
