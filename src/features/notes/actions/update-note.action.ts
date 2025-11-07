"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { updateNoteSchema } from "../schemas/note.schema";

export const updateNoteAction = actionClient
  .inputSchema(updateNoteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to update a note.");
      }

      // Check if note exists and belongs to user
      const existingNote = await db.note.findUnique({
        where: { id: parsedInput.noteId },
      });

      if (!existingNote) {
        throw new Error("Note not found.");
      }

      if (existingNote.userId !== session.user.id) {
        throw new Error("You don't have permission to update this note.");
      }

      // Update note links if provided
      if (parsedInput.links !== undefined) {
        // Delete all existing links
        await db.noteLink.deleteMany({
          where: { noteId: parsedInput.noteId },
        });
      }

      const note = await db.note.update({
        where: { id: parsedInput.noteId },
        data: {
          title:
            parsedInput.title !== undefined ? parsedInput.title : undefined,
          content: parsedInput.content,
          priority: parsedInput.priority,
          status: parsedInput.status,
          categoryId:
            parsedInput.categoryId !== undefined
              ? parsedInput.categoryId
              : undefined,
          folderId:
            parsedInput.folderId !== undefined
              ? parsedInput.folderId
              : undefined,
          // Update note links if provided
          ...(parsedInput.links !== undefined && {
            noteLinks: {
              create: parsedInput.links.map((link) => ({
                linkType: link.linkType,
                linkId: link.linkId,
              })),
            },
          }),
        },
        include: {
          category: true,
          folder: true,
          project: true,
          contact: true,
          noteLinks: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      revalidatePath("/projects");
      if (note.projectId) {
        revalidatePath(`/projects/${note.projectId}/notes`);
      }

      return {
        success: true,
        note,
        toast: {
          message: "Note updated successfully",
          type: "success",
          description: "Your note has been updated.",
        },
      };
    } catch (error) {
      console.error("Update note error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update note. Please try again.",
      );
    }
  });
