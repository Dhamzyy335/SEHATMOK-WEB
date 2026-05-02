"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";
import AddToMealPlannerButton from "@/components/meal-plans/AddToMealPlannerButton";

type FridgeItemOption = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
};

type RecommendationItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  matchPercent: number;
  ingredientScore: number;
  calorieScore: number;
  finalScore: number;
  explanation: string;
};

type RecommendationsResponse = {
  recommendations: RecommendationItem[];
};

type AiRecipeCandidate = {
  name: string;
  description: string;
  servings: number;
  cookTimeMinutes: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
  }>;
  steps: string[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  matchedIngredientCount: number;
  totalRequiredIngredientCount: number;
  ingredientMatchPercent: number;
  missingIngredients: string[];
};

type AiRecipeCandidatesResponse = {
  candidates: AiRecipeCandidate[];
};

type AiSaveRecipeResponse = {
  recipeId: string;
  reused: boolean;
};

type BookmarkListResponse = {
  recipeIds: string[];
};

const categoryIconMap: Record<string, string> = {
  vegetables: "eco",
  fruits: "nutrition",
  proteins: "set_meal",
  dairy: "breakfast_dining",
  grains: "grain",
  nuts: "nutrition",
};

const fallbackRecommendation: RecommendationItem = {
  id: "placeholder",
  name: "Zesty Avocado Bowl",
  imageUrl:
    "https://lh3.googleusercontent.com/aida-public/AB6AXuAtnULxlS3Y-iC25sgtcZc129JRE3PYMoGkEmmMW1cd5Y7sE_5duJysPMIQEuvarHj_VsqEht8odI6v5kwrBr2y_Llrsm0dXsYU09h2OVg3Akj4AC-3AMovzOzmu6y7s7sGN5bgFBFDlpOPBEzl_zlJfQqqwHlDGR3AjspxrPHo9MzXuEhAGX-ulzuEItYh7Cr-Cc2P212uSA-eDRns2qZZ12Xdw51MqhGJgf5TyxU3fttNZyXdzt_4M0BMvNlaxPiMB6SsCb2E3bAe",
  calories: 340,
  protein: 24,
  carbs: 12,
  fat: 18,
  matchPercent: 0,
  ingredientScore: 0,
  calorieScore: 0,
  finalScore: 0,
  explanation: "Select ingredients and generate recommendations.",
};

const getIngredientIcon = (category: string): string => {
  const normalizedCategory = category.trim().toLowerCase();
  return categoryIconMap[normalizedCategory] ?? "restaurant";
};

const formatMacro = (value: number | null): string => {
  if (value === null) {
    return "--";
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1);
};

const formatCalories = (value: number | null): string => {
  if (value === null) {
    return "--";
  }

  return Math.round(value).toString();
};

const getMissingIngredientsLabel = (ingredients: string[]): string | null => {
  if (ingredients.length === 0) {
    return null;
  }

  const visibleIngredients = ingredients.slice(0, 3);
  const hiddenCount = ingredients.length - visibleIngredients.length;

  return `${visibleIngredients.join(", ")}${
    hiddenCount > 0 ? `, +${hiddenCount} more` : ""
  }`;
};

const getCandidateSavePayload = (candidate: AiRecipeCandidate) => ({
  name: candidate.name,
  description: candidate.description,
  servings: candidate.servings,
  cookTimeMinutes: candidate.cookTimeMinutes,
  ingredients: candidate.ingredients,
  steps: candidate.steps,
  nutrition: candidate.nutrition,
});

const AI_RECIPE_STORAGE_KEY = "aiRecipe:lastState";
const AI_RECIPE_STATE_MAX_AGE_MS = 30 * 60 * 1000;

