import GroceryPageClient from "@/components/pages/GroceryPageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function GroceryPage() {
  await requirePageUserId();
  return <GroceryPageClient />;
}
