import { redirect } from "next/navigation";
import { verifyJwtFromCookies } from "@/lib/auth";

export const requirePageUserId = async (): Promise<string> => {
  const userId = await verifyJwtFromCookies();
  if (!userId) {
    redirect("/login");
  }
  return userId;
};
