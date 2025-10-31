"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { updateProjectSchema } from "../schemas/project.schema";
import { headers } from "next/headers";

export const updateProjectAction = actionClient
  .inputSchema(updateProjectSchema)
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
        throw new Error("Forbidden: You do not have permission to edit this project");
      }

      const project = await db.project.update({
        where: {
          id: parsedInput.projectId,
        },
        data: {
          name: parsedInput.name,
          description: parsedInput.description ?? null,
        },
      });

      return {
        success: true,
        project,
      };
    } catch (error) {
      console.error("Update project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update project"
      );
    }
  });

