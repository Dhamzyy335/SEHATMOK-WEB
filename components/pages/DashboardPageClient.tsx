"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";

type QuickAction = {
  title: string;
  subtitle: string;
  icon: string;
  iconClassName: string;
  cardClassName: string;
  titleClassName?: string;
  subtitleClassName?: string;
  href?: string;
};

type MacroCard = {
  name: string;
  current: number;
  target: number;
  icon: string;
  iconColorClass: string;
  barColorClass: string;
};

type FridgeHighlight = {
  title: string;
  subtitle: string;
  icon: string;
  iconColorClass: string;
  href?: string;
  ariaLabel?: string;
  countKey?: "activeGroceryCount" | "fridgeItemCount";
};

type DashboardSummary = {
  targetCalories: number;
  totalIntakeToday: number;
  totalOuttakeToday: number;
  remainingCalories: number;
  macroTargets: MacroSummary;
  macroCurrent: MacroSummary;
  caloriesCurrent?: number;
  nearExpiryItems: NearExpiryItem[];
  fridgeItemCount: number;
  activeGroceryCount: number;
};

type MacroSummary = {
  proteinG: number;
  carbsG: number;
  fatsG: number;
};

type NearExpiryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiryDate: string;
  expiryLabel: string;
};

type MealSlotValue = "BREAKFAST" | "LUNCH" | "DINNER";

type MealPlanRecipe = {
  id: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

type MealPlanSlots = Record<MealSlotValue, MealPlanRecipe | null>;

type LogTypeValue = "INTAKE" | "OUTTAKE";

const quickActions: QuickAction[] = [
  {
    title: "Add Activity",
    subtitle: "Track your burn",
    icon: "exercise",
    iconClassName: "text-secondary",
    cardClassName:
      "bg-surface-container-lowest p-6 rounded-xl editorial-shadow flex flex-col justify-between hover:bg-surface-container-low transition-colors cursor-pointer group",
  },
  {
    title: "Hydration",
    subtitle: "1.2L of 2.5L",
    icon: "water_drop",
    iconClassName: "text-tertiary",
    cardClassName:
      "bg-surface-container-lowest p-6 rounded-xl editorial-shadow flex flex-col justify-between hover:bg-surface-container-low transition-colors cursor-pointer group",
  },
  {
    title: "Meal Planner",
    subtitle: "Plan your meals",
    icon: "calendar_month",
    iconClassName: "text-secondary",
    cardClassName:
      "bg-surface-container-lowest p-6 rounded-xl editorial-shadow flex flex-col justify-between hover:bg-surface-container-low transition-colors cursor-pointer group",
    href: "/meal-plans",
  },
  {
    title: "AI Ideas",
    subtitle: "From your fridge",
    icon: "auto_awesome",
    iconClassName: "text-on-secondary-container",
    cardClassName:
      "bg-secondary-container p-6 rounded-xl editorial-shadow flex flex-col justify-between hover:opacity-90 transition-opacity cursor-pointer group",
    titleClassName: "text-on-secondary-container",
    subtitleClassName: "text-on-secondary-container/70",
    href: "/ai-recipe",
  },
];

const emptyMacroSummary: MacroSummary = {
  proteinG: 0,
  carbsG: 0,
  fatsG: 0,
};

const fridgeHighlights: FridgeHighlight[] = [
  {
    title: "0 Items",
    subtitle: "Freshly stocked",
    icon: "kitchen",
    iconColorClass: "text-primary",
    href: "/fridge",
    ariaLabel: "Open fridge",
    countKey: "fridgeItemCount",
  },
  {
    title: "Grocery List",
    subtitle: "4 essential items",
    icon: "shopping_cart",
    iconColorClass: "text-tertiary",
    href: "/grocery",
    ariaLabel: "Open grocery list",
    countKey: "activeGroceryCount",
  },
];

const mealSlotOrder: Array<{ key: MealSlotValue; label: string }> = [
  { key: "BREAKFAST", label: "Breakfast" },
  { key: "LUNCH", label: "Lunch" },
  { key: "DINNER", label: "Dinner" },
];

const circumference = 552.92;

const fallbackSummary: DashboardSummary = {
  targetCalories: 2000,
  totalIntakeToday: 750,
  totalOuttakeToday: 0,
  remainingCalories: 1250,
  macroTargets: emptyMacroSummary,
  macroCurrent: emptyMacroSummary,
  nearExpiryItems: [],
  fridgeItemCount: 0,
  activeGroceryCount: 0,
};

const emptyMealPlanSlots: MealPlanSlots = {
  BREAKFAST: null,
  LUNCH: null,
  DINNER: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const getLocalDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatCalories = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) {
    return "--";
  }

  return Math.round(value).toString();
};

