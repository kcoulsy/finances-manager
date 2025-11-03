"use server";

import { Permission } from "@/features/auth/constants/permissions";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { actionClient } from "@/features/shared/lib/actions/client";
import { invalidateUserRolesCache } from "@/features/shared/lib/auth/get-user-roles";
import { db } from "@/features/shared/lib/db/client";
import { updateUserRolesSchema } from "../schemas/admin.schema";

/**
 * Update user roles
 * Requires admin.users.updateRoles permission
 */
export const updateUserRolesAction = actionClient
  .inputSchema(updateUserRolesSchema)
  .action(async ({ parsedInput }) => {
    // Require permission
    await requirePermission(Permission.Admin.USERS.UPDATE_ROLES);

    try {
      // Verify user exists
      const user = await db.user.findUnique({
        where: { id: parsedInput.userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      // Verify all role IDs exist
      const roles = await db.role.findMany({
        where: {
          id: {
            in: parsedInput.roleIds,
          },
        },
      });

      if (roles.length !== parsedInput.roleIds.length) {
        throw new Error("One or more roles not found");
      }

      // Remove all existing roles for this user
      await db.userRole.deleteMany({
        where: {
          userId: parsedInput.userId,
        },
      });

      // Add new roles
      await db.userRole.createMany({
        data: parsedInput.roleIds.map((roleId) => ({
          userId: parsedInput.userId,
          roleId,
        })),
      });

      // Invalidate roles cache for this user
      invalidateUserRolesCache(parsedInput.userId);

      // Fetch updated user with roles
      const updatedUser = await db.user.findUnique({
        where: { id: parsedInput.userId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!updatedUser) {
        throw new Error("Failed to fetch updated user");
      }

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
          message: "User roles updated successfully",
          type: "success",
          description: `Roles for "${updatedUser.name}" have been updated.`,
        },
      };
    } catch (error) {
      console.error("Error updating user roles:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update user roles",
      );
    }
  });
