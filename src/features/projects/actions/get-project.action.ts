"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { Permission } from "@/features/auth/constants/permissions";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { getProjectSchema } from "../schemas/project.schema";
import { headers } from "next/headers";

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
    const session = await auth.api.getSession({
      headers: await headers(),
    });

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
