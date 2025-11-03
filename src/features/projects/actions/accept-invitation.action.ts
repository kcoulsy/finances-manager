"use server";

import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import { getBaseUrl } from "@/features/shared/lib/utils/get-base-url";
import { acceptInvitationSchema } from "../schemas/project-user.schema";

export const acceptInvitationAction = actionClient
  .inputSchema(acceptInvitationSchema)
  .action(async ({ parsedInput }) => {
    try {
      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be logged in to accept invitations.");
      }

      // Find invitation by token
      const invitation = await db.projectInvitation.findUnique({
        where: { token: parsedInput.token },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              userId: true,
            },
          },
          invitedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!invitation) {
        throw new Error("Invitation not found or invalid.");
      }

      // Check if invitation is pending
      if (invitation.status !== "PENDING") {
        throw new Error("This invitation has already been used or cancelled.");
      }

      // Check if invitation is expired
      if (invitation.expiresAt < new Date()) {
        throw new Error("This invitation has expired.");
      }

      // Check if email matches (if invitation has email)
      if (invitation.email && invitation.email !== session.user.email) {
        throw new Error(
          "This invitation was sent to a different email address.",
        );
      }

      // Check if user is already on the project
      const existingProjectUser = await db.projectUser.findUnique({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId: session.user.id,
          },
        },
      });

      if (existingProjectUser) {
        // Update invitation to accepted even though user is already on project
        await db.projectInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
            userId: session.user.id,
          },
        });

        // Get project owner to send notification and email
        const projectOwner = await db.user.findUnique({
          where: { id: invitation.project.userId },
          select: {
            id: true,
            name: true,
            email: true,
          },
        });

        if (projectOwner) {
          // Send email to project owner
          const acceptedUserName = session.user.name || session.user.email;
          const projectName = invitation.project.name;
          const userType = invitation.userType;

          const baseUrl = getBaseUrl();
          const projectUrl = `${baseUrl}/projects/${invitation.projectId}/users`;

          await sendEmail({
            to: projectOwner.email,
            subject: `${acceptedUserName} has accepted your invitation to ${projectName}`,
            html: `
              <h1>Invitation Accepted</h1>
              <p>Hello ${projectOwner.name},</p>
              <p><strong>${acceptedUserName}</strong> has accepted your invitation to join the project <strong>${projectName}</strong> as a <strong>${userType}</strong>.</p>
              <p>Note: ${acceptedUserName} is already a member of this project.</p>
              <p>You can view the project users here:</p>
              <p><a href="${projectUrl}">${projectUrl}</a></p>
            `,
            text: `
              Invitation Accepted
              
              Hello ${projectOwner.name},
              
              ${acceptedUserName} has accepted your invitation to join the project ${projectName} as a ${userType}.
              
              Note: ${acceptedUserName} is already a member of this project.
              
              You can view the project users here:
              ${projectUrl}
            `,
          });

          // Create notification for project owner
          await db.notification.create({
            data: {
              userId: projectOwner.id,
              title: `${acceptedUserName} accepted invitation to ${projectName}`,
              subtitle: `${acceptedUserName} accepted your invitation as a ${userType} (already a member)`,
              detail: `## Invitation Accepted\n\n**${acceptedUserName}** has accepted your invitation to join the project **${projectName}** as a **${userType}**.\n\nNote: They are already a member of this project.`,
              link: `/projects/${invitation.projectId}/users`,
              read: false,
            },
          });

          revalidatePath(`/projects/${invitation.projectId}/users`);
          revalidatePath("/notifications");
        }

        return {
          success: true,
          message: "You are already on this project.",
        };
      }

      // Add user to project
      await db.projectUser.create({
        data: {
          projectId: invitation.projectId,
          userId: session.user.id,
          userType: invitation.userType,
        },
      });

      // Update invitation to accepted
      await db.projectInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
          userId: session.user.id,
        },
      });

      // Get project owner to send notification and email
      const projectOwner = await db.user.findUnique({
        where: { id: invitation.project.userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (projectOwner) {
        // Send email to project owner
        const acceptedUserName = session.user.name || session.user.email;
        const projectName = invitation.project.name;
        const userType = invitation.userType;

        const baseUrl =
          process.env.BETTER_AUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          "http://localhost:3000";
        const projectUrl = `${baseUrl}/projects/${invitation.projectId}/users`;

        await sendEmail({
          to: projectOwner.email,
          subject: `${acceptedUserName} has accepted your invitation to ${projectName}`,
          html: `
            <h1>Invitation Accepted</h1>
            <p>Hello ${projectOwner.name},</p>
            <p><strong>${acceptedUserName}</strong> has accepted your invitation to join the project <strong>${projectName}</strong> as a <strong>${userType}</strong>.</p>
            <p>You can view the project users here:</p>
            <p><a href="${projectUrl}">${projectUrl}</a></p>
          `,
          text: `
            Invitation Accepted
            
            Hello ${projectOwner.name},
            
            ${acceptedUserName} has accepted your invitation to join the project ${projectName} as a ${userType}.
            
            You can view the project users here:
            ${projectUrl}
          `,
        });

        // Create notification for project owner
        await db.notification.create({
          data: {
            userId: projectOwner.id,
            title: `${acceptedUserName} joined ${projectName}`,
            subtitle: `${acceptedUserName} accepted your invitation as a ${userType}`,
            detail: `## User Joined Project\n\n**${acceptedUserName}** has accepted your invitation to join the project **${projectName}** as a **${userType}**.\n\nThey have been added to the project.`,
            link: `/projects/${invitation.projectId}/users`,
            read: false,
          },
        });
      }

      revalidatePath(`/projects/${invitation.projectId}`);
      revalidatePath(`/projects/${invitation.projectId}/users`);
      revalidatePath("/invitations/pending");
      revalidatePath("/notifications");

      return {
        success: true,
        project: invitation.project,
        toast: {
          message: "Invitation accepted",
          type: "success",
          description: `You have been added to ${invitation.project.name}`,
        },
      };
    } catch (error) {
      console.error("Accept invitation error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to accept invitation. Please try again.");
    }
  });