const formatMacroValue = (value: number): string => {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return Math.round(value).toString();
};

const getMacroProgress = (current: number, target: number) => {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(1, current / target));
};

const readRecipeFromValue = (value: unknown): MealPlanRecipe | null => {
  if (!isRecord(value)) {
    return null;
  }

  const candidate = "recipe" in value ? value.recipe : value;
  if (!isRecord(candidate)) {
    return null;
  }

  const id = typeof candidate.id === "string" ? candidate.id : null;
  const name = typeof candidate.name === "string" ? candidate.name : null;

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    calories: typeof candidate.calories === "number" ? candidate.calories : null,
    protein: typeof candidate.protein === "number" ? candidate.protein : null,
    carbs: typeof candidate.carbs === "number" ? candidate.carbs : null,
    fat: typeof candidate.fat === "number" ? candidate.fat : null,
  };
};

const normalizeMealPlanSlots = (data: unknown): MealPlanSlots => {
  const slots: MealPlanSlots = { ...emptyMealPlanSlots };

  if (!isRecord(data)) {
    return slots;
  }

  const rawSlots = data.slots;
  if (isRecord(rawSlots)) {
    mealSlotOrder.forEach(({ key }) => {
      if (key in rawSlots) {
        slots[key] = readRecipeFromValue(rawSlots[key]);
      }
    });
  }

  const rawItems = data.items;
  if (Array.isArray(rawItems)) {
    rawItems.forEach((item) => {
      if (!isRecord(item)) {
        return;
      }

      const slotValue = typeof item.slot === "string" ? item.slot.toUpperCase() : "";
      if (slotValue !== "BREAKFAST" && slotValue !== "LUNCH" && slotValue !== "DINNER") {
        return;
      }

      const slotKey = slotValue as MealSlotValue;
      if (slots[slotKey]) {
        return;
      }

      slots[slotKey] = readRecipeFromValue(item);
    });
  }

  return slots;
};

