"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createTransactionSchema } from "../schemas/transaction.schema";

export const createTransactionAction = actionClient
  .inputSchema(createTransactionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to create a transaction.");
      }

      // Verify account belongs to user
      const account = await db.financialAccount.findUnique({
        where: { id: parsedInput.financialAccountId },
      });

      if (!account) {
        throw new Error("Account not found.");
      }

      if (account.userId !== session.user.id) {
        throw new Error("You don't have permission to add transactions to this account.");
      }

      // Update account balance
      const balanceChange =
        parsedInput.type === "DEBIT"
          ? -parsedInput.amount
          : parsedInput.amount;

      await db.financialAccount.update({
        where: { id: parsedInput.financialAccountId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      const transaction = await db.transaction.create({
        data: {
          date: parsedInput.date,
          amount: parsedInput.amount,
          description: parsedInput.description,
          type: parsedInput.type,
          categoryId: parsedInput.categoryId || null,
          financialAccountId: parsedInput.financialAccountId,
          userId: session.user.id,
          notes: parsedInput.notes || null,
          tags:
            parsedInput.tags && parsedInput.tags.length > 0
              ? JSON.stringify(parsedInput.tags)
              : null,
        },
        include: {
          financialAccount: true,
          category: true,
        },
      });

      return {
        success: true,
        transaction,
        toast: {
          message: "Transaction created successfully",
          type: "success",
          description: `Transaction "${transaction.description}" has been added`,
        },
      };
    } catch (error) {
      console.error("Create transaction error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to create transaction. Please try again.",
      );
    }
  });

