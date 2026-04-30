import { notFound } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import RecipeBackButton from "@/components/RecipeBackButton";
import RecipeBookmarkButton from "@/components/RecipeBookmarkButton";
import { requirePageUserId } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

type NutritionBar = {
  label: string;
  value: number;
  height: number;
  barClassName: string;
};

type RecipeIngredient = {
  id: string;
  name: string;
  amount: string;
};

const fallbackRecipeImage =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDi6bGdgLcUj5dGGU1vs-w5dmR4U6PBnjONwmiFFCTj0sQ62GOvnglEj2dzynaR-PS825zCpaFJAJCekxXi9ZP2XyClB-xh5O3owF_8A2PbnxR1UDRUfen1VWggisPIDmAWGb6E-Rds71EA9GdVdQ7v2dyClDkYBQGrsUCwS3ipcm6vATbFBxyNNWOktxgcCxx9tq7doqtDGvP6Mak202wPQFLWUiTDTKnGvGTo6cTmqGd5OIA9p-HwNcosxqrErcXfiCaXQzjHr9cw";

const toStepArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
};

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "0";
  }

  return Number.isInteger(value) ? value.toString() : value.toFixed(1).replace(/\.0$/, "");
};

const formatIngredientAmount = (quantity: number, unit: string) => {
  const formattedQuantity = formatNumber(quantity);
  return unit ? `${formattedQuantity} ${unit}` : formattedQuantity;
};

