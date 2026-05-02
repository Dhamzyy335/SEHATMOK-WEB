import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import { saveOrReuseAiRecipe } from "@/lib/ai-recipe-persistence";
import { recipeSchema, type RecipePayload } from "@/lib/ai-recipe-schema";

export const runtime = "nodejs";

const requestSchema = z.object({
  recipe: recipeSchema,
});

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
    const result = await saveOrReuseAiRecipe(recipePayload);

    return NextResponse.json(result);
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
