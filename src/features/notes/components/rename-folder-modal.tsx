"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/features/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/features/shared/components/ui/dialog";
import { Input } from "@/features/shared/components/ui/input";
import { useUpdateNoteFolder } from "../hooks/use-update-note-folder";
import type { UpdateNoteFolderInput } from "../schemas/note-folder.schema";
import { updateNoteFolderSchema } from "../schemas/note-folder.schema";

interface RenameFolderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string | null;
  folderName: string;
}

export function RenameFolderModal({
  open,
  onOpenChange,
  folderId,
  folderName,
}: RenameFolderModalProps) {
  const updateFolder = useUpdateNoteFolder();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
    setValue,
  } = useForm<UpdateNoteFolderInput>({
    resolver: zodResolver(updateNoteFolderSchema),
    defaultValues: {
      folderId: "",
      name: "",
    },
  });

  // Update form values when props change
  useEffect(() => {
    if (open && folderId) {
      setValue("folderId", folderId);
      setValue("name", folderName);
    }
  }, [open, folderId, folderName, setValue]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      reset();
    }
    onOpenChange(newOpen);
  };

  const onSubmit = async (data: UpdateNoteFolderInput) => {
    if (!folderId) return;

    try {
      await updateFolder.mutateAsync({
        folderId,
        name: data.name,
      });
      // If successful, close the modal
      handleOpenChange(false);
    } catch (error) {
      // Error is already shown via toast from the hook
      setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Failed to rename folder. Please try again.",
      });
    }
  };

  const isLoading = isSubmitting || updateFolder.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Rename Folder</DialogTitle>
          <DialogDescription>
            Enter a new name for this folder.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {errors.root && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Folder Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                placeholder="Enter folder name"
                disabled={isLoading}
                aria-invalid={errors.name ? "true" : "false"}
                {...register("name")}
              />
              {errors.name && (
                <p className="text-sm text-destructive">
                  {errors.name.message}
                </p>
              )}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
