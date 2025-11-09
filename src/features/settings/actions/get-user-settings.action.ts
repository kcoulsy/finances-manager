"use server";

import { z } from "zod";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";

export const getUserSettingsAction = actionClient
  .inputSchema(z.object({}))
  .action(async () => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to view settings.");
      }

      const user = await db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          currency: true,
        },
      });

      if (!user) {
        throw new Error("User not found.");
      }

      return {
        success: true,
        settings: {
          currency: user.currency || "USD",
        },
      };
    } catch (error) {
      console.error("Get user settings error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to retrieve settings. Please try again.",
      );
    }
  });
