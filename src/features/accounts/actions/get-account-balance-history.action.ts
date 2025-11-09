"use server";

import { z } from "zod";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";

export const getAccountBalanceHistoryAction = actionClient
  .inputSchema(
    z.object({
      accountId: z.string().min(1, "Account ID is required"),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error(
          "You must be signed in to view account balance history.",
        );
      }

      // Verify account belongs to user
      const account = await db.financialAccount.findUnique({
        where: { id: parsedInput.accountId },
      });

      if (!account) {
        throw new Error("Account not found.");
      }

      if (account.userId !== session.user.id) {
        throw new Error("You don't have permission to view this account.");
      }

      // Get all transactions for this account, ordered by date
      const transactions = await db.transaction.findMany({
        where: {
          financialAccountId: parsedInput.accountId,
        },
        orderBy: {
          date: "asc",
        },
      });

      // Calculate balance over time
      const balanceHistory: Array<{
        date: Date;
        balance: number;
        transactionId?: string;
        transactionDescription?: string;
      }> = [];

      // Separate transactions before and after balance as of date
      const balanceAsOf = account.balanceAsOfDate
        ? new Date(account.balanceAsOfDate)
        : null;

      const transactionsBefore = balanceAsOf
        ? transactions.filter((tx: { date: Date }) => tx.date <= balanceAsOf)
        : [];
      const transactionsAfter = balanceAsOf
        ? transactions.filter((tx: { date: Date }) => tx.date > balanceAsOf)
        : transactions;

      // Calculate starting balance by working backwards from balance as of date
      let startingBalance = balanceAsOf ? account.balance : 0;

      // Work backwards: subtract transactions that happened before the balance as of date
      // (in reverse chronological order)
      const transactionsBeforeReversed = [...transactionsBefore].reverse();
      for (const tx of transactionsBeforeReversed) {
        const balanceChange = tx.type === "DEBIT" ? -tx.amount : tx.amount;
        startingBalance -= balanceChange;
      }

      // Build history starting from the earliest transaction
      let runningBalance = startingBalance;

      // Add transactions before balance as of date (in chronological order)
      for (const tx of transactionsBefore) {
        const balanceChange = tx.type === "DEBIT" ? -tx.amount : tx.amount;
        runningBalance += balanceChange;

        balanceHistory.push({
          date: tx.date,
          balance: runningBalance,
          transactionId: tx.id,
          transactionDescription: tx.description,
        });
      }

      // Add balance as of date point if it exists
      if (balanceAsOf) {
        balanceHistory.push({
          date: balanceAsOf,
          balance: account.balance,
        });
      }

      // Add transactions after balance as of date
      for (const tx of transactionsAfter) {
        const balanceChange = tx.type === "DEBIT" ? -tx.amount : tx.amount;
        runningBalance += balanceChange;

        balanceHistory.push({
          date: tx.date,
          balance: runningBalance,
          transactionId: tx.id,
          transactionDescription: tx.description,
        });
      }

      // Sort by date (should already be sorted, but ensure it)
      balanceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

      return {
        success: true,
        balanceHistory,
        currentBalance: account.balance,
        balanceAsOfDate: account.balanceAsOfDate,
      };
    } catch (error) {
      console.error("Get account balance history error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to retrieve account balance history. Please try again.",
      );
    }
  });
