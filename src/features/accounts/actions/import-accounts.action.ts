"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { z } from "zod";
import { createAccountSchema } from "../schemas/account.schema";

export const importAccountsAction = actionClient
  .inputSchema(
    z.object({
      csvContent: z.string().min(1, "CSV content is required"),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to import accounts.");
      }

      // Parse CSV content
      const lines = parsedInput.csvContent.trim().split("\n");
      if (lines.length < 2) {
        throw new Error("CSV file must contain at least a header row and one data row.");
      }

      const headers = lines[0]!.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      const dataRows = lines.slice(1);

      // Expected headers
      const expectedHeaders = [
        "Name",
        "Type",
        "Bank Name",
        "Account Number",
        "Balance",
        "Balance As Of Date",
        "Currency",
        "Is Active",
      ];

      // Validate headers
      const headerMap: Record<string, number> = {};
      expectedHeaders.forEach((header) => {
        const index = headers.findIndex(
          (h) => h.toLowerCase() === header.toLowerCase(),
        );
        if (index === -1) {
          throw new Error(`Missing required column: ${header}`);
        }
        headerMap[header] = index;
      });

      let createdCount = 0;
      let updatedCount = 0;
      const errors: string[] = [];

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i]!;
        if (!row.trim()) continue;

        // Parse CSV row (handle quoted values)
        const values: string[] = [];
        let currentValue = "";
        let inQuotes = false;

        for (let j = 0; j < row.length; j++) {
          const char = row[j]!;
          if (char === '"') {
            if (inQuotes && row[j + 1] === '"') {
              currentValue += '"';
              j++; // Skip next quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === "," && !inQuotes) {
            values.push(currentValue.trim());
            currentValue = "";
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim());

        try {
          const name = values[headerMap["Name"]!] || "";
          const type = values[headerMap["Type"]!] || "";
          const bankName = values[headerMap["Bank Name"]!] || "";
          const accountNumber = values[headerMap["Account Number"]!] || "";
          const balanceStr = values[headerMap["Balance"]!] || "0";
          const balanceAsOfDateStr = values[headerMap["Balance As Of Date"]!] || "";
          const currency = values[headerMap["Currency"]!] || "USD";
          const isActiveStr = values[headerMap["Is Active"]!] || "true";

          if (!name) {
            errors.push(`Row ${i + 2}: Name is required`);
            continue;
          }

          const balance = parseFloat(balanceStr);
          if (Number.isNaN(balance)) {
            errors.push(`Row ${i + 2}: Invalid balance value`);
            continue;
          }

          const isActive = isActiveStr.toLowerCase() === "true";
          const balanceAsOfDate = balanceAsOfDateStr
            ? new Date(balanceAsOfDateStr)
            : null;

          // Validate account type
          const validTypes = ["CHECKING", "SAVINGS", "CREDIT", "INVESTMENT", "OTHER"];
          if (!validTypes.includes(type.toUpperCase())) {
            errors.push(`Row ${i + 2}: Invalid account type: ${type}`);
            continue;
          }

          // Check if account exists (by name and account number if provided)
          const existingAccount = await db.financialAccount.findFirst({
            where: {
              userId: session.user.id,
              name: name,
              ...(accountNumber ? { accountNumber } : {}),
            },
          });

          if (existingAccount) {
            // Update existing account
            await db.financialAccount.update({
              where: { id: existingAccount.id },
              data: {
                type: type.toUpperCase(),
                bankName: bankName || null,
                accountNumber: accountNumber || null,
                balance,
                balanceAsOfDate,
                currency,
                isActive,
              },
            });
            updatedCount++;
          } else {
            // Create new account
            await db.financialAccount.create({
              data: {
                name,
                type: type.toUpperCase(),
                bankName: bankName || null,
                accountNumber: accountNumber || null,
                balance,
                balanceAsOfDate,
                currency,
                isActive,
                userId: session.user.id,
              },
            });
            createdCount++;
          }
        } catch (rowError) {
          errors.push(
            `Row ${i + 2}: ${rowError instanceof Error ? rowError.message : "Unknown error"}`,
          );
        }
      }

      const messageParts: string[] = [];
      if (createdCount > 0) {
        messageParts.push(`${createdCount} created`);
      }
      if (updatedCount > 0) {
        messageParts.push(`${updatedCount} updated`);
      }
      if (errors.length > 0) {
        messageParts.push(`${errors.length} errors`);
      }

      return {
        success: true,
        createdCount,
        updatedCount,
        errorCount: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        message: messageParts.length > 0 ? messageParts.join(", ") : "No accounts processed",
      };
    } catch (error) {
      console.error("Import accounts error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to import accounts. Please try again.",
      );
    }
  });

