"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { updateNoteFolderSchema } from "../schemas/note-folder.schema";

export const updateNoteFolderAction = actionClient
  .inputSchema(updateNoteFolderSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to update a folder.");
      }

      // Check if folder exists and belongs to user
      const existingFolder = await db.noteFolder.findUnique({
        where: { id: parsedInput.folderId },
      });

      if (!existingFolder) {
        throw new Error("Folder not found.");
      }

      if (existingFolder.userId !== session.user.id) {
        throw new Error("You don't have permission to update this folder.");
      }

      // Update folder
      const folder = await db.noteFolder.update({
        where: { id: parsedInput.folderId },
        data: {
          name: parsedInput.name,
          description: parsedInput.description,
          parentId: parsedInput.parentId,
        },
      });

      revalidatePath("/notes");
      revalidatePath("/projects");
      if (folder.projectId) {
        revalidatePath(`/projects/${folder.projectId}/notes`);
      }

      return {
        success: true,
        folder,
        toast: {
          message: "Folder updated successfully",
          type: "success",
          description: `Folder "${folder.name}" has been updated.`,
        },
      };
    } catch (error) {
      console.error("Update folder error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to update folder. Please try again.",
      );
    }
  });
