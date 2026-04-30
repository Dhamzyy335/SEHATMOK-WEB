import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RecipeSummary = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
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
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim() ?? "";
    const category = normalizeCategory(url.searchParams.get("category"));
    const categoryKeywords = category ? categoryKeywordMap[category] : undefined;

    const recipes = await prisma.recipe.findMany({
      where: query
        ? {
            name: {
              contains: query,
              mode: "insensitive",
            },
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
    });

    const filteredRecipes = categoryKeywords
      ? recipes.filter((recipe) =>
          matchesCategory(
            recipe.recipeIngredients.map((relation) => relation.ingredient.name),
            categoryKeywords,
          ),
        )
      : recipes;

    const response: RecipeSummary[] = filteredRecipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      imageUrl: recipe.imageUrl ?? "",
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
    }));

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch recipes.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
