"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
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
import {
  Select,
  type SelectOption,
} from "@/features/shared/components/ui/select";
import { Textarea } from "@/features/shared/components/ui/textarea";
import { useCreateNote } from "../hooks/use-create-note";
import type { CreateNoteInput } from "../schemas/note.schema";
import { createNoteSchema } from "../schemas/note.schema";
import { NoteLinksSelector } from "./note-links-selector";

const priorityOptions: SelectOption[] = [
  { value: "NORMAL", label: "Normal" },
  { value: "LOW", label: "Low" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

interface QuickNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  folderId?: string;
  categoryId?: string;
  contactId?: string;
  onNoteCreated?: (noteId: string, folderId: string | null) => void;
}

export function QuickNoteModal({
  open,
  onOpenChange,
  projectId,
  folderId,
  categoryId,
  contactId,
  onNoteCreated,
}: QuickNoteModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const createNote = useCreateNote();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(createNoteSchema),
    defaultValues: {
      content: "",
      priority: "NORMAL" as const,
      status: "ACTIVE" as const,
      folderId: undefined,
      categoryId: undefined,
      // Legacy fields - convert to links if provided
      projectId: undefined,
      contactId: undefined,
      links: [],
    },
  });

  // Update form values when props change
  useEffect(() => {
    if (open) {
      setValue("folderId", folderId || undefined);
      setValue("categoryId", categoryId || undefined);
      setValue("projectId", projectId || undefined);
      setValue("contactId", contactId || undefined);
      setValue(
        "links",
        contactId
          ? [{ linkType: "Contact" as const, linkId: contactId }]
          : projectId
            ? [{ linkType: "Project" as const, linkId: projectId }]
            : [],
      );
    }
  }, [open, folderId, categoryId, projectId, contactId, setValue]);

  const priority = watch("priority");
  const links = watch("links") || [];

  const onSubmit = async (data: CreateNoteInput) => {
    try {
      const createdNote = await createNote.mutateAsync(data as CreateNoteInput);
      reset({
        content: "",
        priority: "NORMAL" as const,
        status: "ACTIVE" as const,
        folderId: folderId || undefined,
        categoryId: categoryId || undefined,
        projectId: projectId || undefined,
        contactId: contactId || undefined,
        links: contactId
          ? [{ linkType: "Contact" as const, linkId: contactId }]
          : projectId
            ? [{ linkType: "Project" as const, linkId: projectId }]
            : [],
      });
      onOpenChange(false);
      // Call onNoteCreated callback with the created note's ID and folderId
      if (onNoteCreated && createdNote) {
        onNoteCreated(createdNote.id, createdNote.folderId);
      }
    } catch (error) {
      setError("root", {
        message:
          error instanceof Error ? error.message : "Failed to create note",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isClosing) {
      setIsClosing(true);
      reset();
      setTimeout(() => {
        setIsClosing(false);
        onOpenChange(false);
      }, 200);
    } else {
      onOpenChange(newOpen);
    }
  };

  const isLoading = isSubmitting || createNote.isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Quick Note</DialogTitle>
          <DialogDescription>Create a new note quickly</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            {errors.root && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {errors.root.message}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium">
                Note Content <span className="text-destructive">*</span>
              </label>
              <Textarea
                id="content"
                placeholder="Enter your note here..."
                rows={8}
                disabled={isLoading}
                aria-invalid={errors.content ? "true" : "false"}
                {...register("content")}
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  Markdown supported
                </span>
                <span className="text-xs text-muted-foreground">
                  {watch("content")?.length || 0} / 4000
                </span>
              </div>
              {errors.content && (
                <p className="text-sm text-destructive">
                  {errors.content.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="priority" className="text-sm font-medium">
                Priority
              </label>
              <Select
                value={priority || "NORMAL"}
                onValueChange={(value) =>
                  setValue(
                    "priority",
                    value as "LOW" | "NORMAL" | "HIGH" | "URGENT",
                  )
                }
                options={priorityOptions}
              />
              {errors.priority && (
                <p className="text-sm text-destructive">
                  {errors.priority.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <NoteLinksSelector
                value={links}
                onChange={(newLinks) => setValue("links", newLinks)}
              />
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
              {isLoading ? "Creating..." : "Create Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
