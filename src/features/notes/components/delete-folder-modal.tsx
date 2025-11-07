"use client";

import { useState } from "react";
import { Button } from "@/features/shared/components/ui/button";
import { Checkbox } from "@/features/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { useDeleteNoteFolder } from "../hooks/use-delete-note-folder";

interface DeleteFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName: string;
  noteCount: number;
}

export function DeleteFolderModal({
  open,
  onOpenChange,
  folderId,
  folderName,
  noteCount,
}: DeleteFolderModalProps) {
  const [includeNotes, setIncludeNotes] = useState(false);
  const deleteFolder = useDeleteNoteFolder();

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setIncludeNotes(false);
    }
    onOpenChange(newOpen);
  };

  const handleDelete = async () => {
    if (!folderId) return;

    try {
      await deleteFolder.mutateAsync({
        folderId,
        includeNotes,
      });
      // If successful, close the modal
      handleOpenChange(false);
    } catch {
      // Error toast is already shown automatically from the hook
      // Modal stays open so user can try again or cancel
    }
  };

  const isLoading = deleteFolder.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Delete Folder</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{folderName}"?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            This folder contains {noteCount} note{noteCount === 1 ? "" : "s"}.
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-notes"
              checked={includeNotes}
              onCheckedChange={(checked) => setIncludeNotes(checked === true)}
            />
            <label
              htmlFor="include-notes"
              className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include notes
            </label>
          </div>
          <div className="text-xs text-muted-foreground pl-6">
            {includeNotes
              ? "All notes in this folder will be moved to trash."
              : "All notes in this folder will be moved to the parent folder (or root if no parent)."}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isLoading}
          >
            {isLoading ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
