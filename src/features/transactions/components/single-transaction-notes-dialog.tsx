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
import { Textarea } from "@/features/shared/components/ui/textarea";
import { useActionWithToast } from "@/features/shared/lib/actions/use-action-with-toast";
import { updateTransactionAction } from "../actions/update-transaction.action";

interface SingleTransactionNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  initialNotes: string | null;
  onSuccess?: () => void;
}

export function SingleTransactionNotesDialog({
  open,
  onOpenChange,
  transactionId,
  initialNotes,
  onSuccess,
}: SingleTransactionNotesDialogProps) {
  const [notes, setNotes] = useState(initialNotes || "");

  // Update local state when initialNotes changes
  useEffect(() => {
    setNotes(initialNotes || "");
  }, [initialNotes, open]);

  const { execute, status } = useActionWithToast(updateTransactionAction, {
    onSuccess: () => {
      onOpenChange(false);
      onSuccess?.();
    },
  });

  const handleSubmit = async () => {
    await execute({
      transactionId,
      notes: notes.trim() || null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Notes</DialogTitle>
          <DialogDescription>
            Add or edit notes for this transaction.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter notes for this transaction..."
            rows={4}
            className="resize-none"
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