type AiRecipeStoredState = {
  ts: number;
  selectedFridgeItemIds: string[];
  dietaryPreferences: string;
  candidates: AiRecipeCandidate[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isCandidate = (value: unknown): value is AiRecipeCandidate => {
  if (!isRecord(value)) {
    return false;
  }

  const nutrition = value.nutrition;
  const missingIngredients = value.missingIngredients;

  return (
    typeof value.name === "string" &&
    typeof value.description === "string" &&
    isNumber(value.servings) &&
    isNumber(value.cookTimeMinutes) &&
    Array.isArray(value.ingredients) &&
    Array.isArray(value.steps) &&
    isRecord(nutrition) &&
    isNumber(nutrition.calories) &&
    isNumber(nutrition.protein) &&
    isNumber(nutrition.carbs) &&
    isNumber(nutrition.fat) &&
    isNumber(nutrition.fiber) &&
    isNumber(value.matchedIngredientCount) &&
    isNumber(value.totalRequiredIngredientCount) &&
    isNumber(value.ingredientMatchPercent) &&
    Array.isArray(missingIngredients) &&
    missingIngredients.every((ingredient) => typeof ingredient === "string")
  );
};

const readAiRecipeState = (): AiRecipeStoredState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(AI_RECIPE_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AiRecipeStoredState>;
    if (!parsed || typeof parsed.ts !== "number") {
      return null;
    }

    const selectedFridgeItemIds = Array.isArray(parsed.selectedFridgeItemIds)
      ? parsed.selectedFridgeItemIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const dietaryPreferences =
      typeof parsed.dietaryPreferences === "string"
        ? parsed.dietaryPreferences
        : "";
    const candidates = Array.isArray(parsed.candidates)
      ? parsed.candidates.filter(isCandidate)
      : [];

    return {
      ts: parsed.ts,
      selectedFridgeItemIds,
      dietaryPreferences,
      candidates,
    };
  } catch {
    return null;
  }
};

const writeAiRecipeState = (state: AiRecipeStoredState) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(
      AI_RECIPE_STORAGE_KEY,
      JSON.stringify(state),
    );
  } catch {
    return;
  }
};

const clearAiRecipeState = () => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.removeItem(AI_RECIPE_STORAGE_KEY);
  } catch {
    return;
  }
};

