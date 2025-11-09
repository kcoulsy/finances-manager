"use server";

import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";

/**
 * Gets the user's currency preference from their profile
 * @returns The user's currency code (defaults to "USD" if not set)
 */
export async function getUserCurrency(): Promise<string> {
  try {
    const session = await getSession();
    if (!session?.user) {
      return "USD";
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { currency: true },
    });

    return user?.currency || "USD";
  } catch (error) {
    console.error("Get user currency error:", error);
    return "USD";
  }
}

