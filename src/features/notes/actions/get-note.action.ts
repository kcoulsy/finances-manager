"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getNoteSchema } from "../schemas/note.schema";

export const getNoteAction = actionClient
  .inputSchema(getNoteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to view a note.");
      }

      const note = await db.note.findUnique({
        where: { id: parsedInput.noteId },
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

      if (!note) {
        throw new Error("Note not found.");
      }

      if (note.userId !== session.user.id) {
        throw new Error("You don't have permission to view this note.");
      }

      return {
        success: true,
        note,
      };
    } catch (error) {
      console.error("Get note error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to retrieve note. Please try again.",
      );
    }
  });