export default function AiRecipePageClient() {
  const router = useRouter();
  const [fridgeItems, setFridgeItems] = useState<FridgeItemOption[]>([]);
  const [selectedFridgeItemIds, setSelectedFridgeItemIds] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [aiCandidates, setAiCandidates] = useState<AiRecipeCandidate[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isLoadingInitialRecommendations, setIsLoadingInitialRecommendations] =
    useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(true);
  const [bookmarkError, setBookmarkError] = useState<string | null>(null);
  const [savingBookmarkIds, setSavingBookmarkIds] = useState<Set<string>>(new Set());
  const [isSavingCandidateIndex, setIsSavingCandidateIndex] = useState<number | null>(null);

  const loadFridgeItems = useCallback(async () => {
    try {
      setIsLoadingIngredients(true);
      setErrorMessage(null);

      const response = await fetch("/api/fridge", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch fridge items (${response.status})`);
      }

      const data = (await response.json()) as FridgeItemOption[];
      setFridgeItems(data);
      setSelectedFridgeItemIds((previousSelected) => {
        if (previousSelected.length > 0) {
          return previousSelected.filter((id) => data.some((item) => item.id === id));
        }

        return data.slice(0, Math.min(3, data.length)).map((item) => item.id);
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoadingIngredients(false);
    }
  }, [router]);

  const loadBookmarks = useCallback(async () => {
    try {
      setIsLoadingBookmarks(true);
      setBookmarkError(null);

      const response = await fetch("/api/bookmarks", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch bookmarks (${response.status})`);
      }

      const data = (await response.json()) as BookmarkListResponse;
      setBookmarkedIds(new Set(data.recipeIds));
    } catch (error) {
      setBookmarkError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoadingBookmarks(false);
    }
  }, [router]);

  const loadInitialRecommendations = useCallback(async () => {
    try {
      setIsLoadingInitialRecommendations(true);

      const response = await fetch("/api/recommendations", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations (${response.status})`);
      }

      const data = (await response.json()) as RecommendationsResponse;
      setRecommendations(data.recommendations);
    } catch {
      setRecommendations([]);
    } finally {
      setIsLoadingInitialRecommendations(false);
    }
  }, [router]);

  useEffect(() => {
    void loadFridgeItems();
  }, [loadFridgeItems]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  useEffect(() => {
    void loadInitialRecommendations();
  }, [loadInitialRecommendations]);

  useEffect(() => {
    const stored = readAiRecipeState();
    if (!stored) {
      return;
    }

    if (Date.now() - stored.ts > AI_RECIPE_STATE_MAX_AGE_MS) {
      clearAiRecipeState();
      return;
    }

    if (stored.candidates.length === 0) {
      clearAiRecipeState();
      return;
    }

    setSelectedFridgeItemIds(stored.selectedFridgeItemIds);
    setDietaryPreferences(stored.dietaryPreferences);
    setAiCandidates(stored.candidates);
    setRecommendations([]);
    setHasGenerated(true);
  }, []);

  const toggleIngredient = (itemId: string) => {
    setSelectedFridgeItemIds((previousSelected) =>
      previousSelected.includes(itemId)
        ? previousSelected.filter((id) => id !== itemId)
        : [...previousSelected, itemId],
    );
  };

  const handleGenerateRecommendations = async () => {
    try {
      if (fridgeItems.length === 0) {
        setErrorMessage("Your fridge is empty. Add ingredients first.");
        return;
      }

      if (selectedFridgeItemIds.length === 0) {
        setErrorMessage("Select at least one ingredient before generating.");
        return;
      }

      setIsGenerating(true);
      setErrorMessage(null);
      setHasGenerated(true);
      setAiCandidates([]);
      setRecommendations([]);
      setIsSavingCandidateIndex(null);
      clearAiRecipeState();

      const aiResponse = await fetch("/api/ai/generate-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedFridgeItemIds,
          dietaryPreferences,
        }),
      });

      if (aiResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (aiResponse.ok) {
        const result = (await aiResponse.json()) as AiRecipeCandidatesResponse;
        setAiCandidates(result.candidates);
        writeAiRecipeState({
          ts: Date.now(),
          selectedFridgeItemIds,
          dietaryPreferences,
          candidates: result.candidates,
        });
        return;
      }

      const aiResult = (await aiResponse.json().catch(() => ({}))) as {
        message?: string;
      };
      throw new Error(aiResult.message ?? "AI recipe generation failed.");
    } catch (error) {
      console.error(error);

      try {
        const response = await fetch("/api/recommendations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedFridgeItemIds,
            dietaryPreferences,
          }),
        });

        if (response.status === 401) {
          router.replace("/login");
          return;
        }

        const result = (await response.json()) as RecommendationsResponse & {
          message?: string;
        };

        if (!response.ok) {
          throw new Error(result.message ?? "Failed to generate recommendations.");
        }

        setRecommendations(result.recommendations);
        setAiCandidates([]);
        setErrorMessage("AI generation unavailable. Showing recommendations instead.");
        clearAiRecipeState();
      } catch (fallbackError) {
        setErrorMessage(
          fallbackError instanceof Error
            ? fallbackError.message
            : "Unexpected error.",
        );
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const clearAiResults = () => {
    setAiCandidates([]);
    setIsSavingCandidateIndex(null);
    setErrorMessage(null);
    clearAiRecipeState();
    setHasGenerated(false);
  };

  const saveCandidateToRecipeId = useCallback(
    async (candidate: AiRecipeCandidate) => {
      const response = await fetch("/api/ai/save-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ recipe: getCandidateSavePayload(candidate) }),
      });

      if (response.status === 401) {
        router.replace("/login");
        throw new Error("Unauthorized.");
      }

      const result = (await response.json().catch(() => ({}))) as
        | (AiSaveRecipeResponse & { message?: string })
        | { message?: string };

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to save recipe.");
      }

      if (!("recipeId" in result) || !result.recipeId) {
        throw new Error("Recipe saved but no ID returned.");
      }

      return result.recipeId;
    },
    [router],
  );

  const handleChooseCandidate = async (
    candidate: AiRecipeCandidate,
    candidateIndex: number,
  ) => {
    if (isSavingCandidateIndex !== null) {
      return;
    }

    setIsSavingCandidateIndex(candidateIndex);
    setErrorMessage(null);

    try {
      const recipeId = await saveCandidateToRecipeId(candidate);
      router.push(`/recipes/${recipeId}?from=ai-recipe`);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to save recipe.",
      );
    } finally {
      setIsSavingCandidateIndex(null);
    }
  };

  const toggleBookmark = async (recipeId: string) => {
    if (savingBookmarkIds.has(recipeId)) {
      return;
    }

    const isBookmarked = bookmarkedIds.has(recipeId);

    setSavingBookmarkIds((previous) => {
      const next = new Set(previous);
      next.add(recipeId);
      return next;
    });
    setBookmarkError(null);

    try {
      const response = await fetch(
        isBookmarked ? `/api/bookmarks/${recipeId}` : "/api/bookmarks",
        {
          method: isBookmarked ? "DELETE" : "POST",
          headers: isBookmarked ? undefined : { "Content-Type": "application/json" },
          body: isBookmarked ? undefined : JSON.stringify({ recipeId }),
        },
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(result.message ?? "Failed to update bookmark.");
      }

      setBookmarkedIds((previous) => {
        const next = new Set(previous);
        if (isBookmarked) {
          next.delete(recipeId);
        } else {
          next.add(recipeId);
        }
        return next;
      });
    } catch (error) {
      setBookmarkError(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setSavingBookmarkIds((previous) => {
        const next = new Set(previous);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const featuredRecipe = useMemo(
    () => recommendations[0] ?? null,
    [recommendations],
  );

  const hasAiCandidates = aiCandidates.length > 0;
  const featuredCandidate = hasAiCandidates ? aiCandidates[0] : null;
  const featuredCandidateMissingLabel = featuredCandidate
    ? getMissingIngredientsLabel(featuredCandidate.missingIngredients)
    : null;
  const featuredMetrics = hasAiCandidates
    ? {
        name: featuredCandidate?.name ?? "",
        description: featuredCandidate?.description ?? "",
        calories: featuredCandidate?.nutrition.calories ?? 0,
        protein: featuredCandidate?.nutrition.protein ?? 0,
        carbs: featuredCandidate?.nutrition.carbs ?? 0,
        fat: featuredCandidate?.nutrition.fat ?? 0,
      }
    : featuredRecipe
      ? {
          name: featuredRecipe.name,
          description: featuredRecipe.explanation,
          calories: featuredRecipe.calories,
          protein: featuredRecipe.protein,
          carbs: featuredRecipe.carbs,
          fat: featuredRecipe.fat,
        }
    : {
        name: isLoadingInitialRecommendations
          ? "Finding fridge matches..."
          : "No fridge match yet",
        description: isLoadingInitialRecommendations
          ? "Checking saved recipes against your current fridge ingredients."
          : "No saved recipe matches your current fridge ingredients yet.",
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
      };
  const featuredImageUrl = hasAiCandidates
    ? fallbackRecommendation.imageUrl ?? ""
    : featuredRecipe?.imageUrl ?? fallbackRecommendation.imageUrl ?? "";

  const hasRecommendations = recommendations.length > 0;
  const showNoRecommendations =
    hasGenerated && !isGenerating && !errorMessage && !hasRecommendations && !hasAiCandidates;
  const featuredIsBookmarked =
    Boolean(featuredRecipe) &&
    !hasAiCandidates &&
    bookmarkedIds.has(featuredRecipe?.id ?? "");
  const featuredIsSaving =
    Boolean(featuredRecipe) &&
    !hasAiCandidates &&
    savingBookmarkIds.has(featuredRecipe?.id ?? "");
  const featuredBookmarkDisabled =
    !featuredRecipe || hasAiCandidates || isLoadingBookmarks || featuredIsSaving;
  const featuredBadgeLabel = hasAiCandidates
    ? `${featuredCandidate?.ingredientMatchPercent ?? 0}% Ingredients Available`
    : featuredRecipe
      ? `${featuredRecipe.matchPercent}% Match`
      : isGenerating || isLoadingInitialRecommendations
        ? "Scoring..."
        : "Ready";

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar />

      <main className="mx-auto max-w-screen-xl space-y-10 px-6 py-4">
        <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-dim p-8 text-on-primary md:p-12">
          <div className="relative z-10 max-w-2xl">
            <h2 className="mb-4 font-headline text-4xl font-extrabold leading-tight tracking-tighter md:text-6xl">
              What&apos;s for dinner?
            </h2>
            <p className="max-w-md text-lg font-medium text-on-primary/80 md:text-xl">
              Let our Atelier AI craft a gourmet experience from your available
              ingredients.
            </p>
          </div>
          <div className="absolute -bottom-12 -right-12 h-64 w-64 opacity-30 md:h-96 md:w-96">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCzWLy2vVSzew5xexxiQ0a023S9FkdnnF8R9Ez9F1b65NqUWm5CIKcONivSyFAd448Kmy_UJ1KWRR1in1zbD9L8CUgs370wLjLE4qk4sOf_3-BvBnuqoIPIIi-zUI_u_3OIFdCM59aNu9T1xofXmR_VaklDcXf9vxTlKn4Fm9WGPvn1f368Bth9eJcSz6s_3oDtBDg6UXWfKVtVyikWrz75Sb1VAlNX1ed594fC0cCvR6fm7KNbiKcMVE4H0gnZ2XrWtL_Geihu1wqp"
              alt="Vibrant Food"
              className="h-full w-full rotate-12 object-contain"
            />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-6 lg:col-span-7">
            <div>
              <h3 className="mb-1 font-headline text-2xl font-bold">In your Fridge</h3>
              <p className="text-sm text-on-surface-variant">
                Select ingredients to include in the generation
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {isLoadingIngredients
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`ingredient-skeleton-${index}`}
                      className="h-[108px] animate-pulse rounded-xl bg-surface-container-low"
                    />
                  ))
                : fridgeItems.map((item) => {
                    const selected = selectedFridgeItemIds.includes(item.id);
                    const icon = getIngredientIcon(item.category);

                    if (selected) {
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => toggleIngredient(item.id)}
                          className="cursor-pointer rounded-xl border-2 border-primary bg-primary-container/20 p-4 shadow-sm transition-all"
                        >
                          <div className="relative flex flex-col items-center gap-3">
                            <span
                              className="material-symbols-outlined absolute right-0 top-0 text-sm text-primary"
                              style={{ fontVariationSettings: "\"FILL\" 1" }}
                            >
                              check_circle
                            </span>
                            <span className="material-symbols-outlined text-3xl text-primary">
                              {icon}
                            </span>
                            <span className="text-center text-sm font-semibold">
                              {item.name}
                            </span>
                          </div>
                        </button>
                      );
                    }

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleIngredient(item.id)}
                        className="group cursor-pointer rounded-xl border border-transparent bg-surface-container-lowest p-4 shadow-sm transition-all hover:border-primary-container"
                      >
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-3xl text-primary">
                            {icon}
                          </span>
                          <span className="text-center text-sm font-semibold">
                            {item.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
            </div>

            {!isLoadingIngredients && fridgeItems.length === 0 ? (
              <div className="rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4">
                <p className="text-sm font-medium text-on-surface-variant">
                  No fridge items found yet. Add ingredients from the Fridge page.
                </p>
              </div>
            ) : (
              <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                {selectedFridgeItemIds.length} selected
              </p>
            )}

            <div className="space-y-4 rounded-2xl bg-surface-container-low p-6">
              <div className="flex items-center gap-2 text-secondary">
                <span className="material-symbols-outlined">tune</span>
                <span className="text-xs font-bold uppercase tracking-wider">
                  Dietary Preferences
                </span>
              </div>
              <textarea
                value={dietaryPreferences}
                onChange={(event) => setDietaryPreferences(event.target.value)}
                placeholder="e.g. Vegan, high protein, no cilantro..."
                className="min-h-[120px] w-full resize-none rounded-xl border-none bg-white p-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary-container"
              />
            </div>
          </div>

          <div className="space-y-8 lg:col-span-5">
            <button
              type="button"
              onClick={() => void handleGenerateRecommendations()}
              disabled={isGenerating || isLoadingIngredients}
              className="ai-glow group relative mb-8 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-primary py-6 font-headline text-xl font-bold text-on-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "\"FILL\" 1" }}
              >
                auto_awesome
              </span>
              {isGenerating ? "Generating..." : "Generate Recipe"}
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </button>

            <div className="-mt-4 flex justify-end">
              <Link
                href="/recipes"
                className="text-xs font-bold uppercase tracking-widest text-primary/80 transition-colors hover:text-primary"
              >
                Browse all recipes
              </Link>
            </div>

            {errorMessage ? (
              <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
                <p className="text-sm font-semibold text-error">{errorMessage}</p>
              </div>
            ) : null}

            {hasAiCandidates ? (
              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={clearAiResults}
                  className="text-xs font-bold uppercase tracking-widest text-primary/80 transition-colors hover:text-primary"
                >
                  Clear results
                </button>
              </div>
            ) : null}

            {bookmarkError ? (
              <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
                <p className="text-sm font-semibold text-error">{bookmarkError}</p>
              </div>
            ) : null}

            <div className="glass-card relative flex-1 overflow-hidden rounded-3xl border-4 border-white shadow-xl">
              <div className="absolute left-4 top-4 z-10 flex items-center gap-1 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                <span
                  className="material-symbols-outlined text-sm"
                  style={{ fontVariationSettings: "\"FILL\" 1" }}
                >
                  bolt
                </span>
                {featuredBadgeLabel}
              </div>
              {!hasAiCandidates && hasRecommendations ? (
                <button
                  type="button"
                  onClick={() => {
                    if (featuredRecipe) {
                      void toggleBookmark(featuredRecipe.id);
                    }
                  }}
                  disabled={featuredBookmarkDisabled}
                  aria-pressed={featuredIsBookmarked}
                  aria-label={
                    featuredIsBookmarked ? "Remove bookmark" : "Save recipe"
                  }
                  className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <span
                    className={`material-symbols-outlined${
                      featuredIsBookmarked ? " text-primary" : ""
                    }`}
                    style={{
                      fontVariationSettings: featuredIsBookmarked
                        ? '"FILL" 1'
                        : '"FILL" 0',
                    }}
                  >
                    favorite
                  </span>
                </button>
              ) : null}
              <div className="h-48 w-full overflow-hidden">
                <img
                  src={featuredImageUrl}
                  alt={featuredMetrics.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-3 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="mb-1 flex items-center gap-1">
                      <div className="h-4 w-1 rounded-full bg-secondary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                        Smart Insight
                      </span>
                    </div>
                    <h4 className="font-headline text-2xl font-extrabold text-on-surface">
                      {featuredMetrics.name}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {featuredMetrics.description}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-primary">
                      {formatCalories(featuredMetrics.calories)}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                      kcal
                    </span>
                  </div>
                </div>
                <div className="flex gap-4 pt-2">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Protein
                    </span>
                    <span className="font-bold">{formatMacro(featuredMetrics.protein)}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Carbs
                    </span>
                    <span className="font-bold">{formatMacro(featuredMetrics.carbs)}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Fats
                    </span>
                    <span className="font-bold">{formatMacro(featuredMetrics.fat)}g</span>
                  </div>
                </div>
                {featuredCandidate ? (
                  <div className="rounded-2xl bg-surface-container-low px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold uppercase tracking-widest text-secondary">
                        {featuredCandidate.ingredientMatchPercent}% Ingredients Available
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-on-surface-variant">
                        {featuredCandidate.matchedIngredientCount}/
                        {featuredCandidate.totalRequiredIngredientCount} available
                      </span>
                    </div>
                    {featuredCandidateMissingLabel ? (
                      <p className="mt-2 text-xs text-on-surface-variant">
                        Missing: {featuredCandidateMissingLabel}
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="border-t border-outline-variant/10 pt-4">
                  {hasAiCandidates ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (featuredCandidate) {
                            void handleChooseCandidate(featuredCandidate, 0);
                          }
                        }}
                        disabled={isSavingCandidateIndex !== null}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-container/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSavingCandidateIndex === 0 ? "Opening..." : "View Full Recipe"}
                        <span className="material-symbols-outlined text-sm">
                          arrow_forward
                        </span>
                      </button>
                      {featuredCandidate ? (
                        <AddToMealPlannerButton
                          recipeName={featuredCandidate.name}
                          resolveRecipeId={() => saveCandidateToRecipeId(featuredCandidate)}
                          className="w-full py-2"
                        />
                      ) : null}
                    </div>
                  ) : featuredRecipe ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Link
                        href={`/recipes/${featuredRecipe.id}?from=ai-recipe`}
                        className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/20 px-4 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary-container/10"
                      >
                        View Full Recipe
                        <span className="material-symbols-outlined text-sm">
                          arrow_forward
                        </span>
                      </Link>
                      <AddToMealPlannerButton
                        recipeId={featuredRecipe.id}
                        recipeName={featuredRecipe.name}
                        className="w-full py-2"
                      />
                    </div>
                  ) : (
                    <span className="block text-center text-sm font-bold text-on-surface-variant">
                      {isLoadingInitialRecommendations
                        ? "Checking your fridge for recipe matches..."
                        : showNoRecommendations
                          ? "No recommendations found for selected items."
                          : "No saved recipes match your fridge yet."}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {hasAiCandidates && aiCandidates.length > 1 ? (
              <div className="space-y-3">
                {aiCandidates.slice(1).map((candidate, index) => {
                  const candidateIndex = index + 1;
                  const isSavingCandidate =
                    isSavingCandidateIndex === candidateIndex;
                  const isCandidateDisabled = isSavingCandidateIndex !== null;
                  const missingIngredientsLabel = getMissingIngredientsLabel(
                    candidate.missingIngredients,
                  );

                  return (
                    <div
                      key={`${candidate.name}-${candidateIndex}`}
                      className="rounded-2xl bg-surface-container-lowest p-4 editorial-shadow transition-transform active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-headline text-lg font-bold">
                            {candidate.name}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                            {candidate.description}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                            <span>{Math.round(candidate.nutrition.calories)} kcal</span>
                            <span>P {formatMacro(candidate.nutrition.protein)}g</span>
                            <span>C {formatMacro(candidate.nutrition.carbs)}g</span>
                            <span>F {formatMacro(candidate.nutrition.fat)}g</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-secondary">
                            <span>
                              {candidate.ingredientMatchPercent}% Ingredients Available
                            </span>
                            <span>
                              {candidate.matchedIngredientCount}/
                              {candidate.totalRequiredIngredientCount} available
                            </span>
                          </div>
                          {missingIngredientsLabel ? (
                            <p className="mt-2 text-xs text-on-surface-variant">
                              Missing: {missingIngredientsLabel}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void handleChooseCandidate(candidate, candidateIndex)
                            }
                            disabled={isCandidateDisabled}
                            className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isSavingCandidate ? "Opening..." : "View"}
                          </button>
                          <AddToMealPlannerButton
                            recipeName={candidate.name}
                            variant="compact"
                            resolveRecipeId={() => saveCandidateToRecipeId(candidate)}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : recommendations.length > 1 ? (
              <div className="space-y-3">
                {recommendations.slice(1).map((recipe) => {
                  const isBookmarked = bookmarkedIds.has(recipe.id);
                  const isSaving = savingBookmarkIds.has(recipe.id);
                  const isBookmarkDisabled = isLoadingBookmarks || isSaving;

                  return (
                    <div
                      key={recipe.id}
                      className="rounded-2xl bg-surface-container-lowest p-4 editorial-shadow transition-transform active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link
                            href={`/recipes/${recipe.id}?from=ai-recipe`}
                            className="font-headline text-lg font-bold transition-colors hover:text-primary"
                          >
                            {recipe.name}
                          </Link>
                          <p className="mt-1 text-xs text-on-surface-variant">
                            {recipe.explanation}
                          </p>
                          <Link
                            href={`/recipes/${recipe.id}?from=ai-recipe`}
                            className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-primary"
                          >
                            View
                            <span className="material-symbols-outlined text-sm">
                              arrow_forward
                            </span>
                          </Link>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void toggleBookmark(recipe.id);
                            }}
                            disabled={isBookmarkDisabled}
                            aria-pressed={isBookmarked}
                            aria-label={
                              isBookmarked ? "Remove bookmark" : "Save recipe"
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-sm transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <span
                              className={`material-symbols-outlined text-sm${
                                isBookmarked ? " text-primary" : ""
                              }`}
                              style={{
                                fontVariationSettings: isBookmarked
                                  ? '"FILL" 1'
                                  : '"FILL" 0',
                              }}
                            >
                              favorite
                            </span>
                          </button>
                          <span className="rounded-full bg-secondary-container px-2 py-1 text-xs font-bold text-on-secondary-container">
                            {recipe.matchPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-end">
                        <AddToMealPlannerButton
                          recipeId={recipe.id}
                          recipeName={recipe.name}
                          variant="compact"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
