"use client";

import { SearchIcon } from "lucide-react";
import { Input } from "@/features/shared/components/ui/input";
import {
  Select,
  type SelectOption,
} from "@/features/shared/components/ui/select";
import { cn } from "@/features/shared/lib/utils/index";

export interface DataTableFilter {
  key: string;
  label: string;
  type: "select";
  options: SelectOption[];
}

interface DataTableFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  filterValues?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  className?: string;
}

export function DataTableFilters({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  filterValues = {},
  onFilterChange,
  className,
}: DataTableFiltersProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap gap-4 px-4 py-3 border-b border-border",
        className,
      )}
    >
      {/* Search Input */}
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Filter Dropdowns */}
      {filters.map((filter) => (
        <div key={filter.key} className="min-w-[150px]">
          <Select
            value={filterValues[filter.key] ?? ""}
            onValueChange={(value) => onFilterChange?.(filter.key, value)}
            options={[
              { value: "", label: `All ${filter.label}` },
              ...filter.options,
            ]}
            placeholder={`Filter by ${filter.label}`}
          />
        </div>
      ))}
    </div>
  );
}
