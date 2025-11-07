"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteNoteSchema } from "../schemas/note.schema";

export const deleteNoteAction = actionClient
  .inputSchema(deleteNoteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to delete a note.");
      }

      const note = await db.note.findUnique({
        where: { id: parsedInput.noteId },
      });

      if (!note) {
        throw new Error("Note not found.");
      }

      if (note.userId !== session.user.id) {
        throw new Error("You don't have permission to delete this note.");
      }

      // Soft delete by setting deletedAt
      await db.note.update({
        where: { id: parsedInput.noteId },
        data: {
          deletedAt: new Date(),
          status: "DELETED",
        },
      });

      revalidatePath("/projects");
      if (note.projectId) {
        revalidatePath(`/projects/${note.projectId}/notes`);
      }

      return {
        success: true,
        toast: {
          message: "Note deleted successfully",
          type: "success",
          description: "Your note has been moved to trash.",
        },
      };
    } catch (error) {
      console.error("Delete note error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to delete note. Please try again.",
      );
    }
  });

