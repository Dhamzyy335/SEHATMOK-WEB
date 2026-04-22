import "server-only";

import { GoogleGenAI } from "@google/genai";

type GenerateRecipeWithGeminiParams = {
  ingredientNames: string[];
  dietaryPreferences?: string;
  calorieLimit?: number | null;
};

const DEFAULT_MODEL = "gemini-3-flash-preview";

const getGeminiApiKey = (): string => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required.");
  }
  return apiKey;
};

const buildGeminiPrompt = ({
  ingredientNames,
  dietaryPreferences,
  calorieLimit,
}: GenerateRecipeWithGeminiParams): string => {
  const uniqueIngredients = Array.from(
    new Set(
      ingredientNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0),
    ),
  );

  const ingredientList = uniqueIngredients.length
    ? uniqueIngredients.map((name, index) => `${index + 1}. ${name}`).join("\n")
    : "(none)";

  const preferencesText = dietaryPreferences?.trim()
    ? dietaryPreferences.trim()
    : "none";

  const calorieText = calorieLimit ? `${Math.round(calorieLimit)} kcal` : "none";

  const schemaText = `{
  "candidates": [
    {
      "name": "string",
      "description": "string",
      "servings": 2,
      "cookTimeMinutes": 20,
      "ingredients": [
        { "name": "string", "quantity": 100, "unit": "g" }
      ],
      "steps": ["string"],
      "nutrition": {
        "calories": 500,
        "protein": 30,
        "carbs": 50,
        "fat": 20,
        "fiber": 8
      }
    }
  ]
}`;

  return `You are a culinary assistant. Create 3 to 5 distinct recipes using the provided ingredients.

Ingredients:
${ingredientList}

Dietary preferences: ${preferencesText}
Target calories: ${calorieText}

Return ONLY JSON matching this schema exactly. Use double quotes for all keys and string values. Do not wrap in markdown fences or commentary.
${schemaText}
`;
};

export const getGeminiClient = () => {
  return new GoogleGenAI({ apiKey: getGeminiApiKey() });
};

export const generateRecipeWithGemini = async (
  params: GenerateRecipeWithGeminiParams,
): Promise<string> => {
  const client = getGeminiClient();
  const model = process.env.GEMINI_MODEL ?? DEFAULT_MODEL;
  const prompt = buildGeminiPrompt(params);

  const response = await client.models.generateContent({
    model,
    contents: prompt,
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response.");
  }

  return response.text;
};
