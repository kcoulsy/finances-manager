import * as React from "react";

import { cn } from "@/features/shared/lib/utils/index";

/**
 * Compact table component with minimal padding and styling
 * Matches the compact table style: min-w-[1400px], compact spacing (px-3 py-2), striped rows
 */
const CompactTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="relative w-full min-w-0 overflow-x-auto">
    <table
      ref={ref}
      className={cn(
        "min-w-[1400px] w-full text-sm border-collapse",
        className
      )}
      {...props}
    />
  </div>
));
CompactTable.displayName = "CompactTable";

const CompactTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead
    ref={ref}
    className={cn(
      "bg-muted/50 border-b border-border [&_tr]:border-b",
      className
    )}
    {...props}
  />
));
CompactTableHeader.displayName = "CompactTableHeader";

const CompactTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("", className)} {...props} />
));
CompactTableBody.displayName = "CompactTableBody";

const CompactTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "border-b border-border transition-colors odd:bg-background even:bg-muted/30 hover:bg-muted/70 data-[state=selected]:bg-muted",
      className
    )}
    {...props}
  />
));
CompactTableRow.displayName = "CompactTableRow";

const CompactTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "px-3 py-2 text-left text-xs font-medium uppercase text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
CompactTableHead.displayName = "CompactTableHead";

const CompactTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn(
      "px-3 py-2 align-middle text-sm [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
));
CompactTableCell.displayName = "CompactTableCell";

export {
  CompactTable,
  CompactTableHeader,
  CompactTableBody,
  CompactTableRow,
  CompactTableHead,
  CompactTableCell,
};

