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
import { updateTransactionAction } from "../actions/update-transaction.action";
import { TagInput } from "./tag-input";
import { getTransactionsAction } from "../actions/get-transactions.action";

interface SingleTransactionTagsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  initialTags: string[] | null;
  onSuccess?: () => void;
}

export function SingleTransactionTagsDialog({
  open,
  onOpenChange,
  transactionId,
  initialTags,
  onSuccess,
}: SingleTransactionTagsDialogProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(initialTags || []);
  const [allTags, setAllTags] = useState<string[]>([]);

  // Update local state when initialTags changes
  useEffect(() => {
    setSelectedTags(initialTags || []);
  }, [initialTags, open]);

  // Fetch all tags for suggestions
  useEffect(() => {
    if (open) {
      getTransactionsAction({ getAll: true }).then((result) => {
        if (result?.data?.success) {
          const transactions = result.data.transactions as Array<{
            tags: string[] | null;
          }>;
          const uniqueTags = new Set<string>();
          transactions.forEach((tx) => {
            if (tx.tags && Array.isArray(tx.tags)) {
              tx.tags.forEach((tag) => {
                uniqueTags.add(tag);
              });
            }
          });
          setAllTags(Array.from(uniqueTags).sort());
        }
      });
    }
  }, [open]);

  const { execute, status } = useActionWithToast(updateTransactionAction, {
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = async () => {
    await execute({
      transactionId,
      tags: selectedTags.length > 0 ? selectedTags : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Tags</DialogTitle>
          <DialogDescription>
            Add or edit tags for this transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <TagInput
            value={selectedTags}
            onChange={setSelectedTags}
            allTags={allTags}
            placeholder="Add tags..."
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={status === "executing"}>
            {status === "executing" ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

