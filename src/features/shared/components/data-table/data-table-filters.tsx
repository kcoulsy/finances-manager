"use client";

import { SearchIcon, X } from "lucide-react";
import { Input } from "@/features/shared/components/ui/input";
import {
  Select,
  type SelectOption,
} from "@/features/shared/components/ui/select";
import {
  MultiSelect,
  type MultiSelectOption,
} from "@/features/shared/components/ui/multi-select";
import { Button } from "@/features/shared/components/ui/button";
import { cn } from "@/features/shared/lib/utils/index";

export interface DataTableFilter {
  key: string;
  label: string;
  type: "select" | "text" | "multiselect";
  options?: SelectOption[] | MultiSelectOption[]; // Required for "select" and "multiselect" types
  placeholder?: string; // For "text" type
  searchPlaceholder?: string; // For "multiselect" type
}

interface DataTableFiltersProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: DataTableFilter[];
  filterValues?: Record<string, string | string[]>;
  onFilterChange?: (key: string, value: string | string[]) => void;
  onClearAllFilters?: () => void;
  className?: string;
}

export function DataTableFilters({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  filterValues = {},
  onFilterChange,
  onClearAllFilters,
  className,
}: DataTableFiltersProps) {
  // Check if any filters are active
  const hasActiveFilters = Object.keys(filterValues).some((key) => {
    const value = filterValues[key];
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value && value !== "";
  });

  // Split filters into two rows
  // First row: Search + first half of filters
  // Second row: Remaining filters + Clear button
  const filtersPerRow = Math.ceil((filters.length + (onSearchChange ? 1 : 0)) / 2);
  const firstRowFilters = filters.slice(0, filtersPerRow - (onSearchChange ? 1 : 0));
  const secondRowFilters = filters.slice(filtersPerRow - (onSearchChange ? 1 : 0));

  return (
    <div
      className={cn(
        "flex flex-col gap-3 px-4 py-3 border-b border-border",
        className,
      )}
    >
      {/* First Row */}
      <div className="flex flex-wrap gap-4 items-center">
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

        {/* First Row Filters */}
        {firstRowFilters.map((filter) => (
          <div key={filter.key} className="min-w-[180px]">
            {filter.type === "text" ? (
              <Input
                type="text"
                value={
                  typeof filterValues[filter.key] === "string"
                    ? filterValues[filter.key]
                    : ""
                }
                onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                placeholder={filter.placeholder || `Filter by ${filter.label}`}
              />
            ) : filter.type === "multiselect" ? (
              <MultiSelect
                value={
                  Array.isArray(filterValues[filter.key])
                    ? filterValues[filter.key]
                    : []
                }
                onValueChange={(value) => onFilterChange?.(filter.key, value)}
                options={(filter.options || []) as MultiSelectOption[]}
                placeholder={`Filter by ${filter.label}`}
                searchPlaceholder={filter.searchPlaceholder || "Search..."}
              />
            ) : (
              <Select
                value={
                  typeof filterValues[filter.key] === "string"
                    ? filterValues[filter.key]
                    : ""
                }
                onValueChange={(value) => onFilterChange?.(filter.key, value)}
                options={[
                  { value: "", label: `All ${filter.label}` },
                  ...(filter.options || []),
                ]}
                placeholder={`Filter by ${filter.label}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Second Row */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Second Row Filters */}
        {secondRowFilters.map((filter) => (
          <div key={filter.key} className="min-w-[180px]">
            {filter.type === "text" ? (
              <Input
                type="text"
                value={
                  typeof filterValues[filter.key] === "string"
                    ? filterValues[filter.key]
                    : ""
                }
                onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
                placeholder={filter.placeholder || `Filter by ${filter.label}`}
              />
            ) : filter.type === "multiselect" ? (
              <MultiSelect
                value={
                  Array.isArray(filterValues[filter.key])
                    ? filterValues[filter.key]
                    : []
                }
                onValueChange={(value) => onFilterChange?.(filter.key, value)}
                options={(filter.options || []) as MultiSelectOption[]}
                placeholder={`Filter by ${filter.label}`}
                searchPlaceholder={filter.searchPlaceholder || "Search..."}
              />
            ) : (
              <Select
                value={
                  typeof filterValues[filter.key] === "string"
                    ? filterValues[filter.key]
                    : ""
                }
                onValueChange={(value) => onFilterChange?.(filter.key, value)}
                options={[
                  { value: "", label: `All ${filter.label}` },
                  ...(filter.options || []),
                ]}
                placeholder={`Filter by ${filter.label}`}
              />
            )}
          </div>
        ))}

        {/* Clear All Filters Button */}
        {hasActiveFilters && onClearAllFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAllFilters}
            className="h-9"
          >
            <X className="mr-2 h-4 w-4" />
            Clear all filters
          </Button>
        )}
      </div>
    </div>
  );
}
