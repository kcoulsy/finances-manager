"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { z } from "zod";

export const exportAccountsAction = actionClient
  .inputSchema(z.object({}))
  .action(async () => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to export accounts.");
      }

      const accounts = await db.financialAccount.findMany({
        where: {
          userId: session.user.id,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      // Convert accounts to CSV format
      const headers = [
        "Name",
        "Type",
        "Bank Name",
        "Account Number",
        "Balance",
        "Balance As Of Date",
        "Currency",
        "Is Active",
      ];

      const rows = accounts.map((account) => [
        account.name,
        account.type,
        account.bankName || "",
        account.accountNumber || "",
        account.balance.toString(),
        account.balanceAsOfDate
          ? account.balanceAsOfDate.toISOString().split("T")[0]
          : "",
        account.currency,
        account.isActive ? "true" : "false",
      ]);

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
        filename: `accounts-export-${new Date().toISOString().split("T")[0]}.csv`,
      };
    } catch (error) {
      console.error("Export accounts error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to export accounts. Please try again.",
      );
    }
  });

