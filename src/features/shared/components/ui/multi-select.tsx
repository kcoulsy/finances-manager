"use client";

import { useState, useRef, useEffect } from "react";
import { CheckIcon, ChevronDownIcon, X, Search } from "lucide-react";
import { Button } from "@/features/shared/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/features/shared/components/ui/popover";
import { Input } from "@/features/shared/components/ui/input";
import { Checkbox } from "@/features/shared/components/ui/checkbox";
import { cn } from "@/features/shared/lib/utils/index";

export interface MultiSelectOption {
  value: string;
  label: string;
  color?: string | null;
}

interface MultiSelectProps {
  value: string[];
  onValueChange: (value: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
}

export function MultiSelect({
  value = [],
  onValueChange,
  options,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter options based on search
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedOptions = options.filter((option) =>
    value.includes(option.value),
  );

  const handleSelect = (optionValue: string) => {
    const newValue = value.includes(optionValue)
      ? value.filter((v) => v !== optionValue)
      : [...value, optionValue];
    onValueChange(newValue);
  };

  const handleSelectAll = () => {
    if (value.length === filteredOptions.length) {
      // Deselect all filtered options
      const filteredValues = filteredOptions.map((opt) => opt.value);
      onValueChange(value.filter((v) => !filteredValues.includes(v)));
    } else {
      // Select all filtered options
      const filteredValues = filteredOptions.map((opt) => opt.value);
      const newValue = [...new Set([...value, ...filteredValues])];
      onValueChange(newValue);
    }
  };

  const handleClearAll = () => {
    onValueChange([]);
  };

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== optionValue));
  };

  const allFilteredSelected =
    filteredOptions.length > 0 &&
    filteredOptions.every((opt) => value.includes(opt.value));

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full min-w-[180px] justify-between text-left font-normal min-h-9 h-auto",
            value.length === 0 && "text-muted-foreground",
            className,
          )}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedOptions.length === 0 ? (
              <span>{placeholder}</span>
            ) : selectedOptions.length <= 2 ? (
              selectedOptions.map((option) => (
                <span
                  key={option.value}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground"
                  style={{
                    backgroundColor: option.color
                      ? `${option.color}20`
                      : undefined,
                    color: option.color || undefined,
                  }}
                >
                  {option.label}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(option.value, e)}
                    className="ml-1 rounded-full hover:bg-secondary/80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            ) : (
              <span className="text-sm">
                {selectedOptions.length} selected
              </span>
            )}
          </div>
          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <div className="p-1 max-h-[300px] overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No options found
            </div>
          ) : (
            <>
              <div className="px-2 py-1.5 border-b">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="text-xs text-primary hover:underline"
                  >
                    {allFilteredSelected ? "Deselect all" : "Select all"}
                  </button>
                  {value.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs text-destructive hover:underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
              </div>
              {filteredOptions.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className="w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                  >
                    <Checkbox checked={isSelected} />
                    <span
                      className="flex-1"
                      style={{
                        color: option.color || undefined,
                      }}
                    >
                      {option.label}
                    </span>
                    {option.color && (
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

