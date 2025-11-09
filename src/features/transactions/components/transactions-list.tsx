"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccounts } from "@/features/accounts/hooks/use-accounts";
import { useCategories } from "@/features/categories/hooks/use-categories";
import {
  DataTable,
  type DataTableColumn,
} from "@/features/shared/components/data-table/data-table";
import { Button } from "@/features/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/components/ui/popover";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { formatCurrency } from "@/features/shared/lib/utils/format-currency";
import { getTransactionsAction } from "../actions/get-transactions.action";
import { updateTransactionAction } from "../actions/update-transaction.action";
import { useTransactions } from "../hooks/use-transactions";
import { BulkCategoryUpdateDialog } from "./bulk-category-update-dialog";
import { BulkNotesUpdateDialog } from "./bulk-notes-update-dialog";
import { BulkTagsUpdateDialog } from "./bulk-tags-update-dialog";

type TransactionWithRelations = {
  id: string;
  date: Date | string;
  amount: number;
  description: string;
  type: "DEBIT" | "CREDIT" | "TRANSFER";
  isTransfer: boolean;
  notes: string | null;
  tags: string[] | null;
  financialAccount: { id: string; name: string; currency: string | null };
  category: { id: string; name: string; color: string | null } | null;
};

interface TransactionsListProps {
  defaultCurrency?: string;
}

