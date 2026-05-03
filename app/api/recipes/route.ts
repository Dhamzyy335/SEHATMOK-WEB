import { NextResponse } from "next/server";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateIngredientAvailability } from "@/lib/recommendations";

type RecipeSummary = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  matchedIngredientCount: number;
  totalRequiredIngredientCount: number;
  ingredientAvailabilityPercent: number;
  missingIngredients: string[];
};

const categoryKeywordMap: Record<string, string[]> = {
  vegetables: [
    "carrot",
    "spinach",
    "broccoli",
    "kale",
    "lettuce",
    "pepper",
    "tomato",
    "cucumber",
    "onion",
    "garlic",
    "zucchini",
    "mushroom",
  ],
  fruits: [
    "apple",
    "banana",
    "avocado",
    "berry",
    "strawberry",
    "blueberry",
    "orange",
    "lemon",
    "lime",
    "mango",
    "pineapple",
    "grape",
    "peach",
    "pear",
  ],
  proteins: [
    "chicken",
    "beef",
    "pork",
    "fish",
    "salmon",
    "tuna",
    "egg",
    "tofu",
    "tempeh",
    "turkey",
    "shrimp",
    "lentil",
    "bean",
    "chickpea",
  ],
  dairy: ["milk", "cheese", "yogurt", "butter", "cream", "parmesan", "mozzarella"],
  grains: [
    "rice",
    "pasta",
    "bread",
    "oat",
    "quinoa",
    "barley",
    "noodle",
    "couscous",
    "tortilla",
  ],
  nuts: [
    "almond",
    "walnut",
    "cashew",
    "peanut",
    "pistachio",
    "hazelnut",
    "pecan",
  ],
};

const normalizeCategory = (value: string | null): string | null => {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "all") {
    return null;
  }

  return normalized;
};

const matchesCategory = (ingredientNames: string[], keywords: string[]): boolean => {
  if (keywords.length === 0) {
    return true;
  }

  const normalizedIngredients = ingredientNames.map((name) => name.toLowerCase());
  return normalizedIngredients.some((name) =>
    keywords.some((keyword) => name.includes(keyword)),
  );
};

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const searchQuery = query ? query : null;
    const category = normalizeCategory(url.searchParams.get("category"));
    const categoryKeywords = category ? categoryKeywordMap[category] : undefined;

    const [recipes, fridgeItems] = await Promise.all([
      prisma.recipe.findMany({
        where: searchQuery
          ? {
              OR: [
                {
                  name: {
                    contains: searchQuery,
                  },
                },
                {
                  description: {
                    contains: searchQuery,
                  },
                },
              ],
            }
          : undefined,
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
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
        orderBy: [{ name: "asc" }],
      }),
      prisma.fridgeItem.findMany({
        where: { userId },
        select: { name: true },
      }),
    ]);
    const availableIngredientNames = fridgeItems.map((item) => item.name);

    const filteredRecipes = categoryKeywords
      ? recipes.filter((recipe) =>
          matchesCategory(
            recipe.recipeIngredients.map((relation) => relation.ingredient.name),
            categoryKeywords,
          ),
        )
      : recipes;

    const response: RecipeSummary[] = filteredRecipes.map((recipe) => {
      const requiredIngredientNames = recipe.recipeIngredients.map(
        (relation) => relation.ingredient.name,
      );
      const availability = calculateIngredientAvailability(
        availableIngredientNames,
        requiredIngredientNames,
      );

      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        imageUrl: recipe.imageUrl ?? "",
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        matchedIngredientCount: availability.matchedIngredientCount,
        totalRequiredIngredientCount: availability.totalRequiredIngredientCount,
        ingredientAvailabilityPercent: availability.ingredientMatchPercent,
        missingIngredients: availability.missingIngredients,
      };
    });

    return NextResponse.json(response);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to fetch recipes.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
