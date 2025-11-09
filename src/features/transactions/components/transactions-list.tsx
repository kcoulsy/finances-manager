"use client";

import type { Transaction } from "@prisma/client";
import { useEffect, useState } from "react";
import { getAccountsAction } from "@/features/accounts/actions/get-accounts.action";
import { getCategoriesAction } from "@/features/categories/actions/get-categories.action";
import {
  DataTable,
  type DataTableColumn,
} from "@/features/shared/components/data-table/data-table";
import { formatCurrency } from "@/features/shared/lib/utils/format-currency";
import { getTransactionsAction } from "../actions/get-transactions.action";

type TransactionWithRelations = Transaction & {
  financialAccount: { id: string; name: string; currency: string | null };
  category: { id: string; name: string; color: string | null } | null;
};

interface TransactionsListProps {
  defaultCurrency?: string;
}

export function TransactionsList({
  defaultCurrency = "USD",
}: TransactionsListProps) {
  const [transactions, setTransactions] = useState<TransactionWithRelations[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    "desc",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const limit = 50;

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await getTransactionsAction({
        accountId: filterValues.accountId || undefined,
        categoryId: filterValues.categoryId || undefined,
        type: filterValues.type as "DEBIT" | "CREDIT" | "TRANSFER" | undefined,
        isTransfer:
          filterValues.isTransfer === "true"
            ? true
            : filterValues.isTransfer === "false"
              ? false
              : undefined,
        limit,
        offset: (currentPage - 1) * limit,
      });

      if (result?.data?.success) {
        let filteredTransactions = result.data
          .transactions as TransactionWithRelations[];

        // Apply search filter client-side (since server action doesn't support search yet)
        if (searchValue.trim()) {
          const searchLower = searchValue.toLowerCase();
          filteredTransactions = filteredTransactions.filter(
            (tx) =>
              tx.description.toLowerCase().includes(searchLower) ||
              tx.financialAccount.name.toLowerCase().includes(searchLower) ||
              tx.category?.name.toLowerCase().includes(searchLower),
          );
        }

        setTransactions(filteredTransactions);
        // Ensure total is a valid number
        const totalCount =
          typeof result.data.total === "number" ? result.data.total : 0;
        setTotal(totalCount);
      } else if (result?.serverError) {
        setError(new Error(result.serverError));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load transactions"),
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, filterValues, sortColumn, sortDirection, searchValue]);

  // Load accounts and categories for filters
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [accountsResult, categoriesResult] = await Promise.all([
          getAccountsAction({}),
          getCategoriesAction({}),
        ]);

        if (accountsResult?.data?.success) {
          setAccounts(accountsResult.data.accounts);
        }
        if (categoriesResult?.data?.success) {
          setCategories(categoriesResult.data.categories);
        }
      } catch (err) {
        console.error("Failed to load filters:", err);
      }
    };

    loadFilters();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilterValues((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setCurrentPage(1);
  };

  const handleSortChange = (
    column: string,
    direction: "asc" | "desc" | null,
  ) => {
    setSortColumn(column);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const columns: DataTableColumn<TransactionWithRelations>[] = [
    {
      key: "date",
      header: "Date",
      sortable: true,
      render: (transaction) => formatDate(transaction.date),
    },
    {
      key: "description",
      header: "Description",
      render: (transaction) => (
        <div className="flex flex-col">
          <span className="font-medium">{transaction.description}</span>
          {transaction.isTransfer && (
            <span className="text-xs text-muted-foreground">Transfer</span>
          )}
        </div>
      ),
    },
    {
      key: "financialAccount",
      header: "Account",
      render: (transaction) => transaction.financialAccount.name,
    },
    {
      key: "category",
      header: "Category",
      render: (transaction) =>
        transaction.category ? (
          <span
            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium"
            style={{
              backgroundColor: transaction.category.color
                ? `${transaction.category.color}20`
                : undefined,
              color: transaction.category.color || undefined,
            }}
          >
            {transaction.category.name}
          </span>
        ) : (
          <span className="text-muted-foreground text-xs">Uncategorized</span>
        ),
    },
    {
      key: "amount",
      header: "Amount",
      sortable: true,
      className: "text-right",
      render: (transaction) => {
        const isDebit = transaction.type === "DEBIT";
        // Use account currency if available, otherwise use default currency
        const currency =
          transaction.financialAccount.currency || defaultCurrency;
        return (
          <span
            className={
              isDebit
                ? "text-destructive"
                : "text-green-600 dark:text-green-400"
            }
          >
            {isDebit ? "-" : "+"}
            {formatCurrency(Math.abs(transaction.amount), currency)}
          </span>
        );
      },
    },
  ];

  return (
    <DataTable
      data={transactions}
      columns={columns}
      isLoading={isLoading}
      error={error}
      searchValue={searchValue}
      onSearchChange={setSearchValue}
      searchPlaceholder="Search transactions..."
      filters={[
        {
          key: "accountId",
          label: "Account",
          type: "select",
          options: accounts.map((account) => ({
            value: account.id,
            label: account.name,
          })),
        },
        {
          key: "categoryId",
          label: "Category",
          type: "select",
          options: categories.map((category) => ({
            value: category.id,
            label: category.name,
          })),
        },
        {
          key: "type",
          label: "Type",
          type: "select",
          options: [
            { value: "DEBIT", label: "Debit" },
            { value: "CREDIT", label: "Credit" },
            { value: "TRANSFER", label: "Transfer" },
          ],
        },
        {
          key: "isTransfer",
          label: "Show Transfers",
          type: "select",
          options: [
            { value: "true", label: "Yes" },
            { value: "false", label: "No" },
          ],
        },
      ]}
      filterValues={filterValues}
      onFilterChange={handleFilterChange}
      sortColumn={sortColumn}
      sortDirection={sortDirection}
      onSortChange={handleSortChange}
      pagination={
        total > 0 && Number.isFinite(total)
          ? {
              page: currentPage,
              totalPages: Math.ceil(total / limit) || 1,
              totalCount: total,
              limit,
            }
          : undefined
      }
      onPageChange={setCurrentPage}
      emptyMessage="No transactions found"
    />
  );
}
