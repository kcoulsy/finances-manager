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

      // Group transactions by date and amount (potential transfers)
      const potentialTransfers = new Map<
        string,
        Array<{ id: string; accountId: string; date: Date; amount: number }>
      >();

      for (const transaction of transactions) {
        // Create a key based on date (same day) and absolute amount
        const dateKey = transaction.date.toISOString().split("T")[0];
        const amountKey = Math.abs(transaction.amount).toFixed(2);
        const key = `${dateKey}_${amountKey}`;

        if (!potentialTransfers.has(key)) {
          potentialTransfers.set(key, []);
        }

        potentialTransfers.get(key)!.push({
          id: transaction.id,
          accountId: transaction.financialAccountId,
          date: transaction.date,
          amount: transaction.amount,
        });
      }

      // Find pairs where:
      // 1. Same absolute amount
      // 2. Same date (or within 1 day)
      // 3. Different accounts
      // 4. One is DEBIT, one is CREDIT (or both are opposite signs)
      for (const [key, group] of potentialTransfers.entries()) {
        if (group.length < 2) continue;

        // Try to find pairs
        for (let i = 0; i < group.length; i++) {
          for (let j = i + 1; j < group.length; j++) {
            const t1 = group[i];
            const t2 = group[j];

            // Must be different accounts
            if (t1.accountId === t2.accountId) continue;

            // Must be opposite signs (one positive, one negative)
            if (Math.sign(t1.amount) === Math.sign(t2.amount)) continue;

            // Check if dates are within 1 day
            const dateDiff = Math.abs(
              t1.date.getTime() - t2.date.getTime(),
            );
            if (dateDiff > 24 * 60 * 60 * 1000) continue; // More than 1 day

            // Check if already paired
            const existingT1 = await db.transaction.findUnique({
              where: { id: t1.id },
            });
            const existingT2 = await db.transaction.findUnique({
              where: { id: t2.id },
            });

            if (
              existingT1?.isTransfer ||
              existingT2?.isTransfer ||
              existingT1?.transferPairId ||
              existingT2?.transferPairId
            ) {
              continue;
            }

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

            detectedCount++;
          }
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

