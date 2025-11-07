"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getNotesSchema } from "../schemas/note.schema";

export const getNotesAction = actionClient
  .inputSchema(getNotesSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to view notes.");
      }

      const where: {
        userId: string;
        deletedAt?: null | { not: null };
        projectId?: string;
        folderId?: string;
        categoryId?: string;
        contactId?: string;
        priority?: string;
        status?: string;
        OR?: Array<{
          title?: { contains: string; mode?: "insensitive" };
          content?: { contains: string; mode?: "insensitive" };
        }>;
      } = {
        userId: session.user.id,
      };

      if (!parsedInput.includeDeleted) {
        where.deletedAt = null;
      } else {
        where.deletedAt = { not: null };
      }

      if (parsedInput.projectId) {
        where.projectId = parsedInput.projectId;
      }

      if (parsedInput.folderId) {
        where.folderId = parsedInput.folderId;
      }

      if (parsedInput.categoryId) {
        where.categoryId = parsedInput.categoryId;
      }

      if (parsedInput.contactId) {
        where.contactId = parsedInput.contactId;
      }

      if (parsedInput.priority) {
        where.priority = parsedInput.priority;
      }

      if (parsedInput.status) {
        where.status = parsedInput.status;
      }

      if (parsedInput.search) {
        where.OR = [
          { title: { contains: parsedInput.search } },
          { content: { contains: parsedInput.search } },
        ];
      }

      const orderBy: Record<string, "asc" | "desc"> = {};
      if (parsedInput.sortBy === "created_at") {
        orderBy.createdAt = parsedInput.sortDirection;
      } else if (parsedInput.sortBy === "updated_at") {
        orderBy.updatedAt = parsedInput.sortDirection;
      } else if (parsedInput.sortBy === "priority") {
        orderBy.priority = parsedInput.sortDirection;
      }

      const [notes, total] = await Promise.all([
        db.note.findMany({
          where,
          orderBy,
          take: parsedInput.limit,
          skip: parsedInput.offset,
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
        }),
        db.note.count({ where }),
      ]);

      return {
        success: true,
        notes,
        total,
        limit: parsedInput.limit,
        offset: parsedInput.offset,
      };
    } catch (error) {
      console.error("Get notes error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to retrieve notes. Please try again.",
      );
    }
  });
