import MealPlansPageClient from "@/components/pages/MealPlansPageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function MealPlansPage() {
  await requirePageUserId();
  return <MealPlansPageClient />;
}
