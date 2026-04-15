import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const toStepArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        recipeIngredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      return NextResponse.json({ message: "Recipe not found." }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: "Failed to fetch recipe details.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