export default async function RecipeDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const userId = await requirePageUserId();
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const fromParam = Array.isArray(resolvedSearchParams.from)
    ? resolvedSearchParams.from[0]
    : resolvedSearchParams.from;
  const fallbackHref = fromParam === "bookmarks" ? "/bookmarks" : "/ai-recipe";

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    include: {
      recipeIngredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (!recipe) {
    notFound();
  }

  try {
    const now = new Date();
    const recentHistory = await prisma.history.findFirst({
      where: { userId, recipeId: recipe.id },
      orderBy: { viewedAt: "desc" },
      select: { id: true, viewedAt: true },
    });

    if (recentHistory) {
      const elapsedMs = now.getTime() - recentHistory.viewedAt.getTime();
      if (elapsedMs < 5 * 60 * 1000) {
        await prisma.history.update({
          where: { id: recentHistory.id },
          data: { viewedAt: now },
        });
      } else {
        await prisma.history.create({
          data: {
            userId,
            recipeId: recipe.id,
            viewedAt: now,
          },
        });
      }
    } else {
      await prisma.history.create({
        data: {
          userId,
          recipeId: recipe.id,
          viewedAt: now,
        },
      });
    }
  } catch (error) {
    console.error("Failed to record recipe history:", error);
  }

  const ingredientRows: RecipeIngredient[] = recipe.recipeIngredients.map((relation) => ({
    id: relation.id,
    name: relation.ingredient.name,
    amount: formatIngredientAmount(relation.quantity, relation.unit),
  }));

  const rawSteps = toStepArray(recipe.steps);
  const stepRows =
    rawSteps.length > 0 ? rawSteps : ["No instructions available for this recipe yet."];

  const baseNutrition = [
    { label: "Protein", value: recipe.protein ?? 0, barClassName: "bg-primary" },
    { label: "Carbs", value: recipe.carbs ?? 0, barClassName: "bg-secondary-dim" },
    { label: "Fats", value: recipe.fat ?? 0, barClassName: "bg-tertiary" },
    { label: "Fiber", value: recipe.fiber ?? 0, barClassName: "bg-outline-variant" },
  ];

  const maxBarValue = Math.max(...baseNutrition.map((item) => item.value), 1);
  const nutritionBars: NutritionBar[] = baseNutrition.map((item) => ({
    ...item,
    height: Math.max(10, Math.round((item.value / maxBarValue) * 100)),
  }));

  const estimatedCookTime = rawSteps.length > 0 ? rawSteps.length * 10 : null;
  const estimatedServings = ingredientRows.length > 0 ? Math.max(1, Math.ceil(ingredientRows.length / 2)) : null;

  return (
    <div className="min-h-screen bg-surface font-body leading-relaxed text-on-surface pb-32">
      <header className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-6 transition-all duration-300">
        <RecipeBackButton fallbackHref={fallbackHref} />
        <div className="flex gap-3">
          <RecipeBookmarkButton recipeId={id} />
          <button
            type="button"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg transition-transform active:scale-90"
          >
            <span className="material-symbols-outlined">share</span>
          </button>
        </div>
      </header>

      <main className="pb-24">
        <div className="relative h-[530px] w-full overflow-hidden">
          <img
            src={recipe.imageUrl ?? fallbackRecipeImage}
            alt={recipe.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>

        <div className="relative mx-auto -mt-20 max-w-screen-md px-6">
          <div className="rounded-xl bg-surface-container-lowest p-8 shadow-sm">
            <div className="mb-8 flex flex-col gap-4">
              <span className="inline-flex w-fit rounded-full bg-secondary-container px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-on-secondary-fixed-variant">
                Editorial Choice
              </span>
              <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
                {recipe.name}
              </h1>
              <p className="font-medium leading-relaxed text-on-surface-variant">
                {recipe.description ?? "No description available for this recipe."}
              </p>
              <span className="text-xs font-bold uppercase tracking-widest text-primary">
                Recipe ID: {id}
              </span>
            </div>

            <div className="mb-12 grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-4 text-center">
                <span className="material-symbols-outlined mb-2 text-primary">schedule</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Cook Time
                </span>
                <span className="font-headline text-lg font-bold">
                  {estimatedCookTime === null ? "N/A" : `${estimatedCookTime} min`}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-4 text-center">
                <span className="material-symbols-outlined mb-2 text-secondary">
                  local_fire_department
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Calories
                </span>
                <span className="font-headline text-lg font-bold">{recipe.calories ?? 0} kcal</span>
              </div>
              <div className="flex flex-col items-center justify-center rounded-xl bg-surface-container-low p-4 text-center">
                <span className="material-symbols-outlined mb-2 text-tertiary">groups</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Servings
                </span>
                <span className="font-headline text-lg font-bold">
                  {estimatedServings === null ? "N/A" : `${estimatedServings} pers`}
                </span>
              </div>
            </div>

            <section className="mb-12">
              <div className="mb-6 flex items-end justify-between">
                <h2 className="font-headline text-2xl font-bold">Nutrition Profile</h2>
                <span className="text-xs font-bold tracking-tight text-primary">
                  AI Verified Stats
                </span>
              </div>
              <div className="mb-4 grid h-32 grid-cols-4 items-end gap-2">
                {nutritionBars.map((bar) => (
                  <div key={bar.label} className="flex flex-col items-center gap-2">
                    <div
                      className={`w-full rounded-t-lg ${bar.barClassName}`}
                      style={{ height: `${bar.height}%` }}
                    />
                    <span className="text-[10px] font-bold text-on-surface-variant">
                      {bar.label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex justify-between border-b border-outline-variant/10 py-2">
                  <span className="text-sm font-medium text-on-surface-variant">Protein</span>
                  <span className="text-sm font-bold">{formatNumber(recipe.protein)} g</span>
                </div>
                <div className="flex justify-between border-b border-outline-variant/10 py-2">
                  <span className="text-sm font-medium text-on-surface-variant">Carbs</span>
                  <span className="text-sm font-bold">{formatNumber(recipe.carbs)} g</span>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="mb-6 font-headline text-2xl font-bold">Ingredients</h2>
              {ingredientRows.length > 0 ? (
                <div className="space-y-4">
                  {ingredientRows.map((ingredient) => (
                    <label
                      key={ingredient.id}
                      htmlFor={ingredient.id}
                      className="group flex cursor-pointer items-center gap-4"
                    >
                      <input
                        id={ingredient.id}
                        type="checkbox"
                        className="h-6 w-6 rounded-lg border-outline-variant text-primary focus:ring-0"
                      />
                      <div className="flex flex-1 justify-between">
                        <span className="text-on-surface transition-colors group-hover:text-primary">
                          {ingredient.name}
                        </span>
                        <span className="font-label text-sm tracking-wide text-on-surface-variant">
                          {ingredient.amount}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant">No ingredients available.</p>
              )}
            </section>

            <section>
              <h2 className="mb-6 font-headline text-2xl font-bold">Instructions</h2>
              <div className="space-y-8">
                {stepRows.map((step, index) => (
                  <div key={`${id}-step-${index + 1}`} className="flex gap-6">
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-headline font-bold ${
                        index === 0
                          ? "editorial-gradient text-white"
                          : "bg-surface-container-highest text-on-surface"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-2 font-bold">Step {index + 1}</h3>
                      <p className="text-sm leading-relaxed text-on-surface-variant">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <div className="fixed bottom-28 left-0 right-0 z-40 mx-auto max-w-screen-md px-6">
          <div className="glass-card flex items-center justify-between rounded-full border border-white/20 p-2 shadow-2xl">
            <div className="-space-x-2 ml-4 flex">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAglRuBBnsa1HLc-9O3rSIC5qibWR9MmqfHZx7K5I4SUQAbehW6_9i8oiInStmW8RuvRgR1DQaJx6CwUolKkeBuz29f8DIewmK4RGZwfmtIGjvY6iRUCqBJVqGQRhnzZ-3hu9fAAijKIf_5-Vcs0t2Hna0O490w6IWj-QXxJINkOorFVWz0V15FMpxDVCixVAnVwcmSimrMEMpRWTrtTUhHn-Td7ooDYYzKm6SoBhQH6toGYb0UTF8lRw4Qp9l99TkX4elG6NouFRHZ"
                alt="Chef"
                className="h-8 w-8 rounded-full border-2 border-white"
              />
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDX_wMaLAkqRRzfXVvOwdLbEvWal9ysm-v-vFnAaZt1HvnOEWrnRHOzTTAAfwJnRJYd-L7BwYiR3MAUlqgvVwIar7z8nXg1DqVTSyjLkNGSD0J6Ll-2jEsO1Z3itRMGu7GAeLo20FTdRwmV5kJUNqqWEgvmFxE1DRQpMLu0NfUjjiDrn28U5PeTwC7T_2URSgl0I1wXFA0eXBCjdd5q-WMZbQMQ886t0Wpq5MgWdRYwGghjG-WkPHP8HqrI01ukshqNSXJtzB8o_5BD"
                alt="Member"
                className="h-8 w-8 rounded-full border-2 border-white"
              />
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary-container text-[10px] font-bold text-on-primary-container">
                +4k
              </div>
            </div>
            <button
              type="button"
              className="flex items-center gap-2 rounded-full bg-primary px-8 py-3 font-headline font-bold text-on-primary shadow-lg shadow-primary/20 transition-transform active:scale-95"
            >
              <span className="material-symbols-outlined text-xl">restaurant</span>
              Start Cooking
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
