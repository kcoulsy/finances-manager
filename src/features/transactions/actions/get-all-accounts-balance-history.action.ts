"use server";

import { z } from "zod";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";

export const getAllAccountsBalanceHistoryAction = actionClient
  .inputSchema(
    z.object({
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      accountId: z.union([z.string(), z.array(z.string())]).optional(),
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

      // Build account filter
      const accountWhere: { userId: string; id?: string | { in: string[] } } = {
        userId: session.user.id,
      };

      if (parsedInput.accountId) {
        if (Array.isArray(parsedInput.accountId)) {
          if (parsedInput.accountId.length > 0) {
            accountWhere.id = { in: parsedInput.accountId };
          }
        } else {
          accountWhere.id = parsedInput.accountId;
        }
      }

      // Get filtered user accounts
      const accounts = await db.financialAccount.findMany({
        where: accountWhere,
        orderBy: {
          name: "asc",
        },
      });

      // Get all transactions for all accounts, ordered by date
      const transactions = await db.transaction.findMany({
        where: {
          userId: session.user.id,
          ...(parsedInput.startDate || parsedInput.endDate
            ? {
                date: {
                  ...(parsedInput.startDate
                    ? { gte: parsedInput.startDate }
                    : {}),
                  ...(parsedInput.endDate ? { lte: parsedInput.endDate } : {}),
                },
              }
            : {}),
        },
        orderBy: {
          date: "asc",
        },
      });

      // Calculate balance history for each account
      const accountHistories: Array<{
        accountId: string;
        accountName: string;
        accountCurrency: string | null;
        balanceHistory: Array<{
          date: Date;
          balance: number;
        }>;
      }> = [];

      for (const account of accounts) {
        const accountTransactions = transactions.filter(
          (tx: { financialAccountId: string }) =>
            tx.financialAccountId === account.id,
        );

        const balanceHistory: Array<{
          date: Date;
          balance: number;
        }> = [];

        // Separate transactions before and after balance as of date
        const balanceAsOf = account.balanceAsOfDate
          ? new Date(account.balanceAsOfDate)
          : null;

        const transactionsBefore = balanceAsOf
          ? accountTransactions.filter(
              (tx: { date: Date }) => tx.date <= balanceAsOf,
            )
          : [];
        const transactionsAfter = balanceAsOf
          ? accountTransactions.filter(
              (tx: { date: Date }) => tx.date > balanceAsOf,
            )
          : accountTransactions;

        // Calculate starting balance by working backwards from balance as of date
        let startingBalance = balanceAsOf ? account.balance : 0;

        // Work backwards: subtract transactions that happened before the balance as of date
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
          });
        }

        // Sort by date
        balanceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Determine the date range for the chart
        const effectiveStartDate = parsedInput.startDate
          ? new Date(parsedInput.startDate)
          : null;
        const effectiveEndDate = parsedInput.endDate
          ? new Date(parsedInput.endDate)
          : new Date();

        // Ensure we have points at the start and end of the range
        // This ensures the line extends across the full graph
        if (effectiveStartDate) {
          // Find balance at or before start date
          const startPoint = balanceHistory
            .filter((p) => p.date.getTime() <= effectiveStartDate.getTime())
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

          if (!startPoint) {
            // No transactions before start date, calculate starting balance
            const balanceAsOfForCalc = balanceAsOf
              ? new Date(balanceAsOf)
              : null;
            let startingBalance = balanceAsOfForCalc ? account.balance : 0;

            if (
              balanceAsOfForCalc &&
              balanceAsOfForCalc <= effectiveStartDate
            ) {
              // Balance as of date is before or equal to start date
              startingBalance = account.balance;
            } else if (balanceAsOfForCalc) {
              // Work backwards from balance as of date
              const transactionsBefore = accountTransactions.filter(
                (tx: { date: Date }) => tx.date <= balanceAsOfForCalc,
              );
              const transactionsBeforeReversed = [
                ...transactionsBefore,
              ].reverse();
              for (const tx of transactionsBeforeReversed) {
                const balanceChange =
                  tx.type === "DEBIT" ? -tx.amount : tx.amount;
                startingBalance -= balanceChange;
              }
            }

            balanceHistory.unshift({
              date: effectiveStartDate,
              balance: startingBalance,
            });
          } else if (
            startPoint.date.getTime() !== effectiveStartDate.getTime()
          ) {
            // We have a point before start date, but not exactly at start date
            // Add a point at start date with the same balance
            balanceHistory.unshift({
              date: effectiveStartDate,
              balance: startPoint.balance,
            });
          }
        }

        if (effectiveEndDate) {
          // Find balance at or before end date
          const endPoint = balanceHistory
            .filter((p) => p.date.getTime() <= effectiveEndDate.getTime())
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

          if (!endPoint) {
            // No transactions before end date, use starting balance
            const balanceAsOfForCalc = balanceAsOf
              ? new Date(balanceAsOf)
              : null;
            let endingBalance = balanceAsOfForCalc ? account.balance : 0;

            if (balanceAsOfForCalc && balanceAsOfForCalc <= effectiveEndDate) {
              endingBalance = account.balance;
            } else if (balanceAsOfForCalc) {
              const transactionsBefore = accountTransactions.filter(
                (tx: { date: Date }) => tx.date <= balanceAsOfForCalc,
              );
              const transactionsBeforeReversed = [
                ...transactionsBefore,
              ].reverse();
              for (const tx of transactionsBeforeReversed) {
                const balanceChange =
                  tx.type === "DEBIT" ? -tx.amount : tx.amount;
                endingBalance -= balanceChange;
              }
            }

            balanceHistory.push({
              date: effectiveEndDate,
              balance: endingBalance,
            });
          } else if (endPoint.date.getTime() !== effectiveEndDate.getTime()) {
            // We have a point before end date, but not exactly at end date
            // Add a point at end date with the balance from the last transaction
            balanceHistory.push({
              date: effectiveEndDate,
              balance: endPoint.balance,
            });
          }
        }

        // Re-sort after adding start/end points
        balanceHistory.sort((a, b) => a.date.getTime() - b.date.getTime());

        accountHistories.push({
          accountId: account.id,
          accountName: account.name,
          accountCurrency: account.currency,
          balanceHistory,
        });
      }

      // Determine the date range for the chart
      const effectiveStartDate = parsedInput.startDate
        ? new Date(parsedInput.startDate)
        : null;
      const effectiveEndDate = parsedInput.endDate
        ? new Date(parsedInput.endDate)
        : new Date();

      // Get all unique dates across all accounts
      const allDates = new Set<number>();
      accountHistories.forEach((history) => {
        history.balanceHistory.forEach((point) => {
          allDates.add(point.date.getTime());
        });
      });

      // Always include start and end dates if provided
      if (effectiveStartDate) {
        allDates.add(effectiveStartDate.getTime());
      }
      if (effectiveEndDate) {
        allDates.add(effectiveEndDate.getTime());
      }

      const sortedDates = Array.from(allDates).sort((a, b) => a - b);

      // Create combined data points for each date
      const combinedHistory: Array<{
        date: Date;
        accounts: Record<string, number>;
        overall: number;
      }> = [];

      for (const dateTime of sortedDates) {
        const date = new Date(dateTime);
        const accountsData: Record<string, number> = {};
        let overall = 0;

        for (const accountHistory of accountHistories) {
          // Find the balance at or before this date
          const point = accountHistory.balanceHistory
            .filter((p) => p.date.getTime() <= dateTime)
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

          if (point) {
            accountsData[accountHistory.accountId] = point.balance;
            overall += point.balance;
          }
        }

        combinedHistory.push({
          date,
          accounts: accountsData,
          overall,
        });
      }

      return {
        success: true,
        accountHistories,
        combinedHistory,
      };
    } catch (error) {
      console.error("Get all accounts balance history error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to retrieve account balance history. Please try again.",
      );
    }
  });