export function TransactionsList({
  defaultCurrency = "USD",
}: TransactionsListProps) {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useState("");
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortColumn, setSortColumn] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc" | null>(
    "desc",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<
    string[]
  >([]);
  const [isSelectAll, setIsSelectAll] = useState(false);
  const [bulkCategoryDialogOpen, setBulkCategoryDialogOpen] = useState(false);
  const [bulkTagsDialogOpen, setBulkTagsDialogOpen] = useState(false);
  const [bulkNotesDialogOpen, setBulkNotesDialogOpen] = useState(false);
  const limit = 50 as const;

  // Query for accounts and categories
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();

  // Build query input for main transactions query
  const transactionsQueryInput = useMemo(
    () => ({
      accountId: filterValues.accountId || undefined,
      categoryId: filterValues.categoryId || undefined,
      type: filterValues.type as "DEBIT" | "CREDIT" | "TRANSFER" | undefined,
      isTransfer:
        filterValues.isTransfer === "true"
          ? true
          : filterValues.isTransfer === "false"
            ? false
            : undefined,
      tags: filterValues.tags
        ? (filterValues.tags.split(",").filter((t) => t.trim()) as string[])
        : undefined,
      limit,
      offset: (currentPage - 1) * limit,
    }),
    [filterValues, currentPage, limit],
  );

  // Main transactions query
  const {
    data: transactionsData,
    isLoading,
    error: transactionsError,
  } = useTransactions(transactionsQueryInput);

  // Query for filtered count (when search is active)
  const filteredCountQueryInput = useMemo(
    () => ({
      accountId: filterValues.accountId || undefined,
      categoryId: filterValues.categoryId || undefined,
      type: filterValues.type as "DEBIT" | "CREDIT" | "TRANSFER" | undefined,
      isTransfer:
        filterValues.isTransfer === "true"
          ? true
          : filterValues.isTransfer === "false"
            ? false
            : undefined,
      tags: filterValues.tags
        ? (filterValues.tags.split(",").filter((t) => t.trim()) as string[])
        : undefined,
      getAll: true as const,
    }),
    [filterValues],
  );

  const { data: filteredCountData } = useQuery({
    queryKey: [
      "transactions",
      "filtered-count",
      filteredCountQueryInput,
      searchValue,
    ],
    queryFn: async () => {
      const result = await getTransactionsAction(filteredCountQueryInput);
      if (result?.serverError) {
        throw new Error(result.serverError);
      }
      if (!result?.data?.success) {
        throw new Error("Failed to fetch filtered count");
      }
      let allFiltered = result.data.transactions as TransactionWithRelations[];

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

      return allFiltered.length;
    },
    enabled: !!searchValue.trim(), // Only fetch when search is active
  });

  // Process transactions data
  const { transactions, filteredTotal } = useMemo(() => {
    if (!transactionsData) {
      return { transactions: [], filteredTotal: 0 };
    }

    let filteredTransactions = transactionsData.transactions;

    // Apply search filter client-side
    if (searchValue.trim()) {
      const searchLower = searchValue.toLowerCase();
      filteredTransactions = filteredTransactions.filter(
        (tx) =>
          tx.description.toLowerCase().includes(searchLower) ||
          tx.financialAccount.name.toLowerCase().includes(searchLower) ||
          tx.category?.name.toLowerCase().includes(searchLower),
      );
    }

    const totalCount = transactionsData.total;
    const filteredCount = searchValue.trim()
      ? (filteredCountData ?? filteredTransactions.length)
      : totalCount;

    return {
      transactions: filteredTransactions,
      filteredTotal: filteredCount,
    };
  }, [transactionsData, searchValue, filteredCountData]);

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
        getAll: true, // Fetch all matching transactions without limit
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
    // Invalidate queries to refetch data
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
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

  // Component for quick category add popover
  function CategoryQuickAddPopover({
    transactionId,
    categories,
    onSuccess,
  }: {
    transactionId: string;
    categories: Array<{ id: string; name: string; color: string | null }>;
    onSuccess: () => void;
  }) {
    const { execute, status } = useActionWithToast(updateTransactionAction, {
      onSuccess: () => {
        onSuccess();
      },
    });

    const handleCategorySelect = async (categoryId: string) => {
      await execute({
        transactionId,
        categoryId,
      });
    };

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
            title="Add category"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <div className="space-y-1">
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-1.5">
                No categories available
              </p>
            ) : (
              categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => handleCategorySelect(category.id)}
                  disabled={status === "executing"}
                  className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: category.color
                        ? `${category.color}20`
                        : undefined,
                      color: category.color || undefined,
                    }}
                  >
                    {category.name}
                  </span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

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
          {transaction.notes && (
            <span className="text-xs italic text-muted-foreground mt-1">
              {transaction.notes}
            </span>
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
          <button
            type="button"
            onClick={() => {
              if (transaction.category) {
                handleFilterChange("categoryId", transaction.category.id);
              }
            }}
            className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium hover:opacity-80 cursor-pointer transition-opacity"
            style={{
              backgroundColor: transaction.category.color
                ? `${transaction.category.color}20`
                : undefined,
              color: transaction.category.color || undefined,
            }}
            title={`Click to filter by "${transaction.category.name}"`}
          >
            {transaction.category.name}
          </button>
        ) : (
          <CategoryQuickAddPopover
            transactionId={transaction.id}
            categories={categories}
            onSuccess={handleBulkUpdateSuccess}
          />
        ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (transaction) =>
        transaction.tags && transaction.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {transaction.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  const currentTags = filterValues.tags
                    ? filterValues.tags
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean)
                    : [];
                  if (!currentTags.includes(tag)) {
                    const newTags = [...currentTags, tag].join(", ");
                    handleFilterChange("tags", newTags);
                  }
                }}
                className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 cursor-pointer transition-colors"
                title={`Click to filter by "${tag}"`}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">No tags</span>
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
              {selectedTransactionIds.length > 0 &&
                selectedTransactionIds.length === filteredTotal &&
                !isSelectAll && (
                  <span className="ml-2 text-muted-foreground">
                    (all {filteredTotal} results)
                  </span>
                )}
              {isSelectAll && filteredTotal > transactions.length && (
                <span className="ml-2 text-muted-foreground">
                  (including {filteredTotal - transactions.length} not shown)
                </span>
              )}
            </span>
            {!isSelectAll &&
              selectedTransactionIds.length < filteredTotal &&
              filteredTotal > transactions.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllNotShown}
                >
                  Select all {filteredTotal} results
                </Button>
              )}
            {selectedTransactionIds.length > 0 &&
              selectedTransactionIds.length === filteredTotal &&
              !isSelectAll && (
                <span className="text-sm text-muted-foreground">
                  All {filteredTotal} results selected
                </span>
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
              variant="outline"
              size="sm"
              onClick={() => setBulkTagsDialogOpen(true)}
            >
              <Tag className="mr-2 h-4 w-4" />
              Update Tags
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkNotesDialogOpen(true)}
            >
              <FileText className="mr-2 h-4 w-4" />
              Update Notes
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
        error={transactionsError}
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
            options: accounts.map((account: { id: string; name: string }) => ({
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
          {
            key: "tags",
            label: "Tags",
            type: "text",
            placeholder: "Comma-separated tags (e.g., food, travel)",
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

      {/* Bulk Update Dialogs */}
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
                tags: filterValues.tags
                  ? (filterValues.tags
                      .split(",")
                      .filter((t) => t.trim()) as string[])
                  : undefined,
              }
            : undefined
        }
        onSuccess={handleBulkUpdateSuccess}
      />

      <BulkTagsUpdateDialog
        open={bulkTagsDialogOpen}
        onOpenChange={setBulkTagsDialogOpen}
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
                tags: filterValues.tags
                  ? (filterValues.tags
                      .split(",")
                      .filter((t) => t.trim()) as string[])
                  : undefined,
              }
            : undefined
        }
        onSuccess={handleBulkUpdateSuccess}
      />

      <BulkNotesUpdateDialog
        open={bulkNotesDialogOpen}
        onOpenChange={setBulkNotesDialogOpen}
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
                tags: filterValues.tags
                  ? (filterValues.tags
                      .split(",")
                      .filter((t) => t.trim()) as string[])
                  : undefined,
              }
            : undefined
        }
        onSuccess={handleBulkUpdateSuccess}
      />
    </div>
  );
}
