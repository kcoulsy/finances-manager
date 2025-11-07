"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { bulkDeleteNotesSchema } from "../schemas/note.schema";

export const bulkDeleteNotesAction = actionClient
  .inputSchema(bulkDeleteNotesSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to delete notes.");
      }

      // Verify all notes belong to the user
      const notes = await db.note.findMany({
        where: {
          id: { in: parsedInput.noteIds },
          userId: session.user.id,
        },
        select: {
          id: true,
          projectId: true,
        },
      });

      if (notes.length !== parsedInput.noteIds.length) {
        throw new Error("Some notes were not found or you don't have permission to delete them.");
      }

      // Soft delete all notes
      await db.note.updateMany({
        where: {
          id: { in: parsedInput.noteIds },
          userId: session.user.id,
        },
        data: {
          deletedAt: new Date(),
          status: "DELETED",
        },
      });

      // Revalidate paths for all affected projects
      const projectIds = [...new Set(notes.map((n) => n.projectId).filter(Boolean))];
      revalidatePath("/projects");
      projectIds.forEach((projectId) => {
        if (projectId) {
          revalidatePath(`/projects/${projectId}/notes`);
        }
      });

      return {
        success: true,
        toast: {
          message: `${notes.length} note${notes.length === 1 ? "" : "s"} deleted successfully`,
          type: "success",
          description: `Your note${notes.length === 1 ? "" : "s"} ${notes.length === 1 ? "has" : "have"} been moved to trash.`,
        },
      };
    } catch (error) {
      console.error("Bulk delete notes error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to delete notes. Please try again.",
      );
    }
  });

