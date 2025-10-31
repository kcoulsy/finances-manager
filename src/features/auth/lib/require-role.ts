"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { UserRole, type UserRoleType } from "../constants/roles";

/**
 * Requires the current user to have a specific role
 * Redirects to appropriate page if user doesn't have the required role
 *
 * @param requiredRole - The role that is required
 * @returns The authenticated user with their roles
 * @throws Redirects to unauthorized/404 page if user doesn't have the required role
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
    throw redirect("/login");
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
    throw redirect("/unauthorized");
  }

  // Check if user has the required role
  const hasRole = user.userRoles.some(
    (userRole) => userRole.role.name === requiredRole
  );

  if (!hasRole) {
    // ADMIN role → 404, other roles → unauthorized
    if (requiredRole === UserRole.ADMIN) {
      throw notFound();
    } else {
      throw redirect(`/unauthorized`);
    }
  }

  return {
    user,
    roles: user.userRoles.map((ur) => ur.role.name as UserRoleType),
  };
}
