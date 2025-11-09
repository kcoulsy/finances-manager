"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/features/shared/components/ui/pagination";
import { cn } from "@/features/shared/lib/utils/index";

interface DataTablePagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  visibleCount?: number; // Actual number of visible items on current page (for client-side filtering)
}

interface DataTableFooterProps {
  pagination?: DataTablePagination;
  onPageChange?: (page: number) => void;
  className?: string;
}

export function DataTableFooter({
  pagination,
  onPageChange,
  className,
}: DataTableFooterProps) {
  if (!pagination) {
    return null;
  }

  // Hide pagination if there's only one page and no visibleCount (meaning no client-side filtering)
  // But show it if visibleCount is provided (meaning we have filtered results to show)
  if (pagination.totalPages <= 1 && pagination.visibleCount === undefined) {
    return null;
  }

  const { page, totalPages, totalCount, limit, visibleCount } = pagination;
  // Use visibleCount if provided (for client-side filtering like search)
  // When visibleCount is provided, it means we're showing all filtered results on one page
  const start = visibleCount !== undefined ? 1 : (page - 1) * limit + 1;
  const end = visibleCount !== undefined 
    ? visibleCount 
    : Math.min(page * limit, totalCount);

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];

    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (page <= 4) {
        // Show first 5 pages, ellipsis, last page
        for (let i = 2; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (page >= totalPages - 3) {
        // Show first page, ellipsis, last 5 pages
        pages.push("ellipsis");
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Show first page, ellipsis, current-1, current, current+1, ellipsis, last page
        pages.push("ellipsis");
        pages.push(page - 1);
        pages.push(page);
        pages.push(page + 1);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }

    // Remove consecutive ellipsis
    const filteredPages: (number | "ellipsis")[] = [];
    for (let i = 0; i < pages.length; i++) {
      if (
        pages[i] === "ellipsis" &&
        filteredPages[filteredPages.length - 1] === "ellipsis"
      ) {
        continue; // Skip duplicate ellipsis
      }
      filteredPages.push(pages[i]);
    }

    return filteredPages;
  };

  return (
    <div
      className={cn(
        "border-t border-border px-4 py-4 flex items-center justify-between",
        className,
      )}
    >
      <div className="text-sm text-muted-foreground">
        Showing {start} to {end} of {totalCount} results
      </div>

      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) {
                  onPageChange?.(page - 1);
                }
              }}
              className={
                page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"
              }
            />
          </PaginationItem>

          {getPageNumbers().map((pageNum, index) => {
            if (pageNum === "ellipsis") {
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: happy to reuse the index
                <PaginationItem key={`ellipsis-${index}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              );
            }

            return (
              <PaginationItem key={pageNum}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange?.(pageNum);
                  }}
                  isActive={pageNum === page}
                  className="cursor-pointer"
                >
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            );
          })}

          <PaginationItem>
            <PaginationNext
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page < totalPages) {
                  onPageChange?.(page + 1);
                }
              }}
              className={
                page === totalPages
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer"
              }
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

export type { DataTablePagination };
