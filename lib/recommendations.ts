const clamp01 = (value: number): number => {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

export const normalizeIngredientName = (name: string): string => {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
};

export const toScorePrecision = (score: number): number => {
  return Math.round(score * 10000) / 10000;
};

export type IngredientOverlapResult = {
  score: number;
  overlapCount: number;
  totalIngredients: number;
  missingIngredients: string[];
};

export const calculateIngredientOverlap = (
  availableIngredients: Set<string>,
  recipeIngredientNames: string[],
): IngredientOverlapResult => {
  const normalizedRecipeIngredients = Array.from(
    new Set(
      recipeIngredientNames
        .map((name) => normalizeIngredientName(name))
        .filter((name) => name.length > 0),
    ),
  );

  if (normalizedRecipeIngredients.length === 0) {
    return {
      score: 0,
      overlapCount: 0,
      totalIngredients: 0,
      missingIngredients: [],
    };
  }

  let overlapCount = 0;
  const missingIngredients: string[] = [];

  for (const ingredientName of normalizedRecipeIngredients) {
    if (availableIngredients.has(ingredientName)) {
      overlapCount += 1;
    } else {
      missingIngredients.push(ingredientName);
    }
  }

  return {
    score: toScorePrecision(overlapCount / normalizedRecipeIngredients.length),
    overlapCount,
    totalIngredients: normalizedRecipeIngredients.length,
    missingIngredients,
  };
};

export const calculateCalorieCloseness = (
  recipeCalories: number | null,
  targetCalories: number | null,
): number | null => {
  if (targetCalories === null || targetCalories <= 0 || recipeCalories === null) {
    return null;
  }

  const deviation = Math.abs(recipeCalories - targetCalories);
  const closeness = 1 - deviation / targetCalories;

  return toScorePrecision(clamp01(closeness));
};

export const calculateFinalRecommendationScore = (
  ingredientScore: number,
  calorieScore: number | null,
): number => {
  if (calorieScore === null) {
    return toScorePrecision(ingredientScore);
  }

  return toScorePrecision(0.6 * ingredientScore + 0.4 * calorieScore);
};

type ExplanationOptions = {
  overlapCount: number;
  totalIngredients: number;
  calorieScore: number | null;
  recipeCalories: number | null;
  targetCalories: number | null;
  dietaryPreferences: string;
};

export const createRecommendationExplanation = ({
  overlapCount,
  totalIngredients,
  calorieScore,
  recipeCalories,
  targetCalories,
  dietaryPreferences,
}: ExplanationOptions): string => {
  const ingredientSegment =
    totalIngredients === 0
      ? "Ingredient mapping is limited for this recipe."
      : `Matches ${overlapCount}/${totalIngredients} required ingredients.`;

  const calorieSegment =
    calorieScore === null || targetCalories === null || targetCalories <= 0
      ? "No calorie score available yet."
      : `${Math.round(calorieScore * 100)}% calorie closeness (${recipeCalories ?? 0} vs ${targetCalories} kcal).`;

  const preferenceValue = dietaryPreferences.trim();
  const preferenceSegment = preferenceValue
    ? ` Preference noted: ${preferenceValue.slice(0, 80)}.`
    : "";

  return `${ingredientSegment} ${calorieSegment}${preferenceSegment}`;
};
