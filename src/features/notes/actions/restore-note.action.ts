"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { restoreNoteSchema } from "../schemas/note.schema";

export const restoreNoteAction = actionClient
  .inputSchema(restoreNoteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to restore a note.");
      }

      const note = await db.note.findUnique({
        where: { id: parsedInput.noteId },
      });

      if (!note) {
        throw new Error("Note not found.");
      }

      if (note.userId !== session.user.id) {
        throw new Error("You don't have permission to restore this note.");
      }

      if (!note.deletedAt) {
        throw new Error("Note is not deleted.");
      }

      await db.note.update({
        where: { id: parsedInput.noteId },
        data: {
          deletedAt: null,
          status: "ACTIVE",
        },
      });

      revalidatePath("/projects");
      if (note.projectId) {
        revalidatePath(`/projects/${note.projectId}/notes`);
      }

      return {
        success: true,
        toast: {
          message: "Note restored successfully",
          type: "success",
          description: "Your note has been restored.",
        },
      };
    } catch (error) {
      console.error("Restore note error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to restore note. Please try again.",
      );
    }
  });

