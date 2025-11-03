"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";
import { ProjectPermission } from "../constants/project-permissions";
import { requireProjectPermission } from "../lib/require-project-permission";
import { getProjectSchema } from "../schemas/project.schema";

export const getProjectAction = actionClient
  .inputSchema(getProjectSchema)
  .action(async ({ parsedInput }) => {
    // Check permission before fetching
    await requireProjectPermission(
      parsedInput.projectId,
      ProjectPermission.Details.VIEW,
    );

    const project = await db.project.findUnique({
      where: {
        id: parsedInput.projectId,
      },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    return {
      success: true,
      project,
    };
  });
