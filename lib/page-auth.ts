import { redirect } from "next/navigation";
import { UnauthorizedError, requireUserId } from "@/lib/auth";

export const requirePageUserId = async (): Promise<string> => {
  try {
    return await requireUserId();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/login");
    }

    throw error;
  }
};
