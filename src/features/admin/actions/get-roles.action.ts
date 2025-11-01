"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { db } from "@/features/shared/lib/db/client";
import { Permission } from "@/features/auth/constants/permissions";

/**
 * Get all available roles
 * Requires admin.users.viewSingle permission (needed to view roles on user detail page)
 */
export const getRolesAction = actionClient.action(async () => {
  // Require permission
  await requirePermission(Permission.Admin.USERS.VIEW_SINGLE);

  try {
    const roles = await db.role.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return {
      success: true,
      roles,
    };
  } catch (error) {
    console.error("Error fetching roles:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to fetch roles",
    );
  }
});
