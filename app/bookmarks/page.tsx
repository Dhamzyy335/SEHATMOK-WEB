import BookmarksPageClient from "@/components/pages/BookmarksPageClient";
import { requirePageUserId } from "@/lib/page-auth";

export default async function BookmarksPage() {
  await requirePageUserId();
  return <BookmarksPageClient />;
}
