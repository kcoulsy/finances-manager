"use client";

import { ArrowUpIcon, ArrowDownIcon, ArrowUpDownIcon } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import { Skeleton } from "@/features/shared/components/ui/skeleton";
import { cn } from "@/features/shared/lib/utils/index";
import {
  CompactTable,
  CompactTableHeader,
  CompactTableBody,
  CompactTableRow,
  CompactTableHead,
  CompactTableCell,
} from "@/features/shared/components/ui/compact-table";
import { DataTableFilters, type DataTableFilter } from "./data-table-filters";
import { DataTableFooter, type DataTablePagination } from "./data-table-footer";

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (value: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  isLoading?: boolean;
  error?: Error | null;

  // Search
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  // Filters
  filters?: DataTableFilter[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;

  // Sorting
  sortColumn?: string;
  sortDirection?: SortDirection;
  onSortChange?: (column: string, direction: SortDirection) => void;

  // Pagination
  pagination?: DataTablePagination;
  onPageChange?: (page: number) => void;

  // Empty state
  emptyMessage?: string;

  className?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  isLoading = false,
  error = null,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filters,
  filterValues,
  onFilterChange,
  sortColumn,
  sortDirection,
  onSortChange,
  pagination,
  onPageChange,
  emptyMessage = "No data found",
  className,
}: DataTableProps<T>) {
  const handleSort = (columnKey: string) => {
    if (!onSortChange) return;

    const isCurrentColumn = sortColumn === columnKey;

    // If clicking a different column, sort ascending
    if (!isCurrentColumn) {
      onSortChange(columnKey, "asc");
    }
    // If clicking the same column, cycle: asc -> desc -> null -> asc
    else if (sortDirection === "asc") {
      onSortChange(columnKey, "desc");
    } else if (sortDirection === "desc") {
      onSortChange(columnKey, null);
    } else {
      // null -> asc
      onSortChange(columnKey, "asc");
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDownIcon className="ml-2 h-4 w-4 opacity-50" />;
    }

    if (sortDirection === "asc") {
      return <ArrowUpIcon className="ml-2 h-4 w-4" />;
    }

    if (sortDirection === "desc") {
      return <ArrowDownIcon className="ml-2 h-4 w-4" />;
    }

    return <ArrowUpDownIcon className="ml-2 h-4 w-4 opacity-50" />;
  };

  const renderSkeletonRows = () => {
    const skeletonCount = pagination?.limit || 10;
    // Skeleton rows don't have IDs, so we generate unique keys for each row
    return Array.from({ length: skeletonCount }).map((_, index) => {
      const rowKey = `skeleton-${Date.now()}-${index}`;
      return (
        <CompactTableRow key={rowKey}>
          {columns.map((column) => (
            <CompactTableCell key={`${rowKey}-${column.key}`} className={column.className}>
              <Skeleton className="h-4 w-full max-w-[100px]" />
            </CompactTableCell>
          ))}
        </CompactTableRow>
      );
    });
  };

  return (
    <div className={cn("w-full min-w-0 overflow-hidden", className)}>
      {/* Filters */}
      {(onSearchChange || (filters && filters.length > 0)) && (
        <DataTableFilters
          searchValue={searchValue}
          onSearchChange={onSearchChange}
          searchPlaceholder={searchPlaceholder}
          filters={filters}
          filterValues={filterValues}
          onFilterChange={onFilterChange}
        />
      )}

      {/* Table */}
      <CompactTable>
        <CompactTableHeader className="border-b border-border">
          <CompactTableRow>
            {columns.map((column) => (
              <CompactTableHead
                key={column.key}
                className={column.className}
              >
                {column.sortable ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 font-semibold hover:bg-transparent"
                    onClick={() => handleSort(column.key)}
                  >
                    {column.header}
                    {getSortIcon(column.key)}
                  </Button>
                ) : (
                  column.header
                )}
              </CompactTableHead>
            ))}
          </CompactTableRow>
        </CompactTableHeader>
        <CompactTableBody>
          {error ? (
            <CompactTableRow>
              <CompactTableCell
                colSpan={columns.length}
                className="text-center py-12"
              >
                <p className="text-destructive">
                  {error instanceof Error ? error.message : "Failed to load data"}
                </p>
              </CompactTableCell>
            </CompactTableRow>
          ) : isLoading ? (
            renderSkeletonRows()
          ) : data.length === 0 ? (
            <CompactTableRow>
              <CompactTableCell
                colSpan={columns.length}
                className="text-center py-12"
              >
                <p className="text-muted-foreground">{emptyMessage}</p>
              </CompactTableCell>
            </CompactTableRow>
          ) : (
            data.map((row) => {
              // Try to use an 'id' field if available, otherwise generate a key from the first column
              const rowKey = (row as { id?: string } | undefined)?.id ??
                String(row[columns[0]?.key ?? ""] ?? Math.random());
              return (
                <CompactTableRow key={rowKey}>
                  {columns.map((column) => (
                    <CompactTableCell
                      key={`${rowKey}-${column.key}`}
                      className={column.className}
                    >
                      {column.render
                        ? column.render(row)
                        : (row[column.key] as React.ReactNode)}
                    </CompactTableCell>
                  ))}
                </CompactTableRow>
              );
            })
          )}
        </CompactTableBody>
      </CompactTable>

      {/* Footer with Pagination */}
      {pagination && (
        <DataTableFooter
          pagination={pagination}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

