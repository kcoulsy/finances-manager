"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { db } from "@/features/shared/lib/db/client";
import { verifyUserSchema } from "../schemas/admin.schema";
import { Permission } from "@/features/auth/constants/permissions";

/**
 * Verify a user's email manually
 * Requires admin.users.verify permission
 */
export const verifyUserAction = actionClient
  .inputSchema(verifyUserSchema)
  .action(async ({ parsedInput }) => {
    // Require permission
    await requirePermission(Permission.Admin.USERS.VERIFY);

    try {
      // Verify user exists
      const user = await db.user.findUnique({
        where: { id: parsedInput.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Update user to verified
      const updatedUser = await db.user.update({
        where: { id: parsedInput.userId },
        data: {
          emailVerified: true,
        },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      return {
        success: true,
        user: {
          ...updatedUser,
          roles: updatedUser.userRoles.map((ur) => ({
            id: ur.role.id,
            name: ur.role.name,
          })),
        },
        toast: {
          message: "User verified successfully",
          type: "success",
          description: `"${updatedUser.name}" has been verified.`,
        },
      };
    } catch (error) {
      console.error("Error verifying user:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to verify user"
      );
    }
  });

