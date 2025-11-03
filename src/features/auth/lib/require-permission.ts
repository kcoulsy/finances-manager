"use server";

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/features/shared/lib/auth/get-session";
import {
  type PermissionType,
  ROLE_PERMISSIONS,
} from "../constants/permissions";

/**
 * Gets the current user with their roles and permissions
 * @returns The authenticated user with their roles and permissions
 * @throws Error if user is not authenticated
 */
async function getCurrentUserWithPermissions() {
  const session = await getSession();

  if (!session?.user) {
    throw new Error("Unauthorized: You must be logged in");
  }

  // Roles are now included in the session from customSession plugin
  const userRoles = session.roles || [];
  const userPermissions = new Set<PermissionType>();

  // Get all permissions for the user's roles
  for (const roleName of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[roleName] || [];
    for (const perm of rolePermissions) {
      userPermissions.add(perm);
    }
  }

  return {
    user: session.user,
    roles: userRoles,
    permissions: userPermissions,
  };
}

/**
 * Checks if the user has any of the required permissions
 * @param userPermissions - Set of user permissions
 * @param requiredPermissions - Single permission or array of permissions to check
 * @returns true if user has at least one of the required permissions
 */
function hasAnyPermission(
  userPermissions: Set<PermissionType>,
  requiredPermissions: PermissionType | PermissionType[],
): boolean {
  const permissionsArray = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  for (const requiredPermission of permissionsArray) {
    // Check if user has the exact permission
    if (userPermissions.has(requiredPermission)) {
      return true;
    }

    // Check wildcard permissions (e.g., project:all covers all project permissions)
    if (checkWildcardPermission(userPermissions, requiredPermission)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a permission string is an admin permission
 * @param permissionString - The permission string to check
 * @returns true if it's an admin permission
 */
function isAdminPermission(permissionString: string): boolean {
  return (
    permissionString.startsWith("admin:") ||
    permissionString.startsWith("admin.")
  );
}

/**
 * Requires the current user to have at least one of the specified permissions
 * Checks if the user has any role that grants at least one of the required permissions
 * Redirects to appropriate page if user doesn't have the required permissions
 *
 * @param requiredPermissions - Single permission or array of permissions (user needs at least one)
 * @returns The authenticated user with their roles and permissions
 * @throws Redirects to unauthorized/404 page if user doesn't have the required permissions
 *
 * @example
 * ```ts
 * // Single permission
 * const user = await requirePermission(Permission.Project.ALL);
 *
 * // Multiple permissions (user needs at least one)
 * const user = await requirePermission([
 *   Permission.Project.ALL,
 *   Permission.Project.UPDATE,
 * ]);
 * ```
 */
export async function requirePermission(
  requiredPermissions: PermissionType | PermissionType[],
) {
  const { user, roles, permissions } = await getCurrentUserWithPermissions();

  // Check if user has any of the required permissions
  if (!hasAnyPermission(permissions, requiredPermissions)) {
    const permissionsArray = Array.isArray(requiredPermissions)
      ? requiredPermissions
      : [requiredPermissions];

    // Convert permissions to strings and check if any is admin permission
    const permissionStrings = permissionsArray.map(String);
    const hasAdminPermission = permissionStrings.some((p) =>
      isAdminPermission(p),
    );

    if (hasAdminPermission) {
      // Admin permissions → 404
      throw notFound();
    } else {
      // Other permissions → unauthorized page
      throw redirect(`/unauthorized`);
    }
  }

  return {
    user,
    roles,
    permissions: Array.from(permissions),
  };
}

/**
 * Checks if the user has a wildcard permission that covers the required permission
 * For example, if user has "project:all", they have all project permissions
 */
function checkWildcardPermission(
  userPermissions: Set<PermissionType>,
  requiredPermission: PermissionType,
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

  // Handle colon-separated permissions (e.g., "project:view")
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
