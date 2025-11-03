"use server";

import { Permission } from "@/features/auth/constants/permissions";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";
import { getUserSchema } from "../schemas/admin.schema";

/**
 * Get all projects for a specific user
 * Requires admin.users.viewSingle permission
 */
export const getUserProjectsAction = actionClient
  .inputSchema(getUserSchema)
  .action(async ({ parsedInput }) => {
    // Require permission
    await requirePermission(Permission.Admin.USERS.VIEW_SINGLE);

    try {
      const projects = await db.project.findMany({
        where: {
          userId: parsedInput.userId,
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      return {
        success: true,
        projects,
      };
    } catch (error) {
      console.error("Error fetching user projects:", error);
      throw new Error(
        error instanceof Error
          ? error.message
          : "Failed to fetch user projects",
      );
    }
  });
