import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import TopAppBar from "@/components/TopAppBar";
import { requirePageUserId } from "@/lib/page-auth";
import { prisma } from "@/lib/prisma";

type HistoryRecipe = {
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

export default async function HistoryPage() {
  const userId = await requirePageUserId();

  const historyEntries = await prisma.history.findMany({
    where: { userId },
    orderBy: { viewedAt: "desc" },
    take: 20,
    select: {
      recipe: {
        select: {
          id: true,
          name: true,
          description: true,
          imageUrl: true,
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
        },
      },
    },
  });

  const recipes = historyEntries
    .map((entry) => entry.recipe)
    .filter((recipe): recipe is HistoryRecipe => recipe !== null);

  return (
    <div className="min-h-screen bg-surface font-body text-on-surface pb-32">
      <TopAppBar title="Recently Viewed" />

      <main className="mx-auto max-w-screen-xl space-y-6 px-6 py-4">
        <div className="flex items-center gap-4">
          <Link
            href="/profile"
            aria-label="Back to Profile"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-on-surface shadow-lg transition-transform hover:bg-white active:scale-90"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h2 className="font-headline text-2xl font-bold">Recently Viewed</h2>
            <p className="text-sm text-on-surface-variant">
              Your latest recipe visits, all in one place.
            </p>
          </div>
        </div>

        {recipes.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6">
            <p className="text-sm font-medium text-on-surface-variant">
              No recently viewed recipes yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recipes.map((recipe) => (
              <Link
                key={recipe.id}
                href={`/recipes/${recipe.id}`}
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
