"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { getProjectSchema } from "../schemas/project.schema";
import { headers } from "next/headers";

export const getProjectAction = actionClient
  .inputSchema(getProjectSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      const project = await db.project.findUnique({
        where: {
          id: parsedInput.projectId,
        },
      });

      if (!project) {
        throw new Error("Project not found");
      }

      // Ensure user owns this project
      if (project.userId !== session.user.id) {
        throw new Error(
          "Forbidden: You do not have permission to view this project"
        );
      }

      return {
        success: true,
        project,
      };
    } catch (error) {
      console.error("Get project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch project"
      );
    }
  });
