"use server";

import { headers } from "next/headers";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
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
      return false;
    }

    const hasRole = user.userRoles.some(
      (userRole) => userRole.role.name === requiredRole
    );

    return hasRole;
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
      return [];
    }

    return user.userRoles.map((ur) => ur.role.name);
  } catch (error) {
    return [];
  }
}

