"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createCategorySchema } from "../schemas/category.schema";

export const createCategoryAction = actionClient
  .inputSchema(createCategorySchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to create a category.");
      }

      const category = await db.category.create({
        data: {
          name: parsedInput.name,
          color: parsedInput.color || null,
          icon: parsedInput.icon || null,
          userId: session.user.id,
          isDefault: false,
        },
      });

      return {
        success: true,
        category,
        toast: {
          message: "Category created successfully",
          type: "success",
          description: `Category "${category.name}" has been created`,
        },
      };
    } catch (error) {
      console.error("Create category error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to create category. Please try again.",
      );
    }
  });

