"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteCategorySchema } from "../schemas/category.schema";

export const deleteCategoryAction = actionClient
  .inputSchema(deleteCategorySchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to delete a category.");
      }

      // Verify category belongs to user (can't delete default categories)
      const existingCategory = await db.category.findUnique({
        where: { id: parsedInput.categoryId },
      });

      if (!existingCategory) {
        throw new Error("Category not found.");
      }

      if (existingCategory.isDefault) {
        throw new Error("Default categories cannot be deleted.");
      }

      if (existingCategory.userId !== session.user.id) {
        throw new Error("You don't have permission to delete this category.");
      }

      await db.category.delete({
        where: { id: parsedInput.categoryId },
      });

      return {
        success: true,
        toast: {
          message: "Category deleted successfully",
          type: "success",
          description: `Category "${existingCategory.name}" has been deleted`,
        },
      };
    } catch (error) {
      console.error("Delete category error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to delete category. Please try again.",
      );
    }
  });

