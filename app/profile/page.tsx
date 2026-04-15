import ProfilePageClient from "@/components/pages/ProfilePageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function ProfilePage() {
  await requirePageUserId();
  return <ProfilePageClient />;
}
