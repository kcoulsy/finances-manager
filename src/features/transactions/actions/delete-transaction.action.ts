"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteTransactionSchema } from "../schemas/transaction.schema";

export const deleteTransactionAction = actionClient
  .inputSchema(deleteTransactionSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to delete a transaction.");
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
        throw new Error("You don't have permission to delete this transaction.");
      }

      // Revert account balance
      const balanceChange =
        existingTransaction.type === "DEBIT"
          ? -existingTransaction.amount
          : existingTransaction.amount;

      await db.financialAccount.update({
        where: { id: existingTransaction.financialAccountId },
        data: {
          balance: {
            decrement: balanceChange,
          },
        },
      });

      // If it's a transfer, also handle the paired transaction
      if (existingTransaction.isTransfer && existingTransaction.transferPairId) {
        const pairedTransaction = await db.transaction.findUnique({
          where: { id: existingTransaction.transferPairId },
        });

        if (pairedTransaction) {
          const pairedBalanceChange =
            pairedTransaction.type === "DEBIT"
              ? -pairedTransaction.amount
              : pairedTransaction.amount;

          await db.financialAccount.update({
            where: { id: pairedTransaction.financialAccountId },
            data: {
              balance: {
                decrement: pairedBalanceChange,
              },
            },
          });

          // Remove transfer pairing
          await db.transaction.update({
            where: { id: existingTransaction.transferPairId },
            data: {
              isTransfer: false,
              transferPairId: null,
            },
          });
        }
      }

      await db.transaction.delete({
        where: { id: parsedInput.transactionId },
      });

      return {
        success: true,
        toast: {
          message: "Transaction deleted successfully",
          type: "success",
        },
      };
    } catch (error) {
      console.error("Delete transaction error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to delete transaction. Please try again.",
      );
    }
  });

