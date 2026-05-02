const clamp01 = (value: number): number => {
  if (value < 0) {
    return 0;
  }

  if (value > 1) {
    return 1;
  }

  return value;
};

export const toScorePrecision = (score: number): number => {
  return Math.round(clamp01(score) * 10000) / 10000;
};

export const normalizeName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
};

const singularizeWord = (word: string): string => {
  if (word.length <= 3 || word.endsWith("ss")) {
    return word;
  }

  if (word.endsWith("ies")) {
    return `${word.slice(0, -3)}y`;
  }

  if (word.endsWith("es")) {
    return word.slice(0, -2);
  }

  if (word.endsWith("s")) {
    return word.slice(0, -1);
  }

  return word;
};

const getNameVariants = (name: string): string[] => {
  const normalized = normalizeName(name);
  if (!normalized) {
    return [];
  }

  const words = normalized.split(" ");
  const variants = new Set([normalized]);

  variants.add(words.map(singularizeWord).join(" "));

  if (words.length > 1) {
    const lastWordSingular = singularizeWord(words[words.length - 1]);
    variants.add([...words.slice(0, -1), lastWordSingular].join(" "));
  }

  return Array.from(variants).filter((variant) => variant.length > 0);
};

export const isMatch = (a: string, b: string): boolean => {
  const variantsA = getNameVariants(a);
  const variantsB = getNameVariants(b);

  if (variantsA.length === 0 || variantsB.length === 0) {
    return false;
  }

  return variantsA.some((variantA) =>
    variantsB.some(
      (variantB) => variantA.includes(variantB) || variantB.includes(variantA),
    ),
  );
};

export type IngredientScoreResult = {
  matchedCount: number;
  totalRequiredCount: number;
  ingredientScore: number;
  matchPercent: number;
};

export const calculateIngredientScore = (
  selectedIngredientNames: string[],
  recipeIngredientNames: string[],
): IngredientScoreResult => {
  const normalizedSelectedIngredients = Array.from(
    new Set(
      selectedIngredientNames
        .map((name) => normalizeName(name))
        .filter((name) => name.length > 0),
    ),
  );

  const normalizedRecipeIngredients = recipeIngredientNames
    .map((name) => normalizeName(name))
    .filter((name) => name.length > 0);

  if (normalizedRecipeIngredients.length === 0) {
    return {
      matchedCount: 0,
      totalRequiredCount: 0,
      ingredientScore: 0,
      matchPercent: 0,
    };
  }

  const matchedCount = normalizedRecipeIngredients.reduce((count, ingredientName) => {
    const hasMatch = normalizedSelectedIngredients.some((selectedName) =>
      isMatch(selectedName, ingredientName),
    );

    return hasMatch ? count + 1 : count;
  }, 0);

  const ingredientScore = toScorePrecision(
    matchedCount / normalizedRecipeIngredients.length,
  );

  return {
    matchedCount,
    totalRequiredCount: normalizedRecipeIngredients.length,
    ingredientScore,
    matchPercent: Math.round(ingredientScore * 100),
  };
};

export const calculateCalorieScore = (
  recipeCalories: number | null,
  targetCalories: number | null,
): number => {
  if (targetCalories === null || targetCalories <= 0 || recipeCalories === null) {
    return 0;
  }

  const deviation = Math.abs(recipeCalories - targetCalories);
  const closeness = 1 - deviation / targetCalories;

  return toScorePrecision(clamp01(closeness));
};

export const calculateFinalRecommendationScore = (
  ingredientScore: number,
  calorieScore: number,
): number => {
  return toScorePrecision(0.6 * ingredientScore + 0.4 * calorieScore);
};

type ExplanationOptions = {
  matchedCount: number;
  totalRequiredCount: number;
  calorieScore: number;
  recipeCalories: number | null;
  targetCalories: number | null;
};

export const createRecommendationExplanation = ({
  matchedCount,
  totalRequiredCount,
  calorieScore,
  recipeCalories,
  targetCalories,
}: ExplanationOptions): string => {
  return `Matches ${matchedCount}/${totalRequiredCount} ingredients. Calorie closeness: ${Math.round(calorieScore * 100)}% (${recipeCalories ?? 0} vs ${targetCalories ?? 0}).`;
};
