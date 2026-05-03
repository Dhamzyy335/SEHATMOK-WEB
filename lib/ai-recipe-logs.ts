import "server-only";

import { prisma } from "@/lib/prisma";

type AiRecipeLogStatus = "SUCCESS" | "FAILED";

type WriteAiRecipeLogInput = {
  userId: string;
  inputIngredients: string[];
  outputRecipeTitle?: string | null;
  status: AiRecipeLogStatus;
  errorMessage?: string | null;
  latencyMs?: number | null;
};

const truncate = (value: string, maxLength: number) =>
  value.length > maxLength ? value.slice(0, maxLength) : value;

export const writeAiRecipeLog = async ({
  userId,
  inputIngredients,
  outputRecipeTitle,
  status,
  errorMessage,
  latencyMs,
}: WriteAiRecipeLogInput) => {
  try {
    await prisma.aiRecipeLog.create({
      data: {
        userId,
        inputIngredients,
        outputRecipeTitle: outputRecipeTitle
          ? truncate(outputRecipeTitle, 500)
          : null,
        status,
        errorMessage: errorMessage ? truncate(errorMessage, 1000) : null,
        latencyMs,
      },
    });
  } catch (error) {
    console.error("Failed to write AI recipe log:", error);
  }
};
