"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

type MealSlot = "BREAKFAST" | "LUNCH" | "DINNER";

type ToastState = {
  message: string;
  type: "success" | "error";
};

type AddToMealPlannerButtonProps = {
  recipeId: string;
  recipeName?: string;
  variant?: "button" | "compact";
  className?: string;
};

const mealSlots: Array<{ value: MealSlot; label: string; icon: string }> = [
  { value: "BREAKFAST", label: "Breakfast", icon: "wb_sunny" },
  { value: "LUNCH", label: "Lunch", icon: "restaurant" },
  { value: "DINNER", label: "Dinner", icon: "dinner_dining" },
];

const getTodayValue = () => {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
};

const joinClassNames = (...classNames: Array<string | undefined>) => {
  return classNames.filter(Boolean).join(" ");
};

export default function AddToMealPlannerButton({
  recipeId,
  recipeName,
  variant = "button",
  className,
}: AddToMealPlannerButtonProps) {
  const router = useRouter();
  const titleId = useId();
  const descriptionId = useId();
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayValue);
  const [savingSlot, setSavingSlot] = useState<MealSlot | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const displayRecipeName = recipeName?.trim() || "Recipe";
  const isSaving = savingSlot !== null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving]);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setToast(null);
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const closePlanner = () => {
    if (isSaving) {
      return;
    }

    setIsOpen(false);
  };

  const handleAddToPlanner = async (slot: MealSlot) => {
    if (savingSlot) {
      return;
    }

    const slotLabel =
      mealSlots.find((mealSlot) => mealSlot.value === slot)?.label ?? "Meal Planner";

    try {
      setSavingSlot(slot);

      const response = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          slot,
          recipeId,
        }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to add recipe to meal planner.");
      }

      setIsOpen(false);
      setToast({
        type: "success",
        message: `"${displayRecipeName}" added to ${slotLabel}.`,
      });
    } catch {
      setToast({
        type: "error",
        message: "Failed to add to Meal Planner. Please try again.",
      });
    } finally {
      setSavingSlot(null);
    }
  };

  const buttonClassName =
    variant === "compact"
      ? "inline-flex items-center justify-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-bold text-on-primary shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
      : "inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-on-primary shadow-sm transition-transform active:scale-95 disabled:cursor-not-allowed disabled:opacity-70";

  const modal = isOpen ? (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/30 p-4"
      onClick={closePlanner}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id={titleId} className="font-headline text-2xl font-bold text-on-surface">
              Add to Meal Planner
            </h3>
            <p
              id={descriptionId}
              className="mt-1 text-sm leading-relaxed text-on-surface-variant"
            >
              Choose a date and meal slot for {displayRecipeName}.
            </p>
          </div>
          <button
            type="button"
            onClick={closePlanner}
            disabled={isSaving}
            aria-label="Close meal planner picker"
            className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <label className="mt-5 block space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">
            Date
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            disabled={isSaving}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-sm font-semibold text-on-surface focus:border-primary focus:outline-none disabled:opacity-60"
          />
        </label>

        <div className="mt-5 grid gap-3">
          {mealSlots.map((slot) => {
            const isCurrentSlotSaving = savingSlot === slot.value;

            return (
              <button
                key={slot.value}
                type="button"
                onClick={() => void handleAddToPlanner(slot.value)}
                disabled={isSaving}
                className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-low p-4 text-left transition-colors hover:bg-surface-container-highest disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary">
                    {slot.icon}
                  </span>
                  <span className="font-semibold text-on-surface">{slot.label}</span>
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  {isCurrentSlotSaving ? "Saving..." : "Add"}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  ) : null;

  const toastElement = toast ? (
    <div className="fixed bottom-28 right-6 z-[130] w-[calc(100%-3rem)] max-w-sm">
      <div
        className={`rounded-2xl border p-4 shadow-xl ${
          toast.type === "success"
            ? "border-primary-container bg-primary-container text-on-primary-container"
            : "border-error-container/30 bg-error-container/10 text-error"
        }`}
      >
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-xl">
            {toast.type === "success" ? "check_circle" : "error"}
          </span>
          <p className="text-sm font-semibold">{toast.message}</p>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={!recipeId || isSaving}
        aria-label={`Add ${displayRecipeName} to Meal Planner`}
        className={joinClassNames(buttonClassName, className)}
      >
        <span className="material-symbols-outlined text-base">event_available</span>
        {variant === "compact" ? "Plan" : "Add to Meal Planner"}
      </button>

      {isMounted && modal ? createPortal(modal, document.body) : null}
      {isMounted && toastElement ? createPortal(toastElement, document.body) : null}
    </>
  );
}
