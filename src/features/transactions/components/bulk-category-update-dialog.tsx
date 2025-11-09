"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { Button } from "@/features/shared/components/ui/button";
import { Input } from "@/features/shared/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/features/shared/components/ui/dropdown-menu";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { bulkUpdateTransactionsAction } from "../actions/bulk-update-transactions.action";
import { getCategoriesAction } from "@/features/categories/actions/get-categories.action";
import { createCategoryAction } from "@/features/categories/actions/create-category.action";

interface BulkCategoryUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransactionIds: string[];
  totalCount?: number; // Total count if "select all" is used
  filters?: {
    accountId?: string;
    categoryId?: string;
    type?: "DEBIT" | "CREDIT" | "TRANSFER";
    isTransfer?: boolean;
    startDate?: Date;
    endDate?: Date;
    tags?: string[];
  };
  onSuccess?: () => void;
}

export function BulkCategoryUpdateDialog({
  open,
  onOpenChange,
  selectedTransactionIds,
  totalCount,
  filters,
  onSuccess,
}: BulkCategoryUpdateDialogProps) {
  const router = useRouter();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categories, setCategories] = useState<
    Array<{ id: string; name: string; color: string | null }>
  >([]);

  const { execute, status } = useActionWithToast(bulkUpdateTransactionsAction, {
    onSuccess: () => {
      onOpenChange(false);
      setSelectedCategoryId("");
      setNewCategoryName("");
      setIsCreatingCategory(false);
      onSuccess?.();
    },
  });

  const { execute: executeCreateCategory, status: createCategoryStatus } =
    useActionWithToast(createCategoryAction, {
      onSuccess: async () => {
        // Reload categories after creating
        const result = await getCategoriesAction({});
        if (result?.data?.success) {
          setCategories(result.data.categories);
          // Find and select the newly created category
          const newCategory = result.data.categories.find(
            (cat) => cat.name.toLowerCase() === newCategoryName.toLowerCase(),
          );
          if (newCategory) {
            setSelectedCategoryId(newCategory.id);
          }
        }
        setNewCategoryName("");
        setIsCreatingCategory(false);
      },
    });

  useEffect(() => {
    if (open) {
      const loadCategories = async () => {
        try {
          const result = await getCategoriesAction({});
          if (result?.data?.success) {
            setCategories(result.data.categories);
          }
        } catch (error) {
          console.error("Failed to load categories:", error);
        }
      };
      loadCategories();
    }
  }, [open]);

  const handleSubmit = async () => {
    // If creating a new category, create it first
    if (isCreatingCategory && newCategoryName.trim()) {
      await executeCreateCategory({
        name: newCategoryName.trim(),
        color: null, // Can be enhanced later to pick color
      });
      // Wait for category to be created and selected
      return;
    }

    await execute({
      transactionIds: totalCount ? undefined : selectedTransactionIds,
      filters: totalCount ? filters : undefined,
      categoryId: selectedCategoryId || null,
    });
  };

  const handleCategoryInputChange = (value: string) => {
    setNewCategoryName(value);
    // Check if this matches an existing category
    const matchingCategory = categories.find(
      (cat) => cat.name.toLowerCase() === value.toLowerCase(),
    );
    if (matchingCategory) {
      setSelectedCategoryId(matchingCategory.id);
      setIsCreatingCategory(false);
    } else if (value.trim()) {
      setIsCreatingCategory(true);
      setSelectedCategoryId("");
    } else {
      setIsCreatingCategory(false);
      setSelectedCategoryId("");
    }
  };

  const displayCount = totalCount ?? selectedTransactionIds.length;
  const userCategories = categories.filter((cat) => !cat.isDefault);
  const hasNoCategories = userCategories.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Category</DialogTitle>
          <DialogDescription>
            Update category for {displayCount} selected transaction
            {displayCount !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasNoCategories ? (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground mb-4">
                No categories found. Create categories in settings to organize
                your transactions.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  router.push("/settings");
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Go to Settings
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="category" className="text-sm font-medium">
                Category
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    id="category"
                    placeholder="Type to search or create new category..."
                    value={
                      isCreatingCategory
                        ? newCategoryName
                        : categories.find((c) => c.id === selectedCategoryId)
                            ?.name || ""
                    }
                    onChange={(e) => handleCategoryInputChange(e.target.value)}
                    list="category-list"
                  />
                  {isCreatingCategory && newCategoryName.trim() && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={async () => {
                        await executeCreateCategory({
                          name: newCategoryName.trim(),
                          color: null,
                        });
                      }}
                      disabled={createCategoryStatus === "executing"}
                      title="Create new category"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {categories.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-start">
                        {selectedCategoryId
                          ? categories.find((c) => c.id === selectedCategoryId)
                              ?.name || "Select a category"
                          : "Or select from existing"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedCategoryId("");
                          setNewCategoryName("");
                          setIsCreatingCategory(false);
                        }}
                      >
                        Uncategorized
                      </DropdownMenuItem>
                      {userCategories.map((category) => (
                        <DropdownMenuItem
                          key={category.id}
                          onClick={() => {
                            setSelectedCategoryId(category.id);
                            setNewCategoryName(category.name);
                            setIsCreatingCategory(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            {category.color && (
                              <div
                                className="h-3 w-3 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            )}
                            <span>{category.name}</span>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {isCreatingCategory && newCategoryName.trim() && (
                  <p className="text-xs text-muted-foreground">
                    Press the + button or click "Update" to create "{newCategoryName}"
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === "executing"}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              status === "executing" ||
              createCategoryStatus === "executing" ||
              hasNoCategories
            }
          >
            {status === "executing" || createCategoryStatus === "executing"
              ? "Processing..."
              : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

