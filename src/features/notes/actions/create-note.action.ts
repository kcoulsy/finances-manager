"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createNoteSchema } from "../schemas/note.schema";

export const createNoteAction = actionClient
  .inputSchema(createNoteSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to create a note.");
      }

      // Create note with links
      const note = await db.note.create({
        data: {
          userId: session.user.id,
          title: parsedInput.title || null,
          content: parsedInput.content,
          priority: parsedInput.priority,
          status: parsedInput.status,
          categoryId: parsedInput.categoryId || null,
          folderId: parsedInput.folderId || null,
          // Legacy fields - kept for backward compatibility
          projectId: parsedInput.projectId || null,
          contactId: parsedInput.contactId || null,
          notableType: parsedInput.notableType || null,
          notableId: parsedInput.notableId || null,
          // Create note links
          noteLinks: {
            create:
              parsedInput.links?.map((link) => ({
                linkType: link.linkType,
                linkId: link.linkId,
              })) || [],
          },
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
      if (parsedInput.projectId) {
        revalidatePath(`/projects/${parsedInput.projectId}/notes`);
      }

      return {
        success: true,
        note,
        toast: {
          message: "Note created successfully",
          type: "success",
          description: "Your note has been created.",
        },
      };
    } catch (error) {
      console.error("Create note error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create note. Please try again.",
      );
    }
  });