export default function DashboardPageClient() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeLogType, setActiveLogType] = useState<LogTypeValue | null>(null);
  const [logCalories, setLogCalories] = useState("");
  const [isSubmittingLog, setIsSubmittingLog] = useState(false);
  const [logErrorMessage, setLogErrorMessage] = useState<string | null>(null);
  const [mealPlanSlots, setMealPlanSlots] = useState<MealPlanSlots>(emptyMealPlanSlots);
  const [isMealPlanLoading, setIsMealPlanLoading] = useState(true);
  const [mealPlanErrorMessage, setMealPlanErrorMessage] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      const response = await fetch("/api/dashboard/summary", {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch summary (${response.status})`);
      }

      const data = (await response.json()) as DashboardSummary;
      setSummary(data);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchMealPlan = useCallback(async () => {
    try {
      setIsMealPlanLoading(true);
      setMealPlanErrorMessage(null);

      const today = getLocalDateString();
      const response = await fetch(`/api/meal-plans?date=${today}`, {
        cache: "no-store",
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch meal plan (${response.status})`);
      }

      const data = (await response.json()) as unknown;
      setMealPlanSlots(normalizeMealPlanSlots(data));
    } catch {
      setMealPlanErrorMessage("Could not load meal plan");
    } finally {
      setIsMealPlanLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void fetchSummary();
    void fetchMealPlan();
  }, [fetchSummary, fetchMealPlan]);

  const macroCards = useMemo<MacroCard[]>(() => {
    const macroCurrent = summary.macroCurrent ?? emptyMacroSummary;
    const macroTargets = summary.macroTargets ?? emptyMacroSummary;

    return [
      {
        name: "Protein",
        current: macroCurrent.proteinG,
        target: macroTargets.proteinG,
        icon: "fitness_center",
        iconColorClass: "text-primary",
        barColorClass: "bg-primary",
      },
      {
        name: "Carbohydrates",
        current: macroCurrent.carbsG,
        target: macroTargets.carbsG,
        icon: "grain",
        iconColorClass: "text-secondary",
        barColorClass: "bg-secondary",
      },
      {
        name: "Healthy Fats",
        current: macroCurrent.fatsG,
        target: macroTargets.fatsG,
        icon: "opacity",
        iconColorClass: "text-tertiary",
        barColorClass: "bg-tertiary",
      },
    ];
  }, [summary]);

  const openLogModal = (type: LogTypeValue) => {
    setActiveLogType(type);
    setLogCalories("");
    setLogErrorMessage(null);
  };

  const closeLogModal = () => {
    if (isSubmittingLog) {
      return;
    }

    setActiveLogType(null);
    setLogCalories("");
    setLogErrorMessage(null);
  };

  const handleQuickActionClick = (action: QuickAction) => {
    if (action.title === "Add Activity") {
      openLogModal("OUTTAKE");
    }
  };

  const handleLogSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeLogType) {
      return;
    }

    const parsedCalories = Number(logCalories);
    if (!Number.isInteger(parsedCalories) || parsedCalories < 1 || parsedCalories > 10000) {
      setLogErrorMessage("Calories must be a whole number between 1 and 10000.");
      return;
    }

    try {
      setIsSubmittingLog(true);
      setLogErrorMessage(null);

      const response = await fetch("/api/logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: activeLogType,
          calories: parsedCalories,
        }),
      });

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      const result = (await response.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(result.message ?? "Failed to create calorie log.");
      }

      setActiveLogType(null);
      setLogCalories("");
      await fetchSummary();
    } catch (error) {
      setLogErrorMessage(error instanceof Error ? error.message : "Unexpected error.");
    } finally {
      setIsSubmittingLog(false);
    }
  };

  const progressRatio = useMemo(() => {
    if (summary.targetCalories <= 0) {
      return 0;
    }

    const netCalories = summary.totalIntakeToday - summary.totalOuttakeToday;
    const ratio = netCalories / summary.targetCalories;
    return Math.max(0, Math.min(1, ratio));
  }, [summary.targetCalories, summary.totalIntakeToday, summary.totalOuttakeToday]);

  const progressPercent = Math.round(progressRatio * 100);
  const strokeDashOffset = circumference - progressRatio * circumference;

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar fixed />

      <main className="mx-auto max-w-screen-xl space-y-8 px-6 pt-24">
        {errorMessage ? (
          <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
            <p className="text-sm font-semibold text-error">Summary unavailable</p>
            <p className="mt-1 text-xs text-on-surface-variant">{errorMessage}</p>
          </div>
        ) : null}

        <section className="grid grid-cols-1 items-center gap-8 md:grid-cols-12">
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary to-primary-dim p-8 text-on-primary editorial-shadow md:col-span-7">
            <div className="absolute -mr-20 -mt-20 h-64 w-64 rounded-full bg-primary-container/20 blur-3xl" />
            <div className="relative z-10 flex flex-col items-center gap-8 md:flex-row">
              <div className="radial-progress-container">
                <svg className="h-48 w-48 -rotate-90 transform">
                  <circle
                    className="text-white/10"
                    cx={96}
                    cy={96}
                    r={88}
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth={12}
                  />
                  <circle
                    className="text-on-primary"
                    cx={96}
                    cy={96}
                    r={88}
                    fill="transparent"
                    stroke="currentColor"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashOffset}
                    strokeLinecap="round"
                    strokeWidth={12}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-headline text-4xl font-extrabold tracking-tighter">
                    {isLoading ? "..." : summary.remainingCalories.toLocaleString()}
                  </span>
                  <span className="font-body text-sm uppercase tracking-widest opacity-80">
                    kcal left
                  </span>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <h2 className="font-headline text-3xl font-bold leading-tight">
                  Your metabolism is peaking.
                </h2>
                <p className="font-body leading-relaxed text-on-primary/80">
                  You&apos;ve reached {isLoading ? "..." : progressPercent}% of your daily
                  goal. Fuel up with some protein to sustain your energy until dinner.
                </p>
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => openLogModal("INTAKE")}
                    className="flex items-center gap-2 rounded-xl bg-on-primary px-6 py-3 font-bold text-primary transition-transform active:scale-95"
                  >
                    <span className="material-symbols-outlined text-sm">restaurant</span>
                    Log Meal
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid h-full grid-cols-2 gap-4 md:col-span-5">
            {quickActions.map((action) => {
              const content = (
                <>
                  <span className={`material-symbols-outlined text-3xl ${action.iconClassName}`}>
                    {action.icon}
                  </span>
                  <div>
                    <h3
                      className={`font-headline text-lg font-bold ${action.titleClassName ?? ""}`}
                    >
                      {action.title}
                    </h3>
                    <p
                      className={`${action.subtitleClassName ?? "text-on-surface-variant"} mt-1 text-sm`}
                    >
                      {action.subtitle}
                    </p>
                  </div>
                </>
              );

              if (action.href) {
                return (
                  <Link key={action.title} href={action.href} className={action.cardClassName}>
                    {content}
                  </Link>
                );
              }

              return (
                <button
                  key={action.title}
                  type="button"
                  onClick={() => handleQuickActionClick(action)}
                  className={action.cardClassName}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline text-2xl font-bold">Today's Meal Plan</h2>
            <Link
              href="/meal-plans"
              className="text-sm font-bold uppercase tracking-widest text-primary"
            >
              View Planner
            </Link>
          </div>

          {mealPlanErrorMessage ? (
            <div className="rounded-xl border border-error/20 bg-error-container/10 p-4">
              <p className="text-sm font-semibold text-error">{mealPlanErrorMessage}</p>
            </div>
          ) : null}

          {isMealPlanLoading ? (
            <div className="rounded-xl bg-surface-container-lowest p-4 text-sm font-semibold text-on-surface-variant">
              Loading today's plan...
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {mealSlotOrder.map((slot) => {
              const recipe = mealPlanSlots[slot.key];

              return (
                <div key={slot.key} className="rounded-xl bg-surface-container-low p-6">
                  <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                    {slot.label}
                  </p>
                  {recipe ? (
                    <div className="mt-3 space-y-3">
                      <div>
                        <h3 className="font-headline text-lg font-bold">{recipe.name}</h3>
                        <p className="text-sm text-on-surface-variant">
                          {formatCalories(recipe.calories)} kcal
                        </p>
                      </div>
                      <Link href={`/recipes/${recipe.id}`} className="text-sm font-bold text-primary">
                        View
                      </Link>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <p className="text-sm text-on-surface-variant">Not planned yet</p>
                      <Link href="/meal-plans" className="text-sm font-bold text-primary">
                        Plan
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline text-2xl font-bold">Daily Breakdown</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {macroCards.map((macro) => {
              const progress = isLoading ? 0 : getMacroProgress(macro.current, macro.target);
              const progressPercent = Math.round(progress * 100);
              const currentLabel = isLoading ? "--" : formatMacroValue(macro.current);
              const targetLabel = isLoading ? "--" : formatMacroValue(macro.target);

              return (
                <div key={macro.name} className="space-y-4 rounded-xl bg-surface-container-low p-6">
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                        {macro.name}
                      </p>
                      <h4 className="font-headline text-2xl font-bold">
                        {currentLabel}
                        <span className="ml-1 text-sm font-normal text-on-surface-variant">
                          / {targetLabel}g
                        </span>
                      </h4>
                    </div>
                    <span className={`material-symbols-outlined ${macro.iconColorClass}`}>
                      {macro.icon}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className={`h-full rounded-full ${macro.barColorClass}`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-headline text-2xl font-bold">Fridge Intelligence</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex overflow-hidden rounded-xl border-l-4 border-secondary bg-surface-container-lowest p-1 editorial-shadow lg:col-span-2">
              <div className="flex flex-1 flex-col justify-center p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-secondary">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span className="text-xs font-bold uppercase tracking-widest">
                      Near Expiry
                    </span>
                  </div>
                  <Link
                    href="/fridge"
                    className="text-xs font-bold uppercase tracking-widest text-primary"
                  >
                    View fridge
                  </Link>
                </div>

                {isLoading ? (
                  <p className="text-sm font-semibold text-on-surface-variant">
                    Checking your fridge...
                  </p>
                ) : summary.nearExpiryItems.length > 0 ? (
                  <div className="space-y-3">
                    {summary.nearExpiryItems.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl bg-surface-container-low px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-headline text-base font-bold">{item.name}</h3>
                            <p className="mt-1 text-xs text-on-surface-variant">
                              {item.quantity} {item.unit} - {item.category}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-secondary-container px-3 py-1 text-xs font-bold text-on-secondary-container">
                            {item.expiryLabel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    No items expiring soon.
                  </p>
                )}
              </div>
            </div>

            {fridgeHighlights.map((highlight) => {
              const fridgeItemCount = summary.fridgeItemCount ?? 0;
              const activeGroceryCount = summary.activeGroceryCount ?? 0;
              const title =
                highlight.countKey === "fridgeItemCount"
                  ? `${fridgeItemCount} Item${fridgeItemCount === 1 ? "" : "s"}`
                  : highlight.title;
              const subtitle =
                highlight.countKey === "activeGroceryCount"
                  ? `${activeGroceryCount} active item${
                      activeGroceryCount === 1 ? "" : "s"
                    }`
                  : highlight.subtitle;

              const content = (
                <>
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
                    <span className={`material-symbols-outlined text-3xl ${highlight.iconColorClass}`}>
                      {highlight.icon}
                    </span>
                  </div>
                  <h3 className="font-headline font-bold">{title}</h3>
                  <p className="text-sm text-on-surface-variant">{subtitle}</p>
                </>
              );

              if (highlight.href) {
                return (
                  <Link
                    key={highlight.title}
                    href={highlight.href}
                    aria-label={highlight.ariaLabel}
                    className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-6 text-center editorial-shadow transition-colors hover:bg-surface-container-low"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={highlight.title}
                  className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-6 text-center editorial-shadow"
                >
                  {content}
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {activeLogType ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 editorial-shadow">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-headline text-2xl font-bold text-on-surface">
                  {activeLogType === "INTAKE" ? "Log Meal" : "Add Activity"}
                </h3>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {activeLogType === "INTAKE"
                    ? "Enter calories consumed from your meal."
                    : "Enter calories burned from your activity."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLogModal}
                disabled={isSubmittingLog}
                className="rounded-lg p-1 text-on-surface-variant transition-colors hover:bg-surface-container-low disabled:opacity-50"
                aria-label="Close calorie log modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form className="mt-5 space-y-4" onSubmit={handleLogSubmit}>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                  Calories
                </span>
                <input
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  value={logCalories}
                  onChange={(event) => setLogCalories(event.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3 text-on-surface focus:border-primary focus:outline-none"
                />
              </label>

              {logErrorMessage ? (
                <p className="text-sm font-semibold text-error">{logErrorMessage}</p>
              ) : null}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeLogModal}
                  disabled={isSubmittingLog}
                  className="rounded-xl border border-outline-variant/40 px-4 py-2 font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLog}
                  className="rounded-xl bg-primary px-4 py-2 font-semibold text-on-primary transition-opacity hover:opacity-95 disabled:opacity-70"
                >
                  {isSubmittingLog
                    ? "Saving..."
                    : activeLogType === "INTAKE"
                      ? "Save Meal"
                      : "Save Activity"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </div>
  );
}
