"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getNoteFoldersSchema } from "../schemas/note-folder.schema";

export const getNoteFoldersAction = actionClient
  .inputSchema(getNoteFoldersSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to view folders.");
      }

      const where: {
        userId: string;
        projectId?: string;
        context?: string;
        parentId?: string | null;
      } = {
        userId: session.user.id,
      };

      if (parsedInput.projectId) {
        where.projectId = parsedInput.projectId;
      }

      if (parsedInput.context) {
        where.context = parsedInput.context;
      }

      if (parsedInput.parentId !== undefined) {
        where.parentId = parsedInput.parentId;
      }

      const folders = await db.noteFolder.findMany({
        where,
        orderBy: [
          { sortOrder: "asc" },
          { name: "asc" },
        ],
        include: {
          parent: true,
          project: true,
          _count: {
            select: {
              notes: true,
              children: true,
            },
          },
        },
      });

      return {
        success: true,
        folders,
      };
    } catch (error) {
      console.error("Get folders error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to retrieve folders. Please try again.",
      );
    }
  });

