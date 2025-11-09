"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { setBalanceAsOfDateSchema } from "../schemas/account.schema";

export const setBalanceAsOfDateAction = actionClient
  .inputSchema(setBalanceAsOfDateSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to update an account balance.");
      }

      // Verify account belongs to user
      const existingAccount = await db.financialAccount.findUnique({
        where: { id: parsedInput.accountId },
      });

      if (!existingAccount) {
        throw new Error("Account not found.");
      }

      if (existingAccount.userId !== session.user.id) {
        throw new Error("You don't have permission to update this account.");
      }

      const account = await db.financialAccount.update({
        where: { id: parsedInput.accountId },
        data: {
          balance: parsedInput.balance,
          balanceAsOfDate: parsedInput.balanceAsOfDate,
        },
      });

      return {
        success: true,
        account,
        toast: {
          message: "Balance updated successfully",
          type: "success",
          description: `Balance for "${account.name}" set to ${new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: account.currency || "USD",
          }).format(parsedInput.balance)} as of ${parsedInput.balanceAsOfDate.toLocaleDateString()}`,
        },
      };
    } catch (error) {
      console.error("Set balance as of date error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update account balance. Please try again.",
      );
    }
  });

