"use server";

import { notFound, redirect } from "next/navigation";
import {
  Permission,
  type PermissionType,
  ROLE_PERMISSIONS,
} from "@/features/auth/constants/permissions";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import {
  PROJECT_ROLE_PERMISSIONS,
  ProjectPermission,
  type ProjectPermissionType,
} from "../constants/project-permissions";

export interface ProjectUserAccess {
  user: { id: string; name: string | null; email: string };
  project: { id: string; name: string; userId: string };
  permission: ProjectPermissionType;
  isOwner: boolean;
  isMember: boolean;
  isInvited: boolean;
  userType?: "Client" | "Contractor" | "Employee" | "Legal";
}

/**
 * Determines the user's role on a specific project
 * @param userId - The user ID to check
 * @param projectId - The project ID to check
 * @returns The user's role on the project
 */
async function getUserProjectRole(
  userId: string,
  projectId: string,
): Promise<"OWNER" | "MEMBER" | "INVITED" | "NONE"> {
  // Check if project exists
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, userId: true },
  });

  if (!project) {
    return "NONE";
  }

  // Check if user is project owner
  if (project.userId === userId) {
    return "OWNER";
  }

  // Check if user is a member of the project
  const projectUser = await db.projectUser.findUnique({
    where: {
      projectId_userId: {
        projectId,
        userId,
      },
    },
  });

  if (projectUser) {
    return "MEMBER";
  }

  // Check if user has a pending invitation
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  if (user?.email) {
    const invitation = await db.projectInvitation.findFirst({
      where: {
        projectId,
        email: user.email,
        status: "PENDING",
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (invitation) {
      return "INVITED";
    }
  }

  return "NONE";
}

/**
 * Checks if a wildcard permission covers the required permission
 * For example, if user has "project:owner", they have all project permissions
 */
function checkWildcardPermission(
  userPermissions: Set<ProjectPermissionType>,
  requiredPermission: ProjectPermissionType,
): boolean {
  // OWNER has all permissions
  if (userPermissions.has(ProjectPermission.OWNER)) {
    return true;
  }

  // Check if required permission is a base level permission
  const permissionString = String(requiredPermission);

  // If it's a granular permission (e.g., "project.invite"), check if user has base permission
  if (permissionString.startsWith("project.")) {
    // For granular permissions, owner role covers all
    // This is already handled above, but we can add more specific checks here if needed
  }

  return false;
}

/**
 * Requires the current user to have a specific permission on a project
 * Redirects to appropriate page if user doesn't have the required permission
 *
 * @param projectId - The project ID to check
 * @param requiredPermission - Single permission or array of permissions (user needs at least one)
 * @returns The authenticated user with their project access details
 * @throws Redirects to unauthorized/404 page if user doesn't have the required permission
 *
 * @example
 * ```ts
 * // Single permission
 * const access = await requireProjectPermission(projectId, ProjectPermission.OWNER);
 *
 * // Multiple permissions (user needs at least one)
 * const access = await requireProjectPermission(projectId, [
 *   ProjectPermission.OWNER,
 *   ProjectPermission.MEMBER,
 * ]);
 * ```
 */
export async function requireProjectPermission(
  projectId: string,
  requiredPermission: ProjectPermissionType | ProjectPermissionType[],
): Promise<ProjectUserAccess> {
  const session = await getSession();

  if (!session?.user) {
    throw redirect("/login");
  }

  // Get project details
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: {
      id: true,
      name: true,
      userId: true,
    },
  });

  if (!project) {
    throw notFound();
  }

  // Check if user has site-wide admin permission (admins can access all projects)
  // Get user's roles and check if they have Permission.Project.ALL
  const userRoles = session.roles || [];
  const userSitePermissions = new Set<PermissionType>();
  for (const roleName of userRoles) {
    const rolePermissions = ROLE_PERMISSIONS[roleName] || [];
    for (const perm of rolePermissions) {
      userSitePermissions.add(perm);
    }
  }

  // If user has Permission.Project.ALL (admin permission), grant access
  if (userSitePermissions.has(Permission.Project.ALL)) {
    // Admin has access, return early with admin-level access
    // Note: Admins get OWNER-level access to projects they don't own
    // Return admin access with OWNER-level permissions
    return {
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      project,
      permission: ProjectPermission.OWNER,
      isOwner: false, // Admin is not the owner but has owner permissions
      isMember: true,
      isInvited: false,
    };
  }

  // Get user's role on the project (OWNER, MEMBER, INVITED, NONE)
  const userRole = await getUserProjectRole(session.user.id, projectId);

  // Get all permissions for the user's role
  const userPermissions = new Set<ProjectPermissionType>(
    PROJECT_ROLE_PERMISSIONS[userRole],
  );

  // Check if user has any of the required permissions
  const requiredPermissions = Array.isArray(requiredPermission)
    ? requiredPermission
    : [requiredPermission];

  const hasProjectPermission = requiredPermissions.some((reqPerm) => {
    // Check if user has the exact permission
    if (userPermissions.has(reqPerm)) {
      return true;
    }

    // Check wildcard permissions (e.g., project:owner covers all project permissions)
    if (checkWildcardPermission(userPermissions, reqPerm)) {
      return true;
    }

    return false;
  });

  if (!hasProjectPermission) {
    // OWNER permission → 404, other permissions → unauthorized
    if (
      requiredPermissions.includes(ProjectPermission.OWNER) ||
      requiredPermissions.includes(ProjectPermission.MEMBER)
    ) {
      throw notFound();
    } else {
      throw redirect("/unauthorized");
    }
  }

  // Get additional details for response
  const isOwner = userRole === "OWNER";
  const isMember = userRole === "OWNER" || userRole === "MEMBER";
  const isInvited = userRole === "INVITED";

  // Get project user details if user is a member
  let userType: "Client" | "Contractor" | "Employee" | "Legal" | undefined;
  if (isMember) {
    const projectUser = await db.projectUser.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id,
        },
      },
      select: {
        userType: true,
      },
    });
    userType = projectUser?.userType as
      | "Client"
      | "Contractor"
      | "Employee"
      | "Legal"
      | undefined;
  }

  // Determine the base permission level (for backward compatibility)
  const permission: ProjectPermissionType =
    userRole === "OWNER"
      ? ProjectPermission.OWNER
      : userRole === "MEMBER"
        ? ProjectPermission.MEMBER
        : userRole === "INVITED"
          ? ProjectPermission.INVITED
          : ProjectPermission.NONE;

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
    project: {
      id: project.id,
      name: project.name,
      userId: project.userId,
    },
    permission,
    isOwner,
    isMember,
    isInvited,
    userType,
  };
}
