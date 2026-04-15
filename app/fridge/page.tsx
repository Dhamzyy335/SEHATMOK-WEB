import FridgePageClient from "@/components/pages/FridgePageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function FridgePage() {
  await requirePageUserId();
  return <FridgePageClient />;
}
