"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { updateTransactionSchema } from "../schemas/transaction.schema";

export const updateTransactionAction = actionClient
  .inputSchema(updateTransactionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to update a transaction.");
      }

      // Verify transaction belongs to user
      const existingTransaction = await db.transaction.findUnique({
        where: { id: parsedInput.transactionId },
        include: {
          financialAccount: true,
        },
      });

      if (!existingTransaction) {
        throw new Error("Transaction not found.");
      }

      if (existingTransaction.userId !== session.user.id) {
        throw new Error("You don't have permission to update this transaction.");
      }

      // If amount or type changed, update account balance
      let balanceChange = 0;
      if (
        parsedInput.amount !== undefined ||
        parsedInput.type !== undefined
      ) {
        const oldBalanceChange =
          existingTransaction.type === "DEBIT"
            ? -existingTransaction.amount
            : existingTransaction.amount;

        const newType = parsedInput.type ?? existingTransaction.type;
        const newAmount = parsedInput.amount ?? existingTransaction.amount;
        const newBalanceChange =
          newType === "DEBIT" ? -newAmount : newAmount;

        balanceChange = newBalanceChange - oldBalanceChange;
      }

      // If account changed, update both accounts
      if (parsedInput.financialAccountId) {
        if (parsedInput.financialAccountId !== existingTransaction.financialAccountId) {
          // Verify new account belongs to user
          const newAccount = await db.financialAccount.findUnique({
            where: { id: parsedInput.financialAccountId },
          });

          if (!newAccount || newAccount.userId !== session.user.id) {
            throw new Error("You don't have permission to use this account.");
          }

          // Revert old account balance
          const oldBalanceChange =
            existingTransaction.type === "DEBIT"
              ? -existingTransaction.amount
              : existingTransaction.amount;

          await db.financialAccount.update({
            where: { id: existingTransaction.financialAccountId },
            data: {
              balance: {
                decrement: oldBalanceChange,
              },
            },
          });

          // Update new account balance
          const newType = parsedInput.type ?? existingTransaction.type;
          const newAmount = parsedInput.amount ?? existingTransaction.amount;
          const newBalanceChange =
            newType === "DEBIT" ? -newAmount : newAmount;

          await db.financialAccount.update({
            where: { id: parsedInput.financialAccountId },
            data: {
              balance: {
                increment: newBalanceChange,
              },
            },
          });
        }
      } else if (balanceChange !== 0) {
        // Update balance on same account
        await db.financialAccount.update({
          where: { id: existingTransaction.financialAccountId },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }

      const updateData: {
        date?: Date;
        amount?: number;
        description?: string;
        type?: string;
        categoryId?: string | null;
        financialAccountId?: string;
        notes?: string | null;
        tags?: string | null;
      } = {};

      if (parsedInput.date !== undefined) updateData.date = parsedInput.date;
      if (parsedInput.amount !== undefined)
        updateData.amount = parsedInput.amount;
      if (parsedInput.description !== undefined)
        updateData.description = parsedInput.description;
      if (parsedInput.type !== undefined) updateData.type = parsedInput.type;
      if (parsedInput.categoryId !== undefined)
        updateData.categoryId = parsedInput.categoryId || null;
      if (parsedInput.financialAccountId !== undefined)
        updateData.financialAccountId = parsedInput.financialAccountId;
      if (parsedInput.notes !== undefined)
        updateData.notes = parsedInput.notes || null;
      if (parsedInput.tags !== undefined)
        updateData.tags =
          parsedInput.tags && parsedInput.tags.length > 0
            ? JSON.stringify(parsedInput.tags)
            : null;

      const transaction = await db.transaction.update({
        where: { id: parsedInput.transactionId },
        data: updateData,
        include: {
          financialAccount: true,
          category: true,
        },
      });

      return {
        success: true,
        transaction,
        toast: {
          message: "Transaction updated successfully",
          type: "success",
          description: `Transaction "${transaction.description}" has been updated`,
        },
      };
    } catch (error) {
      console.error("Update transaction error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update transaction. Please try again.",
      );
    }
  });

