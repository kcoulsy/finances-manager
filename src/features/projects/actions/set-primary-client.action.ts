"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { ProjectPermission } from "../constants/project-permissions";
import { requireProjectPermission } from "../lib/require-project-permission";

const setPrimaryClientSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  userId: z.string().min(1, "User ID is required").optional(),
});

export const setPrimaryClientAction = actionClient
  .inputSchema(setPrimaryClientSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Check permission
      await requireProjectPermission(
        parsedInput.projectId,
        ProjectPermission.Settings.EDIT,
      );

      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be logged in to set primary client.");
      }

      // Verify project exists
      const project = await db.project.findUnique({
        where: { id: parsedInput.projectId },
        include: {
          projectUsers: {
            where: {
              userType: "Client",
            },
          },
        },
      });

      if (!project) {
        throw new Error("Project not found.");
      }

      // If no userId provided, clear primary client
      if (!parsedInput.userId) {
        await db.project.update({
          where: { id: parsedInput.projectId },
          data: {
            primaryClientId: null,
          },
        });

        revalidatePath(`/projects/${parsedInput.projectId}/users`);
        revalidatePath(`/projects/${parsedInput.projectId}`);

        return {
          success: true,
          toast: {
            message: "Primary client cleared",
            type: "success",
            description:
              "The primary client has been removed from this project.",
          },
        };
      }

      // Verify user exists and is a Client on the project
      const projectUser = await db.projectUser.findUnique({
        where: {
          projectId_userId: {
            projectId: parsedInput.projectId,
            userId: parsedInput.userId,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!projectUser) {
        throw new Error("User not found on this project.");
      }

      if (projectUser.userType !== "Client") {
        throw new Error("Only clients can be set as the primary client.");
      }

      // Update project with new primary client
      await db.project.update({
        where: { id: parsedInput.projectId },
        data: {
          primaryClientId: parsedInput.userId,
        },
      });

      revalidatePath(`/projects/${parsedInput.projectId}/users`);
      revalidatePath(`/projects/${parsedInput.projectId}`);

      return {
        success: true,
        toast: {
          message: "Primary client updated",
          type: "success",
          description: `${projectUser.user.name || projectUser.user.email} has been set as the primary client.`,
        },
      };
    } catch (error) {
      console.error("Set primary client error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to set primary client. Please try again.");
    }
  });


