"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";

type RecipeSummary = {
  id: string;
  name: string;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  description?: string;
};

type BookmarkListResponse = {
  recipeIds: string[];
  recipes?: RecipeSummary[];
};

type RecipeDetailsResponse = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
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

export default function BookmarksPageClient() {
  const router = useRouter();
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());

  const loadBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

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

      if (Array.isArray(data.recipes)) {
        setRecipes(data.recipes);
        return;
      }

      if (data.recipeIds.length === 0) {
        setRecipes([]);
        return;
      }

      const detailResponses = await Promise.all(
        data.recipeIds.map((id) =>
          fetch(`/api/recipes/${id}`, {
            cache: "no-store",
          }),
        ),
      );

      const detailPayloads = await Promise.all(
        detailResponses.map(async (detailResponse, index) => {
          if (!detailResponse.ok) {
            throw new Error(
              `Failed to fetch recipe ${data.recipeIds[index]} (${detailResponse.status})`,
            );
          }

          return (await detailResponse.json()) as RecipeDetailsResponse;
        }),
      );

      const summaries = detailPayloads.map((recipe) => ({
        id: recipe.id,
        name: recipe.name,
        imageUrl: recipe.imageUrl,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat,
        description: recipe.description ?? undefined,
      }));

      setRecipes(summaries);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const handleRemove = async (recipeId: string) => {
    if (removingIds.has(recipeId)) {
      return;
    }

    setRemovingIds((previous) => {
      const next = new Set(previous);
      next.add(recipeId);
      return next;
    });
    setErrorMessage(null);

    try {
      const response = await fetch(`/api/bookmarks/${recipeId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(result.message ?? "Failed to remove bookmark.");
      }

      setRecipes((previous) => previous.filter((recipe) => recipe.id !== recipeId));
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setRemovingIds((previous) => {
        const next = new Set(previous);
        next.delete(recipeId);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar title="My Bookmarks" />

      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            aria-label="Back to Profile"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg transition-transform active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="font-headline text-2xl font-bold">Saved Recipes</h2>
            <p className="text-sm text-on-surface-variant">
              Revisit your favorite meals any time.
            </p>
          </div>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
            <p className="text-sm font-semibold text-error">{errorMessage}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={`bookmark-skeleton-${index}`}
                className="h-[104px] animate-pulse rounded-2xl bg-surface-container-lowest"
              />
            ))}
          </div>
        ) : recipes.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6">
            <p className="text-sm font-medium text-on-surface-variant">
              No saved recipes yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => {
              const isRemoving = removingIds.has(recipe.id);

              return (
                <Link
                  key={recipe.id}
                  href={`/recipes/${recipe.id}?from=bookmarks`}
                  className="block rounded-2xl bg-surface-container-lowest p-4 editorial-shadow transition-transform active:scale-[0.99]"
                >
                  <div className="flex items-start justify-between gap-3">
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
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void handleRemove(recipe.id);
                      }}
                      disabled={isRemoving}
                      aria-label="Unsave recipe"
                      title="Unsave"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-sm transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span
                        className="material-symbols-outlined text-sm text-primary"
                        style={{ fontVariationSettings: '"FILL" 1' }}
                      >
                        favorite
                      </span>
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
