"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { updateCurrencySchema } from "../schemas/settings.schema";

export const updateCurrencyAction = actionClient
  .inputSchema(updateCurrencySchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error(
          "You must be signed in to update your currency preference.",
        );
      }

      const user = await db.user.update({
        where: { id: session.user.id },
        data: {
          currency: parsedInput.currency,
        },
      });

      return {
        success: true,
        user,
        toast: {
          message: "Currency preference updated",
          type: "success",
          description: `Default currency set to ${parsedInput.currency}`,
        },
      };
    } catch (error) {
      console.error("Update currency error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update currency preference. Please try again.",
      );
    }
  });
