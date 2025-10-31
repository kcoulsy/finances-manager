"use server";

import { headers } from "next/headers";
import { auth } from "@/features/shared/lib/auth/config";
import type { SessionWithRoles } from "./types";
import { UserRole, type UserRoleType } from "@/features/auth/constants/roles";

/**
 * Check if the current user has a specific role
 * Returns false if user is not authenticated or doesn't have the role
 * Does not throw errors
 *
 * @param requiredRole - The role to check for
 * @returns true if user has the role, false otherwise
 */
export async function hasRole(requiredRole: UserRoleType): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return false;
    }

    // Roles are now included in the session from customSession plugin
    const roles = (session as SessionWithRoles).roles || [];
    return roles.includes(requiredRole);
  } catch (error) {
    return false;
  }
}

/**
 * Get the current user's roles
 * Returns empty array if user is not authenticated
 *
 * @returns Array of role names
 */
export async function getUserRoles(): Promise<string[]> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return [];
    }

    // Roles are now included in the session from customSession plugin
    return (session as SessionWithRoles).roles || [];
  } catch (error) {
    return [];
  }
}
