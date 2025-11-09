"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { z } from "zod";

export const getCategoriesAction = actionClient
  .inputSchema(z.object({}))
  .action(async () => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to view categories.");
      }

      // Get user categories and default categories
      const [userCategories, defaultCategories] = await Promise.all([
        db.category.findMany({
          where: {
            userId: session.user.id,
          },
          orderBy: {
            name: "asc",
          },
        }),
        db.category.findMany({
          where: {
            isDefault: true,
          },
          orderBy: {
            name: "asc",
          },
        }),
      ]);

      return {
        success: true,
        categories: [...defaultCategories, ...userCategories],
      };
    } catch (error) {
      console.error("Get categories error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to retrieve categories. Please try again.",
      );
    }
  });

