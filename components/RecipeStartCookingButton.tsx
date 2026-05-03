"use client";

import { useRef } from "react";

const highlightClassNames = [
  "ring-2",
  "ring-primary/60",
  "bg-primary-container/30",
  "shadow-lg",
  "shadow-primary/10",
];

const highlightDurationMs = 1800;

type RecipeStartCookingButtonProps = {
  className?: string;
};

export default function RecipeStartCookingButton({
  className,
}: RecipeStartCookingButtonProps) {
  const highlightTimeoutRef = useRef<number | null>(null);

  const handleClick = () => {
    const target =
      document.getElementById("recipe-instructions") ??
      document.getElementById("recipe-ingredients");

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.classList.add(...highlightClassNames);

    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
    }

    highlightTimeoutRef.current = window.setTimeout(() => {
      target.classList.remove(...highlightClassNames);
      highlightTimeoutRef.current = null;
    }, highlightDurationMs);
  };

  return (
    <button type="button" onClick={handleClick} className={className}>
      <span className="material-symbols-outlined text-xl">restaurant</span>
      Start Cooking
    </button>
  );
}
