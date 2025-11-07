"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createNoteFolderSchema } from "../schemas/note-folder.schema";

export const createNoteFolderAction = actionClient
  .inputSchema(createNoteFolderSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to create a folder.");
      }

      // If parentId is provided, verify it exists, belongs to user, and depth is valid
      if (parsedInput.parentId) {
        const parentFolder = await db.noteFolder.findUnique({
          where: { id: parsedInput.parentId },
          include: {
            parent: {
              include: {
                parent: true, // Go up 2 levels to check depth
              },
            },
          },
        });

        if (!parentFolder) {
          throw new Error("Parent folder not found.");
        }

        if (parentFolder.userId !== session.user.id) {
          throw new Error(
            "You don't have permission to create a folder in this parent folder.",
          );
        }

        // Calculate depth: if parent has a parent, we're at level 2, so can't create another level
        let depth = 0;
        let current = parentFolder;
        while (current.parent) {
          depth++;
          current = current.parent;
          if (depth >= 2) {
            throw new Error(
              "Maximum folder depth is 3 levels. Cannot create a subfolder here.",
            );
          }
        }

        // If parent is at depth 2, we can't create a child (would be depth 3)
        if (depth >= 2) {
          throw new Error(
            "Maximum folder depth is 3 levels. Cannot create a subfolder here.",
          );
        }
      }

      const folder = await db.noteFolder.create({
        data: {
          userId: session.user.id,
          name: parsedInput.name,
          description: parsedInput.description || null,
          parentId: parsedInput.parentId || null,
          projectId: parsedInput.projectId || null,
          context: parsedInput.context,
        },
        include: {
          parent: true,
          project: true,
        },
      });

      revalidatePath("/projects");
      if (parsedInput.projectId) {
        revalidatePath(`/projects/${parsedInput.projectId}/notes`);
      }

      return {
        success: true,
        folder,
        toast: {
          message: "Folder created successfully",
          type: "success",
          description: `Folder "${folder.name}" has been created.`,
        },
      };
    } catch (error) {
      console.error("Create folder error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create folder. Please try again.",
      );
    }
  });
