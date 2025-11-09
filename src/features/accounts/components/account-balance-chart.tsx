"use client";

import { useState, useEffect } from "react";
import { getAccountBalanceHistoryAction } from "../actions/get-account-balance-history.action";
import { formatCurrency } from "@/features/shared/lib/utils/format-currency";
import { Skeleton } from "@/features/shared/components/ui/skeleton";

interface AccountBalanceChartProps {
  accountId: string;
  defaultCurrency?: string;
}

export function AccountBalanceChart({
  accountId,
  defaultCurrency = "USD",
}: AccountBalanceChartProps) {
  const [balanceHistory, setBalanceHistory] = useState<
    Array<{
      date: Date;
      balance: number;
      transactionId?: string;
      transactionDescription?: string;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [accountCurrency, setAccountCurrency] = useState<string>(defaultCurrency);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getAccountBalanceHistoryAction({ accountId });
        if (result?.data?.success) {
          setBalanceHistory(result.data.balanceHistory);
          // Get currency from account if available
          if (result.data.accountCurrency) {
            setAccountCurrency(result.data.accountCurrency);
          }
        } else if (result?.serverError) {
          setError(new Error(result.serverError));
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load balance history"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [accountId]);

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (error) {
    return <p className="text-destructive">{error.message}</p>;
  }

  if (balanceHistory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No balance history available. Add transactions to see balance changes over time.
      </div>
    );
  }

  // Simple text-based chart for now
  const maxBalance = Math.max(...balanceHistory.map((h) => Math.abs(h.balance)));
  const minBalance = Math.min(...balanceHistory.map((h) => h.balance));
  const range = maxBalance - minBalance || 1;

  return (
    <div className="space-y-4">
      <div className="h-64 flex items-end gap-1 border-b border-l border-border">
        {balanceHistory.map((point, index) => {
          const height = ((point.balance - minBalance) / range) * 100;
          return (
            <div
              key={point.transactionId || index}
              className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${formatCurrency(point.balance, accountCurrency)} - ${new Date(point.date).toLocaleDateString()}`}
            />
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Starting Balance</p>
          <p className="font-semibold">
            {formatCurrency(balanceHistory[0]?.balance || 0, accountCurrency)}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Current Balance</p>
          <p className="font-semibold">
            {formatCurrency(
              balanceHistory[balanceHistory.length - 1]?.balance || 0,
              accountCurrency,
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Change</p>
          <p
            className={`font-semibold ${
              (balanceHistory[balanceHistory.length - 1]?.balance || 0) -
                (balanceHistory[0]?.balance || 0) >=
              0
                ? "text-green-600 dark:text-green-400"
                : "text-destructive"
            }`}
          >
            {formatCurrency(
              (balanceHistory[balanceHistory.length - 1]?.balance || 0) -
                (balanceHistory[0]?.balance || 0),
              accountCurrency,
            )}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Transactions</p>
          <p className="font-semibold">{balanceHistory.length}</p>
        </div>
      </div>
    </div>
  );
}

