"use client";

import { useRouter } from "next/navigation";

type RecipeBackButtonProps = {
  fallbackHref?: string;
  className?: string;
  ariaLabel?: string;
};

const defaultClassName =
  "flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg transition-transform active:scale-90";

export default function RecipeBackButton({
  fallbackHref = "/ai-recipe",
  className = defaultClassName,
  ariaLabel = "Go back",
}: RecipeBackButtonProps) {
  const router = useRouter();

  const handleClick = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }

    router.push(fallbackHref);
  };

  return (
    <button type="button" onClick={handleClick} aria-label={ariaLabel} className={className}>
      <span className="material-symbols-outlined">arrow_back</span>
    </button>
  );
}
