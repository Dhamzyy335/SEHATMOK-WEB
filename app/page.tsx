import DashboardPageClient from "@/components/pages/DashboardPageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function HomePage() {
  await requirePageUserId();
  return <DashboardPageClient />;
}
