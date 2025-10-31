"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { db } from "@/features/shared/lib/db/client";
import { Permission } from "@/features/auth/constants/permissions";

/**
 * Get all users with their roles
 * Requires admin.users.viewAll permission
 */
export const getUsersAction = actionClient.action(async () => {
  // Require permission
  await requirePermission(Permission.Admin.USERS.VIEW_ALL);

  try {
    const users = await db.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return {
      success: true,
      users: users.map((user) => ({
        ...user,
        roles: user.userRoles.map((ur) => ur.role.name),
      })),
    };
  } catch (error) {
    console.error("Error fetching users:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch users"
    );
  }
});

