import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import {
  recipeCandidatesSchema,
  type RecipePayload,
} from "@/lib/ai-recipe-schema";
import { generateRecipeWithGemini } from "@/lib/gemini";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const requestSchema = z.object({
  selectedFridgeItemIds: z.array(z.string().trim().min(1)).min(1),
  dietaryPreferences: z.string().trim().max(500).optional(),
});

const stripCodeFences = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) {
    return trimmed;
  }

  const withoutStart = trimmed.replace(/^```[a-zA-Z]*\s*/u, "");
  return withoutStart.replace(/```$/u, "").trim();
};

const extractJson = (text: string): string => {
  const stripped = stripCodeFences(text);
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    return stripped;
  }

  return stripped.slice(start, end + 1);
};

const parseGeminiRecipe = (text: string): RecipePayload => {
  const jsonText = extractJson(text);
  const parsed = JSON.parse(jsonText) as unknown;
  const candidates = recipeCandidatesSchema.parse(parsed);
  return candidates.candidates[0];
};

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = requestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      return NextResponse.json(
        {
          message: "Invalid generate recipe payload.",
          errors: parsedPayload.error.flatten(),
        },
        { status: 400 },
      );
    }

    const selectedIds = parsedPayload.data.selectedFridgeItemIds;

    const [user, fridgeItems] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { targetCalories: true },
      }),
      prisma.fridgeItem.findMany({
        where: { userId, id: { in: selectedIds } },
        select: { id: true, name: true },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    if (fridgeItems.length === 0) {
      return NextResponse.json(
        { message: "Selected ingredients not found." },
        { status: 400 },
      );
    }

    const ingredientNames = fridgeItems.map((item) => item.name);
    const dietaryPreferences = parsedPayload.data.dietaryPreferences?.trim() || undefined;

    let recipePayload: RecipePayload;

    try {
      const geminiText = await generateRecipeWithGemini({
        ingredientNames,
        dietaryPreferences,
        calorieLimit: user.targetCalories,
      });

      recipePayload = parseGeminiRecipe(geminiText);
    } catch (error) {
      console.error("Gemini recipe generation failed:", error);
      return NextResponse.json(
        {
          message:
            "AI recipe generation failed. Please try again or use recommendations.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      recipe: recipePayload,
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    return NextResponse.json(
      {
        message: "Failed to generate recipe.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
