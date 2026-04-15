import AiRecipePageClient from "@/components/pages/AiRecipePageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function AiRecipePage() {
  await requirePageUserId();
  return <AiRecipePageClient />;
}
