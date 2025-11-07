"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createNoteCategorySchema } from "../schemas/note-category.schema";

export const createNoteCategoryAction = actionClient
  .inputSchema(createNoteCategorySchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be signed in to create a category.");
      }

      const category = await db.noteCategory.create({
        data: {
          userId: session.user.id,
          name: parsedInput.name,
          color: parsedInput.color,
        },
      });

      revalidatePath("/projects");

      return {
        success: true,
        category,
        toast: {
          message: "Category created successfully",
          type: "success",
          description: `Category "${category.name}" has been created.`,
        },
      };
    } catch (error) {
      console.error("Create category error:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to create category. Please try again.",
      );
    }
  });

