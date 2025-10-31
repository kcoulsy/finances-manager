"use server";

import { headers } from "next/headers";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { ROLE_PERMISSIONS, type PermissionType } from "../constants/permissions";

/**
 * Requires the current user to have a specific permission
 * Checks if the user has any role that grants the required permission
 * Throws an error if the user is not authenticated or doesn't have the permission
 *
 * @param requiredPermission - The permission that is required
 * @returns The authenticated user with their roles and permissions
 * @throws Error if user is not authenticated or doesn't have the required permission
 *
 * @example
 * ```ts
 * const user = await requirePermission(Permission.Project.ALL);
 * ```
 */
export async function requirePermission(requiredPermission: PermissionType) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized: You must be logged in");
  }

  // Get user with their roles
  const user = await db.user.findUnique({
    where: { id: session.user.id },
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

  // Get all permissions for the user's roles
  const userRoles = user.userRoles.map((ur) => ur.role.name);
  const userPermissions = new Set<PermissionType>();

  for (const roleName of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[roleName] || [];
    rolePermissions.forEach((perm) => userPermissions.add(perm));
  }

  // Check if user has the required permission
  // Also check for "all" permissions (e.g., if they have "project:all", they have all project permissions)
  const hasPermission =
    userPermissions.has(requiredPermission) ||
    checkWildcardPermission(userPermissions, requiredPermission);

  if (!hasPermission) {
    throw new Error(
      `Forbidden: This action requires the ${requiredPermission} permission`
    );
  }

  return {
    user,
    roles: userRoles,
    permissions: Array.from(userPermissions),
  };
}

/**
 * Checks if the user has a wildcard permission that covers the required permission
 * For example, if user has "project:all", they have all project permissions
 */
function checkWildcardPermission(
  userPermissions: Set<PermissionType>,
  requiredPermission: PermissionType
): boolean {
  // Convert permission to string
  const permissionString = String(requiredPermission);
  
  // Handle dot-separated permissions (e.g., "admin.users.viewAll")
  const parts = permissionString.split(".");
  if (parts.length >= 2 && parts[0] === "admin" && parts[1] === "users") {
    // For admin.users.* permissions, check for admin:all
    if (userPermissions.has("admin:all" as PermissionType)) {
      return true;
    }
    return false;
  }
  
  // Handle colon-separated permissions (e.g., "project:read")
  const colonParts = permissionString.split(":");
  if (colonParts.length === 2) {
    const resource = colonParts[0];
    const wildcardPermission = `${resource}:all` as PermissionType;

    // Check if user has the wildcard permission
    if (userPermissions.has(wildcardPermission)) {
      return true;
    }
  }

  // Check if user has admin:all (admins have all permissions)
  if (userPermissions.has("admin:all" as PermissionType)) {
    return true;
  }

  return false;
}
