"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { updateAccountSchema } from "../schemas/account.schema";

export const updateAccountAction = actionClient
  .inputSchema(updateAccountSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to update an account.");
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

      const updateData: {
        name?: string;
        type?: string;
        bankName?: string | null;
        accountNumber?: string | null;
        balance?: number;
        balanceAsOfDate?: Date | null;
        currency?: string;
        isActive?: boolean;
      } = {};

      if (parsedInput.name !== undefined) updateData.name = parsedInput.name;
      if (parsedInput.type !== undefined) updateData.type = parsedInput.type;
      if (parsedInput.bankName !== undefined)
        updateData.bankName = parsedInput.bankName || null;
      if (parsedInput.accountNumber !== undefined)
        updateData.accountNumber = parsedInput.accountNumber || null;
      if (parsedInput.balance !== undefined)
        updateData.balance = parsedInput.balance;
      if (parsedInput.balanceAsOfDate !== undefined)
        updateData.balanceAsOfDate = parsedInput.balanceAsOfDate || null;
      if (parsedInput.currency !== undefined)
        updateData.currency = parsedInput.currency;
      if (parsedInput.isActive !== undefined)
        updateData.isActive = parsedInput.isActive;

      const account = await db.financialAccount.update({
        where: { id: parsedInput.accountId },
        data: updateData,
      });

      return {
        success: true,
        account,
        toast: {
          message: "Account updated successfully",
          type: "success",
          description: `Account "${account.name}" has been updated`,
        },
      };
    } catch (error) {
      console.error("Update account error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update account. Please try again.",
      );
    }
  });

