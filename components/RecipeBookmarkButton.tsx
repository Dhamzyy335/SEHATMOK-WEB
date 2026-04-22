"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BookmarkListResponse = {
  recipeIds: string[];
};

type RecipeBookmarkButtonProps = {
  recipeId: string;
};

export default function RecipeBookmarkButton({
  recipeId,
}: RecipeBookmarkButtonProps) {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadBookmarks = useCallback(async () => {
    try {
      setIsLoading(true);

      const response = await fetch("/api/bookmarks", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to fetch bookmarks.");
      }

      const payload = (await response.json()) as BookmarkListResponse;
      setIsBookmarked(payload.recipeIds.includes(recipeId));
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [recipeId, router]);

  useEffect(() => {
    void loadBookmarks();
  }, [loadBookmarks]);

  const handleToggle = async () => {
    if (isLoading || isSaving) {
      return;
    }

    setIsSaving(true);

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

      setIsBookmarked((previous) => !previous);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update bookmark.";
      console.error(message);
      window.alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const disabled = isLoading || isSaving;

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={disabled}
      aria-pressed={isBookmarked}
      aria-label={isBookmarked ? "Remove bookmark" : "Save recipe"}
      className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg transition-transform active:scale-90 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span
        className={`material-symbols-outlined${isBookmarked ? " text-primary" : ""}`}
        style={{
          fontVariationSettings: isBookmarked ? '"FILL" 1' : '"FILL" 0',
        }}
      >
        favorite
      </span>
    </button>
  );
}
