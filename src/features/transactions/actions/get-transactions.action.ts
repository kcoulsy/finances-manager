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

      // Fetch all transactions first (we'll filter by tags in application layer)
      let [transactions, total] = await Promise.all([
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
          // Only apply limit/offset if getAll is not true
          ...(parsedInput.getAll
            ? {}
            : {
                take: parsedInput.limit ?? 100,
                skip: parsedInput.offset,
              }),
        }),
        db.transaction.count({ where }),
      ]);

      // Filter by tags if provided (tags are stored as JSON string)
      if (parsedInput.tags && parsedInput.tags.length > 0) {
        transactions = transactions.filter((tx) => {
          if (!tx.tags) return false;
          try {
            const txTags: string[] = JSON.parse(tx.tags);
            // Transaction must have all specified tags
            return parsedInput.tags!.every((tag) => txTags.includes(tag));
          } catch {
            return false;
          }
        });
        // Recalculate total after tag filtering
        if (parsedInput.getAll) {
          total = transactions.length;
        } else {
          // For paginated queries, we need to fetch all and count
          const allTransactions = await db.transaction.findMany({
            where,
            select: { id: true, tags: true },
          });
          const filtered = allTransactions.filter((tx) => {
            if (!tx.tags) return false;
            try {
              const txTags: string[] = JSON.parse(tx.tags);
              return parsedInput.tags!.every((tag) => txTags.includes(tag));
            } catch {
              return false;
            }
          });
          total = filtered.length;
        }
      }

      // Parse tags JSON for each transaction
      const transactionsWithParsedTags = transactions.map((tx) => ({
        ...tx,
        tags: tx.tags ? (JSON.parse(tx.tags) as string[]) : null,
      }));

      return {
        success: true,
        transactions: transactionsWithParsedTags,
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
