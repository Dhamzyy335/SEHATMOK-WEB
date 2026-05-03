import { NextResponse } from "next/server";
import { z } from "zod";
import { UnauthorizedError, requireUserId } from "@/lib/auth";
import {
  recipeCandidatesSchema,
  type RecipeCandidatesPayload,
} from "@/lib/ai-recipe-schema";
import { writeAiRecipeLog } from "@/lib/ai-recipe-logs";
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

const parseGeminiCandidates = (text: string): RecipeCandidatesPayload => {
  const jsonText = extractJson(text);
  const parsed = JSON.parse(jsonText) as unknown;
  return recipeCandidatesSchema.parse(parsed);
};

export async function POST(request: Request) {
  const startedAt = Date.now();
  let userId: string | null = null;
  let ingredientNames: string[] = [];

  try {
    userId = await requireUserId();
    const payload = await request.json().catch(() => ({}));
    const parsedPayload = requestSchema.safeParse(payload);

    if (!parsedPayload.success) {
      await writeAiRecipeLog({
        userId,
        inputIngredients: [],
        status: "FAILED",
        errorMessage: "Invalid generate recipes payload.",
        latencyMs: Date.now() - startedAt,
      });

      return NextResponse.json(
        {
          message: "Invalid generate recipes payload.",
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
      await writeAiRecipeLog({
        userId,
        inputIngredients: [],
        status: "FAILED",
        errorMessage: "User not found.",
        latencyMs: Date.now() - startedAt,
      });

      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    if (fridgeItems.length === 0) {
      await writeAiRecipeLog({
        userId,
        inputIngredients: [],
        status: "FAILED",
        errorMessage: "Selected ingredients not found.",
        latencyMs: Date.now() - startedAt,
      });

      return NextResponse.json(
        { message: "Selected ingredients not found." },
        { status: 400 },
      );
    }

    ingredientNames = fridgeItems.map((item) => item.name);
    const dietaryPreferences = parsedPayload.data.dietaryPreferences?.trim() || undefined;

    let candidatesPayload: RecipeCandidatesPayload;

    try {
      const geminiText = await generateRecipeWithGemini({
        ingredientNames,
        dietaryPreferences,
        calorieLimit: user.targetCalories,
      });

      candidatesPayload = parseGeminiCandidates(geminiText);
    } catch (error) {
      console.error("Gemini recipe generation failed:", error);
      await writeAiRecipeLog({
        userId,
        inputIngredients: ingredientNames,
        status: "FAILED",
        errorMessage:
          error instanceof Error
            ? error.message
            : "AI recipe generation failed.",
        latencyMs: Date.now() - startedAt,
      });

      return NextResponse.json(
        {
          message:
            "AI recipe generation failed. Please try again or use recommendations.",
        },
        { status: 502 },
      );
    }

    await writeAiRecipeLog({
      userId,
      inputIngredients: ingredientNames,
      outputRecipeTitle: candidatesPayload.candidates
        .map((candidate) => candidate.name)
        .join(", "),
      status: "SUCCESS",
      latencyMs: Date.now() - startedAt,
    });

    return NextResponse.json({ candidates: candidatesPayload.candidates });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json(
        { message: error.message },
        { status: error.statusCode },
      );
    }

    if (userId) {
      await writeAiRecipeLog({
        userId,
        inputIngredients: ingredientNames,
        status: "FAILED",
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        latencyMs: Date.now() - startedAt,
      });
    }

    return NextResponse.json(
      {
        message: "Failed to generate recipes.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
