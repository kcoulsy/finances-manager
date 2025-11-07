"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteNoteFolderSchema } from "../schemas/note-folder.schema";

export const deleteNoteFolderAction = actionClient
  .inputSchema(deleteNoteFolderSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to delete a folder.");
      }

      // Check if folder exists and belongs to user
      const folder = await db.noteFolder.findUnique({
        where: { id: parsedInput.folderId },
        include: {
          notes: {
            where: {
              deletedAt: null, // Only get active notes
            },
          },
          children: true,
        },
      });

      if (!folder) {
        throw new Error("Folder not found.");
      }

      if (folder.userId !== session.user.id) {
        throw new Error("You don't have permission to delete this folder.");
      }

      // Check if folder has subfolders
      if (folder.children.length > 0) {
        throw new Error(
          "Cannot delete folder with subfolders. Please delete or move subfolders first.",
        );
      }

      const projectId = folder.projectId;

      if (parsedInput.includeNotes) {
        // Soft delete all notes in the folder
        await db.note.updateMany({
          where: {
            folderId: parsedInput.folderId,
            deletedAt: null, // Only update active notes
          },
          data: {
            deletedAt: new Date(),
            status: "DELETED",
          },
        });
      } else {
        // Move notes to parent folder (or root if no parent)
        await db.note.updateMany({
          where: {
            folderId: parsedInput.folderId,
            deletedAt: null, // Only update active notes
          },
          data: {
            folderId: folder.parentId || null,
          },
        });
      }

      // Delete the folder
      await db.noteFolder.delete({
        where: { id: parsedInput.folderId },
      });

      revalidatePath("/notes");
      revalidatePath("/projects");
      if (projectId) {
        revalidatePath(`/projects/${projectId}/notes`);
      }

      return {
        success: true,
        toast: {
          message: "Folder deleted successfully",
          type: "success",
          description: parsedInput.includeNotes
            ? `Folder and ${folder.notes.length} note${folder.notes.length === 1 ? "" : "s"} deleted.`
            : `Folder deleted. ${folder.notes.length} note${folder.notes.length === 1 ? " has" : "s have"} been moved.`,
        },
      };
    } catch (error) {
      console.error("Delete folder error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to delete folder. Please try again.",
      );
    }
  });
