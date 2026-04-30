import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RecipeRecord = {
  id: string;
  name: string;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  description: string | null;
};

type RecipeSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  description?: string;
};

const bookmarkPayloadSchema = z.object({
  recipeId: z.string().trim().min(1),
});

export async function GET() {
  try {
    const userId = await requireUserId();

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      select: { recipeId: true },
      orderBy: { createdAt: "desc" },
    });

    const recipeIds = bookmarks.map((bookmark) => bookmark.recipeId);
    const recipes: RecipeRecord[] = recipeIds.length
      ? await prisma.recipe.findMany({
          where: { id: { in: recipeIds } },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            description: true,
          },
        })
      : [];

    const recipeMap = new Map(recipes.map((recipe) => [recipe.id, recipe]));
    const orderedRecipes: RecipeSummary[] = recipeIds
      .map((id) => recipeMap.get(id))
      .filter((recipe): recipe is RecipeRecord => Boolean(recipe))
      .map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        imageUrl: recipe.imageUrl,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        description: recipe.description ?? undefined,
      }));

    return NextResponse.json({
      recipeIds,
      recipes: orderedRecipes,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to fetch bookmarks.",
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
    const parsedPayload = bookmarkPayloadSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid bookmark payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { recipeId } = parsedPayload.data;
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      select: { id: true },
    });

    if (!recipe) {
      return NextResponse.json({ message: "Recipe not found." }, { status: 404 });
    }

    await prisma.bookmark.upsert({
      where: { userId_recipeId: { userId, recipeId } },
      update: {},
      create: { userId, recipeId },
    });

    return NextResponse.json({ recipeId });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to save bookmark.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
