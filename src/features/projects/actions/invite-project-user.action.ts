"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { actionClient } from "@/features/shared/lib/actions/client";
import { getSession } from "@/features/shared/lib/auth/get-session";
import { db } from "@/features/shared/lib/db/client";
import { sendEmail } from "@/features/shared/lib/utils/email";
import { getBaseUrl } from "@/features/shared/lib/utils/get-base-url";
import { ProjectPermission } from "../constants/project-permissions";
import { requireProjectPermission } from "../lib/require-project-permission";
import { inviteProjectUserSchema } from "../schemas/project-user.schema";

export const inviteProjectUserAction = actionClient
  .inputSchema(inviteProjectUserSchema)
  .action(async ({ parsedInput }) => {
    try {
      // Check permission before inviting
      await requireProjectPermission(
        parsedInput.projectId,
        ProjectPermission.Users.INVITE,
      );

      const session = await getSession();

      if (!session?.user) {
        throw new Error("You must be logged in to invite users.");
      }

      // Verify project exists
      const project = await db.project.findUnique({
        where: { id: parsedInput.projectId },
        select: {
          id: true,
          name: true,
          primaryClientId: true,
        },
      });

      if (!project) {
        throw new Error("Project not found.");
      }

      // Check if user is already on the project
      const existingUser = await db.user.findUnique({
        where: { email: parsedInput.email },
        include: {
          projectUsers: {
            where: { projectId: parsedInput.projectId },
          },
        },
      });

      if (existingUser && existingUser.projectUsers.length > 0) {
        throw new Error("This user is already on the project.");
      }

      // Check if project has no primary client and we're adding a Client
      // If user already exists and is being added as Client, we can add them directly
      const needsPrimaryClient =
        !project.primaryClientId &&
        parsedInput.userType === "Client" &&
        existingUser;

      // Check if there's a pending invitation for this email
      const existingInvitation = await db.projectInvitation.findFirst({
        where: {
          projectId: parsedInput.projectId,
          email: parsedInput.email,
          status: "PENDING",
        },
      });

      if (existingInvitation && existingInvitation.expiresAt > new Date()) {
        throw new Error("An invitation has already been sent to this email.");
      }

      // Generate invitation token and expiration (used in both paths)
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      // If user exists and needs to be added as primary client, add them directly
      // and create an invitation marked as ACCEPTED
      if (needsPrimaryClient && existingUser) {
        // Add user directly to project as Client
        await db.projectUser.create({
          data: {
            projectId: parsedInput.projectId,
            userId: existingUser.id,
            userType: "Client",
          },
        });

        // Set as primary client
        await db.project.update({
          where: { id: parsedInput.projectId },
          data: {
            primaryClientId: existingUser.id,
          },
        });

        // Create invitation marked as ACCEPTED since user is already added
        const invitation = await db.projectInvitation.create({
          data: {
            projectId: parsedInput.projectId,
            email: parsedInput.email,
            userId: existingUser.id,
            userType: "Client",
            token,
            status: "ACCEPTED",
            expiresAt,
            invitedById: session.user.id,
            acceptedAt: new Date(),
          },
        });

        // Create notification for the user
        await db.notification.create({
          data: {
            userId: existingUser.id,
            title: `You've been added to ${project.name}`,
            subtitle: `${session.user.name || "Someone"} has added you as a Client and set you as the primary client.`,
            detail: `## Added to Project\n\nYou have been added to the project **${project.name}** as a **Client** and set as the primary client.\n\nYou can now access this project.`,
            link: `/projects/${parsedInput.projectId}`,
            read: false,
          },
        });

        revalidatePath(`/projects/${parsedInput.projectId}/users`);
        revalidatePath(`/projects/${parsedInput.projectId}`);
        revalidatePath("/notifications");

        return {
          success: true,
          invitation,
          toast: {
            message: "Client added successfully",
            type: "success",
            description: `${existingUser.name || existingUser.email} has been added as the primary client.`,
          },
        };
      }

      // Create invitation
      const invitation = await db.projectInvitation.create({
        data: {
          projectId: parsedInput.projectId,
          email: parsedInput.email,
          userId: existingUser?.id || null,
          userType: parsedInput.userType,
          token,
          status: "PENDING",
          expiresAt,
          invitedById: session.user.id,
        },
      });

      // Prepare invitation details for email and notification
      const baseUrl = getBaseUrl();
      const invitationUrl = `${baseUrl}/invitations/accept?token=${token}`;

      const projectName = project.name;
      const inviterName = session.user.name || "Someone";

      // Send invitation email
      await sendEmail({
        to: parsedInput.email,
        subject: `You've been invited to join ${projectName}`,
        html: `
          <h1>Project Invitation</h1>
          <p>Hello,</p>
          <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectName}</strong> as a <strong>${parsedInput.userType}</strong>.</p>
          <p>Click the link below to accept the invitation:</p>
          <p><a href="${invitationUrl}">${invitationUrl}</a></p>
          <p>This invitation will expire in 7 days.</p>
          <p>If you don't have an account, you'll be prompted to create one when you click the link.</p>
        `,
        text: `
          Project Invitation
          
          Hello,
          
          ${inviterName} has invited you to join the project ${projectName} as a ${parsedInput.userType}.
          
          Click the link below to accept the invitation:
          ${invitationUrl}
          
          This invitation will expire in 7 days.
          
          If you don't have an account, you'll be prompted to create one when you click the link.
        `,
      });

      // If user already exists, create a notification for them
      if (existingUser) {
        await db.notification.create({
          data: {
            userId: existingUser.id,
            title: `You've been invited to join ${projectName}`,
            subtitle: `${inviterName} has invited you as a ${parsedInput.userType}`,
            detail: `## Project Invitation\n\nYou have been invited to join the project **${projectName}** as a **${parsedInput.userType}**.\n\nClick to view and accept the invitation.`,
            link: `/invitations/accept?token=${token}`,
            read: false,
          },
        });
      }

      revalidatePath(`/projects/${parsedInput.projectId}/users`);
      revalidatePath("/invitations/pending");
      revalidatePath("/notifications");

      return {
        success: true,
        invitation,
        toast: {
          message: "Invitation sent successfully",
          type: "success",
          description: `An invitation has been sent to ${parsedInput.email}`,
        },
      };
    } catch (error) {
      console.error("Invite project user error:", error);

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to send invitation. Please try again.");
    }
  });
