"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { updateCategorySchema } from "../schemas/category.schema";

export const updateCategoryAction = actionClient
  .inputSchema(updateCategorySchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session) {
        throw new Error("You must be signed in to update a category.");
      }

      // Verify category belongs to user (can't update default categories)
      const existingCategory = await db.category.findUnique({
        where: { id: parsedInput.categoryId },
      });

      if (!existingCategory) {
        throw new Error("Category not found.");
      }

      if (existingCategory.isDefault) {
        throw new Error("Default categories cannot be modified.");
      }

      if (existingCategory.userId !== session.user.id) {
        throw new Error("You don't have permission to update this category.");
      }

      const updateData: {
        name?: string;
        color?: string | null;
        icon?: string | null;
      } = {};

      if (parsedInput.name !== undefined) updateData.name = parsedInput.name;
      if (parsedInput.color !== undefined)
        updateData.color = parsedInput.color || null;
      if (parsedInput.icon !== undefined)
        updateData.icon = parsedInput.icon || null;

      const category = await db.category.update({
        where: { id: parsedInput.categoryId },
        data: updateData,
      });

      return {
        success: true,
        category,
        toast: {
          message: "Category updated successfully",
          type: "success",
          description: `Category "${category.name}" has been updated`,
        },
      };
    } catch (error) {
      console.error("Update category error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Unable to update category. Please try again.",
      );
    }
  });

