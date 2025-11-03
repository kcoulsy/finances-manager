"use server";

import { actionClient } from "@/features/shared/lib/actions/client";
import { db } from "@/features/shared/lib/db/client";
import { ProjectPermission } from "../constants/project-permissions";
import { requireProjectPermission } from "../lib/require-project-permission";
import { updateProjectSchema } from "../schemas/project.schema";

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
      // Check permission before updating
      await requireProjectPermission(
        parsedInput.projectId,
        ProjectPermission.Details.UPDATE,
      );

      // Check if project exists
      const existingProject = await db.project.findUnique({
        where: {
          id: parsedInput.projectId,
        },
      });

      if (!existingProject) {
        throw new Error("Project not found");
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
        toast: {
          message: "Project updated successfully",
          type: "success",
          description: `Project "${project.name}" has been updated.`,
        },
      };
    } catch (error) {
      // Re-throw Next.js navigation errors (redirect/notFound) as-is
      if (isNextJsNavigationError(error)) {
        throw error;
      }

      console.error("Update project error:", error);
      throw new Error(
        error instanceof Error ? error.message : "Failed to update project",
      );
    }
  });
