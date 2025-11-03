"use server";

import { Permission } from "@/features/auth/constants/permissions";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { getProjectSchema } from "../schemas/project.schema";

export const getProjectAction = actionClient
  .inputSchema(getProjectSchema)
  .action(async ({ parsedInput }) => {
    const project = await db.project.findUnique({
      where: {
        id: parsedInput.projectId,
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    // Get current user session
    const session = await getSession();

    if (!session?.user) {
      throw new Error("Unauthorized");
    }

    // Check if user owns the project or has admin permission to view any project
    if (project.userId !== session.user.id) {
      await requirePermission(Permission.Project.ALL);
    }

    return {
      success: true,
      project,
    };
  });
