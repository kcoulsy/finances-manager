"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { Button } from "@/features/shared/components/ui/button";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { bulkUpdateTransactionsAction } from "../actions/bulk-update-transactions.action";
import { getTransactionsAction } from "../actions/get-transactions.action";
import { TagInput } from "./tag-input";

interface BulkTagsUpdateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTransactionIds: string[];
  totalCount?: number;
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

export function BulkTagsUpdateDialog({
  open,
  onOpenChange,
  selectedTransactionIds,
  totalCount,
  filters,
  onSuccess,
}: BulkTagsUpdateDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);

  const { execute, status } = useActionWithToast(bulkUpdateTransactionsAction, {
    onSuccess: () => {
      onOpenChange(false);
      setSelectedTags([]);
      onSuccess?.();
    },
  });

  // Fetch all unique tags for suggestions
  useEffect(() => {
    if (open) {
      const loadTags = async () => {
        try {
          const result = await getTransactionsAction({
            getAll: true,
          });
          if (result?.data?.success) {
            const transactions = result.data.transactions as Array<{
              tags: string[] | null;
            }>;
            const uniqueTags = new Set<string>();
            transactions.forEach((tx) => {
              if (tx.tags && Array.isArray(tx.tags)) {
                tx.tags.forEach((tag) => uniqueTags.add(tag));
              }
            });
            setAllTags(Array.from(uniqueTags).sort());
          }
        } catch (error) {
          console.error("Failed to load tags:", error);
        }
      };
      loadTags();
    }
  }, [open]);

  const handleSubmit = async () => {
    await execute({
      transactionIds: totalCount ? undefined : selectedTransactionIds,
      filters: totalCount ? filters : undefined,
      tags: selectedTags.length > 0 ? selectedTags : null,
    });
  };

  const displayCount = totalCount ?? selectedTransactionIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Tags</DialogTitle>
          <DialogDescription>
            Update tags for {displayCount} selected transaction
            {displayCount !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="tags" className="text-sm font-medium">
              Tags
            </label>
            <TagInput
              value={selectedTags}
              onChange={setSelectedTags}
              suggestions={allTags}
              placeholder="Add tags..."
            />
            <p className="text-xs text-muted-foreground">
              Press Enter to add a tag. Existing tags will be replaced.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={status === "executing"}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={status === "executing"}>
            {status === "executing" ? "Updating..." : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

