"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";

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

export default function AiRecipePageClient() {
  const router = useRouter();
  const [fridgeItems, setFridgeItems] = useState<FridgeItemOption[]>([]);
  const [selectedFridgeItemIds, setSelectedFridgeItemIds] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  useEffect(() => {
    void loadFridgeItems();
  }, [loadFridgeItems]);

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsGenerating(false);
    }
  };

  const featuredRecipe = useMemo(
    () => recommendations[0] ?? fallbackRecommendation,
    [recommendations],
  );

  const hasRecommendations = recommendations.length > 0;
  const showNoRecommendations = hasGenerated && !isGenerating && !errorMessage && !hasRecommendations;

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

            {errorMessage ? (
              <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
                <p className="text-sm font-semibold text-error">{errorMessage}</p>
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
                {hasRecommendations
                  ? `${featuredRecipe.matchPercent}% Match`
                  : isGenerating
                    ? "Scoring..."
                    : "Ready"}
              </div>
              <div className="h-48 w-full overflow-hidden">
                <img
                  src={featuredRecipe.imageUrl ?? fallbackRecommendation.imageUrl ?? ""}
                  alt={featuredRecipe.name}
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
                      {featuredRecipe.name}
                    </h4>
                    <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {featuredRecipe.explanation}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-primary">
                      {featuredRecipe.calories ?? 0}
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
                    <span className="font-bold">{formatMacro(featuredRecipe.protein)}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Carbs
                    </span>
                    <span className="font-bold">{formatMacro(featuredRecipe.carbs)}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                      Fats
                    </span>
                    <span className="font-bold">{formatMacro(featuredRecipe.fat)}g</span>
                  </div>
                </div>
                <div className="border-t border-outline-variant/10 pt-4">
                  {hasRecommendations ? (
                    <Link
                      href={`/recipes/${featuredRecipe.id}`}
                      className="flex w-full items-center justify-center gap-2 text-sm font-bold text-primary hover:underline"
                    >
                      View Full Recipe
                      <span className="material-symbols-outlined text-sm">
                        arrow_forward
                      </span>
                    </Link>
                  ) : (
                    <span className="block text-center text-sm font-bold text-on-surface-variant">
                      {showNoRecommendations
                        ? "No recommendations found for selected items."
                        : "Select ingredients to see recommendations"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {recommendations.length > 1 ? (
              <div className="space-y-3">
                {recommendations.slice(1).map((recipe) => (
                  <Link
                    key={recipe.id}
                    href={`/recipes/${recipe.id}`}
                    className="block rounded-2xl bg-surface-container-lowest p-4 editorial-shadow transition-transform active:scale-[0.99]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-headline text-lg font-bold">{recipe.name}</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          {recipe.explanation}
                        </p>
                      </div>
                      <span className="rounded-full bg-secondary-container px-2 py-1 text-xs font-bold text-on-secondary-container">
                        {recipe.matchPercent}%
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
