"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import { removeProjectUserSchema } from "../schemas/project-user.schema";

export const removeProjectUserAction = actionClient
  .inputSchema(removeProjectUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be logged in to remove users.");
      }

      // Verify project exists and user owns it
      const project = await db.project.findUnique({
        where: { id: parsedInput.projectId },
      });

      if (!project) {
        throw new Error("Project not found.");
      }

      if (project.userId !== session.user.id) {
        throw new Error(
          "You don't have permission to remove users from this project.",
        );
      }

      // Can't remove project owner
      if (project.userId === parsedInput.userId) {
        throw new Error("You cannot remove the project owner.");
      }

      // Check if user is on the project (include userType for email/notification)
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
        throw new Error("User is not on this project.");
      }

      // Get removed user details
      const removedUser = projectUser.user;
      const removedUserName = removedUser.name || removedUser.email;
      const removerName = session.user.name || "Someone";
      const projectName = project.name;
      const userType = projectUser.userType;

      // Remove user from project
      await db.projectUser.delete({
        where: {
          projectId_userId: {
            projectId: parsedInput.projectId,
            userId: parsedInput.userId,
          },
        },
      });

      // Send email to removed user
      await sendEmail({
        to: removedUser.email,
        subject: `You've been removed from ${projectName}`,
        html: `
          <h1>Removed from Project</h1>
          <p>Hello ${removedUserName},</p>
          <p><strong>${removerName}</strong> has removed you from the project <strong>${projectName}</strong>.</p>
          <p>You were previously a <strong>${userType}</strong> on this project.</p>
          <p>If you believe this was done in error, please contact the project owner.</p>
        `,
        text: `
          Removed from Project
          
          Hello ${removedUserName},
          
          ${removerName} has removed you from the project ${projectName}.
          
          You were previously a ${userType} on this project.
          
          If you believe this was done in error, please contact the project owner.
        `,
      });

      // Create notification for removed user
      await db.notification.create({
        data: {
          userId: removedUser.id,
          title: `Removed from ${projectName}`,
          subtitle: `${removerName} removed you from the project`,
          detail: `## Removed from Project\n\n**${removerName}** has removed you from the project **${projectName}**.\n\nYou were previously a **${userType}** on this project.\n\nIf you believe this was done in error, please contact the project owner.`,
          link: `/projects`,
          read: false,
        },
      });

      revalidatePath(`/projects/${parsedInput.projectId}/users`);
      revalidatePath("/notifications");

      return {
        success: true,
        toast: {
          message: "User removed successfully",
          type: "success",
          description: `${removedUserName} has been removed from the project.`,
        },
      };
    } catch (error) {
      console.error("Remove project user error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to remove user. Please try again.");
    }
  });
