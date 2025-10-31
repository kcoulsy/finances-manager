"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { Permission } from "@/features/auth/constants/permissions";
import { auth } from "@/features/shared/lib/auth/config";
import { db } from "@/features/shared/lib/db/client";
import { updateProjectSchema } from "../schemas/project.schema";
import { headers } from "next/headers";

/**
 * Checks if an error is a Next.js redirect or notFound error
 * These errors should be re-thrown as-is, not wrapped
 */
function isNextJsNavigationError(error: unknown): boolean {
  if (error && typeof error === "object" && "digest" in error) {
    const digest = String(error.digest);
    return (
      digest.includes("NEXT_REDIRECT") || digest.includes("NEXT_NOT_FOUND")
    );
  }
  return false;
}

export const updateProjectAction = actionClient
  .inputSchema(updateProjectSchema)
  .action(async ({ parsedInput }) => {
    try {
      // First check if project exists
      const existingProject = await db.project.findUnique({
        where: {
          id: parsedInput.projectId,
        },
      });

      if (!existingProject) {
        throw new Error("Project not found");
      }

      // Get current user session
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Check if user owns the project or has admin permission to update any project
      if (existingProject.userId !== session.user.id) {
        await requirePermission(Permission.Project.ALL);
      }

      const project = await db.project.update({
        where: {
          id: parsedInput.projectId,
        },
        data: {
          name: parsedInput.name,
          description: parsedInput.description ?? null,
        },
      });

      return {
        success: true,
        project,
      };
    } catch (error) {
      // Re-throw Next.js navigation errors (redirect/notFound) as-is
      if (isNextJsNavigationError(error)) {
        throw error;
      }

      console.error("Update project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update project"
      );
    }
  });
