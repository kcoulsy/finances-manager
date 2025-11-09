"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteAccountSchema } from "../schemas/account.schema";

export const deleteAccountAction = actionClient
  .inputSchema(deleteAccountSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to delete an account.");
      }

      // Verify account belongs to user
      const existingAccount = await db.financialAccount.findUnique({
        where: { id: parsedInput.accountId },
      });

      if (!existingAccount) {
        throw new Error("Account not found.");
      }

      if (existingAccount.userId !== session.user.id) {
        throw new Error("You don't have permission to delete this account.");
      }

      await db.financialAccount.delete({
        where: { id: parsedInput.accountId },
      });

      return {
        success: true,
        toast: {
          message: "Account deleted successfully",
          type: "success",
          description: `Account "${existingAccount.name}" has been deleted`,
        },
      };
    } catch (error) {
      console.error("Delete account error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to delete account. Please try again.",
      );
    }
  });

