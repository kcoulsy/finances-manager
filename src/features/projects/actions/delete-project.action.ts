"use server";

import { Permission } from "@/features/auth/constants/permissions";
import { requirePermission } from "@/features/auth/lib/require-permission";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { deleteProjectSchema } from "../schemas/project.schema";

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

export const deleteProjectAction = actionClient
  .inputSchema(deleteProjectSchema)
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
      const session = await getSession();

      if (!session?.user) {
        throw new Error("Unauthorized");
      }

      // Check if user owns the project or has admin permission to delete any project
      if (existingProject.userId !== session.user.id) {
        await requirePermission(Permission.Project.ALL);
      }

      await db.project.delete({
        where: {
          id: parsedInput.projectId,
        },
      });

      return {
        success: true,
        message: "Project deleted successfully",
        toast: {
          message: "Project deleted successfully",
          type: "success",
          description: `Project "${existingProject.name}" has been permanently deleted.`,
        },
      };
    } catch (error) {
      // Re-throw Next.js navigation errors (redirect/notFound) as-is
      if (isNextJsNavigationError(error)) {
        throw error;
      }

      console.error("Delete project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to delete project",
      );
    }
  });
