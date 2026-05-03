"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";

type RecipeSummary = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  matchedIngredientCount: number;
  totalRequiredIngredientCount: number;
  ingredientAvailabilityPercent: number;
  missingIngredients: string[];
};

type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER";

type MealPlanItem = {
  id: string;
  slot: MealSlot;
  recipe: RecipeSummary | null;
};

type MealPlanResponse = {
  date: string;
  items: MealPlanItem[];
};

type GroceryItem = {
  id: string;
  name: string;
  isDone: boolean;
};

type GroceryMutationResponse = {
  message?: string;
};

type ToastState = {
  type: "success" | "error";
  message: string;
};

const MEAL_SLOTS: Array<{ value: MealSlot; label: string }> = [
  { value: "BREAKFAST", label: "Breakfast" },
  { value: "LUNCH", label: "Lunch" },
  { value: "DINNER", label: "Dinner" },
];

const parseRecipesResponse = (payload: unknown): RecipeSummary[] | null => {
  if (Array.isArray(payload)) {
    return payload as RecipeSummary[];
  }

  if (payload && typeof payload === "object") {
    const recipes = (payload as { recipes?: unknown }).recipes;
    if (Array.isArray(recipes)) {
      return recipes as RecipeSummary[];
    }
  }

  return null;
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

const formatMissingIngredients = (ingredients: string[]): string => {
  const visibleIngredients = ingredients.slice(0, 3);
  const remainingCount = ingredients.length - visibleIngredients.length;
  const visibleText = visibleIngredients.join(", ");

  return remainingCount > 0 ? `${visibleText}, +${remainingCount} more` : visibleText;
};

const normalizeIngredientName = (name: string): string => {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ");
};

const IngredientAvailabilitySummary = ({ recipe }: { recipe: RecipeSummary }) => {
  const totalRequired = recipe.totalRequiredIngredientCount ?? 0;

  if (totalRequired === 0) {
    return (
      <p className="mt-2 text-xs font-semibold text-on-surface-variant">
        Ingredient data unavailable
      </p>
    );
  }

  const matchedCount = recipe.matchedIngredientCount ?? 0;
  const availabilityPercent = recipe.ingredientAvailabilityPercent ?? 0;
  const missingIngredients = recipe.missingIngredients ?? [];
  const hasMissingIngredients = missingIngredients.length > 0;

  return (
    <div className="mt-3 space-y-1">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 font-bold ${
            hasMissingIngredients
              ? "bg-error-container/10 text-error"
              : "bg-primary-container/30 text-primary"
          }`}
        >
          {availabilityPercent}% ingredients available
        </span>
        <span className="font-semibold text-on-surface-variant">
          {matchedCount}/{totalRequired} available
        </span>
      </div>
      {hasMissingIngredients ? (
        <p className="text-xs font-semibold text-error">
          Missing: {formatMissingIngredients(missingIngredients)}
        </p>
      ) : (
        <p className="text-xs font-semibold text-primary">All ingredients available</p>
      )}
    </div>
  );
};

const getTodayValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

export default function MealPlansPageClient() {
  const router = useRouter();
  const [selectedDate, setSelectedDate] = useState(getTodayValue);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [searchResults, setSearchResults] = useState<RecipeSummary[]>([]);
  const [planItems, setPlanItems] = useState<MealPlanItem[]>([]);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isUpdatingKeys, setIsUpdatingKeys] = useState<Set<string>>(new Set());
  const [planErrorMessage, setPlanErrorMessage] = useState<string | null>(null);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const trimmedQuery = query.trim();
  const isQueryTooShort = trimmedQuery.length < 2;

  const loadPlan = useCallback(async () => {
    try {
      setIsLoadingPlan(true);
      setPlanErrorMessage(null);

      const response = await fetch(`/api/meal-plans?date=${selectedDate}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to load meal plan (${response.status})`);
      }

      const data = (await response.json()) as MealPlanResponse;
      setPlanItems(data.items ?? []);
    } catch (error) {
      setPlanErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoadingPlan(false);
    }
  }, [router, selectedDate]);

  useEffect(() => {
    void loadPlan();
  }, [loadPlan]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(handle);
  }, [trimmedQuery]);

  const searchRecipes = useCallback(async () => {
    if (debouncedQuery.length < 2) {
      setSearchResults([]);
      setSearchErrorMessage(null);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setSearchErrorMessage(null);

      const response = await fetch(`/api/recipes?q=${encodeURIComponent(debouncedQuery)}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to search recipes (${response.status})`);
      }

      const data = (await response.json()) as unknown;
      const parsedRecipes = parseRecipesResponse(data);

      if (!parsedRecipes) {
        throw new Error("Unexpected response from recipes API.");
      }

      setSearchResults(parsedRecipes);
    } catch (error) {
      setSearchErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsSearching(false);
    }
  }, [debouncedQuery, router]);

  useEffect(() => {
    void searchRecipes();
  }, [searchRecipes]);

  const planBySlot = useMemo(() => {
    const slots: Partial<Record<MealSlot, MealPlanItem>> = {};
    planItems.forEach((item) => {
      slots[item.slot] = item;
    });
    return slots;
  }, [planItems]);

  const plannedCount = useMemo(
    () => planItems.filter((item) => item.recipe).length,
    [planItems],
  );

  const visibleSearchResults = useMemo(
    () => searchResults.slice(0, 8),
    [searchResults],
  );

  const handleAddRecipe = async (recipeId: string, slot: MealSlot) => {
    const updateKey = `add:${slot}:${recipeId}`;
    if (isUpdatingKeys.has(updateKey)) {
      return;
    }

    setIsUpdatingKeys((previous) => {
      const next = new Set(previous);
      next.add(updateKey);
      return next;
    });
    setPlanErrorMessage(null);

    try {
      const response = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slot, recipeId }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(result.message ?? "Failed to add recipe to plan.");
      }

      await loadPlan();
    } catch (error) {
      setPlanErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsUpdatingKeys((previous) => {
        const next = new Set(previous);
        next.delete(updateKey);
        return next;
      });
    }
  };

  const handleRemoveSlot = async (slot: MealSlot) => {
    const updateKey = `remove:${slot}`;
    if (isUpdatingKeys.has(updateKey)) {
      return;
    }

    setIsUpdatingKeys((previous) => {
      const next = new Set(previous);
      next.add(updateKey);
      return next;
    });
    setPlanErrorMessage(null);

    try {
      const response = await fetch("/api/meal-plans", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slot }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(result.message ?? "Failed to remove recipe from plan.");
      }

      await loadPlan();
    } catch (error) {
      setPlanErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsUpdatingKeys((previous) => {
        const next = new Set(previous);
        next.delete(updateKey);
        return next;
      });
    }
  };

  const handleAddMissingToGrocery = async (recipe: RecipeSummary) => {
    const updateKey = `grocery:${recipe.id}`;
    if (isUpdatingKeys.has(updateKey)) {
      return;
    }

    const missingIngredients = Array.from(
      new Map(
        recipe.missingIngredients
          .map((ingredient) => ingredient.trim())
          .filter((ingredient) => ingredient.length > 0)
          .map((ingredient) => [normalizeIngredientName(ingredient), ingredient]),
      ).values(),
    );

    if (missingIngredients.length === 0) {
      return;
    }

    setIsUpdatingKeys((previous) => {
      const next = new Set(previous);
      next.add(updateKey);
      return next;
    });
    setPlanErrorMessage(null);

    try {
      const groceryResponse = await fetch("/api/grocery", { cache: "no-store" });

      if (groceryResponse.status === 401) {
        router.replace("/login");
        return;
      }

      if (!groceryResponse.ok) {
        throw new Error(`Failed to load grocery list (${groceryResponse.status})`);
      }

      const groceryItems = (await groceryResponse.json()) as GroceryItem[];
      const activeGroceryNames = new Set(
        groceryItems
          .filter((item) => !item.isDone)
          .map((item) => normalizeIngredientName(item.name))
          .filter((name) => name.length > 0),
      );
      const ingredientsToAdd = missingIngredients.filter(
        (ingredient) => !activeGroceryNames.has(normalizeIngredientName(ingredient)),
      );

      if (ingredientsToAdd.length === 0) {
        setToast({
          type: "success",
          message: "Missing ingredients already exist in Grocery List.",
        });
        return;
      }

      await Promise.all(
        ingredientsToAdd.map(async (ingredient) => {
          const response = await fetch("/api/grocery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: ingredient }),
          });

          if (response.status === 401) {
            router.replace("/login");
            throw new Error("Unauthorized.");
          }

          const result = (await response.json().catch(() => ({}))) as
            | GroceryItem
            | GroceryMutationResponse;

          if (!response.ok) {
            throw new Error(
              "message" in result
                ? result.message
                : "Failed to add missing ingredient.",
            );
          }
        }),
      );

      setToast({
        type: "success",
        message: "Missing ingredients added to Grocery List.",
      });
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error && error.message
            ? error.message
            : "Failed to add missing ingredients. Please try again.",
      });
    } finally {
      setIsUpdatingKeys((previous) => {
        const next = new Set(previous);
        next.delete(updateKey);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar title="Meal Planner" backHref="/" backLabel="Back to Home" />

      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-4">
        <section className="space-y-4 rounded-2xl bg-surface-container-lowest p-6 editorial-shadow">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-headline text-2xl font-bold">Plan for</h2>
              <p className="text-sm text-on-surface-variant">
                Choose a date to plan your meals.
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-xl border-none bg-surface-container-low p-3 text-sm font-semibold text-on-surface focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-on-surface-variant">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes to add..."
              className="h-14 w-full rounded-xl border-none bg-surface-container-lowest pl-12 pr-4 font-medium placeholder:text-on-surface-variant/50 shadow-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {searchErrorMessage ? (
            <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
              <p className="text-sm font-semibold text-error">{searchErrorMessage}</p>
            </div>
          ) : null}

          {isSearching ? (
            <div className="grid gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-on-surface-variant">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Searching recipes...
              </div>
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`search-skeleton-${index}`}
                  className="h-[96px] animate-pulse rounded-2xl bg-surface-container-lowest"
                />
              ))}
            </div>
          ) : isQueryTooShort ? (
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6">
              <p className="text-sm font-medium text-on-surface-variant">
                Type at least 2 characters to search.
              </p>
            </div>
          ) : visibleSearchResults.length === 0 ? (
            <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6">
              <p className="text-sm font-medium text-on-surface-variant">No recipes found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {visibleSearchResults.map((recipe) => {
                const groceryKey = `grocery:${recipe.id}`;
                const isAddingMissing = isUpdatingKeys.has(groceryKey);

                return (
                  <div
                    key={recipe.id}
                    className="rounded-2xl bg-surface-container-lowest p-4 editorial-shadow"
                  >
                    <div className="space-y-3">
                      <div>
                        <p className="font-headline text-lg font-bold">{recipe.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                          {recipe.description ?? "No description available."}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                          <span>{formatCalories(recipe.calories)} kcal</span>
                          <span>P {formatMacro(recipe.protein)}g</span>
                          <span>C {formatMacro(recipe.carbs)}g</span>
                          <span>F {formatMacro(recipe.fat)}g</span>
                        </div>
                        <IngredientAvailabilitySummary recipe={recipe} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {recipe.missingIngredients.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => void handleAddMissingToGrocery(recipe)}
                            disabled={isAddingMissing}
                            className="rounded-full bg-primary-container/30 px-4 py-2 text-xs font-bold text-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isAddingMissing ? "Adding..." : "Add missing to Grocery"}
                          </button>
                        ) : null}
                        {MEAL_SLOTS.map((slot) => {
                          const slotItem = planBySlot[slot.value];
                          const isSameRecipe = slotItem?.recipe?.id === recipe.id;
                          const updateKey = `add:${slot.value}:${recipe.id}`;
                          const isUpdating = isUpdatingKeys.has(updateKey);
                          const label = isSameRecipe
                            ? `Added to ${slot.label}`
                            : slotItem
                              ? `Replace ${slot.label}`
                              : `Add to ${slot.label}`;

                          return (
                            <button
                              key={`${recipe.id}-${slot.value}`}
                              type="button"
                              onClick={() => void handleAddRecipe(recipe.id, slot.value)}
                              disabled={isUpdating || isSameRecipe}
                              className="rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isUpdating ? "Adding..." : label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-2xl font-bold">Meal Plan</h2>
            <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
              {isLoadingPlan
                ? "Loading..."
                : `${plannedCount} of ${MEAL_SLOTS.length} planned`}
            </span>
          </div>

          {planErrorMessage ? (
            <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
              <p className="text-sm font-semibold text-error">{planErrorMessage}</p>
            </div>
          ) : null}

          {isLoadingPlan ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`plan-skeleton-${index}`}
                  className="h-[96px] animate-pulse rounded-2xl bg-surface-container-lowest"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {MEAL_SLOTS.map((slot) => {
                const slotItem = planBySlot[slot.value];
                const recipe = slotItem?.recipe ?? null;
                const removeKey = `remove:${slot.value}`;
                const isRemoving = isUpdatingKeys.has(removeKey);
                const groceryKey = recipe ? `grocery:${recipe.id}` : null;
                const isAddingMissing =
                  groceryKey !== null && isUpdatingKeys.has(groceryKey);

                return (
                  <div
                    key={slot.value}
                    className="rounded-2xl bg-surface-container-lowest p-4 editorial-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
                          {slot.label}
                        </p>
                        {recipe ? (
                          <>
                            <Link
                              href={`/recipes/${recipe.id}`}
                              className="mt-1 block font-headline text-lg font-bold text-on-surface transition-colors hover:text-primary"
                            >
                              {recipe.name}
                            </Link>
                            <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                              {recipe.description ?? "No description available."}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                              <span>{formatCalories(recipe.calories)} kcal</span>
                              <span>P {formatMacro(recipe.protein)}g</span>
                              <span>C {formatMacro(recipe.carbs)}g</span>
                              <span>F {formatMacro(recipe.fat)}g</span>
                            </div>
                            <IngredientAvailabilitySummary recipe={recipe} />
                            {recipe.missingIngredients.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => void handleAddMissingToGrocery(recipe)}
                                disabled={isAddingMissing}
                                className="mt-3 rounded-full bg-primary-container/30 px-4 py-2 text-xs font-bold text-primary transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isAddingMissing
                                  ? "Adding..."
                                  : "Add missing to Grocery"}
                              </button>
                            ) : null}
                          </>
                        ) : (
                          <p className="mt-2 text-sm font-medium text-on-surface-variant">
                            No meal planned.
                          </p>
                        )}
                      </div>
                      {recipe ? (
                        <button
                          type="button"
                          onClick={() => void handleRemoveSlot(slot.value)}
                          disabled={isRemoving}
                          className="rounded-full bg-error-container/20 px-4 py-2 text-xs font-bold text-error transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isRemoving ? "Removing..." : "Remove"}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {toast ? (
        <div
          className={`fixed right-4 top-20 z-[110] flex max-w-sm items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold shadow-xl ${
            toast.type === "success"
              ? "bg-primary text-on-primary"
              : "bg-error-container text-error"
          }`}
          role="status"
        >
          <span className="material-symbols-outlined">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p>{toast.message}</p>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
