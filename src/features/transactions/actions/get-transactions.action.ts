"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getTransactionsSchema } from "../schemas/transaction.schema";

export const getTransactionsAction = actionClient
  .inputSchema(getTransactionsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to view transactions.");
      }

      const where: {
        userId: string;
        financialAccountId?: string;
        categoryId?: string | null;
        date?: { gte?: Date; lte?: Date };
        type?: string;
        isTransfer?: boolean;
      } = {
        userId: session.user.id,
      };

      if (parsedInput.accountId) {
        where.financialAccountId = parsedInput.accountId;
      }

      if (parsedInput.categoryId) {
        where.categoryId = parsedInput.categoryId;
      }

      if (parsedInput.startDate || parsedInput.endDate) {
        where.date = {};
        if (parsedInput.startDate) {
          where.date.gte = parsedInput.startDate;
        }
        if (parsedInput.endDate) {
          where.date.lte = parsedInput.endDate;
        }
      }

      if (parsedInput.type) {
        where.type = parsedInput.type;
      }

      if (parsedInput.isTransfer !== undefined) {
        where.isTransfer = parsedInput.isTransfer;
      }

      const [transactions, total] = await Promise.all([
        db.transaction.findMany({
          where,
          include: {
            financialAccount: {
              select: {
                id: true,
                name: true,
                currency: true,
              },
            },
            category: true,
            transferPair: true,
          },
          orderBy: {
            date: "desc",
          },
          take: parsedInput.limit,
          skip: parsedInput.offset,
        }),
        db.transaction.count({ where }),
      ]);

      return {
        success: true,
        transactions,
        total,
      };
    } catch (error) {
      console.error("Get transactions error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to retrieve transactions. Please try again.",
      );
    }
  });

