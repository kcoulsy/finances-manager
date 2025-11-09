"use client";

import type { Transaction } from "@prisma/client";
import { Tag } from "lucide-react";
import { useEffect, useState } from "react";
import { getAccountsAction } from "@/features/accounts/actions/get-accounts.action";
import { getCategoriesAction } from "@/features/categories/actions/get-categories.action";
import {
  DataTable,
  type DataTableColumn,
} from "@/features/shared/components/data-table/data-table";
import { Button } from "@/features/shared/components/ui/button";
import { formatCurrency } from "@/features/shared/lib/utils/format-currency";
import { getTransactionsAction } from "../actions/get-transactions.action";
import { BulkCategoryUpdateDialog } from "./bulk-category-update-dialog";

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
  const [filteredTotal, setFilteredTotal] = useState(0); // Total after filters and search
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
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

        // Calculate filtered total (after search)
        if (searchValue.trim()) {
          // When search is active, use the visible count immediately
          // Then fetch all matching transactions to get accurate total count
          setFilteredTotal(filteredTransactions.length);
          // Fetch all matching transactions to get accurate count (updates filteredTotal when done)
          fetchFilteredCount();
        } else {
          // No search - filtered total equals server total (which respects filters)
          setFilteredTotal(totalCount);
        }
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

  // Fetch filtered count (all matching transactions for accurate count with search)
  const fetchFilteredCount = async () => {
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
        limit: 10000, // Large limit to get all matching
        offset: 0,
      });

      if (result?.data?.success) {
        let allFiltered = result.data
          .transactions as TransactionWithRelations[];

        // Apply search filter
        if (searchValue.trim()) {
          const searchLower = searchValue.toLowerCase();
          allFiltered = allFiltered.filter(
            (tx) =>
              tx.description.toLowerCase().includes(searchLower) ||
              tx.financialAccount.name.toLowerCase().includes(searchLower) ||
              tx.category?.name.toLowerCase().includes(searchLower),
          );
        }

        setFilteredTotal(allFiltered.length);
      }
    } catch (error) {
      console.error("Failed to fetch filtered count:", error);
      // Fallback to total if fetch fails
      setFilteredTotal(total);
    }
  };

  useEffect(() => {
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, filterValues, sortColumn, sortDirection, searchValue]);

  // Update filtered total when search or filters change (but not on every render)
  // This effect only runs when search or filters change, not when total changes from fetchTransactions
  useEffect(() => {
    // Only update if search is active - otherwise filteredTotal is set in fetchTransactions
    if (searchValue.trim()) {
      fetchFilteredCount();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, filterValues]);

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
    setFilterValues((prev) => {
      const newValues = { ...prev };
      if (value) {
        newValues[key] = value;
      } else {
        delete newValues[key];
      }
      return newValues;
    });
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

  const handleSelectionChange = (selectedIds: string[]) => {
    setSelectedTransactionIds(selectedIds);
    setIsSelectAll(false);
  };

  const handleSelectAllNotShown = async () => {
    // Fetch all matching transaction IDs (respecting filters and search)
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
        limit: 10000, // Large limit to get all matching
        offset: 0,
      });

      if (result?.data?.success) {
        let allMatching = result.data
          .transactions as TransactionWithRelations[];

        // Apply search filter if active
        if (searchValue.trim()) {
          const searchLower = searchValue.toLowerCase();
          allMatching = allMatching.filter(
            (tx) =>
              tx.description.toLowerCase().includes(searchLower) ||
              tx.financialAccount.name.toLowerCase().includes(searchLower) ||
              tx.category?.name.toLowerCase().includes(searchLower),
          );
        }

        // Select all matching transaction IDs
        const allIds = allMatching.map((tx) => tx.id);
        setSelectedTransactionIds(allIds);
        setIsSelectAll(false); // We have all IDs, so no need for "select all" mode
      }
    } catch (error) {
      console.error("Failed to fetch all transactions:", error);
      // Fallback to "select all" mode
      setIsSelectAll(true);
    }
  };

  const handleBulkUpdateSuccess = () => {
    setSelectedTransactionIds([]);
    setIsSelectAll(false);
    fetchTransactions();
  };

  // Get the actual count of selected transactions
  const getSelectedCount = () => {
    if (isSelectAll) {
      return filteredTotal; // Use filtered total when "select all" is active
    }
    return selectedTransactionIds.length;
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
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      {(selectedTransactionIds.length > 0 || isSelectAll) && (
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {getSelectedCount()} transaction
              {getSelectedCount() !== 1 ? "s" : ""} selected
              {isSelectAll && filteredTotal > transactions.length && (
                <span className="ml-2 text-muted-foreground">
                  (including {filteredTotal - transactions.length} not shown)
                </span>
              )}
            </span>
            {!isSelectAll && filteredTotal > transactions.length && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAllNotShown}
              >
                Select all {filteredTotal} results
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkCategoryDialogOpen(true)}
            >
              <Tag className="mr-2 h-4 w-4" />
              Update Category
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedTransactionIds([]);
                setIsSelectAll(false);
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      <DataTable
        data={transactions}
        columns={columns}
        isLoading={isLoading}
        error={error}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchPlaceholder="Search transactions..."
        enableSelection={true}
        selectedIds={selectedTransactionIds}
        onSelectionChange={handleSelectionChange}
        getRowId={(row) => row.id}
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
          filteredTotal > 0 && Number.isFinite(filteredTotal)
            ? {
                page: currentPage,
                // When search is active, we're showing all results on one page (client-side filtered)
                // So totalPages should be 1 if search is active
                totalPages: searchValue.trim()
                  ? 1
                  : Math.ceil(filteredTotal / limit) || 1,
                totalCount: filteredTotal,
                limit,
                // When search is active, pass the actual visible count
                visibleCount: searchValue.trim()
                  ? transactions.length
                  : undefined,
              }
            : undefined
        }
        onPageChange={setCurrentPage}
        emptyMessage="No transactions found"
      />

      {/* Bulk Category Update Dialog */}
      <BulkCategoryUpdateDialog
        open={bulkCategoryDialogOpen}
        onOpenChange={setBulkCategoryDialogOpen}
        selectedTransactionIds={isSelectAll ? [] : selectedTransactionIds}
        totalCount={isSelectAll ? filteredTotal : undefined}
        filters={
          isSelectAll
            ? {
                accountId: filterValues.accountId,
                categoryId: filterValues.categoryId,
                type: filterValues.type as
                  | "DEBIT"
                  | "CREDIT"
                  | "TRANSFER"
                  | undefined,
                isTransfer:
                  filterValues.isTransfer === "true"
                    ? true
                    : filterValues.isTransfer === "false"
                      ? false
                      : undefined,
              }
            : undefined
        }
        onSuccess={handleBulkUpdateSuccess}
      />
    </div>
  );
}
