"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { detectTransfersSchema } from "../schemas/transaction.schema";

export const detectTransfersAction = actionClient
  .inputSchema(detectTransfersSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to detect transfers.");
      }

      // Get all transactions for the user (or specific account)
      const where: {
        userId: string;
        financialAccountId?: string;
        isTransfer: boolean;
      } = {
        userId: session.user.id,
        isTransfer: false, // Only check non-transfer transactions
      };

      if (parsedInput.accountId) {
        where.financialAccountId = parsedInput.accountId;
      }

      const transactions = await db.transaction.findMany({
        where,
        orderBy: {
          date: "desc",
        },
      });

      let detectedCount = 0;

      // Amount tolerance for matching (to handle floating point precision)
      const AMOUNT_TOLERANCE = 0.01;
      // Date tolerance: 1 day in milliseconds
      const DATE_TOLERANCE = 24 * 60 * 60 * 1000;

      // Track which transactions have been paired in this run
      const pairedTransactionIds = new Set<string>();

      // Compare all transactions with each other to find transfer pairs
      for (let i = 0; i < transactions.length; i++) {
        const t1 = transactions[i];

        // Skip if already marked as transfer or already paired in this run
        if (
          t1.isTransfer ||
          t1.transferPairId ||
          pairedTransactionIds.has(t1.id)
        ) {
          continue;
        }

        for (let j = i + 1; j < transactions.length; j++) {
          const t2 = transactions[j];

          // Skip if already marked as transfer or already paired in this run
          if (
            t2.isTransfer ||
            t2.transferPairId ||
            pairedTransactionIds.has(t2.id)
          ) {
            continue;
          }

          // Must be different accounts
          if (t1.financialAccountId === t2.financialAccountId) continue;

          // Must be opposite types (one DEBIT, one CREDIT)
          // Note: amounts are stored as absolute values, so we check the type field
          if (t1.type === t2.type) continue;

          // Check if absolute amounts match (within tolerance)
          const absAmount1 = Math.abs(t1.amount);
          const absAmount2 = Math.abs(t2.amount);
          const amountDiff = Math.abs(absAmount1 - absAmount2);
          if (amountDiff > AMOUNT_TOLERANCE) continue;

          // Check if dates are within tolerance (1 day)
          const dateDiff = Math.abs(t1.date.getTime() - t2.date.getTime());
          if (dateDiff > DATE_TOLERANCE) continue;

          // Mark as transfer pair
          await db.transaction.update({
            where: { id: t1.id },
            data: {
              isTransfer: true,
              type: "TRANSFER",
              transferPairId: t2.id,
            },
          });

          await db.transaction.update({
            where: { id: t2.id },
            data: {
              isTransfer: true,
              type: "TRANSFER",
              transferPairId: t1.id,
            },
          });

          // Track that these transactions are now paired
          pairedTransactionIds.add(t1.id);
          pairedTransactionIds.add(t2.id);

          detectedCount++;
          // Break inner loop since t1 is now paired
          break;
        }
      }

      return {
        success: true,
        detectedCount,
        toast: {
          message: "Transfer detection complete",
          type: "success",
          description: `Detected ${detectedCount} transfer pair(s)`,
        },
      };
    } catch (error) {
      console.error("Detect transfers error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to detect transfers. Please try again.",
      );
    }
  });
