"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  progressWidthClass: string;
};

type FridgeHighlight = {
  title: string;
  subtitle: string;
  icon: string;
  iconColorClass: string;
};

type DashboardSummary = {
  targetCalories: number;
  intakeCalories: number;
  outtakeCalories: number;
  remainingCalories: number;
};

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
    title: "Scan Label",
    subtitle: "Instant nutrition",
    icon: "camera_alt",
    iconClassName: "text-primary",
    cardClassName:
      "bg-surface-container-lowest p-6 rounded-xl editorial-shadow flex flex-col justify-between hover:bg-surface-container-low transition-colors cursor-pointer group",
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

const macroCards: MacroCard[] = [
  {
    name: "Protein",
    current: 92,
    target: 150,
    icon: "fitness_center",
    iconColorClass: "text-primary",
    barColorClass: "bg-primary",
    progressWidthClass: "w-[61%]",
  },
  {
    name: "Carbohydrates",
    current: 145,
    target: 220,
    icon: "grain",
    iconColorClass: "text-secondary",
    barColorClass: "bg-secondary",
    progressWidthClass: "w-[66%]",
  },
  {
    name: "Healthy Fats",
    current: 48,
    target: 65,
    icon: "opacity",
    iconColorClass: "text-tertiary",
    barColorClass: "bg-tertiary",
    progressWidthClass: "w-[73%]",
  },
];

const fridgeHighlights: FridgeHighlight[] = [
  {
    title: "12 Items",
    subtitle: "Freshly stocked",
    icon: "kitchen",
    iconColorClass: "text-primary",
  },
  {
    title: "Grocery List",
    subtitle: "4 essential items",
    icon: "shopping_cart",
    iconColorClass: "text-tertiary",
  },
];

const circumference = 552.92;

const fallbackSummary: DashboardSummary = {
  targetCalories: 2000,
  intakeCalories: 750,
  outtakeCalories: 0,
  remainingCalories: 1250,
};

export default function DashboardPageClient() {
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary>(fallbackSummary);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
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
    };

    void fetchSummary();
  }, [router]);

  const progressRatio = useMemo(() => {
    if (summary.targetCalories <= 0) {
      return 0;
    }

    const ratio = summary.intakeCalories / summary.targetCalories;
    return Math.max(0, Math.min(1, ratio));
  }, [summary.intakeCalories, summary.targetCalories]);

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
                <button key={action.title} type="button" className={action.cardClassName}>
                  {content}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-baseline justify-between">
            <h2 className="font-headline text-2xl font-bold">Daily Breakdown</h2>
            <span className="text-sm font-bold uppercase tracking-widest text-primary">
              View Trends
            </span>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {macroCards.map((macro) => (
              <div key={macro.name} className="space-y-4 rounded-xl bg-surface-container-low p-6">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                      {macro.name}
                    </p>
                    <h4 className="font-headline text-2xl font-bold">
                      {macro.current}
                      <span className="ml-1 text-sm font-normal text-on-surface-variant">
                        / {macro.target}g
                      </span>
                    </h4>
                  </div>
                  <span className={`material-symbols-outlined ${macro.iconColorClass}`}>
                    {macro.icon}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    className={`h-full rounded-full ${macro.barColorClass} ${macro.progressWidthClass}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="font-headline text-2xl font-bold">Fridge Intelligence</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex overflow-hidden rounded-xl border-l-4 border-secondary bg-surface-container-lowest p-1 editorial-shadow lg:col-span-2">
              <div className="flex flex-1 flex-col justify-center p-6">
                <div className="mb-2 flex items-center gap-2 text-secondary">
                  <span className="material-symbols-outlined text-sm">warning</span>
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Near Expiry
                  </span>
                </div>
                <h3 className="mb-2 font-headline text-xl font-bold">Organic Greek Yogurt</h3>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  Expires in 2 days. Perfect for a breakfast smoothie bowl tomorrow
                  morning.
                </p>
                <Link
                  href="/ai-recipe"
                  className="group mt-4 flex items-center gap-1 text-sm font-bold text-primary"
                >
                  Cook with this
                  <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
              <div className="relative hidden w-1/3 sm:block">
                <img
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAocdUXY1Fzs7MYCrcd_RX2414EZgOBza-ax1C7rd3uAyfhNZ45rSAguWNx1J4CO-sjE54H9KfxyMWnutrI8OCpxuqGo82tiCFytp3ZxNtLy9m3RBci61XlIqY0K2_RXXcEN2tdzKWn3UN96MJqvPmE7YBQX7pMbV_iukSfvmgsc-nA6OJz1Y7LJmpf6teINgfIsCuP0iTuXBGi4QAjPfiqmGgkP50AswM9PIgxOI2XaokNvqGpC51cITfNQFItLgF14ySZXLTs-_Ue"
                  alt="Greek Yogurt"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>

            {fridgeHighlights.map((highlight) => (
              <div
                key={highlight.title}
                className="flex flex-col items-center justify-center rounded-xl bg-surface-container-lowest p-6 text-center editorial-shadow"
              >
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-low">
                  <span className={`material-symbols-outlined text-3xl ${highlight.iconColorClass}`}>
                    {highlight.icon}
                  </span>
                </div>
                <h3 className="font-headline font-bold">{highlight.title}</h3>
                <p className="text-sm text-on-surface-variant">{highlight.subtitle}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
