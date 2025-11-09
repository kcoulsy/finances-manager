"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { bulkUpdateTransactionsSchema } from "../schemas/transaction.schema";

export const bulkUpdateTransactionsAction = actionClient
  .inputSchema(bulkUpdateTransactionsSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to update transactions.");
      }

      // Validate that either transactionIds or filters is provided
      const hasTransactionIds =
        parsedInput.transactionIds && parsedInput.transactionIds.length > 0;
      const hasFilters = parsedInput.filters !== undefined;
      if (!hasTransactionIds && !hasFilters) {
        throw new Error("Either transactionIds or filters must be provided.");
      }

      // Build where clause based on transactionIds or filters
      const where: {
        userId: string;
        id?: { in: string[] };
        financialAccountId?: string;
        categoryId?: string | null;
        type?: string;
        isTransfer?: boolean;
        date?: { gte?: Date; lte?: Date };
      } = {
        userId: session.user.id,
      };

      if (parsedInput.transactionIds && parsedInput.transactionIds.length > 0) {
        // Update specific transactions by ID
        where.id = { in: parsedInput.transactionIds };
      } else if (parsedInput.filters) {
        // Update all transactions matching filters
        if (parsedInput.filters.accountId) {
          where.financialAccountId = parsedInput.filters.accountId;
        }
        if (parsedInput.filters.categoryId !== undefined) {
          where.categoryId = parsedInput.filters.categoryId || null;
        }
        if (parsedInput.filters.type) {
          where.type = parsedInput.filters.type;
        }
        if (parsedInput.filters.isTransfer !== undefined) {
          where.isTransfer = parsedInput.filters.isTransfer;
        }
        if (parsedInput.filters.startDate || parsedInput.filters.endDate) {
          where.date = {};
          if (parsedInput.filters.startDate) {
            where.date.gte = parsedInput.filters.startDate;
          }
          if (parsedInput.filters.endDate) {
            where.date.lte = parsedInput.filters.endDate;
          }
        }
      } else {
        throw new Error("Either transactionIds or filters must be provided.");
      }

      // If categoryId is provided, verify it exists and belongs to user (or is default)
      if (parsedInput.categoryId !== undefined) {
        if (parsedInput.categoryId) {
          const category = await db.category.findUnique({
            where: { id: parsedInput.categoryId },
          });

          if (!category) {
            throw new Error("Category not found.");
          }

          // Category must be default or belong to user
          if (!category.isDefault && category.userId !== session.user.id) {
            throw new Error("You don't have permission to use this category.");
          }
        }
      }

      // Bulk update transactions
      const updateData: {
        categoryId?: string | null;
      } = {};

      if (parsedInput.categoryId !== undefined) {
        updateData.categoryId = parsedInput.categoryId || null;
      }

      const result = await db.transaction.updateMany({
        where,
        data: updateData,
      });

      return {
        success: true,
        updatedCount: result.count,
        toast: {
          message: "Transactions updated successfully",
          type: "success",
          description: `Updated ${result.count} transaction(s)`,
        },
      };
    } catch (error) {
      console.error("Bulk update transactions error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update transactions. Please try again.",
      );
    }
  });
