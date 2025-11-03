"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { createProjectSchema } from "../schemas/project.schema";

export const createProjectAction = actionClient
  .inputSchema(createProjectSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const project = await db.project.create({
        data: {
          name: parsedInput.name,
          description: parsedInput.description || null,
          userId: session.user.id,
        },
      });

      return {
        success: true,
        project,
        toast: {
          message: "Project created successfully",
          type: "success",
          description: `Project "${project.name}" has been created.`,
        },
      };
    } catch (error) {
      console.error("Create project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    }
  });
