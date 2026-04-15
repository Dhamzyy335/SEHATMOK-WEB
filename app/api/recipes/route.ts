import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const toStepArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

export async function GET() {
  try {
    const recipes = await prisma.recipe.findMany({
      include: {
        recipeIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
    });

    const response = recipes.map((recipe) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      steps: toStepArray(recipe.steps),
      imageUrl: recipe.imageUrl,
      calories: recipe.calories,
      protein: recipe.protein,
      carbs: recipe.carbs,
      fat: recipe.fat,
      fiber: recipe.fiber,
      ingredients: recipe.recipeIngredients.map((relation) => ({
        id: relation.ingredient.id,
        name: relation.ingredient.name,
        quantity: relation.quantity,
        unit: relation.unit,
      })),
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
