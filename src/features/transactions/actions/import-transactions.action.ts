"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { importTransactionsSchema } from "../schemas/transaction.schema";

export const importTransactionsAction = actionClient
  .inputSchema(importTransactionsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to import transactions.");
      }

      // Verify account belongs to user
      const account = await db.financialAccount.findUnique({
        where: { id: parsedInput.accountId },
      });

      if (!account) {
        throw new Error("Account not found.");
      }

      if (account.userId !== session.user.id) {
        throw new Error("You don't have permission to import transactions to this account.");
      }

      const now = new Date();
      let createdCount = 0;
      let updatedCount = 0;
      let balanceUpdate = 0;

      // Process transactions
      for (const txData of parsedInput.transactions) {
        // Determine transaction type based on amount
        const type = txData.amount < 0 ? "DEBIT" : "CREDIT";
        const amount = Math.abs(txData.amount);

        // Check if transaction already exists (by externalId or date+amount+description)
        const whereConditions: Array<{
          externalId?: string;
          date?: Date;
          amount?: number;
          description?: string;
        }> = [];

        if (txData.externalId) {
          whereConditions.push({ externalId: txData.externalId });
        }

        whereConditions.push({
          date: txData.date,
          amount: amount,
          description: txData.description,
        });

        const existing = await db.transaction.findFirst({
          where: {
            financialAccountId: parsedInput.accountId,
            OR: whereConditions,
          },
        });

        if (existing) {
          // Update existing transaction
          const oldType = existing.type;
          const oldAmount = existing.amount;
          const oldBalanceChange = oldType === "DEBIT" ? -oldAmount : oldAmount;
          const newBalanceChange = type === "DEBIT" ? -amount : amount;

          // Revert old balance change and apply new one
          balanceUpdate += -oldBalanceChange + newBalanceChange;

          await db.transaction.update({
            where: { id: existing.id },
            data: {
              date: txData.date,
              amount,
              description: txData.description,
              type,
              importedAt: now,
              importSource: "CSV",
              externalId: txData.externalId || existing.externalId,
            },
          });

          updatedCount++;
        } else {
          // Create new transaction
          await db.transaction.create({
            data: {
              date: txData.date,
              amount,
              description: txData.description,
              type,
              financialAccountId: parsedInput.accountId,
              userId: session.user.id,
              importedAt: now,
              importSource: "CSV",
              externalId: txData.externalId || null,
            },
          });

          // Update balance
          const balanceChange = type === "DEBIT" ? -amount : amount;
          balanceUpdate += balanceChange;
          createdCount++;
        }
      }

      // Update account balance
      if (balanceUpdate !== 0) {
        await db.financialAccount.update({
          where: { id: parsedInput.accountId },
          data: {
            balance: {
              increment: balanceUpdate,
            },
          },
        });
      }

      const totalProcessed = createdCount + updatedCount;
      const messageParts: string[] = [];
      if (createdCount > 0) {
        messageParts.push(`${createdCount} created`);
      }
      if (updatedCount > 0) {
        messageParts.push(`${updatedCount} updated`);
      }

      return {
        success: true,
        createdCount,
        updatedCount,
        toast: {
          message: "Transactions imported successfully",
          type: "success",
          description: `Processed ${totalProcessed} transaction(s)${
            messageParts.length > 0 ? ` (${messageParts.join(", ")})` : ""
          }`,
        },
      };
    } catch (error) {
      console.error("Import transactions error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to import transactions. Please try again.",
      );
    }
  });

