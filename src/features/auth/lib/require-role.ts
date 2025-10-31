"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/features/shared/lib/auth/config";
import type { SessionWithRoles } from "@/features/shared/lib/auth/types";
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

  // Roles are now included in the session from customSession plugin
  const roles = (session as SessionWithRoles).roles || [];
  const hasRequiredRole = roles.includes(requiredRole);

  if (!hasRequiredRole) {
    // ADMIN role → 404, other roles → unauthorized
    if (requiredRole === UserRole.ADMIN) {
      throw notFound();
    } else {
      throw redirect(`/unauthorized`);
    }
  }

  return {
    user: session.user,
    roles: roles as UserRoleType[],
  };
}
