"use server";

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";

export interface ProjectUserRole {
  user: { id: string; name: string | null; email: string };
  project: { id: string; name: string; userId: string };
  role: "OWNER" | "MEMBER" | "INVITED" | "NONE";
  userType?: "Client" | "Contractor" | "Employee" | "Legal";
  isOwner: boolean;
  isMember: boolean;
  isInvited: boolean;
}

/**
 * Gets the user's role on a specific project
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

  if (user) {
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
 * Requires the current user to have a specific role on a project
 * Redirects to appropriate page if user doesn't have the required role
 *
 * @param projectId - The project ID to check
 * @param requiredRole - The role that is required
 * @returns The authenticated user with their project role details
 * @throws Redirects to unauthorized/404 page if user doesn't have the required role
 *
 * @example
 * ```ts
 * const access = await requireProjectRole(projectId, "OWNER");
 * ```
 */
export async function requireProjectRole(
  projectId: string,
  requiredRole: "OWNER" | "MEMBER" | "INVITED",
): Promise<ProjectUserRole> {
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

  // Get user's role on the project
  const role = await getUserProjectRole(session.user.id, projectId);

  // Check if user has the required role
  let hasRequiredRole = false;

  if (requiredRole === "OWNER") {
    hasRequiredRole = role === "OWNER";
  } else if (requiredRole === "MEMBER") {
    // MEMBER role includes OWNER (owners are also members)
    hasRequiredRole = role === "OWNER" || role === "MEMBER";
  } else if (requiredRole === "INVITED") {
    // INVITED role includes OWNER and MEMBER (they all have some access)
    hasRequiredRole =
      role === "OWNER" || role === "MEMBER" || role === "INVITED";
  }

  if (!hasRequiredRole) {
    // OWNER/MEMBER role → 404, INVITED role → unauthorized
    if (requiredRole === "OWNER" || requiredRole === "MEMBER") {
      throw notFound();
    } else {
      throw redirect("/unauthorized");
    }
  }

  // Get additional details for response
  const isOwner = role === "OWNER";
  const isMember = role === "OWNER" || role === "MEMBER";
  const isInvited = role === "INVITED";

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
    role,
    isOwner,
    isMember,
    isInvited,
    userType,
  };
}
