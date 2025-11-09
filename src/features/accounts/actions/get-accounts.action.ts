"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { z } from "zod";

export const getAccountsAction = actionClient
  .inputSchema(z.object({}))
  .action(async () => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to view accounts.");
      }

      const accounts = await db.financialAccount.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return {
        success: true,
        accounts,
      };
    } catch (error) {
      console.error("Get accounts error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to retrieve accounts. Please try again.",
      );
    }
  });

