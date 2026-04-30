"use client";

import Link from "next/link";
import { SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
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
};

type CategoryOption = {
  label: string;
  value: string;
};

type BookmarkListResponse = {
  recipeIds: string[];
  recipes?: Array<{ id: string }>;
};

const categories: CategoryOption[] = [
  { label: "All", value: "All" },
  { label: "Vegetables", value: "Vegetables" },
  { label: "Fruits", value: "Fruits" },
  { label: "Proteins", value: "Proteins" },
  { label: "Dairy", value: "Dairy" },
  { label: "Grains", value: "Grains" },
  { label: "Nuts", value: "Nuts" },
];

const fallbackImageSrc =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='480' viewBox='0 0 800 480'><rect width='800' height='480' fill='%23E7ECE7'/></svg>";

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

const getImageSrc = (value: string | null): string => {
  if (!value) {
    return fallbackImageSrc;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : fallbackImageSrc;
};

const handleImageError = (event: SyntheticEvent<HTMLImageElement>) => {
  if (event.currentTarget.dataset.fallback === "true") {
    return;
  }

  event.currentTarget.dataset.fallback = "true";
  event.currentTarget.src = fallbackImageSrc;
};

export default function RecipesPageClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [isLoadingBookmarks, setIsLoadingBookmarks] = useState(false);
  const [bookmarkErrorMessage, setBookmarkErrorMessage] = useState<string | null>(null);

  const fetchRecipes = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const params = new URLSearchParams();
      const trimmedQuery = query.trim();

      if (trimmedQuery) {
        params.set("q", trimmedQuery);
      }

      if (selectedCategory !== "All") {
        params.set("category", selectedCategory);
      }

      const queryString = params.toString();
      const response = await fetch(
        queryString ? `/api/recipes?${queryString}` : "/api/recipes",
        {
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch recipes (${response.status})`);
      }

      const data = (await response.json()) as RecipeSummary[];
      setRecipes(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedCategory, router]);

  useEffect(() => {
    void fetchRecipes();
  }, [fetchRecipes]);

  const fetchBookmarks = useCallback(async () => {
    try {
      setIsLoadingBookmarks(true);
      setBookmarkErrorMessage(null);

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
      const ids = Array.isArray(data.recipes)
        ? data.recipes.map((recipe) => recipe.id)
        : data.recipeIds ?? [];

      setSavedIds(new Set(ids));
    } catch (error) {
      setBookmarkErrorMessage(
        error instanceof Error ? error.message : "Unexpected error.",
      );
    } finally {
      setIsLoadingBookmarks(false);
    }
  }, [router]);

  useEffect(() => {
    if (showSavedOnly) {
      void fetchBookmarks();
    }
  }, [fetchBookmarks, showSavedOnly]);

  const filteredCategoryLabel = useMemo(() => {
    if (selectedCategory === "All") {
      return "All Recipes";
    }

    return `${selectedCategory} Recipes`;
  }, [selectedCategory]);

  const visibleRecipes = useMemo(() => {
    if (!showSavedOnly) {
      return recipes;
    }

    if (savedIds.size === 0) {
      return [];
    }

    return recipes.filter((recipe) => savedIds.has(recipe.id));
  }, [recipes, savedIds, showSavedOnly]);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar title="Recipes" />

      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-4">
        <section className="space-y-4">
          <div className="group relative">
            <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-on-surface-variant">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipes..."
              className="h-14 w-full rounded-xl border-none bg-surface-container-lowest pl-12 pr-4 font-medium placeholder:text-on-surface-variant/50 shadow-sm focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
            {categories.map((category) => {
              const isActive = selectedCategory === category.value;

              return (
                <button
                  key={category.value}
                  type="button"
                  onClick={() => setSelectedCategory(category.value)}
                  className={
                    isActive
                      ? "flex-shrink-0 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary transition-all active:scale-95"
                      : "flex-shrink-0 rounded-xl bg-surface-container-low px-6 py-3 font-semibold text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
                  }
                >
                  {category.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowSavedOnly((previous) => !previous)}
              className={
                showSavedOnly
                  ? "flex-shrink-0 rounded-xl bg-primary px-6 py-3 font-semibold text-on-primary transition-all active:scale-95"
                  : "flex-shrink-0 rounded-xl bg-surface-container-low px-6 py-3 font-semibold text-on-surface transition-all hover:bg-surface-container-highest active:scale-95"
              }
            >
              Saved
            </button>
          </div>
        </section>

        <div className="flex items-center justify-between">
          <h2 className="font-headline text-2xl font-bold tracking-tight">
            {filteredCategoryLabel}
          </h2>
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            {isLoading || isLoadingBookmarks
              ? "Loading..."
              : `${visibleRecipes.length} recipes`}
          </span>
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
            <p className="text-sm font-semibold text-error">{errorMessage}</p>
          </div>
        ) : null}

        {bookmarkErrorMessage ? (
          <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
            <p className="text-sm font-semibold text-error">{bookmarkErrorMessage}</p>
          </div>
        ) : null}

        {isLoading || (showSavedOnly && isLoadingBookmarks) ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`recipe-skeleton-${index}`}
                className="h-[220px] animate-pulse rounded-2xl bg-surface-container-lowest"
              />
            ))}
          </div>
        ) : visibleRecipes.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6">
            <p className="text-sm font-medium text-on-surface-variant">
              {showSavedOnly ? "No saved recipes." : "No recipes found."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {visibleRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-2xl bg-surface-container-lowest p-4 editorial-shadow transition-transform active:scale-[0.99]"
              >
                <div className="mb-3 h-36 w-full overflow-hidden rounded-xl bg-surface-container-low">
                  <img
                    src={getImageSrc(recipe.imageUrl)}
                    alt={recipe.name}
                    onError={handleImageError}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-headline text-lg font-bold">{recipe.name}</p>
                    <p className="mt-1 line-clamp-2 text-xs text-on-surface-variant">
                      {recipe.description ?? "No description available."}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="block text-lg font-bold text-primary">
                      {formatCalories(recipe.calories)}
                    </span>
                    <span className="block text-[10px] font-bold uppercase tracking-tighter text-on-surface-variant">
                      kcal
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                  <span>P {formatMacro(recipe.protein)}g</span>
                  <span>C {formatMacro(recipe.carbs)}g</span>
                  <span>F {formatMacro(recipe.fat)}g</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
