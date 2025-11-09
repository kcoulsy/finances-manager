"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { Button } from "@/features/shared/components/ui/button";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { bulkUpdateTransactionsAction } from "../actions/bulk-update-transactions.action";

interface BulkNotesUpdateDialogProps {
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

export function BulkNotesUpdateDialog({
  open,
  onOpenChange,
  selectedTransactionIds,
  totalCount,
  filters,
  onSuccess,
}: BulkNotesUpdateDialogProps) {
  const [notes, setNotes] = useState("");

  const { execute, status } = useActionWithToast(bulkUpdateTransactionsAction, {
    onSuccess: () => {
      onOpenChange(false);
      setNotes("");
      onSuccess?.();
    },
  });

  const handleSubmit = async () => {
    await execute({
      transactionIds: totalCount ? undefined : selectedTransactionIds,
      filters: totalCount ? filters : undefined,
      notes: notes.trim() || null,
    });
  };

  const displayCount = totalCount ?? selectedTransactionIds.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Notes</DialogTitle>
          <DialogDescription>
            Update notes for {displayCount} selected transaction
            {displayCount !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Textarea
              id="notes"
              placeholder="Enter notes for these transactions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This will replace existing notes for all selected transactions.
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

