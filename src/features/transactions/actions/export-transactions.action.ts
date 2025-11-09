"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { z } from "zod";

export const exportTransactionsAction = actionClient
  .inputSchema(z.object({}))
  .action(async () => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to export transactions.");
      }

      // Fetch all transactions for the user
      const transactions = await db.transaction.findMany({
        where: {
          userId: session.user.id,
        },
        include: {
          financialAccount: {
            select: {
              name: true,
              accountNumber: true,
            },
          },
          category: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          date: "desc",
        },
      });

      // Convert transactions to CSV format
      const headers = [
        "Date",
        "Account",
        "Account Number",
        "Description",
        "Amount",
        "Type",
        "Category",
        "Is Transfer",
        "Notes",
        "Tags",
        "External ID",
        "Import Source",
        "Imported At",
      ];

      const rows = transactions.map((transaction) => {
        // Parse tags from JSON string if present
        let tagsStr = "";
        if (transaction.tags) {
          try {
            const tags = typeof transaction.tags === "string" 
              ? JSON.parse(transaction.tags) 
              : transaction.tags;
            tagsStr = Array.isArray(tags) ? tags.join("; ") : "";
          } catch {
            tagsStr = "";
          }
        }

        return [
          transaction.date.toISOString().split("T")[0], // Date in YYYY-MM-DD format
          transaction.financialAccount.name,
          transaction.financialAccount.accountNumber || "",
          transaction.description,
          transaction.amount.toString(),
          transaction.type,
          transaction.category?.name || "",
          transaction.isTransfer ? "true" : "false",
          transaction.notes || "",
          tagsStr,
          transaction.externalId || "",
          transaction.importSource || "",
          transaction.importedAt
            ? transaction.importedAt.toISOString().split("T")[0]
            : "",
        ];
      });

      const csvContent = [
        headers.join(","),
        ...rows.map((row) =>
          row.map((cell) => {
            // Escape commas and quotes in CSV
            const cellStr = String(cell);
            if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(","),
        ),
      ].join("\n");

      return {
        success: true,
        csvContent,
        filename: `transactions-export-${new Date().toISOString().split("T")[0]}.csv`,
      };
    } catch (error) {
      console.error("Export transactions error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to export transactions. Please try again.",
      );
    }
  });

