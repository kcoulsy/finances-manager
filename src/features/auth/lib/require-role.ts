"use server";

import { headers } from "next/headers";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { UserRole, type UserRoleType } from "../constants/roles";

/**
 * Requires the current user to have a specific role
 * Throws an error if the user is not authenticated or doesn't have the required role
 *
 * @param requiredRole - The role that is required
 * @returns The authenticated user with their roles
 * @throws Error if user is not authenticated or doesn't have the required role
 *
 * @example
 * ```ts
 * const user = await requireRole(UserRole.ADMIN);
 * ```
 */
export async function requireRole(requiredRole: UserRoleType) {
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

  // Check if user has the required role
  const hasRole = user.userRoles.some(
    (userRole) => userRole.role.name === requiredRole
  );

  if (!hasRole) {
    throw new Error(
      `Forbidden: This action requires the ${requiredRole} role`
    );
  }

  return {
    user,
    roles: user.userRoles.map((ur) => ur.role.name as UserRoleType),
  };
}

