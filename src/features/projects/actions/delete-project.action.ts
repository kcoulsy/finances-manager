"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { deleteProjectSchema } from "../schemas/project.schema";
import { headers } from "next/headers";

export const deleteProjectAction = actionClient
  .inputSchema(deleteProjectSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // First check if project exists and user owns it
      const existingProject = await db.project.findUnique({
        where: {
          id: parsedInput.projectId,
        },
      });

      if (!existingProject) {
        throw new Error("Project not found");
      }

      if (existingProject.userId !== session.user.id) {
        throw new Error("Forbidden: You do not have permission to delete this project");
      }

      await db.project.delete({
        where: {
          id: parsedInput.projectId,
        },
      });

      return {
        success: true,
        message: "Project deleted successfully",
      };
    } catch (error) {
      console.error("Delete project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete project"
      );
    }
  });

