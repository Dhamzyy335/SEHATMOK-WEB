import RecipesPageClient from "@/components/pages/RecipesPageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function RecipesPage() {
  await requirePageUserId();
  return <RecipesPageClient />;
}
