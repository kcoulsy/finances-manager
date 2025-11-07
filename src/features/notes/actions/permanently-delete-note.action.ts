"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteNoteSchema } from "../schemas/note.schema";

export const permanentlyDeleteNoteAction = actionClient
  .inputSchema(deleteNoteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to permanently delete a note.");
      }

      const note = await db.note.findUnique({
        where: { id: parsedInput.noteId },
      });

      if (!note) {
        throw new Error("Note not found.");
      }

      if (note.userId !== session.user.id) {
        throw new Error("You don't have permission to permanently delete this note.");
      }

      // Permanently delete the note
      await db.note.delete({
        where: { id: parsedInput.noteId },
      });

      revalidatePath("/projects");
      if (note.projectId) {
        revalidatePath(`/projects/${note.projectId}/notes`);
      }

      return {
        success: true,
        toast: {
          message: "Note permanently deleted",
          type: "success",
          description: "Your note has been permanently deleted.",
        },
      };
    } catch (error) {
      console.error("Permanently delete note error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to permanently delete note. Please try again.",
      );
    }
  });

