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

      // Build base where conditions
      const baseWhere: {
        userId: string;
        financialAccountId?: string | { in: string[] };
        date?: { gte?: Date; lte?: Date };
        type?: string;
        isTransfer?: boolean;
      } = {
        userId: session.user.id,
      };

      if (parsedInput.accountId) {
        // Handle both single account ID and array of account IDs
        if (Array.isArray(parsedInput.accountId)) {
          if (parsedInput.accountId.length > 0) {
            baseWhere.financialAccountId = { in: parsedInput.accountId };
          }
        } else {
          baseWhere.financialAccountId = parsedInput.accountId;
        }
      }

      if (parsedInput.startDate || parsedInput.endDate) {
        baseWhere.date = {};
        if (parsedInput.startDate) {
          baseWhere.date.gte = parsedInput.startDate;
        }
        if (parsedInput.endDate) {
          baseWhere.date.lte = parsedInput.endDate;
        }
      }

      if (parsedInput.type) {
        baseWhere.type = parsedInput.type;
      }

      if (parsedInput.isTransfer !== undefined) {
        baseWhere.isTransfer = parsedInput.isTransfer;
      }

      // Handle categoryId with support for uncategorized
      let where: typeof baseWhere & {
        categoryId?: string | null | { in: string[] };
        OR?: Array<{ categoryId: null } | { categoryId: { in: string[] } }>;
      };

      if (parsedInput.categoryId) {
        // Handle both single category ID and array of category IDs
        // Special value "__uncategorized__" means filter for null categoryId
        if (Array.isArray(parsedInput.categoryId)) {
          if (parsedInput.categoryId.length > 0) {
            const hasUncategorized =
              parsedInput.categoryId.includes("__uncategorized__");
            const regularCategoryIds = parsedInput.categoryId.filter(
              (id) => id !== "__uncategorized__",
            );

            if (hasUncategorized && regularCategoryIds.length > 0) {
              // Both uncategorized and regular categories: use OR condition at top level
              where = {
                ...baseWhere,
                OR: [
                  { ...baseWhere, categoryId: null },
                  { ...baseWhere, categoryId: { in: regularCategoryIds } },
                ],
              };
            } else if (hasUncategorized) {
              // Only uncategorized: filter for null
              where = {
                ...baseWhere,
                categoryId: null,
              };
            } else if (regularCategoryIds.length > 0) {
              // Only regular categories
              where = {
                ...baseWhere,
                categoryId: { in: regularCategoryIds },
              };
            } else {
              where = baseWhere;
            }
          } else {
            where = baseWhere;
          }
        } else if (parsedInput.categoryId === "__uncategorized__") {
          where = {
            ...baseWhere,
            categoryId: null,
          };
        } else {
          where = {
            ...baseWhere,
            categoryId: parsedInput.categoryId,
          };
        }
      } else {
        where = baseWhere;
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
