"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { db } from "@/features/shared/lib/db/client";
import { getUserSchema } from "../schemas/admin.schema";
import { Permission } from "@/features/auth/constants/permissions";

/**
 * Get a single user with their roles
 * Requires admin.users.viewSingle permission
 */
export const getUserAction = actionClient
  .inputSchema(getUserSchema)
  .action(async ({ parsedInput }) => {
    // Require permission
    await requirePermission(Permission.Admin.USERS.VIEW_SINGLE);

    try {
      const user = await db.user.findUnique({
        where: { id: parsedInput.userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      return {
        success: true,
        user: {
          ...user,
          roles: user.userRoles.map((ur) => ({
            id: ur.role.id,
            name: ur.role.name,
          })),
        },
      };
    } catch (error) {
      console.error("Error fetching user:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to fetch user",
      );
    }
  });
