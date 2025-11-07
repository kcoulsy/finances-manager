"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getNoteCategoriesSchema } from "../schemas/note-category.schema";

export const getNoteCategoriesAction = actionClient
  .inputSchema(getNoteCategoriesSchema)
  .action(async () => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to view categories.");
      }

      const where: {
        userId: string;
      } = {
        userId: session.user.id,
      };

      const categories = await db.noteCategory.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              notes: true,
            },
          },
        },
      });

      return {
        success: true,
        categories,
      };
    } catch (error) {
      console.error("Get categories error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to retrieve categories. Please try again.",
      );
    }
  });
